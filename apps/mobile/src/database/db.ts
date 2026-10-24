import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function runSchemaSetup(db: SQLite.SQLiteDatabase): Promise<void> {
  let needsRebuild = false;

  // 1. Probe if transactions table exists with the required pocket_id column
  try {
    await db.getFirstAsync('SELECT pocket_id FROM transactions LIMIT 1;');
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes('no such column')) {
      needsRebuild = true;
    }
  }

  // 2. Probe if account_pockets table exists with the required institution_id column
  try {
    await db.getFirstAsync('SELECT institution_id FROM account_pockets LIMIT 1;');
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes('no such column')) {
      needsRebuild = true;
    }
  }

  // 3. Check PRAGMA user_version
  try {
    const vResult = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
    if (!vResult || (vResult.user_version ?? 0) < 2) {
      needsRebuild = true;
    }
  } catch {
    // Ignore version read failures
  }

  if (needsRebuild) {
    console.log('[SQLite] Upgrading database to Philippine Banking & Nested Pockets schema (v2)...');
    await db.execAsync(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS transactions;
      DROP TABLE IF EXISTS account_pockets;
      DROP TABLE IF EXISTS institutions;
      DROP TABLE IF EXISTS accounts;
      DROP TABLE IF EXISTS categories;
      DROP TABLE IF EXISTS app_settings;
      PRAGMA user_version = 2;
      PRAGMA foreign_keys = ON;
    `);
  }

  await db.execAsync(SCHEMA_SQL);

  // 4. Ensure notes column exists in institutions table without wiping user data
  try {
    await db.getFirstAsync('SELECT notes FROM institutions LIMIT 1;');
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes('no such column')) {
      await db.execAsync("ALTER TABLE institutions ADD COLUMN notes TEXT DEFAULT '';");
    }
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync('finance_tracker.db');
    await runSchemaSetup(db);
    dbInstance = db;
    return db;
  })();

  return initPromise;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    try {
      await dbInstance.closeAsync();
    } catch {
      // Ignore close errors
    }
    dbInstance = null;
    initPromise = null;
  }
}
