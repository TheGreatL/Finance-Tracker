import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { X, Check, Wallet, Calendar, ChevronDown } from 'lucide-react-native';
import type { LoanRecord, AccountPocket } from '../../types/database';
import { formatCurrency, formatDisplayDate } from '../../utils/formatters';
import { DatePickerModal } from '../common/DatePickerModal';
import { SearchableSelectField, type SelectOption } from '../common/SearchableSelectModal';

interface LoanPaymentModalProps {
    visible: boolean;
    loan: LoanRecord | null;
    pockets: (AccountPocket & { institution_name?: string })[];
    onClose: () => void;
    onSubmit: (input: { loanId: string; pocketId: string; amount: number; date: string; notes?: string }) => Promise<void>;
}

export function LoanPaymentModal({ visible, loan, pockets, onClose, onSubmit }: LoanPaymentModalProps) {
    const [selectedPocketId, setSelectedPocketId] = useState<string>('');
    const [amountStr, setAmountStr] = useState('');
    const [dateStr, setDateStr] = useState(() => new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (loan) {
            setAmountStr(String(Math.min(loan.monthly_payment, loan.remaining_balance)));
            setDateStr(new Date().toISOString().split('T')[0]);
            setNotes(`Payment for ${loan.title}`);
        }
        if (pockets.length > 0 && !selectedPocketId) {
            setSelectedPocketId(pockets[0].id);
        }
    }, [loan, pockets]);

    if (!loan) return null;

    const handleConfirm = async () => {
        setError('');
        const amount = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || 0;

        if (!selectedPocketId) {
            setError('Please select an account to pay from.');
            return;
        }
        if (amount <= 0) {
            setError('Please enter a valid payment amount.');
            return;
        }

        try {
            setSubmitting(true);
            await onSubmit({
                loanId: loan.id,
                pocketId: selectedPocketId,
                amount,
                date: dateStr,
                notes: notes.trim() || undefined
            });
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to record loan payment');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={submitting ? () => {} : onClose}>
                <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 max-h-[90%] border-t border-stone-100">
                        {/* Header */}
                        <View className="flex-row items-center justify-between pb-3 border-b border-stone-100">
                            <View>
                                <Text className="text-xl font-bold text-stone-900">Record Loan Payment</Text>
                                <Text className="text-xs text-stone-500">
                                    For {loan.title} • {formatCurrency(loan.remaining_balance)} left
                                </Text>
                            </View>
                            <Pressable
                                onPress={onClose}
                                disabled={submitting}
                                pointerEvents={submitting ? 'none' : 'auto'}
                                accessibilityRole="button"
                                accessibilityLabel="Close modal"
                                hitSlop={8}
                                pressRetentionOffset={20}
                                className={`w-8 h-8 rounded-full bg-stone-100 items-center justify-center ${submitting ? 'opacity-40' : ''}`}
                            >
                                <X size={18} color="#78716C" />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" className="mt-4">
                            {error ? (
                                <View className="bg-red-50 p-3 rounded-xl mb-4 border border-red-200">
                                    <Text className="text-xs text-red-600 font-medium">{error}</Text>
                                </View>
                            ) : null}

                            {/* 1. Select Paying Pocket */}
                            <SearchableSelectField
                                label="1. Deduct From (Source Account) *"
                                modalTitle="Select Payment Account"
                                searchPlaceholder="Search bank, e-wallet, or pocket..."
                                placeholder="Select a pocket or wallet..."
                                disabled={submitting}
                                options={pockets.map((p): SelectOption => ({
                                    id: p.id,
                                    label: p.institution_name ? `${p.institution_name} • ${p.name}` : p.name,
                                    subtitle: p.pocket_type === 'savings' ? 'Interest Savings' : 'Everyday Wallet',
                                    badge: `${formatCurrency(p.current_balance)} available`
                                }))}
                                selectedId={selectedPocketId}
                                onSelect={(opt) => setSelectedPocketId(opt.id)}
                            />

                            {/* 2. Payment Amount & Date */}
                            <View className="flex-row gap-3 mb-3">
                                <View className="flex-1">
                                    <Text className="text-xs font-medium text-stone-600 mb-1">Amount to Pay (₱) *</Text>
                                    <TextInput
                                        value={amountStr}
                                        onChangeText={setAmountStr}
                                        editable={!submitting}
                                        placeholder="₱2,500"
                                        placeholderTextColor="#A8A29E"
                                        keyboardType="numeric"
                                        className={`border border-stone-200 rounded-xl px-4 py-3 text-base text-stone-900 font-extrabold ${
                                            submitting ? 'bg-stone-100 opacity-60' : 'bg-stone-50'
                                        }`}
                                    />
                                </View>

                                <View className="flex-1">
                                    <Text className="text-xs font-medium text-stone-600 mb-1">Payment Date *</Text>
                                    <Pressable
                                        onPress={() => setDatePickerVisible(true)}
                                        disabled={submitting}
                                        className={`border border-stone-200 rounded-xl px-3 py-3.5 flex-row items-center justify-between ${
                                            submitting ? 'bg-stone-100 opacity-60' : 'bg-stone-50 active:bg-stone-100'
                                        }`}
                                    >
                                        <View className="flex-row items-center flex-1 mr-1">
                                            <Calendar size={15} color="#78716C" />
                                            <Text className="text-xs text-stone-900 font-semibold ml-1.5" numberOfLines={1}>
                                                {formatDisplayDate(dateStr)}
                                            </Text>
                                        </View>
                                        <ChevronDown size={14} color="#A8A29E" />
                                    </Pressable>
                                </View>
                            </View>

                            {/* 3. Notes */}
                            <View className="mb-5">
                                <Text className="text-xs font-medium text-stone-600 mb-1">Payment Notes</Text>
                                <TextInput
                                    value={notes}
                                    onChangeText={setNotes}
                                    editable={!submitting}
                                    placeholder="e.g. October installment via GCash"
                                    placeholderTextColor="#A8A29E"
                                    className={`border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 ${
                                        submitting ? 'bg-stone-100 opacity-60' : 'bg-stone-50'
                                    }`}
                                />
                            </View>

                            {/* Confirm Button */}
                            <Pressable
                                onPress={handleConfirm}
                                disabled={submitting}
                                hitSlop={8}
                                pressRetentionOffset={20}
                                className={`bg-[#18342B] py-3.5 rounded-2xl items-center mb-6 ${submitting ? 'opacity-50' : 'active:opacity-90'}`}
                            >
                                <Text className="text-white font-bold text-sm">
                                    {submitting ? 'Processing Payment...' : 'Confirm Payment & Deduct Balance'}
                                </Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Date Picker Modal */}
            <DatePickerModal
                visible={datePickerVisible}
                initialDate={dateStr}
                title="Select Payment Date"
                onClose={() => setDatePickerVisible(false)}
                onSelectDate={(newDate) => setDateStr(newDate)}
            />
        </>
    );
}
