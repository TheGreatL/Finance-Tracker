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

  // 3. Probe if legacy loans table exists without institution_id column
  try {
    await db.getFirstAsync('SELECT institution_id FROM loans LIMIT 1;');
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes('no such column')) {
      console.log('[SQLite] Legacy loans table detected without institution_id column. Dropping old table...');
      await db.execAsync(`
        DROP INDEX IF EXISTS idx_loans_institution;
        DROP INDEX IF EXISTS idx_loans_status;
        DROP TABLE IF EXISTS loans;
      `);
    }
  }

  // 4. Check PRAGMA user_version
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
      DROP TABLE IF EXISTS subscriptions;
      DROP TABLE IF EXISTS account_pockets;
      DROP TABLE IF EXISTS institutions;
      DROP TABLE IF EXISTS accounts;
      DROP TABLE IF EXISTS categories;
      DROP TABLE IF EXISTS loans;
      DROP TABLE IF EXISTS chat_messages;
      DROP TABLE IF EXISTS app_notifications;
      DROP TABLE IF EXISTS transaction_deductions;
      DROP TABLE IF EXISTS recurring_rules;
      DROP TABLE IF EXISTS savings_goals;
      DROP TABLE IF EXISTS wishlist_items;
      DROP TABLE IF EXISTS cash_flow_snapshots;
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

  // 5. Ensure loans table exists
  try {
    await db.getFirstAsync('SELECT id FROM loans LIMIT 1;');
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes('no such table')) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS loans (
          id TEXT PRIMARY KEY,
          institution_id TEXT NOT NULL,
          title TEXT NOT NULL,
          total_amount REAL NOT NULL,
          remaining_balance REAL NOT NULL,
          monthly_payment REAL NOT NULL,
          due_date TEXT NOT NULL,
          interest_rate REAL DEFAULT NULL,
          attachment_path TEXT DEFAULT '',
          attachment_name TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paid', 'defaulted')),
          notes TEXT DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE RESTRICT
        );
        CREATE INDEX IF NOT EXISTS idx_loans_institution ON loans(institution_id);
        CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
      `);
    }
  }

  // 6. Ensure subscriptions table exists
  try {
    await db.getFirstAsync('SELECT id FROM subscriptions LIMIT 1;');
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes('no such table')) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id TEXT PRIMARY KEY,
          service_name TEXT NOT NULL,
          service_code TEXT NOT NULL DEFAULT 'custom',
          pocket_id TEXT NOT NULL,
          amount REAL NOT NULL,
          frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'monthly', 'yearly')),
          start_date TEXT NOT NULL,
          next_billing_date TEXT NOT NULL,
          category TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'cancelled')),
          reminder_days_before INTEGER NOT NULL DEFAULT 1,
          notification_id TEXT DEFAULT '',
          notes TEXT DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (pocket_id) REFERENCES account_pockets(id) ON DELETE RESTRICT
        );
        CREATE INDEX IF NOT EXISTS idx_subscriptions_pocket ON subscriptions(pocket_id);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date);
      `);
    }
  }

  // 7. Ensure chat_messages table exists
  try {
    await db.getFirstAsync('SELECT id FROM chat_messages LIMIT 1;');
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes('no such table')) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          sender TEXT NOT NULL CHECK(sender IN ('user', 'bot')),
          text TEXT NOT NULL,
          status TEXT DEFAULT 'info',
          source TEXT DEFAULT 'offline' CHECK(source IN ('gemini', 'offline')),
          timestamp TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
      `);
    }
  }

  // 8. Ensure app_notifications table exists
  try {
    await db.getFirstAsync('SELECT id FROM app_notifications LIMIT 1;');
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes('no such table')) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS app_notifications (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          data TEXT DEFAULT '',
          is_read INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_created ON app_notifications(created_at DESC);
      `);
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
