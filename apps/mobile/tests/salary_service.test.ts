import { describe, it, expect, vi } from 'vitest';
import {
    calculateNetTakeHome,
    normalizeMonthlySalary,
    categorizeDeductions,
    clampDayToMonth,
    getNextPayDate,
    createJob,
    getAllJobs,
    getJobById,
    updateJob,
    archiveJob,
    unarchiveJob,
    deleteJob,
    getIncomeSummary
} from '../src/services/salaryService';
import type { CreateJobInput, CreateDeductionInput } from '../src/types/database';

describe('salaryService calculation engine', () => {
    describe('calculateNetTakeHome', () => {
        it('correctly calculates net pay with fixed deductions', () => {
            const gross = 50000;
            const deductions: CreateDeductionInput[] = [
                { name: 'Income Tax', category: 'tax', amount: 4500 },
                { name: 'SSS', category: 'statutory', amount: 1125 },
                { name: 'PhilHealth', category: 'statutory', amount: 1250 },
                { name: 'Pag-IBIG', category: 'statutory', amount: 200 }
            ];

            const res = calculateNetTakeHome(gross, deductions);
            expect(res.totalDeductions).toBe(7075);
            expect(res.netTakeHome).toBe(42925);
        });

        it('handles percentage-based deductions relative to gross pay', () => {
            const gross = 60000;
            const deductions: CreateDeductionInput[] = [
                { name: 'Tax', category: 'tax', amount: 0, isPercentage: true, percentageRate: 10 }, // 6,000
                { name: 'Retirement', category: 'workplace', amount: 0, isPercentage: true, percentageRate: 5 }, // 3,000
                { name: 'Fixed Health Fee', category: 'workplace', amount: 1000 }
            ];

            const res = calculateNetTakeHome(gross, deductions);
            expect(res.totalDeductions).toBe(10000);
            expect(res.netTakeHome).toBe(50000);
            expect(res.itemized[0].amount).toBe(6000);
            expect(res.itemized[1].amount).toBe(3000);
            expect(res.itemized[2].amount).toBe(1000);
        });

        it('clamps net take-home to 0 if total deductions exceed gross', () => {
            const gross = 5000;
            const deductions: CreateDeductionInput[] = [{ name: 'Heavy Loan', category: 'workplace', amount: 6000 }];

            const res = calculateNetTakeHome(gross, deductions);
            expect(res.totalDeductions).toBe(6000);
            expect(res.netTakeHome).toBe(0);
        });
    });

    describe('normalizeMonthlySalary', () => {
        it('normalizes monthly salary correctly', () => {
            expect(normalizeMonthlySalary(60000, 'monthly')).toBe(60000);
        });

        it('normalizes semi-monthly salary (twice a month)', () => {
            expect(normalizeMonthlySalary(30000, 'semi_monthly')).toBe(60000);
        });

        it('normalizes biweekly salary (26 pay periods / 12)', () => {
            const perPaycheck = 25000;
            const expected = Math.round(((25000 * 26) / 12) * 100) / 100;
            expect(normalizeMonthlySalary(perPaycheck, 'biweekly')).toBe(expected);
        });

        it('normalizes weekly salary (52 pay periods / 12)', () => {
            const perWeek = 10000;
            const expected = Math.round(((10000 * 52) / 12) * 100) / 100;
            expect(normalizeMonthlySalary(perWeek, 'weekly')).toBe(expected);
        });
    });

    describe('categorizeDeductions', () => {
        it('aggregates deductions by category', () => {
            const deductions: CreateDeductionInput[] = [
                { name: 'Withholding Tax', category: 'tax', amount: 5000 },
                { name: 'SSS', category: 'statutory', amount: 1125 },
                { name: 'PhilHealth', category: 'statutory', amount: 1250 },
                { name: 'Pag-IBIG', category: 'statutory', amount: 200 },
                { name: 'HMO Dependent', category: 'workplace', amount: 1500 },
                { name: 'Charity', category: 'other', amount: 300 }
            ];

            const categorized = categorizeDeductions(deductions);
            expect(categorized.tax).toBe(5000);
            expect(categorized.statutory).toBe(2575);
            expect(categorized.workplace).toBe(1500);
            expect(categorized.other).toBe(300);
            expect(categorized.total).toBe(9375);
        });
    });

    describe('clampDayToMonth', () => {
        it('clamps 31st to 28th for non-leap February (e.g. 2026)', () => {
            expect(clampDayToMonth(2026, 1, 31)).toBe(28); // Month index 1 = February
        });

        it('clamps 31st to 29th for leap February (e.g. 2024)', () => {
            expect(clampDayToMonth(2024, 1, 31)).toBe(29);
        });

        it('clamps 31st to 30th for 30-day months like April and September', () => {
            expect(clampDayToMonth(2026, 3, 31)).toBe(30); // Month 3 = April
            expect(clampDayToMonth(2026, 8, 31)).toBe(30); // Month 8 = September
        });

        it('preserves valid day within month', () => {
            expect(clampDayToMonth(2026, 0, 15)).toBe(15);
            expect(clampDayToMonth(2026, 0, 31)).toBe(31); // Month 0 = January
        });
    });

    describe('getNextPayDate', () => {
        it('calculates next monthly payday in same month when before pay day', () => {
            const from = new Date(2026, 9, 10); // Oct 10, 2026
            const nextDate = getNextPayDate('monthly', 30, null, from);
            expect(nextDate).toBe('2026-10-30');
        });

        it('rolls over to next month if past pay day', () => {
            const from = new Date(2026, 9, 31); // Oct 31, 2026
            const nextDate = getNextPayDate('monthly', 15, null, from);
            expect(nextDate).toBe('2026-11-15');
        });

        it('handles semi-monthly schedule with 15th and 30th', () => {
            // If today is Oct 10, next is Oct 15
            const from1 = new Date(2026, 9, 10);
            expect(getNextPayDate('semi_monthly', 15, 30, from1)).toBe('2026-10-15');

            // If today is Oct 16, next is Oct 30
            const from2 = new Date(2026, 9, 16);
            expect(getNextPayDate('semi_monthly', 15, 30, from2)).toBe('2026-10-30');

            // If today is Oct 31, next is Nov 15
            const from3 = new Date(2026, 9, 31);
            expect(getNextPayDate('semi_monthly', 15, 30, from3)).toBe('2026-11-15');
        });

        it('clamps to February 28 when pay day is 30/31', () => {
            const from = new Date(2026, 1, 16); // Feb 16, 2026
            const nextDate = getNextPayDate('semi_monthly', 15, 30, from);
            expect(nextDate).toBe('2026-02-28');
        });
    });
});

