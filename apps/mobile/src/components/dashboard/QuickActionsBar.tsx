import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, Repeat, Camera } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';

export interface QuickActionsBarProps {
    onAddExpense?: () => void;
    onAddIncome?: () => void;
    onTransfer?: () => void;
    onScanReceipt?: () => void;
}

export function QuickActionsBar({ onAddExpense, onAddIncome, onTransfer, onScanReceipt }: QuickActionsBarProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const neutralIconColor = isDark ? '#EBF0E6' : '#18342B';

    const actions = [
        {
            id: 'expense',
            label: 'Expense',
            icon: ArrowDownLeft,
            iconColor: '#C2410C',
            bgColor: 'bg-[#C2410C]/15',
            onPress: onAddExpense
        },
        {
            id: 'income',
            label: 'Income',
            icon: ArrowUpRight,
            iconColor: isDark ? '#BBD583' : '#18342B',
            bgColor: 'bg-primary/40',
            onPress: onAddIncome
        },
        {
            id: 'transfer',
            label: 'Transfer',
            icon: Repeat,
            iconColor: neutralIconColor,
            bgColor: 'bg-muted/70',
            onPress: onTransfer
        },
        {
            id: 'scan',
            label: 'Scan OCR',
            icon: Camera,
            iconColor: neutralIconColor,
            bgColor: 'bg-muted/70',
            onPress: onScanReceipt
        }
    ];

    return (
        <View className="px-5 my-3">
            <View className="flex-row items-center justify-between p-4 bg-card rounded-2xl border border-border/60">
                {actions.map((action) => {
                    const IconComponent = action.icon;
                    return (
                        <Pressable
                            key={action.id}
                            accessibilityRole="button"
                            accessibilityLabel={action.label}
                            onPress={action.onPress}
                            hitSlop={8}
                            pressRetentionOffset={20}
                            className="items-center justify-center flex-1 active:opacity-75"
                        >
                            <View className={`w-12 h-12 rounded-full items-center justify-center mb-1.5 ${action.bgColor}`}>
                                <IconComponent size={20} color={action.iconColor} />
                            </View>
                            <Text className="text-xs font-semibold text-foreground">{action.label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}
