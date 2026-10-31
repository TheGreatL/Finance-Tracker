import type * as SQLite from 'expo-sqlite';
import type {
    SubscriptionRecord,
    SubscriptionFrequency,
    SubscriptionStatus,
    CreateSubscriptionInput,
    UpdateSubscriptionInput
} from '../types/database';
import { getSubscriptionPreset } from '../constants/subscriptions';
import { scheduleSubscriptionReminder, sendSubscriptionPaymentConfirmation, cancelLoanReminder } from './notificationService';
import { addAppNotification } from './notificationCenterService';

const MAX_CATCHUP_CYCLES = 60;

export interface SubscriptionsSummary {
    monthlyTotal: number;
    activeCount: number;
    pausedCount: number;
    cancelledCount: number;
    nextUpcoming: SubscriptionRecord | null;
}

export interface ProcessedSubscriptionCharge {
    subscriptionId: string;
    serviceName: string;
    pocketId: string;
    pocketLabel: string;
    amountPerCycle: number;
    cyclesProcessed: number;
    totalDeducted: number;
    newNextBillingDate: string;
}

/**
 * Formats a Date object as local YYYY-MM-DD.
 */
export function toLocalISODate(date: Date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Advances a YYYY-MM-DD billing date by one cycle (weekly, monthly, yearly),
 * clamping month-end and leap-year dates safely.
 */
export function advanceBillingDate(dateStr: string, frequency: SubscriptionFrequency): string {
    const parts = dateStr.split('-').map((p) => parseInt(p, 10));
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
        return toLocalISODate();
    }

    const year = parts[0];
    const monthIndex = parts[1] - 1;
    const day = parts[2];

    if (frequency === 'weekly') {
        const d = new Date(year, monthIndex, day);
        d.setDate(d.getDate() + 7);
        return toLocalISODate(d);
    }

    if (frequency === 'monthly') {
        const rawTargetMonth = monthIndex + 1;
        const targetYear = year + Math.floor(rawTargetMonth / 12);
        const targetMonthIndex = rawTargetMonth % 12;
        const maxDaysInTargetMonth = new Date(targetYear, targetMonthIndex + 1, 0).getDate();
        const clampedDay = Math.min(day, maxDaysInTargetMonth);
        return toLocalISODate(new Date(targetYear, targetMonthIndex, clampedDay));
    }

    // yearly
    const targetYear = year + 1;
    const maxDaysInTargetMonth = new Date(targetYear, monthIndex + 1, 0).getDate();
    const clampedDay = Math.min(day, maxDaysInTargetMonth);
    return toLocalISODate(new Date(targetYear, monthIndex, clampedDay));
}

/**
 * Normalizes a subscription's cycle amount into its monthly equivalent.
 */
export function normalizeToMonthlyAmount(amount: number, frequency: SubscriptionFrequency): number {
    if (frequency === 'weekly') {
        return Math.round(amount * (52 / 12) * 100) / 100;
    }
    if (frequency === 'yearly') {
        return Math.round((amount / 12) * 100) / 100;
    }
    return amount;
}

async function resolvePocketLabel(
    db: SQLite.SQLiteDatabase,
    pocketId: string
): Promise<{ pocketName: string; institutionName: string; label: string }> {
    if (typeof db.getFirstAsync === 'function') {
        const row = await db.getFirstAsync<{
            pocket_name: string;
            institution_name: string;
        }>(
            `SELECT p.name AS pocket_name, i.name AS institution_name
       FROM account_pockets p
       LEFT JOIN institutions i ON p.institution_id = i.id
       WHERE p.id = ? LIMIT 1;`,
            [pocketId]
        );
        if (row) {
            const label = row.institution_name ? `${row.institution_name} • ${row.pocket_name}` : row.pocket_name;
            return {
                pocketName: row.pocket_name,
                institutionName: row.institution_name || '',
                label
            };
        }
    }
    return { pocketName: 'Account', institutionName: '', label: 'Account' };
}

