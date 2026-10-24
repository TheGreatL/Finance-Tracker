import { describe, it, expect, vi } from 'vitest';
import { updateInstitutionNotes, createInstitutionWithPocket } from '../src/services/accountService';

describe('accountService notes functionality', () => {
  it('updateInstitutionNotes executes UPDATE query with trimmed notes and updated_at', async () => {
    const executedQueries: { sql: string; params: any[] }[] = [];
    const mockDb: any = {
      runAsync: vi.fn(async (sql: string, params: any[]) => {
        executedQueries.push({ sql, params });
        return { changes: 1 };
      }),
    };

    await updateInstitutionNotes(mockDb, 'inst_123', '  Payroll Account  ');

    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
    expect(executedQueries[0].sql).toContain('UPDATE institutions SET notes = ?');
    expect(executedQueries[0].params[0]).toBe('Payroll Account');
    expect(executedQueries[0].params[2]).toBe('inst_123');
    // Ensure ISO date string was passed
    expect(new Date(executedQueries[0].params[1]).getTime()).not.toBeNaN();
  });

  it('updateInstitutionNotes handles empty string cleanly', async () => {
    const mockDb: any = {
      runAsync: vi.fn(async () => ({ changes: 1 })),
    };

    await updateInstitutionNotes(mockDb, 'inst_456', '   ');

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE institutions SET notes = ?'),
      ['', expect.any(String), 'inst_456']
    );
  });

  it('createInstitutionWithPocket persists notes in institutions table', async () => {
    const queries: { sql: string; params: any[] }[] = [];
    const mockDb: any = {
      withTransactionAsync: vi.fn(async (cb: () => Promise<void>) => {
        await cb();
      }),
      runAsync: vi.fn(async (sql: string, params: any[]) => {
        queries.push({ sql, params });
        return { changes: 1 };
      }),
    };

    const res = await createInstitutionWithPocket(mockDb, {
      code: 'bdo',
      customName: 'BDO Savings',
      notes: 'Joint Account with Spouse',
      pocketName: 'Savings',
      pocketType: 'savings',
      startingBalance: 10000,
    });

    expect(res.institution.name).toBe('BDO Savings');
    expect(res.institution.notes).toBe('Joint Account with Spouse');

    // Verify insert into institutions included notes
    const instInsert = queries.find((q) => q.sql.includes('INSERT INTO institutions'));
    expect(instInsert).toBeDefined();
    expect(instInsert?.params).toContain('Joint Account with Spouse');
  });
});
