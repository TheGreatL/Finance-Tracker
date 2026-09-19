export type AccountType = 'cash' | 'bank' | 'ewallet' | 'credit_card';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  opening_balance: number;
  current_balance: number;
  credit_limit?: number;
  statement_day?: number | null;
  due_day?: number | null;
  color: string;
  icon: string;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  is_default: number;
  is_archived: number;
  created_at: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';
export type ExpenseNature = 'needs' | 'wants' | 'investment' | 'obligation';

export interface Transaction {
  id: string;
  type: TransactionType;
  account_id: string;
  to_account_id?: string | null;
  category_id?: string | null;
  amount: number;
  date: string;
  notes?: string;
  tags?: string;
  expense_nature?: ExpenseNature;
  gross_amount?: number | null;
  deductions_total?: number;
  is_recurring?: number;
  recurring_rule_id?: string | null;
  linked_goal_id?: string | null;
  linked_loan_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionWithDetails extends Transaction {
  account_name?: string;
  to_account_name?: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  deductions?: TransactionDeduction[];
}

export interface TransactionDeduction {
  id: string;
  transaction_id: string;
  name: string;
  amount: number;
}

export type DeductionCutoff = 'first' | 'second' | 'both';

export interface RecurringDeduction {
  name: string;
  amount: number;
  cutoff?: DeductionCutoff;
}

export type FrequencyType = 'daily' | 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly' | 'yearly';

export interface RecurringRule {
  id: string;
  type: TransactionType;
  account_id: string;
  to_account_id?: string | null;
  category_id?: string | null;
  amount: number;
  frequency: FrequencyType;
  start_date: string;
  end_date?: string | null;
  next_due_date: string;
  auto_create: number;
  is_active: number;
  notes?: string;
  gross_amount?: number | null;
  deductions_json?: string | null;
  payout_day_1?: number | null;
  payout_day_2?: number | null;
  created_at: string;
}

export type GoalStatus = 'active' | 'reached' | 'cancelled';

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
  account_id?: string | null;
  color: string;
  icon: string;
  status: GoalStatus;
  created_at: string;
}

export type LoanType = 'payable' | 'receivable';
export type LoanStatus = 'active' | 'paid_off' | 'defaulted';

export interface Loan {
  id: string;
  title: string;
  lender_or_borrower: string;
  type: LoanType;
  principal_amount: number;
  interest_rate: number;
  installment_amount: number;
  payment_frequency: string;
  start_date: string;
  due_date: string;
  remaining_balance: number;
  account_id?: string | null;
  status: LoanStatus;
  notes?: string;
  created_at: string;
}

export type WishlistPriority = 'low' | 'medium' | 'high';
export type WishlistStatus = 'wishing' | 'ready_to_buy' | 'purchased' | 'cancelled';

export interface WishlistItem {
  id: string;
  title: string;
  estimated_cost: number;
  priority: WishlistPriority;
  target_date?: string | null;
  notes?: string;
  url?: string;
  category_id?: string | null;
  status: WishlistStatus;
  created_at: string;
}

export interface AppSetting {
  key: string;
  value: string;
}

export interface BackupManifest {
  version: string;
  app_version: string;
  export_timestamp: string;
  record_counts: {
    accounts: number;
    categories: number;
    transactions: number;
    deductions: number;
    recurring_rules: number;
    savings_goals: number;
    loans: number;
    wishlist: number;
  };
}

export interface DashboardSummary {
  totalNetWorth: number;
  liquidCash: number;
  creditDebt: number;
  monthlyIncome: number;
  monthlyGrossIncome: number;
  monthlyDeductions: number;
  monthlyExpenses: number;
  monthlyNeeds: number;
  monthlyWants: number;
  netCashFlow: number;
  safeToSpend: number;
}

