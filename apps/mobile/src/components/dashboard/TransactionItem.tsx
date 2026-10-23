import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  ShoppingBag,
  Utensils,
  Car,
  Zap,
  Briefcase,
  Repeat,
  Tag,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react-native';
import { formatCurrency, formatRelativeDate } from '../../utils/formatters';

export interface TransactionItemData {
  id: string;
  title: string;
  category: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  date: string;
  accountName?: string;
}

export interface TransactionItemProps {
  transaction: TransactionItemData;
  currency?: string;
  onPress?: () => void;
}

function getCategoryIcon(category: string, type: 'income' | 'expense' | 'transfer') {
  const lower = category.toLowerCase();
  if (type === 'transfer') return Repeat;
  if (type === 'income' || lower.includes('salary') || lower.includes('work')) return Briefcase;
  if (lower.includes('food') || lower.includes('dining') || lower.includes('restaurant')) return Utensils;
  if (lower.includes('grocer') || lower.includes('shop')) return ShoppingBag;
  if (lower.includes('transport') || lower.includes('gas') || lower.includes('fuel')) return Car;
  if (lower.includes('util') || lower.includes('bill') || lower.includes('electric')) return Zap;
  return Tag;
}

export function TransactionItem({
  transaction,
  currency = '₱',
  onPress,
}: TransactionItemProps) {
  const { title, category, amount, type, date, accountName } = transaction;
  const IconComponent = getCategoryIcon(category, type);

  const isIncome = type === 'income';
  const isExpense = type === 'expense';

  const amountColor = isIncome
    ? 'text-[#18342B]'
    : isExpense
    ? 'text-[#D97757]'
    : 'text-foreground';

  const iconBg = isIncome
    ? 'bg-primary/40'
    : isExpense
    ? 'bg-[#D97757]/15'
    : 'bg-muted/70';

  const iconColor = isIncome ? '#18342B' : isExpense ? '#D97757' : '#5C6E63';

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      className="flex-row items-center justify-between p-3.5 mb-2 bg-card rounded-2xl border border-border/50"
    >
      <View className="flex-row items-center flex-1 mr-3">
        {/* Category Icon */}
        <View className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${iconBg}`}>
          <IconComponent size={20} color={iconColor} />
        </View>

        {/* Title and metadata */}
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-xs text-muted-foreground mt-0.5">
            {category} • {accountName ?? 'Cash'} • {formatRelativeDate(date)}
          </Text>
        </View>
      </View>

      {/* Amount */}
      <View className="items-end">
        <Text className={`text-sm font-bold ${amountColor}`}>
          {isIncome ? '+' : isExpense ? '-' : ''}
          {formatCurrency(amount, currency)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
