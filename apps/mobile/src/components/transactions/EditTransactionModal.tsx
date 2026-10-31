import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { X, Lock, Calendar, Tag, FileText, Check, AlertCircle } from 'lucide-react-native';
import type { TransactionRecord } from '../../types/database';
import { DatePickerModal } from '../common/DatePickerModal';
import { SearchableSelectField, type SelectOption } from '../common/SearchableSelectModal';
import { formatSignedCurrency } from '../../utils/formatters';
import { InstitutionLogo } from '../accounts/InstitutionLogo';

interface EditTransactionModalProps {
    visible: boolean;
    transaction: TransactionRecord | null;
    onClose: () => void;
    onSave: (id: string, updates: { title: string; category: string; date: string; notes?: string }) => Promise<void>;
}

const CATEGORY_OPTIONS: SelectOption[] = [
    { id: 'Food & Dining', label: 'Food & Dining', subtitle: 'Expense' },
    { id: 'Groceries', label: 'Groceries', subtitle: 'Expense' },
    { id: 'Transportation', label: 'Transportation', subtitle: 'Expense' },
    { id: 'Bills & Utilities', label: 'Bills & Utilities', subtitle: 'Expense' },
    { id: 'Housing & Rent', label: 'Housing & Rent', subtitle: 'Expense' },
    { id: 'Healthcare', label: 'Healthcare', subtitle: 'Expense' },
    { id: 'Entertainment', label: 'Entertainment', subtitle: 'Expense' },
    { id: 'Shopping', label: 'Shopping', subtitle: 'Expense' },
    { id: 'Subscriptions', label: 'Subscriptions', subtitle: 'Expense' },
    { id: 'Salary', label: 'Salary', subtitle: 'Income' },
    { id: 'Freelance', label: 'Freelance', subtitle: 'Income' },
    { id: 'Investments', label: 'Investments', subtitle: 'Income' },
    { id: 'Gifts & Allowance', label: 'Gifts & Allowance', subtitle: 'Income' },
    { id: 'Transfer', label: 'Transfer', subtitle: 'Transfer' },
    { id: 'Loan Payment', label: 'Loan Payment', subtitle: 'Debt' },
    { id: 'Other', label: 'Other', subtitle: 'General' }
];