export async function createSubscription(db: SQLite.SQLiteDatabase, input: CreateSubscriptionInput): Promise<SubscriptionRecord> {
    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const preset = getSubscriptionPreset(input.serviceCode || input.serviceName);
    const serviceCode = input.serviceCode || preset.code;
    const reminderDays = input.reminderDaysBefore ?? 1;

    const pocketInfo = await resolvePocketLabel(db, input.pocketId);

    // 1. Immediately insert into SQLite first so subscription data is never lost or blocked
    await db.runAsync(
        `INSERT INTO subscriptions (
      id, service_name, service_code, pocket_id, amount, frequency,
      start_date, next_billing_date, category, status,
      reminder_days_before, notification_id, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, '', ?, ?, ?)`,
        [
            id,
            input.serviceName.trim(),
            serviceCode,
            input.pocketId,
            input.amount,
            input.frequency,
            input.startDate,
            input.nextBillingDate,
            input.category,
            reminderDays,
            input.notes?.trim() || '',
            now,
            now
        ]
    );

    // 2. Schedule notification reminder safely without blocking subscription persistence
    let notificationId = '';
    try {
        notificationId =
            (await scheduleSubscriptionReminder({
                id,
                service_name: input.serviceName.trim(),
                amount: input.amount,
                next_billing_date: input.nextBillingDate,
                pocket_label: pocketInfo.label,
                days_before: reminderDays
            })) || '';

        if (notificationId) {
            await db.runAsync('UPDATE subscriptions SET notification_id = ? WHERE id = ?', [notificationId, id]);
        }
    } catch (notifErr) {
        console.warn('Could not schedule local notification for subscription:', notifErr);
    }

    return {
        id,
        service_name: input.serviceName.trim(),
        service_code: serviceCode,
        pocket_id: input.pocketId,
        amount: input.amount,
        frequency: input.frequency,
        start_date: input.startDate,
        next_billing_date: input.nextBillingDate,
        category: input.category,
        status: 'active',
        reminder_days_before: reminderDays,
        notification_id: notificationId,
        notes: input.notes?.trim() || '',
        created_at: now,
        updated_at: now,
        pocket_name: pocketInfo.pocketName,
        institution_name: pocketInfo.institutionName
    };
}

export async function getAllSubscriptions(db: SQLite.SQLiteDatabase): Promise<SubscriptionRecord[]> {
    return db.getAllAsync<SubscriptionRecord>(`
    SELECT
      s.*,
      p.name AS pocket_name,
      i.name AS institution_name,
      i.code AS institution_code,
      i.color AS institution_color
    FROM subscriptions s
    LEFT JOIN account_pockets p ON s.pocket_id = p.id
    LEFT JOIN institutions i ON p.institution_id = i.id
    ORDER BY
      CASE s.status
        WHEN 'active' THEN 0
        WHEN 'paused' THEN 1
        ELSE 2
      END ASC,
      s.next_billing_date ASC;
  `);
}

export async function getSubscriptionsSummary(db: SQLite.SQLiteDatabase): Promise<SubscriptionsSummary> {
    const all = await getAllSubscriptions(db);
    const active = all.filter((s) => s.status === 'active');
    const paused = all.filter((s) => s.status === 'paused');
    const cancelled = all.filter((s) => s.status === 'cancelled');

    const monthlyTotal = Math.round(active.reduce((sum, s) => sum + normalizeToMonthlyAmount(s.amount, s.frequency), 0) * 100) / 100;

    const sortedActive = [...active].sort((a, b) => a.next_billing_date.localeCompare(b.next_billing_date));

    return {
        monthlyTotal,
        activeCount: active.length,
        pausedCount: paused.length,
        cancelledCount: cancelled.length,
        nextUpcoming: sortedActive.length > 0 ? sortedActive[0] : null
    };
}

