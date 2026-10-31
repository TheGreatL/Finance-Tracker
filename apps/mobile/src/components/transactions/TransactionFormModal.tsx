import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X, ArrowDownLeft, ArrowUpRight, Repeat } from 'lucide-react-native';
import type { AccountPocket, TransactionType } from '../../types/database';
import type { CreateTransactionInput } from '../../services/transactionService';
import { InstitutionLogo } from '../accounts/InstitutionLogo';
import { SearchableSelectField, type SelectOption } from '../common/SearchableSelectModal';
import { formatCurrency, formatMoneyInput, parseMoneyInput } from '../../utils/formatters';
import { useKeyboardBottomInset } from '../../hooks/useKeyboardBottomInset';

interface ActivePocket extends AccountPocket {
    institution_name: string;
    institution_code: string;
    institution_color: string;
}

interface TransactionFormModalProps {
    visible: boolean;
    initialType?: TransactionType;
    preselectedPocketId?: string;
    pockets: ActivePocket[];
    onClose: () => void;
    onSubmit: (input: CreateTransactionInput) => Promise<void>;
}

const EXPENSE_CATEGORIES = [
    'Food & Dining',
    'Groceries',
    'Transportation',
    'Bills & Utilities',
    'Housing & Rent',
    'Healthcare',
    'Entertainment',
    'Shopping',
    'Subscriptions',
    'Other'
];

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Gifts & Allowance', 'Other Income'];

