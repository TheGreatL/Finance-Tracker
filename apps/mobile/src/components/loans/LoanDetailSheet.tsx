import React, { useState } from 'react';
import { Modal, View, Text, ScrollView, Pressable, Alert, Image, Linking } from 'react-native';
import { X, Calendar, DollarSign, Paperclip, Trash2, CheckCircle2, AlertCircle } from 'lucide-react-native';
import type { LoanRecord } from '../../types/database';
import { formatCurrency } from '../../utils/formatters';
import { InstitutionLogo } from '../accounts/InstitutionLogo';

interface LoanDetailSheetProps {
  visible: boolean;
  loan: LoanRecord | null;
  onClose: () => void;
  onRecordPayment: (loan: LoanRecord) => void;
  onDelete: (loanId: string) => Promise<void>;
}

export function LoanDetailSheet({
  visible,
  loan,
  onClose,
  onRecordPayment,
  onDelete,
}: LoanDetailSheetProps) {
  const [deleting, setDeleting] = useState(false);

  if (!loan) return null;

  const isPaid = loan.status === 'paid';
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((loan.total_amount - loan.remaining_balance) / loan.total_amount) * 100))
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete Loan',
      `Are you sure you want to delete "${loan.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await onDelete(loan.id);
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete loan');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenAttachment = () => {
    if (loan.attachment_path) {
      Linking.openURL(loan.attachment_path).catch(() => {
        Alert.alert('Attachment', `File saved at:\n${loan.attachment_path}`);
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-stone-50 rounded-t-3xl max-h-[88%] border-t border-stone-100">
          {/* Header */}
          <View className="bg-white px-6 pt-5 pb-4 rounded-t-3xl border-b border-stone-200/80">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center flex-1 mr-3">
                {loan.institution_code ? (
                  <InstitutionLogo code={loan.institution_code} size={40} className="mr-3" />
                ) : null}
                <View className="flex-1">
                  <Text className="text-lg font-bold text-stone-900" numberOfLines={1}>
                    {loan.title}
                  </Text>
                  <Text className="text-xs text-stone-500 font-medium">
                    {loan.institution_name || 'Lending Provider'}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close sheet"
                hitSlop={8}
                pressRetentionOffset={20}
                className="w-8 h-8 rounded-full bg-stone-100 items-center justify-center">
                <X size={18} color="#78716C" />
              </Pressable>
            </View>

            {/* Total vs Remaining Debt Highlight */}
            <View className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/60 flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                  Remaining Debt
                </Text>
                <Text
                  className={`text-2xl font-extrabold tracking-tight mt-0.5 ${
                    isPaid ? 'text-emerald-700 line-through' : 'text-stone-900'
                  }`}>
                  {formatCurrency(loan.remaining_balance)}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-[10px] text-stone-400 font-medium">Total Borrowed</Text>
                <Text className="text-sm font-bold text-stone-700">
                  {formatCurrency(loan.total_amount)}
                </Text>
              </View>
            </View>
          </View>

          {/* Details Scroll */}
          <ScrollView className="p-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Repayment Progress */}
            <View className="bg-white p-4 rounded-2xl border border-stone-200/80 mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold text-stone-700">Repayment Progress</Text>
                <Text className="text-xs font-bold text-[#18342B]">{progressPercent}%</Text>
              </View>
              <View className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden mb-2">
                <View
                  className={`h-full rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-[#18342B]'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </View>
              <Text className="text-[11px] text-stone-400">
                {formatCurrency(loan.total_amount - loan.remaining_balance)} paid of{' '}
                {formatCurrency(loan.total_amount)}
              </Text>
            </View>

            {/* Payment Schedule Card */}
            <View className="bg-white p-4 rounded-2xl border border-stone-200/80 mb-3">
              <Text className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
                Payment Schedule
              </Text>
              <View className="flex-row items-center justify-between mb-2.5">
                <Text className="text-xs text-stone-500">Monthly Amortization</Text>
                <Text className="text-sm font-bold text-stone-900">
                  {formatCurrency(loan.monthly_payment)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between mb-2.5">
                <Text className="text-xs text-stone-500">Next Payment Due Date</Text>
                <View className="flex-row items-center">
                  <Calendar size={13} color="#57534E" />
                  <Text className="text-xs font-bold text-stone-900 ml-1.5">{loan.due_date}</Text>
                </View>
              </View>
              {loan.interest_rate ? (
                <View className="flex-row items-center justify-between pt-2 border-t border-stone-100">
                  <Text className="text-xs text-stone-500">Interest Rate</Text>
                  <Text className="text-xs font-bold text-stone-900">
                    {loan.interest_rate}% p.a.
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Attachment preview if present */}
            {loan.attachment_path ? (
              <View className="bg-white p-4 rounded-2xl border border-stone-200/80 mb-3">
                <Text className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                  Loan Document Attachment
                </Text>
                <Pressable
                  onPress={handleOpenAttachment}
                  hitSlop={8}
                  pressRetentionOffset={20}
                  className="flex-row items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-200 active:bg-stone-100">
                  <View className="flex-row items-center flex-1 mr-2">
                    <Paperclip size={16} color="#18342B" />
                    <Text className="text-xs font-semibold text-stone-800 ml-2" numberOfLines={1}>
                      {loan.attachment_name || 'View Loan Document'}
                    </Text>
                  </View>
                  <Text className="text-xs font-bold text-[#18342B]">Open</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Notes if present */}
            {loan.notes ? (
              <View className="bg-white p-4 rounded-2xl border border-stone-200/80 mb-3">
                <Text className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Notes
                </Text>
                <Text className="text-xs text-stone-600 leading-relaxed">{loan.notes}</Text>
              </View>
            ) : null}

            {/* Actions */}
            <View className="mt-2 space-y-3 pb-8">
              {!isPaid && (
                <Pressable
                  onPress={() => onRecordPayment(loan)}
                  hitSlop={8}
                  pressRetentionOffset={20}
                  className="bg-[#18342B] py-3.5 rounded-2xl items-center active:opacity-90">
                  <Text className="text-white font-bold text-sm">
                    Record Loan Payment (₱{loan.monthly_payment.toLocaleString()})
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={handleDelete}
                disabled={deleting}
                hitSlop={8}
                pressRetentionOffset={20}
                className="py-3 items-center active:opacity-70 flex-row justify-center mt-2">
                <Trash2 size={15} color="#DC2626" />
                <Text className="text-xs font-bold text-red-600 ml-1.5">
                  {deleting ? 'Deleting...' : 'Delete Loan'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
