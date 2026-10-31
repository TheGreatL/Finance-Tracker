import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyFlow,
  calculateCategoryBreakdown,
  calculateAssetDistribution,
  calculateSubscriptionsAnalytics,
  calculateLoansAnalytics,
} from '../src/services/analyticsService';
import type { TransactionRecord, AccountPocket, LoanRecord, SubscriptionRecord } from '../src/types/database';

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
      updated_at: '2026-10-01',
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
      updated_at: '2026-10-05',
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
      updated_at: '2026-10-10',
    },
  ];

  const mockPockets: (AccountPocket & { institution_type?: string })[] = [
    {
      id: 'p1',
      institution_id: 'i1',
      name: 'BDO Savings',
      pocket_type: 'savings',
      currency: 'PHP',
      starting_balance: 30000,
      current_balance: 30000,
      institution_type: 'bank',
      interest_rate: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'p2',
      institution_id: 'i2',
      name: 'GCash Wallet',
      pocket_type: 'wallet',
      currency: 'PHP',
      starting_balance: 10000,
      current_balance: 10000,
      institution_type: 'ewallet',
      interest_rate: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'p3',
      institution_id: 'i3',
      name: 'Cash Pocket',
      pocket_type: 'wallet',
      currency: 'PHP',
      starting_balance: 10000,
      current_balance: 10000,
      institution_type: 'cash',
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

  it('calculates subscription analytics including monthly spend and annual projection', () => {
    const mockSubs: (SubscriptionRecord & { pocket_name?: string; institution_name?: string })[] = [
      {
        id: 's1',
        service_name: 'Netflix',
        service_code: 'netflix',
        pocket_id: 'p1',
        amount: 549,
        frequency: 'monthly',
        start_date: '2026-10-01',
        next_billing_date: '2026-11-01',
        category: 'Entertainment',
        status: 'active',
        reminder_days_before: 1,
        notification_id: '',
        notes: '',
        created_at: '2026-10-01',
        updated_at: '2026-10-01',
        pocket_name: 'Main Wallet',
        institution_name: 'Maya',
      },
      {
        id: 's2',
        service_name: 'Gym Membership',
        service_code: 'gym',
        pocket_id: 'p1',
        amount: 12000,
        frequency: 'yearly',
        start_date: '2026-01-01',
        next_billing_date: '2027-01-01',
        category: 'Health',
        status: 'active',
        reminder_days_before: 1,
        notification_id: '',
        notes: '',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        pocket_name: 'BDO Savings',
        institution_name: 'BDO',
      },
      {
        id: 's3',
        service_name: 'Spotify',
        service_code: 'spotify',
        pocket_id: 'p1',
        amount: 149,
        frequency: 'monthly',
        start_date: '2026-10-01',
        next_billing_date: '2026-11-01',
        category: 'Entertainment',
        status: 'paused',
        reminder_days_before: 1,
        notification_id: '',
        notes: '',
        created_at: '2026-10-01',
        updated_at: '2026-10-01',
      },
    ];

    const analytics = calculateSubscriptionsAnalytics(mockSubs);
    // 549 + (12000/12 = 1000) = 1549/month
    expect(analytics.monthlyTotal).toBe(1549);
    expect(analytics.yearlyProjected).toBe(18588);
    expect(analytics.activeCount).toBe(2);
    expect(analytics.pausedCount).toBe(1);
    expect(analytics.subscriptions).toHaveLength(2);
  });

  it('calculates comprehensive loan debt analytics and repayment progress', () => {
    const mockLoans: (LoanRecord & { institution_name?: string })[] = [
      {
        id: 'l1',
        institution_id: 'i1',
        title: 'BillEase Laptop',
        total_amount: 30000,
        remaining_balance: 10000,
        monthly_payment: 5000,
        due_date: '2026-11-15',
        status: 'active',
        attachment_path: '',
        attachment_name: '',
        notes: '',
        created_at: '2026-06-01',
        updated_at: '2026-10-01',
        institution_name: 'BillEase',
      },
      {
        id: 'l2',
        institution_id: 'i2',
        title: 'GLoan Emergency',
        total_amount: 20000,
        remaining_balance: 15000,
        monthly_payment: 2500,
        due_date: '2026-11-20',
        status: 'active',
        attachment_path: '',
        attachment_name: '',
        notes: '',
        created_at: '2026-08-01',
        updated_at: '2026-10-01',
        institution_name: 'GCash',
      },
    ];

    const analytics = calculateLoansAnalytics(mockLoans);
    expect(analytics.totalOutstandingDebt).toBe(25000);
    expect(analytics.totalOriginalAmount).toBe(50000);
    expect(analytics.totalRepaidSoFar).toBe(25000);
    expect(analytics.repaymentPercentage).toBe(50);
    expect(analytics.monthlyPaymentTotal).toBe(7500);
    expect(analytics.activeCount).toBe(2);
    expect(analytics.loans[0].progressPercentage).toBe(67); // (30k-10k)/30k = 66.67%
  });
});