export function TransactionFormModal({
    visible,
    initialType = 'expense',
    preselectedPocketId,
    pockets,
    onClose,
    onSubmit
}: TransactionFormModalProps) {
    const [type, setType] = useState<TransactionType>(initialType);
    const [amountStr, setAmountStr] = useState('');
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Groceries');
    const [pocketId, setPocketId] = useState<string>('');
    const [toPocketId, setToPocketId] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{ amount?: string; title?: string; pocketId?: string; toPocketId?: string }>({});
    const keyboardInset = useKeyboardBottomInset(36);

    useEffect(() => {
        if (visible) {
            setError('');
            setFieldErrors({});
            setType(initialType);
            setCategory(initialType === 'income' ? 'Salary' : initialType === 'transfer' ? 'Transfer' : 'Groceries');
            if (preselectedPocketId) {
                setPocketId(preselectedPocketId);
            } else if (pockets.length > 0 && !pocketId) {
                setPocketId(pockets[0].id);
            }
            if (pockets.length > 1 && !toPocketId) {
                const other = pockets.find((p) => p.id !== (preselectedPocketId || pockets[0].id));
                if (other) setToPocketId(other.id);
            }
        }
    }, [visible, initialType, preselectedPocketId, pockets]);

    const handleSave = async () => {
        setError('');
        const errors: { amount?: string; title?: string; pocketId?: string; toPocketId?: string } = {};
        const rawAmount = parseMoneyInput(amountStr);

        if (rawAmount <= 0) {
            errors.amount = 'Please enter an amount greater than ₱0.';
        }

        if (!title.trim()) {
            errors.title = 'Please enter a payee or description title.';
        }

        if (!pocketId) {
            errors.pocketId = 'Please select a payment pocket/account.';
        }

        if (type === 'transfer') {
            if (!toPocketId) {
                errors.toPocketId = 'Please select a destination pocket for the transfer.';
            } else if (toPocketId === pocketId) {
                errors.toPocketId = 'Source and destination pockets must be different.';
            }
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        try {
            setSubmitting(true);
            await onSubmit({
                title: title.trim(),
                pocket_id: pocketId,
                to_pocket_id: type === 'transfer' ? toPocketId : null,
                type,
                amount: rawAmount,
                category: type === 'transfer' ? 'Transfer' : category,
                notes: notes.trim() || undefined
            });

            // Clear & Close
            setAmountStr('');
            setTitle('');
            setNotes('');
            setFieldErrors({});
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to record transaction');
        } finally {
            setSubmitting(false);
        }
    };

    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={submitting ? () => {} : onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/50">
                <View className="bg-white rounded-t-3xl p-6 max-h-[90%] border-t border-stone-100">
                    {/* Header */}
                    <View className="flex-row items-center justify-between pb-4 border-b border-stone-100">
                        <Text className="text-xl font-bold text-stone-900">Record Transaction</Text>
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

                        {/* Type Selector (Expense / Income / Transfer) */}
                        <View className="flex-row bg-stone-100 p-1 rounded-2xl mb-5">
                            <Pressable
                                onPress={() => {
                                    setType('expense');
                                    setCategory('Groceries');
                                }}
                                disabled={submitting}
                                className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${
                                    submitting ? 'opacity-60' : ''
                                } ${type === 'expense' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <ArrowDownLeft size={14} color={type === 'expense' ? '#D97757' : '#78716C'} />
                                <Text className={`text-xs font-bold ml-1 ${type === 'expense' ? 'text-[#D97757]' : 'text-stone-500'}`}>Expense</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => {
                                    setType('income');
                                    setCategory('Salary');
                                }}
                                disabled={submitting}
                                className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${
                                    submitting ? 'opacity-60' : ''
                                } ${type === 'income' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <ArrowUpRight size={14} color={type === 'income' ? '#059669' : '#78716C'} />
                                <Text className={`text-xs font-bold ml-1 ${type === 'income' ? 'text-[#059669]' : 'text-stone-500'}`}>Income</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => {
                                    setType('transfer');
                                    setCategory('Transfer');
                                }}
                                disabled={submitting}
                                className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${
                                    submitting ? 'opacity-60' : ''
                                } ${type === 'transfer' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Repeat size={14} color={type === 'transfer' ? '#18342B' : '#78716C'} />
                                <Text className={`text-xs font-bold ml-1 ${type === 'transfer' ? 'text-[#18342B]' : 'text-stone-500'}`}>
                                    Transfer
                                </Text>
                            </Pressable>
                        </View>

                        {/* Large Amount Input */}
                        <View className="mb-5 items-center">
                            <Text className={`text-xs mb-1 ${fieldErrors.amount ? 'text-rose-600 font-semibold' : 'text-stone-400'}`}>Amount</Text>
                            <View
                                className={`flex-row items-center justify-center px-4 py-1.5 rounded-2xl ${
                                    fieldErrors.amount ? 'border border-rose-300 bg-rose-50/40' : ''
                                }`}
                            >
                                <Text className={`text-3xl font-bold mr-1.5 ${fieldErrors.amount ? 'text-rose-500' : 'text-stone-400'}`}>₱</Text>
                                <TextInput
                                    value={amountStr}
                                    onChangeText={(val) => {
                                        setAmountStr(formatMoneyInput(val));
                                        if (fieldErrors.amount) setFieldErrors((prev) => ({ ...prev, amount: undefined }));
                                    }}
                                    editable={!submitting}
                                    placeholder="0.00"
                                    keyboardType="decimal-pad"
                                    autoFocus
                                    placeholderTextColor="#D6D3D1"
                                    className={`text-4xl font-bold min-w-[120px] text-center ${
                                        fieldErrors.amount ? 'text-rose-700' : 'text-stone-900'
                                    } ${submitting ? 'opacity-60' : ''}`}
                                />
                            </View>
                            {fieldErrors.amount ? <Text className="text-[11px] font-medium text-rose-600 mt-1">{fieldErrors.amount}</Text> : null}
                        </View>

                        {/* Payee / Title */}
                        <View className="mb-4">
                            <Text className={`text-xs font-medium mb-1 ${fieldErrors.title ? 'text-rose-600 font-semibold' : 'text-stone-600'}`}>
                                Title / Payee
                            </Text>
                            <TextInput
                                value={title}
                                onChangeText={(val) => {
                                    setTitle(val);
                                    if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: undefined }));
                                }}
                                editable={!submitting}
                                placeholder={
                                    type === 'expense'
                                        ? 'e.g. Whole Foods, Shell Gasoline'
                                        : type === 'income'
                                          ? 'e.g. Monthly Salary, Freelance Gig'
                                          : 'e.g. Top up GoTyme from Maya'
                                }
                                placeholderTextColor="#A8A29E"
                                className={`rounded-xl px-4 py-3 text-sm text-stone-900 border ${
                                    fieldErrors.title ? 'border-rose-400 bg-rose-50/30' : 'border-stone-200 bg-stone-50'
                                } ${submitting ? 'bg-stone-100 opacity-60' : ''}`}
                            />
                            {fieldErrors.title ? <Text className="text-[11px] font-medium text-rose-600 mt-1">{fieldErrors.title}</Text> : null}
                        </View>

                        {/* Source Pocket Selector */}
                        <SearchableSelectField
                            label={type === 'transfer' ? 'From Pocket' : type === 'income' ? 'Deposit To' : 'Paid From'}
                            modalTitle={
                                type === 'transfer' ? 'Select Source Pocket' : type === 'income' ? 'Select Deposit Pocket' : 'Select Payment Pocket'
                            }
                            searchPlaceholder="Search bank, e-wallet, or pocket..."
                            disabled={submitting}
                            options={pockets.map((p): SelectOption => ({
                                id: p.id,
                                label: `${p.institution_name} • ${p.name}`,
                                subtitle: p.pocket_type === 'savings' ? 'Interest Savings' : 'Everyday Wallet',
                                badge: formatCurrency(p.current_balance),
                                icon: <InstitutionLogo code={p.institution_code} size={26} />
                            }))}
                            selectedId={pocketId}
                            onSelect={(opt) => {
                                setPocketId(opt.id);
                                if (fieldErrors.pocketId) setFieldErrors((prev) => ({ ...prev, pocketId: undefined }));
                            }}
                        />
                        {fieldErrors.pocketId ? (
                            <Text className="text-[11px] font-medium text-rose-600 -mt-2 mb-3 px-1">{fieldErrors.pocketId}</Text>
                        ) : null}

                        {/* Destination Pocket Selector (If Transfer) */}
                        {type === 'transfer' ? (
                            <>
                                <SearchableSelectField
                                    label="To Pocket"
                                    modalTitle="Select Destination Pocket"
                                    searchPlaceholder="Search destination pocket..."
                                    disabled={submitting}
                                    options={pockets
                                        .filter((p) => p.id !== pocketId)
                                        .map((p): SelectOption => ({
                                            id: p.id,
                                            label: `${p.institution_name} • ${p.name}`,
                                            subtitle: p.pocket_type === 'savings' ? 'Interest Savings' : 'Everyday Wallet',
                                            badge: formatCurrency(p.current_balance),
                                            icon: <InstitutionLogo code={p.institution_code} size={26} />
                                        }))}
                                    selectedId={toPocketId}
                                    onSelect={(opt) => {
                                        setToPocketId(opt.id);
                                        if (fieldErrors.toPocketId) setFieldErrors((prev) => ({ ...prev, toPocketId: undefined }));
                                    }}
                                />
                                {fieldErrors.toPocketId ? (
                                    <Text className="text-[11px] font-medium text-rose-600 -mt-2 mb-3 px-1">{fieldErrors.toPocketId}</Text>
                                ) : null}
                            </>
                        ) : null}

                        {/* Category Selector (If not Transfer) */}
                        {type !== 'transfer' ? (
                            <SearchableSelectField
                                label="Category"
                                modalTitle={type === 'income' ? 'Select Income Category' : 'Select Expense Category'}
                                searchPlaceholder="Search category..."
                                disabled={submitting}
                                options={categories.map((cat): SelectOption => ({
                                    id: cat,
                                    label: cat
                                }))}
                                selectedId={category}
                                onSelect={(opt) => setCategory(opt.id)}
                            />
                        ) : null}

                        {/* Notes */}
                        <View className="mb-6">
                            <Text className="text-xs font-medium text-stone-600 mb-1">Notes (Optional)</Text>
                            <TextInput
                                value={notes}
                                onChangeText={setNotes}
                                editable={!submitting}
                                placeholder="Add receipt ref, order #, etc."
                                placeholderTextColor="#A8A29E"
                                className={`border border-stone-200 rounded-xl px-4 py-2.5 text-xs text-stone-900 ${
                                    submitting ? 'bg-stone-100 opacity-60' : 'bg-stone-50'
                                }`}
                            />
                        </View>

                        {/* Submit Button */}
                        <Pressable
                            onPress={handleSave}
                            disabled={submitting}
                            className={`bg-[#18342B] py-4 rounded-2xl items-center mb-6 ${submitting ? 'opacity-50' : 'active:opacity-90'}`}
                        >
                            <Text className="text-white font-bold text-base">{submitting ? 'Saving...' : 'Save Transaction'}</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
