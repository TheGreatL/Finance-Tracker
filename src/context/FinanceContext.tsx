import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getDatabase } from '../database/db';
import {
  Account,
  Category,
  TransactionWithDetails,
  DashboardSummary,
  SavingsGoal,
  Loan,
  WishlistItem,
  RecurringRule,
} from '../types/database';
import { getAllAccounts } from '../services/accountService';
import { getAllCategories } from '../services/categoryService';
import { getTransactions, getDashboardSummary } from '../services/ledgerService';
import { getAllSavingsGoals } from '../services/goalService';
import { getAllLoans } from '../services/loanService';
import { getAllWishlistItems } from '../services/wishlistService';
import { getAllRecurringRules, processDueRecurringRules } from '../services/recurringService';

interface FinanceContextType {
  loading: boolean;
  currency: string;
  accounts: Account[];
  categories: Category[];
  recentTransactions: TransactionWithDetails[];
  dashboardSummary: DashboardSummary | null;
  savingsGoals: SavingsGoal[];
  loans: Loan[];
  wishlist: WishlistItem[];
  recurringRules: RecurringRule[];
  refreshAll: () => Promise<void>;
  setCurrency: (symbol: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [currency, setCurrencyState] = useState('₱');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithDetails[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);

  const refreshAll = useCallback(async () => {
    try {
      const db = await getDatabase();

      // Process any due recurring transactions automatically on refresh
      await processDueRecurringRules();

      // Fetch currency setting
      const currRow = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM app_settings WHERE key = ?',
        ['currency']
      );
      if (currRow?.value) {
        setCurrencyState(currRow.value);
      }

      // Fetch all models concurrently
      const [
        accs,
        cats,
        txs,
        summary,
        goals,
        lns,
        wish,
        rules,
      ] = await Promise.all([
        getAllAccounts(false),
        getAllCategories(),
        getTransactions({ limit: 50 }),
        getDashboardSummary(),
        getAllSavingsGoals(),
        getAllLoans(),
        getAllWishlistItems(),
        getAllRecurringRules(),
      ]);

      setAccounts(accs);
      setCategories(cats);
      setRecentTransactions(txs);
      setDashboardSummary(summary);
      setSavingsGoals(goals);
      setLoans(lns);
      setWishlist(wish);
      setRecurringRules(rules);
    } catch (err) {
      console.error('Error refreshing finance data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const setCurrency = async (symbol: string) => {
    const db = await getDatabase();
    await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', ['currency', symbol]);
    setCurrencyState(symbol);
  };

  return (
    <FinanceContext.Provider
      value={{
        loading,
        currency,
        accounts,
        categories,
        recentTransactions,
        dashboardSummary,
        savingsGoals,
        loans,
        wishlist,
        recurringRules,
        refreshAll,
        setCurrency,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance(): FinanceContextType {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return ctx;
}

