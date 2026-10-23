import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Bell, ScanLine } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';

export interface DashboardHeaderProps {
  userName?: string;
  onNotificationPress?: () => void;
  onScanPress?: () => void;
}

export function DashboardHeader({
  userName = 'Welcome back',
  onNotificationPress,
  onScanPress,
}: DashboardHeaderProps) {
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#EBF0E6' : '#18342B';

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
      <View>
        <Text className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          {currentDate}
        </Text>
        <Text className="text-2xl font-bold tracking-tight text-foreground">
          {userName}
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        {onScanPress && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan receipt OCR"
            onPress={onScanPress}
            className="items-center justify-center w-10 h-10 rounded-full bg-muted/60 active:opacity-70"
          >
            <ScanLine size={18} color={iconColor} />
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={onNotificationPress}
          className="items-center justify-center w-10 h-10 rounded-full bg-muted/60 active:opacity-70"
        >
          <Bell size={18} color={iconColor} />
        </Pressable>
      </View>
    </View>
  );
}
