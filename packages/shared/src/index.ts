export type AccountType = 'cash' | 'bank' | 'ewallet' | 'credit_card';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type ExpenseNature = 'needs' | 'wants' | 'investment' | 'obligation';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  opening_balance: number;
  current_balance: number;
  credit_limit?: number;
  statement_day?: number;
  due_day?: number;
  color?: string;
  icon?: string;
  is_archived?: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  account_id: string;
  to_account_id?: string;
  category_id?: string;
  amount: number;
  date: string;
  notes?: string;
  tags?: string;
  expense_nature?: ExpenseNature;
  gross_amount?: number;
  deductions_total?: number;
}

