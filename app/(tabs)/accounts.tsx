import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Text,
  Card,
  Button,
  Badge,
  Progress,
} from 'panelui-native';
import {
  Wallet,
  Landmark,
  Smartphone,
  CreditCard,
  Banknote,
  Plus,
  ArrowRightLeft,
  Calendar,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react-native';
import { useFinance } from '../../src/context/FinanceContext';
import { Account } from '../../src/types/database';

export default function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const { currency, accounts, dashboardSummary, refreshAll } = useFinance();
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

  const liquidCash = dashboardSummary?.liquidCash ?? 0;
  const creditDebt = dashboardSummary?.creditDebt ?? 0;

  const cashAccounts = accounts.filter(a => a.type === 'cash');
  const bankAccounts = accounts.filter(a => a.type === 'bank');
  const ewalletAccounts = accounts.filter(a => a.type === 'ewallet');
  const creditCards = accounts.filter(a => a.type === 'credit_card');

  const renderAccountCard = (acc: Account) => {
    const isCard = acc.type === 'credit_card';
    const limit = acc.credit_limit || 0;
    const balance = acc.current_balance;
    const utilization = limit > 0 ? Math.round((balance / limit) * 100) : 0;
    const isOver30 = utilization >= 30;

    return (
      <Card key={acc.id} className="p-4 bg-card border border-border rounded-xl gap-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <View className="p-2 rounded-lg bg-primary/10">
              {acc.type === 'bank' ? (
                <Landmark size={18} color="#3B82F6" />
              ) : acc.type === 'ewallet' ? (
                <Smartphone size={18} color="#06B6D4" />
              ) : acc.type === 'credit_card' ? (
                <CreditCard size={18} color="#8B5CF6" />
              ) : (
                <Banknote size={18} color="#10B981" />
              )}
            </View>
            <View>
              <Text size="base" weight="semibold">
                {acc.name}
              </Text>
              <Text size="xs" muted className="capitalize">
                {acc.type.replace('_', ' ')}
              </Text>
            </View>
          </View>

          <View className="items-end">
            <Text
              size="lg"
              weight="bold"
              className={isCard && balance > 0 ? 'text-rose-500' : 'text-foreground'}
            >
              {isCard && balance > 0 ? '-' : ''}
              {formatMoney(balance)}
            </Text>
            <Text size="xs" muted>
              {isCard ? 'Current Outstanding Debt' : 'Available Balance'}
            </Text>
          </View>
        </View>

        {isCard ? (
          <View className="gap-1.5 pt-2 border-t border-border">
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-1">
                <Text size="xs" muted>
                  Credit Utilization:
                </Text>
                <Text
                  size="xs"
                  weight="bold"
                  className={isOver30 ? 'text-rose-500' : 'text-emerald-500'}
                >
                  {utilization}%
                </Text>
                {isOver30 ? (
                  <Badge variant="outline" className="px-1 py-0 border-rose-500">
                    <Text size="xs" className="text-rose-500 text-[9px]">
                      &gt;30% Alert
                    </Text>
                  </Badge>
                ) : null}
              </View>
              <Text size="xs" muted>
                Limit: {formatMoney(limit)}
              </Text>
            </View>

            {/* Utilization progress */}
            <Progress value={Math.min(100, utilization)} className="h-1.5" />

            <View className="flex-row justify-between items-center pt-1">
              <View className="flex-row items-center gap-1">
                <Calendar size={12} color="#9CA3AF" />
                <Text size="xs" muted>
                  Statement: Day {acc.statement_day || '--'} • Due: Day {acc.due_day || '--'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/modal-transaction',
                    params: { type: 'transfer', to_account_id: acc.id },
                  })
                }
              >
                <Text size="xs" weight="semibold" className="text-primary">
                  Pay Card ➔
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </Card>
    );
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
            Cash, Banks, eWallets & Cards
          </Text>
          <Text size="2xl" weight="bold">
            Accounts Ledger
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/modal-account')}
          className="flex-row items-center bg-primary px-3 py-2 rounded-xl gap-1.5 active:opacity-80"
        >
          <Plus size={16} color="#FFFFFF" />
          <Text size="sm" weight="semibold" className="text-white">
            New Account
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary KPI Cards */}
      <View className="flex-row gap-3">
        <Card className="flex-1 p-4 bg-card border border-border rounded-xl gap-1">
          <View className="flex-row items-center gap-1.5">
            <Wallet size={16} color="#10B981" />
            <Text size="xs" muted>
              Total Liquid Cash
            </Text>
          </View>
          <Text size="xl" weight="bold" className="text-emerald-500">
            {formatMoney(liquidCash)}
          </Text>
        </Card>

        <Card className="flex-1 p-4 bg-card border border-border rounded-xl gap-1">
          <View className="flex-row items-center gap-1.5">
            <CreditCard size={16} color="#EF4444" />
            <Text size="xs" muted>
              Credit Card Debt
            </Text>
          </View>
          <Text size="xl" weight="bold" className="text-rose-500">
            {formatMoney(creditDebt)}
          </Text>
        </Card>
      </View>

      {/* Quick Transfer Button */}
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/modal-transaction', params: { type: 'transfer' } })}
        className="flex-row items-center justify-between p-3.5 bg-card border border-border rounded-xl active:opacity-80"
      >
        <View className="flex-row items-center gap-2.5">
          <View className="p-2 rounded-lg bg-blue-500/10">
            <ArrowRightLeft size={18} color="#3B82F6" />
          </View>
          <View>
            <Text size="sm" weight="semibold">
              Transfer Between Accounts
            </Text>
            <Text size="xs" muted>
              Move money without affecting income or expenses
            </Text>
          </View>
        </View>
        <ChevronRight size={16} color="#9CA3AF" />
      </TouchableOpacity>

      {/* Bank Accounts */}
      {bankAccounts.length > 0 ? (
        <View className="gap-2">
          <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
            Bank Accounts ({bankAccounts.length})
          </Text>
          {bankAccounts.map(renderAccountCard)}
        </View>
      ) : null}

      {/* eWallets */}
      {ewalletAccounts.length > 0 ? (
        <View className="gap-2">
          <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
            eWallets & Mobile Money ({ewalletAccounts.length})
          </Text>
          {ewalletAccounts.map(renderAccountCard)}
        </View>
      ) : null}

      {/* Cash */}
      {cashAccounts.length > 0 ? (
        <View className="gap-2">
          <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
            Physical Cash ({cashAccounts.length})
          </Text>
          {cashAccounts.map(renderAccountCard)}
        </View>
      ) : null}

      {/* Credit Cards */}
      {creditCards.length > 0 ? (
        <View className="gap-2">
          <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
            Credit Cards ({creditCards.length})
          </Text>
          {creditCards.map(renderAccountCard)}
        </View>
      ) : null}
    </ScrollView>
  );
}

