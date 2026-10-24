import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Plus } from 'lucide-react-native';
import type { Institution } from '../../types/database';
import { InstitutionCard } from './InstitutionCard';

interface InstitutionGridProps {
  institutions: Institution[];
  onSelectInstitution: (institution: Institution) => void;
  onAddAccount: () => void;
  onSeeAll?: () => void;
  limit?: number;
  hideHeader?: boolean;
}

export function InstitutionGrid({
  institutions,
  onSelectInstitution,
  onAddAccount,
  onSeeAll,
  limit,
  hideHeader = false,
}: InstitutionGridProps) {
  // Chunk institutions into pairs of 2 for a clean 2-column grid
  const displayed = limit ? institutions.slice(0, limit) : institutions;
  const rows: Institution[][] = [];
  for (let i = 0; i < displayed.length; i += 2) {
    rows.push(displayed.slice(i, i + 2));
  }

  return (
    <View className="mb-6">
      {/* Section Header */}
      {!hideHeader && (
        <View className="flex-row items-center justify-between px-5 mb-3">
          <View className="flex-row items-center">
            <Text className="text-base font-bold text-stone-900 mr-2">Accounts</Text>
            <View className="bg-stone-200/80 px-2 py-0.5 rounded-full">
              <Text className="text-[11px] font-bold text-stone-700">
                {institutions.length}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            {onSeeAll && institutions.length > (limit ?? 0) ? (
              <Pressable
                onPress={onSeeAll}
                accessibilityRole="button"
                accessibilityLabel="See all accounts"
                hitSlop={8}
                pressRetentionOffset={20}
                className="py-1 px-2 rounded-lg active:opacity-70">
                <Text className="text-xs font-bold text-[#18342B]">See All →</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={onAddAccount}
              accessibilityRole="button"
              accessibilityLabel="Add Account"
              hitSlop={8}
              pressRetentionOffset={20}
              className="flex-row items-center bg-[#BBD583] px-3 py-1.5 rounded-xl active:opacity-80">
              <Plus size={14} color="#18342B" />
              <Text className="text-xs font-bold text-[#18342B] ml-1">Add Account</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Empty State */}
      {institutions.length === 0 ? (
        <View className="px-5">
          <Pressable
            onPress={onAddAccount}
            className="w-full py-8 rounded-2xl border-2 border-dashed border-stone-300 items-center justify-center bg-stone-50 active:bg-stone-100">
            <View className="w-10 h-10 rounded-full bg-stone-200 items-center justify-center mb-2">
              <Plus size={20} color="#57534E" />
            </View>
            <Text className="text-sm font-semibold text-stone-700">Add First Account</Text>
            <Text className="text-xs text-stone-400 mt-0.5">Connect a Philippine bank or e-wallet</Text>
          </Pressable>
        </View>
      ) : (
        /* 2-Column Grid Rows */
        <View className="px-5">
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row mb-3" style={{ gap: 12 }}>
              {row.map((institution) => (
                <View key={institution.id} className="flex-1">
                  <InstitutionCard
                    institution={institution}
                    onPress={() => onSelectInstitution(institution)}
                  />
                </View>
              ))}

              {/* If odd row (e.g. 1 item in the last row), show an 'Add Account' tile */}
              {row.length === 1 && (
                <Pressable
                  onPress={onAddAccount}
                  accessibilityRole="button"
                  accessibilityLabel="Add another account"
                  hitSlop={8}
                  pressRetentionOffset={20}
                  className="flex-1 rounded-2xl border-2 border-dashed border-stone-300 items-center justify-center bg-stone-50/60 p-3.5 active:bg-stone-100">
                  <View className="w-8 h-8 rounded-full bg-stone-200 items-center justify-center mb-1.5">
                    <Plus size={16} color="#57534E" />
                  </View>
                  <Text className="text-xs font-semibold text-stone-600">Add Account</Text>
                  <Text className="text-[10px] text-stone-400 mt-0.5">Bank or e-wallet</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
