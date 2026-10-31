import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import {
    TrendingUp,
    TrendingDown,
    PieChart,
    Building2,
    Smartphone,
    Banknote,
    Repeat,
    CreditCard,
    Calendar,
    Layers,
    ArrowRight,
    ShieldCheck,
    Briefcase,
    Menu
} from 'lucide-react-native';
import { useSidebar } from '../../src/context/SidebarContext';
import { getDatabase } from '../../src/database/db';
import { getAnalyticsSummary, type AnalyticsSummary } from '../../src/services/analyticsService';
import { getIncomeSummary, type IncomeSummary } from '../../src/services/salaryService';
import { formatCurrency, formatDisplayDate } from '../../src/utils/formatters';
import { SubscriptionLogo } from '../../src/components/subscriptions/SubscriptionLogo';
import { IncomeVisualBreakdownChart } from '../../src/components/salary/IncomeVisualBreakdownChart';

const CATEGORY_COLORS: Record<string, string> = {
    Food: '#EF4444',
    'Food & Dining': '#EF4444',
    Groceries: '#F97316',
    Shopping: '#F59E0B',
    Bills: '#3B82F6',
    'Bills & Utilities': '#3B82F6',
    Transportation: '#8B5CF6',
    Entertainment: '#EC4899',
    Health: '#10B981',
    Healthcare: '#10B981',
    'Housing & Rent': '#6366F1',
    Subscriptions: '#059669',
    'Loan Payment': '#18342B',
    General: '#6B7280'
};

