import type { SQLiteDatabase } from 'expo-sqlite';
import type { TransactionRecord, AccountPocket } from '../types/database';
import { getAllActivePockets } from './accountService';
import { getRecentTransactions } from './transactionService';
import { getLoansSummary } from './loanService';

export interface MonthlyFlow {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  percentage: number;
  count: number;
}

export interface AssetDistribution {
  total: number;
  bankTotal: number;
  bankPercentage: number;
  ewalletTotal: number;
  ewalletPercentage: number;
  cashTotal: number;
  cashPercentage: number;
}

export interface AnalyticsSummary {
  monthlyFlow: MonthlyFlow;
  categoryBreakdown: CategoryBreakdown[];
  assetDistribution: AssetDistribution;
  totalLoansDebt: number;
}

export function calculateMonthlyFlow(transactions: TransactionRecord[]): MonthlyFlow {
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    totalIncome,
    totalExpense,
    netSavings: totalIncome - totalExpense,
  };
}

export function calculateCategoryBreakdown(transactions: TransactionRecord[]): CategoryBreakdown[] {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

  if (totalExpense === 0) return [];

  const map = new Map<string, { total: number; count: number }>();
  for (const t of expenses) {
    const cat = t.category || 'General';
    const existing = map.get(cat) || { total: 0, count: 0 };
    map.set(cat, {
      total: existing.total + t.amount,
      count: existing.count + 1,
    });
  }

  const result: CategoryBreakdown[] = [];
  for (const [category, data] of map.entries()) {
    result.push({
      category,
      total: data.total,
      percentage: Math.round((data.total / totalExpense) * 100),
      count: data.count,
    });
  }

  return result.sort((a, b) => b.total - a.total);
}

export function calculateAssetDistribution(
  pockets: (AccountPocket & { institution_type?: string })[]
): AssetDistribution {
  const total = pockets.reduce((sum, p) => sum + p.current_balance, 0);
  if (total === 0) {
    return {
      total: 0,
      bankTotal: 0,
      bankPercentage: 0,
      ewalletTotal: 0,
      ewalletPercentage: 0,
      cashTotal: 0,
      cashPercentage: 0,
    };
  }

  let bankTotal = 0;
  let ewalletTotal = 0;
  let cashTotal = 0;

  for (const p of pockets) {
    const type = p.institution_type || 'bank';
    if (type === 'ewallet') {
      ewalletTotal += p.current_balance;
    } else if (type === 'cash') {
      cashTotal += p.current_balance;
    } else {
      bankTotal += p.current_balance;
    }
  }

  return {
    total,
    bankTotal,
    bankPercentage: Math.round((bankTotal / total) * 100),
    ewalletTotal,
    ewalletPercentage: Math.round((ewalletTotal / total) * 100),
    cashTotal,
    cashPercentage: Math.round((cashTotal / total) * 100),
  };
}

export async function getAnalyticsSummary(db: SQLiteDatabase): Promise<AnalyticsSummary> {
  const [pockets, transactions, loansSummary] = await Promise.all([
    getAllActivePockets(db),
    getRecentTransactions(db, 200),
    getLoansSummary(db),
  ]);

  return {
    monthlyFlow: calculateMonthlyFlow(transactions),
    categoryBreakdown: calculateCategoryBreakdown(transactions),
    assetDistribution: calculateAssetDistribution(pockets),
    totalLoansDebt: loansSummary.totalLoanBalance,
  };
}