export async function updateSubscription(db: SQLite.SQLiteDatabase, id: string, input: UpdateSubscriptionInput): Promise<void> {
    const existing = await db.getFirstAsync<SubscriptionRecord>('SELECT * FROM subscriptions WHERE id = ? LIMIT 1;', [id]);
    if (!existing) {
        throw new Error('Subscription not found');
    }

    const serviceName = input.serviceName !== undefined ? input.serviceName.trim() : existing.service_name;
    const serviceCode =
        input.serviceCode !== undefined
            ? input.serviceCode
            : input.serviceName !== undefined
              ? getSubscriptionPreset(input.serviceName).code
              : existing.service_code;
    const pocketId = input.pocketId ?? existing.pocket_id;
    const amount = input.amount ?? existing.amount;
    const frequency = input.frequency ?? existing.frequency;
    const startDate = input.startDate ?? existing.start_date;
    const nextBillingDate = input.nextBillingDate ?? existing.next_billing_date;
    const category = input.category ?? existing.category;
    const reminderDaysBefore = input.reminderDaysBefore ?? existing.reminder_days_before;
    const notes = input.notes !== undefined ? input.notes.trim() : existing.notes || '';
    const now = new Date().toISOString();

    // 1. Update database record first
    await db.runAsync(
        `UPDATE subscriptions
     SET service_name = ?, service_code = ?, pocket_id = ?, amount = ?,
         frequency = ?, start_date = ?, next_billing_date = ?, category = ?,
         reminder_days_before = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
        [serviceName, serviceCode, pocketId, amount, frequency, startDate, nextBillingDate, category, reminderDaysBefore, notes, now, id]
    );

    // 2. Safely manage reminders without blocking database completion
    try {
        if (existing.notification_id) {
            await cancelLoanReminder(existing.notification_id);
        }

        if (existing.status === 'active') {
            const pocketInfo = await resolvePocketLabel(db, pocketId);
            const newNotificationId =
                (await scheduleSubscriptionReminder({
                    id,
                    service_name: serviceName,
                    amount,
                    next_billing_date: nextBillingDate,
                    pocket_label: pocketInfo.label,
                    days_before: reminderDaysBefore
                })) || '';

            if (newNotificationId) {
                await db.runAsync('UPDATE subscriptions SET notification_id = ? WHERE id = ?', [newNotificationId, id]);
            }
        }
    } catch (notifErr) {
        console.warn('Could not update subscription notification reminder:', notifErr);
    }
}

export async function updateSubscriptionStatus(
    db: SQLite.SQLiteDatabase,
    id: string,
    status: SubscriptionStatus,
    referenceDate: Date = new Date()
): Promise<void> {
    const existing = await db.getFirstAsync<SubscriptionRecord>(
        `SELECT s.*, p.name AS pocket_name, i.name AS institution_name
     FROM subscriptions s
     LEFT JOIN account_pockets p ON s.pocket_id = p.id
     LEFT JOIN institutions i ON p.institution_id = i.id
     WHERE s.id = ? LIMIT 1;`,
        [id]
    );
    if (!existing) return;

    if (existing.notification_id) {
        await cancelLoanReminder(existing.notification_id);
    }

    let nextBillingDate = existing.next_billing_date;
    let newNotificationId = '';

    if (status === 'active') {
        // If the billing date fell in the past while paused, advance it into the future so resuming doesn't back-charge
        const todayStr = toLocalISODate(referenceDate);
        let safety = 0;
        while (nextBillingDate <= todayStr && safety < MAX_CATCHUP_CYCLES) {
            nextBillingDate = advanceBillingDate(nextBillingDate, existing.frequency);
            safety++;
        }

        const pocketLabel = existing.institution_name
            ? `${existing.institution_name} • ${existing.pocket_name || 'Wallet'}`
            : existing.pocket_name || 'Account';

        newNotificationId =
            (await scheduleSubscriptionReminder({
                id: existing.id,
                service_name: existing.service_name,
                amount: existing.amount,
                next_billing_date: nextBillingDate,
                pocket_label: pocketLabel,
                days_before: existing.reminder_days_before ?? 1
            })) || '';
    }

    const now = new Date().toISOString();
    await db.runAsync(`UPDATE subscriptions SET status = ?, next_billing_date = ?, notification_id = ?, updated_at = ? WHERE id = ?`, [
        status,
        nextBillingDate,
        newNotificationId,
        now,
        id
    ]);
}

export async function deleteSubscription(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
    if (typeof db.getFirstAsync === 'function') {
        const existing = await db.getFirstAsync<{ notification_id?: string }>('SELECT notification_id FROM subscriptions WHERE id = ? LIMIT 1;', [
            id
        ]);
        if (existing?.notification_id) {
            await cancelLoanReminder(existing.notification_id);
        }
    }
    await db.runAsync('DELETE FROM subscriptions WHERE id = ?', [id]);
}

let activeCatchUpPromise: Promise<ProcessedSubscriptionCharge[]> | null = null;

/**
 * Automatically processes all due active subscriptions (where next_billing_date <= today),
 * catching up missed billing cycles if the phone was off or idle, deducting pocket balances,
 * recording expense transactions, rolling next_billing_date forward, and sending alerts.
 */
export async function processDueSubscriptions(db: SQLite.SQLiteDatabase, referenceDate: Date = new Date()): Promise<ProcessedSubscriptionCharge[]> {
    if (activeCatchUpPromise) {
        return activeCatchUpPromise;
    }

    activeCatchUpPromise = runProcessDueSubscriptions(db, referenceDate).finally(() => {
        activeCatchUpPromise = null;
    });

    return activeCatchUpPromise;
}

async function runProcessDueSubscriptions(db: SQLite.SQLiteDatabase, referenceDate: Date = new Date()): Promise<ProcessedSubscriptionCharge[]> {
    const todayStr = toLocalISODate(referenceDate);

    const dueSubs = await db.getAllAsync<SubscriptionRecord>(
        `SELECT
      s.*,
      p.name AS pocket_name,
      i.name AS institution_name
     FROM subscriptions s
     LEFT JOIN account_pockets p ON s.pocket_id = p.id
     LEFT JOIN institutions i ON p.institution_id = i.id
     WHERE s.status = 'active' AND s.next_billing_date <= ?
     ORDER BY s.next_billing_date ASC;`,
        [todayStr]
    );

    if (!dueSubs || dueSubs.length === 0) {
        return [];
    }

    const results: ProcessedSubscriptionCharge[] = [];

    for (const sub of dueSubs) {
        let cyclesProcessed = 0;
        let currentBillingDate = sub.next_billing_date;
        const nowIso = new Date().toISOString();

        await db.withTransactionAsync(async () => {
            while (currentBillingDate <= todayStr && cyclesProcessed < MAX_CATCHUP_CYCLES) {
                const pocket = await db.getFirstAsync<{ id: string; current_balance: number }>(
                    'SELECT id, current_balance FROM account_pockets WHERE id = ? LIMIT 1;',
                    [sub.pocket_id]
                );

                if (!pocket) {
                    break;
                }

                const updatedBalance = pocket.current_balance - sub.amount;
                await db.runAsync('UPDATE account_pockets SET current_balance = ?, updated_at = ? WHERE id = ?', [
                    updatedBalance,
                    nowIso,
                    sub.pocket_id
                ]);

                const txId = `tx_sub_${sub.id}_${currentBillingDate}_${cyclesProcessed}_${Date.now()}`;
                await db.runAsync(
                    `INSERT INTO transactions (
            id, title, pocket_id, to_pocket_id, type, amount, category, date, notes, created_at, updated_at
          ) VALUES (?, ?, ?, NULL, 'expense', ?, ?, ?, ?, ?, ?)`,
                    [
                        txId,
                        `Subscription: ${sub.service_name}`,
                        sub.pocket_id,
                        sub.amount,
                        sub.category || 'Subscriptions',
                        currentBillingDate,
                        `Auto-deducted (${sub.frequency} billing cycle)`,
                        nowIso,
                        nowIso
                    ]
                );

                currentBillingDate = advanceBillingDate(currentBillingDate, sub.frequency);
                cyclesProcessed++;
            }

            if (cyclesProcessed > 0) {
                await db.runAsync('UPDATE subscriptions SET next_billing_date = ?, updated_at = ? WHERE id = ?', [
                    currentBillingDate,
                    nowIso,
                    sub.id
                ]);
            }
        });

        if (cyclesProcessed > 0) {
            const totalDeducted = Math.round(sub.amount * cyclesProcessed * 100) / 100;
            const pocketLabel = sub.institution_name ? `${sub.institution_name} • ${sub.pocket_name || 'Wallet'}` : sub.pocket_name || 'Account';

            try {
                if (sub.notification_id) {
                    await cancelLoanReminder(sub.notification_id);
                }

                await sendSubscriptionPaymentConfirmation({
                    service_name: sub.service_name,
                    amount: totalDeducted,
                    pocket_label: pocketLabel,
                    cycles: cyclesProcessed
                });

                const nextNotifId =
                    (await scheduleSubscriptionReminder({
                        id: sub.id,
                        service_name: sub.service_name,
                        amount: sub.amount,
                        next_billing_date: currentBillingDate,
                        pocket_label: pocketLabel,
                        days_before: sub.reminder_days_before ?? 1
                    })) || '';

                if (nextNotifId) {
                    await db.runAsync('UPDATE subscriptions SET notification_id = ? WHERE id = ?', [nextNotifId, sub.id]);
                }
            } catch (notifErr) {
                console.warn('Could not process subscription notification confirmation:', notifErr);
            }

            await addAppNotification(db, {
                type: 'subscription_paid',
                title: `Subscription Paid: ${sub.service_name}`,
                body: `₱${totalDeducted.toLocaleString()} was automatically deducted from ${pocketLabel}${
                    cyclesProcessed > 1 ? ` (${cyclesProcessed} cycles caught up)` : ''
                }.`,
                data: { subscriptionId: sub.id, totalDeducted }
            }).catch(() => {});

            results.push({
                subscriptionId: sub.id,
                serviceName: sub.service_name,
                pocketId: sub.pocket_id,
                pocketLabel,
                amountPerCycle: sub.amount,
                cyclesProcessed,
                totalDeducted,
                newNextBillingDate: currentBillingDate
            });
        }
    }

    return results;
}
