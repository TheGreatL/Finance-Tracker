import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Briefcase, CreditCard, Repeat, ChevronRight } from 'lucide-react-native';
import { formatCurrency } from '../../utils/formatters';
import type { LoanRecord } from '../../types/database';
import type { SubscriptionsSummary } from '../../services/subscriptionService';
import type { IncomeSummary } from '../../services/salaryService';

export interface FinancialPulseStripProps {
    incomeSummary: IncomeSummary;
    loansSummary: {
        totalLoanBalance: number;
        nextDueLoan: LoanRecord | null;
        activeCount?: number;
    };
    subsSummary: SubscriptionsSummary;
    onPaydayPress?: () => void;
    onLoansPress?: () => void;
    onSubsPress?: () => void;
}

function computeDaysRemaining(dueDateStr: string): number {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDateStr);
        due.setHours(0, 0, 0, 0);
        const diffMs = due.getTime() - today.getTime();
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } catch {
        return 0;
    }
}

export function FinancialPulseStrip({
    incomeSummary,
    loansSummary,
    subsSummary,
    onPaydayPress,
    onLoansPress,
    onSubsPress
}: FinancialPulseStripProps) {
    const nextPayday = incomeSummary.nextPayday;
    const hasLoans = loansSummary.totalLoanBalance > 0;
    const hasSubs = subsSummary.activeCount > 0;
    const hasPayday = !!nextPayday;

    // If user has zero configured obligations or jobs, show nothing to keep dashboard clean
    if (!hasLoans && !hasSubs && !hasPayday) {
        return null;
    }

    const paydayDueText = nextPayday
        ? nextPayday.daysRemaining === 0
            ? 'Today'
            : nextPayday.daysRemaining === 1
              ? 'Tomorrow'
              : `${nextPayday.daysRemaining}d left`
        : 'No salary';

    const loanDueDays = loansSummary.nextDueLoan ? computeDaysRemaining(loansSummary.nextDueLoan.due_date) : null;
    const loanDueText = hasLoans ? (loanDueDays !== null ? (loanDueDays <= 0 ? 'Due now' : `${loanDueDays}d left`) : 'Active') : 'Debt-free';

    const subsText = hasSubs ? `${subsSummary.activeCount} active` : 'No bills';

    return (
        <View className="mx-5 my-2">
            <View className="flex-row items-center justify-between bg-white rounded-2xl border border-stone-200/80 p-3">
                {/* 1. Payday Pulse Item */}
                <Pressable
                    onPress={onPaydayPress}
                    accessibilityRole="button"
                    accessibilityLabel={`Next Payday: ${nextPayday ? formatCurrency(nextPayday.netAmount) : 'None'}`}
                    hitSlop={4}
                    className="flex-1 items-center px-1 active:opacity-70"
                >
                    <View className="flex-row items-center mb-1">
                        <View className="w-5 h-5 rounded-full bg-emerald-50 items-center justify-center mr-1">
                            <Briefcase size={11} color="#059669" />
                        </View>
                        <Text className="text-[11px] font-semibold text-stone-600">Payday</Text>
                    </View>
                    <Text className="text-sm font-bold text-stone-900" numberOfLines={1}>
                        {nextPayday ? formatCurrency(nextPayday.netAmount) : '—'}
                    </Text>
                    <Text className="text-[10px] font-medium text-emerald-700 mt-0.5" numberOfLines={1}>
                        {paydayDueText}
                    </Text>
                </Pressable>

                <View className="w-px h-8 bg-stone-200/80" />

                {/* 2. Debt Obligations Pulse Item */}
                <Pressable
                    onPress={onLoansPress}
                    accessibilityRole="button"
                    accessibilityLabel={`Total Active Debt: ${formatCurrency(loansSummary.totalLoanBalance)}`}
                    hitSlop={4}
                    className="flex-1 items-center px-1 active:opacity-70"
                >
                    <View className="flex-row items-center mb-1">
                        <View className="w-5 h-5 rounded-full bg-amber-50 items-center justify-center mr-1">
                            <CreditCard size={11} color="#D97706" />
                        </View>
                        <Text className="text-[11px] font-semibold text-stone-600">Debt Due</Text>
                    </View>
                    <Text className="text-sm font-bold text-stone-900" numberOfLines={1}>
                        {formatCurrency(loansSummary.totalLoanBalance)}
                    </Text>
                    <Text
                        className={`text-[10px] font-medium mt-0.5 ${hasLoans && loanDueDays !== null && loanDueDays <= 3 ? 'text-rose-600 font-bold' : 'text-stone-500'}`}
                        numberOfLines={1}
                    >
                        {loanDueText}
                    </Text>
                </Pressable>

                <View className="w-px h-8 bg-stone-200/80" />

                {/* 3. Subscriptions & Bills Pulse Item */}
                <Pressable
                    onPress={onSubsPress}
                    accessibilityRole="button"
                    accessibilityLabel={`Monthly Subscriptions: ${formatCurrency(subsSummary.monthlyTotal)}`}
                    hitSlop={4}
                    className="flex-1 items-center px-1 active:opacity-70"
                >
                    <View className="flex-row items-center mb-1">
                        <View className="w-5 h-5 rounded-full bg-stone-100 items-center justify-center mr-1">
                            <Repeat size={11} color="#18342B" />
                        </View>
                        <Text className="text-[11px] font-semibold text-stone-600">Bills</Text>
                    </View>
                    <Text className="text-sm font-bold text-stone-900" numberOfLines={1}>
                        {formatCurrency(subsSummary.monthlyTotal)}
                    </Text>
                    <Text className="text-[10px] font-medium text-stone-500 mt-0.5" numberOfLines={1}>
                        {subsText}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
