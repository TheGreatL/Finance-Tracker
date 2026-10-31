import type * as SQLite from 'expo-sqlite';
import type { TransactionRecord, TransactionType } from '../types/database';

export interface ApplyBalanceParams {
    type: TransactionType;
    amount: number;
    sourceCurrentBalance: number;
    destinationCurrentBalance?: number;
}

export interface ReverseBalanceParams {
    type: TransactionType;
    amount: number;
    sourceCurrentBalance: number;
    destinationCurrentBalance?: number;
}

/**
 * Pure calculation helpers for balance arithmetic
 */
export function calculateBalanceDelta(type: TransactionType, amount: number, isSource: boolean = true): number {
    if (type === 'income') {
        return amount;
    }
    if (type === 'expense') {
        return -amount;
    }
    if (type === 'transfer') {
        return isSource ? -amount : amount;
    }
    return 0;
}

export function applyTransactionBalance(params: ApplyBalanceParams) {
    const { type, amount, sourceCurrentBalance, destinationCurrentBalance } = params;

    if (type === 'income') {
        return {
            newSourceBalance: sourceCurrentBalance + amount
        };
    }

    if (type === 'expense') {
        return {
            newSourceBalance: sourceCurrentBalance - amount
        };
    }

    // transfer
    const destCurrent = destinationCurrentBalance ?? 0;
    return {
        newSourceBalance: sourceCurrentBalance - amount,
        newDestinationBalance: destCurrent + amount
    };
}

export function reverseTransactionBalance(params: ReverseBalanceParams) {
    const { type, amount, sourceCurrentBalance, destinationCurrentBalance } = params;

    if (type === 'income') {
        return {
            restoredSourceBalance: sourceCurrentBalance - amount
        };
    }

    if (type === 'expense') {
        return {
            restoredSourceBalance: sourceCurrentBalance + amount
        };
    }

    // transfer
    const destCurrent = destinationCurrentBalance ?? 0;
    return {
        restoredSourceBalance: sourceCurrentBalance + amount,
        restoredDestinationBalance: destCurrent - amount
    };
}

/**
 * Database operations wrapped in atomic transactions
 */
export interface CreateTransactionInput {
    title: string;
    pocket_id: string;
    to_pocket_id?: string | null;
    type: TransactionType;
    amount: number;
    category: string;
    date?: string;
    notes?: string;
}

