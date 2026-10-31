import { describe, it, expect, vi } from 'vitest';
import { processDuePaydays, recordPaydayManual } from '../src/services/salaryService';

describe('salary payday processing & ledger balance synchronization', () => {
    it('processDuePaydays identifies due paydays, inserts income transaction, credits pocket, and records pay slip', async () => {
        const executed: { sql: string; params?: any[] }[] = [];
        const mockDb: any = {
            withTransactionAsync: vi.fn(async (cb: () => Promise<void>) => {
                await cb();
            }),
            runAsync: vi.fn(async (sql: string, params?: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            }),
            getAllAsync: vi.fn(async (sql: string, params?: any[]) => {
                if (sql.includes('FROM jobs')) {
                    // 1 active job with semi-monthly pay dates 15 and 30
                    return [
                        {
                            id: 'job_senior_dev',
                            title: 'Senior Developer',
                            company_name: 'Stripe PH',
                            employment_type: 'full_time',
                            pay_schedule: 'semi_monthly',
                            pay_day_1: 15,
                            pay_day_2: 30,
                            gross_salary: 60000,
                            salary_period: 'per_paycheck',
                            target_pocket_id: 'pocket_savings_1',
                            status: 'active',
                            created_at: '2026-01-01',
                            updated_at: '2026-01-01',
                            pocket_name: 'Savings Pocket'
                        }
                    ];
                }
                if (sql.includes('FROM job_deductions')) {
                    return [
                        { id: 'd1', job_id: 'job_senior_dev', name: 'Withholding Tax', category: 'tax', amount: 6000 },
                        { id: 'd2', job_id: 'job_senior_dev', name: 'SSS', category: 'statutory', amount: 1125 }
                    ];
                }
                return [];
            }),
            getFirstAsync: vi.fn(async (sql: string, params?: any[]) => {
                if (sql.includes('FROM pay_slips WHERE job_id = ? AND pay_date = ?')) {
                    // No pay slip recorded yet for this date
                    return null;
                }
                if (sql.includes('FROM account_pockets WHERE id = ?')) {
                    return { id: 'pocket_savings_1', current_balance: 25000, name: 'Savings Pocket' };
                }
                if (sql.includes('FROM pay_slips WHERE id = ?')) {
                    return {
                        id: params?.[0] || 'ps_1',
                        job_id: 'job_senior_dev',
                        pocket_id: 'pocket_savings_1',
                        pay_date: '2026-10-15',
                        gross_amount: 60000,
                        total_deductions: 7125,
                        net_amount: 52875,
                        deductions_snapshot: '[]',
                        status: 'paid'
                    };
                }
                return null;
            })
        };

        // Reference date: Oct 15, 2026
        const refDate = new Date(2026, 9, 15);
        const result = await processDuePaydays(mockDb, refDate);

        expect(result.processedCount).toBe(1);
        expect(result.totalCredited).toBe(52875); // 60,000 - 7,125 deductions = 52,875

        // Verify transaction insertion
        const insertTx = executed.find((e) => e.sql.includes('INSERT INTO transactions'));
        expect(insertTx).toBeDefined();
        expect(insertTx?.params).toContain('Salary: Senior Developer (Stripe PH)');
        expect(insertTx?.params).toContain(52875);
        expect(insertTx?.params).toContain('income');
        expect(insertTx?.params).toContain('Salary');
        expect(insertTx?.params).toContain('pocket_savings_1');

        // Verify pocket balance credit (25,000 + 52,875 = 77,875)
        const updatePocket = executed.find((e) => e.sql.includes('UPDATE account_pockets SET current_balance'));
        expect(updatePocket).toBeDefined();
        expect(updatePocket?.params?.[0]).toBe(77875);
        expect(updatePocket?.params?.[2]).toBe('pocket_savings_1');

        // Verify pay slip insertion with deductions snapshot
        const insertPaySlip = executed.find((e) => e.sql.includes('INSERT INTO pay_slips'));
        expect(insertPaySlip).toBeDefined();
        expect(insertPaySlip?.params).toContain('job_senior_dev');
        expect(insertPaySlip?.params).toContain(60000); // gross
        expect(insertPaySlip?.params).toContain(7125); // deductions
        expect(insertPaySlip?.params).toContain(52875); // net
        expect(insertPaySlip?.params).toContain('2026-10-15');

        // Deductions snapshot JSON string check
        const snapshotParam = insertPaySlip?.params?.find((p) => typeof p === 'string' && p.includes('Withholding Tax'));
        expect(snapshotParam).toBeDefined();
        const parsedSnapshot = JSON.parse(snapshotParam as string);
        expect(parsedSnapshot.length).toBe(2);
        expect(parsedSnapshot[0].name).toBe('Withholding Tax');

        // Verify in-app notification insertion
        const insertNotif = executed.find((e) => e.sql.includes('INSERT INTO app_notifications'));
        expect(insertNotif).toBeDefined();
        expect(insertNotif?.params).toContain('salary_deposit');
    });

    it('processDuePaydays is idempotent and skips jobs already paid on reference pay date', async () => {
        const executed: { sql: string; params?: any[] }[] = [];
        const mockDb: any = {
            withTransactionAsync: vi.fn(async (cb: () => Promise<void>) => {
                await cb();
            }),
            runAsync: vi.fn(async (sql: string, params?: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            }),
            getAllAsync: vi.fn(async (sql: string) => {
                if (sql.includes('FROM jobs')) {
                    return [
                        {
                            id: 'job_already_paid',
                            title: 'Designer',
                            company_name: 'Studio',
                            employment_type: 'contract',
                            pay_schedule: 'monthly',
                            pay_day_1: 15,
                            gross_salary: 40000,
                            salary_period: 'per_paycheck',
                            target_pocket_id: 'pock_1',
                            status: 'active',
                            created_at: '2026-01-01',
                            updated_at: '2026-01-01'
                        }
                    ];
                }
                return [];
            }),
            getFirstAsync: vi.fn(async (sql: string) => {
                if (sql.includes('FROM pay_slips WHERE job_id = ? AND pay_date = ?')) {
                    // Already paid!
                    return { id: 'ps_existing', pay_date: '2026-10-15' };
                }
                return null;
            })
        };

        const refDate = new Date(2026, 9, 15);
        const result = await processDuePaydays(mockDb, refDate);

        expect(result.processedCount).toBe(0);
        expect(result.totalCredited).toBe(0);
        expect(executed.filter((e) => e.sql.includes('INSERT INTO transactions')).length).toBe(0);
    });

    it('recordPaydayManual manually triggers payday deposit for a specified date', async () => {
        const executed: { sql: string; params?: any[] }[] = [];
        const mockDb: any = {
            withTransactionAsync: vi.fn(async (cb: () => Promise<void>) => {
                await cb();
            }),
            runAsync: vi.fn(async (sql: string, params?: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            }),
            getFirstAsync: vi.fn(async (sql: string) => {
                if (sql.includes('FROM jobs')) {
                    return {
                        id: 'job_manual',
                        title: 'Consultant',
                        company_name: 'Global Advisory',
                        employment_type: 'contract',
                        pay_schedule: 'monthly',
                        pay_day_1: 30,
                        gross_salary: 100000,
                        salary_period: 'per_paycheck',
                        target_pocket_id: 'pock_bpi',
                        status: 'active',
                        created_at: '2026-01-01',
                        updated_at: '2026-01-01'
                    };
                }
                if (sql.includes('FROM account_pockets WHERE id = ?')) {
                    return { id: 'pock_bpi', current_balance: 50000 };
                }
                if (sql.includes('FROM pay_slips WHERE id = ?')) {
                    return {
                        id: 'ps_manual_123',
                        job_id: 'job_manual',
                        pocket_id: 'pock_bpi',
                        pay_date: '2026-10-28',
                        gross_amount: 100000,
                        total_deductions: 10000,
                        net_amount: 90000,
                        deductions_snapshot: '[]',
                        status: 'paid',
                        created_at: '2026-10-28',
                        updated_at: '2026-10-28'
                    };
                }
                return null;
            }),
            getAllAsync: vi.fn(async (sql: string) => {
                if (sql.includes('FROM job_deductions')) {
                    return [{ id: 'd1', job_id: 'job_manual', name: 'Tax', category: 'tax', amount: 10000 }];
                }
                return [];
            })
        };

        const paySlip = await recordPaydayManual(mockDb, 'job_manual', '2026-10-28', 'Early holiday payout');

        expect(paySlip.net_amount).toBe(90000);
        expect(executed.some((e) => e.sql.includes('INSERT INTO transactions'))).toBe(true);
        expect(executed.some((e) => e.sql.includes('UPDATE account_pockets'))).toBe(true);
        expect(executed.some((e) => e.sql.includes('INSERT INTO pay_slips'))).toBe(true);
    });
});
