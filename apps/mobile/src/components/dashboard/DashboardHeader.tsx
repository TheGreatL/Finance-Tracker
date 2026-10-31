import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Bell, ScanLine, Menu } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';

export interface DashboardHeaderProps {
    userName?: string;
    onMenuPress?: () => void;
    onNotificationPress?: () => void;
    onScanPress?: () => void;
    unreadNotificationsCount?: number;
}

export function DashboardHeader({
    userName = 'Welcome back',
    onMenuPress,
    onNotificationPress,
    onScanPress,
    unreadNotificationsCount = 0
}: DashboardHeaderProps) {
    const colorScheme = useColorScheme();
    const iconColor = colorScheme === 'dark' ? '#EBF0E6' : '#18342B';

    const currentDate = new Date().toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });

    return (
        <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
            <View className="flex-row items-center flex-1 mr-2">
                {onMenuPress && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Open sidebar navigation"
                        onPress={onMenuPress}
                        hitSlop={8}
                        className="items-center justify-center w-10 h-10 rounded-full bg-muted/60 active:opacity-70 mr-3"
                    >
                        <Menu size={20} color={iconColor} strokeWidth={2.2} />
                    </Pressable>
                )}
                <View className="flex-1">
                    <Text className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">{currentDate}</Text>
                    <Text className="text-2xl font-bold tracking-tight text-foreground" numberOfLines={1}>
                        {userName}
                    </Text>
                </View>
            </View>

            <View className="flex-row items-center gap-2">
                {onScanPress && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Scan receipt OCR"
                        onPress={onScanPress}
                        hitSlop={8}
                        pressRetentionOffset={20}
                        className="items-center justify-center w-10 h-10 rounded-full bg-muted/60 active:opacity-70"
                    >
                        <ScanLine size={18} color={iconColor} />
                    </Pressable>
                )}
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Notifications"
                    onPress={onNotificationPress}
                    hitSlop={8}
                    pressRetentionOffset={20}
                    className="items-center justify-center w-10 h-10 rounded-full bg-muted/60 active:opacity-70 relative"
                >
                    <Bell size={18} color={iconColor} />
                    {unreadNotificationsCount > 0 && (
                        <View className="absolute -top-1 -right-1 bg-red-600 rounded-full min-w-[18px] h-[18px] px-1 items-center justify-center border-2 border-white shadow-xs">
                            <Text className="text-[10px] font-bold text-white">{unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}</Text>
                        </View>
                    )}
                </Pressable>
            </View>
        </View>
    );
}