export async function createTransaction(db: SQLite.SQLiteDatabase, input: CreateTransactionInput): Promise<TransactionRecord> {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const date = input.date || new Date().toISOString();
    const now = new Date().toISOString();
    const notes = input.notes || '';

    let createdTx: TransactionRecord | null = null;

    await db.withTransactionAsync(async () => {
        // 1. Fetch source pocket
        const sourcePocket = await db.getFirstAsync<{ current_balance: number }>('SELECT current_balance FROM account_pockets WHERE id = ?', [
            input.pocket_id
        ]);

        if (!sourcePocket) {
            throw new Error(`Source pocket ${input.pocket_id} not found`);
        }

        let destCurrentBalance: number | undefined;
        if (input.type === 'transfer' && input.to_pocket_id) {
            const destPocket = await db.getFirstAsync<{ current_balance: number }>('SELECT current_balance FROM account_pockets WHERE id = ?', [
                input.to_pocket_id
            ]);
            if (!destPocket) {
                throw new Error(`Destination pocket ${input.to_pocket_id} not found`);
            }
            destCurrentBalance = destPocket.current_balance;
        }

        // 2. Compute new balances
        const balanceUpdates = applyTransactionBalance({
            type: input.type,
            amount: input.amount,
            sourceCurrentBalance: sourcePocket.current_balance,
            destinationCurrentBalance: destCurrentBalance
        });

        // 3. Update source pocket balance
        await db.runAsync('UPDATE account_pockets SET current_balance = ?, updated_at = ? WHERE id = ?', [
            balanceUpdates.newSourceBalance,
            now,
            input.pocket_id
        ]);

        // 4. Update destination pocket balance if transfer
        if (input.type === 'transfer' && input.to_pocket_id && balanceUpdates.newDestinationBalance !== undefined) {
            await db.runAsync('UPDATE account_pockets SET current_balance = ?, updated_at = ? WHERE id = ?', [
                balanceUpdates.newDestinationBalance,
                now,
                input.to_pocket_id
            ]);
        }

        // 5. Insert transaction record
        await db.runAsync(
            `INSERT INTO transactions (id, title, pocket_id, to_pocket_id, type, amount, category, date, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, input.title, input.pocket_id, input.to_pocket_id || null, input.type, input.amount, input.category, date, notes, now, now]
        );

        createdTx = {
            id,
            title: input.title,
            pocket_id: input.pocket_id,
            to_pocket_id: input.to_pocket_id || null,
            type: input.type,
            amount: input.amount,
            category: input.category,
            date,
            notes,
            created_at: now,
            updated_at: now
        };
    });

    return createdTx!;
}

export async function deleteTransaction(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
    await db.withTransactionAsync(async () => {
        // 1. Fetch existing transaction
        const tx = await db.getFirstAsync<{
            id: string;
            pocket_id: string;
            to_pocket_id: string | null;
            type: TransactionType;
            amount: number;
        }>('SELECT id, pocket_id, to_pocket_id, type, amount FROM transactions WHERE id = ?', [id]);

        if (!tx) {
            return;
        }

        // 2. Fetch current pocket balances
        const sourcePocket = await db.getFirstAsync<{ current_balance: number }>('SELECT current_balance FROM account_pockets WHERE id = ?', [
            tx.pocket_id
        ]);

        if (sourcePocket) {
            let destBalance: number | undefined;
            if (tx.type === 'transfer' && tx.to_pocket_id) {
                const dest = await db.getFirstAsync<{ current_balance: number }>('SELECT current_balance FROM account_pockets WHERE id = ?', [
                    tx.to_pocket_id
                ]);
                destBalance = dest?.current_balance;
            }

            // Reverse balances
            const reversed = reverseTransactionBalance({
                type: tx.type,
                amount: tx.amount,
                sourceCurrentBalance: sourcePocket.current_balance,
                destinationCurrentBalance: destBalance
            });

            const now = new Date().toISOString();
            await db.runAsync('UPDATE account_pockets SET current_balance = ?, updated_at = ? WHERE id = ?', [
                reversed.restoredSourceBalance,
                now,
                tx.pocket_id
            ]);

            if (tx.type === 'transfer' && tx.to_pocket_id && reversed.restoredDestinationBalance !== undefined) {
                await db.runAsync('UPDATE account_pockets SET current_balance = ?, updated_at = ? WHERE id = ?', [
                    reversed.restoredDestinationBalance,
                    now,
                    tx.to_pocket_id
                ]);
            }
        }

        // 3. Delete the transaction record
        await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
    });
}

export async function getRecentTransactions(db: SQLite.SQLiteDatabase, limit: number = 20): Promise<TransactionRecord[]> {
    const rows = await db.getAllAsync<TransactionRecord>(
        `SELECT 
      t.id, t.title, t.pocket_id, t.to_pocket_id, t.type, t.amount, t.category, t.date, t.notes, t.created_at, t.updated_at,
      p.name AS pocket_name,
      i.name AS institution_name,
      i.color AS institution_color,
      i.code AS institution_code,
      p_to.name AS to_pocket_name,
      i_to.name AS to_institution_name
    FROM transactions t
    LEFT JOIN account_pockets p ON t.pocket_id = p.id
    LEFT JOIN institutions i ON p.institution_id = i.id
    LEFT JOIN account_pockets p_to ON t.to_pocket_id = p_to.id
    LEFT JOIN institutions i_to ON p_to.institution_id = i_to.id
    ORDER BY t.date DESC
    LIMIT ?`,
        [limit]
    );
    return rows;
}

export interface UpdateTransactionMetadataInput {
    title?: string;
    category?: string;
    date?: string;
    notes?: string;
}

/**
 * Updates non-financial descriptive metadata for a transaction.
 * Amount, type, and source/destination pockets are strictly immutable to protect ledger balances.
 */
export async function updateTransactionMetadata(db: SQLite.SQLiteDatabase, id: string, input: UpdateTransactionMetadataInput): Promise<void> {
    const existing = await db.getFirstAsync<TransactionRecord>('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!existing) {
        throw new Error('Transaction not found');
    }

    const now = new Date().toISOString();
    const title = input.title !== undefined ? input.title.trim() : existing.title;
    const category = input.category !== undefined ? input.category.trim() : existing.category;
    const date = input.date !== undefined ? input.date.trim() : existing.date;
    const notes = (input.notes !== undefined ? input.notes.trim() : existing.notes) ?? null;

    await db.runAsync(
        `UPDATE transactions 
     SET title = ?, category = ?, date = ?, notes = ?, updated_at = ? 
     WHERE id = ?`,
        [title, category, date, notes, now, id]
    );
}
