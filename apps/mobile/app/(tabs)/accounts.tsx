import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, RefreshControl, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Search, Plus, WalletCards, HandCoins, Repeat } from 'lucide-react-native';
import { getDatabase } from '../../src/database/db';
import {
    getInstitutionsWithBalances,
    getPocketsByInstitution,
    getAllActivePockets,
    createInstitutionWithPocket,
    addPocket,
    updateInstitutionNotes,
    updatePocketMetadata,
    CreateAccountInput
} from '../../src/services/accountService';
import { getAllLoans, createLoan, recordLoanPayment, deleteLoan, updateLoanMetadata } from '../../src/services/loanService';
import {
    processDueSubscriptions,
    getAllSubscriptions,
    getSubscriptionsSummary,
    createSubscription,
    updateSubscription,
    updateSubscriptionStatus,
    deleteSubscription,
    type SubscriptionsSummary
} from '../../src/services/subscriptionService';
import type {
    Institution,
    AccountPocket,
    PocketType,
    LoanRecord,
    CreateLoanInput,
    RecordLoanPaymentInput,
    SubscriptionRecord,
    CreateSubscriptionInput,
    UpdateSubscriptionInput
} from '../../src/types/database';
import { formatCurrency, formatDisplayDate } from '../../src/utils/formatters';
import { InstitutionGrid } from '../../src/components/accounts/InstitutionGrid';
import { AddAccountModal } from '../../src/components/accounts/AddAccountModal';
import { InstitutionDetailSheet } from '../../src/components/accounts/InstitutionDetailSheet';
import { AddPocketModal } from '../../src/components/accounts/AddPocketModal';
import { EditPocketModal } from '../../src/components/accounts/EditPocketModal';
import { LoanCard } from '../../src/components/loans/LoanCard';
import { AddLoanModal } from '../../src/components/loans/AddLoanModal';
import { LoanDetailSheet } from '../../src/components/loans/LoanDetailSheet';
import { EditLoanModal } from '../../src/components/loans/EditLoanModal';
import { LoanPaymentModal } from '../../src/components/loans/LoanPaymentModal';
import { SubscriptionCard } from '../../src/components/subscriptions/SubscriptionCard';
import { AddSubscriptionModal } from '../../src/components/subscriptions/AddSubscriptionModal';
import { SubscriptionDetailSheet } from '../../src/components/subscriptions/SubscriptionDetailSheet';

type FilterCategory = 'all' | 'bank' | 'ewallet' | 'loans' | 'subscriptions' | 'cash';

