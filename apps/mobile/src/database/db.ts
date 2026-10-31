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
      DROP TABLE IF EXISTS pay_slips;
      DROP TABLE IF EXISTS job_deductions;
      DROP TABLE IF EXISTS jobs;
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

    // 9. Ensure jobs table exists
    try {
        await db.getFirstAsync('SELECT id FROM jobs LIMIT 1;');
    } catch (err: any) {
        const msg = String(err?.message || err);
        if (msg.includes('no such table')) {
            await db.execAsync(`
        CREATE TABLE IF NOT EXISTS jobs (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          company_name TEXT NOT NULL,
          employment_type TEXT NOT NULL CHECK(employment_type IN ('full_time', 'part_time', 'freelance', 'contract', 'other')),
          pay_schedule TEXT NOT NULL CHECK(pay_schedule IN ('monthly', 'semi_monthly', 'biweekly', 'weekly', 'one_time')),
          pay_day_1 INTEGER NOT NULL,
          pay_day_2 INTEGER DEFAULT NULL,
          payout_date TEXT DEFAULT NULL,
          gross_salary REAL NOT NULL,
          salary_period TEXT NOT NULL DEFAULT 'per_paycheck' CHECK(salary_period IN ('monthly', 'per_paycheck')),
          target_pocket_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
          color TEXT DEFAULT '#4F46E5',
          notes TEXT DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (target_pocket_id) REFERENCES account_pockets(id) ON DELETE RESTRICT
        );
        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
        CREATE INDEX IF NOT EXISTS idx_jobs_target_pocket ON jobs(target_pocket_id);
      `);
        }
    }

    // 9b. Check if jobs table needs migration for one_time and payout_date
    try {
        const tableInfo = await db.getFirstAsync<{ sql: string }>("SELECT sql FROM sqlite_master WHERE type='table' AND name='jobs';");
        if (tableInfo && (!tableInfo.sql.includes('one_time') || !tableInfo.sql.includes('payout_date'))) {
            await db.execAsync(`
                PRAGMA foreign_keys = OFF;
                CREATE TABLE IF NOT EXISTS jobs_migration (
                  id TEXT PRIMARY KEY,
                  title TEXT NOT NULL,
                  company_name TEXT NOT NULL,
                  employment_type TEXT NOT NULL CHECK(employment_type IN ('full_time', 'part_time', 'freelance', 'contract', 'other')),
                  pay_schedule TEXT NOT NULL CHECK(pay_schedule IN ('monthly', 'semi_monthly', 'biweekly', 'weekly', 'one_time')),
                  pay_day_1 INTEGER NOT NULL,
                  pay_day_2 INTEGER DEFAULT NULL,
                  payout_date TEXT DEFAULT NULL,
                  gross_salary REAL NOT NULL,
                  salary_period TEXT NOT NULL DEFAULT 'per_paycheck' CHECK(salary_period IN ('monthly', 'per_paycheck')),
                  target_pocket_id TEXT NOT NULL,
                  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
                  color TEXT DEFAULT '#4F46E5',
                  notes TEXT DEFAULT '',
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL,
                  FOREIGN KEY (target_pocket_id) REFERENCES account_pockets(id) ON DELETE RESTRICT
                );
                INSERT INTO jobs_migration (id, title, company_name, employment_type, pay_schedule, pay_day_1, pay_day_2, gross_salary, salary_period, target_pocket_id, status, color, notes, created_at, updated_at)
                  SELECT id, title, company_name, employment_type, pay_schedule, pay_day_1, pay_day_2, gross_salary, salary_period, target_pocket_id, status, color, notes, created_at, updated_at FROM jobs;
                DROP TABLE jobs;
                ALTER TABLE jobs_migration RENAME TO jobs;
                CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
                CREATE INDEX IF NOT EXISTS idx_jobs_target_pocket ON jobs(target_pocket_id);
                PRAGMA foreign_keys = ON;
            `);
        }
    } catch {
        // Ignore table migration check failure
    }

    // 10. Ensure job_deductions table exists
    try {
        await db.getFirstAsync('SELECT id FROM job_deductions LIMIT 1;');
    } catch (err: any) {
        const msg = String(err?.message || err);
        if (msg.includes('no such table')) {
            await db.execAsync(`
        CREATE TABLE IF NOT EXISTS job_deductions (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL,
          name TEXT NOT NULL,
          category TEXT NOT NULL CHECK(category IN ('tax', 'statutory', 'workplace', 'other')),
          amount REAL NOT NULL,
          is_percentage INTEGER NOT NULL DEFAULT 0,
          percentage_rate REAL DEFAULT NULL,
          pay_cutoff TEXT NOT NULL DEFAULT 'both' CHECK(pay_cutoff IN ('both', 'first_cutoff', 'second_cutoff')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_job_deductions_job ON job_deductions(job_id);
        CREATE INDEX IF NOT EXISTS idx_job_deductions_category ON job_deductions(category);
      `);
        }
    }

    // 10b. Ensure job_deductions has pay_cutoff column
    try {
        await db.getFirstAsync('SELECT pay_cutoff FROM job_deductions LIMIT 1;');
    } catch {
        try {
            await db.execAsync("ALTER TABLE job_deductions ADD COLUMN pay_cutoff TEXT NOT NULL DEFAULT 'both';");
        } catch {
            // Column may already exist or table was just created
        }
    }

    // 11. Ensure pay_slips table exists
    try {
        await db.getFirstAsync('SELECT id FROM pay_slips LIMIT 1;');
    } catch (err: any) {
        const msg = String(err?.message || err);
        if (msg.includes('no such table')) {
            await db.execAsync(`
        CREATE TABLE IF NOT EXISTS pay_slips (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL,
          pocket_id TEXT NOT NULL,
          transaction_id TEXT DEFAULT NULL,
          pay_date TEXT NOT NULL,
          gross_amount REAL NOT NULL,
          total_deductions REAL NOT NULL,
          net_amount REAL NOT NULL,
          deductions_snapshot TEXT NOT NULL DEFAULT '[]',
          status TEXT NOT NULL DEFAULT 'paid' CHECK(status IN ('paid', 'pending', 'skipped')),
          notes TEXT DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
          FOREIGN KEY (pocket_id) REFERENCES account_pockets(id) ON DELETE RESTRICT,
          FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
          UNIQUE(job_id, pay_date)
        );
        CREATE INDEX IF NOT EXISTS idx_pay_slips_job ON pay_slips(job_id);
        CREATE INDEX IF NOT EXISTS idx_pay_slips_pay_date ON pay_slips(pay_date DESC);
        CREATE INDEX IF NOT EXISTS idx_pay_slips_pocket ON pay_slips(pocket_id);
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
