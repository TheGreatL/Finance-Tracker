import React, { useState } from 'react';
import { Modal, View, Text, Pressable, Alert } from 'react-native';
import { X, Trash2, ArrowDownLeft, ArrowUpRight, Repeat, Calendar, Tag, Wallet, Pencil } from 'lucide-react-native';
import type { TransactionRecord } from '../../types/database';
import { formatSignedCurrency, formatRelativeDate } from '../../utils/formatters';
import { InstitutionLogo } from '../accounts/InstitutionLogo';

interface TransactionDetailSheetProps {
    visible: boolean;
    transaction: TransactionRecord | null;
    onClose: () => void;
    onDelete: (id: string) => Promise<void>;
    onEdit?: (transaction: TransactionRecord) => void;
}

export function TransactionDetailSheet({ visible, transaction, onClose, onDelete, onEdit }: TransactionDetailSheetProps) {
    const [deleting, setDeleting] = useState(false);

    if (!transaction) return null;

    const isIncome = transaction.type === 'income';
    const isExpense = transaction.type === 'expense';
    const isTransfer = transaction.type === 'transfer';

    const handleDelete = () => {
        Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction? The pocket balance will be automatically reversed.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setDeleting(true);
                        await onDelete(transaction.id);
                        onClose();
                    } catch (err: any) {
                        Alert.alert('Error', err?.message || 'Failed to delete transaction');
                    } finally {
                        setDeleting(false);
                    }
                }
            }
        ]);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white rounded-t-3xl p-6 border-t border-stone-100">
                    {/* Header */}
                    <View className="flex-row items-center justify-between pb-3 border-b border-stone-100">
                        <View className="flex-row items-center">
                            <View
                                className={`w-7 h-7 rounded-lg items-center justify-center mr-2 ${
                                    isIncome ? 'bg-emerald-100' : isExpense ? 'bg-orange-100' : 'bg-stone-100'
                                }`}
                            >
                                {isIncome ? (
                                    <ArrowUpRight size={15} color="#059669" />
                                ) : isExpense ? (
                                    <ArrowDownLeft size={15} color="#D97757" />
                                ) : (
                                    <Repeat size={15} color="#18342B" />
                                )}
                            </View>
                            <Text className="text-sm font-bold text-stone-700 capitalize">{transaction.type} Details</Text>
                        </View>

                        <Pressable
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                            className="w-8 h-8 rounded-full bg-stone-100 items-center justify-center"
                        >
                            <X size={18} color="#78716C" />
                        </Pressable>
                    </View>

                    {/* Amount Display */}
                    <View className="items-center py-6 border-b border-stone-100">
                        <Text className="text-xs text-stone-400 mb-1">Transaction Total</Text>
                        <Text
                            className={`text-3xl font-extrabold tracking-tight ${
                                isIncome ? 'text-emerald-600' : isExpense ? 'text-[#D97757]' : 'text-stone-900'
                            }`}
                        >
                            {formatSignedCurrency(transaction.amount, transaction.type)}
                        </Text>
                        <Text className="text-base font-bold text-stone-800 mt-1">{transaction.title}</Text>
                    </View>

                    {/* Metadata Rows */}
                    <View className="py-4 space-y-3">
                        {/* Account / Pocket */}
                        <View className="flex-row items-center justify-between py-1.5">
                            <View className="flex-row items-center">
                                {transaction.institution_code ? (
                                    <InstitutionLogo code={transaction.institution_code} size={16} />
                                ) : (
                                    <Wallet size={15} color="#A8A29E" />
                                )}
                                <Text className="text-xs text-stone-500 ml-2">{isTransfer ? 'From Pocket' : 'Account Pocket'}</Text>
                            </View>
                            <Text className="text-xs font-bold text-stone-900">
                                {transaction.institution_name ? `${transaction.institution_name} • ` : ''}
                                {transaction.pocket_name || 'Wallet'}
                            </Text>
                        </View>

                        {/* Destination Pocket (if Transfer) */}
                        {isTransfer ? (
                            <View className="flex-row items-center justify-between py-1.5">
                                <View className="flex-row items-center">
                                    <Repeat size={15} color="#A8A29E" />
                                    <Text className="text-xs text-stone-500 ml-2">To Pocket</Text>
                                </View>
                                <Text className="text-xs font-bold text-stone-900">
                                    {transaction.to_institution_name ? `${transaction.to_institution_name} • ` : ''}
                                    {transaction.to_pocket_name || 'Destination'}
                                </Text>
                            </View>
                        ) : null}

                        {/* Category */}
                        <View className="flex-row items-center justify-between py-1.5">
                            <View className="flex-row items-center">
                                <Tag size={15} color="#A8A29E" />
                                <Text className="text-xs text-stone-500 ml-2">Category</Text>
                            </View>
                            <Text className="text-xs font-bold text-stone-900">{transaction.category}</Text>
                        </View>

                        {/* Date */}
                        <View className="flex-row items-center justify-between py-1.5">
                            <View className="flex-row items-center">
                                <Calendar size={15} color="#A8A29E" />
                                <Text className="text-xs text-stone-500 ml-2">Date</Text>
                            </View>
                            <Text className="text-xs font-bold text-stone-900">{formatRelativeDate(transaction.date)}</Text>
                        </View>

                        {/* Notes */}
                        {transaction.notes ? (
                            <View className="pt-2">
                                <Text className="text-xs text-stone-400 mb-0.5">Notes</Text>
                                <Text className="text-xs text-stone-700 italic">{transaction.notes}</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Action Buttons: Edit Details & Delete */}
                    {onEdit && (
                        <Pressable
                            onPress={() => {
                                onClose();
                                onEdit(transaction);
                            }}
                            className="flex-row items-center justify-center bg-stone-100 py-3.5 rounded-2xl border border-stone-200 mt-2 active:bg-stone-200 shadow-xs"
                        >
                            <Pencil size={16} color="#18342B" />
                            <Text className="text-xs font-bold text-stone-900 ml-2">Edit Details</Text>
                        </Pressable>
                    )}

                    <Pressable
                        onPress={handleDelete}
                        disabled={deleting}
                        className="flex-row items-center justify-center bg-red-50 py-3.5 rounded-2xl border border-red-200 mt-2.5 mb-4 active:bg-red-100"
                    >
                        <Trash2 size={16} color="#DC2626" />
                        <Text className="text-xs font-bold text-red-600 ml-2">
                            {deleting ? 'Reversing...' : 'Delete Transaction & Reverse Balance'}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}
