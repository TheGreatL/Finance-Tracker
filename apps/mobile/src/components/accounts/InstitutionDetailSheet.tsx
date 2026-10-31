import React, { useState, useEffect } from 'react';
import { Modal, View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { X, Plus, Pencil, Check } from 'lucide-react-native';
import type { Institution, AccountPocket, LoanRecord } from '../../types/database';
import { formatCurrency } from '../../utils/formatters';
import { PocketCard } from './PocketCard';
import { InstitutionLogo } from './InstitutionLogo';
import { LoanCard } from '../loans/LoanCard';

interface InstitutionDetailSheetProps {
    visible: boolean;
    institution: Institution | null;
    pockets: AccountPocket[];
    loans?: LoanRecord[];
    onClose: () => void;
    onAddPocket: () => void;
    onAddLoan?: () => void;
    onSelectLoan?: (loan: LoanRecord) => void;
    onQuickExpense?: (pocket: AccountPocket) => void;
    onUpdateNotes?: (institutionId: string, notes: string) => Promise<void>;
    onEditPocket?: (pocket: AccountPocket) => void;
}

export function InstitutionDetailSheet({
    visible,
    institution,
    pockets,
    loans = [],
    onClose,
    onAddPocket,
    onAddLoan,
    onSelectLoan,
    onQuickExpense,
    onUpdateNotes,
    onEditPocket
}: InstitutionDetailSheetProps) {
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [savingNote, setSavingNote] = useState(false);

    useEffect(() => {
        if (institution) {
            setNoteText(institution.notes || '');
            setIsEditingNote(false);
        }
    }, [institution]);

    if (!institution) return null;

    const totalBalance = pockets.reduce((sum, p) => sum + p.current_balance, 0);
    const activeLoans = (loans || []).filter((l) => l.status === 'active');
    const totalDebt = activeLoans.reduce((sum, l) => sum + l.remaining_balance, 0);
    const hasLoans = (loans || []).length > 0;
    const hasPockets = pockets.length > 0;

    const handleSaveNote = async () => {
        if (!institution || !onUpdateNotes) return;
        try {
            setSavingNote(true);
            const trimmed = noteText.trim();
            await onUpdateNotes(institution.id, trimmed);
            institution.notes = trimmed;
            setIsEditingNote(false);
        } finally {
            setSavingNote(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-stone-50 rounded-t-3xl max-h-[85%] border-t border-stone-100">
                    {/* Header */}
                    <View className="bg-white px-6 pt-5 pb-4 rounded-t-3xl border-b border-stone-200/80">
                        <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row items-center">
                                <InstitutionLogo code={institution.code} size={40} className="mr-3" />
                                <View>
                                    <Text className="text-lg font-bold text-stone-900">{institution.name}</Text>
                                    <Text className="text-xs text-stone-500 capitalize">{institution.type}</Text>
                                </View>
                            </View>

                            <Pressable
                                onPress={onClose}
                                accessibilityRole="button"
                                accessibilityLabel="Close sheet"
                                className="w-8 h-8 rounded-full bg-stone-100 items-center justify-center"
                            >
                                <X size={18} color="#78716C" />
                            </Pressable>
                        </View>

                        {/* Total Balance / Debt Card in Header */}
                        {hasLoans && hasPockets ? (
                            <View className="bg-stone-100/70 p-4 rounded-2xl">
                                <View className="flex-row items-center justify-between mb-2.5">
                                    <View className="flex-1 mr-2">
                                        <Text className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Pockets Balance</Text>
                                        <Text className="text-xl font-bold text-stone-900 tracking-tight">{formatCurrency(totalBalance)}</Text>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">Remaining Debt</Text>
                                        <Text className="text-xl font-bold text-amber-700 tracking-tight">{formatCurrency(totalDebt)}</Text>
                                    </View>
                                </View>

                                <View className="flex-row items-center justify-end pt-2 border-t border-stone-200/60">
                                    {onAddLoan && (
                                        <Pressable
                                            onPress={onAddLoan}
                                            className="flex-row items-center bg-amber-700 px-3 py-1.5 rounded-xl active:opacity-90 mr-2"
                                        >
                                            <Plus size={13} color="#FFFFFF" />
                                            <Text className="text-xs font-bold text-white ml-1">Loan</Text>
                                        </Pressable>
                                    )}
                                    <Pressable
                                        onPress={onAddPocket}
                                        className="flex-row items-center bg-[#18342B] px-3 py-1.5 rounded-xl active:opacity-90"
                                    >
                                        <Plus size={13} color="#FFFFFF" />
                                        <Text className="text-xs font-bold text-white ml-1">Add Pocket</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ) : hasLoans && !hasPockets ? (
                            <View className="bg-stone-100/70 p-4 rounded-2xl flex-row items-center justify-between">
                                <View>
                                    <Text className="text-xs font-medium text-amber-800">Outstanding Debt</Text>
                                    <Text className="text-2xl font-bold text-amber-700 tracking-tight">{formatCurrency(totalDebt)}</Text>
                                </View>

                                <View className="flex-row items-center">
                                    {onAddLoan && (
                                        <Pressable
                                            onPress={onAddLoan}
                                            className="flex-row items-center bg-amber-700 px-3 py-2 rounded-xl active:opacity-90 mr-2"
                                        >
                                            <Plus size={14} color="#FFFFFF" />
                                            <Text className="text-xs font-bold text-white ml-1">Loan</Text>
                                        </Pressable>
                                    )}
                                    <Pressable
                                        onPress={onAddPocket}
                                        className="flex-row items-center bg-[#18342B] px-3.5 py-2 rounded-xl active:opacity-90"
                                    >
                                        <Plus size={14} color="#FFFFFF" />
                                        <Text className="text-xs font-bold text-white ml-1">Add Pocket</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ) : (
                            <View className="bg-stone-100/70 p-4 rounded-2xl flex-row items-center justify-between">
                                <View>
                                    <Text className="text-xs font-medium text-stone-500">Aggregate Balance</Text>
                                    <Text className="text-2xl font-bold text-stone-900 tracking-tight">{formatCurrency(totalBalance)}</Text>
                                </View>

                                <View className="flex-row items-center">
                                    {onAddLoan && (
                                        <Pressable
                                            onPress={onAddLoan}
                                            className="flex-row items-center bg-amber-700 px-3 py-2 rounded-xl active:opacity-90 mr-2"
                                        >
                                            <Plus size={14} color="#FFFFFF" />
                                            <Text className="text-xs font-bold text-white ml-1">Loan</Text>
                                        </Pressable>
                                    )}
                                    <Pressable
                                        onPress={onAddPocket}
                                        className="flex-row items-center bg-[#18342B] px-3.5 py-2 rounded-xl active:opacity-90"
                                    >
                                        <Plus size={14} color="#FFFFFF" />
                                        <Text className="text-xs font-bold text-white ml-1">Add Pocket</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}

                        {/* Account Note / Details banner */}
                        <View className="mt-3 pt-3 border-t border-stone-100 flex-row items-center justify-between">
                            {isEditingNote ? (
                                <View className="flex-1 flex-row items-center">
                                    <TextInput
                                        value={noteText}
                                        onChangeText={setNoteText}
                                        placeholder="Add details (e.g. Payroll, Card #1234)"
                                        placeholderTextColor="#A8A29E"
                                        className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-900 mr-2"
                                        autoFocus
                                    />
                                    <Pressable
                                        onPress={handleSaveNote}
                                        disabled={savingNote}
                                        hitSlop={8}
                                        pressRetentionOffset={20}
                                        className="bg-[#18342B] px-3 py-1.5 rounded-xl mr-1.5 items-center justify-center"
                                    >
                                        <Check size={14} color="#FFFFFF" />
                                    </Pressable>
                                    <Pressable
                                        onPress={() => {
                                            setNoteText(institution.notes || '');
                                            setIsEditingNote(false);
                                        }}
                                        hitSlop={8}
                                        pressRetentionOffset={20}
                                        className="bg-stone-200 px-2.5 py-1.5 rounded-xl items-center justify-center"
                                    >
                                        <X size={14} color="#57534E" />
                                    </Pressable>
                                </View>
                            ) : (
                                <View className="flex-1 flex-row items-center justify-between">
                                    <View className="flex-1 mr-2">
                                        <Text className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Account Note</Text>
                                        <Text className="text-xs text-stone-700 font-medium mt-0.5">{institution.notes || 'No note added'}</Text>
                                    </View>
                                    {onUpdateNotes && (
                                        <Pressable
                                            onPress={() => setIsEditingNote(true)}
                                            hitSlop={8}
                                            pressRetentionOffset={20}
                                            accessibilityLabel="Edit note"
                                            className="p-1.5 px-2.5 rounded-lg bg-stone-100 active:bg-stone-200 flex-row items-center"
                                        >
                                            <Pencil size={12} color="#57534E" />
                                            <Text className="text-[11px] font-semibold text-stone-600 ml-1">Edit</Text>
                                        </Pressable>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Content List: Pockets + Loans */}
                    <ScrollView className="p-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* Pockets Section */}
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-xs font-semibold uppercase tracking-wider text-stone-500">Pockets ({pockets.length})</Text>
                        </View>

                        {pockets.length === 0 ? (
                            <View className="p-4 bg-stone-100/70 rounded-2xl mb-4 items-center justify-center border border-dashed border-stone-200">
                                <Text className="text-xs text-stone-500">No deposit pockets created under this account.</Text>
                            </View>
                        ) : (
                            pockets.map((pocket) => (
                                <PocketCard
                                    key={pocket.id}
                                    pocket={pocket}
                                    onQuickExpense={onQuickExpense ? () => onQuickExpense(pocket) : undefined}
                                    onEdit={onEditPocket ? () => onEditPocket(pocket) : undefined}
                                />
                            ))
                        )}

                        {/* Loans & Credit Lines Section (Appended) */}
                        <View className="flex-row items-center justify-between mt-4 mb-3">
                            <Text className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                                Loans & Credit Lines ({loans.length})
                            </Text>
                            {onAddLoan && (
                                <Pressable onPress={onAddLoan} hitSlop={8} className="flex-row items-center">
                                    <Plus size={13} color="#B45309" />
                                    <Text className="text-[11px] font-semibold text-amber-800 ml-0.5">New Loan</Text>
                                </Pressable>
                            )}
                        </View>

                        {loans.length === 0 ? (
                            <View className="p-4 bg-stone-100/70 rounded-2xl mb-2 items-center justify-center border border-dashed border-stone-200">
                                <Text className="text-xs text-stone-400">No active loans or credit lines under {institution.name}.</Text>
                            </View>
                        ) : (
                            loans.map((loan) => (
                                <View key={loan.id} className="mb-3">
                                    <LoanCard loan={loan} onPress={() => onSelectLoan?.(loan)} />
                                </View>
                            ))
                        )}

                        <View className="h-8" />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
