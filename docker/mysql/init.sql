-- MySQL Database Initial Schema for Finance Tracker
CREATE DATABASE IF NOT EXISTS finance_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE finance_tracker;

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  type ENUM('cash', 'bank', 'ewallet', 'credit_card') NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'PHP',
  opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  credit_limit DECIMAL(15, 2) DEFAULT 0.00,
  statement_day INT DEFAULT NULL,
  due_day INT DEFAULT NULL,
  color VARCHAR(32) DEFAULT '#4F46E5',
  icon VARCHAR(64) DEFAULT 'wallet',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  color VARCHAR(32) DEFAULT '#6B7280',
  icon VARCHAR(64) DEFAULT 'tag',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Savings Goals
CREATE TABLE IF NOT EXISTS savings_goals (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  target_amount DECIMAL(15, 2) NOT NULL,
  current_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  target_date DATE DEFAULT NULL,
  color VARCHAR(32) DEFAULT '#10B981',
  icon VARCHAR(64) DEFAULT 'trophy',
  status ENUM('active', 'achieved', 'cancelled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Loans & Payables
CREATE TABLE IF NOT EXISTS loans (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  type ENUM('payable', 'receivable') NOT NULL,
  original_amount DECIMAL(15, 2) NOT NULL,
  remaining_amount DECIMAL(15, 2) NOT NULL,
  interest_rate DECIMAL(5, 2) DEFAULT 0.00,
  due_date DATE DEFAULT NULL,
  lender_borrower VARCHAR(128) DEFAULT '',
  monthly_payment DECIMAL(15, 2) DEFAULT 0.00,
  status ENUM('active', 'paid', 'defaulted') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recurring Rules
CREATE TABLE IF NOT EXISTS recurring_rules (
  id VARCHAR(64) PRIMARY KEY,
  type ENUM('income', 'expense', 'transfer') NOT NULL,
  account_id VARCHAR(64) NOT NULL,
  to_account_id VARCHAR(64) DEFAULT NULL,
  category_id VARCHAR(64) DEFAULT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  frequency ENUM('daily', 'weekly', 'biweekly', 'semi_monthly', 'monthly', 'yearly') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE DEFAULT NULL,
  notes TEXT,
  expense_nature ENUM('needs', 'wants', 'investment', 'obligation') DEFAULT 'needs',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (to_account_id) REFERENCES accounts(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transactions (Source of Truth Ledger)
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(64) PRIMARY KEY,
  type ENUM('income', 'expense', 'transfer') NOT NULL,
  account_id VARCHAR(64) NOT NULL,
  to_account_id VARCHAR(64) DEFAULT NULL,
  category_id VARCHAR(64) DEFAULT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  tags VARCHAR(255) DEFAULT '',
  expense_nature ENUM('needs', 'wants', 'investment', 'obligation') DEFAULT 'needs',
  gross_amount DECIMAL(15, 2) DEFAULT NULL,
  deductions_total DECIMAL(15, 2) DEFAULT 0.00,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_rule_id VARCHAR(64) DEFAULT NULL,
  linked_goal_id VARCHAR(64) DEFAULT NULL,
  linked_loan_id VARCHAR(64) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (to_account_id) REFERENCES accounts(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (recurring_rule_id) REFERENCES recurring_rules(id) ON DELETE SET NULL,
  FOREIGN KEY (linked_goal_id) REFERENCES savings_goals(id) ON DELETE SET NULL,
  FOREIGN KEY (linked_loan_id) REFERENCES loans(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transaction Deductions (Itemized tax, statutory contributions, etc.)
CREATE TABLE IF NOT EXISTS transaction_deductions (
  id VARCHAR(64) PRIMARY KEY,
  transaction_id VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wishlist Items
CREATE TABLE IF NOT EXISTS wishlist_items (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  target_price DECIMAL(15, 2) NOT NULL,
  category_id VARCHAR(64) DEFAULT NULL,
  priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  target_date DATE DEFAULT NULL,
  url TEXT,
  notes TEXT,
  status ENUM('active', 'purchased', 'archived') NOT NULL DEFAULT 'active',
  purchased_transaction_id VARCHAR(64) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (purchased_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OCR Receipt Scans
CREATE TABLE IF NOT EXISTS receipt_scans (
  id VARCHAR(64) PRIMARY KEY,
  image_path VARCHAR(255) NOT NULL,
  vendor VARCHAR(128),
  total_amount DECIMAL(15, 2),
  tax_amount DECIMAL(15, 2),
  receipt_date DATE,
  raw_text TEXT,
  transaction_id VARCHAR(64) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Starter Categories
INSERT IGNORE INTO categories (id, name, type, color, icon, is_default) VALUES
('cat_income_salary', 'Salary', 'income', '#10B981', 'briefcase', TRUE),
('cat_income_freelance', 'Freelance', 'income', '#059669', 'laptop', TRUE),
('cat_income_investments', 'Investments', 'income', '#0D9488', 'trending-up', TRUE),
('cat_income_gifts', 'Gifts & Allowance', 'income', '#06B6D4', 'gift', TRUE),
('cat_income_other', 'Other Income', 'income', '#3B82F6', 'plus-circle', TRUE),
('cat_exp_food', 'Food & Dining', 'expense', '#EF4444', 'utensils', TRUE),
('cat_exp_groceries', 'Groceries', 'expense', '#F97316', 'shopping-cart', TRUE),
('cat_exp_transport', 'Transportation', 'expense', '#F59E0B', 'truck', TRUE),
('cat_exp_housing', 'Housing & Rent', 'expense', '#84CC16', 'home', TRUE),
('cat_exp_utilities', 'Bills & Utilities', 'expense', '#10B981', 'zap', TRUE),
('cat_exp_health', 'Healthcare & Medical', 'expense', '#06B6D4', 'heart', TRUE),
('cat_exp_entertainment', 'Entertainment & Leisure', 'expense', '#6366F1', 'film', TRUE),
('cat_exp_shopping', 'Shopping & Wants', 'expense', '#8B5CF6', 'shopping-bag', TRUE),
('cat_exp_subscriptions', 'Subscriptions', 'expense', '#EC4899', 'repeat', TRUE),
('cat_exp_debt', 'Debt & Loan Repayment', 'expense', '#DC2626', 'credit-card', TRUE),
('cat_exp_other', 'Other Expenses', 'expense', '#6B7280', 'more-horizontal', TRUE);

-- Starter Accounts (with 0.00 initial balance)
INSERT IGNORE INTO accounts (id, name, type, currency, opening_balance, current_balance, credit_limit, statement_day, due_day, color, icon) VALUES
('acc_cash', 'Cash Wallet', 'cash', 'PHP', 0.00, 0.00, 0.00, NULL, NULL, '#10B981', 'banknote'),
('acc_bpi', 'BPI Checking/Savings', 'bank', 'PHP', 0.00, 0.00, 0.00, NULL, NULL, '#3B82F6', 'building'),
('acc_gcash', 'GCash', 'ewallet', 'PHP', 0.00, 0.00, 0.00, NULL, NULL, '#06B6D4', 'smartphone'),
('acc_cc', 'BPI Rewards Card', 'credit_card', 'PHP', 0.00, 0.00, 50000.00, 15, 5, '#8B5CF6', 'credit-card');
