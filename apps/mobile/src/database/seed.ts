import type * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import { createInstitutionWithPocket, addPocket } from '../services/accountService';
import { createTransaction } from '../services/transactionService';

export async function seedDevData(db: SQLite.SQLiteDatabase): Promise<void> {
  // Check if already seeded or intentionally kept empty
  const seedFlag = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    ['has_seeded_dev']
  );
  if (seedFlag && seedFlag.value === '1') {
    return;
  }

  // Check if any institutions exist
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM institutions'
  );

  if (existing && existing.count > 0) {
    await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', ['has_seeded_dev', '1']);
    return; // Already initialized
  }

  // 1. Seed Maya (Wallet + 4.5% High-Yield Savings)
  const { institution: maya, pocket: mayaWallet } = await createInstitutionWithPocket(db, {
    code: 'maya',
    pocketName: 'Main Wallet',
    pocketType: 'wallet',
    startingBalance: 2500,
  });

  const mayaSavings = await addPocket(db, {
    institutionId: maya.id,
    name: 'Personal Savings',
    pocketType: 'savings',
    startingBalance: 50000,
    interestRate: 4.5,
    savingsDetails: 'Credited daily, Emergency Fund',
  });

  // 2. Seed BPI Checking
  const { pocket: bpiChecking } = await createInstitutionWithPocket(db, {
    code: 'bpi',
    pocketName: 'Payroll / Checking',
    pocketType: 'wallet',
    startingBalance: 18500,
  });

  // 3. Seed Physical Cash
  const { pocket: cashPocket } = await createInstitutionWithPocket(db, {
    code: 'cash',
    pocketName: 'Cash in Wallet',
    pocketType: 'wallet',
    startingBalance: 3200,
  });

  // 4. Seed GoTyme Bank
  const { pocket: gotymeEveryday } = await createInstitutionWithPocket(db, {
    code: 'gotyme',
    pocketName: 'Everyday Account',
    pocketType: 'wallet',
    startingBalance: 4200,
  });

  // 5. Seed Initial Transactions
  await createTransaction(db, {
    title: 'Salary Deposit (Tech Corp)',
    pocket_id: bpiChecking.id,
    type: 'income',
    amount: 45000,
    category: 'Salary',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    notes: 'Bi-monthly payroll',
  });

  await createTransaction(db, {
    title: 'Whole Foods Market Groceries',
    pocket_id: mayaWallet.id,
    type: 'expense',
    amount: 1850.5,
    category: 'Groceries',
    date: new Date(Date.now() - 86400000).toISOString(),
    notes: 'Weekly pantry restocking',
  });

  await createTransaction(db, {
    title: 'Blue Bottle Coffee',
    pocket_id: cashPocket.id,
    type: 'expense',
    amount: 280,
    category: 'Food & Dining',
    date: new Date().toISOString(),
    notes: 'Afternoon latte',
  });

  await createTransaction(db, {
    title: 'Savings Allocation (Maya Savings)',
    pocket_id: bpiChecking.id,
    to_pocket_id: mayaSavings.id,
    type: 'transfer',
    amount: 10000,
    category: 'Transfer',
    date: new Date(Date.now() - 86400000 * 3).toISOString(),
    notes: 'Monthly emergency fund stash',
  });

  await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', ['has_seeded_dev', '1']);
}

export async function resetDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = OFF;
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS account_pockets;
    DROP TABLE IF EXISTS institutions;
    DROP TABLE IF EXISTS accounts;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS loans;
    DROP TABLE IF EXISTS chat_messages;
    DROP TABLE IF EXISTS transaction_deductions;
    DROP TABLE IF EXISTS recurring_rules;
    DROP TABLE IF EXISTS savings_goals;
    DROP TABLE IF EXISTS wishlist_items;
    DROP TABLE IF EXISTS cash_flow_snapshots;
    DROP TABLE IF EXISTS app_settings;
    PRAGMA user_version = 2;
    PRAGMA foreign_keys = ON;
  `);
  await db.execAsync(SCHEMA_SQL);
  await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', ['has_seeded_dev', '1']);
}

