import type * as SQLite from 'expo-sqlite';
import type { Institution, AccountPocket, PocketType } from '../types/database';
import { getInstitutionConfig } from '../constants/institutions';

export interface CreateAccountInput {
    code: string;
    customName?: string;
    notes?: string;
    pocketName?: string;
    pocketType?: PocketType;
    startingBalance?: number;
    interestRate?: number | null;
    savingsDetails?: string;
}

export interface AddPocketInput {
    institutionId: string;
    name: string;
    pocketType: PocketType;
    startingBalance?: number;
    interestRate?: number | null;
    savingsDetails?: string;
}

export async function createInstitutionWithPocket(
    db: SQLite.SQLiteDatabase,
    input: CreateAccountInput
): Promise<{ institution: Institution; pocket: AccountPocket }> {
    const config = getInstitutionConfig(input.code);
    const instId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const pockId = `pock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const instName = input.customName?.trim() || config.name;
    const notes = input.notes?.trim() || '';
    const pocketName = input.pocketName?.trim() || config.defaultPocketName;
    const pocketType = input.pocketType || (config.supportsInterest ? 'savings' : 'wallet');
    const startingBalance = input.startingBalance ?? 0.0;
    const interestRate = pocketType === 'savings' ? (input.interestRate ?? config.defaultInterestRate ?? null) : null;
    const savingsDetails = input.savingsDetails?.trim() || '';

    let createdInstitution: Institution | null = null;
    let createdPocket: AccountPocket | null = null;

    await db.withTransactionAsync(async () => {
        // 1. Insert Institution
        await db.runAsync(
            `INSERT INTO institutions (id, name, type, code, color, icon, notes, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
            [instId, instName, config.type, config.code, config.color, config.icon, notes, now, now]
        );

        // 2. Insert Initial Pocket
        await db.runAsync(
            `INSERT INTO account_pockets (
        id, institution_id, name, pocket_type, currency, starting_balance, current_balance,
        interest_rate, savings_details, is_archived, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'PHP', ?, ?, ?, ?, 0, ?, ?)`,
            [pockId, instId, pocketName, pocketType, startingBalance, startingBalance, interestRate, savingsDetails, now, now]
        );

        // 3. Log Initial Balance into ledger if starting balance > 0
        if (startingBalance > 0) {
            const txInitId = `tx_init_${pockId}`;
            await db.runAsync(
                `INSERT INTO transactions (
          id, title, pocket_id, to_pocket_id, type, amount, category, date, notes, created_at, updated_at
        ) VALUES (?, ?, ?, NULL, 'income', ?, 'Initial Balance', ?, ?, ?, ?)`,
                [
                    txInitId,
                    `Starting Balance: ${pocketName}`,
                    pockId,
                    startingBalance,
                    now.split('T')[0],
                    `Opening initial balance for ${instName} (${pocketName})`,
                    now,
                    now
                ]
            );
        }

        createdInstitution = {
            id: instId,
            name: instName,
            type: config.type,
            code: config.code,
            color: config.color,
            icon: config.icon,
            notes,
            is_archived: 0,
            created_at: now,
            updated_at: now,
            total_balance: startingBalance,
            pocket_count: 1
        };

        createdPocket = {
            id: pockId,
            institution_id: instId,
            name: pocketName,
            pocket_type: pocketType,
            currency: 'PHP',
            starting_balance: startingBalance,
            current_balance: startingBalance,
            interest_rate: interestRate,
            savings_details: savingsDetails,
            is_archived: 0,
            created_at: now,
            updated_at: now
        };
    });

    return { institution: createdInstitution!, pocket: createdPocket! };
}

