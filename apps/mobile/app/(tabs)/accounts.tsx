import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, RefreshControl, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Search, Plus, WalletCards, HandCoins, Repeat, Briefcase, Menu, X } from 'lucide-react-native';
import { useSidebar } from '../../src/context/SidebarContext';
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
import {
    getAllJobs,
    getIncomeSummary,
    createJob,
    updateJob,
    archiveJob,
    unarchiveJob,
    deleteJob,
    recordPaydayManual,
    processDuePaydays,
    getNextPayDate,
    type IncomeSummary
} from '../../src/services/salaryService';
import type {
    Institution,
    AccountPocket,
    PocketType,
    LoanRecord,
    CreateLoanInput,
    RecordLoanPaymentInput,
    SubscriptionRecord,
    CreateSubscriptionInput,
    UpdateSubscriptionInput,
    JobRecord,
    PaySlipRecord,
    CreateJobInput,
    UpdateJobInput,
    CreateDeductionInput
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
import { JobCard } from '../../src/components/salary/JobCard';
import { JobDetailSheet } from '../../src/components/salary/JobDetailSheet';
import { AddJobModal } from '../../src/components/salary/AddJobModal';
import { EditJobModal } from '../../src/components/salary/EditJobModal';
import { PaySlipDetailModal } from '../../src/components/salary/PaySlipDetailModal';
import { IncomeVisualBreakdownChart } from '../../src/components/salary/IncomeVisualBreakdownChart';

type FilterCategory = 'all' | 'bank' | 'ewallet' | 'income' | 'subscriptions' | 'loans' | 'cash';

type ModalStackItem =
    { type: 'institution'; institutionId: string } | { type: 'loanDetail'; loanId: string } | { type: 'subscriptionDetail'; subscriptionId: string };

export default function AccountsScreen() {
    const insets = useSafeAreaInsets();
    const { openSidebar } = useSidebar();
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
    const [addLoanInitialProvider, setAddLoanInitialProvider] = useState<string | undefined>();
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

    // Income & Job State
    const [jobs, setJobs] = useState<JobRecord[]>([]);
    const [incomeSummary, setIncomeSummary] = useState<IncomeSummary>({
        activeJobsCount: 0,
        archivedJobsCount: 0,
        monthlyGross: 0,
        monthlyDeductions: 0,
        monthlyNetTakeHome: 0,
        deductionBreakdown: { tax: 0, statutory: 0, workplace: 0, other: 0, total: 0 }
    });
    const [incomeTabStatus, setIncomeTabStatus] = useState<'active' | 'archived'>('active');
    const [addJobVisible, setAddJobVisible] = useState(false);
    const [editJobVisible, setEditJobVisible] = useState(false);
    const [jobDetailVisible, setJobDetailVisible] = useState(false);
    const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
    const [selectedPaySlip, setSelectedPaySlip] = useState<PaySlipRecord | null>(null);
    const [paySlipModalVisible, setPaySlipModalVisible] = useState(false);

    // Mirrors of the open items' ids for use inside async loaders
    const selectedInstitutionIdRef = useRef<string | null>(null);
    const selectedLoanIdRef = useRef<string | null>(null);
    const selectedSubscriptionIdRef = useRef<string | null>(null);
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
                        const pocks = await getPocketsByInstitution(db, target.id);
                        setSelectedInstitution(target);
                        setInstitutionPockets(pocks);
                        setDetailSheetVisible(true);
                    }
                } else if (prev.type === 'loanDetail') {
                    const all = await getAllLoans(db);
                    const target = all.find((l) => l.id === prev.loanId);
                    if (target) {
                        setSelectedLoan(target);
                        setLoanDetailVisible(true);
                    } else if (modalBackStackRef.current.length > 0) {
                        popAndRestoreModal();
                    }
                } else if (prev.type === 'subscriptionDetail') {
                    const allSubs = await getAllSubscriptions(db);
                    const target = allSubs.find((s) => s.id === prev.subscriptionId);
                    if (target) {
                        setSelectedSubscription(target);
                        setSubDetailVisible(true);
                    } else if (modalBackStackRef.current.length > 0) {
                        popAndRestoreModal();
                    }
                }
            } catch (err) {
                console.warn('Failed to restore parent modal:', err);
            }
        }, 120);
    }, []);

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
        } else if (params.tab === 'income') {
            setSelectedFilter('income');
        }
    }, [params.tab]);

    const loadData = useCallback(async () => {
        try {
            const db = await getDatabase();

            // Catch up any due or missed subscription charges automatically
            await processDueSubscriptions(db);

            // Catch up any due or scheduled payday deposits automatically
            await processDuePaydays(db);

            const [instItems, loanItems, pocketItems, subItems, subSum, jobItems, incSum] = await Promise.all([
                getInstitutionsWithBalances(db),
                getAllLoans(db),
                getAllActivePockets(db),
                getAllSubscriptions(db),
                getSubscriptionsSummary(db),
                getAllJobs(db),
                getIncomeSummary(db)
            ]);

            setInstitutions(instItems);
            setLoans(loanItems);
            setAllPockets(pocketItems);
            setSubscriptions(subItems);
            setSubsSummary(subSum);
            setJobs(jobItems);
            setIncomeSummary(incSum);

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

    // Job Handlers
    const handleCreateJob = async (input: CreateJobInput, deductions: CreateDeductionInput[]) => {
        const db = await getDatabase();
        await createJob(db, input, deductions);
        await loadData();
    };

    const handleUpdateJob = async (id: string, updates: UpdateJobInput, deductions?: CreateDeductionInput[]) => {
        const db = await getDatabase();
        await updateJob(db, id, updates, deductions);
        await loadData();
    };

    const handleArchiveJob = async (id: string) => {
        const db = await getDatabase();
        await archiveJob(db, id);
        await loadData();
    };

    const handleUnarchiveJob = async (id: string) => {
        const db = await getDatabase();
        await unarchiveJob(db, id);
        await loadData();
    };

    const handleDeleteJob = async (id: string) => {
        const db = await getDatabase();
        await deleteJob(db, id);
        await loadData();
    };

    const handleRecordPayday = async (job: JobRecord) => {
        const db = await getDatabase();
        const now = new Date();
        const payDate = getNextPayDate(job.pay_schedule, job.pay_day_1, job.pay_day_2, now);
        await recordPaydayManual(db, job.id, payDate, `Manual payday payout for ${job.title}`);
        await loadData();
    };

    // Filtering jobs
    const filteredJobs = useMemo(() => {
        return jobs
            .filter((j) => j.status === incomeTabStatus)
            .filter((j) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                const matchesTitle = j.title.toLowerCase().includes(q);
                const matchesCompany = j.company_name.toLowerCase().includes(q);
                const matchesNotes = j.notes?.toLowerCase().includes(q) ?? false;
                return matchesTitle || matchesCompany || matchesNotes;
            });
    }, [jobs, incomeTabStatus, searchQuery]);

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

    const isObligationSection = selectedFilter === 'income' || selectedFilter === 'subscriptions' || selectedFilter === 'loans';
    const isAccountsSection = !isObligationSection;

    const isLoansTab = selectedFilter === 'loans';
    const isSubsTab = selectedFilter === 'subscriptions';
    const isIncomeTab = selectedFilter === 'income';

    const headerTitle = isAccountsSection ? 'Accounts & Wallets' : isIncomeTab ? 'Salary & Income' : isLoansTab ? 'Loans & Debt' : 'Subscriptions';

    const headerSubtitle = isAccountsSection
        ? 'Philippine Banks, E-Wallets & Cash'
        : isIncomeTab
          ? 'Multi-Job Streams, Deductions & Paydays'
          : isLoansTab
            ? 'Lending Apps, Installments & Personal Loans'
            : 'Recurring Bills, Auto-Pay & Due Reminders';

    const headerButtonLabel = isAccountsSection ? 'Add Account' : isIncomeTab ? 'Add Job' : isLoansTab ? 'Add Loan' : 'Add Sub';

    const handleHeaderAddPress = () => {
        if (isIncomeTab) {
            setAddJobVisible(true);
        } else if (isLoansTab) {
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
                <View className="flex-row items-center flex-1 mr-2">
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Open sidebar navigation"
                        onPress={openSidebar}
                        hitSlop={8}
                        className="items-center justify-center w-10 h-10 rounded-full bg-stone-200/70 active:opacity-70 mr-3"
                    >
                        <Menu size={20} color="#18342B" strokeWidth={2.2} />
                    </Pressable>
                    <View className="flex-1">
                        <Text className="text-2xl font-bold text-stone-900 tracking-tight">{headerTitle}</Text>
                        <Text className="text-xs text-stone-500 font-medium" numberOfLines={1}>
                            {headerSubtitle}
                        </Text>
                    </View>
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

            {/* Top-Level Section Switcher: Accounts vs Obligations */}
            <View className="px-5 mb-2.5">
                <View accessibilityRole="tablist" className="flex-row bg-stone-200/80 p-1 rounded-2xl">
                    <Pressable
                        accessibilityRole="tab"
                        accessibilityLabel="Accounts and Wallets tab"
                        accessibilityState={{ selected: isAccountsSection }}
                        onPress={() => {
                            if (isObligationSection) {
                                setSelectedFilter('all');
                            }
                        }}
                        hitSlop={6}
                        className={`flex-1 flex-row items-center justify-center py-2 rounded-xl ${isAccountsSection ? 'bg-[#18342B]' : ''}`}
                    >
                        <WalletCards size={15} color={isAccountsSection ? '#BBD583' : '#57534E'} strokeWidth={2.2} />
                        <Text className={`text-xs font-bold ml-1.5 ${isAccountsSection ? 'text-white' : 'text-stone-700'}`}>Accounts & Wallets</Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="tab"
                        accessibilityLabel="Obligations and Income tab"
                        accessibilityState={{ selected: isObligationSection }}
                        onPress={() => {
                            if (isAccountsSection) {
                                setSelectedFilter('income');
                            }
                        }}
                        hitSlop={6}
                        className={`flex-1 flex-row items-center justify-center py-2 rounded-xl ${isObligationSection ? 'bg-[#18342B]' : ''}`}
                    >
                        <Briefcase size={15} color={isObligationSection ? '#BBD583' : '#57534E'} strokeWidth={2.2} />
                        <Text className={`text-xs font-bold ml-1.5 ${isObligationSection ? 'text-white' : 'text-stone-700'}`}>
                            Obligations & Income
                        </Text>
                    </Pressable>
                </View>
            </View>

            {/* Sub-Category Switcher: Direct 1-touch tabs without horizontal overflow */}
            <View className="px-5 mb-3">
                {isAccountsSection ? (
                    <View accessibilityRole="tablist" className="flex-row gap-1.5">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'bank', label: 'Banks' },
                            { id: 'ewallet', label: 'E-Wallets' },
                            { id: 'cash', label: 'Cash' }
                        ].map((cat) => {
                            const isSelected = selectedFilter === cat.id;
                            return (
                                <Pressable
                                    key={cat.id}
                                    accessibilityRole="tab"
                                    accessibilityState={{ selected: isSelected }}
                                    onPress={() => setSelectedFilter(cat.id as FilterCategory)}
                                    hitSlop={6}
                                    pressRetentionOffset={10}
                                    className={`flex-1 py-1.5 rounded-xl border items-center justify-center ${
                                        isSelected ? 'bg-stone-900 border-stone-900' : 'bg-white border-stone-200/80'
                                    }`}
                                >
                                    <Text numberOfLines={1} className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-stone-600'}`}>
                                        {cat.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                ) : (
                    <View accessibilityRole="tablist" className="flex-row gap-1.5">
                        {[
                            { id: 'income', label: 'Income & Jobs' },
                            { id: 'subscriptions', label: 'Subscriptions' },
                            { id: 'loans', label: 'Loans & Debt' }
                        ].map((cat) => {
                            const isSelected = selectedFilter === cat.id;
                            return (
                                <Pressable
                                    key={cat.id}
                                    accessibilityRole="tab"
                                    accessibilityState={{ selected: isSelected }}
                                    onPress={() => setSelectedFilter(cat.id as FilterCategory)}
                                    hitSlop={6}
                                    pressRetentionOffset={10}
                                    className={`flex-1 py-1.5 rounded-xl border items-center justify-center ${
                                        isSelected ? 'bg-stone-900 border-stone-900' : 'bg-white border-stone-200/80'
                                    }`}
                                >
                                    <Text numberOfLines={1} className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-stone-600'}`}>
                                        {cat.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
            </View>

            {/* Stat Banner: Total Money, Total Loans, Monthly Subscriptions, or Monthly Income */}
            <View className="px-5 mb-3">
                {isIncomeTab ? (
                    <View className="bg-emerald-50/90 p-4 rounded-2xl border border-emerald-200">
                        <View className="flex-row items-center justify-between mb-2">
                            <View>
                                <Text className="text-[11px] font-bold uppercase tracking-wider text-[#18342B]">Expected Monthly Take-Home</Text>
                                <Text className="text-2xl font-bold text-emerald-700 tracking-tight mt-0.5">
                                    {formatCurrency(incomeSummary.monthlyNetTakeHome)}
                                    <Text className="text-xs font-semibold text-stone-500"> /mo</Text>
                                </Text>
                            </View>
                            <View className="items-end">
                                <View className="bg-emerald-100 px-2.5 py-1 rounded-full mb-1">
                                    <Text className="text-xs font-bold text-[#18342B]">{incomeSummary.activeJobsCount} Active Jobs</Text>
                                </View>
                                <Text className="text-[10px] text-stone-500 font-medium">{incomeSummary.archivedJobsCount} Archived</Text>
                            </View>
                        </View>
                        <View className="flex-row justify-between pt-2 border-t border-emerald-200/60">
                            <Text className="text-xs text-stone-600 font-medium">
                                Gross: <Text className="font-bold text-stone-800">{formatCurrency(incomeSummary.monthlyGross)}/mo</Text>
                            </Text>
                            <Text className="text-xs text-rose-600 font-medium">
                                Deductions: <Text className="font-bold text-rose-700">-{formatCurrency(incomeSummary.monthlyDeductions)}/mo</Text>
                            </Text>
                        </View>
                    </View>
                ) : isLoansTab ? (
                    <View className="bg-amber-50/90 p-4 rounded-2xl border border-amber-200 flex-row items-center justify-between">
                        <View>
                            <Text className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Total Active Debt</Text>
                            <Text className="text-2xl font-bold text-stone-900 tracking-tight mt-0.5">{formatCurrency(totalLoans)}</Text>
                        </View>
                        <View className="items-end">
                            <View className="bg-amber-100 px-2.5 py-1 rounded-full mb-1">
                                <Text className="text-xs font-bold text-amber-900">{loans.filter((l) => l.status === 'active').length} Active</Text>
                            </View>
                            <Text className="text-[10px] text-amber-700 font-medium">{loans.filter((l) => l.status === 'paid').length} Paid Off</Text>
                        </View>
                    </View>
                ) : isSubsTab ? (
                    <View className="bg-emerald-50/90 p-4 rounded-2xl border border-emerald-200 flex-row items-center justify-between">
                        <View className="flex-1 mr-3">
                            <Text className="text-[11px] font-bold uppercase tracking-wider text-[#18342B]">Monthly Subscription Spend</Text>
                            <Text className="text-2xl font-bold text-stone-900 tracking-tight mt-0.5">
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
                    <View className="bg-white p-4 rounded-2xl border border-stone-200/80 flex-row items-center justify-between">
                        <View>
                            <Text className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Total Money (Assets)</Text>
                            <Text className="text-2xl font-bold text-[#18342B] tracking-tight mt-0.5">{formatCurrency(totalMoney)}</Text>
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
                            isIncomeTab
                                ? 'Search jobs, employers, titles...'
                                : isLoansTab
                                  ? 'Search loans, lenders, notes...'
                                  : isSubsTab
                                    ? 'Search subscriptions, categories, pockets...'
                                    : 'Search accounts, notes, banks...'
                        }
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

            {/* Main Content Area */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#BBD583" colors={['#18342B', '#BBD583']} />}
            >
                {isIncomeTab ? (
                    // Income & Jobs View
                    <View className="px-5">
                        {/* Visual Breakdown of Monthly Gross */}
                        <IncomeVisualBreakdownChart
                            monthlyGross={incomeSummary.monthlyGross}
                            monthlyNetTakeHome={incomeSummary.monthlyNetTakeHome}
                            deductionBreakdown={incomeSummary.deductionBreakdown}
                        />

                        {/* Active vs Archived Segmented Control */}
                        <View className="flex-row items-center bg-stone-200/70 p-1 rounded-xl mb-4">
                            <Pressable
                                onPress={() => setIncomeTabStatus('active')}
                                className={`flex-1 py-1.5 rounded-lg items-center ${incomeTabStatus === 'active' ? 'bg-white shadow-xs' : ''}`}
                            >
                                <Text className={`text-xs font-bold ${incomeTabStatus === 'active' ? 'text-stone-900' : 'text-stone-500'}`}>
                                    Active Jobs ({incomeSummary.activeJobsCount})
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setIncomeTabStatus('archived')}
                                className={`flex-1 py-1.5 rounded-lg items-center ${incomeTabStatus === 'archived' ? 'bg-white shadow-xs' : ''}`}
                            >
                                <Text className={`text-xs font-bold ${incomeTabStatus === 'archived' ? 'text-stone-900' : 'text-stone-500'}`}>
                                    Archived ({incomeSummary.archivedJobsCount})
                                </Text>
                            </Pressable>
                        </View>

                        {/* Jobs List */}
                        {filteredJobs.length === 0 ? (
                            <View className="p-8 bg-white rounded-2xl border border-dashed border-stone-300 items-center justify-center">
                                <View className="w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-3">
                                    <Briefcase size={22} color="#18342B" />
                                </View>
                                <Text className="text-sm font-semibold text-stone-800">
                                    {incomeTabStatus === 'active' ? 'No active jobs found' : 'No archived career records'}
                                </Text>
                                <Text className="text-xs text-stone-400 text-center mt-1">
                                    {searchQuery
                                        ? `No jobs matching "${searchQuery}"`
                                        : incomeTabStatus === 'active'
                                          ? 'Track your day job, freelance gigs, or client contracts with itemized deductions'
                                          : 'Past jobs you archive will appear here with lifetime pay slip records'}
                                </Text>
                                {!searchQuery && incomeTabStatus === 'active' && (
                                    <Pressable
                                        onPress={() => setAddJobVisible(true)}
                                        className="mt-4 bg-[#18342B] px-4 py-2 rounded-xl flex-row items-center active:opacity-80"
                                    >
                                        <Plus size={14} color="#FFFFFF" />
                                        <Text className="text-xs font-bold text-white ml-1.5">Add First Job</Text>
                                    </Pressable>
                                )}
                            </View>
                        ) : (
                            filteredJobs.map((job) => (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    onPress={() => {
                                        setSelectedJob(job);
                                        setJobDetailVisible(true);
                                    }}
                                />
                            ))
                        )}
                    </View>
                ) : isLoansTab ? (
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
                loans={loans.filter(
                    (l) =>
                        l.institution_id === selectedInstitution?.id ||
                        (!!selectedInstitution?.code && l.institution_code === selectedInstitution?.code)
                )}
                onClose={() => {
                    setDetailSheetVisible(false);
                    setSelectedInstitution(null);
                    modalBackStackRef.current = [];
                }}
                onAddPocket={() => {
                    if (selectedInstitution) {
                        pushModalBackStack({ type: 'institution', institutionId: selectedInstitution.id });
                    }
                    setDetailSheetVisible(false);
                    setAddPocketVisible(true);
                }}
                onAddLoan={() => {
                    if (selectedInstitution) {
                        pushModalBackStack({ type: 'institution', institutionId: selectedInstitution.id });
                    }
                    setDetailSheetVisible(false);
                    setAddLoanInitialProvider(selectedInstitution?.code);
                    setAddLoanVisible(true);
                }}
                onSelectLoan={(loan) => {
                    if (selectedInstitution) {
                        pushModalBackStack({ type: 'institution', institutionId: selectedInstitution.id });
                    }
                    setDetailSheetVisible(false);
                    setSelectedLoan(loan);
                    setLoanDetailVisible(true);
                }}
                onUpdateNotes={handleUpdateNotes}
                onEditPocket={(pocket) => {
                    if (selectedInstitution) {
                        pushModalBackStack({ type: 'institution', institutionId: selectedInstitution.id });
                    }
                    setDetailSheetVisible(false);
                    setEditingPocket(pocket);
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
                institutionName={selectedInstitution?.name || ''}
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

            {/* Modals for Loans */}
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
                    await handleRecordPayment(input);
                    setPaymentModalVisible(false);
                    popAndRestoreModal();
                }}
            />

            {/* Modals for Subscriptions */}
            <AddSubscriptionModal
                visible={addSubVisible}
                pockets={allPockets}
                editingSubscription={editingSubscription}
                onClose={() => {
                    setAddSubVisible(false);
                    setEditingSubscription(null);
                    popAndRestoreModal();
                }}
                onSubmit={async (input) => {
                    await handleCreateSubscription(input);
                    setAddSubVisible(false);
                    setEditingSubscription(null);
                    popAndRestoreModal();
                }}
                onUpdate={async (subId, input) => {
                    await handleUpdateSubscription(subId, input);
                    setAddSubVisible(false);
                    setEditingSubscription(null);
                    popAndRestoreModal();
                }}
            />

            <SubscriptionDetailSheet
                visible={subDetailVisible}
                subscription={selectedSubscription}
                onClose={() => {
                    setSubDetailVisible(false);
                    setSelectedSubscription(null);
                    popAndRestoreModal();
                }}
                onEdit={(sub) => {
                    pushModalBackStack({ type: 'subscriptionDetail', subscriptionId: sub.id });
                    setSubDetailVisible(false);
                    setEditingSubscription(sub);
                    setAddSubVisible(true);
                }}
                onTogglePause={handleTogglePauseSubscription}
                onCancelSubscription={handleCancelSubscription}
                onDelete={async (subId) => {
                    await handleDeleteSubscription(subId);
                    setSubDetailVisible(false);
                    setSelectedSubscription(null);
                    popAndRestoreModal();
                }}
            />

            {/* Modals for Salary & Jobs */}
            <AddJobModal visible={addJobVisible} pockets={allPockets} onClose={() => setAddJobVisible(false)} onSubmit={handleCreateJob} />

            <EditJobModal
                visible={editJobVisible}
                job={selectedJob}
                pockets={allPockets}
                onClose={() => {
                    setEditJobVisible(false);
                    setSelectedJob(null);
                }}
                onSubmit={handleUpdateJob}
                onArchive={handleArchiveJob}
                onUnarchive={handleUnarchiveJob}
                onDelete={handleDeleteJob}
            />

            <JobDetailSheet
                visible={jobDetailVisible}
                job={selectedJob}
                onClose={() => {
                    setJobDetailVisible(false);
                    setSelectedJob(null);
                }}
                onEdit={(j) => {
                    setSelectedJob(j);
                    setJobDetailVisible(false);
                    setEditJobVisible(true);
                }}
                onRecordPayday={async (j) => {
                    await handleRecordPayday(j);
                    setJobDetailVisible(false);
                    setSelectedJob(null);
                }}
                onViewPaySlip={(slip) => {
                    setSelectedPaySlip(slip);
                    setPaySlipModalVisible(true);
                }}
            />

            <PaySlipDetailModal
                visible={paySlipModalVisible}
                paySlip={selectedPaySlip}
                onClose={() => {
                    setPaySlipModalVisible(false);
                    setSelectedPaySlip(null);
                }}
            />
        </View>
    );
}
