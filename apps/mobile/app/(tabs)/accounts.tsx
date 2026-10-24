import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Search, Plus, WalletCards, ShieldCheck } from 'lucide-react-native';
import { getDatabase } from '../../src/database/db';
import {
  getInstitutionsWithBalances,
  getPocketsByInstitution,
  createInstitutionWithPocket,
  addPocket,
  updateInstitutionNotes,
  CreateAccountInput,
} from '../../src/services/accountService';
import type { Institution, AccountPocket, InstitutionType } from '../../src/types/database';
import { formatCurrency } from '../../src/utils/formatters';
import { InstitutionGrid } from '../../src/components/accounts/InstitutionGrid';
import { AddAccountModal } from '../../src/components/accounts/AddAccountModal';
import { InstitutionDetailSheet } from '../../src/components/accounts/InstitutionDetailSheet';
import { AddPocketModal } from '../../src/components/accounts/AddPocketModal';

type FilterCategory = 'all' | 'bank' | 'ewallet' | 'cash';

export default function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all');

  // Modals
  const [addAccountVisible, setAddAccountVisible] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [institutionPockets, setInstitutionPockets] = useState<AccountPocket[]>([]);
  const [detailSheetVisible, setDetailSheetVisible] = useState(false);
  const [addPocketVisible, setAddPocketVisible] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const db = await getDatabase();
      const items = await getInstitutionsWithBalances(db);
      setInstitutions(items);

      // If detail sheet is currently open, refresh its selected institution & pockets
      if (selectedInstitution) {
        const refreshedInst = items.find((i: Institution) => i.id === selectedInstitution.id) || null;
        setSelectedInstitution(refreshedInst);
        if (refreshedInst) {
          const pockets = await getPocketsByInstitution(db, refreshedInst.id);
          setInstitutionPockets(pockets);
        }
      }
    } catch (err) {
      console.error('Failed to load accounts in AccountsScreen:', err);
    }
  }, [selectedInstitution]);

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [loadAccounts])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAccounts();
    setRefreshing(false);
  }, [loadAccounts]);

  const handleSelectInstitution = async (inst: Institution) => {
    const db = await getDatabase();
    const pockets = await getPocketsByInstitution(db, inst.id);
    setSelectedInstitution(inst);
    setInstitutionPockets(pockets);
    setDetailSheetVisible(true);
  };

  const handleCreateAccount = async (input: CreateAccountInput) => {
    const db = await getDatabase();
    await createInstitutionWithPocket(db, input);
    await loadAccounts();
  };

  const handleAddPocket = async (input: {
    institutionId: string;
    name: string;
    pocketType: 'wallet' | 'savings';
    startingBalance?: number;
    interestRate?: number | null;
    savingsDetails?: string;
  }) => {
    const db = await getDatabase();
    await addPocket(db, input);
    await loadAccounts();
  };

  const handleUpdateNotes = async (institutionId: string, notes: string) => {
    const db = await getDatabase();
    await updateInstitutionNotes(db, institutionId, notes);
    await loadAccounts();
  };

  // Filter accounts by search query and category pill
  const filteredInstitutions = useMemo(() => {
    return institutions.filter((inst) => {
      // Category filter
      if (selectedFilter !== 'all' && inst.type !== selectedFilter) {
        return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchesName = inst.name.toLowerCase().includes(q);
      const matchesCode = inst.code.toLowerCase().includes(q);
      const matchesNotes = inst.notes?.toLowerCase().includes(q) ?? false;
      return matchesName || matchesCode || matchesNotes;
    });
  }, [institutions, selectedFilter, searchQuery]);

  const totalBalance = useMemo(() => {
    return institutions.reduce((sum, inst) => sum + (inst.total_balance ?? 0), 0);
  }, [institutions]);

  const totalPockets = useMemo(() => {
    return institutions.reduce((sum, inst) => sum + (inst.pocket_count ?? 0), 0);
  }, [institutions]);

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: Math.max(insets.top, 12) }}>
      {/* Page Header */}
      <View className="px-5 pt-3 pb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-black text-stone-900 tracking-tight">Accounts</Text>
          <Text className="text-xs text-stone-500 font-medium">
            Philippine Banks, E-Wallets & Cash
          </Text>
        </View>

        <Pressable
          onPress={() => setAddAccountVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Add Account"
          hitSlop={8}
          pressRetentionOffset={20}
          className="flex-row items-center bg-[#18342B] px-3.5 py-2 rounded-2xl active:opacity-90">
          <Plus size={16} color="#FFFFFF" />
          <Text className="text-xs font-bold text-white ml-1.5">Add Account</Text>
        </Pressable>
      </View>

      {/* Aggregate Balance Stat Banner */}
      <View className="px-5 mb-3">
        <View className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm flex-row items-center justify-between">
          <View>
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              Total Across Accounts
            </Text>
            <Text className="text-2xl font-extrabold text-[#18342B] tracking-tight mt-0.5">
              {formatCurrency(totalBalance)}
            </Text>
          </View>
          <View className="items-end">
            <View className="bg-stone-100 px-2.5 py-1 rounded-full mb-1">
              <Text className="text-xs font-bold text-stone-700">
                {institutions.length} {institutions.length === 1 ? 'account' : 'accounts'}
              </Text>
            </View>
            <Text className="text-[10px] text-stone-400 font-medium">
              {totalPockets} {totalPockets === 1 ? 'pocket' : 'pockets'}
            </Text>
          </View>
        </View>
      </View>

      {/* Search Input */}
      <View className="px-5 mb-3">
        <View className="flex-row items-center bg-white px-3.5 py-2.5 rounded-2xl border border-stone-200/80">
          <Search size={16} color="#A8A29E" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search accounts, notes, banks..."
            placeholderTextColor="#A8A29E"
            className="flex-1 ml-2 text-xs text-stone-900"
          />
        </View>
      </View>

      {/* Filter Category Pills */}
      <View className="px-5 mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {[
            { id: 'all', label: 'All Accounts' },
            { id: 'bank', label: 'Banks' },
            { id: 'ewallet', label: 'E-Wallets' },
            { id: 'cash', label: 'Cash' },
          ].map((cat) => {
            const isSelected = selectedFilter === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedFilter(cat.id as FilterCategory)}
                hitSlop={8}
                pressRetentionOffset={20}
                className={`px-3.5 py-1.5 rounded-xl mr-2 border ${
                  isSelected ? 'bg-stone-900 border-stone-900' : 'bg-white border-stone-200/80'
                }`}>
                <Text
                  className={`text-xs font-semibold ${
                    isSelected ? 'text-white' : 'text-stone-600'
                  }`}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Accounts 2-Column Grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#BBD583"
            colors={['#18342B', '#BBD583']}
          />
        }>
        {filteredInstitutions.length === 0 ? (
          <View className="mx-5 p-8 bg-white rounded-2xl border border-dashed border-stone-300 items-center justify-center">
            <View className="w-12 h-12 rounded-full bg-stone-100 items-center justify-center mb-3">
              <WalletCards size={22} color="#78716C" />
            </View>
            <Text className="text-sm font-semibold text-stone-800">No accounts found</Text>
            <Text className="text-xs text-stone-400 text-center mt-1">
              {searchQuery
                ? `No accounts matching "${searchQuery}"`
                : 'Connect your Philippine banks or e-wallets to get started'}
            </Text>
            {!searchQuery && (
              <Pressable
                onPress={() => setAddAccountVisible(true)}
                hitSlop={8}
                pressRetentionOffset={20}
                className="mt-4 bg-[#BBD583] px-4 py-2 rounded-xl flex-row items-center active:opacity-80">
                <Plus size={14} color="#18342B" />
                <Text className="text-xs font-bold text-[#18342B] ml-1.5">Add First Account</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <InstitutionGrid
            institutions={filteredInstitutions}
            hideHeader={true}
            onSelectInstitution={handleSelectInstitution}
            onAddAccount={() => setAddAccountVisible(true)}
          />
        )}
      </ScrollView>

      {/* Add Account Modal */}
      <AddAccountModal
        visible={addAccountVisible}
        onClose={() => setAddAccountVisible(false)}
        onSubmit={handleCreateAccount}
      />

      {/* Institution Detail Sheet with In-Sheet Note Editing */}
      <InstitutionDetailSheet
        visible={detailSheetVisible}
        institution={selectedInstitution}
        pockets={institutionPockets}
        onClose={() => setDetailSheetVisible(false)}
        onAddPocket={() => setAddPocketVisible(true)}
        onUpdateNotes={handleUpdateNotes}
      />

      {/* Add Pocket Modal */}
      <AddPocketModal
        visible={addPocketVisible}
        institutionId={selectedInstitution?.id || ''}
        institutionName={selectedInstitution?.name || ''}
        onClose={() => setAddPocketVisible(false)}
        onSubmit={handleAddPocket}
      />
    </View>
  );
}
