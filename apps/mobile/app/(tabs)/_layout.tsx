import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, ReceiptText } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const barBg = isDark ? '#14251F' : '#FFFFFF';
  const barBorder = isDark ? '#1F362D' : '#E0E7DC';
  const activeTint = isDark ? '#BBD583' : '#18342B';
  const inactiveTint = isDark ? '#8FA295' : '#5C6E63';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: barBg,
          borderTopColor: barBorder,
          borderTopWidth: 1,
          height: 56 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center">
              {focused && (
                <View className="w-5 h-0.5 rounded-full bg-primary mb-1 -mt-1" />
              )}
              <LayoutDashboard
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Ledger',
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center">
              {focused && (
                <View className="w-5 h-0.5 rounded-full bg-primary mb-1 -mt-1" />
              )}
              <ReceiptText
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
