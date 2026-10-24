import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, WalletCards, ReceiptText, Bot, PieChart } from 'lucide-react-native';
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
          fontSize: 10,
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
                size={21}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center">
              {focused && (
                <View className="w-5 h-0.5 rounded-full bg-primary mb-1 -mt-1" />
              )}
              <WalletCards
                size={21}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Advisor',
          tabBarIcon: ({ focused }) => (
            <View className="-mt-2.5 items-center justify-center">
              <View
                className={`w-11 h-11 rounded-full items-center justify-center shadow-md ${
                  focused ? 'bg-[#18342B]' : 'bg-[#BBD583]'
                }`}
                style={{
                  elevation: 4,
                  shadowColor: '#18342B',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                }}
              >
                <Bot
                  size={22}
                  color={focused ? '#BBD583' : '#18342B'}
                  strokeWidth={2.4}
                />
              </View>
            </View>
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                color: focused ? activeTint : inactiveTint,
                marginTop: -1,
              }}
            >
              Advisor
            </Text>
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
                size={21}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center">
              {focused && (
                <View className="w-5 h-0.5 rounded-full bg-primary mb-1 -mt-1" />
              )}
              <PieChart
                size={21}
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
