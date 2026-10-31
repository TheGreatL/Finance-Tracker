import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight, CalendarClock, AlertCircle } from 'lucide-react-native';
import type { SubscriptionRecord } from '../../types/database';
import { formatCurrency } from '../../utils/formatters';
import { SubscriptionLogo } from './SubscriptionLogo';

interface SubscriptionsBannerProps {
  monthlyTotal: number;
  activeCount: number;
  nextUpcoming: SubscriptionRecord | null;
  onPress?: () => void;
  className?: string;
}

export function SubscriptionsBanner({
  monthlyTotal,
  activeCount,
  nextUpcoming,
  onPress,
  className = '',
}: SubscriptionsBannerProps) {
  if (activeCount <= 0 && !nextUpcoming) {
    return null;
  }

  let dueText = '';
  let isDueVerySoon = false;
  if (nextUpcoming?.next_billing_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = nextUpcoming.next_billing_date.split('-').map((p) => parseInt(p, 10));
    const due = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      dueText = 'Due Today';
      isDueVerySoon = true;
    } else if (diffDays === 1) {
      dueText = 'Tomorrow';
      isDueVerySoon = true;
    } else {
      dueText = `In ${diffDays}d`;
      isDueVerySoon = diffDays <= 3;
    }
  }

  return (
    <View className={`px-5 mb-4 ${className}`}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Active subscriptions monthly spend ${formatCurrency(monthlyTotal)}`}
        hitSlop={8}
        pressRetentionOffset={20}
        className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-4 shadow-sm flex-row items-center justify-between active:bg-emerald-100/80">
        <View className="flex-row items-center flex-1 mr-3">
          {nextUpcoming ? (
            <SubscriptionLogo
              code={nextUpcoming.service_code}
              serviceName={nextUpcoming.service_name}
              size={42}
              className="mr-3"
            />
          ) : null}
          <View className="flex-1">
            <View className="flex-row items-center mb-0.5">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-[#18342B] mr-2">
                Subscriptions ({activeCount})
              </Text>
              {isDueVerySoon && (
                <View className="bg-amber-100 px-1.5 py-0.5 rounded-full flex-row items-center">
                  <AlertCircle size={10} color="#B45309" />
                  <Text className="text-[9px] font-bold text-amber-800 ml-0.5">Upcoming</Text>
                </View>
              )}
            </View>
            <Text className="text-xl font-extrabold text-stone-900 tracking-tight">
              {formatCurrency(monthlyTotal)}
              <Text className="text-xs font-semibold text-stone-500"> /mo</Text>
            </Text>
          </View>
        </View>

        {nextUpcoming && (
          <View className="items-end mr-1.5">
            <Text className="text-xs font-bold text-stone-800" numberOfLines={1}>
              {nextUpcoming.service_name} • {formatCurrency(nextUpcoming.amount)}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <CalendarClock size={11} color={isDueVerySoon ? '#B45309' : '#78716C'} />
              <Text
                className={`text-[10px] font-semibold ml-1 ${
                  isDueVerySoon ? 'text-amber-700 font-bold' : 'text-stone-500'
                }`}>
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

