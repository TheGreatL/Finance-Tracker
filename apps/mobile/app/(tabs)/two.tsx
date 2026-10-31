import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Plus, Filter, Menu, X } from 'lucide-react-native';

import { useSidebar } from '@/src/context/SidebarContext';
import { getDatabase, closeDatabase } from '@/src/database/db';
import { seedDevData, resetDatabase } from '@/src/database/seed';
import {
    getRecentTransactions,
    createTransaction,
    deleteTransaction,
    updateTransactionMetadata,
    type CreateTransactionInput
} from '@/src/services/transactionService';
import { getAllActivePockets } from '@/src/services/accountService';
import type { TransactionRecord, AccountPocket, TransactionType } from '@/src/types/database';
import { TransactionItem } from '@/src/components/dashboard/TransactionItem';
import { TransactionFormModal } from '@/src/components/transactions/TransactionFormModal';
import { TransactionDetailSheet } from '@/src/components/transactions/TransactionDetailSheet';
import { EditTransactionModal } from '@/src/components/transactions/EditTransactionModal';

export default function LedgerScreen() {
    const insets = useSafeAreaInsets();
    const { openSidebar } = useSidebar();
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<'all' | TransactionType>('all');
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [pockets, setPockets] = useState<
        (AccountPocket & {
            institution_name: string;
            institution_code: string;
            institution_color: string;
        })[]
    >([]);

    // Modals
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);
    const [editingTx, setEditingTx] = useState<TransactionRecord | null>(null);

    const loadLedger = useCallback(async () => {
        try {
            const db = await getDatabase();
            const [allTx, pocks] = await Promise.all([getRecentTransactions(db, 100), getAllActivePockets(db)]);
            setTransactions(allTx);
            setPockets(pocks);
        } catch (err: any) {
            console.error('Failed to load ledger:', err);
            if (String(err?.message || err).includes('no such column')) {
                try {
                    await closeDatabase();
                    const db = await getDatabase();
                    await resetDatabase(db);
                    await seedDevData(db);
                    const [allTx, pocks] = await Promise.all([getRecentTransactions(db, 100), getAllActivePockets(db)]);
                    setTransactions(allTx);
                    setPockets(pocks);
                } catch (recErr) {
                    console.error('Ledger recovery failed:', recErr);
                }
            }
        }
    }, []);

    useEffect(() => {
        loadLedger();
    }, [loadLedger]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadLedger();
        setRefreshing(false);
    }, [loadLedger]);

    const handleCreateTransaction = async (input: CreateTransactionInput) => {
        const db = await getDatabase();
        await createTransaction(db, input);
        await loadLedger();
    };

    const handleDeleteTransaction = async (id: string) => {
        const db = await getDatabase();
        await deleteTransaction(db, id);
        await loadLedger();
    };

    const handleUpdateTransaction = async (id: string, updates: { title: string; category: string; date: string; notes?: string }) => {
        const db = await getDatabase();
        await updateTransactionMetadata(db, id, updates);
        await loadLedger();
        if (selectedTx && selectedTx.id === id) {
            setSelectedTx((prev) => (prev ? { ...prev, ...updates } : null));
        }
    };

    // Filter transactions
    const filtered = transactions.filter((t) => {
        const matchesSearch =
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.institution_name && t.institution_name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesType = selectedType === 'all' || t.type === selectedType;
        return matchesSearch && matchesType;
    });

    return (
        <View className="flex-1 bg-stone-50" style={{ paddingTop: Math.max(insets.top, 12) }}>
            {/* Top Header */}
            <View className="px-5 pt-3 pb-3 flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Open sidebar navigation"
                        onPress={openSidebar}
                        hitSlop={8}
                        className="items-center justify-center w-10 h-10 rounded-full bg-stone-200/70 active:opacity-70 mr-3"
                    >
                        <Menu size={20} color="#18342B" strokeWidth={2.2} />
                    </Pressable>
                    <View>
                        <Text className="text-2xl font-bold text-stone-900 tracking-tight">Ledger</Text>
                        <Text className="text-xs text-stone-500 font-medium">All financial movements</Text>
                    </View>
                </View>

                <Pressable
                    onPress={() => setFormModalOpen(true)}
                    className="flex-row items-center bg-[#18342B] px-3.5 py-2 rounded-2xl active:opacity-90"
                >
                    <Plus size={16} color="#FFFFFF" />
                    <Text className="text-xs font-bold text-white ml-1.5">Record</Text>
                </Pressable>
            </View>

            {/* Search Input */}
            <View className="px-5 mb-3">
                <View className="flex-row items-center bg-white px-3.5 py-2.5 rounded-2xl border border-stone-200/80">
                    <Search size={16} color="#A8A29E" />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search transactions, categories, banks..."
                        placeholderTextColor="#A8A29E"
                        className="flex-1 ml-2 text-xs text-stone-900"
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search input">
                            <X size={15} color="#A8A29E" />
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Type Filter Pills */}
            <View className="px-5 mb-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {(['all', 'expense', 'income', 'transfer'] as const).map((filterType) => {
                        const isSelected = selectedType === filterType;
                        return (
                            <Pressable
                                key={filterType}
                                onPress={() => setSelectedType(filterType)}
                                className={`px-3.5 py-1.5 rounded-xl mr-2 border capitalize ${
                                    isSelected ? 'bg-stone-900 border-stone-900' : 'bg-white border-stone-200/80'
                                }`}
                            >
                                <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-stone-600'}`}>
                                    {filterType === 'all' ? 'All Movements' : filterType}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Transactions List */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#BBD583" colors={['#18342B', '#BBD583']} />}
            >
                {filtered.length > 0 ? (
                    filtered.map((t) => (
                        <TransactionItem
                            key={t.id}
                            transaction={{
                                id: t.id,
                                title: t.title,
                                category: t.category,
                                amount: t.amount,
                                type: t.type,
                                date: t.date,
                                accountName: t.institution_name ? `${t.institution_name} • ${t.pocket_name || 'Wallet'}` : t.pocket_name || 'Wallet'
                            }}
                            currency="₱"
                            onPress={() => setSelectedTx(t)}
                        />
                    ))
                ) : (
                    <View className="items-center justify-center py-16">
                        <View className="w-12 h-12 rounded-2xl bg-stone-100 items-center justify-center mb-3">
                            <Filter size={20} color="#78716C" />
                        </View>
                        <Text className="text-sm font-bold text-stone-700">No transactions found</Text>
                        <Text className="text-xs text-stone-400 mt-1">
                            {searchQuery ? 'Try clearing your search query.' : 'Tap Record above to log an entry.'}
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Form Modal */}
            <TransactionFormModal
                visible={formModalOpen}
                pockets={pockets}
                onClose={() => setFormModalOpen(false)}
                onSubmit={handleCreateTransaction}
            />

            {/* Detail Sheet */}
            <TransactionDetailSheet
                visible={!!selectedTx}
                transaction={selectedTx}
                onClose={() => setSelectedTx(null)}
                onDelete={handleDeleteTransaction}
                onEdit={(tx) => setEditingTx(tx)}
            />

            <EditTransactionModal visible={!!editingTx} transaction={editingTx} onClose={() => setEditingTx(null)} onSave={handleUpdateTransaction} />
        </View>
    );
}
