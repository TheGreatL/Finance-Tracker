import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('finance_tracker.db');
    await initDatabase(dbInstance);
  }
  return dbInstance;
}

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('cash', 'bank', 'ewallet', 'credit_card')),
      currency TEXT NOT NULL DEFAULT 'PHP',
      opening_balance REAL NOT NULL DEFAULT 0.0,
      current_balance REAL NOT NULL DEFAULT 0.0,
      credit_limit REAL DEFAULT 0.0,
      statement_day INTEGER DEFAULT NULL,
      due_day INTEGER DEFAULT NULL,
      color TEXT DEFAULT '#4F46E5',
      icon TEXT DEFAULT 'wallet',
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      icon TEXT DEFAULT 'tag',
      color TEXT DEFAULT '#10B981',
      is_default INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
      account_id TEXT NOT NULL,
      to_account_id TEXT DEFAULT NULL,
      category_id TEXT DEFAULT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      expense_nature TEXT DEFAULT 'needs' CHECK(expense_nature IN ('needs', 'wants', 'investment', 'obligation')),
      gross_amount REAL DEFAULT NULL,
      deductions_total REAL DEFAULT 0.0,
      is_recurring INTEGER NOT NULL DEFAULT 0,
      recurring_rule_id TEXT DEFAULT NULL,
      linked_goal_id TEXT DEFAULT NULL,
      linked_loan_id TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(account_id) REFERENCES accounts(id),
      FOREIGN KEY(to_account_id) REFERENCES accounts(id),
      FOREIGN KEY(category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS transaction_deductions (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recurring_rules (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
      account_id TEXT NOT NULL,
      to_account_id TEXT DEFAULT NULL,
      category_id TEXT DEFAULT NULL,
      amount REAL NOT NULL,
      frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'biweekly', 'semi_monthly', 'monthly', 'yearly')),
      start_date TEXT NOT NULL,
      end_date TEXT DEFAULT NULL,
      next_due_date TEXT NOT NULL,
      auto_create INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT DEFAULT '',
      gross_amount REAL DEFAULT NULL,
      deductions_json TEXT DEFAULT NULL,
      payout_day_1 INTEGER DEFAULT NULL,
      payout_day_2 INTEGER DEFAULT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0.0,
      target_date TEXT DEFAULT NULL,
      account_id TEXT DEFAULT NULL,
      color TEXT DEFAULT '#3B82F6',
      icon TEXT DEFAULT 'flag',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'reached', 'cancelled')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      lender_or_borrower TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('payable', 'receivable')),
      principal_amount REAL NOT NULL,
      interest_rate REAL NOT NULL DEFAULT 0.0,
      installment_amount REAL NOT NULL DEFAULT 0.0,
      payment_frequency TEXT NOT NULL DEFAULT 'monthly',
      start_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      remaining_balance REAL NOT NULL,
      account_id TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paid_off', 'defaulted')),
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wishlist_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      estimated_cost REAL NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      target_date TEXT DEFAULT NULL,
      notes TEXT DEFAULT '',
      url TEXT DEFAULT '',
      category_id TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'wishing' CHECK(status IN ('wishing', 'ready_to_buy', 'purchased', 'cancelled')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_to_account ON transactions(to_account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
  `);

  await migrateDatabaseIfNeeded(db);
  await seedDefaultsIfNeeded(db);
}

async function migrateDatabaseIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  // Check if recurring_rules table needs columns or check constraint migration
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(recurring_rules)');
  const hasGross = columns.some((c) => c.name === 'gross_amount');
  const hasDeductions = columns.some((c) => c.name === 'deductions_json');
  const hasPayoutDay1 = columns.some((c) => c.name === 'payout_day_1');
  const hasPayoutDay2 = columns.some((c) => c.name === 'payout_day_2');

  if (!hasGross) {
    await db.runAsync('ALTER TABLE recurring_rules ADD COLUMN gross_amount REAL DEFAULT NULL');
  }
  if (!hasDeductions) {
    await db.runAsync('ALTER TABLE recurring_rules ADD COLUMN deductions_json TEXT DEFAULT NULL');
  }
  if (!hasPayoutDay1) {
    await db.runAsync('ALTER TABLE recurring_rules ADD COLUMN payout_day_1 INTEGER DEFAULT NULL');
  }
  if (!hasPayoutDay2) {
    await db.runAsync('ALTER TABLE recurring_rules ADD COLUMN payout_day_2 INTEGER DEFAULT NULL');
  }

  // Check if frequency check constraint supports semi_monthly
  const tableSql = await db.getFirstAsync<{ sql: string }>(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='recurring_rules'"
  );
  if (tableSql && tableSql.sql && !tableSql.sql.includes('semi_monthly')) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recurring_rules_temp (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
        account_id TEXT NOT NULL,
        to_account_id TEXT DEFAULT NULL,
        category_id TEXT DEFAULT NULL,
        amount REAL NOT NULL,
        frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'biweekly', 'semi_monthly', 'monthly', 'yearly')),
        start_date TEXT NOT NULL,
        end_date TEXT DEFAULT NULL,
        next_due_date TEXT NOT NULL,
        auto_create INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        notes TEXT DEFAULT '',
        gross_amount REAL DEFAULT NULL,
        deductions_json TEXT DEFAULT NULL,
        created_at TEXT NOT NULL
      );
      INSERT INTO recurring_rules_temp (
        id, type, account_id, to_account_id, category_id, amount,
        frequency, start_date, end_date, next_due_date, auto_create,
        is_active, notes, gross_amount, deductions_json, created_at
      )
      SELECT id, type, account_id, to_account_id, category_id, amount,
             frequency, start_date, end_date, next_due_date, auto_create,
             is_active, notes, gross_amount, deductions_json, created_at
      FROM recurring_rules;
      DROP TABLE recurring_rules;
      ALTER TABLE recurring_rules_temp RENAME TO recurring_rules;
    `);
  }

  // Reset legacy dummy opening balances (25000, 2000, 3500) if no transactions have been recorded

  const txCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM transactions');
  if (txCount && txCount.count === 0) {
    await db.runAsync(`
      UPDATE accounts 
      SET opening_balance = 0.0, current_balance = 0.0 
      WHERE (id = 'acc-bank-1' AND opening_balance = 25000 AND current_balance = 25000)
         OR (id = 'acc-cash-1' AND opening_balance = 2000 AND current_balance = 2000)
         OR (id = 'acc-ewallet-1' AND opening_balance = 3500 AND current_balance = 3500)
    `);
    await db.runAsync(`
      UPDATE accounts 
      SET credit_limit = 0.0 
      WHERE id = 'acc-card-1' AND credit_limit = 50000 AND opening_balance = 0 AND current_balance = 0
    `);
  }
}