describe('salaryService database CRUD', () => {
    it('createJob inserts job and relational deductions in transaction', async () => {
        const executed: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            withTransactionAsync: vi.fn(async (cb: () => Promise<void>) => {
                await cb();
            }),
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            }),
            getFirstAsync: vi.fn(async (sql: string, params: any[]) => {
                if (sql.includes('FROM jobs')) {
                    return {
                        id: params[0],
                        title: 'Senior Software Engineer',
                        company_name: 'Acme Corp',
                        employment_type: 'full_time',
                        pay_schedule: 'semi_monthly',
                        pay_day_1: 15,
                        pay_day_2: 30,
                        gross_salary: 65000,
                        salary_period: 'per_paycheck',
                        target_pocket_id: 'pocket_maya_savings',
                        status: 'active',
                        color: '#00D665',
                        notes: 'Primary full-time job',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                }
                return null;
            }),
            getAllAsync: vi.fn(async (sql: string, params: any[]) => {
                if (sql.includes('FROM job_deductions')) {
                    return [
                        { id: 'ded_1', job_id: params[0], name: 'Income Tax', category: 'tax', amount: 7500 },
                        { id: 'ded_2', job_id: params[0], name: 'SSS', category: 'statutory', amount: 1125 },
                        { id: 'ded_3', job_id: params[0], name: 'PhilHealth', category: 'statutory', amount: 1250 }
                    ];
                }
                return [];
            })
        };

        const jobInput: CreateJobInput = {
            title: 'Senior Software Engineer',
            companyName: 'Acme Corp',
            employmentType: 'full_time',
            paySchedule: 'semi_monthly',
            payDay1: 15,
            payDay2: 30,
            grossSalary: 65000,
            salaryPeriod: 'per_paycheck',
            targetPocketId: 'pocket_maya_savings',
            color: '#00D665',
            notes: 'Primary full-time job'
        };

        const deductions: CreateDeductionInput[] = [
            { name: 'Income Tax', category: 'tax', amount: 7500 },
            { name: 'SSS', category: 'statutory', amount: 1125 },
            { name: 'PhilHealth', category: 'statutory', amount: 1250 }
        ];

        const job = await createJob(mockDb, jobInput, deductions);
        expect(job.title).toBe('Senior Software Engineer');
        expect(job.company_name).toBe('Acme Corp');
        expect(job.status).toBe('active');

        // Should insert job
        const jobInsert = executed.find((e) => e.sql.includes('INSERT INTO jobs'));
        expect(jobInsert).toBeDefined();
        expect(jobInsert?.params).toContain('Senior Software Engineer');

        // Should insert 3 deductions
        const deductionInserts = executed.filter((e) => e.sql.includes('INSERT INTO job_deductions'));
        expect(deductionInserts.length).toBe(3);
    });

    it('archiveJob and unarchiveJob update job status', async () => {
        const executed: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            })
        };

        await archiveJob(mockDb, 'job_123');
        expect(executed[0].sql).toContain('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?');
        expect(executed[0].params[0]).toBe('archived');
        expect(executed[0].params[2]).toBe('job_123');

        await unarchiveJob(mockDb, 'job_123');
        expect(executed[1].params[0]).toBe('active');
    });

    it('deleteJob deletes job and cascades deductions', async () => {
        const executed: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            withTransactionAsync: vi.fn(async (cb: () => Promise<void>) => {
                await cb();
            }),
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            })
        };

        await deleteJob(mockDb, 'job_123');
        const del = executed.find((e) => e.sql.includes('DELETE FROM jobs WHERE id = ?'));
        expect(del).toBeDefined();
        expect(del?.params[0]).toBe('job_123');
    });

    it('getAllJobs and getJobById fetch jobs with computed deductions and net pay', async () => {
        const mockDb: any = {
            getAllAsync: vi.fn(async (sql: string) => {
                if (sql.includes('FROM jobs')) {
                    return [
                        {
                            id: 'job_1',
                            title: 'Frontend Lead',
                            company_name: 'Tech Inc',
                            employment_type: 'full_time',
                            pay_schedule: 'semi_monthly',
                            pay_day_1: 15,
                            pay_day_2: 30,
                            gross_salary: 80000,
                            salary_period: 'per_paycheck',
                            target_pocket_id: 'pock_1',
                            status: 'active',
                            created_at: '2026-01-01',
                            updated_at: '2026-01-01',
                            pocket_name: 'Main Wallet'
                        }
                    ];
                }
                if (sql.includes('FROM job_deductions')) {
                    return [{ id: 'd1', job_id: 'job_1', name: 'Tax', category: 'tax', amount: 10000 }];
                }
                return [];
            }),
            getFirstAsync: vi.fn(async (sql: string) => {
                if (sql.includes('FROM jobs')) {
                    return {
                        id: 'job_1',
                        title: 'Frontend Lead',
                        company_name: 'Tech Inc',
                        employment_type: 'full_time',
                        pay_schedule: 'semi_monthly',
                        pay_day_1: 15,
                        pay_day_2: 30,
                        gross_salary: 80000,
                        salary_period: 'per_paycheck',
                        target_pocket_id: 'pock_1',
                        status: 'active',
                        created_at: '2026-01-01',
                        updated_at: '2026-01-01',
                        pocket_name: 'Main Wallet'
                    };
                }
                return null;
            })
        };

        const jobs = await getAllJobs(mockDb, 'active');
        expect(jobs.length).toBe(1);
        expect(jobs[0].total_deductions).toBe(10000);
        expect(jobs[0].net_take_home).toBe(70000);
        expect(jobs[0].monthly_gross).toBe(160000); // 80,000 * 2 for semi-monthly

        const singleJob = await getJobById(mockDb, 'job_1');
        expect(singleJob).toBeDefined();
        expect(singleJob?.title).toBe('Frontend Lead');
    });

    it('updateJob modifies fields and replaces deductions', async () => {
        const executed: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            withTransactionAsync: vi.fn(async (cb: () => Promise<void>) => {
                await cb();
            }),
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            }),
            getFirstAsync: vi.fn(async () => ({
                id: 'job_1',
                title: 'Staff Architect',
                company_name: 'Tech Inc',
                employment_type: 'full_time',
                pay_schedule: 'monthly',
                pay_day_1: 30,
                gross_salary: 120000,
                salary_period: 'per_paycheck',
                target_pocket_id: 'pock_1',
                status: 'active',
                created_at: '2026-01-01',
                updated_at: '2026-01-01'
            })),
            getAllAsync: vi.fn(async () => [])
        };

        const updated = await updateJob(mockDb, 'job_1', { title: 'Staff Architect', grossSalary: 120000 }, [
            { name: 'Tax', category: 'tax', amount: 15000 }
        ]);

        expect(updated.title).toBe('Staff Architect');
        const updateSql = executed.find((e) => e.sql.includes('UPDATE jobs SET'));
        expect(updateSql).toBeDefined();
        expect(updateSql?.params).toContain('Staff Architect');

        const deleteOldDeds = executed.find((e) => e.sql.includes('DELETE FROM job_deductions'));
        expect(deleteOldDeds).toBeDefined();
    });

    it('getIncomeSummary aggregates all active jobs into monthly gross and net', async () => {
        const mockDb: any = {
            getAllAsync: vi.fn(async (sql: string, params: any[]) => {
                if (sql.includes('FROM jobs')) {
                    if (params && params[0] === 'active') {
                        return [
                            {
                                id: 'job_1',
                                title: 'Engineer',
                                company_name: 'Acme',
                                employment_type: 'full_time',
                                pay_schedule: 'semi_monthly',
                                pay_day_1: 15,
                                pay_day_2: 30,
                                gross_salary: 50000,
                                salary_period: 'per_paycheck',
                                target_pocket_id: 'pock_1',
                                status: 'active',
                                created_at: '2026-01-01',
                                updated_at: '2026-01-01',
                                pocket_name: 'Maya Wallet',
                                institution_color: '#00D665'
                            }
                        ];
                    }
                    return [];
                }
                if (sql.includes('FROM job_deductions')) {
                    return [
                        { id: 'd1', job_id: 'job_1', name: 'Withholding Tax', category: 'tax', amount: 5000 },
                        { id: 'd2', job_id: 'job_1', name: 'SSS', category: 'statutory', amount: 1000 }
                    ];
                }
                return [];
            })
        };

        const summary = await getIncomeSummary(mockDb);
        expect(summary.activeJobsCount).toBe(1);
        expect(summary.monthlyGross).toBe(100000); // 50,000 * 2
        expect(summary.monthlyDeductions).toBe(12000); // (5000 + 1000) * 2
        expect(summary.monthlyNetTakeHome).toBe(88000); // 100,000 - 12,000
        expect(summary.deductionBreakdown.tax).toBe(10000);
        expect(summary.deductionBreakdown.statutory).toBe(2000);
        expect(summary.nextPayday).toBeDefined();
    });
});
