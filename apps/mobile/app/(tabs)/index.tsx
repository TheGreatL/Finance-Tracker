import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { DashboardHeader } from '@/src/components/dashboard/DashboardHeader';
import { BalanceHeroCard } from '@/src/components/dashboard/BalanceHeroCard';
import { QuickActionsBar } from '@/src/components/dashboard/QuickActionsBar';
import { RecentTransactionsList } from '@/src/components/dashboard/RecentTransactionsList';
import type { TransactionItemData } from '@/src/components/dashboard/TransactionItem';

import { InstitutionGrid } from '@/src/components/accounts/InstitutionGrid';
import { AddAccountModal } from '@/src/components/accounts/AddAccountModal';
import { AddPocketModal } from '@/src/components/accounts/AddPocketModal';
import { InstitutionDetailSheet } from '@/src/components/accounts/InstitutionDetailSheet';
import { TransactionFormModal } from '@/src/components/transactions/TransactionFormModal';
import { TransactionDetailSheet } from '@/src/components/transactions/TransactionDetailSheet';
import { DatabaseResetDialog } from '@/src/components/dev/DatabaseResetDialog';
import { ActiveLoansBanner } from '@/src/components/loans/ActiveLoansBanner';

import { getDatabase, closeDatabase } from '@/src/database/db';
import { seedDevData, resetDatabase } from '@/src/database/seed';
import {
  getInstitutionsWithBalances,
  getPocketsByInstitution,
  getAllActivePockets,
  createInstitutionWithPocket,
  addPocket,
  updateInstitutionNotes,
} from '@/src/services/accountService';
import {
  getRecentTransactions,
  createTransaction,
  deleteTransaction,
  type CreateTransactionInput,
} from '@/src/services/transactionService';
import { getLoansSummary } from '@/src/services/loanService';
import type {
  Institution,
  AccountPocket,
  TransactionRecord,
  TransactionType,
  PocketType,
  LoanRecord,
} from '@/src/types/database';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Data state
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [allPockets, setAllPockets] = useState<
    (AccountPocket & {
      institution_name: string;
      institution_code: string;
      institution_color: string;
    })[]
  >([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionRecord[]>([]);
  const [loansSummary, setLoansSummary] = useState<{
    totalLoanBalance: number;
    nextDueLoan: LoanRecord | null;
    activeCount: number;
  }>({
    totalLoanBalance: 0,
    nextDueLoan: null,
    activeCount: 0,
  });

  // Modals state
  const [addAccountVisible, setAddAccountVisible] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [selectedInstPockets, setSelectedInstPockets] = useState<AccountPocket[]>([]);
  const [addPocketVisible, setAddPocketVisible] = useState(false);
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [txModalType, setTxModalType] = useState<TransactionType>('expense');
  const [preselectedPocketId, setPreselectedPocketId] = useState<string | undefined>();
  const [detailTx, setDetailTx] = useState<TransactionRecord | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      if (__DEV__) {
        await seedDevData(db);
      }
      const [insts, pocks, txs, loansSum] = await Promise.all([
        getInstitutionsWithBalances(db),
        getAllActivePockets(db),
        getRecentTransactions(db, 20),
        getLoansSummary(db),
      ]);
      setInstitutions(insts);
      setAllPockets(pocks);
      setRecentTransactions(txs);
      setLoansSummary(loansSum);

      // If an institution sheet is open, refresh its pockets
      if (selectedInstitution) {
        const updatedPockets = await getPocketsByInstitution(db, selectedInstitution.id);
        setSelectedInstPockets(updatedPockets);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      // Auto-recover if a legacy schema error occurs
      if (String(err?.message || err).includes('no such column')) {
        try {
          await closeDatabase();
          const db = await getDatabase();
          await resetDatabase(db);
          await seedDevData(db);
          const [insts, pocks, txs, loansSum] = await Promise.all([
            getInstitutionsWithBalances(db),
            getAllActivePockets(db),
            getRecentTransactions(db, 20),
            getLoansSummary(db),
          ]);
          setInstitutions(insts);
          setAllPockets(pocks);
          setRecentTransactions(txs);
          setLoansSummary(loansSum);
        } catch (recoverErr) {
          console.error('Database auto-recovery failed:', recoverErr);
        }
      }
    }
  }, [selectedInstitution]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleUpdateNotes = async (institutionId: string, notes: string) => {
    const db = await getDatabase();
    await updateInstitutionNotes(db, institutionId, notes);
    await loadData();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Handle Institution Card tap
  const handleSelectInstitution = async (inst: Institution) => {
    const db = await getDatabase();
    const pocks = await getPocketsByInstitution(db, inst.id);
    setSelectedInstitution(inst);
    setSelectedInstPockets(pocks);
  };

  // Quick Action Triggers
  const handleOpenTransactionModal = (type: TransactionType, pocketId?: string) => {
    setTxModalType(type);
    setPreselectedPocketId(pocketId);
    setTxModalVisible(true);
  };

  // Create Account handler
  const handleCreateAccount = async (data: {
    code: string;
    customName?: string;
    pocketName: string;
    pocketType: PocketType;
    startingBalance: number;
    interestRate?: number | null;
    savingsDetails?: string;
  }) => {
    const db = await getDatabase();
    await createInstitutionWithPocket(db, data);
    await loadData();
  };

  // Add Pocket handler
  const handleAddPocket = async (data: {
    institutionId: string;
    name: string;
    pocketType: PocketType;
    startingBalance?: number;
    interestRate?: number | null;
    savingsDetails?: string;
  }) => {
    const db = await getDatabase();
    await addPocket(db, data);
    if (selectedInstitution) {
      const updated = await getPocketsByInstitution(db, selectedInstitution.id);
      setSelectedInstPockets(updated);
    }
    await loadData();
  };

  // Create Transaction handler
  const handleCreateTransaction = async (input: CreateTransactionInput) => {
    const db = await getDatabase();
    await createTransaction(db, input);
    await loadData();
  };

  // Delete Transaction handler
  const handleDeleteTransaction = async (id: string) => {
    const db = await getDatabase();
    await deleteTransaction(db, id);
    await loadData();
  };

  // Reset database handler
  const handleResetConfirm = async () => {
    const db = await getDatabase();
    await resetDatabase(db);
    setSelectedInstitution(null);
    setSelectedInstPockets([]);
    await loadData();
    Alert.alert('Reset Complete', 'Database has been cleared to 0.');
  };

  // Compute total aggregates
  const totalBalance = allPockets.reduce((sum, p) => sum + p.current_balance, 0);
  const totalIncome = recentTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = recentTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Map to dashboard recent items format
  const formattedRecentTransactions: TransactionItemData[] = recentTransactions.slice(0, 8).map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    amount: t.amount,
    type: t.type,
    date: t.date,
    accountName: t.institution_name ? `${t.institution_name} • ${t.pocket_name || 'Wallet'}` : t.pocket_name || 'Wallet',
  }));

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: Math.max(insets.top, 12) }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#BBD583"
            colors={['#18342B', '#BBD583']}
          />
        }>
        {/* Header with greeting and Reset tool */}
        <DashboardHeader
          userName="Personal Ledger"
          onNotificationPress={() => setResetDialogOpen(true)}
          onScanPress={() => handleOpenTransactionModal('expense')}
        />

        {/* Hero Card with Pistachio & Deep Pine */}
        <BalanceHeroCard
          totalBalance={totalBalance}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          currency="₱"
        />

        {/* Active Loans & Debt Summary Banner */}
        <ActiveLoansBanner
          totalLoanBalance={loansSummary.totalLoanBalance}
          nextDueLoan={loansSummary.nextDueLoan}
          onPress={() => router.push({ pathname: '/(tabs)/accounts', params: { tab: 'loans' } })}
        />

        {/* Philippine Institution Accounts 2-Column Grid */}
        <InstitutionGrid
          institutions={institutions}
          limit={4}
          onSeeAll={() => router.push('/(tabs)/accounts')}
          onSelectInstitution={handleSelectInstitution}
          onAddAccount={() => setAddAccountVisible(true)}
        />

        {/* Quick action buttons: Expense, Income, Transfer */}
        <QuickActionsBar
          onAddExpense={() => handleOpenTransactionModal('expense')}
          onAddIncome={() => handleOpenTransactionModal('income')}
          onTransfer={() => handleOpenTransactionModal('transfer')}
          onScanReceipt={() => handleOpenTransactionModal('expense')}
        />

        {/* Recent Transactions List */}
        <RecentTransactionsList
          transactions={formattedRecentTransactions}
          currency="₱"
          onSeeAllPress={() => {}}
        />
      </ScrollView>

      {/* Modals & Sheets */}
      <AddAccountModal
        visible={addAccountVisible}
        onClose={() => setAddAccountVisible(false)}
        onSubmit={handleCreateAccount}
      />

      <InstitutionDetailSheet
        visible={!!selectedInstitution}
        institution={selectedInstitution}
        pockets={selectedInstPockets}
        onClose={() => setSelectedInstitution(null)}
        onAddPocket={() => setAddPocketVisible(true)}
        onUpdateNotes={handleUpdateNotes}
        onQuickExpense={(pocket) => {
          setSelectedInstitution(null);
          handleOpenTransactionModal('expense', pocket.id);
        }}
      />

      <AddPocketModal
        visible={addPocketVisible}
        institutionId={selectedInstitution?.id || ''}
        institutionName={selectedInstitution?.name || 'Account'}
        onClose={() => setAddPocketVisible(false)}
        onSubmit={handleAddPocket}
      />

      <TransactionFormModal
        visible={txModalVisible}
        initialType={txModalType}
        preselectedPocketId={preselectedPocketId}
        pockets={allPockets}
        onClose={() => setTxModalVisible(false)}
        onSubmit={handleCreateTransaction}
      />

      <TransactionDetailSheet
        visible={!!detailTx}
        transaction={detailTx}
        onClose={() => setDetailTx(null)}
        onDelete={handleDeleteTransaction}
      />

      <DatabaseResetDialog
        visible={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirmReset={handleResetConfirm}
      />
    </View>
  );
}
