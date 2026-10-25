import type * as SQLite from 'expo-sqlite';
import type { Institution, AccountPocket, PocketType, InstitutionType } from '../types/database';
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
      [
        pockId,
        instId,
        pocketName,
        pocketType,
        startingBalance,
        startingBalance,
        interestRate,
        savingsDetails,
        now,
        now,
      ]
    );

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
      pocket_count: 1,
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
      updated_at: now,
    };
  });

  return { institution: createdInstitution!, pocket: createdPocket! };
}

export async function addPocket(
  db: SQLite.SQLiteDatabase,
  input: AddPocketInput
): Promise<AccountPocket> {
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
    [
      pockId,
      input.institutionId,
      input.name.trim(),
      input.pocketType,
      startingBalance,
      startingBalance,
      interestRate,
      savingsDetails,
      now,
      now,
    ]
  );

  return {
    id: pockId,
    institution_id: input.institutionId,
    name: input.name.trim(),
    pocket_type: input.pocketType,
    currency: 'PHP',
    starting_balance: startingBalance,
    current_balance: startingBalance,
    interest_rate: interestRate,
    savings_details: savingsDetails,
    is_archived: 0,
    created_at: now,
    updated_at: now,
  };
}

export async function getInstitutionsWithBalances(
  db: SQLite.SQLiteDatabase,
  includeArchived: boolean = false
): Promise<Institution[]> {
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
  const pocket = await db.getFirstAsync<{ current_balance: number }>(
    'SELECT current_balance FROM account_pockets WHERE id = ?',
    [pocketId]
  );

  if (!pocket) {
    throw new Error('Pocket not found');
  }

  if (pocket.current_balance > 0) {
    throw new Error('Cannot archive a pocket with a positive balance. Please transfer funds out first.');
  }

  const now = new Date().toISOString();
  await db.runAsync('UPDATE account_pockets SET is_archived = 1, updated_at = ? WHERE id = ?', [
    now,
    pocketId,
  ]);
}

export async function updateInstitutionNotes(
  db: SQLite.SQLiteDatabase,
  institutionId: string,
  notes: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE institutions SET notes = ?, updated_at = ? WHERE id = ?`,
    [notes.trim(), now, institutionId]
  );
}

