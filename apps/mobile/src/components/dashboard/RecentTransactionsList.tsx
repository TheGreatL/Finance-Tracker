import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ReceiptText } from 'lucide-react-native';
import { TransactionItem, TransactionItemData } from './TransactionItem';

export interface RecentTransactionsListProps {
  transactions: TransactionItemData[];
  currency?: string;
  onSeeAllPress?: () => void;
  onTransactionPress?: (tx: TransactionItemData) => void;
}

export function RecentTransactionsList({
  transactions,
  currency = '₱',
  onSeeAllPress,
  onTransactionPress,
}: RecentTransactionsListProps) {
  return (
    <View className="px-5 mt-2 mb-8">
      {/* Section Header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-bold text-foreground">
          Recent Activity
        </Text>
        {onSeeAllPress && transactions.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="See all transactions"
            onPress={onSeeAllPress}
            className="py-1 px-2 rounded-lg active:opacity-70"
          >
            <Text className="text-xs font-bold text-primary">
              See All
            </Text>
          </Pressable>
        )}
      </View>

      {/* Empty State */}
      {transactions.length === 0 ? (
        <View className="items-center justify-center p-8 bg-card rounded-2xl border border-dashed border-border/80">
          <View className="items-center justify-center w-12 h-12 mb-3 rounded-full bg-muted/60">
            <ReceiptText size={22} color="#5C6E63" />
          </View>
          <Text className="text-sm font-semibold text-foreground">
            No transactions yet
          </Text>
          <Text className="text-xs text-center text-muted-foreground mt-1 max-w-[220px]">
            Add your daily income or expenses above to start tracking your cashflow.
          </Text>
        </View>
      ) : (
        /* Transactions List */
        transactions.map((tx) => (
          <TransactionItem
            key={tx.id}
            transaction={tx}
            currency={currency}
            onPress={() => onTransactionPress?.(tx)}
          />
        ))
      )}
    </View>
  );
}
