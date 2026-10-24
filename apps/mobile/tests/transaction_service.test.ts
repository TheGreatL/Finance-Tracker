import { describe, it, expect, vi } from 'vitest';
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
} from '../src/services/transactionService';

describe('transactionService database operations', () => {
  it('createTransaction updates pocket balance and saves expense record', async () => {
    const executed: { sql: string; params?: any[] }[] = [];
    const mockDb: any = {
      withTransactionAsync: vi.fn(async (cb: () => Promise<void>) => {
        await cb();
      }),
      getFirstAsync: vi.fn(async (sql: string, params: any[]) => {
        if (sql.includes('FROM account_pockets')) {
          return { current_balance: 10000 };
        }
        return null;
      }),
      runAsync: vi.fn(async (sql: string, params: any[]) => {
        executed.push({ sql, params });
        return { changes: 1 };
      }),
    };

    const tx = await createTransaction(mockDb, {
      title: 'Groceries',
      pocket_id: 'pock_1',
      type: 'expense',
      amount: 2500,
      category: 'Food',
      notes: 'Weekly grocery run',
    });

    expect(tx.title).toBe('Groceries');
    expect(tx.amount).toBe(2500);
    expect(tx.type).toBe('expense');

    // Pocket balance should be updated to 10000 - 2500 = 7500
    const updatePocket = executed.find((e) => e.sql.includes('UPDATE account_pockets'));
    expect(updatePocket).toBeDefined();
    expect(updatePocket?.params?.[0]).toBe(7500);
    expect(updatePocket?.params?.[2]).toBe('pock_1');

    // Transaction inserted
    const insertTx = executed.find((e) => e.sql.includes('INSERT INTO transactions'));
    expect(insertTx).toBeDefined();
    expect(insertTx?.params).toContain('Groceries');
    expect(insertTx?.params).toContain(2500);
  });

  it('createTransaction handles transfers between two pockets atomically', async () => {
    const executed: { sql: string; params?: any[] }[] = [];
    const mockDb: any = {
      withTransactionAsync: vi.fn(async (cb: () => Promise<void>) => {
        await cb();
      }),
      getFirstAsync: vi.fn(async (sql: string, params: any[]) => {
        if (params[0] === 'pock_source') {
          return { current_balance: 20000 };
        }
        if (params[0] === 'pock_dest') {
          return { current_balance: 5000 };
        }
        return null;
      }),
      runAsync: vi.fn(async (sql: string, params: any[]) => {
        executed.push({ sql, params });
        return { changes: 1 };
      }),
    };

    const tx = await createTransaction(mockDb, {
      title: 'Transfer to Savings',
      pocket_id: 'pock_source',
      to_pocket_id: 'pock_dest',
      type: 'transfer',
      amount: 4000,
      category: 'Transfer',
    });

    expect(tx.type).toBe('transfer');

    // Check updates for both pockets
    const updates = executed.filter((e) => e.sql.includes('UPDATE account_pockets'));
    expect(updates).toHaveLength(2);

    // Source reduced from 20000 to 16000
    expect(updates[0].params?.[0]).toBe(16000);
    expect(updates[0].params?.[2]).toBe('pock_source');

    // Destination increased from 5000 to 9000
    expect(updates[1].params?.[0]).toBe(9000);
    expect(updates[1].params?.[2]).toBe('pock_dest');
  });

  it('deleteTransaction reverses balances and removes transaction record', async () => {
    const executed: { sql: string; params?: any[] }[] = [];
    const mockDb: any = {
      withTransactionAsync: vi.fn(async (cb: () => Promise<void>) => {
        await cb();
      }),
      getFirstAsync: vi.fn(async (sql: string, params: any[]) => {
        if (sql.includes('FROM transactions')) {
          return {
            id: 'tx_123',
            pocket_id: 'pock_1',
            to_pocket_id: null,
            type: 'expense',
            amount: 1200,
          };
        }
        if (sql.includes('FROM account_pockets')) {
          return { current_balance: 3800 };
        }
        return null;
      }),
      runAsync: vi.fn(async (sql: string, params: any[]) => {
        executed.push({ sql, params });
        return { changes: 1 };
      }),
    };

    await deleteTransaction(mockDb, 'tx_123');

    // Balance restored: 3800 + 1200 = 5000
    const updatePocket = executed.find((e) => e.sql.includes('UPDATE account_pockets'));
    expect(updatePocket?.params?.[0]).toBe(5000);

    // Delete query run
    const deleteTx = executed.find((e) => e.sql.includes('DELETE FROM transactions'));
    expect(deleteTx).toBeDefined();
    expect(deleteTx?.params).toContain('tx_123');
  });
});
