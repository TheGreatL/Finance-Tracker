import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Calendar, Wallet, ChevronRight } from 'lucide-react-native';
import type { SubscriptionRecord } from '../../types/database';
import { formatCurrency, formatDisplayDate } from '../../utils/formatters';
import { getSubscriptionPreset } from '../../constants/subscriptions';
import { SubscriptionLogo } from './SubscriptionLogo';

interface SubscriptionCardProps {
    subscription: SubscriptionRecord;
    onPress: () => void;
    className?: string;
}

export function SubscriptionCard({ subscription, onPress, className = '' }: SubscriptionCardProps) {
    const preset = getSubscriptionPreset(subscription.service_code || subscription.service_name);
    const isActive = subscription.status === 'active';
    const isPaused = subscription.status === 'paused';
    const isCancelled = subscription.status === 'cancelled';

    let dueBadgeText = '';
    let isDueSoon = false;

    if (isActive && subscription.next_billing_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const parts = subscription.next_billing_date.split('-').map((p) => parseInt(p, 10));
        const due = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
        const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diff <= 0) {
            dueBadgeText = 'Due Today';
            isDueSoon = true;
        } else if (diff === 1) {
            dueBadgeText = 'Tomorrow';
            isDueSoon = true;
        } else {
            dueBadgeText = `In ${diff}d`;
            isDueSoon = diff <= 3;
        }
    } else if (isPaused) {
        dueBadgeText = 'Paused';
    } else if (isCancelled) {
        dueBadgeText = 'Cancelled';
    }

    const frequencyLabel = subscription.frequency === 'weekly' ? '/wk' : subscription.frequency === 'yearly' ? '/yr' : '/mo';

    const pocketLabel = subscription.institution_name
        ? `${subscription.institution_name} • ${subscription.pocket_name || 'Wallet'}`
        : subscription.pocket_name || 'Selected Pocket';

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${subscription.service_name}, ${formatCurrency(subscription.amount)} ${subscription.frequency}`}
            hitSlop={8}
            pressRetentionOffset={20}
            className={`w-full bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm active:bg-stone-50 ${className}`}
        >
            {/* Brand Accent Bar */}
            <View className="h-1.5 w-10 rounded-full mb-3" style={{ backgroundColor: preset.color }} />

            <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1 mr-2">
                    <SubscriptionLogo code={subscription.service_code} serviceName={subscription.service_name} size={38} className="mr-3" />
                    <View className="flex-1">
                        <Text className={`text-sm font-bold ${isCancelled ? 'text-stone-400 line-through' : 'text-stone-900'}`} numberOfLines={1}>
                            {subscription.service_name}
                        </Text>
                        <Text className="text-[11px] text-stone-500 font-medium" numberOfLines={1}>
                            {subscription.category} • {subscription.frequency.charAt(0).toUpperCase() + subscription.frequency.slice(1)}
                        </Text>
                    </View>
                </View>

                <View className="items-end">
                    <Text className={`text-base font-bold tracking-tight ${isCancelled ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
                        {formatCurrency(subscription.amount)}
                        <Text className="text-[11px] font-semibold text-stone-400">{frequencyLabel}</Text>
                    </Text>
                    <View
                        className={`px-2 py-0.5 rounded-full mt-1 ${
                            isCancelled ? 'bg-stone-100' : isPaused ? 'bg-amber-100' : isDueSoon ? 'bg-red-100' : 'bg-emerald-100'
                        }`}
                    >
                        <Text
                            className={`text-[10px] font-bold ${
                                isCancelled ? 'text-stone-500' : isPaused ? 'text-amber-800' : isDueSoon ? 'text-red-700' : 'text-emerald-800'
                            }`}
                        >
                            {dueBadgeText}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Footer: Payment Source & Next Billing Date */}
            <View className="flex-row items-center justify-between pt-2.5 border-t border-stone-100">
                <View className="flex-row items-center flex-1 mr-2">
                    <Wallet size={12} color="#78716C" />
                    <Text className="text-[11px] text-stone-600 font-medium ml-1.5" numberOfLines={1}>
                        {pocketLabel}
                    </Text>
                </View>

                <View className="flex-row items-center">
                    <Calendar size={12} color="#78716C" />
                    <Text className="text-[11px] text-stone-500 font-semibold ml-1 mr-1">
                        {isActive ? `Next: ${formatDisplayDate(subscription.next_billing_date)}` : subscription.status.toUpperCase()}
                    </Text>
                    <ChevronRight size={14} color="#A8A29E" />
                </View>
            </View>
        </Pressable>
    );
}
