import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { Institution } from '../../types/database';
import { formatCurrency } from '../../utils/formatters';
import { InstitutionLogo } from './InstitutionLogo';

interface InstitutionCardProps {
  institution: Institution;
  onPress: () => void;
  className?: string;
}

export function InstitutionCard({ institution, onPress, className }: InstitutionCardProps) {
  const totalBalance = institution.total_balance ?? 0;
  const count = institution.pocket_count ?? 1;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={8}
      pressRetentionOffset={20}
      accessibilityLabel={`${institution.name}, total balance ${formatCurrency(totalBalance)}, ${count} pocket${count > 1 ? 's' : ''}`}
      className={`w-full bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-sm active:scale-95 ${className ?? ''}`}
      style={{
        shadowColor: '#18342B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}>
      {/* Top Brand Accent Bar */}
      <View
        className="h-1.5 w-8 rounded-full mb-2.5"
        style={{ backgroundColor: institution.color || '#18342B' }}
      />

      {/* Header with SVG Logo and Count Pill */}
      <View className="flex-row items-center justify-between mb-2.5">
        <InstitutionLogo code={institution.code} size={32} />
        <View className="bg-stone-100 px-1.5 py-0.5 rounded-full">
          <Text className="text-[10px] font-medium text-stone-600">
            {count} {count === 1 ? 'pocket' : 'pockets'}
          </Text>
        </View>
      </View>

      {/* Institution Name */}
      <Text className="text-xs font-semibold text-stone-700 mb-0.5" numberOfLines={1}>
        {institution.name}
      </Text>

      {/* Optional Note Subtitle */}
      {institution.notes ? (
        <Text className="text-[11px] text-stone-500 font-normal italic mb-1" numberOfLines={1}>
          {institution.notes}
        </Text>
      ) : null}

      {/* Aggregate Balance */}
      <Text className="text-[15px] font-bold text-stone-900 tracking-tight" numberOfLines={1}>
        {formatCurrency(totalBalance)}
      </Text>
    </Pressable>
  );
}
