import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { formatSignedCurrency, formatRelativeDate } from '../../utils/formatters';
import { CategoryIcon } from '../common/CategoryIcon';
import { PocketBadge } from '../accounts/PocketBadge';
import type { PocketType } from '../../types/database';

export interface TransactionItemData {
    id: string;
    title: string;
    category: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    date: string;
    accountName?: string;
    institutionCode?: string;
    pocketType?: PocketType;
}

export interface TransactionItemProps {
    transaction: TransactionItemData;
    currency?: string;
    onPress?: () => void;
}

export const TransactionItem = memo(function TransactionItem({ transaction, currency = '₱', onPress }: TransactionItemProps) {
    const { title, category, amount, type, date, accountName, institutionCode, pocketType } = transaction;

    const isIncome = type === 'income';
    const isExpense = type === 'expense';

    // High-contrast semantic colors meeting WCAG AA
    const amountColor = isIncome
        ? 'text-[#18342B]'
        : isExpense
          ? 'text-[#C2410C]' // Deep terracotta with 4.8:1+ contrast on white card
          : 'text-foreground';

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            hitSlop={6}
            pressRetentionOffset={16}
            accessibilityLabel={`${title}, ${formatSignedCurrency(amount, type, currency)}`}
            className="flex-row items-center justify-between p-3.5 mb-2 bg-card rounded-2xl border border-border/50 active:opacity-75"
        >
            <View className="flex-row items-center flex-1 mr-3">
                {/* Category Icon */}
                <View className="mr-3">
                    <CategoryIcon category={category} type={type} size={42} />
                </View>

                {/* Title and metadata */}
                <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                        {title}
                    </Text>
                    <View className="flex-row items-center flex-wrap mt-0.5">
                        <Text className="text-xs text-muted-foreground mr-1.5">{category}</Text>
                        <Text className="text-xs text-muted-foreground mr-1.5">•</Text>
                        <View className="flex-row items-center mr-1.5">
                            <PocketBadge institutionCode={institutionCode} pocketType={pocketType} size={13} className="mr-1" />
                            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                                {accountName ?? 'Cash'}
                            </Text>
                        </View>
                        <Text className="text-xs text-muted-foreground mr-1.5">•</Text>
                        <Text className="text-xs text-muted-foreground">{formatRelativeDate(date)}</Text>
                    </View>
                </View>
            </View>

            {/* Amount with guarded sign formatting */}
            <View className="items-end">
                <Text className={`text-sm font-bold ${amountColor}`}>{formatSignedCurrency(amount, type, currency)}</Text>
            </View>
        </Pressable>
    );
});
