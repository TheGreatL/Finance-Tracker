import type { SQLiteDatabase } from 'expo-sqlite';

export type AppNotificationType = 'subscription_due' | 'subscription_paid' | 'loan_due' | 'system';

export interface AppNotificationRecord {
    id: string;
    type: AppNotificationType;
    title: string;
    body: string;
    data?: string;
    is_read: number; // 0 or 1
    created_at: string;
}

export interface CreateAppNotificationInput {
    id?: string;
    type: AppNotificationType;
    title: string;
    body: string;
    data?: Record<string, any> | string;
    created_at?: string;
}

/**
 * Inserts an in-app notification.
 */
export async function addAppNotification(db: SQLiteDatabase, input: CreateAppNotificationInput): Promise<string> {
    const id = input.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const dataStr = typeof input.data === 'object' ? JSON.stringify(input.data) : input.data || '';
    const createdAt = input.created_at || new Date().toISOString();

    await db.runAsync(
        `INSERT INTO app_notifications (
      id, type, title, body, data, is_read, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        id,
        input.type,
        input.title,
        input.body,
        dataStr,
        0,
        createdAt
    );

    return id;
}

/**
 * Retrieves all in-app notifications in descending chronological order.
 */
export async function getAppNotifications(db: SQLiteDatabase, limit: number = 60): Promise<AppNotificationRecord[]> {
    return await db.getAllAsync<AppNotificationRecord>(`SELECT * FROM app_notifications ORDER BY created_at DESC LIMIT ?;`, limit);
}

/**
 * Counts unread in-app notifications.
 */
export async function getUnreadNotificationCount(db: SQLiteDatabase): Promise<number> {
    const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM app_notifications WHERE is_read = 0;`);
    return row?.count ?? 0;
}

/**
 * Marks a specific notification as read.
 */
export async function markNotificationAsRead(db: SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync(`UPDATE app_notifications SET is_read = 1 WHERE id = ?;`, id);
}

/**
 * Marks all notifications as read.
 */
export async function markAllNotificationsAsRead(db: SQLiteDatabase): Promise<void> {
    await db.runAsync(`UPDATE app_notifications SET is_read = 1 WHERE is_read = 0;`);
}

/**
 * Clears all in-app notifications.
 */
export async function clearAllNotifications(db: SQLiteDatabase): Promise<void> {
    await db.runAsync(`DELETE FROM app_notifications;`);
}

/**
 * Synchronizes scheduled upcoming subscription and loan due dates into in-app notifications.
 * Uses deterministic keys so duplicate notifications are never inserted for the same cycle.
 */
export async function syncAppNotificationsFromSchedule(db: SQLiteDatabase, referenceDate: Date = new Date()): Promise<number> {
    let createdCount = 0;

    // 1. Sync upcoming subscriptions due within 2 days
    const futureThreshold = new Date(referenceDate);
    futureThreshold.setDate(futureThreshold.getDate() + 2);
    const futureDateStr = futureThreshold.toISOString().split('T')[0];

    try {
        const upcomingSubs = await db.getAllAsync<{
            id: string;
            service_name: string;
            amount: number;
            next_billing_date: string;
            status: string;
            pocket_name?: string;
            institution_name?: string;
        }>(
            `SELECT s.id, s.service_name, s.amount, s.next_billing_date, s.status,
              p.name as pocket_name, i.name as institution_name
       FROM subscriptions s
       LEFT JOIN account_pockets p ON s.pocket_id = p.id
       LEFT JOIN institutions i ON p.institution_id = i.id
       WHERE s.status = 'active' AND s.next_billing_date <= ?;`,
            futureDateStr
        );

        for (const sub of upcomingSubs) {
            const deterministicId = `sub_due_${sub.id}_${sub.next_billing_date}`;
            const pocketLabel = sub.institution_name ? `${sub.institution_name} • ${sub.pocket_name || 'Wallet'}` : sub.pocket_name || 'Wallet';

            const title = `Upcoming Subscription: ${sub.service_name}`;
            const body = `₱${sub.amount.toLocaleString()} is scheduled for payment on ${sub.next_billing_date} from ${pocketLabel}.`;
            const dataStr = JSON.stringify({ subscriptionId: sub.id, dueDate: sub.next_billing_date });

            const res = await db.runAsync(
                `INSERT OR IGNORE INTO app_notifications (
          id, type, title, body, data, is_read, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
                deterministicId,
                'subscription_due',
                title,
                body,
                dataStr,
                0,
                new Date().toISOString()
            );

            if (res.changes && res.changes > 0) {
                createdCount++;
            }
        }
    } catch (err) {
        console.warn('Could not sync subscription notifications:', err);
    }

    // 2. Sync upcoming loans due within 3 days
    const loanThreshold = new Date(referenceDate);
    loanThreshold.setDate(loanThreshold.getDate() + 3);
    const loanThresholdStr = loanThreshold.toISOString().split('T')[0];

    try {
        const upcomingLoans = await db.getAllAsync<{
            id: string;
            title: string;
            monthly_payment: number;
            due_date: string;
            status: string;
            institution_name?: string;
        }>(
            `SELECT l.id, l.title, l.monthly_payment, l.due_date, l.status, i.name as institution_name
       FROM loans l
       LEFT JOIN institutions i ON l.institution_id = i.id
       WHERE l.status = 'active' AND l.due_date <= ?;`,
            loanThresholdStr
        );

        for (const loan of upcomingLoans) {
            const deterministicId = `loan_due_${loan.id}_${loan.due_date}`;
            const instName = loan.institution_name || 'Lending Provider';

            const title = `Loan Payment Due Soon: ${loan.title}`;
            const body = `₱${loan.monthly_payment.toLocaleString()} monthly installment on ${instName} is due on ${loan.due_date}.`;
            const dataStr = JSON.stringify({ loanId: loan.id, dueDate: loan.due_date });

            const res = await db.runAsync(
                `INSERT OR IGNORE INTO app_notifications (
          id, type, title, body, data, is_read, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
                deterministicId,
                'loan_due',
                title,
                body,
                dataStr,
                0,
                new Date().toISOString()
            );

            if (res.changes && res.changes > 0) {
                createdCount++;
            }
        }
    } catch (err) {
        console.warn('Could not sync loan notifications:', err);
    }

    return createdCount;
}
