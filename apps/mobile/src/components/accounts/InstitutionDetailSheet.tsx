import React from 'react';
import { Modal, View, Text, ScrollView, Pressable } from 'react-native';
import { X, Plus } from 'lucide-react-native';
import type { Institution, AccountPocket } from '../../types/database';
import { formatCurrency } from '../../utils/formatters';
import { PocketCard } from './PocketCard';
import { InstitutionLogo } from './InstitutionLogo';

interface InstitutionDetailSheetProps {
  visible: boolean;
  institution: Institution | null;
  pockets: AccountPocket[];
  onClose: () => void;
  onAddPocket: () => void;
  onQuickExpense?: (pocket: AccountPocket) => void;
}

export function InstitutionDetailSheet({
  visible,
  institution,
  pockets,
  onClose,
  onAddPocket,
  onQuickExpense,
}: InstitutionDetailSheetProps) {
  if (!institution) return null;

  const totalBalance = pockets.reduce((sum, p) => sum + p.current_balance, 0);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-stone-50 rounded-t-3xl max-h-[85%] border-t border-stone-100">
          {/* Header */}
          <View className="bg-white px-6 pt-5 pb-4 rounded-t-3xl border-b border-stone-200/80">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <InstitutionLogo code={institution.code} size={40} className="mr-3" />
                <View>
                  <Text className="text-lg font-bold text-stone-900">{institution.name}</Text>
                  <Text className="text-xs text-stone-500 capitalize">{institution.type}</Text>
                </View>
              </View>

              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close sheet"
                className="w-8 h-8 rounded-full bg-stone-100 items-center justify-center">
                <X size={18} color="#78716C" />
              </Pressable>
            </View>

            {/* Total Balance Card in Header */}
            <View className="bg-stone-100/70 p-4 rounded-2xl flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-medium text-stone-500">Aggregate Balance</Text>
                <Text className="text-2xl font-bold text-stone-900 tracking-tight">
                  {formatCurrency(totalBalance)}
                </Text>
              </View>

              <Pressable
                onPress={onAddPocket}
                className="flex-row items-center bg-[#18342B] px-3.5 py-2 rounded-xl active:opacity-90">
                <Plus size={14} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white ml-1">Add Pocket</Text>
              </Pressable>
            </View>
          </View>

          {/* Pocket List */}
          <ScrollView className="p-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Pockets ({pockets.length})
              </Text>
            </View>

            {pockets.map((pocket) => (
              <PocketCard
                key={pocket.id}
                pocket={pocket}
                onQuickExpense={onQuickExpense ? () => onQuickExpense(pocket) : undefined}
              />
            ))}

            <View className="h-8" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

