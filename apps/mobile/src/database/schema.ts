export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('bank', 'ewallet', 'cash', 'other')),
  code TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  notes TEXT DEFAULT '',
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS account_pockets (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  name TEXT NOT NULL,
  pocket_type TEXT NOT NULL CHECK(pocket_type IN ('wallet', 'savings')),
  currency TEXT NOT NULL DEFAULT 'PHP',
  starting_balance REAL NOT NULL DEFAULT 0.0,
  current_balance REAL NOT NULL DEFAULT 0.0,
  interest_rate REAL DEFAULT NULL,
  savings_details TEXT DEFAULT '',
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  pocket_id TEXT NOT NULL,
  to_pocket_id TEXT DEFAULT NULL,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (pocket_id) REFERENCES account_pockets(id) ON DELETE RESTRICT,
  FOREIGN KEY (to_pocket_id) REFERENCES account_pockets(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_pockets_institution ON account_pockets(institution_id);
CREATE INDEX IF NOT EXISTS idx_transactions_pocket ON transactions(pocket_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_pocket ON transactions(to_pocket_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

