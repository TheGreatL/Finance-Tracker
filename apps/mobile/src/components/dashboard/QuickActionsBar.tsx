import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, Repeat, Camera } from 'lucide-react-native';

export interface QuickActionsBarProps {
  onAddExpense?: () => void;
  onAddIncome?: () => void;
  onTransfer?: () => void;
  onScanReceipt?: () => void;
}

export function QuickActionsBar({
  onAddExpense,
  onAddIncome,
  onTransfer,
  onScanReceipt,
}: QuickActionsBarProps) {
  const actions = [
    {
      id: 'expense',
      label: 'Expense',
      icon: ArrowDownLeft,
      iconColor: '#D97757',
      bgColor: 'bg-[#D97757]/15',
      onPress: onAddExpense,
    },
    {
      id: 'income',
      label: 'Income',
      icon: ArrowUpRight,
      iconColor: '#18342B',
      bgColor: 'bg-primary/50',
      onPress: onAddIncome,
    },
    {
      id: 'transfer',
      label: 'Transfer',
      icon: Repeat,
      iconColor: '#18342B',
      bgColor: 'bg-muted/70',
      onPress: onTransfer,
    },
    {
      id: 'scan',
      label: 'Scan OCR',
      icon: Camera,
      iconColor: '#18342B',
      bgColor: 'bg-muted/70',
      onPress: onScanReceipt,
    },
  ];

  return (
    <View className="px-5 my-3">
      <View className="flex-row items-center justify-between p-4 bg-card rounded-2xl border border-border/60">
        {actions.map((action) => {
          const IconComponent = action.icon;
          return (
            <TouchableOpacity
              key={action.id}
              activeOpacity={0.7}
              onPress={action.onPress}
              className="items-center justify-center flex-1"
            >
              <View className={`w-12 h-12 rounded-full items-center justify-center mb-1.5 ${action.bgColor}`}>
                <IconComponent size={20} color={action.iconColor} />
              </View>
              <Text className="text-xs font-semibold text-foreground">
                {action.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
