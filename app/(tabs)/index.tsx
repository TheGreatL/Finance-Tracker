import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Text,
  Card,
  Button,
  Badge,
  Chip,
  Progress,
  useToast,
} from 'panelui-native';
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Plus,
  ShieldAlert,
  Wallet,
  CreditCard,
  Calendar,
  Sparkles,
  ChevronRight,
  Landmark,
  Smartphone,
  Banknote,
} from 'lucide-react-native';
import { useFinance } from '../../src/context/FinanceContext';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const {
    currency,
    dashboardSummary,
    accounts,
    recentTransactions,
    savingsGoals,
    loans,
    refreshAll,
    loading,
  } = useFinance();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const formatMoney = (amount: number) => {
    return `${currency}${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const netWorth = dashboardSummary?.totalNetWorth ?? 0;
  const liquidCash = dashboardSummary?.liquidCash ?? 0;
  const creditDebt = dashboardSummary?.creditDebt ?? 0;
  const monthlyIncome = dashboardSummary?.monthlyIncome ?? 0;
  const monthlyExpenses = dashboardSummary?.monthlyExpenses ?? 0;
  const netCashFlow = dashboardSummary?.netCashFlow ?? 0;
  const safeToSpend = dashboardSummary?.safeToSpend ?? 0;

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return <Landmark size={18} color="#3B82F6" />;
      case 'ewallet':
        return <Smartphone size={18} color="#06B6D4" />;
      case 'credit_card':
        return <CreditCard size={18} color="#8B5CF6" />;
      default:
        return <Banknote size={18} color="#10B981" />;
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: 40,
        paddingHorizontal: 16,
        gap: 20,
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="gap-0.5">
          <Text size="sm" muted weight="medium">
            Financial Ledger
          </Text>
          <Text size="2xl" weight="bold">
            Dashboard
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/modal-transaction')}
          className="flex-row items-center bg-primary px-3 py-2 rounded-xl gap-1.5 active:opacity-80"
        >
          <Plus size={16} color="#FFFFFF" />
          <Text size="sm" weight="semibold" className="text-white">
            Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* Net Worth Hero Card */}
      <Card className="p-5 gap-4 bg-card border border-border shadow-sm rounded-2xl">
        <View className="flex-row items-center justify-between">
          <Text size="sm" weight="medium" muted>
            TOTAL NET WORTH
          </Text>
          <Badge variant="outline" className="px-2.5 py-0.5">
            <Text size="xs" weight="semibold">
              {netCashFlow >= 0 ? '+Cashflow Positive' : '-Cashflow Deficit'}
            </Text>
          </Badge>
        </View>

        <Text size="3xl" weight="bold">
          {netWorth < 0 ? '-' : ''}
          {formatMoney(netWorth)}
        </Text>

        {/* Liquid vs Debt Breakdown */}
        <View className="flex-row items-center justify-between pt-2 border-t border-border">
          <View className="gap-0.5">
            <Text size="xs" muted>
              Liquid Cash
            </Text>
            <Text size="base" weight="semibold" className="text-emerald-500">
              {formatMoney(liquidCash)}
            </Text>
          </View>

          <View className="h-7 w-[1px] bg-border" />

          <View className="gap-0.5">
            <Text size="xs" muted>
              Credit Card Debt
            </Text>
            <Text size="base" weight="semibold" className="text-rose-500">
              {formatMoney(creditDebt)}
            </Text>
          </View>

          <View className="h-7 w-[1px] bg-border" />

          <View className="gap-0.5">
            <Text size="xs" muted>
              Net Monthly
            </Text>
            <Text
              size="base"
              weight="semibold"
              className={netCashFlow >= 0 ? 'text-emerald-500' : 'text-rose-500'}
            >
              {netCashFlow >= 0 ? '+' : '-'}
              {formatMoney(netCashFlow)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Safe-to-Spend Runway Banner */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push('/(tabs)/calculators')}
        className="p-4 rounded-2xl bg-primary/10 border border-primary/20 gap-2"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Sparkles size={18} color="#4F46E5" />
            <Text size="sm" weight="bold" className="text-primary">
              Safe-to-Spend Runway
            </Text>
          </View>
          <ChevronRight size={16} color="#4F46E5" />
        </View>
        <Text size="2xl" weight="bold">
          {formatMoney(safeToSpend)}
        </Text>
        <Text size="xs" muted>
          Available cash after reserving for upcoming recurring bills, loan amortizations, and savings goals.
        </Text>
      </TouchableOpacity>

      {/* Quick Action Buttons */}
      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/modal-transaction', params: { type: 'income' } })}
          className="flex-1 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl items-center gap-1 active:opacity-75"
        >
          <TrendingUp size={20} color="#10B981" />
          <Text size="xs" weight="semibold" className="text-emerald-600">
            Income
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push({ pathname: '/modal-transaction', params: { type: 'expense' } })}
          className="flex-1 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl items-center gap-1 active:opacity-75"
        >
          <TrendingDown size={20} color="#EF4444" />
          <Text size="xs" weight="semibold" className="text-rose-600">
            Expense
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push({ pathname: '/modal-transaction', params: { type: 'transfer' } })}
          className="flex-1 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl items-center gap-1 active:opacity-75"
        >
          <ArrowRightLeft size={20} color="#3B82F6" />
          <Text size="xs" weight="semibold" className="text-blue-600">
            Transfer
          </Text>
        </TouchableOpacity>
      </View>

      {/* Monthly Cash Flow In / Out */}
      <View className="gap-2">
        <Text size="sm" weight="semibold" muted className="uppercase tracking-wider">
          This Month's Movement
        </Text>
        <View className="flex-row gap-3">
          <Card className="flex-1 p-3.5 bg-card border border-border rounded-xl gap-1">
            <View className="flex-row items-center gap-1.5">
              <TrendingUp size={16} color="#10B981" />
              <Text size="xs" muted>
                Inflow (Net)
              </Text>
            </View>
            <Text size="lg" weight="bold" className="text-emerald-500">
              +{formatMoney(monthlyIncome)}
            </Text>
            {dashboardSummary?.monthlyDeductions ? (
              <Text size="xs" muted>
                Tax/Deductions: {formatMoney(dashboardSummary.monthlyDeductions)}
              </Text>
            ) : null}
          </Card>

          <Card className="flex-1 p-3.5 bg-card border border-border rounded-xl gap-1">
            <View className="flex-row items-center gap-1.5">
              <TrendingDown size={16} color="#EF4444" />
              <Text size="xs" muted>
                Outflow
              </Text>
            </View>
            <Text size="lg" weight="bold" className="text-rose-500">
              -{formatMoney(monthlyExpenses)}
            </Text>
            <Text size="xs" muted>
              Needs: {formatMoney(dashboardSummary?.monthlyNeeds ?? 0)}
            </Text>
          </Card>
        </View>
      </View>

      {/* Accounts Glance */}
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text size="sm" weight="semibold" muted className="uppercase tracking-wider">
            Your Accounts ({accounts.length})
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/accounts')}>
            <Text size="xs" weight="semibold" className="text-primary">
              View All
            </Text>
          </TouchableOpacity>
        </View>

        <View className="gap-2">
          {accounts.map(acc => (
            <TouchableOpacity
              key={acc.id}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/accounts')}
              className="p-3.5 bg-card border border-border rounded-xl flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3">
                <View className="p-2 rounded-lg bg-primary/10">
                  {getAccountIcon(acc.type)}
                </View>
                <View>
                  <Text size="sm" weight="semibold">
                    {acc.name}
                  </Text>
                  <Text size="xs" muted className="capitalize">
                    {acc.type.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <View className="items-end">
                <Text
                  size="sm"
                  weight="bold"
                  className={
                    acc.type === 'credit_card'
                      ? acc.current_balance > 0
                        ? 'text-rose-500'
                        : 'text-foreground'
                      : 'text-foreground'
                  }
                >
                  {acc.type === 'credit_card' && acc.current_balance > 0 ? '-' : ''}
                  {formatMoney(acc.current_balance)}
                </Text>
                {acc.type === 'credit_card' && acc.credit_limit ? (
                  <Text size="xs" muted>
                    Limit: {formatMoney(acc.credit_limit)}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Ledger Transactions */}
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text size="sm" weight="semibold" muted className="uppercase tracking-wider">
            Recent Ledger Entries
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/ledger')}>
            <Text size="xs" weight="semibold" className="text-primary">
              Full Ledger
            </Text>
          </TouchableOpacity>
        </View>

        {recentTransactions.length === 0 ? (
          <Card className="p-6 bg-card border border-border rounded-xl items-center gap-2">
            <Text size="sm" muted>
              No transactions recorded yet.
            </Text>
            <Button
              size="sm"
              variant="outline"
              onPress={() => router.push('/modal-transaction')}
            >
              Record First Movement
            </Button>
          </Card>
        ) : (
          <View className="gap-2">
            {recentTransactions.slice(0, 6).map(tx => {
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';
              return (
                <TouchableOpacity
                  key={tx.id}
                  activeOpacity={0.7}
                  onPress={() => router.push('/(tabs)/ledger')}
                  className="p-3 bg-card border border-border rounded-xl flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    <View
                      className={`p-2 rounded-lg ${
                        isIncome
                          ? 'bg-emerald-500/10'
                          : isTransfer
                          ? 'bg-blue-500/10'
                          : 'bg-rose-500/10'
                      }`}
                    >
                      {isIncome ? (
                        <TrendingUp size={16} color="#10B981" />
                      ) : isTransfer ? (
                        <ArrowRightLeft size={16} color="#3B82F6" />
                      ) : (
                        <TrendingDown size={16} color="#EF4444" />
                      )}
                    </View>

                    <View className="flex-1">
                      <Text size="sm" weight="semibold" numberOfLines={1}>
                        {tx.notes || tx.category_name || (isTransfer ? 'Account Transfer' : 'Expense')}
                      </Text>
                      <Text size="xs" muted numberOfLines={1}>
                        {tx.date} • {isTransfer ? `${tx.account_name} ➔ ${tx.to_account_name}` : tx.account_name}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text
                      size="sm"
                      weight="bold"
                      className={
                        isIncome
                          ? 'text-emerald-500'
                          : isTransfer
                          ? 'text-blue-500'
                          : 'text-rose-500'
                      }
                    >
                      {isIncome ? '+' : isTransfer ? '' : '-'}
                      {formatMoney(tx.amount)}
                    </Text>
                    {tx.expense_nature && !isTransfer && !isIncome ? (
                      <Badge variant="outline" className="px-1.5 py-0">
                        <Text size="xs" className="capitalize text-[10px]">
                          {tx.expense_nature}
                        </Text>
                      </Badge>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
