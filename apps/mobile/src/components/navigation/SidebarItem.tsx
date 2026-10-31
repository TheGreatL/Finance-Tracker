import React from 'react';
import { Pressable, View, Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export interface SidebarItemProps {
    icon: LucideIcon;
    label: string;
    subtitle?: string;
    badge?: string;
    badgeColor?: string;
    isActive?: boolean;
    danger?: boolean;
    onPress: () => void;
}

export function SidebarItem({
    icon: Icon,
    label,
    subtitle,
    badge,
    badgeColor = 'bg-stone-100 text-stone-600',
    isActive = false,
    danger = false,
    onPress
}: SidebarItemProps) {
    const iconColor = danger ? '#E11D48' : isActive ? '#18342B' : '#57534E';
    const textColor = danger ? 'text-rose-600 font-bold' : isActive ? 'text-[#18342B] font-bold' : 'text-stone-800 font-medium';

    return (
        <Pressable
            onPress={onPress}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={label}
            className={`flex-row items-center justify-between px-3.5 py-2.5 rounded-xl mb-1 ${
                isActive ? 'bg-[#BBD583]/25 border border-[#BBD583]/40' : 'active:bg-stone-100'
            }`}
        >
            <View className="flex-row items-center flex-1 mr-2">
                <View
                    className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${
                        isActive ? 'bg-[#18342B]' : danger ? 'bg-rose-50' : 'bg-stone-100'
                    }`}
                >
                    <Icon size={18} color={isActive ? '#BBD583' : iconColor} strokeWidth={isActive ? 2.4 : 2} />
                </View>
                <View className="flex-1">
                    <Text className={`text-sm ${textColor}`} numberOfLines={1}>
                        {label}
                    </Text>
                    {subtitle ? (
                        <Text className="text-[11px] text-stone-400 mt-0.5" numberOfLines={1}>
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
            </View>

            {badge ? (
                <View className={`px-2 py-0.5 rounded-full ${badgeColor}`}>
                    <Text className="text-[10px] font-bold">{badge}</Text>
                </View>
            ) : null}
        </Pressable>
    );
}
