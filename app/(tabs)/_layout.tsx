import { Tabs } from 'expo-router';
import { useCSSVariable } from 'uniwind';
import {
  LayoutDashboard,
  ReceiptText,
  Wallet,
  Target,
  Calculator,
  Settings as SettingsIcon,
} from 'lucide-react-native';

export default function TabsLayout() {
  const [primary, muted, card, border] = useCSSVariable([
    '--color-primary',
    '--color-muted-foreground',
    '--color-card',
    '--color-border',
  ]) as (string | undefined)[];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: primary || '#4F46E5',
        tabBarInactiveTintColor: muted || '#9CA3AF',
        tabBarStyle: {
          backgroundColor: card || '#FFFFFF',
          borderTopColor: border || '#E5E7EB',
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          title: 'Ledger',
          tabBarIcon: ({ color, size }) => <ReceiptText color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: 'Planning',
          tabBarIcon: ({ color, size }) => <Target color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="calculators"
        options={{
          title: 'Tools',
          tabBarIcon: ({ color, size }) => <Calculator color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size - 2} />,
        }}
      />
      {/* Hide starter components screen from tab bar, keep accessible if needed */}
      <Tabs.Screen
        name="components"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
