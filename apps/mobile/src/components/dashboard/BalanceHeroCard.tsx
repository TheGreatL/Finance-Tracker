import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { formatCurrency } from '../../utils/formatters';

export interface BalanceHeroCardProps {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  currency?: string;
  onPress?: () => void;
}

export function BalanceHeroCard({
  totalBalance,
  totalIncome,
  totalExpense,
  currency = '₱',
  onPress,
}: BalanceHeroCardProps) {
  const expenseFormatted =
    totalExpense > 0
      ? `-${formatCurrency(totalExpense, currency)}`
      : formatCurrency(0, currency);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Total net worth: ${formatCurrency(totalBalance, currency)}`}
      className="p-6 mx-5 my-2 border bg-primary rounded-3xl border-secondary/10 active:opacity-90"
      style={{
        shadowColor: '#18342B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {/* Card Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View className="items-center justify-center w-7 h-7 rounded-full bg-secondary/15">
            <Wallet size={15} color="#18342B" />
          </View>
          <Text className="text-xs font-semibold tracking-wider uppercase text-secondary/80">
            Total Net Worth
          </Text>
        </View>
        <Text className="text-xs font-medium text-secondary/70">
          This Month
        </Text>
      </View>

      {/* Hero Balance */}
      <View className="mb-6">
        <Text className="text-4xl font-extrabold tracking-tight text-secondary">
          {formatCurrency(totalBalance, currency)}
        </Text>
      </View>

      {/* Cashflow Breakdown Pills with WCAG AAA Contrast */}
      <View className="flex-row items-center gap-3">
        {/* Income Pill */}
        <View className="flex-1 flex-row items-center p-3 rounded-2xl bg-white/40">
          <View className="items-center justify-center w-6 h-6 mr-2 rounded-full bg-secondary/15">
            <ArrowUpRight size={14} color="#18342B" />
          </View>
          <View>
            <Text className="text-[10px] font-medium uppercase text-secondary/70">
              Income
            </Text>
            <Text className="text-xs font-bold text-secondary">
              +{formatCurrency(totalIncome, currency)}
            </Text>
          </View>
        </View>

        {/* Expense Pill - Neutral high-contrast bg-white/40 with dark pine text and terracotta indicator */}
        <View className="flex-1 flex-row items-center p-3 rounded-2xl bg-white/40">
          <View className="items-center justify-center w-6 h-6 mr-2 rounded-full bg-[#C2410C]/20">
            <ArrowDownRight size={14} color="#C2410C" />
          </View>
          <View>
            <Text className="text-[10px] font-medium uppercase text-secondary/70">
              Expenses
            </Text>
            <Text className="text-xs font-bold text-secondary">
              {expenseFormatted}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