export default function AnalyticsScreen() {
    const insets = useSafeAreaInsets();
    const { openSidebar } = useSidebar();
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
            cashPercentage: 0
        },
        subscriptionsAnalytics: {
            monthlyTotal: 0,
            yearlyProjected: 0,
            activeCount: 0,
            pausedCount: 0,
            subscriptions: []
        },
        loansAnalytics: {
            totalOutstandingDebt: 0,
            totalOriginalAmount: 0,
            totalRepaidSoFar: 0,
            repaymentPercentage: 0,
            monthlyPaymentTotal: 0,
            activeCount: 0,
            nextDueLoan: null,
            loans: []
        },
        fixedCommitments: {
            monthlyTotal: 0,
            monthlySubscriptions: 0,
            monthlyLoanPayments: 0
        },
        totalLoansDebt: 0
    });
    const [incomeSummary, setIncomeSummary] = useState<IncomeSummary>({
        activeJobsCount: 0,
        archivedJobsCount: 0,
        monthlyGross: 0,
        monthlyDeductions: 0,
        monthlyNetTakeHome: 0,
        deductionBreakdown: { tax: 0, statutory: 0, workplace: 0, other: 0, total: 0 }
    });

    const loadData = useCallback(async () => {
        try {
            const db = await getDatabase();
            const [summary, incSum] = await Promise.all([getAnalyticsSummary(db), getIncomeSummary(db)]);
            setData(summary);
            setIncomeSummary(incSum);
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

    const { monthlyFlow, categoryBreakdown, assetDistribution, subscriptionsAnalytics, loansAnalytics, fixedCommitments } = data;

    return (
        <View className="flex-1 bg-stone-50" style={{ paddingTop: Math.max(insets.top, 12) }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#BBD583" colors={['#18342B', '#BBD583']} />}
            >
                {/* Header */}
                <View className="px-5 pt-3 pb-4 flex-row items-center">
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Open sidebar navigation"
                        onPress={openSidebar}
                        hitSlop={8}
                        className="items-center justify-center w-10 h-10 rounded-full bg-stone-200/70 active:opacity-70 mr-3"
                    >
                        <Menu size={20} color="#18342B" strokeWidth={2.2} />
                    </Pressable>
                    <View className="flex-1">
                        <Text className="text-2xl font-bold text-stone-900" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                            Analytics & Insights
                        </Text>
                        <Text className="text-xs text-stone-400 mt-0.5" numberOfLines={2}>
                            Cash flow, subscriptions, loans, and spending breakdown
                        </Text>
                    </View>
                </View>

                {/* 1. Cash Flow Summary Card */}
                <View className="mx-4 sm:mx-5 mb-4 p-4 sm:p-5 bg-[#18342B] rounded-3xl shadow-sm">
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-1 min-w-0 mr-3">
                            <Text className="text-xs font-semibold text-[#BBD583]">Net Savings This Period</Text>
                            <Text className="text-2xl font-bold text-white mt-1" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                                {monthlyFlow.netSavings >= 0 ? '+' : ''}
                                {formatCurrency(monthlyFlow.netSavings, '₱')}
                            </Text>
                        </View>
                        <View className="w-10 h-10 rounded-2xl bg-white/10 items-center justify-center flex-shrink-0">
                            <PieChart size={20} color="#BBD583" />
                        </View>
                    </View>

                    <View className="flex-row items-center justify-between pt-3 border-t border-white/10 gap-2">
                        <View className="flex-1 flex-row items-center min-w-0 mr-1">
                            <View className="w-7 h-7 rounded-xl bg-emerald-500/20 items-center justify-center mr-2 flex-shrink-0">
                                <TrendingUp size={14} color="#34D399" />
                            </View>
                            <View className="flex-1 min-w-0">
                                <Text className="text-[10px] text-stone-300" numberOfLines={1}>
                                    Total Inflow
                                </Text>
                                <Text className="text-xs font-bold text-emerald-400" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                                    +{formatCurrency(monthlyFlow.totalIncome, '₱')}
                                </Text>
                            </View>
                        </View>

                        <View className="flex-1 flex-row items-center min-w-0">
                            <View className="w-7 h-7 rounded-xl bg-rose-500/20 items-center justify-center mr-2 flex-shrink-0">
                                <TrendingDown size={14} color="#F87171" />
                            </View>
                            <View className="flex-1 min-w-0">
                                <Text className="text-[10px] text-stone-300" numberOfLines={1}>
                                    Total Outflow
                                </Text>
                                <Text className="text-xs font-bold text-rose-400" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                                    -{formatCurrency(monthlyFlow.totalExpense, '₱')}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 1.5. Career Salary & Itemized Payroll Deductions (True Outflow Accuracy) */}
                {incomeSummary.activeJobsCount > 0 && (
                    <View className="mx-4 sm:mx-5 mb-4 p-4 sm:p-5 bg-white rounded-3xl border border-stone-200/90 shadow-xs">
                        <View className="flex-row items-center justify-between mb-3 gap-2">
                            <View className="flex-row items-center flex-1 min-w-0 mr-1.5">
                                <View className="w-8 h-8 rounded-xl bg-emerald-100/80 items-center justify-center mr-2.5 flex-shrink-0">
                                    <Briefcase size={16} color="#065F46" />
                                </View>
                                <View className="flex-1 min-w-0">
                                    <Text className="text-base font-bold text-stone-900" numberOfLines={1} ellipsizeMode="tail">
                                        Gross Income & Deductions
                                    </Text>
                                    <Text className="text-xs text-stone-400" numberOfLines={1} ellipsizeMode="tail">
                                        True cost-of-living & tax withholding
                                    </Text>
                                </View>
                            </View>
                            <Pressable
                                onPress={() => router.push({ pathname: '/(tabs)/accounts', params: { tab: 'income' } })}
                                hitSlop={8}
                                className="flex-row items-center px-2 py-1 bg-stone-100 rounded-lg active:bg-stone-200 flex-shrink-0"
                            >
                                <Text className="text-[10px] font-bold text-stone-700 mr-0.5">Manage</Text>
                                <ArrowRight size={10} color="#57534E" />
                            </Pressable>
                        </View>

                        {/* Distribution Progress Bar */}
                        <IncomeVisualBreakdownChart
                            monthlyGross={incomeSummary.monthlyGross}
                            monthlyNetTakeHome={incomeSummary.monthlyNetTakeHome}
                            deductionBreakdown={incomeSummary.deductionBreakdown}
                        />

                        {/* Deductions Outflow Summary Box */}
                        <View className="mt-1 rounded-2xl bg-stone-50 p-3.5 border border-stone-100">
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-xs font-bold text-stone-700">Combined Gross Earnings</Text>
                                <Text className="text-xs font-black text-stone-900">{formatCurrency(incomeSummary.monthlyGross, '₱')}/mo</Text>
                            </View>
                            <View className="flex-row justify-between items-center mb-1">
                                <Text className="text-xs text-rose-600 font-medium">Income Taxes (BIR)</Text>
                                <Text className="text-xs font-bold text-rose-600">
                                    -{formatCurrency(incomeSummary.deductionBreakdown.tax, '₱')}/mo
                                </Text>
                            </View>
                            <View className="flex-row justify-between items-center mb-1">
                                <Text className="text-xs text-amber-700 font-medium">Statutory (SSS/PhilHealth/HDMF)</Text>
                                <Text className="text-xs font-bold text-amber-700">
                                    -{formatCurrency(incomeSummary.deductionBreakdown.statutory, '₱')}/mo
                                </Text>
                            </View>
                            {(incomeSummary.deductionBreakdown.workplace > 0 || incomeSummary.deductionBreakdown.other > 0) && (
                                <View className="flex-row justify-between items-center mb-1">
                                    <Text className="text-xs text-indigo-700 font-medium">Workplace & Other</Text>
                                    <Text className="text-xs font-bold text-indigo-700">
                                        -{formatCurrency(incomeSummary.deductionBreakdown.workplace + incomeSummary.deductionBreakdown.other, '₱')}/mo
                                    </Text>
                                </View>
                            )}
                            <View className="h-px bg-stone-200 my-1.5" />
                            <View className="flex-row justify-between items-center pt-0.5">
                                <Text className="text-xs font-bold text-emerald-800">Actual Monthly Take-Home Deposited</Text>
                                <Text className="text-sm font-black text-emerald-700">
                                    {formatCurrency(incomeSummary.monthlyNetTakeHome, '₱')}/mo
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* 2. Fixed Monthly Commitments Banner (Subscriptions + Loans) */}
                {(fixedCommitments.monthlyTotal > 0 || loansAnalytics.activeCount > 0 || subscriptionsAnalytics.activeCount > 0) && (
                    <View className="mx-4 sm:mx-5 mb-4 p-4 sm:p-5 bg-white rounded-3xl border border-stone-200/90 shadow-xs">
                        <View className="flex-row items-center justify-between mb-3.5 gap-2">
                            <View className="flex-row items-center flex-1 min-w-0 mr-1.5">
                                <View className="w-8 h-8 rounded-xl bg-[#18342B]/10 items-center justify-center mr-2.5 flex-shrink-0">
                                    <Layers size={16} color="#18342B" />
                                </View>
                                <View className="flex-1 min-w-0">
                                    <Text className="text-sm font-bold text-stone-900" numberOfLines={1} ellipsizeMode="tail">
                                        Fixed Monthly Commitments
                                    </Text>
                                    <Text className="text-[10px] text-stone-400" numberOfLines={1} ellipsizeMode="tail">
                                        Recurring bills & mandatory debt
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-shrink-0 items-end">
                                <Text
                                    className="text-sm sm:text-base font-extrabold text-[#18342B]"
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.8}
                                >
                                    {formatCurrency(fixedCommitments.monthlyTotal, '₱')}/mo
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row gap-2 pt-2 border-t border-stone-100">
                            <View className="flex-1 min-w-0 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                                <Text className="text-[10px] text-stone-500" numberOfLines={1}>
                                    Subscriptions
                                </Text>
                                <Text
                                    className="text-xs font-bold text-stone-900 mt-0.5"
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.8}
                                >
                                    {formatCurrency(fixedCommitments.monthlySubscriptions, '₱')}/mo
                                </Text>
                                <Text className="text-[9px] text-stone-400" numberOfLines={1}>
                                    {subscriptionsAnalytics.activeCount} active service
                                    {subscriptionsAnalytics.activeCount === 1 ? '' : 's'}
                                </Text>
                            </View>

                            <View className="flex-1 min-w-0 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                                <Text className="text-[10px] text-stone-500" numberOfLines={1}>
                                    Loan Repayments
                                </Text>
                                <Text
                                    className="text-xs font-bold text-rose-700 mt-0.5"
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.8}
                                >
                                    {formatCurrency(fixedCommitments.monthlyLoanPayments, '₱')}/mo
                                </Text>
                                <Text className="text-[9px] text-stone-400" numberOfLines={1}>
                                    {loansAnalytics.activeCount} active loan{loansAnalytics.activeCount === 1 ? '' : 's'}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* 3. Recurring Subscriptions Analytics Card */}
                <View className="mx-4 sm:mx-5 mb-4 p-4 sm:p-5 bg-white rounded-3xl border border-stone-200/90 shadow-xs">
                    <View className="flex-row items-center justify-between mb-3 gap-2">
                        <View className="flex-row items-center flex-1 min-w-0 mr-1.5">
                            <View className="w-8 h-8 rounded-xl bg-emerald-100/80 items-center justify-center mr-2.5 flex-shrink-0">
                                <Repeat size={16} color="#065F46" />
                            </View>
                            <View className="flex-1 min-w-0">
                                <Text className="text-base font-bold text-stone-900" numberOfLines={1} ellipsizeMode="tail">
                                    Subscription Spend
                                </Text>
                                <Text className="text-xs text-stone-400" numberOfLines={1} ellipsizeMode="tail">
                                    Recurring services & auto-pay
                                </Text>
                            </View>
                        </View>
                        <Pressable
                            onPress={() => router.push({ pathname: '/(tabs)/accounts', params: { tab: 'subscriptions' } })}
                            hitSlop={8}
                            className="flex-row items-center px-2 py-1 bg-stone-100 rounded-lg active:bg-stone-200 flex-shrink-0"
                        >
                            <Text className="text-[10px] font-bold text-stone-700 mr-0.5">Manage</Text>
                            <ArrowRight size={10} color="#57534E" />
                        </Pressable>
                    </View>

                    {/* Metric Badges: Monthly & Annual Projection */}
                    <View className="flex-row gap-2 mb-4">
                        <View className="flex-1 min-w-0 bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/60">
                            <Text className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider" numberOfLines={1}>
                                Monthly Total
                            </Text>
                            <Text
                                className="text-base sm:text-lg font-extrabold text-[#18342B] mt-0.5"
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.75}
                            >
                                {formatCurrency(subscriptionsAnalytics.monthlyTotal, '₱')}
                            </Text>
                            <Text className="text-[10px] text-emerald-700 font-medium mt-0.5" numberOfLines={1}>
                                {subscriptionsAnalytics.activeCount} active subscriptions
                            </Text>
                        </View>

                        <View className="flex-1 min-w-0 bg-stone-50 p-3 rounded-2xl border border-stone-200/60">
                            <Text className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider" numberOfLines={1}>
                                Annual Cost
                            </Text>
                            <Text
                                className="text-base sm:text-lg font-extrabold text-stone-800 mt-0.5"
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.75}
                            >
                                {formatCurrency(subscriptionsAnalytics.yearlyProjected, '₱')}
                            </Text>
                            <Text className="text-[10px] text-stone-400 font-medium mt-0.5" numberOfLines={1}>
                                Projected 12-month spend
                            </Text>
                        </View>
                    </View>

                    {/* Subscriptions List Breakdown */}
                    {subscriptionsAnalytics.subscriptions.length === 0 ? (
                        <View className="py-5 items-center justify-center bg-stone-50 rounded-2xl border border-stone-100">
                            <Text className="text-xs text-stone-400">No active recurring subscriptions.</Text>
                        </View>
                    ) : (
                        <View className="space-y-2">
                            <Text className="text-xs font-bold text-stone-600 mb-1">Active Services Breakdown</Text>
                            {subscriptionsAnalytics.subscriptions.map((sub) => (
                                <View
                                    key={sub.id}
                                    className="flex-row items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100 mb-1.5 gap-2"
                                >
                                    <View className="flex-row items-center flex-1 min-w-0 mr-2">
                                        <SubscriptionLogo code={sub.serviceCode} serviceName={sub.serviceName} size={28} />
                                        <View className="ml-2.5 flex-1 min-w-0">
                                            <Text className="text-xs font-bold text-stone-900" numberOfLines={1} ellipsizeMode="tail">
                                                {sub.serviceName}
                                            </Text>
                                            <Text className="text-[10px] text-stone-400" numberOfLines={1} ellipsizeMode="tail">
                                                {sub.category} • Billed {sub.frequency}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="items-end flex-shrink-0 ml-1">
                                        <Text className="text-xs font-bold text-stone-900" numberOfLines={1}>
                                            {formatCurrency(sub.amount, '₱')}
                                        </Text>
                                        {sub.frequency !== 'monthly' && (
                                            <Text className="text-[9px] font-medium text-stone-500" numberOfLines={1}>
                                                ({formatCurrency(sub.normalizedMonthly, '₱')}/mo)
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* 4. Loans & Debt Obligations Analytics Card */}
                <View className="mx-4 sm:mx-5 mb-4 p-4 sm:p-5 bg-white rounded-3xl border border-stone-200/90 shadow-xs">
                    <View className="flex-row items-center justify-between mb-3 gap-2">
                        <View className="flex-row items-center flex-1 min-w-0 mr-1.5">
                            <View className="w-8 h-8 rounded-xl bg-rose-100 items-center justify-center mr-2.5 flex-shrink-0">
                                <CreditCard size={16} color="#E11D48" />
                            </View>
                            <View className="flex-1 min-w-0">
                                <Text className="text-base font-bold text-stone-900" numberOfLines={1} ellipsizeMode="tail">
                                    Loans & Debt Obligations
                                </Text>
                                <Text className="text-xs text-stone-400" numberOfLines={1} ellipsizeMode="tail">
                                    Total liability & payoff progress
                                </Text>
                            </View>
                        </View>
                        <Pressable
                            onPress={() => router.push({ pathname: '/(tabs)/accounts', params: { tab: 'loans' } })}
                            hitSlop={8}
                            className="flex-row items-center px-2 py-1 bg-stone-100 rounded-lg active:bg-stone-200 flex-shrink-0"
                        >
                            <Text className="text-[10px] font-bold text-stone-700 mr-0.5">Manage</Text>
                            <ArrowRight size={10} color="#57534E" />
                        </Pressable>
                    </View>

                    {loansAnalytics.activeCount === 0 ? (
                        <View className="py-6 items-center justify-center bg-stone-50 rounded-2xl border border-stone-100">
                            <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center mb-2">
                                <ShieldCheck size={20} color="#059669" />
                            </View>
                            <Text className="text-xs font-bold text-emerald-900">Debt-Free!</Text>
                            <Text className="text-[11px] text-stone-400 mt-0.5">You have no active loans or debts.</Text>
                        </View>
                    ) : (
                        <>
                            {/* Overall Debt Progress */}
                            <View className="bg-rose-50/60 p-3.5 sm:p-4 rounded-2xl border border-rose-200/70 mb-3.5">
                                <View className="flex-row items-center justify-between mb-2 gap-2">
                                    <View className="flex-1 min-w-0 mr-2">
                                        <Text className="text-[10px] font-bold text-rose-800 uppercase tracking-wider" numberOfLines={1}>
                                            Outstanding Debt
                                        </Text>
                                        <Text
                                            className="text-lg sm:text-xl font-extrabold text-rose-950 mt-0.5"
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.8}
                                        >
                                            {formatCurrency(loansAnalytics.totalOutstandingDebt, '₱')}
                                        </Text>
                                    </View>
                                    <View className="items-end flex-shrink-0">
                                        <Text className="text-[10px] font-medium text-stone-500" numberOfLines={1}>
                                            Monthly Due
                                        </Text>
                                        <Text
                                            className="text-xs sm:text-sm font-bold text-stone-900 mt-0.5"
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.8}
                                        >
                                            {formatCurrency(loansAnalytics.monthlyPaymentTotal, '₱')}
                                        </Text>
                                    </View>
                                </View>

                                {/* Overall Repayment Progress Bar */}
                                <View className="mt-2">
                                    <View className="flex-row justify-between items-center mb-1 gap-2">
                                        <Text className="text-[10px] font-semibold text-stone-600 flex-1 min-w-0 mr-1" numberOfLines={1}>
                                            Repaid {formatCurrency(loansAnalytics.totalRepaidSoFar, '₱')} of{' '}
                                            {formatCurrency(loansAnalytics.totalOriginalAmount, '₱')}
                                        </Text>
                                        <Text className="text-[10px] font-bold text-rose-700 flex-shrink-0">
                                            {loansAnalytics.repaymentPercentage}% Paid
                                        </Text>
                                    </View>
                                    <View className="h-2 w-full bg-rose-200/60 rounded-full overflow-hidden">
                                        <View
                                            className="h-full bg-emerald-600 rounded-full"
                                            style={{ width: `${loansAnalytics.repaymentPercentage}%` }}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Next Due Loan Alert */}
                            {loansAnalytics.nextDueLoan && (
                                <View className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 mb-3 flex-row items-center">
                                    <Calendar size={14} color="#D97706" className="flex-shrink-0" />
                                    <Text className="text-[11px] text-amber-900 font-medium ml-2 flex-1 min-w-0">
                                        Next installment: <Text className="font-bold">{loansAnalytics.nextDueLoan.title}</Text> (
                                        {formatCurrency(loansAnalytics.nextDueLoan.monthlyPayment, '₱')}) due on{' '}
                                        <Text className="font-bold">{formatDisplayDate(loansAnalytics.nextDueLoan.dueDate)}</Text>
                                    </Text>
                                </View>
                            )}

                            {/* Individual Loans Breakdown */}
                            <View className="space-y-2">
                                <Text className="text-xs font-bold text-stone-600 mb-1">Active Loans Breakdown</Text>
                                {loansAnalytics.loans.map((loan) => (
                                    <View key={loan.id} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100 mb-1.5">
                                        <View className="flex-row items-center justify-between mb-1.5 gap-2">
                                            <View className="flex-row items-center flex-1 min-w-0 mr-1.5">
                                                <View className="w-6 h-6 rounded-lg bg-stone-200 items-center justify-center mr-2 flex-shrink-0">
                                                    <CreditCard size={12} color="#18342B" />
                                                </View>
                                                <View className="flex-1 min-w-0">
                                                    <Text className="text-xs font-bold text-stone-900" numberOfLines={1} ellipsizeMode="tail">
                                                        {loan.title}
                                                    </Text>
                                                    <Text className="text-[10px] text-stone-400" numberOfLines={1} ellipsizeMode="tail">
                                                        {loan.institutionName} • Monthly: {formatCurrency(loan.monthlyPayment, '₱')}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View className="items-end flex-shrink-0 ml-1">
                                                <Text className="text-xs font-extrabold text-stone-900" numberOfLines={1}>
                                                    {formatCurrency(loan.remainingBalance, '₱')} left
                                                </Text>
                                                <Text className="text-[9px] text-stone-400" numberOfLines={1}>
                                                    of {formatCurrency(loan.totalAmount, '₱')}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Progress Bar per loan */}
                                        <View className="h-1.5 w-full bg-stone-200/80 rounded-full overflow-hidden mt-1">
                                            <View className="h-full bg-[#18342B] rounded-full" style={{ width: `${loan.progressPercentage}%` }} />
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}
                </View>

                {/* 5. Category Spending Breakdown */}
                <View className="mx-4 sm:mx-5 mb-4 p-4 sm:p-5 bg-white rounded-3xl border border-stone-200/80 shadow-xs">
                    <View className="flex-row items-center justify-between mb-4 gap-2">
                        <View className="flex-1 min-w-0 mr-2">
                            <Text className="text-base font-bold text-stone-900" numberOfLines={1}>
                                Spending by Category
                            </Text>
                            <Text className="text-xs text-stone-400 mt-0.5" numberOfLines={1}>
                                Where your expenses go
                            </Text>
                        </View>
                        <Text className="text-xs font-bold text-stone-600 flex-shrink-0" numberOfLines={1}>
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
                                        <View className="flex-row items-center justify-between mb-1 gap-2">
                                            <View className="flex-row items-center flex-1 min-w-0 mr-2">
                                                <View className="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: color }} />
                                                <Text
                                                    className="text-xs font-semibold text-stone-800 flex-1 min-w-0"
                                                    numberOfLines={1}
                                                    ellipsizeMode="tail"
                                                >
                                                    {item.category}
                                                </Text>
                                            </View>
                                            <View className="flex-row items-center space-x-1.5 flex-shrink-0">
                                                <Text className="text-xs font-bold text-stone-900 mr-1.5" numberOfLines={1}>
                                                    {formatCurrency(item.total, '₱')}
                                                </Text>
                                                <Text className="text-[11px] font-semibold text-stone-400" numberOfLines={1}>
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
                                                    backgroundColor: color
                                                }}
                                            />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* 6. Asset Distribution */}
                <View className="mx-4 sm:mx-5 mb-4 p-4 sm:p-5 bg-white rounded-3xl border border-stone-200/80 shadow-xs">
                    <Text className="text-base font-bold text-stone-900 mb-1" numberOfLines={1}>
                        Asset Allocation
                    </Text>
                    <Text className="text-xs text-stone-400 mb-4" numberOfLines={1}>
                        Distribution of your liquid funds
                    </Text>

                    <View className="space-y-3">
                        {/* Banks */}
                        <View className="flex-row items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100 mb-2 gap-2">
                            <View className="flex-row items-center flex-1 min-w-0 mr-2">
                                <View className="w-8 h-8 rounded-xl bg-blue-100 items-center justify-center mr-3 flex-shrink-0">
                                    <Building2 size={16} color="#1D4ED8" />
                                </View>
                                <View className="flex-1 min-w-0">
                                    <Text className="text-xs font-bold text-stone-800" numberOfLines={1} ellipsizeMode="tail">
                                        Traditional & Digital Banks
                                    </Text>
                                    <Text className="text-[10px] text-stone-400" numberOfLines={1}>
                                        {assetDistribution.bankPercentage}% of total
                                    </Text>
                                </View>
                            </View>
                            <Text className="text-xs font-bold text-stone-900 flex-shrink-0" numberOfLines={1}>
                                {formatCurrency(assetDistribution.bankTotal, '₱')}
                            </Text>
                        </View>

                        {/* E-Wallets */}
                        <View className="flex-row items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100 mb-2 gap-2">
                            <View className="flex-row items-center flex-1 min-w-0 mr-2">
                                <View className="w-8 h-8 rounded-xl bg-emerald-100 items-center justify-center mr-3 flex-shrink-0">
                                    <Smartphone size={16} color="#059669" />
                                </View>
                                <View className="flex-1 min-w-0">
                                    <Text className="text-xs font-bold text-stone-800" numberOfLines={1} ellipsizeMode="tail">
                                        E-Wallets
                                    </Text>
                                    <Text className="text-[10px] text-stone-400" numberOfLines={1}>
                                        {assetDistribution.ewalletPercentage}% of total
                                    </Text>
                                </View>
                            </View>
                            <Text className="text-xs font-bold text-stone-900 flex-shrink-0" numberOfLines={1}>
                                {formatCurrency(assetDistribution.ewalletTotal, '₱')}
                            </Text>
                        </View>

                        {/* Cash */}
                        <View className="flex-row items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100 gap-2">
                            <View className="flex-row items-center flex-1 min-w-0 mr-2">
                                <View className="w-8 h-8 rounded-xl bg-amber-100 items-center justify-center mr-3 flex-shrink-0">
                                    <Banknote size={16} color="#D97706" />
                                </View>
                                <View className="flex-1 min-w-0">
                                    <Text className="text-xs font-bold text-stone-800" numberOfLines={1} ellipsizeMode="tail">
                                        Physical Cash
                                    </Text>
                                    <Text className="text-[10px] text-stone-400" numberOfLines={1}>
                                        {assetDistribution.cashPercentage}% of total
                                    </Text>
                                </View>
                            </View>
                            <Text className="text-xs font-bold text-stone-900 flex-shrink-0" numberOfLines={1}>
                                {formatCurrency(assetDistribution.cashTotal, '₱')}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
