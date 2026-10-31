import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { X, Lock, Check, Wallet, PiggyBank } from 'lucide-react-native';
import type { AccountPocket, PocketType } from '../../types/database';
import { formatCurrency } from '../../utils/formatters';
import { useKeyboardBottomInset } from '../../hooks/useKeyboardBottomInset';

interface EditPocketModalProps {
    visible: boolean;
    pocket: AccountPocket | null;
    institutionName?: string;
    onClose: () => void;
    onSave: (
        pocketId: string,
        updates: {
            name: string;
            pocketType: PocketType;
            interestRate?: number | null;
            savingsDetails?: string;
        }
    ) => Promise<void>;
}

export function EditPocketModal({ visible, pocket, institutionName, onClose, onSave }: EditPocketModalProps) {
    const [name, setName] = useState('');
    const [pocketType, setPocketType] = useState<PocketType>('wallet');
    const [interestRateStr, setInterestRateStr] = useState('');
    const [savingsDetails, setSavingsDetails] = useState('');
    const [saving, setSaving] = useState(false);
    const keyboardInset = useKeyboardBottomInset(36);

    useEffect(() => {
        if (pocket) {
            setName(pocket.name || '');
            setPocketType(pocket.pocket_type || 'wallet');
            setInterestRateStr(pocket.interest_rate !== null && pocket.interest_rate !== undefined ? pocket.interest_rate.toString() : '');
            setSavingsDetails(pocket.savings_details || '');
        }
    }, [pocket]);

    if (!pocket) return null;

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Required', 'Please enter a pocket name.');
            return;
        }

        let interestRate: number | null = null;
        if (pocketType === 'savings' && interestRateStr.trim()) {
            const parsed = parseFloat(interestRateStr.replace(/,/g, ''));
            if (!isNaN(parsed) && parsed >= 0) {
                interestRate = parsed;
            }
        }

        try {
            setSaving(true);
            await onSave(pocket.id, {
                name: name.trim(),
                pocketType,
                interestRate,
                savingsDetails: savingsDetails.trim()
            });
            onClose();
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to update pocket details.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={saving ? () => {} : onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/50">
                <View className="bg-stone-50 rounded-t-3xl max-h-[85%] border-t border-stone-100">
                    {/* Header */}
                    <View className="bg-white px-6 pt-5 pb-4 rounded-t-3xl border-b border-stone-200/80 flex-row items-center justify-between">
                        <View>
                            <Text className="text-lg font-bold text-stone-900">Edit Pocket Details</Text>
                            <Text className="text-xs text-stone-500">{institutionName || 'Account Pocket'}</Text>
                        </View>
                        <Pressable
                            onPress={onClose}
                            disabled={saving}
                            pointerEvents={saving ? 'none' : 'auto'}
                            hitSlop={8}
                            className={`w-8 h-8 rounded-full bg-stone-100 items-center justify-center ${saving ? 'opacity-40' : ''}`}
                        >
                            <X size={18} color="#78716C" />
                        </Pressable>
                    </View>

                    <ScrollView
                        className="px-6 py-4 space-y-4"
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: keyboardInset }}
                    >
                        {/* Protected Balance Banner */}
                        <View className="bg-amber-50 p-4 rounded-2xl border border-amber-200/70 mb-2">
                            <View className="flex-row items-center justify-between mb-1">
                                <View className="flex-row items-center">
                                    <Lock size={14} color="#B45309" />
                                    <Text className="text-xs font-bold text-amber-900 ml-1.5 uppercase tracking-wider">Balance Protected</Text>
                                </View>
                                <Text className="text-sm font-extrabold text-stone-900">{formatCurrency(pocket.current_balance)}</Text>
                            </View>
                            <Text className="text-[11px] text-amber-800/80 leading-relaxed mt-1">
                                Current balance is changed strictly through recorded income, expense, and transfer transactions.
                            </Text>
                        </View>

                        {/* Pocket Name */}
                        <View className="mb-3">
                            <Text className="text-xs font-bold text-stone-700 mb-1.5">Pocket Name *</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                editable={!saving}
                                placeholder="e.g. Daily Expenses, High Yield Savings"
                                placeholderTextColor="#A8A29E"
                                className={`px-4 py-3 rounded-2xl border border-stone-200 text-sm text-stone-900 ${
                                    saving ? 'bg-stone-100 opacity-60' : 'bg-white'
                                }`}
                            />
                        </View>

                        {/* Pocket Type */}
                        <View className="mb-3">
                            <Text className="text-xs font-bold text-stone-700 mb-1.5">Pocket Type</Text>
                            <View className="flex-row space-x-3">
                                <Pressable
                                    onPress={() => setPocketType('wallet')}
                                    disabled={saving}
                                    className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl border mr-2 ${
                                        saving ? 'opacity-60 ' : ''
                                    }${pocketType === 'wallet' ? 'bg-[#18342B] border-[#18342B]' : 'bg-white border-stone-200'}`}
                                >
                                    <Wallet size={16} color={pocketType === 'wallet' ? '#BBD583' : '#78716C'} />
                                    <Text className={`text-xs font-bold ml-1.5 ${pocketType === 'wallet' ? 'text-white' : 'text-stone-700'}`}>
                                        Spending Wallet
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => setPocketType('savings')}
                                    disabled={saving}
                                    className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl border ${
                                        saving ? 'opacity-60 ' : ''
                                    }${pocketType === 'savings' ? 'bg-[#18342B] border-[#18342B]' : 'bg-white border-stone-200'}`}
                                >
                                    <PiggyBank size={16} color={pocketType === 'savings' ? '#BBD583' : '#78716C'} />
                                    <Text className={`text-xs font-bold ml-1.5 ${pocketType === 'savings' ? 'text-white' : 'text-stone-700'}`}>
                                        Savings Pocket
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Savings Interest Rate if type === 'savings' */}
                        {pocketType === 'savings' && (
                            <View className="mb-3">
                                <Text className="text-xs font-bold text-stone-700 mb-1.5">Annual Interest Rate (%)</Text>
                                <TextInput
                                    value={interestRateStr}
                                    onChangeText={setInterestRateStr}
                                    editable={!saving}
                                    keyboardType="numeric"
                                    placeholder="e.g. 4.5"
                                    placeholderTextColor="#A8A29E"
                                    className={`px-4 py-3 rounded-2xl border border-stone-200 text-sm text-stone-900 ${
                                        saving ? 'bg-stone-100 opacity-60' : 'bg-white'
                                    }`}
                                />
                            </View>
                        )}

                        {/* Savings Details / Notes */}
                        <View className="mb-4">
                            <Text className="text-xs font-bold text-stone-700 mb-1.5">Description / Purpose</Text>
                            <TextInput
                                value={savingsDetails}
                                onChangeText={setSavingsDetails}
                                editable={!saving}
                                placeholder="Target goals, maturity, or rules..."
                                placeholderTextColor="#A8A29E"
                                multiline
                                numberOfLines={2}
                                textAlignVertical="top"
                                className={`px-4 py-3 rounded-2xl border border-stone-200 text-sm text-stone-900 min-h-[60px] ${
                                    saving ? 'bg-stone-100 opacity-60' : 'bg-white'
                                }`}
                            />
                        </View>

                        {/* Save Button */}
                        <Pressable
                            onPress={handleSave}
                            disabled={saving}
                            className={`bg-[#18342B] py-3.5 rounded-2xl items-center flex-row justify-center mb-6 shadow-xs ${
                                saving ? 'opacity-50' : 'active:opacity-90'
                            }`}
                        >
                            <Check size={18} color="#FFFFFF" />
                            <Text className="text-white font-bold text-sm ml-2">{saving ? 'Saving...' : 'Save Pocket Details'}</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
