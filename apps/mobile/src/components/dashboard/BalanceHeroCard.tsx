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

export function BalanceHeroCard({ totalBalance, totalIncome, totalExpense, currency = '₱', onPress }: BalanceHeroCardProps) {
    const expenseFormatted = totalExpense > 0 ? `-${formatCurrency(totalExpense, currency)}` : formatCurrency(0, currency);

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Total net worth: ${formatCurrency(totalBalance, currency)}`}
            className="p-5 mx-5 my-2 bg-primary rounded-2xl border border-secondary/15 active:opacity-90"
        >
            {/* Card Header */}
            <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                    <View className="items-center justify-center w-7 h-7 rounded-full bg-secondary/15">
                        <Wallet size={15} color="#18342B" />
                    </View>
                    <Text className="text-xs font-semibold text-secondary/90">Total Net Worth</Text>
                </View>
                <Text className="text-xs font-medium text-secondary/70">This Month</Text>
            </View>

            {/* Hero Balance */}
            <View className="mb-5">
                <Text className="text-4xl font-bold tracking-tight text-secondary">{formatCurrency(totalBalance, currency)}</Text>
            </View>

            {/* Cashflow Breakdown Cards with WCAG AAA Contrast */}
            <View className="flex-row items-center gap-2.5">
                {/* Income Pill */}
                <View className="flex-1 flex-row items-center p-2.5 rounded-xl bg-white/40">
                    <View className="items-center justify-center w-6 h-6 mr-2 rounded-full bg-secondary/15">
                        <ArrowUpRight size={14} color="#18342B" />
                    </View>
                    <View>
                        <Text className="text-[11px] font-medium text-secondary/75">Income</Text>
                        <Text className="text-xs font-bold text-secondary">+{formatCurrency(totalIncome, currency)}</Text>
                    </View>
                </View>

                {/* Expense Pill */}
                <View className="flex-1 flex-row items-center p-2.5 rounded-xl bg-white/40">
                    <View className="items-center justify-center w-6 h-6 mr-2 rounded-full bg-[#C2410C]/20">
                        <ArrowDownRight size={14} color="#C2410C" />
                    </View>
                    <View>
                        <Text className="text-[11px] font-medium text-secondary/75">Expenses</Text>
                        <Text className="text-xs font-bold text-secondary">{expenseFormatted}</Text>
                    </View>
                </View>
            </View>
        </Pressable>
    );
}
