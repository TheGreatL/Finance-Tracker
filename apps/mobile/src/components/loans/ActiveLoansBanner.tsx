import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { HandCoins, ChevronRight, CalendarClock, AlertCircle } from 'lucide-react-native';
import type { LoanRecord } from '../../types/database';
import { formatCurrency } from '../../utils/formatters';

interface ActiveLoansBannerProps {
    totalLoanBalance: number;
    nextDueLoan: LoanRecord | null;
    onPress?: () => void;
    className?: string;
}

export function ActiveLoansBanner({ totalLoanBalance, nextDueLoan, onPress, className = '' }: ActiveLoansBannerProps) {
    if (totalLoanBalance <= 0 && !nextDueLoan) {
        return null;
    }

    // Calculate days until due date
    let dueText = '';
    let isDueVerySoon = false;
    if (nextDueLoan?.due_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(nextDueLoan.due_date);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            dueText = `Overdue by ${Math.abs(diffDays)}d`;
            isDueVerySoon = true;
        } else if (diffDays === 0) {
            dueText = 'Due Today';
            isDueVerySoon = true;
        } else if (diffDays === 1) {
            dueText = 'Due Tomorrow';
            isDueVerySoon = true;
        } else {
            dueText = `Due in ${diffDays} days`;
            isDueVerySoon = diffDays <= 3;
        }
    }

    return (
        <View className={`px-5 mb-4 ${className}`}>
            <Pressable
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={`Active loans total ${formatCurrency(totalLoanBalance)}. ${nextDueLoan ? `Next payment ${formatCurrency(nextDueLoan.monthly_payment)} ${dueText}` : ''}`}
                hitSlop={8}
                pressRetentionOffset={20}
                className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 shadow-sm flex-row items-center justify-between active:bg-amber-100/80"
            >
                <View className="flex-row items-center flex-1 mr-3">
                    <View className="w-11 h-11 rounded-2xl bg-amber-100 items-center justify-center mr-3 border border-amber-200">
                        <HandCoins size={20} color="#B45309" />
                    </View>
                    <View className="flex-1">
                        <View className="flex-row items-center mb-0.5">
                            <Text className="text-[11px] font-bold uppercase tracking-wider text-amber-800 mr-2">Total Loans</Text>
                            {isDueVerySoon && (
                                <View className="bg-red-100 px-1.5 py-0.5 rounded-full flex-row items-center">
                                    <AlertCircle size={10} color="#DC2626" />
                                    <Text className="text-[9px] font-bold text-red-700 ml-0.5">Pay Soon</Text>
                                </View>
                            )}
                        </View>
                        <Text className="text-xl font-bold text-stone-900 tracking-tight">{formatCurrency(totalLoanBalance)}</Text>
                    </View>
                </View>

                {nextDueLoan && (
                    <View className="items-end mr-1">
                        <Text className="text-xs font-bold text-stone-800">{formatCurrency(nextDueLoan.monthly_payment)}</Text>
                        <View className="flex-row items-center mt-0.5">
                            <CalendarClock size={11} color={isDueVerySoon ? '#DC2626' : '#78716C'} />
                            <Text className={`text-[10px] font-semibold ml-1 ${isDueVerySoon ? 'text-red-600 font-bold' : 'text-stone-500'}`}>
                                {dueText}
                            </Text>
                        </View>
                    </View>
                )}

                <ChevronRight size={18} color="#A8A29E" />
            </Pressable>
        </View>
    );
}