export function EditTransactionModal({ visible, transaction, onClose, onSave }: EditTransactionModalProps) {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState('');
    const [notes, setNotes] = useState('');
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (transaction) {
            setTitle(transaction.title || '');
            setCategory(transaction.category || 'Other');
            setDate(transaction.date || new Date().toISOString().split('T')[0]);
            setNotes(transaction.notes || '');
        }
    }, [transaction]);

    if (!transaction) return null;

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Required Field', 'Please enter a transaction title.');
            return;
        }
        try {
            setSaving(true);
            await onSave(transaction.id, {
                title: title.trim(),
                category: category.trim() || 'Other',
                date,
                notes: notes.trim()
            });
            onClose();
        } catch (err: any) {
            Alert.alert('Save Failed', err?.message || 'Could not update transaction details.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/50">
                <View className="bg-stone-50 rounded-t-3xl max-h-[90%] border-t border-stone-100">
                    {/* Header */}
                    <View className="bg-white px-6 pt-5 pb-4 rounded-t-3xl border-b border-stone-200/80 flex-row items-center justify-between">
                        <View>
                            <Text className="text-lg font-bold text-stone-900">Edit Transaction Details</Text>
                            <Text className="text-xs text-stone-500">Update descriptive metadata</Text>
                        </View>
                        <Pressable onPress={onClose} hitSlop={8} className="w-8 h-8 rounded-full bg-stone-100 items-center justify-center">
                            <X size={18} color="#78716C" />
                        </Pressable>
                    </View>

                    <ScrollView className="px-6 py-4 space-y-4" showsVerticalScrollIndicator={false}>
                        {/* Protected Financial Movement Banner */}
                        <View className="bg-amber-50 p-4 rounded-2xl border border-amber-200/70 mb-2">
                            <View className="flex-row items-center justify-between mb-1">
                                <View className="flex-row items-center">
                                    <Lock size={14} color="#B45309" />
                                    <Text className="text-xs font-bold text-amber-900 ml-1.5 uppercase tracking-wider">Ledger Protected</Text>
                                </View>
                                <Text className="text-sm font-extrabold text-stone-900">
                                    {formatSignedCurrency(transaction.amount, transaction.type)}
                                </Text>
                            </View>
                            <View className="flex-row items-center mt-1">
                                {transaction.institution_code ? (
                                    <InstitutionLogo code={transaction.institution_code} size={16} className="mr-1.5" />
                                ) : null}
                                <Text className="text-xs text-stone-600 font-medium">
                                    {transaction.institution_name ? `${transaction.institution_name} • ` : ''}
                                    {transaction.pocket_name || 'Wallet'}
                                </Text>
                            </View>
                            <Text className="text-[11px] text-amber-800/80 mt-2 leading-relaxed">
                                Money amount and account pocket are protected to maintain balance integrity. To modify cash movements, delete and
                                re-enter.
                            </Text>
                        </View>

                        {/* Title Field */}
                        <View className="mb-3">
                            <Text className="text-xs font-bold text-stone-700 mb-1.5">Title / Description *</Text>
                            <TextInput
                                value={title}
                                onChangeText={setTitle}
                                placeholder="e.g. SM Supermarket Groceries"
                                placeholderTextColor="#A8A29E"
                                className="bg-white px-4 py-3 rounded-2xl border border-stone-200 text-sm text-stone-900"
                            />
                        </View>

                        {/* Category Select */}
                        <View className="mb-3">
                            <SearchableSelectField
                                label="Category"
                                options={CATEGORY_OPTIONS}
                                selectedId={category}
                                onSelect={(opt) => setCategory(opt.id)}
                                placeholder="Choose category"
                            />
                        </View>

                        {/* Date Picker Field */}
                        <View className="mb-3">
                            <Text className="text-xs font-bold text-stone-700 mb-1.5">Transaction Date</Text>
                            <Pressable
                                onPress={() => setDatePickerVisible(true)}
                                className="flex-row items-center justify-between bg-white px-4 py-3 rounded-2xl border border-stone-200"
                            >
                                <View className="flex-row items-center">
                                    <Calendar size={16} color="#78716C" />
                                    <Text className="text-sm font-medium text-stone-900 ml-2">{date}</Text>
                                </View>
                                <Text className="text-xs text-[#18342B] font-bold">Change</Text>
                            </Pressable>
                        </View>

                        {/* Notes Field */}
                        <View className="mb-4">
                            <Text className="text-xs font-bold text-stone-700 mb-1.5">Notes (Optional)</Text>
                            <TextInput
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="Additional details, itemized memo, or tags..."
                                placeholderTextColor="#A8A29E"
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                className="bg-white px-4 py-3 rounded-2xl border border-stone-200 text-sm text-stone-900 min-h-[75px]"
                            />
                        </View>

                        {/* Save Button */}
                        <Pressable
                            onPress={handleSave}
                            disabled={saving}
                            className="bg-[#18342B] py-3.5 rounded-2xl items-center flex-row justify-center active:opacity-90 mb-6 shadow-xs"
                        >
                            <Check size={18} color="#FFFFFF" />
                            <Text className="text-white font-bold text-sm ml-2">{saving ? 'Saving...' : 'Save Changes'}</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>

            <DatePickerModal
                visible={datePickerVisible}
                initialDate={date}
                onClose={() => setDatePickerVisible(false)}
                onSelectDate={(newDate) => {
                    setDate(newDate);
                    setDatePickerVisible(false);
                }}
            />
        </Modal>
    );
}
