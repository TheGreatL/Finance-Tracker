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

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

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
`;
