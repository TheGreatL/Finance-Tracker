import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyFlow,
  calculateCategoryBreakdown,
  calculateAssetDistribution,
} from '../src/services/analyticsService';
import type { TransactionRecord, AccountPocket } from '../src/types/database';

describe('analyticsService', () => {
  const mockTransactions: TransactionRecord[] = [
    {
      id: 'tx1',
      pocket_id: 'p1',
      type: 'income',
      amount: 50000,
      category: 'Salary',
      title: 'Monthly Salary',
      date: '2026-10-01',
      created_at: '2026-10-01',
    },
    {
      id: 'tx2',
      pocket_id: 'p1',
      type: 'expense',
      amount: 15000,
      category: 'Food',
      title: 'Groceries',
      date: '2026-10-05',
      created_at: '2026-10-05',
    },
    {
      id: 'tx3',
      pocket_id: 'p2',
      type: 'expense',
      amount: 5000,
      category: 'Bills',
      title: 'Electricity',
      date: '2026-10-10',
      created_at: '2026-10-10',
    },
  ];

  const mockPockets: (AccountPocket & { institution_type?: string })[] = [
    {
      id: 'p1',
      institution_id: 'i1',
      name: 'BDO Savings',
      pocket_type: 'savings',
      current_balance: 30000,
      institution_type: 'bank',
      is_active: 1,
      interest_rate: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'p2',
      institution_id: 'i2',
      name: 'GCash Wallet',
      pocket_type: 'everyday',
      current_balance: 10000,
      institution_type: 'ewallet',
      is_active: 1,
      interest_rate: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'p3',
      institution_id: 'i3',
      name: 'Cash Pocket',
      pocket_type: 'everyday',
      current_balance: 10000,
      institution_type: 'cash',
      is_active: 1,
      interest_rate: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ];

  it('calculates monthly inflow, outflow, and net cash flow', () => {
    const flow = calculateMonthlyFlow(mockTransactions);
    expect(flow.totalIncome).toBe(50000);
    expect(flow.totalExpense).toBe(20000);
    expect(flow.netSavings).toBe(30000);
  });

  it('calculates category breakdown with percentages sorted descending', () => {
    const breakdown = calculateCategoryBreakdown(mockTransactions);
    expect(breakdown).toHaveLength(2);
    expect(breakdown[0].category).toBe('Food');
    expect(breakdown[0].total).toBe(15000);
    expect(breakdown[0].percentage).toBe(75);

    expect(breakdown[1].category).toBe('Bills');
    expect(breakdown[1].total).toBe(5000);
    expect(breakdown[1].percentage).toBe(25);
  });

  it('calculates asset distribution across banks, e-wallets, and cash', () => {
    const distribution = calculateAssetDistribution(mockPockets);
    expect(distribution.total).toBe(50000);
    expect(distribution.bankTotal).toBe(30000);
    expect(distribution.bankPercentage).toBe(60);
    expect(distribution.ewalletTotal).toBe(10000);
    expect(distribution.ewalletPercentage).toBe(20);
    expect(distribution.cashTotal).toBe(10000);
    expect(distribution.cashPercentage).toBe(20);
  });
});
