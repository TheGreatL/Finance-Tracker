import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardHeader } from '@/src/components/dashboard/DashboardHeader';
import { BalanceHeroCard } from '@/src/components/dashboard/BalanceHeroCard';
import { QuickActionsBar } from '@/src/components/dashboard/QuickActionsBar';
import {
  RecentTransactionsList,
} from '@/src/components/dashboard/RecentTransactionsList';
import { TransactionItemData } from '@/src/components/dashboard/TransactionItem';
import { calculateNetBalance } from '@/src/utils/calculations';

// Initial demo transaction records showcasing the Pistachio & Pine palette
const INITIAL_TRANSACTIONS: TransactionItemData[] = [
  {
    id: 'tx-1',
    title: 'Salary Deposit (Tech Corp)',
    category: 'Salary',
    amount: 45000.0,
    type: 'income',
    date: new Date().toISOString(),
    accountName: 'BPI Checking',
  },
  {
    id: 'tx-2',
    title: 'Whole Foods Market',
    category: 'Groceries',
    amount: 3250.75,
    type: 'expense',
    date: new Date().toISOString(),
    accountName: 'Credit Card',
  },
  {
    id: 'tx-3',
    title: 'Blue Bottle Coffee',
    category: 'Dining & Drinks',
    amount: 280.0,
    type: 'expense',
    date: new Date(Date.now() - 86400000).toISOString(),
    accountName: 'GCash',
  },
  {
    id: 'tx-4',
    title: 'Freelance Design Project',
    category: 'Freelance',
    amount: 12500.0,
    type: 'income',
    date: new Date(Date.now() - 172800000).toISOString(),
    accountName: 'BDO Savings',
  },
  {
    id: 'tx-5',
    title: 'Meralco Electric Utility',
    category: 'Bills & Utilities',
    amount: 4120.5,
    type: 'expense',
    date: new Date(Date.now() - 259200000).toISOString(),
    accountName: 'BPI Checking',
  },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<TransactionItemData[]>(INITIAL_TRANSACTIONS);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  }, []);

  const { totalBalance, totalIncome, totalExpense } = calculateNetBalance(transactions);

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: Math.max(insets.top, 12) }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#BBD583"
            colors={['#18342B', '#BBD583']}
          />
        }
      >
        {/* Header with greeting and date */}
        <DashboardHeader
          userName="Personal Ledger"
          onNotificationPress={() => {}}
          onScanPress={() => {}}
        />

        {/* Hero Card with Pistachio primary color & Deep Pine text */}
        <BalanceHeroCard
          totalBalance={totalBalance}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          currency="₱"
        />

        {/* Quick action buttons: Expense, Income, Transfer, Scan OCR */}
        <QuickActionsBar
          onAddExpense={() => {}}
          onAddIncome={() => {}}
          onTransfer={() => {}}
          onScanReceipt={() => {}}
        />

        {/* Recent transactions list */}
        <RecentTransactionsList
          transactions={transactions}
          currency="₱"
          onSeeAllPress={() => {}}
        />
      </ScrollView>
    </View>
  );
}
