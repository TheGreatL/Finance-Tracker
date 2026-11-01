import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { X, Check, Wallet, Calendar, ChevronDown, Sparkles } from 'lucide-react-native';
import type { LoanRecord, AccountPocket, RecordLoanPaymentInput } from '../../types/database';
import { formatCurrency, formatDisplayDate, formatMoneyInput, parseMoneyInput } from '../../utils/formatters';
import { DatePickerModal } from '../common/DatePickerModal';
import { SearchableSelectField, type SelectOption } from '../common/SearchableSelectModal';
import { PocketBadge } from '../accounts/PocketBadge';
import { useKeyboardBottomInset } from '../../hooks/useKeyboardBottomInset';

interface LoanPaymentModalProps {
    visible: boolean;
    loan: LoanRecord | null;
    pockets: (AccountPocket & { institution_name?: string; institution_code?: string; institution_color?: string })[];
    onClose: () => void;
    onSubmit: (input: RecordLoanPaymentInput) => Promise<void>;
}

export function LoanPaymentModal({ visible, loan, pockets, onClose, onSubmit }: LoanPaymentModalProps) {
    const [selectedPocketId, setSelectedPocketId] = useState<string>('');
    const [amountStr, setAmountStr] = useState('');
    const [interestCashbackStr, setInterestCashbackStr] = useState('');
    const [dateStr, setDateStr] = useState(() => new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const keyboardInset = useKeyboardBottomInset(36);

    useEffect(() => {
        if (loan) {
            setAmountStr(formatMoneyInput(String(Math.min(loan.monthly_payment, loan.remaining_balance))));
            setInterestCashbackStr('');
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
        const amount = parseMoneyInput(amountStr);
        const interestCashback = interestCashbackStr ? parseMoneyInput(interestCashbackStr) : 0;

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
                notes: notes.trim() || undefined,
                interestCashback: interestCashback > 0 ? interestCashback : undefined,
                cashbackPocketId: interestCashback > 0 ? selectedPocketId : undefined
            });
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to record loan payment');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePayFullBalance = () => {
        setAmountStr(formatMoneyInput(String(loan.remaining_balance)));
    };

    return (
        <>
            <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={submitting ? () => {} : onClose}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 max-h-[92%] border-t border-stone-100">
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
                                    badge: `${formatCurrency(p.current_balance)} available`,
                                    icon: <PocketBadge institutionCode={p.institution_code} pocketType={p.pocket_type} size={24} />
                                }))}
                                selectedId={selectedPocketId}
                                onSelect={(opt) => setSelectedPocketId(opt.id)}
                            />

                            {/* Quick Pay Full Balance Pill */}
                            <View className="flex-row items-center justify-between mb-2 mt-1">
                                <Text className="text-xs font-semibold text-stone-700">Payment Amount</Text>
                                <Pressable
                                    onPress={handlePayFullBalance}
                                    disabled={submitting}
                                    className="bg-stone-100 active:bg-stone-200 px-2.5 py-1 rounded-lg border border-stone-200"
                                >
                                    <Text className="text-[11px] font-bold text-[#18342B]">
                                        Pay Full Balance ({formatCurrency(loan.remaining_balance)})
                                    </Text>
                                </Pressable>
                            </View>

                            {/* 2. Payment Amount & Date */}
                            <View className="flex-row gap-3 mb-3">
                                <View className="flex-1">
                                    <TextInput
                                        value={amountStr}
                                        onChangeText={(val) => setAmountStr(formatMoneyInput(val))}
                                        editable={!submitting}
                                        placeholder="₱2,500"
                                        placeholderTextColor="#A8A29E"
                                        keyboardType="decimal-pad"
                                        className={`border border-stone-200 rounded-xl px-4 py-3 text-base text-stone-900 font-bold ${
                                            submitting ? 'bg-stone-100 opacity-60' : 'bg-stone-50'
                                        }`}
                                    />
                                </View>

                                <View className="flex-1">
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

                            {/* Interest Cashback Section (if loan has interest cashback enabled) */}
                            {loan.has_interest_cashback ? (
                                <View className="bg-teal-50/70 p-3.5 rounded-2xl border border-teal-200 mb-3">
                                    <View className="flex-row items-center mb-1">
                                        <Sparkles size={14} color="#0D9488" />
                                        <Text className="text-xs font-bold text-teal-900 ml-1.5">Interest Cashback Rebate (Optional)</Text>
                                    </View>
                                    <Text className="text-[11px] text-teal-700 mb-2 leading-snug">
                                        If settling early, enter the refund credited back by lender (e.g. GLoan). This amount will be added to your
                                        selected account.
                                    </Text>
                                    <TextInput
                                        value={interestCashbackStr}
                                        onChangeText={(val) => setInterestCashbackStr(formatMoneyInput(val))}
                                        editable={!submitting}
                                        placeholder="e.g. ₱450.00"
                                        placeholderTextColor="#99F6E4"
                                        keyboardType="decimal-pad"
                                        className={`border border-teal-200 rounded-xl px-3.5 py-2.5 text-sm text-teal-950 font-bold bg-white ${
                                            submitting ? 'opacity-60' : ''
                                        }`}
                                    />
                                </View>
                            ) : null}

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
