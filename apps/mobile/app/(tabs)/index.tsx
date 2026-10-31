import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollView, RefreshControl, View } from 'react-native';
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
import { EditPocketModal } from '@/src/components/accounts/EditPocketModal';
import { TransactionFormModal } from '@/src/components/transactions/TransactionFormModal';
import { TransactionDetailSheet } from '@/src/components/transactions/TransactionDetailSheet';
import { EditTransactionModal } from '@/src/components/transactions/EditTransactionModal';
import { FinancialPulseStrip } from '@/src/components/dashboard/FinancialPulseStrip';
import { AddLoanModal } from '@/src/components/loans/AddLoanModal';
import { LoanDetailSheet } from '@/src/components/loans/LoanDetailSheet';
import { EditLoanModal } from '@/src/components/loans/EditLoanModal';
import { LoanPaymentModal } from '@/src/components/loans/LoanPaymentModal';
import { NotificationCenterModal } from '@/src/components/notifications/NotificationCenterModal';
import { DatabaseManagementCard } from '@/src/components/dashboard/DatabaseManagementCard';
import { useSidebar } from '@/src/context/SidebarContext';
import { useToast } from '@/src/context/ToastContext';

import { getDatabase, closeDatabase } from '@/src/database/db';
import { seedDevData, resetDatabase } from '@/src/database/seed';
import {
    getInstitutionsWithBalances,
    getPocketsByInstitution,
    getAllActivePockets,
    createInstitutionWithPocket,
    addPocket,
    updateInstitutionNotes,
    updatePocketMetadata
} from '@/src/services/accountService';
import {
    getRecentTransactions,
    createTransaction,
    deleteTransaction,
    updateTransactionMetadata,
    type CreateTransactionInput
} from '@/src/services/transactionService';
import { getLoansSummary, getLoansByInstitution, createLoan, recordLoanPayment, deleteLoan, updateLoanMetadata } from '@/src/services/loanService';
import { processDueSubscriptions, getSubscriptionsSummary, type SubscriptionsSummary } from '@/src/services/subscriptionService';
import { processDuePaydays, getIncomeSummary, type IncomeSummary } from '@/src/services/salaryService';
import {
    getAppNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
    syncAppNotificationsFromSchedule,
    type AppNotificationRecord
} from '@/src/services/notificationCenterService';
import type {
    Institution,
    AccountPocket,
    TransactionRecord,
    TransactionType,
    PocketType,
    LoanRecord,
    CreateLoanInput,
    RecordLoanPaymentInput
} from '@/src/types/database';

type ModalStackItem =
    { type: 'institution'; institutionId: string } | { type: 'loanDetail'; loanId: string } | { type: 'transactionDetail'; transactionId: string };

