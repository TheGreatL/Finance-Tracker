import { describe, it, expect, vi } from 'vitest';
import {
    addPocket,
    archivePocket,
    getInstitutionsWithBalances,
    updatePocketMetadata,
    createInstitutionWithPocket,
    reconcilePocketBalance,
    backfillInitialBalanceTransactions
} from '../src/services/accountService';
import type { Institution } from '../src/types/database';

describe('accountService lifecycle and safety operations', () => {
    it('addPocket creates pocket with default or custom interest rate and logs initial balance in ledger', async () => {
        const executed: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            })
        };

        const pocket = await addPocket(mockDb, {
            institutionId: 'inst_maya',
            name: 'Personal Savings Goals',
            pocketType: 'savings',
            startingBalance: 5000,
            interestRate: 6.0,
            savingsDetails: '6% p.a. promo'
        });

        // 1 for account_pockets, 1 for transactions (Initial Balance)
        expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
        expect(pocket.name).toBe('Personal Savings Goals');
        expect(pocket.pocket_type).toBe('savings');
        expect(pocket.current_balance).toBe(5000);
        expect(pocket.interest_rate).toBe(6.0);
        expect(pocket.savings_details).toBe('6% p.a. promo');

        const pocketInsert = executed[0];
        expect(pocketInsert.sql).toContain('INSERT INTO account_pockets');
        expect(pocketInsert.params).toContain('Personal Savings Goals');
        expect(pocketInsert.params).toContain(6.0);

        const txInsert = executed[1];
        expect(txInsert.sql).toContain('INSERT INTO transactions');
        expect(txInsert.sql).toContain('Initial Balance');
        expect(txInsert.params).toContain('Starting Balance: Personal Savings Goals');
        expect(txInsert.params).toContain(5000);
    });

    it('addPocket throws error when institutionId is empty string', async () => {
        const mockDb: any = {
            runAsync: vi.fn()
        };

        await expect(
            addPocket(mockDb, {
                institutionId: '',
                name: 'Emergency Savings',
                pocketType: 'savings',
                startingBalance: 1000
            })
        ).rejects.toThrow('Target institution ID is required to add a pocket.');
    });

    it('addPocket resolves institutionId when passed as an institution code', async () => {
        const executed: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            getFirstAsync: vi.fn(async (sql: string, params: any[]) => {
                if (sql.includes('WHERE id = ?')) {
                    return null; // Not found by exact ID
                }
                if (sql.includes('WHERE code = ?') && params[0] === 'maya') {
                    return { id: 'inst_maya_real_id' };
                }
                return null;
            }),
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            })
        };

        const pocket = await addPocket(mockDb, {
            institutionId: 'maya',
            name: 'Personal Savings Goals',
            pocketType: 'savings',
            startingBalance: 5000,
            interestRate: 6.0
        });

        expect(pocket.institution_id).toBe('inst_maya_real_id');
        expect(executed[0].params[1]).toBe('inst_maya_real_id');
    });

    it('addPocket throws error when target institution is not found in database', async () => {
        const mockDb: any = {
            getFirstAsync: vi.fn(async () => null),
            runAsync: vi.fn()
        };

        await expect(
            addPocket(mockDb, {
                institutionId: 'non_existent_institution',
                name: 'Savings',
                pocketType: 'savings'
            })
        ).rejects.toThrow('Target institution "non_existent_institution" not found.');
    });

    it('archivePocket throws an error if pocket has positive balance', async () => {
        const mockDb: any = {
            getFirstAsync: vi.fn(async () => ({ current_balance: 1500 })),
            runAsync: vi.fn()
        };

        await expect(archivePocket(mockDb, 'pock_with_money')).rejects.toThrow('Cannot archive a pocket with a positive balance');
        expect(mockDb.runAsync).not.toHaveBeenCalled();
    });

    it('archivePocket successfully sets is_archived = 1 when balance is 0', async () => {
        const mockDb: any = {
            getFirstAsync: vi.fn(async () => ({ current_balance: 0 })),
            runAsync: vi.fn(async () => ({ changes: 1 }))
        };

        await archivePocket(mockDb, 'pock_empty');

        expect(mockDb.runAsync).toHaveBeenCalledWith(expect.stringContaining('UPDATE account_pockets SET is_archived = 1'), [
            expect.any(String),
            'pock_empty'
        ]);
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
                pocket_count: 2
            }
        ];

        const mockDb: any = {
            getAllAsync: vi.fn(async () => mockInstitutions)
        };

        const result = await getInstitutionsWithBalances(mockDb);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Maya');
        expect(result[0].total_balance).toBe(45000);
        expect(mockDb.getAllAsync).toHaveBeenCalledWith(expect.stringContaining('COALESCE(SUM(p.current_balance), 0) AS total_balance'), [0]);
    });

    it('updatePocketMetadata updates name, type, and interest details without altering balance', async () => {
        const executed: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            getFirstAsync: vi.fn(async (sql: string, params: any[]) => {
                if (sql.includes('FROM account_pockets WHERE id = ?')) {
                    return {
                        id: 'pock_123',
                        institution_id: 'inst_maya',
                        name: 'Old Pocket',
                        pocket_type: 'wallet',
                        currency: 'PHP',
                        starting_balance: 1000,
                        current_balance: 5000,
                        interest_rate: null,
                        savings_details: '',
                        is_archived: 0
                    };
                }
                return null;
            }),
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                executed.push({ sql, params });
                return { changes: 1 };
            })
        };

        await updatePocketMetadata(mockDb, 'pock_123', {
            name: 'High-Yield Stash',
            pocketType: 'savings',
            interestRate: 6.5,
            savingsDetails: '6.5% interest promo'
        });

        const updateQuery = executed.find((e) => e.sql.includes('UPDATE account_pockets'));
        expect(updateQuery).toBeDefined();
        expect(updateQuery?.params[0]).toBe('High-Yield Stash');
        expect(updateQuery?.params[1]).toBe('savings');
        expect(updateQuery?.params[2]).toBe(6.5);
        expect(updateQuery?.params[3]).toBe('6.5% interest promo');
        expect(updateQuery?.params[5]).toBe('pock_123');
    });

    it('createInstitutionWithPocket logs initial balance transaction when starting balance > 0', async () => {
        const runCalls: { sql: string; params: any[] }[] = [];
        const mockDb: any = {
            withTransactionAsync: vi.fn(async (callback: () => Promise<void>) => {
                await callback();
            }),
            runAsync: vi.fn(async (sql: string, params: any[]) => {
                runCalls.push({ sql, params });
                return { changes: 1 };
            })
        };

        const result = await createInstitutionWithPocket(mockDb, {
            code: 'gcash',
            customName: 'Personal GCash',
            pocketName: 'GCash Wallet',
            startingBalance: 15000
        });

        expect(result.pocket.current_balance).toBe(15000);

        // Verify Initial Balance transaction logged
        const txInsert = runCalls.find((c) => c.sql.includes('INSERT INTO transactions') && c.sql.includes('Initial Balance'));
        expect(txInsert).toBeDefined();
        expect(txInsert?.params).toContain('Starting Balance: GCash Wallet');
        expect(txInsert?.params).toContain(15000);
    });

    it('reconcilePocketBalance updates balance and logs Balance Adjustment transaction', async () => {
        const runCalls: { sql: string; params?: any[] }[] = [];
        const mockDb: any = {
            getFirstAsync: vi.fn(async () => ({
                id: 'pock_test_1',
                name: 'My Wallet',
                current_balance: 10000
            })),
            withTransactionAsync: vi.fn(async (cb: () => Promise<void>) => {
                await cb();
            }),
            runAsync: vi.fn(async (sql: string, params?: any[]) => {
                runCalls.push({ sql, params });
                return { changes: 1 };
            })
        };

        // Reconcile up: 10,000 -> 12,500 (+2,500 adjustment)
        await reconcilePocketBalance(mockDb, 'pock_test_1', 12500, 'Bank statement adjustment');

        const balanceUpdate = runCalls.find((c) => c.sql.includes('UPDATE account_pockets SET current_balance'));
        expect(balanceUpdate).toBeDefined();
        expect(balanceUpdate?.params).toContain(12500);

        const adjTx = runCalls.find((c) => c.sql.includes('INSERT INTO transactions') && c.sql.includes('Balance Adjustment'));
        expect(adjTx).toBeDefined();
        expect(adjTx?.params).toContain('income');
        expect(adjTx?.params).toContain(2500);
        expect(adjTx?.params).toContain('Balance Adjustment: My Wallet');
    });

    it('backfillInitialBalanceTransactions backfills missing opening records idempotently', async () => {
        const runCalls: { sql: string; params?: any[] }[] = [];
        const mockDb: any = {
            getAllAsync: vi.fn(async () => [
                { id: 'pock_a', name: 'Physical Cash', starting_balance: 1000, created_at: '2026-11-01T00:55:00.000Z' },
                { id: 'pock_b', name: 'GCash Balance', starting_balance: 1985.46, created_at: '2026-11-01T00:56:00.000Z' }
            ]),
            runAsync: vi.fn(async (sql: string, params?: any[]) => {
                runCalls.push({ sql, params });
                return { changes: 1 };
            })
        };

        const count = await backfillInitialBalanceTransactions(mockDb);
        expect(count).toBe(2);
        expect(runCalls).toHaveLength(2);

        expect(runCalls[0].params).toContain('Starting Balance: Physical Cash');
        expect(runCalls[0].params).toContain(1000);
        expect(runCalls[0].params).toContain('2026-11-01');

        expect(runCalls[1].params).toContain('Starting Balance: GCash Balance');
        expect(runCalls[1].params).toContain(1985.46);
    });
});
