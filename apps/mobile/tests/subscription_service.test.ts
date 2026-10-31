import { describe, it, expect, vi } from 'vitest';
import {
    advanceBillingDate,
    normalizeToMonthlyAmount,
    createSubscription,
    processDueSubscriptions,
    updateSubscriptionStatus,
    getSubscriptionsSummary
} from '../src/services/subscriptionService';

describe('subscriptionService', () => {
    it('advanceBillingDate handles weekly, monthly month-end clamping, and leap-year yearly rollover', () => {
        expect(advanceBillingDate('2026-10-01', 'weekly')).toBe('2026-10-08');
        expect(advanceBillingDate('2026-01-31', 'monthly')).toBe('2026-02-28');
        expect(advanceBillingDate('2024-01-31', 'monthly')).toBe('2024-02-29');
        expect(advanceBillingDate('2024-02-29', 'yearly')).toBe('2025-02-28');
    });

    it('normalizeToMonthlyAmount converts weekly, monthly, and yearly costs to monthly equivalent', () => {
        expect(normalizeToMonthlyAmount(549, 'monthly')).toBe(549);
        expect(normalizeToMonthlyAmount(1200, 'yearly')).toBe(100);
        expect(normalizeToMonthlyAmount(100, 'weekly')).toBeCloseTo(433.33, 2);
    });

    it('createSubscription inserts active subscription record', async () => {
        const executed: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            getFirstAsync: vi.fn(async () => ({ pocket_name: 'Main Wallet', institution_name: 'GCash' })),
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            })
        };

        const res = await createSubscription(mockDb, {
            serviceName: 'Netflix',
            serviceCode: 'netflix',
            pocketId: 'p_gcash',
            amount: 549,
            frequency: 'monthly',
            startDate: '2026-10-15',
            nextBillingDate: '2026-11-15',
            category: 'Entertainment'
        });

        expect(res.service_name).toBe('Netflix');
        expect(res.status).toBe('active');
        expect(executed[0].sql).toContain('INSERT INTO subscriptions');
    });

    it('processDueSubscriptions catches up multiple missed cycles atomically when phone was off', async () => {
        const runQueries: { sql: string; params: any[] }[] = [];
        let currentPocketBalance = 2000;

        const mockDb: any = {
            getAllAsync: vi.fn(async () => [
                {
                    id: 'sub_1',
                    service_name: 'Gym Weekly',
                    service_code: 'gym',
                    pocket_id: 'p1',
                    amount: 300,
                    frequency: 'weekly',
                    start_date: '2026-10-03',
                    next_billing_date: '2026-10-10', // 3 cycles due by 2026-10-25: Oct 10, Oct 17, Oct 24
                    category: 'Fitness & Health',
                    status: 'active',
                    reminder_days_before: 1,
                    pocket_name: 'Wallet',
                    institution_name: 'Maya'
                }
            ]),
            withTransactionAsync: vi.fn(async (cb: () => Promise<void>) => {
                await cb();
            }),
            getFirstAsync: vi.fn(async (sql: string) => {
                if (sql.includes('FROM account_pockets')) {
                    return { id: 'p1', current_balance: currentPocketBalance };
                }
                return null;
            }),
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                runQueries.push({ sql, params });
                if (sql.includes('UPDATE account_pockets')) {
                    currentPocketBalance = params[0];
                }
                return { changes: 1 };
            })
        };

        const refDate = new Date(2026, 9, 25, 12, 0, 0); // Oct 25, 2026 local
        const processed = await processDueSubscriptions(mockDb, refDate);

        expect(processed).toHaveLength(1);
        expect(processed[0].cyclesProcessed).toBe(3);
        expect(processed[0].totalDeducted).toBe(900);
        expect(processed[0].newNextBillingDate).toBe('2026-10-31');
        expect(currentPocketBalance).toBe(1100); // 2000 - (3 * 300)

        const txInserts = runQueries.filter((q) => q.sql.includes('INSERT INTO transactions'));
        expect(txInserts).toHaveLength(3);
        expect(txInserts[0].params).toContain('Subscription: Gym Weekly');
        expect(txInserts[0].params).toContain('2026-10-10');
        expect(txInserts[1].params).toContain('2026-10-17');
        expect(txInserts[2].params).toContain('2026-10-24');
    });

    it('processDueSubscriptions ignores paused and cancelled subscriptions', async () => {
        const mockDb: any = {
            getAllAsync: vi.fn(async () => []),
            runAsync: vi.fn()
        };
        const processed = await processDueSubscriptions(mockDb, new Date(2026, 9, 25));
        expect(processed).toHaveLength(0);
        expect(mockDb.runAsync).not.toHaveBeenCalled();
    });

    it('updateSubscriptionStatus advances past next_billing_date into the future when resuming to active', async () => {
        const runQueries: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            getFirstAsync: vi.fn(async () => ({
                id: 'sub_spotify',
                service_name: 'Spotify',
                pocket_id: 'p1',
                amount: 149,
                frequency: 'monthly',
                next_billing_date: '2026-08-15',
                status: 'paused',
                notification_id: '',
                pocket_name: 'Wallet',
                institution_name: 'GCash'
            })),
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                runQueries.push({ sql, params });
                return { changes: 1 };
            })
        };

        const refDate = new Date(2026, 9, 25, 12, 0, 0); // Oct 25, 2026
        await updateSubscriptionStatus(mockDb, 'sub_spotify', 'active', refDate);

        const statusUpdate = runQueries.find((q) => q.sql.includes('UPDATE subscriptions SET status = ?'));
        expect(statusUpdate).toBeDefined();
        expect(statusUpdate?.params[0]).toBe('active');
        expect(statusUpdate?.params[1]).toBe('2026-11-15'); // Advanced past Oct 25 without retroactive charge
    });

    it('getSubscriptionsSummary calculates normalized monthly spend and nearest upcoming active subscription', async () => {
        const mockDb: any = {
            getAllAsync: vi.fn(async () => [
                {
                    id: 's1',
                    service_name: 'Netflix',
                    amount: 549,
                    frequency: 'monthly',
                    next_billing_date: '2026-11-10',
                    status: 'active'
                },
                {
                    id: 's2',
                    service_name: 'Canva Pro',
                    amount: 2400,
                    frequency: 'yearly',
                    next_billing_date: '2026-11-02',
                    status: 'active'
                },
                {
                    id: 's3',
                    service_name: 'Spotify',
                    amount: 149,
                    frequency: 'monthly',
                    next_billing_date: '2026-11-01',
                    status: 'paused'
                }
            ])
        };

        const summary = await getSubscriptionsSummary(mockDb);
        expect(summary.activeCount).toBe(2);
        expect(summary.pausedCount).toBe(1);
        expect(summary.monthlyTotal).toBe(749); // 549 + (2400 / 12)
        expect(summary.nextUpcoming?.id).toBe('s2'); // Nov 02 is earliest active
    });

    it('processDueSubscriptions is idempotent under concurrent invocations and never double-charges', async () => {
        let pocketBalance = 1000;
        let txCount = 0;

        const mockDb: any = {
            getAllAsync: vi.fn(async () => {
                await new Promise((r) => setTimeout(r, 15));
                return [
                    {
                        id: 'sub_concurrent',
                        service_name: 'Netflix',
                        service_code: 'netflix',
                        pocket_id: 'p1',
                        amount: 549,
                        frequency: 'monthly',
                        start_date: '2026-09-20',
                        next_billing_date: '2026-10-20',
                        category: 'Entertainment',
                        status: 'active',
                        reminder_days_before: 1
                    }
                ];
            }),
            withTransactionAsync: vi.fn(async (cb: () => Promise<void>) => {
                await cb();
            }),
            getFirstAsync: vi.fn(async (sql: string) => {
                if (sql.includes('FROM account_pockets')) {
                    return { id: 'p1', current_balance: pocketBalance };
                }
                return null;
            }),
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                if (sql.includes('UPDATE account_pockets')) {
                    pocketBalance = params[0];
                }
                if (sql.includes('INSERT INTO transactions')) {
                    txCount++;
                }
                return { changes: 1 };
            })
        };

        const refDate = new Date(2026, 9, 25, 12, 0, 0);
        await Promise.all([processDueSubscriptions(mockDb, refDate), processDueSubscriptions(mockDb, refDate)]);

        expect(txCount).toBe(1);
        expect(pocketBalance).toBe(451); // 1000 - 549 once, not twice
    });

    it('createSubscription persists to database even if notification scheduling rejects or times out', async () => {
        const executed: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            getFirstAsync: vi.fn(async () => ({ pocket_name: 'Main Wallet', institution_name: 'GCash' })),
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            })
        };

        // Temporarily mock scheduleNotificationAsync to reject
        const Notifications = await import('expo-notifications');
        const origSchedule = Notifications.scheduleNotificationAsync;
        (Notifications as any).scheduleNotificationAsync = vi.fn(async () => {
            throw new Error('Device notification service unavailable');
        });

        try {
            const res = await createSubscription(mockDb, {
                serviceName: 'Disney+',
                serviceCode: 'disney',
                pocketId: 'p_gcash',
                amount: 369,
                frequency: 'monthly',
                startDate: '2026-10-15',
                nextBillingDate: '2026-11-15',
                category: 'Entertainment'
            });

            expect(res.service_name).toBe('Disney+');
            expect(res.status).toBe('active');
            expect(executed[0].sql).toContain('INSERT INTO subscriptions');
            expect(executed[0].params).toContain('Disney+');
        } finally {
            (Notifications as any).scheduleNotificationAsync = origSchedule;
        }
    });

    it('createSubscription persists to database even if notification scheduling rejects or times out', async () => {
        const executed: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            getFirstAsync: vi.fn(async () => ({ pocket_name: 'Main Wallet', institution_name: 'GCash' })),
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            })
        };

        // Temporarily mock scheduleNotificationAsync to reject
        const Notifications = await import('expo-notifications');
        const origSchedule = Notifications.scheduleNotificationAsync;
        (Notifications as any).scheduleNotificationAsync = vi.fn(async () => {
            throw new Error('Device notification service unavailable');
        });

        try {
            const res = await createSubscription(mockDb, {
                serviceName: 'Disney+',
                serviceCode: 'disney',
                pocketId: 'p_gcash',
                amount: 369,
                frequency: 'monthly',
                startDate: '2026-10-15',
                nextBillingDate: '2026-11-15',
                category: 'Entertainment'
            });

            expect(res.service_name).toBe('Disney+');
            expect(res.status).toBe('active');
            expect(executed[0].sql).toContain('INSERT INTO subscriptions');
            expect(executed[0].params).toContain('Disney+');
        } finally {
            (Notifications as any).scheduleNotificationAsync = origSchedule;
        }
    });
});
