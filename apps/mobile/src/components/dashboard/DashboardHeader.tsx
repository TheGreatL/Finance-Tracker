import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Bell, ScanLine } from 'lucide-react-native';

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
          <TouchableOpacity
            onPress={onScanPress}
            activeOpacity={0.7}
            className="items-center justify-center w-10 h-10 rounded-full bg-muted/60"
          >
            <ScanLine size={18} color="#18342B" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onNotificationPress}
          activeOpacity={0.7}
          className="items-center justify-center w-10 h-10 rounded-full bg-muted/60"
        >
          <Bell size={18} color="#18342B" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