export async function addPocket(db: SQLite.SQLiteDatabase, input: AddPocketInput): Promise<AccountPocket> {
    const rawInstitutionId = input.institutionId?.trim();
    if (!rawInstitutionId) {
        throw new Error('Target institution ID is required to add a pocket.');
    }

    let institutionId = rawInstitutionId;

    if (typeof db.getFirstAsync === 'function') {
        const existingById = await db.getFirstAsync<{ id: string }>('SELECT id FROM institutions WHERE id = ? LIMIT 1;', [rawInstitutionId]);
        if (existingById) {
            institutionId = existingById.id;
        } else {
            const existingByCode = await db.getFirstAsync<{ id: string }>('SELECT id FROM institutions WHERE code = ? LIMIT 1;', [rawInstitutionId]);
            if (existingByCode) {
                institutionId = existingByCode.id;
            } else {
                throw new Error(`Target institution "${rawInstitutionId}" not found.`);
            }
        }
    }

    const pockId = `pock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const startingBalance = input.startingBalance ?? 0.0;
    const interestRate = input.pocketType === 'savings' ? (input.interestRate ?? null) : null;
    const savingsDetails = input.savingsDetails?.trim() || '';

    await db.runAsync(
        `INSERT INTO account_pockets (
      id, institution_id, name, pocket_type, currency, starting_balance, current_balance,
      interest_rate, savings_details, is_archived, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'PHP', ?, ?, ?, ?, 0, ?, ?)`,
        [pockId, institutionId, input.name.trim(), input.pocketType, startingBalance, startingBalance, interestRate, savingsDetails, now, now]
    );

    // Log Initial Balance into ledger if starting balance > 0
    if (startingBalance > 0) {
        const txInitId = `tx_init_${pockId}`;
        await db.runAsync(
            `INSERT INTO transactions (
        id, title, pocket_id, to_pocket_id, type, amount, category, date, notes, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, 'income', ?, 'Initial Balance', ?, ?, ?, ?)`,
            [
                txInitId,
                `Starting Balance: ${input.name.trim()}`,
                pockId,
                startingBalance,
                now.split('T')[0],
                `Opening initial balance for ${input.name.trim()}`,
                now,
                now
            ]
        );
    }

    return {
        id: pockId,
        institution_id: institutionId,
        name: input.name.trim(),
        pocket_type: input.pocketType,
        currency: 'PHP',
        starting_balance: startingBalance,
        current_balance: startingBalance,
        interest_rate: interestRate,
        savings_details: savingsDetails,
        is_archived: 0,
        created_at: now,
        updated_at: now
    };
}

export async function getInstitutionsWithBalances(db: SQLite.SQLiteDatabase, includeArchived: boolean = false): Promise<Institution[]> {
    const query = `
    SELECT 
      i.id, i.name, i.type, i.code, i.color, i.icon, i.notes, i.is_archived, i.created_at, i.updated_at,
      COALESCE(SUM(p.current_balance), 0) AS total_balance,
      COUNT(p.id) AS pocket_count
    FROM institutions i
    LEFT JOIN account_pockets p ON i.id = p.institution_id AND p.is_archived = 0
    WHERE i.is_archived = ?
    GROUP BY i.id
    ORDER BY total_balance DESC, i.name ASC
  `;

    const rows = await db.getAllAsync<Institution>(query, [includeArchived ? 1 : 0]);
    return rows;
}

export async function getPocketsByInstitution(
    db: SQLite.SQLiteDatabase,
    institutionId: string,
    includeArchived: boolean = false
): Promise<AccountPocket[]> {
    return await db.getAllAsync<AccountPocket>(
        `SELECT * FROM account_pockets 
     WHERE institution_id = ? AND is_archived = ? 
     ORDER BY current_balance DESC, name ASC`,
        [institutionId, includeArchived ? 1 : 0]
    );
}

export async function getAllActivePockets(db: SQLite.SQLiteDatabase): Promise<
    (AccountPocket & {
        institution_name: string;
        institution_code: string;
        institution_color: string;
    })[]
> {
    return await db.getAllAsync(
        `SELECT 
      p.*,
      i.name AS institution_name,
      i.code AS institution_code,
      i.color AS institution_color
    FROM account_pockets p
    JOIN institutions i ON p.institution_id = i.id
    WHERE p.is_archived = 0 AND i.is_archived = 0
    ORDER BY i.name ASC, p.name ASC`
    );
}

export async function archivePocket(db: SQLite.SQLiteDatabase, pocketId: string): Promise<void> {
    const pocket = await db.getFirstAsync<{ current_balance: number }>('SELECT current_balance FROM account_pockets WHERE id = ?', [pocketId]);

    if (!pocket) {
        throw new Error('Pocket not found');
    }

    if (pocket.current_balance > 0) {
        throw new Error('Cannot archive a pocket with a positive balance. Please transfer funds out first.');
    }

    const now = new Date().toISOString();
    await db.runAsync('UPDATE account_pockets SET is_archived = 1, updated_at = ? WHERE id = ?', [now, pocketId]);
}

export async function updateInstitutionNotes(db: SQLite.SQLiteDatabase, institutionId: string, notes: string): Promise<void> {
    const now = new Date().toISOString();
    await db.runAsync(`UPDATE institutions SET notes = ?, updated_at = ? WHERE id = ?`, [notes.trim(), now, institutionId]);
}

export interface UpdatePocketMetadataInput {
    name?: string;
    pocketType?: PocketType;
    interestRate?: number | null;
    savingsDetails?: string;
}

/**
 * Updates non-financial descriptive metadata for an account pocket.
 * Current balance is protected and only changes via transactions and transfers.
 */
export async function updatePocketMetadata(db: SQLite.SQLiteDatabase, pocketId: string, input: UpdatePocketMetadataInput): Promise<void> {
    const existing = await db.getFirstAsync<AccountPocket>('SELECT * FROM account_pockets WHERE id = ?', [pocketId]);
    if (!existing) {
        throw new Error('Pocket not found');
    }

    const now = new Date().toISOString();
    const name = input.name !== undefined ? input.name.trim() : existing.name;
    const pocketType = input.pocketType !== undefined ? input.pocketType : existing.pocket_type;
    const interestRate = (input.interestRate !== undefined ? input.interestRate : existing.interest_rate) ?? null;
    const savingsDetails = (input.savingsDetails !== undefined ? input.savingsDetails.trim() : existing.savings_details) ?? null;

    await db.runAsync(
        `UPDATE account_pockets 
     SET name = ?, pocket_type = ?, interest_rate = ?, savings_details = ?, updated_at = ? 
     WHERE id = ?`,
        [name, pocketType, interestRate, savingsDetails, now, pocketId]
    );
}

/**
 * Reconciles an account pocket balance and logs a formal Balance Adjustment ledger transaction.
 */
export async function reconcilePocketBalance(db: SQLite.SQLiteDatabase, pocketId: string, newBalance: number, notes?: string): Promise<void> {
    const pocket = await db.getFirstAsync<AccountPocket>('SELECT * FROM account_pockets WHERE id = ?', [pocketId]);
    if (!pocket) {
        throw new Error('Pocket not found');
    }

    const diff = Math.round((newBalance - pocket.current_balance) * 100) / 100;
    if (diff === 0) return;

    const now = new Date().toISOString();
    const isIncrease = diff > 0;
    const amount = Math.abs(diff);
    const txId = `tx_adj_${pocketId}_${Date.now()}`;

    await db.withTransactionAsync(async () => {
        await db.runAsync('UPDATE account_pockets SET current_balance = ?, updated_at = ? WHERE id = ?', [newBalance, now, pocketId]);

        await db.runAsync(
            `INSERT INTO transactions (
        id, title, pocket_id, to_pocket_id, type, amount, category, date, notes, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, ?, ?, 'Balance Adjustment', ?, ?, ?, ?)`,
            [
                txId,
                `Balance Adjustment: ${pocket.name}`,
                pocketId,
                isIncrease ? 'income' : 'expense',
                amount,
                now.split('T')[0],
                notes?.trim() || `Reconciled balance from ₱${pocket.current_balance.toLocaleString()} to ₱${newBalance.toLocaleString()}`,
                now,
                now
            ]
        );
    });
}

/**
 * Idempotently backfills missing Initial Balance transactions for existing pockets with starting_balance > 0.
 * Does NOT modify current_balance because existing balances already incorporate the starting balance.
 */
export async function backfillInitialBalanceTransactions(db: SQLite.SQLiteDatabase): Promise<number> {
    if (typeof db.getAllAsync !== 'function') return 0;

    try {
        const eligiblePockets = await db.getAllAsync<{ id: string; name: string; starting_balance: number; created_at: string }>(
            `SELECT p.id, p.name, p.starting_balance, p.created_at
             FROM account_pockets p
             WHERE p.starting_balance > 0
               AND NOT EXISTS (
                 SELECT 1 FROM transactions t
                 WHERE t.pocket_id = p.id AND t.category = 'Initial Balance'
               );`
        );

        if (!eligiblePockets || eligiblePockets.length === 0) {
            return 0;
        }

        let insertedCount = 0;
        const now = new Date().toISOString();

        for (const p of eligiblePockets) {
            const txId = `tx_init_${p.id}`;
            const txDate = (p.created_at || now).split('T')[0];
            await db.runAsync(
                `INSERT INTO transactions (
            id, title, pocket_id, to_pocket_id, type, amount, category, date, notes, created_at, updated_at
          ) VALUES (?, ?, ?, NULL, 'income', ?, 'Initial Balance', ?, ?, ?, ?)`,
                [
                    txId,
                    `Starting Balance: ${p.name}`,
                    p.id,
                    p.starting_balance,
                    txDate,
                    `Historical starting balance for ${p.name}`,
                    p.created_at || now,
                    now
                ]
            );
            insertedCount++;
        }

        return insertedCount;
    } catch (err) {
        console.warn('[SQLite] Error backfilling initial balance transactions:', err);
        return 0;
    }
}
