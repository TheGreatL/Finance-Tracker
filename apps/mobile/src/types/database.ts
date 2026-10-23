export type InstitutionType = 'bank' | 'ewallet' | 'cash' | 'other';
export type PocketType = 'wallet' | 'savings';
export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  code: string;
  color: string;
  icon: string;
  is_archived?: number;
  created_at: string;
  updated_at: string;
  total_balance?: number;
  pocket_count?: number;
}

export interface AccountPocket {
  id: string;
  institution_id: string;
  name: string;
  pocket_type: PocketType;
  currency: string;
  starting_balance: number;
  current_balance: number;
  interest_rate?: number | null;
  savings_details?: string;
  is_archived?: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionRecord {
  id: string;
  title: string;
  pocket_id: string;
  to_pocket_id?: string | null;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields for display
  pocket_name?: string;
  institution_name?: string;
  institution_color?: string;
  institution_code?: string;
  to_pocket_name?: string;
  to_institution_name?: string;
}