export default function DashboardScreen() {
    const insets = useSafeAreaInsets();
    const { openSidebar } = useSidebar();
    const { showToast } = useToast();
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
        activeCount: 0
    });
    const [subsSummary, setSubsSummary] = useState<SubscriptionsSummary>({
        monthlyTotal: 0,
        activeCount: 0,
        pausedCount: 0,
        cancelledCount: 0,
        nextUpcoming: null
    });
    const [incomeSummary, setIncomeSummary] = useState<IncomeSummary>({
        activeJobsCount: 0,
        archivedJobsCount: 0,
        monthlyGross: 0,
        monthlyDeductions: 0,
        monthlyNetTakeHome: 0,
        deductionBreakdown: { tax: 0, statutory: 0, workplace: 0, other: 0, total: 0 }
    });

    // Notifications state
    const [notifications, setNotifications] = useState<AppNotificationRecord[]>([]);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
    const [notificationCenterVisible, setNotificationCenterVisible] = useState<boolean>(false);

    // Modals state
    const [addAccountVisible, setAddAccountVisible] = useState(false);
    const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
    const [selectedInstPockets, setSelectedInstPockets] = useState<AccountPocket[]>([]);
    const [selectedInstLoans, setSelectedInstLoans] = useState<LoanRecord[]>([]);
    const [selectedLoan, setSelectedLoan] = useState<LoanRecord | null>(null);
    const [loanDetailVisible, setLoanDetailVisible] = useState(false);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [editingLoan, setEditingLoan] = useState<LoanRecord | null>(null);
    const [addLoanVisible, setAddLoanVisible] = useState(false);
    const [addLoanInitialProvider, setAddLoanInitialProvider] = useState<string | undefined>();
    const [addPocketVisible, setAddPocketVisible] = useState(false);
    const [txModalVisible, setTxModalVisible] = useState(false);
    const [txModalType, setTxModalType] = useState<TransactionType>('expense');
    const [preselectedPocketId, setPreselectedPocketId] = useState<string | undefined>();
    const [detailTx, setDetailTx] = useState<TransactionRecord | null>(null);
    const [editingTx, setEditingTx] = useState<TransactionRecord | null>(null);
    const [editingPocket, setEditingPocket] = useState<AccountPocket | null>(null);

    // Mirror of the open institution's id for use inside async loaders
    const selectedInstitutionIdRef = useRef<string | null>(null);
    const modalBackStackRef = useRef<ModalStackItem[]>([]);

    const pushModalBackStack = useCallback((item: ModalStackItem) => {
        modalBackStackRef.current.push(item);
    }, []);

    const popAndRestoreModal = useCallback(async () => {
        const prev = modalBackStackRef.current.pop();
        if (!prev) return;

        setTimeout(async () => {
            try {
                const db = await getDatabase();
                if (prev.type === 'institution') {
                    const insts = await getInstitutionsWithBalances(db);
                    const target = insts.find((i) => i.id === prev.institutionId);
                    if (target) {
                        const [pocks, instLoans] = await Promise.all([getPocketsByInstitution(db, target.id), getLoansByInstitution(db, target.id)]);
                        setSelectedInstitution(target);
                        setSelectedInstPockets(pocks);
                        setSelectedInstLoans(instLoans);
                    }
                } else if (prev.type === 'loanDetail') {
                    const target = await db.getFirstAsync<LoanRecord>(
                        `SELECT l.*, i.name AS institution_name, i.code AS institution_code, i.color AS institution_color
                         FROM loans l JOIN institutions i ON l.institution_id = i.id WHERE l.id = ? LIMIT 1;`,
                        [prev.loanId]
                    );
                    if (target) {
                        setSelectedLoan(target);
                        setLoanDetailVisible(true);
                    } else if (modalBackStackRef.current.length > 0) {
                        popAndRestoreModal();
                    }
                } else if (prev.type === 'transactionDetail') {
                    const tx = await db.getFirstAsync<TransactionRecord>(
                        `SELECT t.*, p.name AS pocket_name, i.name AS institution_name, i.code AS institution_code
                         FROM transactions t
                         LEFT JOIN account_pockets p ON t.pocket_id = p.id
                         LEFT JOIN institutions i ON p.institution_id = i.id
                         WHERE t.id = ? LIMIT 1;`,
                        [prev.transactionId]
                    );
                    if (tx) {
                        setDetailTx(tx);
                    }
                }
            } catch (err) {
                console.warn('Failed to restore parent modal on dashboard:', err);
            }
        }, 120);
    }, []);

    useEffect(() => {
        selectedInstitutionIdRef.current = selectedInstitution?.id ?? null;
    }, [selectedInstitution]);

    const loadData = useCallback(async () => {
        try {
            const db = await getDatabase();
            if (__DEV__) {
                await seedDevData(db);
            }

            // Catch up any due or missed subscription charges automatically
            await processDueSubscriptions(db);

            // Catch up any due or scheduled payday deposits automatically
            await processDuePaydays(db);

            // Sync upcoming scheduled bills & loans into app notification records
            await syncAppNotificationsFromSchedule(db);

            const [insts, pocks, txs, loansSum, subsSum, notifs, unread, incSum] = await Promise.all([
                getInstitutionsWithBalances(db),
                getAllActivePockets(db),
                getRecentTransactions(db, 20),
                getLoansSummary(db),
                getSubscriptionsSummary(db),
                getAppNotifications(db, 50),
                getUnreadNotificationCount(db),
                getIncomeSummary(db)
            ]);
            setInstitutions(insts);
            setAllPockets(pocks);
            setRecentTransactions(txs);
            setLoansSummary(loansSum);
            setSubsSummary(subsSum);
            setNotifications(notifs);
            setUnreadNotificationsCount(unread);
            setIncomeSummary(incSum);

            // If an institution sheet is open, refresh its institution data, pockets & loans.
            const openId = selectedInstitutionIdRef.current;
            if (openId) {
                const refreshedInst = insts.find((i: Institution) => i.id === openId) || null;
                setSelectedInstitution((prev) => (prev && prev.id === openId ? refreshedInst : prev));
                if (refreshedInst) {
                    const [updatedPockets, updatedLoans] = await Promise.all([
                        getPocketsByInstitution(db, refreshedInst.id),
                        getLoansByInstitution(db, refreshedInst.id)
                    ]);
                    if (selectedInstitutionIdRef.current === openId) {
                        setSelectedInstPockets(updatedPockets);
                        setSelectedInstLoans(updatedLoans);
                    }
                }
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
                    await processDueSubscriptions(db);
                    await syncAppNotificationsFromSchedule(db);
                    const [insts, pocks, txs, loansSum, subsSum, notifs, unread] = await Promise.all([
                        getInstitutionsWithBalances(db),
                        getAllActivePockets(db),
                        getRecentTransactions(db, 20),
                        getLoansSummary(db),
                        getSubscriptionsSummary(db),
                        getAppNotifications(db, 50),
                        getUnreadNotificationCount(db)
                    ]);
                    setInstitutions(insts);
                    setAllPockets(pocks);
                    setRecentTransactions(txs);
                    setLoansSummary(loansSum);
                    setSubsSummary(subsSum);
                    setNotifications(notifs);
                    setUnreadNotificationsCount(unread);
                } catch (recoverErr) {
                    console.error('Database auto-recovery failed:', recoverErr);
                }
            }
        }
    }, []);

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

    // Open transaction modal
    const handleOpenTransactionModal = (type: TransactionType, pocketId?: string) => {
        setTxModalType(type);
        setPreselectedPocketId(pocketId);
        setTxModalVisible(true);
    };

    // Select an institution card to open details
    const handleSelectInstitution = async (inst: Institution) => {
        setSelectedInstitution(inst);
        const db = await getDatabase();
        const [pocks, instLoans] = await Promise.all([getPocketsByInstitution(db, inst.id), getLoansByInstitution(db, inst.id)]);
        setSelectedInstPockets(pocks);
        setSelectedInstLoans(instLoans);
    };

    // Loan handlers on Dashboard
    const handleCreateLoan = async (input: CreateLoanInput) => {
        const db = await getDatabase();
        await createLoan(db, input);
        await loadData();
    };

    const handleRecordLoanPayment = async (input: RecordLoanPaymentInput) => {
        const db = await getDatabase();
        await recordLoanPayment(db, input);
        await loadData();
        if (selectedLoan) {
            const all = await getLoansByInstitution(db, selectedLoan.institution_id);
            const updated = all.find((l) => l.id === selectedLoan.id) || null;
            setSelectedLoan(updated);
        }
    };

    const handleDeleteLoan = async (loanId: string) => {
        const db = await getDatabase();
        await deleteLoan(db, loanId);
        setLoanDetailVisible(false);
        setSelectedLoan(null);
        await loadData();
    };

    const handleUpdateLoan = async (
        loanId: string,
        updates: {
            title: string;
            institutionId: string;
            dueDate: string;
            monthlyPayment: number;
            notes?: string;
            attachmentPath?: string;
            attachmentName?: string;
        }
    ) => {
        const db = await getDatabase();
        await updateLoanMetadata(db, loanId, updates);
        await loadData();
        if (selectedLoan && selectedLoan.id === loanId) {
            setSelectedLoan((prev) => (prev ? { ...prev, ...updates, due_date: updates.dueDate, monthly_payment: updates.monthlyPayment } : null));
        }
    };

    // Add Account handler
    const handleCreateAccount = async (data: {
        code: string;
        customName?: string;
        notes?: string;
        pocketName: string;
        pocketType: PocketType;
        startingBalance: number;
        interestRate?: number | null;
        savingsDetails?: string;
    }) => {
        const db = await getDatabase();
        await createInstitutionWithPocket(db, data);
        await loadData();
        showToast(`Account created for ${data.customName || data.pocketName || data.code}`);
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
        showToast(`Pocket "${data.name}" added`);
    };

    // Create Transaction handler
    const handleCreateTransaction = async (input: CreateTransactionInput) => {
        const db = await getDatabase();
        await createTransaction(db, input);
        await loadData();
        showToast(`${input.title} recorded`);
    };

    // Delete Transaction handler
    const handleDeleteTransaction = async (id: string) => {
        const deletedTx = recentTransactions.find((t) => t.id === id) || (detailTx && detailTx.id === id ? detailTx : null);
        const db = await getDatabase();
        await deleteTransaction(db, id);
        await loadData();

        if (deletedTx) {
            showToast({
                message: 'Transaction deleted',
                type: 'info',
                action: {
                    label: 'Undo',
                    onPress: async () => {
                        const dbRestore = await getDatabase();
                        await createTransaction(dbRestore, {
                            title: deletedTx.title,
                            amount: deletedTx.amount,
                            type: deletedTx.type,
                            category: deletedTx.category,
                            pocket_id: deletedTx.pocket_id,
                            to_pocket_id: deletedTx.to_pocket_id,
                            date: deletedTx.date,
                            notes: deletedTx.notes
                        });
                        await loadData();
                        showToast('Transaction restored');
                    }
                }
            });
        } else {
            showToast('Transaction deleted');
        }
    };

    const handleUpdateTransaction = async (id: string, updates: { title: string; category: string; date: string; notes?: string }) => {
        const db = await getDatabase();
        await updateTransactionMetadata(db, id, updates);
        await loadData();
        if (detailTx && detailTx.id === id) {
            setDetailTx((prev) => (prev ? { ...prev, ...updates } : null));
        }
        showToast('Transaction updated');
    };

    const handleUpdatePocket = async (
        pocketId: string,
        updates: {
            name: string;
            pocketType: PocketType;
            interestRate?: number | null;
            savingsDetails?: string;
        }
    ) => {
        const db = await getDatabase();
        await updatePocketMetadata(db, pocketId, updates);
        await loadData();
        if (selectedInstitution) {
            const updatedPockets = await getPocketsByInstitution(db, selectedInstitution.id);
            setSelectedInstPockets(updatedPockets);
        }
    };

    // Notification action handlers
    const handleMarkNotificationRead = async (id: string) => {
        const db = await getDatabase();
        await markNotificationAsRead(db, id);
        await loadData();
    };

    const handleMarkAllNotificationsRead = async () => {
        const db = await getDatabase();
        await markAllNotificationsAsRead(db);
        await loadData();
    };

    const handleClearAllNotifications = async () => {
        const db = await getDatabase();
        await clearAllNotifications(db);
        await loadData();
    };

    // Compute total aggregates
    const totalBalance = allPockets.reduce((sum, p) => sum + p.current_balance, 0);
    const totalIncome = recentTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = recentTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    // Map to dashboard recent items format
    const formattedRecentTransactions: TransactionItemData[] = recentTransactions.slice(0, 8).map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        amount: t.amount,
        type: t.type,
        date: t.date,
        accountName: t.institution_name ? `${t.institution_name} â€¢ ${t.pocket_name || 'Wallet'}` : t.pocket_name || 'Wallet'
    }));

    return (
        <View className="flex-1 bg-stone-50" style={{ paddingTop: Math.max(insets.top, 12) }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 32 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#BBD583" colors={['#18342B', '#BBD583']} />}
            >
                {/* Header with greeting, unread notifications badge, and Notifications trigger */}
                <DashboardHeader
                    userName="Personal Ledger"
                    onMenuPress={openSidebar}
                    unreadNotificationsCount={unreadNotificationsCount}
                    onNotificationPress={() => setNotificationCenterVisible(true)}
                    onScanPress={() => handleOpenTransactionModal('expense')}
                />

                {/* Hero Card with Pistachio & Deep Pine */}
                <BalanceHeroCard totalBalance={totalBalance} totalIncome={totalIncome} totalExpense={totalExpense} currency="â‚±" />

                {/* Unified Financial Pulse Strip (Payday, Debt Due, Recurring Bills) */}
                <FinancialPulseStrip
                    incomeSummary={incomeSummary}
                    loansSummary={loansSummary}
                    subsSummary={subsSummary}
                    onPaydayPress={() => router.push({ pathname: '/(tabs)/obligations', params: { tab: 'income' } })}
                    onLoansPress={() => router.push({ pathname: '/(tabs)/obligations', params: { tab: 'loans' } })}
                    onSubsPress={() => router.push({ pathname: '/(tabs)/obligations', params: { tab: 'subscriptions' } })}
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
                <RecentTransactionsList transactions={formattedRecentTransactions} currency="â‚±" onSeeAllPress={() => router.push('/(tabs)/two')} />

                {/* Dedicated Section: Reset, Export, and Import Database */}
                <DatabaseManagementCard onDataChanged={loadData} />
            </ScrollView>

            {/* Modals & Sheets */}
            <AddAccountModal visible={addAccountVisible} onClose={() => setAddAccountVisible(false)} onSubmit={handleCreateAccount} />

            <InstitutionDetailSheet
                visible={!!selectedInstitution}
                institution={selectedInstitution}
                pockets={selectedInstPockets}
                loans={selectedInstLoans}
                onClose={() => {
                    setSelectedInstitution(null);
                    setSelectedInstLoans([]);
                    modalBackStackRef.current = [];
                }}
                onAddPocket={() => {
                    if (selectedInstitution) {
                        pushModalBackStack({ type: 'institution', institutionId: selectedInstitution.id });
                    }
                    setSelectedInstitution(null);
                    setAddPocketVisible(true);
                }}
                onAddLoan={() => {
                    if (selectedInstitution) {
                        pushModalBackStack({ type: 'institution', institutionId: selectedInstitution.id });
                    }
                    setAddLoanInitialProvider(selectedInstitution?.code);
                    setSelectedInstitution(null);
                    setAddLoanVisible(true);
                }}
                onSelectLoan={(loan) => {
                    if (selectedInstitution) {
                        pushModalBackStack({ type: 'institution', institutionId: selectedInstitution.id });
                    }
                    setSelectedInstitution(null);
                    setSelectedLoan(loan);
                    setLoanDetailVisible(true);
                }}
                onUpdateNotes={handleUpdateNotes}
                onEditPocket={(pocket) => {
                    if (selectedInstitution) {
                        pushModalBackStack({ type: 'institution', institutionId: selectedInstitution.id });
                    }
                    setSelectedInstitution(null);
                    setEditingPocket(pocket);
                }}
                onQuickExpense={(pocket) => {
                    setSelectedInstitution(null);
                    handleOpenTransactionModal('expense', pocket.id);
                }}
            />

            {/* Modals for Loans on Dashboard */}
            <AddLoanModal
                visible={addLoanVisible}
                initialProvider={addLoanInitialProvider}
                onClose={() => {
                    setAddLoanVisible(false);
                    setAddLoanInitialProvider(undefined);
                    popAndRestoreModal();
                }}
                onSubmit={async (input) => {
                    await handleCreateLoan(input);
                    setAddLoanVisible(false);
                    setAddLoanInitialProvider(undefined);
                    popAndRestoreModal();
                }}
            />

            <LoanDetailSheet
                visible={loanDetailVisible}
                loan={selectedLoan}
                onClose={() => {
                    setLoanDetailVisible(false);
                    setSelectedLoan(null);
                    popAndRestoreModal();
                }}
                onRecordPayment={(loan) => {
                    pushModalBackStack({ type: 'loanDetail', loanId: loan.id });
                    setLoanDetailVisible(false);
                    setSelectedLoan(loan);
                    setPaymentModalVisible(true);
                }}
                onDelete={async (loanId) => {
                    await handleDeleteLoan(loanId);
                    setLoanDetailVisible(false);
                    setSelectedLoan(null);
                    popAndRestoreModal();
                }}
                onEdit={(loan) => {
                    pushModalBackStack({ type: 'loanDetail', loanId: loan.id });
                    setLoanDetailVisible(false);
                    setEditingLoan(loan);
                }}
            />

            <EditLoanModal
                visible={!!editingLoan}
                loan={editingLoan}
                onClose={() => {
                    setEditingLoan(null);
                    popAndRestoreModal();
                }}
                onSave={async (loanId, updates) => {
                    await handleUpdateLoan(loanId, updates);
                    setEditingLoan(null);
                    popAndRestoreModal();
                }}
            />

            <LoanPaymentModal
                visible={paymentModalVisible}
                loan={selectedLoan}
                pockets={allPockets}
                onClose={() => {
                    setPaymentModalVisible(false);
                    popAndRestoreModal();
                }}
                onSubmit={async (input) => {
                    await handleRecordLoanPayment(input);
                    setPaymentModalVisible(false);
                    popAndRestoreModal();
                }}
            />

            <EditPocketModal
                visible={!!editingPocket}
                pocket={editingPocket}
                institutionName={selectedInstitution?.name}
                onClose={() => {
                    setEditingPocket(null);
                    popAndRestoreModal();
                }}
                onSave={async (pocketId, updates) => {
                    await handleUpdatePocket(pocketId, updates);
                    setEditingPocket(null);
                    popAndRestoreModal();
                }}
            />

            <AddPocketModal
                visible={addPocketVisible}
                institutionId={selectedInstitution?.id || ''}
                institutionName={selectedInstitution?.name || 'Account'}
                onClose={() => {
                    setAddPocketVisible(false);
                    popAndRestoreModal();
                }}
                onSubmit={async (input) => {
                    await handleAddPocket(input);
                    setAddPocketVisible(false);
                    popAndRestoreModal();
                }}
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
                onClose={() => {
                    setDetailTx(null);
                    modalBackStackRef.current = [];
                }}
                onDelete={handleDeleteTransaction}
                onEdit={(tx) => {
                    pushModalBackStack({ type: 'transactionDetail', transactionId: tx.id });
                    setDetailTx(null);
                    setEditingTx(tx);
                }}
            />

            <EditTransactionModal
                visible={!!editingTx}
                transaction={editingTx}
                onClose={() => {
                    setEditingTx(null);
                    popAndRestoreModal();
                }}
                onSave={async (id, updates) => {
                    await handleUpdateTransaction(id, updates);
                    setEditingTx(null);
                    popAndRestoreModal();
                }}
            />

            <NotificationCenterModal
                visible={notificationCenterVisible}
                notifications={notifications}
                onClose={() => setNotificationCenterVisible(false)}
                onMarkAsRead={handleMarkNotificationRead}
                onMarkAllAsRead={handleMarkAllNotificationsRead}
                onClearAll={handleClearAllNotifications}
            />
        </View>
    );
}
