import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { INSTITUTION_OPTIONS, getInstitutionConfig, type InstitutionConfig } from '../../constants/institutions';
import { InstitutionLogo } from './InstitutionLogo';
import { SearchableSelectField, type SelectOption } from '../common/SearchableSelectModal';
import type { PocketType } from '../../types/database';
import { useKeyboardBottomInset } from '../../hooks/useKeyboardBottomInset';

interface AddAccountModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: {
        code: string;
        customName?: string;
        notes?: string;
        pocketName: string;
        pocketType: PocketType;
        startingBalance: number;
        interestRate?: number | null;
        savingsDetails?: string;
    }) => Promise<void>;
    onSwitchToLoan?: () => void;
}

export function AddAccountModal({ visible, onClose, onSubmit, onSwitchToLoan }: AddAccountModalProps) {
    const [selectedCode, setSelectedCode] = useState<string>('maya');
    const [customName, setCustomName] = useState('');
    const [notes, setNotes] = useState('');
    const [pocketName, setPocketName] = useState('Main Wallet');
    const [pocketType, setPocketType] = useState<PocketType>('wallet');
    const [startingBalanceStr, setStartingBalanceStr] = useState('');
    const [interestRateStr, setInterestRateStr] = useState('');
    const [savingsDetails, setSavingsDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const keyboardInset = useKeyboardBottomInset(36);

    const selectedConfig = getInstitutionConfig(selectedCode);

    const handleSelectInstitution = (config: InstitutionConfig) => {
        setSelectedCode(config.code);
        setPocketName(config.defaultPocketName);
        if (config.supportsInterest) {
            setInterestRateStr(config.defaultInterestRate ? String(config.defaultInterestRate) : '');
        } else {
            setInterestRateStr('');
            setPocketType('wallet');
        }
    };

    const handleSave = async () => {
        setError('');
        const rawAmount = parseFloat(startingBalanceStr.replace(/[^0-9.]/g, '')) || 0;
        const rate = interestRateStr ? parseFloat(interestRateStr) : null;

        if (!pocketName.trim()) {
            setError('Please provide a name for this pocket/account.');
            return;
        }

        try {
            setSubmitting(true);
            await onSubmit({
                code: selectedCode,
                customName: customName.trim() || undefined,
                notes: notes.trim() || undefined,
                pocketName: pocketName.trim(),
                pocketType,
                startingBalance: rawAmount,
                interestRate: rate,
                savingsDetails: savingsDetails.trim() || undefined
            });

            // Reset
            setStartingBalanceStr('');
            setCustomName('');
            setNotes('');
            setSavingsDetails('');
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to create account');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={submitting ? () => {} : onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/50">
                <View className="bg-white rounded-t-3xl p-6 max-h-[90%] border-t border-stone-100">
                    {/* Header */}
                    <View className="flex-row items-center justify-between pb-4 border-b border-stone-100">
                        <Text className="text-xl font-bold text-stone-900">Add Account</Text>
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

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: keyboardInset }}
                        className="mt-4"
                    >
                        {error ? (
                            <View className="bg-red-50 p-3 rounded-xl mb-4 border border-red-200">
                                <Text className="text-xs text-red-600 font-medium">{error}</Text>
                            </View>
                        ) : null}

                        {onSwitchToLoan && (
                            <Pressable
                                onPress={onSwitchToLoan}
                                disabled={submitting}
                                className={`mb-4 p-3.5 bg-amber-50 rounded-2xl border border-amber-200/90 flex-row items-center justify-between ${
                                    submitting ? 'opacity-60' : 'active:bg-amber-100'
                                }`}
                            >
                                <View className="flex-1 mr-2">
                                    <Text className="text-xs font-bold text-amber-900">Adding a Loan or Credit Line?</Text>
                                    <Text className="text-[11px] text-amber-800/80 mt-0.5">
                                        For GLoan, Maya Credit, BDO/BPI Loans, BillEase, or Tala.
                                    </Text>
                                </View>
                                <View className="bg-amber-700 px-3 py-1.5 rounded-xl">
                                    <Text className="text-xs font-bold text-white">Add Loan →</Text>
                                </View>
                            </Pressable>
                        )}

                        {/* 1. Select Institution via Searchable Dropdown */}
                        <SearchableSelectField
                            label="1. Choose Bank or E-Wallet"
                            modalTitle="Select Bank or E-Wallet"
                            searchPlaceholder="Search BDO, BPI, GCash, Maya, SeaBank..."
                            disabled={submitting}
                            options={INSTITUTION_OPTIONS.map((item): SelectOption => ({
                                id: item.code,
                                label: item.name,
                                subtitle: item.type === 'ewallet' ? 'E-Wallet' : item.type === 'bank' ? 'Bank' : 'Cash',
                                badge: item.defaultInterestRate ? `${item.defaultInterestRate}% p.a.` : undefined,
                                icon: <InstitutionLogo code={item.code} size={28} />
                            }))}
                            selectedId={selectedCode}
                            onSelect={(opt) => handleSelectInstitution(getInstitutionConfig(opt.id))}
                        />

                        {/* Custom Name (Optional) */}
                        <View className="mb-4">
                            <Text className="text-xs font-medium text-stone-600 mb-1">Custom Account Name (Optional)</Text>
                            <TextInput
                                value={customName}
                                onChangeText={setCustomName}
                                editable={!submitting}
                                placeholder={`e.g. My Primary ${selectedConfig.name}`}
                                placeholderTextColor="#A8A29E"
                                className={`border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 ${
                                    submitting ? 'bg-stone-100 opacity-60' : 'bg-stone-50'
                                }`}
                            />
                        </View>

                        {/* Account Note / Description (Optional) */}
                        <View className="mb-4">
                            <Text className="text-xs font-medium text-stone-600 mb-1">Account Note / Details (Optional)</Text>
                            <TextInput
                                value={notes}
                                onChangeText={setNotes}
                                editable={!submitting}
                                placeholder="e.g. Payroll account, Joint savings, Card #1234"
                                placeholderTextColor="#A8A29E"
                                className={`border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 ${
                                    submitting ? 'bg-stone-100 opacity-60' : 'bg-stone-50'
                                }`}
                            />
                        </View>

                        {/* 2. Configure Starting Pocket */}
                        <Text className="text-xs font-semibold uppercase tracking-wider text-stone-500 mt-2 mb-2">2. Initial Pocket Details</Text>

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
                                placeholder="e.g. Main Wallet or Emergency Savings"
                                placeholderTextColor="#A8A29E"
                                className={`border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 ${
                                    submitting ? 'bg-stone-100 opacity-60' : 'bg-stone-50'
                                }`}
                            />
                        </View>

                        {/* Starting Balance */}
                        <View className="mb-4">
                            <Text className="text-xs font-medium text-stone-600 mb-1">Starting Base Money (₱)</Text>
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
                                <Text className="text-xs font-bold text-emerald-800 mb-3">Interest Savings Settings</Text>

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
                                    <Text className="text-xs font-medium text-emerald-900 mb-1">Details / Goal Note</Text>
                                    <TextInput
                                        value={savingsDetails}
                                        onChangeText={setSavingsDetails}
                                        editable={!submitting}
                                        placeholder="e.g. Credited daily, Emergency Fund"
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
                            <Text className="text-white font-bold text-base">{submitting ? 'Creating Account...' : 'Create Account'}</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
