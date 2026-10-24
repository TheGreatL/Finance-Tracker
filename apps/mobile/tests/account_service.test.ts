import { describe, it, expect, vi } from 'vitest';
import {
  addPocket,
  archivePocket,
  getInstitutionsWithBalances,
  getPocketsByInstitution,
} from '../src/services/accountService';
import type { AccountPocket, Institution } from '../src/types/database';

describe('accountService lifecycle and safety operations', () => {
  it('addPocket creates pocket with default or custom interest rate', async () => {
    const executed: { sql: string; params: any[] }[] = [];
    const mockDb: any = {
      runAsync: vi.fn(async (sql: string, params: any[]) => {
        executed.push({ sql, params });
        return { changes: 1 };
      }),
    };

    const pocket = await addPocket(mockDb, {
      institutionId: 'inst_maya',
      name: 'Personal Savings Goals',
      pocketType: 'savings',
      startingBalance: 5000,
      interestRate: 6.0,
      savingsDetails: '6% p.a. promo',
    });

    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
    expect(pocket.name).toBe('Personal Savings Goals');
    expect(pocket.pocket_type).toBe('savings');
    expect(pocket.current_balance).toBe(5000);
    expect(pocket.interest_rate).toBe(6.0);
    expect(pocket.savings_details).toBe('6% p.a. promo');

    const insert = executed[0];
    expect(insert.sql).toContain('INSERT INTO account_pockets');
    expect(insert.params).toContain('Personal Savings Goals');
    expect(insert.params).toContain(6.0);
  });

  it('archivePocket throws an error if pocket has positive balance', async () => {
    const mockDb: any = {
      getFirstAsync: vi.fn(async () => ({ current_balance: 1500 })),
      runAsync: vi.fn(),
    };

    await expect(archivePocket(mockDb, 'pock_with_money')).rejects.toThrow(
      'Cannot archive a pocket with a positive balance'
    );
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });

  it('archivePocket successfully sets is_archived = 1 when balance is 0', async () => {
    const mockDb: any = {
      getFirstAsync: vi.fn(async () => ({ current_balance: 0 })),
      runAsync: vi.fn(async () => ({ changes: 1 })),
    };

    await archivePocket(mockDb, 'pock_empty');

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE account_pockets SET is_archived = 1'),
      [expect.any(String), 'pock_empty']
    );
  });

  it('getInstitutionsWithBalances executes aggregation query with balance and pocket counts', async () => {
    const mockInstitutions: Institution[] = [
      {
        id: 'inst_1',
        name: 'Maya',
        type: 'ewallet',
        code: 'maya',
        color: '#00D632',
        is_archived: 0,
        created_at: '',
        updated_at: '',
        total_balance: 45000,
        pocket_count: 2,
      },
    ];

    const mockDb: any = {
      getAllAsync: vi.fn(async () => mockInstitutions),
    };

    const result = await getInstitutionsWithBalances(mockDb);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Maya');
    expect(result[0].total_balance).toBe(45000);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('COALESCE(SUM(p.current_balance), 0) AS total_balance'),
      [0]
    );
  });
});

