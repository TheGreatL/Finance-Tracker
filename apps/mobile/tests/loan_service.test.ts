import { describe, it, expect, vi } from 'vitest';
import {
  createLoan,
  getLoansSummary,
  recordLoanPayment,
  deleteLoan,
} from '../src/services/loanService';
import type { LoanRecord } from '../src/types/database';

describe('loanService operations', () => {
  it('createLoan inserts active loan with specified details', async () => {
    const executed: { sql: string; params: any[] }[] = [];
    const mockDb: any = {
      runAsync: vi.fn(async (sql: string, params: any[]) => {
        executed.push({ sql, params });
        return { changes: 1 };
      }),
    };

    const res = await createLoan(mockDb, {
      institutionId: 'inst_gcash',
      title: 'GLoan 6-Month',
      totalAmount: 15000,
      remainingBalance: 15000,
      monthlyPayment: 2500,
      dueDate: '2026-11-15',
      interestRate: 3.5,
      attachmentPath: 'file:///data/attachments/loan_contract.pdf',
      attachmentName: 'contract.pdf',
      notes: 'Business capital',
    });

    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
    expect(res.title).toBe('GLoan 6-Month');
    expect(res.remaining_balance).toBe(15000);
    expect(res.status).toBe('active');
    expect(res.attachment_path).toContain('loan_contract.pdf');

    const insert = executed[0];
    expect(insert.sql).toContain('INSERT INTO loans');
    expect(insert.params).toContain('GLoan 6-Month');
    expect(insert.params).toContain(15000);
    expect(insert.params).toContain('active');
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
      }),
    };

    const res = await createLoan(mockDb, {
      institutionId: 'inst_bdo_1',
      title: 'BDO Personal Loan',
      totalAmount: 50000,
      monthlyPayment: 5000,
      dueDate: '2026-12-01',
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
      }),
    };

    const res = await createLoan(mockDb, {
      institutionId: 'billease',
      title: 'BillEase Installment',
      totalAmount: 8000,
      monthlyPayment: 2000,
      dueDate: '2026-11-20',
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
        updated_at: '',
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
        updated_at: '',
      },
    ];

    const mockDb: any = {
      getAllAsync: vi.fn(async () => mockLoans),
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
            institution_id: 'inst_be',
          };
        }
        if (sql.includes('FROM account_pockets')) {
          return {
            id: 'p1',
            current_balance: 10000, // sufficient balance
          };
        }
        return null;
      }),
      runAsync: vi.fn(async (sql: string, params: any[]) => {
        runQueries.push({ sql, params });
        return { changes: 1 };
      }),
    };

    await recordLoanPayment(mockDb, {
      loanId: 'l1',
      pocketId: 'p1',
      amount: 2500,
      date: '2026-10-25',
      notes: 'October Amortization',
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
      runAsync: vi.fn(async () => ({ changes: 1 })),
    };

    await deleteLoan(mockDb, 'loan_999');
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM loans WHERE id = ?'),
      ['loan_999']
    );
  });
});
