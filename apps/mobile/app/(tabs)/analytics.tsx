import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  WalletCards,
  Building2,
  Smartphone,
  Banknote,
  ShieldAlert,
} from 'lucide-react-native';
import { getDatabase } from '../../src/database/db';
import {
  getAnalyticsSummary,
  type AnalyticsSummary,
} from '../../src/services/analyticsService';
import { formatCurrency } from '../../src/utils/formatters';

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#EF4444',
  Shopping: '#F59E0B',
  Bills: '#3B82F6',
  Transportation: '#8B5CF6',
  Entertainment: '#EC4899',
  Health: '#10B981',
  'Loan Payment': '#18342B',
  General: '#6B7280',
};

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AnalyticsSummary>({
    monthlyFlow: { totalIncome: 0, totalExpense: 0, netSavings: 0 },
    categoryBreakdown: [],
    assetDistribution: {
      total: 0,
      bankTotal: 0,
      bankPercentage: 0,
      ewalletTotal: 0,
      ewalletPercentage: 0,
      cashTotal: 0,
      cashPercentage: 0,
    },
    totalLoansDebt: 0,
  });

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const summary = await getAnalyticsSummary(db);
      setData(summary);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const { monthlyFlow, categoryBreakdown, assetDistribution, totalLoansDebt } = data;

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: Math.max(insets.top, 12) }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#BBD583"
            colors={['#18342B', '#BBD583']}
          />
        }>
        {/* Header */}
        <View className="px-5 pt-3 pb-4">
          <Text className="text-2xl font-bold text-stone-900">Analytics & Insights</Text>
          <Text className="text-xs text-stone-400 mt-0.5">
            Spending breakdowns and cash flow overview
          </Text>
        </View>

        {/* 1. Cash Flow Summary Card */}
        <View className="mx-5 mb-4 p-5 bg-[#18342B] rounded-3xl shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-xs font-semibold text-[#BBD583]">Net Savings This Period</Text>
              <Text className="text-2xl font-bold text-white mt-1">
                {monthlyFlow.netSavings >= 0 ? '+' : ''}
                {formatCurrency(monthlyFlow.netSavings, '₱')}
              </Text>
            </View>
            <View className="w-10 h-10 rounded-2xl bg-white/10 items-center justify-center">
              <PieChart size={20} color="#BBD583" />
            </View>
          </View>

          <View className="flex-row items-center justify-between pt-3 border-t border-white/10">
            <View className="flex-row items-center">
              <View className="w-7 h-7 rounded-xl bg-emerald-500/20 items-center justify-center mr-2">
                <TrendingUp size={14} color="#34D399" />
              </View>
              <View>
                <Text className="text-[10px] text-stone-300">Total Inflow</Text>
                <Text className="text-xs font-bold text-emerald-400">
                  +{formatCurrency(monthlyFlow.totalIncome, '₱')}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-7 h-7 rounded-xl bg-rose-500/20 items-center justify-center mr-2">
                <TrendingDown size={14} color="#F87171" />
              </View>
              <View>
                <Text className="text-[10px] text-stone-300">Total Outflow</Text>
                <Text className="text-xs font-bold text-rose-400">
                  -{formatCurrency(monthlyFlow.totalExpense, '₱')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2. Category Spending Breakdown */}
        <View className="mx-5 mb-4 p-5 bg-white rounded-3xl border border-stone-200/80 shadow-xs">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-base font-bold text-stone-900">Spending by Category</Text>
              <Text className="text-xs text-stone-400 mt-0.5">Where your expenses go</Text>
            </View>
            <Text className="text-xs font-bold text-stone-600">
              Total: {formatCurrency(monthlyFlow.totalExpense, '₱')}
            </Text>
          </View>

          {categoryBreakdown.length === 0 ? (
            <View className="py-6 items-center justify-center">
              <Text className="text-xs text-stone-400">No recorded expenses yet.</Text>
            </View>
          ) : (
            <View className="space-y-3.5">
              {categoryBreakdown.map((item, index) => {
                const color = CATEGORY_COLORS[item.category] || '#6B7280';
                return (
                  <View key={index} className="mb-2.5">
                    <View className="flex-row items-center justify-between mb-1">
                      <View className="flex-row items-center">
                        <View
                          className="w-2.5 h-2.5 rounded-full mr-2"
                          style={{ backgroundColor: color }}
                        />
                        <Text className="text-xs font-semibold text-stone-800">
                          {item.category}
                        </Text>
                      </View>
                      <View className="flex-row items-center space-x-1.5">
                        <Text className="text-xs font-bold text-stone-900 mr-1.5">
                          {formatCurrency(item.total, '₱')}
                        </Text>
                        <Text className="text-[11px] font-semibold text-stone-400">
                          {item.percentage}%
                        </Text>
                      </View>
                    </View>
                    {/* Progress Bar */}
                    <View className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(item.percentage, 100)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 3. Asset Distribution */}
        <View className="mx-5 mb-4 p-5 bg-white rounded-3xl border border-stone-200/80 shadow-xs">
          <Text className="text-base font-bold text-stone-900 mb-1">Asset Allocation</Text>
          <Text className="text-xs text-stone-400 mb-4">Distribution of your liquid funds</Text>

          <View className="space-y-3">
            {/* Banks */}
            <View className="flex-row items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100 mb-2">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-xl bg-blue-100 items-center justify-center mr-3">
                  <Building2 size={16} color="#1D4ED8" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-stone-800">Traditional & Digital Banks</Text>
                  <Text className="text-[10px] text-stone-400">{assetDistribution.bankPercentage}% of total</Text>
                </View>
              </View>
              <Text className="text-xs font-bold text-stone-900">
                {formatCurrency(assetDistribution.bankTotal, '₱')}
              </Text>
            </View>

            {/* E-Wallets */}
            <View className="flex-row items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100 mb-2">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-xl bg-emerald-100 items-center justify-center mr-3">
                  <Smartphone size={16} color="#059669" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-stone-800">E-Wallets</Text>
                  <Text className="text-[10px] text-stone-400">{assetDistribution.ewalletPercentage}% of total</Text>
                </View>
              </View>
              <Text className="text-xs font-bold text-stone-900">
                {formatCurrency(assetDistribution.ewalletTotal, '₱')}
              </Text>
            </View>

            {/* Cash */}
            <View className="flex-row items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-xl bg-amber-100 items-center justify-center mr-3">
                  <Banknote size={16} color="#D97706" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-stone-800">Physical Cash</Text>
                  <Text className="text-[10px] text-stone-400">{assetDistribution.cashPercentage}% of total</Text>
                </View>
              </View>
              <Text className="text-xs font-bold text-stone-900">
                {formatCurrency(assetDistribution.cashTotal, '₱')}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. Active Loan Obligations Indicator */}
        {totalLoansDebt > 0 && (
          <View className="mx-5 p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex-row items-center space-x-3">
            <View className="w-8 h-8 rounded-xl bg-rose-100 items-center justify-center mr-2.5">
              <ShieldAlert size={16} color="#E11D48" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-rose-950">Active Debt Burden</Text>
              <Text className="text-[11px] text-rose-800/80 mt-0.5">
                You have {formatCurrency(totalLoansDebt, '₱')} in total outstanding loan obligations.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
