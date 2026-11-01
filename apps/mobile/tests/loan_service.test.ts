import { describe, it, expect, vi } from 'vitest';
import {
    createLoan,
    getLoansSummary,
    getLoansByInstitution,
    recordLoanPayment,
    deleteLoan,
    updateLoanMetadata,
    getLoanTimelineMetrics
} from '../src/services/loanService';
import type { LoanRecord } from '../src/types/database';

describe('loanService operations', () => {
    it('createLoan inserts active loan with specified details', async () => {
        const executed: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            })
        };

        const res = await createLoan(mockDb, {
            institutionId: 'inst_gcash',
            title: 'GLoan 6-Month',
            principalAmount: 13500,
            processingFee: 450,
            totalAmount: 15000,
            remainingBalance: 15000,
            monthlyPayment: 2500,
            startDate: '2026-05-15',
            dueDate: '2026-11-15',
            termMonths: 6,
            interestRate: 3.5,
            hasInterestCashback: true,
            attachmentPath: 'file:///data/attachments/loan_contract.pdf',
            attachmentName: 'contract.pdf',
            notes: 'Business capital'
        });

        expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
        expect(res.title).toBe('GLoan 6-Month');
        expect(res.principal_amount).toBe(13500);
        expect(res.processing_fee).toBe(450);
        expect(res.remaining_balance).toBe(15000);
        expect(res.has_interest_cashback).toBe(1);
        expect(res.status).toBe('active');
        expect(res.attachment_path).toContain('loan_contract.pdf');

        const insert = executed[0];
        expect(insert.sql).toContain('INSERT INTO loans');
        expect(insert.params).toContain('GLoan 6-Month');
        expect(insert.params).toContain(15000);
        expect(insert.params).toContain('active');
    });

    it('createLoan supports person / peer-to-peer loan with lenderName and zero interest', async () => {
        const executed: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            })
        };

        const res = await createLoan(mockDb, {
            lenderType: 'person',
            lenderName: 'Tito Boy',
            title: 'Emergency Medical Loan',
            principalAmount: 20000,
            totalAmount: 20000,
            monthlyPayment: 2000,
            startDate: '2026-01-01',
            dueDate: '2026-02-01',
            termMonths: 10,
            interestRate: 0,
            notes: 'Friendly 0% interest loan from Tito'
        });

        expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
        expect(res.lender_type).toBe('person');
        expect(res.lender_name).toBe('Tito Boy');
        expect(res.institution_id).toBeNull();
        expect(res.principal_amount).toBe(20000);
        expect(res.total_amount).toBe(20000);
    });

    it('createLoan reuses existing institution when code or id matches', async () => {
        const executed: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            getFirstAsync: vi.fn(async (sql: string, params: any[]) => {
                if (sql.includes('FROM institutions WHERE id = ?') && params[0] === 'inst_bdo_1') {
                    return { id: 'inst_bdo_1' };
                }
                return null;
            }),
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            })
        };

        const res = await createLoan(mockDb, {
            institutionId: 'inst_bdo_1',
            title: 'BDO Personal Loan',
            totalAmount: 50000,
            monthlyPayment: 5000,
            dueDate: '2026-12-01'
        });

        expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
        expect(res.institution_id).toBe('inst_bdo_1');
    });

    it('createLoan auto-creates institution record when provider does not exist yet', async () => {
        const executed: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            getFirstAsync: vi.fn(async () => null),
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            })
        };

        const res = await createLoan(mockDb, {
            institutionId: 'billease',
            title: 'BillEase Installment',
            totalAmount: 8000,
            monthlyPayment: 2000,
            dueDate: '2026-11-20'
        });

        // 1st runAsync creates institution, 2nd runAsync creates loan
        expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
        expect(executed[0].sql).toContain('INSERT INTO institutions');
        expect(executed[0].params).toContain('BillEase');
        expect(executed[1].sql).toContain('INSERT INTO loans');
        expect(res.institution_id).toContain('inst_billease_');
    });

    it('getLoansSummary computes total active debt, next due date, and due soon count', async () => {
        const mockLoans: LoanRecord[] = [
            {
                id: 'l1',
                institution_id: 'i1',
                title: 'BillEase Laptop',
                total_amount: 20000,
                remaining_balance: 10000,
                monthly_payment: 2000,
                due_date: '2026-10-28', // 4 days from Oct 24
                status: 'active',
                created_at: '',
                updated_at: ''
            },
            {
                id: 'l2',
                institution_id: 'i2',
                title: 'Tala Fast Cash',
                total_amount: 5000,
                remaining_balance: 3000,
                monthly_payment: 3000,
                due_date: '2026-11-10', // 17 days from Oct 24
                status: 'active',
                created_at: '',
                updated_at: ''
            }
        ];

        const mockDb: any = {
            getAllAsync: vi.fn(async () => mockLoans)
        };

        const referenceDate = new Date('2026-10-24T00:00:00.000');
        const summary = await getLoansSummary(mockDb, referenceDate);

        expect(summary.totalLoanBalance).toBe(13000); // 10000 + 3000
        expect(summary.activeCount).toBe(2);
        expect(summary.nextDueLoan?.id).toBe('l1');
        expect(summary.nextDueLoan?.due_date).toBe('2026-10-28');
        expect(summary.dueSoonCount).toBe(1); // Oct 28 is <= 7 days
    });

    it('recordLoanPayment deducts from pocket and loan balance, marking status paid when 0', async () => {
        const runQueries: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            withTransactionAsync: vi.fn(async (cb: () => Promise<void>) => {
                await cb();
            }),
            getFirstAsync: vi.fn(async (sql: string, params: any[]) => {
                if (sql.includes('FROM loans')) {
                    return {
                        id: 'l1',
                        title: 'BillEase Phone',
                        remaining_balance: 2500, // exact remaining balance
                        monthly_payment: 2500,
                        due_date: '2026-10-30',
                        institution_id: 'inst_be'
                    };
                }
                if (sql.includes('FROM account_pockets')) {
                    return {
                        id: 'p1',
                        current_balance: 10000 // sufficient balance
                    };
                }
                return null;
            }),
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                runQueries.push({ sql, params });
                return { changes: 1 };
            })
        };

        await recordLoanPayment(mockDb, {
            loanId: 'l1',
            pocketId: 'p1',
            amount: 2500,
            date: '2026-10-25',
            notes: 'October Amortization'
        });

        // 1. Pocket balance deducted
        const pocketUpdate = runQueries.find((q) => q.sql.includes('UPDATE account_pockets'));
        expect(pocketUpdate).toBeDefined();
        expect(pocketUpdate?.params[0]).toBe(7500); // 10000 - 2500

        // 2. Loan remaining balance updated to 0 and status 'paid'
        const loanUpdate = runQueries.find((q) => q.sql.includes('UPDATE loans'));
        expect(loanUpdate).toBeDefined();
        expect(loanUpdate?.params[0]).toBe(0); // 2500 - 2500
        expect(loanUpdate?.params[1]).toBe('paid'); // marked paid!

        // 3. Transaction logged as expense under 'Loan Payment'
        const txInsert = runQueries.find((q) => q.sql.includes('INSERT INTO transactions'));
        expect(txInsert).toBeDefined();
        expect(txInsert?.params).toContain('Loan Payment: BillEase Phone');
        expect(txInsert?.params).toContain(2500);
        expect(txInsert?.params).toContain('Loan Payment');
    });

    it('deleteLoan removes loan record', async () => {
        const mockDb: any = {
            runAsync: vi.fn(async () => ({ changes: 1 }))
        };

        await deleteLoan(mockDb, 'loan_999');
        expect(mockDb.runAsync).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM loans WHERE id = ?'), ['loan_999']);
    });

    it('updateLoanMetadata updates descriptive metadata without modifying remaining balance', async () => {
        const executed: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            getFirstAsync: vi.fn(async (sql: string, params: any[]) => {
                if (sql.includes('FROM loans WHERE id = ?')) {
                    return {
                        id: 'loan_123',
                        institution_id: 'inst_maya',
                        title: 'Old Loan Title',
                        total_amount: 20000,
                        remaining_balance: 15000,
                        monthly_payment: 2000,
                        due_date: '2026-11-01',
                        notes: 'Old notes',
                        attachment_path: 'old/path.pdf',
                        attachment_name: 'old.pdf',
                        status: 'active'
                    };
                }
                if (sql.includes('FROM institutions WHERE id = ?')) {
                    return { id: 'inst_bdo' };
                }
                return null;
            }),
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            })
        };

        await updateLoanMetadata(mockDb, 'loan_123', {
            title: 'Updated Loan Title',
            institutionId: 'inst_bdo',
            lenderType: 'institution',
            lenderName: '',
            principalAmount: 18000,
            processingFee: 500,
            startDate: '2026-01-15',
            termMonths: 12,
            dueDate: '2026-11-15',
            monthlyPayment: 2500,
            interestRate: 2.5,
            hasInterestCashback: true,
            notes: 'Updated repayment terms',
            attachmentPath: 'new/contract.pdf',
            attachmentName: 'contract.pdf'
        });

        const updateQuery = executed.find((e) => e.sql.includes('UPDATE loans'));
        expect(updateQuery).toBeDefined();
        expect(updateQuery?.params).toContain('Updated Loan Title');
        expect(updateQuery?.params).toContain('inst_bdo');
        expect(updateQuery?.params).toContain(18000);
        expect(updateQuery?.params).toContain(500);
        expect(updateQuery?.params).toContain('2026-01-15');
        expect(updateQuery?.params).toContain(12);
        expect(updateQuery?.params).toContain('2026-11-15');
        expect(updateQuery?.params).toContain(2500);
        expect(updateQuery?.params).toContain(2.5);
        expect(updateQuery?.params).toContain(1);
        expect(updateQuery?.params).toContain('Updated repayment terms');
        expect(updateQuery?.params).toContain('new/contract.pdf');
        expect(updateQuery?.params).toContain('contract.pdf');
        expect(updateQuery?.params).toContain('loan_123');
    });

    it('recordLoanPayment handles early payoff with interest cashback refund', async () => {
        const runQueries: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            withTransactionAsync: vi.fn(async (cb: () => Promise<void>) => {
                await cb();
            }),
            getFirstAsync: vi.fn(async (sql: string, params: any[]) => {
                if (sql.includes('FROM loans WHERE id = ?')) {
                    return {
                        id: 'loan_gloan',
                        title: 'GLoan',
                        remaining_balance: 5000,
                        has_interest_cashback: 1,
                        interest_cashback_received: 0,
                        status: 'active'
                    };
                }
                if (sql.includes('FROM account_pockets WHERE id = ?')) {
                    return { current_balance: 10000 };
                }
                return null;
            }),
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                runQueries.push({ sql, params });
                return { changes: 1 };
            })
        };

        await recordLoanPayment(mockDb, {
            loanId: 'loan_gloan',
            pocketId: 'pocket_gcash',
            amount: 5000,
            date: '2026-10-31',
            interestCashback: 850
        });

        // Verifies loan marked paid
        const loanUpdate = runQueries.find((q) => q.sql.includes('UPDATE loans SET remaining_balance = ?'));
        expect(loanUpdate?.params[0]).toBe(0);
        expect(loanUpdate?.params[1]).toBe('paid');

        // Verifies cashback recorded
        const cashbackUpdate = runQueries.find((q) => q.sql.includes('interest_cashback_received + ?'));
        expect(cashbackUpdate).toBeDefined();
        expect(cashbackUpdate?.params[0]).toBe(850);

        // Verifies cashback transaction inserted
        const cashbackTx = runQueries.find((q) => q.sql.includes('INSERT INTO transactions') && q.params.includes('Loan Interest Cashback: GLoan'));
        expect(cashbackTx).toBeDefined();
        expect(cashbackTx?.params).toContain(850);
        expect(cashbackTx?.sql).toContain("'income'");
    });

    it('getLoanTimelineMetrics computes net proceeds, total interest, maturity date, and progress', () => {
        const mockLoan: LoanRecord = {
            id: 'loan_1',
            lender_type: 'institution',
            institution_id: 'inst_cimb',
            title: 'CIMB Personal Loan',
            principal_amount: 50000,
            processing_fee: 1500,
            total_amount: 58000,
            remaining_balance: 29000,
            monthly_payment: 2416.67,
            start_date: '2026-01-15',
            due_date: '2026-07-15',
            term_months: 24,
            interest_rate: 8,
            has_interest_cashback: 1,
            interest_cashback_received: 0,
            status: 'active',
            created_at: '2026-01-15T00:00:00Z',
            updated_at: '2026-01-15T00:00:00Z'
        };

        // Reference date = 2026-07-15 (6 months in)
        const metrics = getLoanTimelineMetrics(mockLoan, new Date(2026, 6, 15));

        expect(metrics.principalAmount).toBe(50000);
        expect(metrics.processingFee).toBe(1500);
        expect(metrics.netProceeds).toBe(48500);
        expect(metrics.totalInterest).toBe(8000);
        expect(metrics.projectedMaturityDate).toBe('2028-01-15');
        expect(metrics.elapsedMonths).toBe(6);
        expect(metrics.remainingMonths).toBe(18);
        expect(metrics.termProgressPercent).toBe(25);
        expect(metrics.financialProgressPercent).toBe(50); // 29,000 / 58,000 = 50%
        expect(metrics.isEligibleForEarlyCashback).toBe(true);
    });

    it('getLoansByInstitution queries loans filtered by institution_id', async () => {
        const mockDb: any = {
            getAllAsync: vi.fn(async (sql: string, params: any[]) => {
                if (sql.includes('WHERE l.institution_id = ?') && params[0] === 'inst_maya_1') {
                    return [
                        {
                            id: 'loan_maya_personal',
                            institution_id: 'inst_maya_1',
                            title: 'Maya Personal Loan',
                            total_amount: 30000,
                            remaining_balance: 24000,
                            monthly_payment: 3000,
                            due_date: '2026-11-28',
                            status: 'active',
                            institution_name: 'Maya',
                            institution_code: 'maya'
                        }
                    ];
                }
                return [];
            })
        };

        const res = await getLoansByInstitution(mockDb, 'inst_maya_1');
        expect(mockDb.getAllAsync).toHaveBeenCalledWith(expect.stringContaining('WHERE l.institution_id = ?'), ['inst_maya_1']);
        expect(res).toHaveLength(1);
        expect(res[0].title).toBe('Maya Personal Loan');
        expect(res[0].remaining_balance).toBe(24000);
    });

    it('getLoansByInstitution returns personal loans when institutionId is omitted', async () => {
        const mockDb: any = {
            getAllAsync: vi.fn(async (sql: string) => {
                if (sql.includes('WHERE l.institution_id IS NULL')) {
                    return [
                        {
                            id: 'loan_peer_1',
                            institution_id: null,
                            lender_type: 'person',
                            lender_name: 'Kuya Mark',
                            title: 'Family Loan',
                            total_amount: 10000,
                            remaining_balance: 5000,
                            monthly_payment: 1000,
                            due_date: '2026-12-01',
                            status: 'active'
                        }
                    ];
                }
                return [];
            })
        };

        const res = await getLoansByInstitution(mockDb);
        expect(mockDb.getAllAsync).toHaveBeenCalledWith(expect.stringContaining('WHERE l.institution_id IS NULL'));
        expect(res).toHaveLength(1);
        expect(res[0].lender_name).toBe('Kuya Mark');
    });
});