export default function AccountsScreen() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ tab?: string }>();

    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loans, setLoans] = useState<LoanRecord[]>([]);
    const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
    const [subsSummary, setSubsSummary] = useState<SubscriptionsSummary>({
        monthlyTotal: 0,
        activeCount: 0,
        pausedCount: 0,
        cancelledCount: 0,
        nextUpcoming: null
    });
    const [allPockets, setAllPockets] = useState<(AccountPocket & { institution_name?: string })[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all');

    // Account Modals
    const [addAccountVisible, setAddAccountVisible] = useState(false);
    const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
    const [institutionPockets, setInstitutionPockets] = useState<AccountPocket[]>([]);
    const [detailSheetVisible, setDetailSheetVisible] = useState(false);
    const [addPocketVisible, setAddPocketVisible] = useState(false);

    // Loan Modals
    const [addLoanVisible, setAddLoanVisible] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<LoanRecord | null>(null);
    const [loanDetailVisible, setLoanDetailVisible] = useState(false);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [editingLoan, setEditingLoan] = useState<LoanRecord | null>(null);
    const [editingPocket, setEditingPocket] = useState<AccountPocket | null>(null);

    // Subscription Modals
    const [addSubVisible, setAddSubVisible] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState<SubscriptionRecord | null>(null);
    const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionRecord | null>(null);
    const [subDetailVisible, setSubDetailVisible] = useState(false);

    // Mirrors of the open items' ids for use inside async loaders
    const selectedInstitutionIdRef = useRef<string | null>(null);
    const selectedLoanIdRef = useRef<string | null>(null);
    const selectedSubscriptionIdRef = useRef<string | null>(null);

    useEffect(() => {
        selectedInstitutionIdRef.current = selectedInstitution?.id ?? null;
    }, [selectedInstitution]);
    useEffect(() => {
        selectedLoanIdRef.current = selectedLoan?.id ?? null;
    }, [selectedLoan]);
    useEffect(() => {
        selectedSubscriptionIdRef.current = selectedSubscription?.id ?? null;
    }, [selectedSubscription]);

    // Switch tab if navigated via params
    useEffect(() => {
        if (params.tab === 'loans') {
            setSelectedFilter('loans');
        } else if (params.tab === 'subscriptions') {
            setSelectedFilter('subscriptions');
        }
    }, [params.tab]);

    const loadData = useCallback(async () => {
        try {
            const db = await getDatabase();

            // Catch up any due or missed subscription charges automatically
            await processDueSubscriptions(db);

            const [instItems, loanItems, pocketItems, subItems, subSum] = await Promise.all([
                getInstitutionsWithBalances(db),
                getAllLoans(db),
                getAllActivePockets(db),
                getAllSubscriptions(db),
                getSubscriptionsSummary(db)
            ]);

            setInstitutions(instItems);
            setLoans(loanItems);
            setAllPockets(pocketItems);
            setSubscriptions(subItems);
            setSubsSummary(subSum);

            // Refresh opened institution sheet. Read open ids from refs (not state) so
            // loadData stays stable and a sheet closed mid-fetch is never re-opened.
            const openInstId = selectedInstitutionIdRef.current;
            if (openInstId) {
                const refreshedInst = instItems.find((i: Institution) => i.id === openInstId) || null;
                setSelectedInstitution((prev) => (prev && prev.id === openInstId ? refreshedInst : prev));
                if (refreshedInst) {
                    const pockets = await getPocketsByInstitution(db, refreshedInst.id);
                    if (selectedInstitutionIdRef.current === openInstId) {
                        setInstitutionPockets(pockets);
                    }
                }
            }

            // Refresh opened loan sheet
            const openLoanId = selectedLoanIdRef.current;
            if (openLoanId) {
                const refreshedLoan = loanItems.find((l: LoanRecord) => l.id === openLoanId) || null;
                setSelectedLoan((prev) => (prev && prev.id === openLoanId ? refreshedLoan : prev));
            }

            // Refresh opened subscription sheet
            const openSubId = selectedSubscriptionIdRef.current;
            if (openSubId) {
                const refreshedSub = subItems.find((s: SubscriptionRecord) => s.id === openSubId) || null;
                setSelectedSubscription((prev) => (prev && prev.id === openSubId ? refreshedSub : prev));
            }
        } catch (err) {
            console.error('Failed to load accounts, loans & subscriptions:', err);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    // Account Handlers
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
        await loadData();
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
        await loadData();
    };

    const handleUpdateNotes = async (institutionId: string, notes: string) => {
        const db = await getDatabase();
        await updateInstitutionNotes(db, institutionId, notes);
        await loadData();
    };

    // Loan Handlers
    const handleCreateLoan = async (input: CreateLoanInput) => {
        const db = await getDatabase();
        await createLoan(db, input);
        await loadData();
    };

    const handleDeleteLoan = async (loanId: string) => {
        const db = await getDatabase();
        await deleteLoan(db, loanId);
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
            setSelectedLoan((prev) => (prev ? { ...prev, ...updates } : null));
        }
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
            setInstitutionPockets(updatedPockets);
        }
    };

    const handleRecordPayment = async (input: RecordLoanPaymentInput) => {
        const db = await getDatabase();
        await recordLoanPayment(db, input);
        await loadData();
    };

    // Subscription Handlers
    const handleCreateSubscription = async (input: CreateSubscriptionInput) => {
        const db = await getDatabase();
        await createSubscription(db, input);
        await loadData();
    };

    const handleUpdateSubscription = async (id: string, input: UpdateSubscriptionInput) => {
        const db = await getDatabase();
        await updateSubscription(db, id, input);
        await loadData();
    };

    const handleTogglePauseSubscription = async (sub: SubscriptionRecord) => {
        const db = await getDatabase();
        const nextStatus = sub.status === 'active' ? 'paused' : 'active';
        await updateSubscriptionStatus(db, sub.id, nextStatus);
        await loadData();
    };

    const handleCancelSubscription = async (sub: SubscriptionRecord) => {
        const db = await getDatabase();
        await updateSubscriptionStatus(db, sub.id, 'cancelled');
        await loadData();
    };

    const handleDeleteSubscription = async (id: string) => {
        const db = await getDatabase();
        await deleteSubscription(db, id);
        await loadData();
    };

    // Filtering accounts
    const filteredInstitutions = useMemo(() => {
        return institutions.filter((inst) => {
            if (selectedFilter !== 'all' && inst.type !== selectedFilter) {
                return false;
            }
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            const matchesName = inst.name.toLowerCase().includes(q);
            const matchesCode = inst.code.toLowerCase().includes(q);
            const matchesNotes = inst.notes?.toLowerCase().includes(q) ?? false;
            return matchesName || matchesCode || matchesNotes;
        });
    }, [institutions, selectedFilter, searchQuery]);

    // Filtering loans
    const filteredLoans = useMemo(() => {
        return loans.filter((loan) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            const matchesTitle = loan.title.toLowerCase().includes(q);
            const matchesProvider = loan.institution_name?.toLowerCase().includes(q) ?? false;
            const matchesNotes = loan.notes?.toLowerCase().includes(q) ?? false;
            return matchesTitle || matchesProvider || matchesNotes;
        });
    }, [loans, searchQuery]);

    // Filtering subscriptions
    const filteredSubscriptions = useMemo(() => {
        return subscriptions.filter((sub) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            const matchesName = sub.service_name.toLowerCase().includes(q);
            const matchesCategory = sub.category.toLowerCase().includes(q);
            const matchesPocket = sub.pocket_name?.toLowerCase().includes(q) ?? false;
            const matchesInst = sub.institution_name?.toLowerCase().includes(q) ?? false;
            const matchesNotes = sub.notes?.toLowerCase().includes(q) ?? false;
            return matchesName || matchesCategory || matchesPocket || matchesInst || matchesNotes;
        });
    }, [subscriptions, searchQuery]);

    const totalMoney = useMemo(() => {
        return institutions.reduce((sum, inst) => sum + (inst.total_balance ?? 0), 0);
    }, [institutions]);

    const totalLoans = useMemo(() => {
        return loans.filter((l) => l.status === 'active').reduce((sum, l) => sum + l.remaining_balance, 0);
    }, [loans]);

    const isLoansTab = selectedFilter === 'loans';
    const isSubsTab = selectedFilter === 'subscriptions';

    const headerTitle = isLoansTab ? 'Loans & Debt' : isSubsTab ? 'Subscriptions' : 'Accounts';

    const headerSubtitle = isLoansTab
        ? 'Lending Apps, Installments & Personal Loans'
        : isSubsTab
          ? 'Recurring Bills, Auto-Pay & Due Reminders'
          : 'Philippine Banks, E-Wallets & Cash';

    const headerButtonLabel = isLoansTab ? 'Add Loan' : isSubsTab ? 'Add Sub' : 'Add Account';

    const handleHeaderAddPress = () => {
        if (isLoansTab) {
            setAddLoanVisible(true);
        } else if (isSubsTab) {
            setEditingSubscription(null);
            setAddSubVisible(true);
        } else {
            setAddAccountVisible(true);
        }
    };

    return (
        <View className="flex-1 bg-stone-50" style={{ paddingTop: Math.max(insets.top, 12) }}>
            {/* Page Header */}
            <View className="px-5 pt-3 pb-3 flex-row items-center justify-between">
                <View>
                    <Text className="text-2xl font-black text-stone-900 tracking-tight">{headerTitle}</Text>
                    <Text className="text-xs text-stone-500 font-medium">{headerSubtitle}</Text>
                </View>

                <Pressable
                    onPress={handleHeaderAddPress}
                    accessibilityRole="button"
                    accessibilityLabel={headerButtonLabel}
                    hitSlop={8}
                    pressRetentionOffset={20}
                    className="flex-row items-center bg-[#18342B] px-3.5 py-2 rounded-2xl active:opacity-90"
                >
                    <Plus size={16} color="#FFFFFF" />
                    <Text className="text-xs font-bold text-white ml-1.5">{headerButtonLabel}</Text>
                </Pressable>
            </View>

            {/* Stat Banner: Total Money, Total Loans, or Monthly Subscriptions */}
            <View className="px-5 mb-3">
                {isLoansTab ? (
                    <View className="bg-amber-50/90 p-4 rounded-2xl border border-amber-200 shadow-sm flex-row items-center justify-between">
                        <View>
                            <Text className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Total Active Debt</Text>
                            <Text className="text-2xl font-black text-stone-900 tracking-tight mt-0.5">{formatCurrency(totalLoans)}</Text>
                        </View>
                        <View className="items-end">
                            <View className="bg-amber-100 px-2.5 py-1 rounded-full mb-1">
                                <Text className="text-xs font-bold text-amber-900">{loans.filter((l) => l.status === 'active').length} Active</Text>
                            </View>
                            <Text className="text-[10px] text-amber-700 font-medium">{loans.filter((l) => l.status === 'paid').length} Paid Off</Text>
                        </View>
                    </View>
                ) : isSubsTab ? (
                    <View className="bg-emerald-50/90 p-4 rounded-2xl border border-emerald-200 shadow-sm flex-row items-center justify-between">
                        <View className="flex-1 mr-3">
                            <Text className="text-[11px] font-bold uppercase tracking-wider text-[#18342B]">Monthly Subscription Spend</Text>
                            <Text className="text-2xl font-black text-stone-900 tracking-tight mt-0.5">
                                {formatCurrency(subsSummary.monthlyTotal)}
                                <Text className="text-xs font-semibold text-stone-500"> /mo</Text>
                            </Text>
                            {subsSummary.nextUpcoming ? (
                                <Text className="text-[11px] text-stone-600 font-medium mt-1" numberOfLines={1}>
                                    Next: {subsSummary.nextUpcoming.service_name} ({formatCurrency(subsSummary.nextUpcoming.amount)}) on{' '}
                                    {formatDisplayDate(subsSummary.nextUpcoming.next_billing_date)}
                                </Text>
                            ) : null}
                        </View>
                        <View className="items-end">
                            <View className="bg-emerald-100 px-2.5 py-1 rounded-full mb-1">
                                <Text className="text-xs font-bold text-[#18342B]">{subsSummary.activeCount} Active</Text>
                            </View>
                            <Text className="text-[10px] text-stone-500 font-medium">
                                {subsSummary.pausedCount} Paused • {subsSummary.cancelledCount} Cancelled
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm flex-row items-center justify-between">
                        <View>
                            <Text className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Total Money (Assets)</Text>
                            <Text className="text-2xl font-extrabold text-[#18342B] tracking-tight mt-0.5">{formatCurrency(totalMoney)}</Text>
                        </View>
                        <View className="items-end">
                            <View className="bg-stone-100 px-2.5 py-1 rounded-full mb-1">
                                <Text className="text-xs font-bold text-stone-700">
                                    {institutions.length} {institutions.length === 1 ? 'account' : 'accounts'}
                                </Text>
                            </View>
                            <Text className="text-[10px] text-stone-400 font-medium">
                                {institutions.reduce((s, i) => s + (i.pocket_count ?? 0), 0)} pockets
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Search Input */}
            <View className="px-5 mb-3">
                <View className="flex-row items-center bg-white px-3.5 py-2.5 rounded-2xl border border-stone-200/80">
                    <Search size={16} color="#A8A29E" />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder={
                            isLoansTab
                                ? 'Search loans, lenders, notes...'
                                : isSubsTab
                                  ? 'Search subscriptions, categories, pockets...'
                                  : 'Search accounts, notes, banks...'
                        }
                        placeholderTextColor="#A8A29E"
                        className="flex-1 ml-2 text-xs text-stone-900"
                    />
                </View>
            </View>

            {/* Filter Category Pills */}
            <View className="px-5 mb-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'bank', label: 'Banks' },
                        { id: 'ewallet', label: 'E-Wallets' },
                        { id: 'subscriptions', label: '🔄 Subscriptions' },
                        { id: 'loans', label: '💳 Loans & Debt' },
                        { id: 'cash', label: 'Cash' }
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
                                }`}
                            >
                                <Text className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-stone-600'}`}>{cat.label}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Main Content Area */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#BBD583" colors={['#18342B', '#BBD583']} />}
            >
                {isLoansTab ? (
                    // Loans View
                    filteredLoans.length === 0 ? (
                        <View className="mx-5 p-8 bg-white rounded-2xl border border-dashed border-stone-300 items-center justify-center">
                            <View className="w-12 h-12 rounded-full bg-amber-50 items-center justify-center mb-3">
                                <HandCoins size={22} color="#B45309" />
                            </View>
                            <Text className="text-sm font-semibold text-stone-800">No loans found</Text>
                            <Text className="text-xs text-stone-400 text-center mt-1">
                                {searchQuery ? `No loans matching "${searchQuery}"` : 'Track your lending apps, installments, or credit lines'}
                            </Text>
                            {!searchQuery && (
                                <Pressable
                                    onPress={() => setAddLoanVisible(true)}
                                    hitSlop={8}
                                    pressRetentionOffset={20}
                                    className="mt-4 bg-[#18342B] px-4 py-2 rounded-xl flex-row items-center active:opacity-80"
                                >
                                    <Plus size={14} color="#FFFFFF" />
                                    <Text className="text-xs font-bold text-white ml-1.5">Add First Loan</Text>
                                </Pressable>
                            )}
                        </View>
                    ) : (
                        <View className="px-5 space-y-3">
                            {filteredLoans.map((loan) => (
                                <View key={loan.id} className="mb-3">
                                    <LoanCard
                                        loan={loan}
                                        onPress={() => {
                                            setSelectedLoan(loan);
                                            setLoanDetailVisible(true);
                                        }}
                                    />
                                </View>
                            ))}
                        </View>
                    )
                ) : isSubsTab ? (
                    // Subscriptions View
                    filteredSubscriptions.length === 0 ? (
                        <View className="mx-5 p-8 bg-white rounded-2xl border border-dashed border-stone-300 items-center justify-center">
                            <View className="w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-3">
                                <Repeat size={22} color="#18342B" />
                            </View>
                            <Text className="text-sm font-semibold text-stone-800">No subscriptions yet</Text>
                            <Text className="text-xs text-stone-400 text-center mt-1">
                                {searchQuery
                                    ? `No subscriptions matching "${searchQuery}"`
                                    : 'Track Netflix, Spotify, iCloud, Gym & auto-deduct on due dates'}
                            </Text>
                            {!searchQuery && (
                                <Pressable
                                    onPress={() => {
                                        setEditingSubscription(null);
                                        setAddSubVisible(true);
                                    }}
                                    hitSlop={8}
                                    pressRetentionOffset={20}
                                    className="mt-4 bg-[#18342B] px-4 py-2 rounded-xl flex-row items-center active:opacity-80"
                                >
                                    <Plus size={14} color="#FFFFFF" />
                                    <Text className="text-xs font-bold text-white ml-1.5">Add First Subscription</Text>
                                </Pressable>
                            )}
                        </View>
                    ) : (
                        <View className="px-5">
                            {filteredSubscriptions.map((sub) => (
                                <View key={sub.id} className="mb-3">
                                    <SubscriptionCard
                                        subscription={sub}
                                        onPress={() => {
                                            setSelectedSubscription(sub);
                                            setSubDetailVisible(true);
                                        }}
                                    />
                                </View>
                            ))}
                        </View>
                    )
                ) : // Accounts Grid View
                filteredInstitutions.length === 0 ? (
                    <View className="mx-5 p-8 bg-white rounded-2xl border border-dashed border-stone-300 items-center justify-center">
                        <View className="w-12 h-12 rounded-full bg-stone-100 items-center justify-center mb-3">
                            <WalletCards size={22} color="#78716C" />
                        </View>
                        <Text className="text-sm font-semibold text-stone-800">No accounts found</Text>
                        <Text className="text-xs text-stone-400 text-center mt-1">
                            {searchQuery ? `No accounts matching "${searchQuery}"` : 'Connect your Philippine banks or e-wallets to get started'}
                        </Text>
                        {!searchQuery && (
                            <Pressable
                                onPress={() => setAddAccountVisible(true)}
                                hitSlop={8}
                                pressRetentionOffset={20}
                                className="mt-4 bg-[#BBD583] px-4 py-2 rounded-xl flex-row items-center active:opacity-80"
                            >
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

            {/* Modals for Accounts */}
            <AddAccountModal
                visible={addAccountVisible}
                onClose={() => setAddAccountVisible(false)}
                onSubmit={handleCreateAccount}
                onSwitchToLoan={() => {
                    setAddAccountVisible(false);
                    setAddLoanVisible(true);
                }}
            />

            <InstitutionDetailSheet
                visible={detailSheetVisible}
                institution={selectedInstitution}
                pockets={institutionPockets}
                onClose={() => setDetailSheetVisible(false)}
                onAddPocket={() => setAddPocketVisible(true)}
                onAddLoan={() => {
                    setDetailSheetVisible(false);
                    setAddLoanVisible(true);
                }}
                onUpdateNotes={handleUpdateNotes}
                onEditPocket={(pocket) => setEditingPocket(pocket)}
            />

            <EditPocketModal
                visible={!!editingPocket}
                pocket={editingPocket}
                institutionName={selectedInstitution?.name}
                onClose={() => setEditingPocket(null)}
                onSave={handleUpdatePocket}
            />

            <AddPocketModal
                visible={addPocketVisible}
                institutionId={selectedInstitution?.id || ''}
                institutionName={selectedInstitution?.name || ''}
                onClose={() => setAddPocketVisible(false)}
                onSubmit={handleAddPocket}
            />

            {/* Modals for Loans */}
            <AddLoanModal visible={addLoanVisible} onClose={() => setAddLoanVisible(false)} onSubmit={handleCreateLoan} />

            <LoanDetailSheet
                visible={loanDetailVisible}
                loan={selectedLoan}
                onClose={() => setLoanDetailVisible(false)}
                onRecordPayment={(loan) => {
                    setLoanDetailVisible(false);
                    setSelectedLoan(loan);
                    setPaymentModalVisible(true);
                }}
                onDelete={handleDeleteLoan}
                onEdit={(loan) => setEditingLoan(loan)}
            />

            <EditLoanModal visible={!!editingLoan} loan={editingLoan} onClose={() => setEditingLoan(null)} onSave={handleUpdateLoan} />

            <LoanPaymentModal
                visible={paymentModalVisible}
                loan={selectedLoan}
                pockets={allPockets}
                onClose={() => setPaymentModalVisible(false)}
                onSubmit={handleRecordPayment}
            />

            {/* Modals for Subscriptions */}
            <AddSubscriptionModal
                visible={addSubVisible}
                pockets={allPockets}
                editingSubscription={editingSubscription}
                onClose={() => {
                    setAddSubVisible(false);
                    setEditingSubscription(null);
                }}
                onSubmit={handleCreateSubscription}
                onUpdate={handleUpdateSubscription}
            />

            <SubscriptionDetailSheet
                visible={subDetailVisible}
                subscription={selectedSubscription}
                onClose={() => setSubDetailVisible(false)}
                onEdit={(sub) => {
                    setSubDetailVisible(false);
                    setEditingSubscription(sub);
                    setAddSubVisible(true);
                }}
                onTogglePause={handleTogglePauseSubscription}
                onCancelSubscription={handleCancelSubscription}
                onDelete={handleDeleteSubscription}
            />
        </View>
    );
}
