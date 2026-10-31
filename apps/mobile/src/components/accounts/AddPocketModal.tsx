import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import type { PocketType } from '../../types/database';

interface AddPocketModalProps {
    visible: boolean;
    institutionId: string;
    institutionName: string;
    onClose: () => void;
    onSubmit: (data: {
        institutionId: string;
        name: string;
        pocketType: PocketType;
        startingBalance?: number;
        interestRate?: number | null;
        savingsDetails?: string;
    }) => Promise<void>;
}

export function AddPocketModal({ visible, institutionId, institutionName, onClose, onSubmit }: AddPocketModalProps) {
    const [pocketName, setPocketName] = useState('');
    const [pocketType, setPocketType] = useState<PocketType>('savings');
    const [startingBalanceStr, setStartingBalanceStr] = useState('');
    const [interestRateStr, setInterestRateStr] = useState('4.5');
    const [savingsDetails, setSavingsDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setError('');
        const rawAmount = parseFloat(startingBalanceStr.replace(/[^0-9.]/g, '')) || 0;
        const rate = interestRateStr ? parseFloat(interestRateStr) : null;

        if (!pocketName.trim()) {
            setError('Please provide a name for this pocket.');
            return;
        }

        try {
            setSubmitting(true);
            await onSubmit({
                institutionId,
                name: pocketName.trim(),
                pocketType,
                startingBalance: rawAmount,
                interestRate: pocketType === 'savings' ? rate : null,
                savingsDetails: pocketType === 'savings' ? savingsDetails.trim() || undefined : undefined
            });

            // Reset
            setPocketName('');
            setStartingBalanceStr('');
            setSavingsDetails('');
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to add pocket');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={submitting ? () => {} : onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/50">
                <View className="bg-white rounded-t-3xl p-6 max-h-[85%] border-t border-stone-100">
                    {/* Header */}
                    <View className="flex-row items-center justify-between pb-4 border-b border-stone-100">
                        <View>
                            <Text className="text-xl font-bold text-stone-900">Add Pocket</Text>
                            <Text className="text-xs text-stone-500">Under {institutionName}</Text>
                        </View>
                        <Pressable
                            onPress={onClose}
                            disabled={submitting}
                            pointerEvents={submitting ? 'none' : 'auto'}
                            accessibilityRole="button"
                            accessibilityLabel="Close modal"
                            className={`w-8 h-8 rounded-full bg-stone-100 items-center justify-center ${submitting ? 'opacity-40' : ''}`}
                        >
                            <X size={18} color="#78716C" />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} className="mt-4">
                        {error ? (
                            <View className="bg-red-50 p-3 rounded-xl mb-4 border border-red-200">
                                <Text className="text-xs text-red-600 font-medium">{error}</Text>
                            </View>
                        ) : null}

                        {/* Pocket Type Selector */}
                        <View className="flex-row bg-stone-100 p-1 rounded-xl mb-4">
                            <Pressable
                                onPress={() => setPocketType('wallet')}
                                disabled={submitting}
                                className={`flex-1 py-2 rounded-lg items-center ${
                                    submitting ? 'opacity-60' : ''
                                } ${pocketType === 'wallet' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Text className={`text-xs font-semibold ${pocketType === 'wallet' ? 'text-stone-900' : 'text-stone-500'}`}>
                                    Everyday Wallet (0%)
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() => setPocketType('savings')}
                                disabled={submitting}
                                className={`flex-1 py-2 rounded-lg items-center ${
                                    submitting ? 'opacity-60' : ''
                                } ${pocketType === 'savings' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Text className={`text-xs font-semibold ${pocketType === 'savings' ? 'text-stone-900' : 'text-stone-500'}`}>
                                    Interest Savings
                                </Text>
                            </Pressable>
                        </View>

                        {/* Pocket Name */}
                        <View className="mb-4">
                            <Text className="text-xs font-medium text-stone-600 mb-1">Pocket Name</Text>
                            <TextInput
                                value={pocketName}
                                onChangeText={setPocketName}
                                editable={!submitting}
                                placeholder="e.g. Travel Stash, Emergency Fund"
                                placeholderTextColor="#A8A29E"
                                className={`border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 ${
                                    submitting ? 'bg-stone-100 opacity-60' : 'bg-stone-50'
                                }`}
                            />
                        </View>

                        {/* Starting Balance */}
                        <View className="mb-4">
                            <Text className="text-xs font-medium text-stone-600 mb-1">Starting Balance (₱)</Text>
                            <TextInput
                                value={startingBalanceStr}
                                onChangeText={setStartingBalanceStr}
                                editable={!submitting}
                                placeholder="0.00"
                                keyboardType="numeric"
                                placeholderTextColor="#A8A29E"
                                className={`border border-stone-200 rounded-xl px-4 py-3 text-base font-semibold text-stone-900 ${
                                    submitting ? 'bg-stone-100 opacity-60' : 'bg-stone-50'
                                }`}
                            />
                        </View>

                        {/* Interest Rate & Details (if Savings) */}
                        {pocketType === 'savings' ? (
                            <View className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/60 mb-4">
                                <Text className="text-xs font-bold text-emerald-800 mb-3">Interest Settings</Text>

                                <View className="mb-3">
                                    <Text className="text-xs font-medium text-emerald-900 mb-1">Annual Interest Rate (% p.a.)</Text>
                                    <TextInput
                                        value={interestRateStr}
                                        onChangeText={setInterestRateStr}
                                        editable={!submitting}
                                        placeholder="e.g. 4.5"
                                        keyboardType="numeric"
                                        placeholderTextColor="#059669"
                                        className={`border border-emerald-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-emerald-950 ${
                                            submitting ? 'bg-emerald-50/40 opacity-60' : 'bg-white'
                                        }`}
                                    />
                                </View>

                                <View>
                                    <Text className="text-xs font-medium text-emerald-900 mb-1">Details / Purpose Note</Text>
                                    <TextInput
                                        value={savingsDetails}
                                        onChangeText={setSavingsDetails}
                                        editable={!submitting}
                                        placeholder="e.g. Credited daily, for vacation"
                                        placeholderTextColor="#6EE7B7"
                                        className={`border border-emerald-300 rounded-xl px-4 py-2.5 text-xs text-stone-900 ${
                                            submitting ? 'bg-emerald-50/40 opacity-60' : 'bg-white'
                                        }`}
                                    />
                                </View>
                            </View>
                        ) : null}

                        {/* Save Button */}
                        <Pressable
                            onPress={handleSave}
                            disabled={submitting}
                            className={`bg-[#18342B] py-4 rounded-2xl items-center mt-2 mb-6 ${submitting ? 'opacity-50' : 'active:opacity-90'}`}
                        >
                            <Text className="text-white font-bold text-base">{submitting ? 'Adding Pocket...' : 'Add Pocket'}</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