export async function seedCategoriesIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  const catCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
  const now = new Date().toISOString();

  if (!catCount || catCount.count === 0) {
    // Seed default categories
    const categories = [
      // Income
      { id: 'cat-inc-salary', name: 'Salary', type: 'income', icon: 'briefcase', color: '#10B981', is_default: 1 },
      { id: 'cat-inc-freelance', name: 'Freelance & Consulting', type: 'income', icon: 'laptop', color: '#3B82F6', is_default: 1 },
      { id: 'cat-inc-investments', name: 'Investments & Dividends', type: 'income', icon: 'trending-up', color: '#8B5CF6', is_default: 1 },
      { id: 'cat-inc-business', name: 'Business Income', type: 'income', icon: 'building', color: '#059669', is_default: 1 },
      { id: 'cat-inc-gifts', name: 'Gifts & Allowance', type: 'income', icon: 'gift', color: '#EC4899', is_default: 1 },
      { id: 'cat-inc-other', name: 'Other Income', type: 'income', icon: 'plus-circle', color: '#6B7280', is_default: 1 },

      // Expense - Needs
      { id: 'cat-exp-rent', name: 'Rent & Housing', type: 'expense', icon: 'home', color: '#EF4444', is_default: 1 },
      { id: 'cat-exp-utilities', name: 'Utilities & Bills', type: 'expense', icon: 'zap', color: '#F59E0B', is_default: 1 },
      { id: 'cat-exp-groceries', name: 'Groceries & Market', type: 'expense', icon: 'shopping-cart', color: '#10B981', is_default: 1 },
      { id: 'cat-exp-health', name: 'Health & Pharmacy', type: 'expense', icon: 'heart', color: '#EC4899', is_default: 1 },
      { id: 'cat-exp-transport', name: 'Transportation & Gas', type: 'expense', icon: 'truck', color: '#6366F1', is_default: 1 },
      { id: 'cat-exp-insurance', name: 'Insurance', type: 'expense', icon: 'shield', color: '#4B5563', is_default: 1 },
      { id: 'cat-exp-debt', name: 'Debt & Loan Payments', type: 'expense', icon: 'credit-card', color: '#DC2626', is_default: 1 },

      // Expense - Wants
      { id: 'cat-exp-dining', name: 'Dining Out & Delivery', type: 'expense', icon: 'coffee', color: '#F97316', is_default: 1 },
      { id: 'cat-exp-entertainment', name: 'Entertainment & Hobbies', type: 'expense', icon: 'film', color: '#8B5CF6', is_default: 1 },
      { id: 'cat-exp-shopping', name: 'Shopping & Apparel', type: 'expense', icon: 'shopping-bag', color: '#D946EF', is_default: 1 },
      { id: 'cat-exp-subscriptions', name: 'Digital Subscriptions', type: 'expense', icon: 'tv', color: '#06B6D4', is_default: 1 },
      { id: 'cat-exp-travel', name: 'Travel & Vacations', type: 'expense', icon: 'compass', color: '#0284C7', is_default: 1 },
      { id: 'cat-exp-other', name: 'General Expense', type: 'expense', icon: 'tag', color: '#9CA3AF', is_default: 1 },
    ];

    for (const cat of categories) {
      await db.runAsync(
        `INSERT OR IGNORE INTO categories (id, name, type, icon, color, is_default, is_archived, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [cat.id, cat.name, cat.type, cat.icon, cat.color, cat.is_default, now]
      );
    }
  }
}

export async function seedStarterAccountsIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  const accountCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM accounts');
  const now = new Date().toISOString();

  if (!accountCount || accountCount.count === 0) {
    const defaultAccounts = [
      {
        id: 'acc-cash-1',
        name: 'Physical Cash',
        type: 'cash',
        currency: 'PHP',
        opening_balance: 0,
        current_balance: 0,
        color: '#10B981',
        icon: 'banknote',
      },
      {
        id: 'acc-bank-1',
        name: 'Checking Bank Account',
        type: 'bank',
        currency: 'PHP',
        opening_balance: 0,
        current_balance: 0,
        color: '#3B82F6',
        icon: 'landmark',
      },
      {
        id: 'acc-ewallet-1',
        name: 'GCash / eWallet',
        type: 'ewallet',
        currency: 'PHP',
        opening_balance: 0,
        current_balance: 0,
        color: '#06B6D4',
        icon: 'smartphone',
      },
      {
        id: 'acc-card-1',
        name: 'Rewards Credit Card',
        type: 'credit_card',
        currency: 'PHP',
        opening_balance: 0,
        current_balance: 0,
        credit_limit: 0,
        statement_day: null,
        due_day: null,
        color: '#8B5CF6',
        icon: 'credit-card',
      },
    ];

    for (const acc of defaultAccounts) {
      await db.runAsync(
        `INSERT OR IGNORE INTO accounts (id, name, type, currency, opening_balance, current_balance, credit_limit, statement_day, due_day, color, icon, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          acc.id,
          acc.name,
          acc.type,
          acc.currency,
          acc.opening_balance,
          acc.current_balance,
          acc.credit_limit ?? 0,
          acc.statement_day ?? null,
          acc.due_day ?? null,
          acc.color,
          acc.icon,
          now,
          now,
        ]
      );
    }
  }
}

export async function seedDefaultsIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  await seedCategoriesIfNeeded(db);

  // Seed default settings if empty
  const currencySetting = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', ['currency']);
  if (!currencySetting) {
    await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', ['currency', '₱']);
    await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', ['currency_code', 'PHP']);
    await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', ['theme', 'panel']);
  }

  await seedStarterAccountsIfNeeded(db);
}

export async function resetDatabase(mode: 'starter_zero' | 'blank' = 'starter_zero'): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM transaction_deductions;
    DELETE FROM transactions;
    DELETE FROM recurring_rules;
    DELETE FROM savings_goals;
    DELETE FROM loans;
    DELETE FROM wishlist_items;
    DELETE FROM accounts;
    DELETE FROM categories;
  `);

  await seedCategoriesIfNeeded(db);

  if (mode === 'starter_zero') {
    await seedStarterAccountsIfNeeded(db);
  }
}


