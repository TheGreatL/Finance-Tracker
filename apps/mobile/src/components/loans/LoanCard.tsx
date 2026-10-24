import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Paperclip, Calendar, ChevronRight } from 'lucide-react-native';
import type { LoanRecord } from '../../types/database';
import { formatCurrency } from '../../utils/formatters';
import { InstitutionLogo } from '../accounts/InstitutionLogo';

interface LoanCardProps {
  loan: LoanRecord;
  onPress: () => void;
  className?: string;
}

export function LoanCard({ loan, onPress, className = '' }: LoanCardProps) {
  const isPaid = loan.status === 'paid';
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((loan.total_amount - loan.remaining_balance) / loan.total_amount) * 100))
  );

  // Due date countdown
  let dueText = '';
  let isDueSoon = false;
  if (loan.due_date && !isPaid) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(loan.due_date);
    due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff < 0) {
      dueText = `Overdue by ${Math.abs(diff)}d`;
      isDueSoon = true;
    } else if (diff === 0) {
      dueText = 'Due Today';
      isDueSoon = true;
    } else if (diff === 1) {
      dueText = 'Due Tomorrow';
      isDueSoon = true;
    } else {
      dueText = `Due in ${diff}d`;
      isDueSoon = diff <= 3;
    }
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${loan.title}, remaining balance ${formatCurrency(loan.remaining_balance)}`}
      hitSlop={8}
      pressRetentionOffset={20}
      className={`w-full bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm active:bg-stone-50 ${className}`}>
      {/* Top Accent Strip */}
      <View
        className="h-1.5 w-10 rounded-full mb-3"
        style={{ backgroundColor: loan.institution_color || '#B45309' }}
      />

      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1 mr-2">
          {loan.institution_code ? (
            <InstitutionLogo code={loan.institution_code} size={32} className="mr-2.5" />
          ) : null}
          <View className="flex-1">
            <Text className="text-sm font-bold text-stone-900" numberOfLines={1}>
              {loan.title}
            </Text>
            <Text className="text-[11px] text-stone-500 font-medium" numberOfLines={1}>
              {loan.institution_name || 'Lending Provider'}
            </Text>
          </View>
        </View>

        <View
          className={`px-2 py-0.5 rounded-full ${
            isPaid ? 'bg-emerald-100' : isDueSoon ? 'bg-red-100' : 'bg-amber-100'
          }`}>
          <Text
            className={`text-[10px] font-bold ${
              isPaid ? 'text-emerald-800' : isDueSoon ? 'text-red-700' : 'text-amber-800'
            }`}>
            {isPaid ? 'Paid Off' : dueText || 'Active'}
          </Text>
        </View>
      </View>

      {/* Notes / Subtitle if present */}
      {loan.notes ? (
        <Text className="text-xs text-stone-500 italic mb-2.5" numberOfLines={1}>
          Note: {loan.notes}
        </Text>
      ) : null}

      {/* Balances */}
      <View className="flex-row items-baseline justify-between mb-2">
        <View>
          <Text className="text-[10px] font-semibold uppercase text-stone-400">
            Remaining Debt
          </Text>
          <Text
            className={`text-lg font-extrabold tracking-tight ${
              isPaid ? 'text-emerald-700 line-through' : 'text-stone-900'
            }`}>
            {formatCurrency(loan.remaining_balance)}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-[10px] text-stone-400">Monthly Payment</Text>
          <Text className="text-xs font-bold text-stone-700">
            {formatCurrency(loan.monthly_payment)}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mb-2">
        <View
          className={`h-full rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-[#18342B]'}`}
          style={{ width: `${progressPercent}%` }}
        />
      </View>

      {/* Footer Info */}
      <View className="flex-row items-center justify-between pt-1">
        <Text className="text-[10px] text-stone-400 font-medium">
          {progressPercent}% paid of {formatCurrency(loan.total_amount)}
        </Text>

        <View className="flex-row items-center">
          {loan.attachment_path ? (
            <View className="flex-row items-center mr-2 bg-stone-100 px-1.5 py-0.5 rounded-md">
              <Paperclip size={11} color="#78716C" />
              <Text className="text-[9px] text-stone-600 font-medium ml-1">Doc</Text>
            </View>
          ) : null}
          <ChevronRight size={14} color="#A8A29E" />
        </View>
      </View>
    </Pressable>
  );
}
