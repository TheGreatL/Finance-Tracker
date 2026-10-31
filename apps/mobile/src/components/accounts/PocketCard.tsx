import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Wallet, PiggyBank, ArrowDownLeft, Pencil } from 'lucide-react-native';
import type { AccountPocket } from '../../types/database';
import { formatCurrency } from '../../utils/formatters';

interface PocketCardProps {
    pocket: AccountPocket;
    onQuickExpense?: () => void;
    onEdit?: () => void;
}

export function PocketCard({ pocket, onQuickExpense, onEdit }: PocketCardProps) {
    const isSavings = pocket.pocket_type === 'savings';
    const Icon = isSavings ? PiggyBank : Wallet;

    return (
        <View
            className="bg-white rounded-2xl p-4 mb-3 border border-stone-200/80 shadow-sm"
            style={{
                shadowColor: '#18342B',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 1
            }}
        >
            <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                    <View className={`w-8 h-8 rounded-lg items-center justify-center mr-2.5 ${isSavings ? 'bg-emerald-100' : 'bg-stone-100'}`}>
                        <Icon size={16} color={isSavings ? '#059669' : '#57534E'} />
                    </View>
                    <View>
                        <Text className="text-sm font-bold text-stone-900">{pocket.name}</Text>
                        <Text className="text-[11px] text-stone-500">{isSavings ? 'Interest Savings' : 'Everyday Wallet'}</Text>
                    </View>
                </View>

                <View className="flex-row items-center">
                    {isSavings && pocket.interest_rate ? (
                        <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full mr-2">
                            <Text className="text-[11px] font-bold text-emerald-700">{pocket.interest_rate}% p.a.</Text>
                        </View>
                    ) : null}

                    {onEdit && (
                        <Pressable
                            onPress={onEdit}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Edit pocket details"
                            className="p-1.5 rounded-lg bg-stone-100 active:bg-stone-200"
                        >
                            <Pencil size={13} color="#78716C" />
                        </Pressable>
                    )}
                </View>
            </View>

            <View className="flex-row items-end justify-between mt-1">
                <View>
                    <Text className="text-xs text-stone-400">Available Balance</Text>
                    <Text className="text-lg font-bold text-stone-900 tracking-tight">{formatCurrency(pocket.current_balance)}</Text>
                </View>

                {onQuickExpense && !isSavings ? (
                    <Pressable onPress={onQuickExpense} className="flex-row items-center bg-stone-100 px-3 py-1.5 rounded-xl active:bg-stone-200">
                        <ArrowDownLeft size={13} color="#D97757" />
                        <Text className="text-xs font-semibold text-stone-700 ml-1">Spend</Text>
                    </Pressable>
                ) : null}
            </View>

            {isSavings && pocket.savings_details ? (
                <View className="mt-2.5 pt-2 border-t border-stone-100">
                    <Text className="text-[11px] text-stone-500 italic">Note: {pocket.savings_details}</Text>
                </View>
            ) : null}
        </View>
    );
}
