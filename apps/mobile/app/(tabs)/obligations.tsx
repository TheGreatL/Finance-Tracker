import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Menu, Plus, Search, X, Briefcase, CreditCard, Repeat } from 'lucide-react-native';
import { useSidebar } from '../../src/context/SidebarContext';
import { useToast } from '../../src/context/ToastContext';
import { getDatabase } from '../../src/database/db';
import { getAllActivePockets } from '../../src/services/accountService';
import { getAllLoans, createLoan, updateLoanMetadata, deleteLoan, recordLoanPayment } from '../../src/services/loanService';
import {
    getAllSubscriptions,
    getSubscriptionsSummary,
    createSubscription,
    updateSubscription,
    updateSubscriptionStatus,
    deleteSubscription,
    processDueSubscriptions,
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
import { formatCurrency, formatDisplayDate } from '../../src/utils/formatters';
import type {
    LoanRecord,
    SubscriptionRecord,
    JobRecord,
    PaySlipRecord,
    AccountPocket,
    CreateLoanInput,
    RecordLoanPaymentInput,
    CreateSubscriptionInput,
    UpdateSubscriptionInput,
    CreateJobInput,
    UpdateJobInput,
    CreateDeductionInput
} from '../../src/types/database';

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

type ObligationCategory = 'loans' | 'subscriptions' | 'income';

export default function ObligationsScreen() {
    const insets = useSafeAreaInsets();
    const { openSidebar } = useSidebar();
    const { showToast } = useToast();
    const params = useLocalSearchParams<{ tab?: string }>();

    const [selectedTab, setSelectedTab] = useState<ObligationCategory>('loans');
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Shared Pockets for payment destination & salary deposit
    const [allPockets, setAllPockets] = useState<(AccountPocket & { institution_name?: string })[]>([]);

    // Loans State
    const [loans, setLoans] = useState<LoanRecord[]>([]);
    const [addLoanVisible, setAddLoanVisible] = useState(false);
    const [addLoanInitialProvider, setAddLoanInitialProvider] = useState<string | undefined>();
    const [selectedLoan, setSelectedLoan] = useState<LoanRecord | null>(null);
    const [loanDetailVisible, setLoanDetailVisible] = useState(false);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [editingLoan, setEditingLoan] = useState<LoanRecord | null>(null);

    // Subscriptions State
    const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
    const [subsSummary, setSubsSummary] = useState<SubscriptionsSummary>({
        monthlyTotal: 0,
        activeCount: 0,
        pausedCount: 0,
        cancelledCount: 0,
        nextUpcoming: null
    });
    const [addSubVisible, setAddSubVisible] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState<SubscriptionRecord | null>(null);
    const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionRecord | null>(null);
    const [subDetailVisible, setSubDetailVisible] = useState(false);

    // Salary & Income State
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

    // Refs to preserve open item sheets during background refreshes
    const selectedLoanIdRef = useRef<string | null>(null);
    const selectedSubscriptionIdRef = useRef<string | null>(null);

    useEffect(() => {
        selectedLoanIdRef.current = selectedLoan?.id ?? null;
    }, [selectedLoan]);

    useEffect(() => {
        selectedSubscriptionIdRef.current = selectedSubscription?.id ?? null;
    }, [selectedSubscription]);

    // Handle deep-link query parameter
    useEffect(() => {
        if (params.tab === 'loans') {
            setSelectedTab('loans');
        } else if (params.tab === 'subscriptions') {
            setSelectedTab('subscriptions');
        } else if (params.tab === 'income' || params.tab === 'salary') {
            setSelectedTab('income');
        }
    }, [params.tab]);

    const loadData = useCallback(async () => {
        try {
            const db = await getDatabase();

            await processDueSubscriptions(db);
            await processDuePaydays(db);

            const [pockets, loanItems, subItems, subSum, jobItems, incSum] = await Promise.all([
                getAllActivePockets(db),
                getAllLoans(db),
                getAllSubscriptions(db),
                getSubscriptionsSummary(db),
                getAllJobs(db),
                getIncomeSummary(db)
            ]);

            setAllPockets(pockets);
            setLoans(loanItems);
            setSubscriptions(subItems);
            setSubsSummary(subSum);
            setJobs(jobItems);
            setIncomeSummary(incSum);

            const openLoanId = selectedLoanIdRef.current;
            if (openLoanId) {
                const refreshed = loanItems.find((l) => l.id === openLoanId) || null;
                setSelectedLoan((prev) => (prev && prev.id === openLoanId ? refreshed : prev));
            }

            const openSubId = selectedSubscriptionIdRef.current;
            if (openSubId) {
                const refreshed = subItems.find((s) => s.id === openSubId) || null;
                setSelectedSubscription((prev) => (prev && prev.id === openSubId ? refreshed : prev));
            }
        } catch (err) {
            console.error('Failed to load obligations data:', err);
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

    // Loan Handlers
    const handleCreateLoan = async (input: CreateLoanInput) => {
        const db = await getDatabase();
        await createLoan(db, input);
        await loadData();
        showToast('Loan registered');
    };

    const handleDeleteLoan = async (loanId: string) => {
        const db = await getDatabase();
        await deleteLoan(db, loanId);
        await loadData();
        showToast('Loan removed');
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
        showToast('Loan updated');
    };

    const handleRecordPayment = async (input: { loanId: string; pocketId: string; amount: number; date: string; notes?: string }) => {
        const db = await getDatabase();
        await recordLoanPayment(db, input as RecordLoanPaymentInput);
        await loadData();
        showToast('Payment recorded');
    };

    // Subscription Handlers
    const handleCreateSubscription = async (input: CreateSubscriptionInput) => {
        const db = await getDatabase();
        await createSubscription(db, input);
        await loadData();
        showToast('Subscription added');
    };

    const handleUpdateSubscription = async (id: string, input: UpdateSubscriptionInput) => {
        const db = await getDatabase();
        await updateSubscription(db, id, input);
        await loadData();
        showToast('Subscription updated');
    };

    const handleTogglePauseSubscription = async (sub: SubscriptionRecord) => {
        const db = await getDatabase();
        const nextStatus = sub.status === 'active' ? 'paused' : 'active';
        await updateSubscriptionStatus(db, sub.id, nextStatus);
        await loadData();
        showToast(nextStatus === 'paused' ? 'Subscription paused' : 'Subscription resumed');
    };

    const handleCancelSubscription = async (sub: SubscriptionRecord) => {
        const db = await getDatabase();
        await updateSubscriptionStatus(db, sub.id, 'cancelled');
        await loadData();
        showToast('Subscription cancelled');
    };

    const handleDeleteSubscription = async (id: string) => {
        const db = await getDatabase();
        await deleteSubscription(db, id);
        await loadData();
        showToast('Subscription removed');
    };

    // Job Handlers
    const handleCreateJob = async (input: CreateJobInput, deductions: CreateDeductionInput[]) => {
        const db = await getDatabase();
        await createJob(db, input, deductions);
        await loadData();
        showToast('Job stream added');
    };

    const handleUpdateJob = async (id: string, updates: UpdateJobInput, deductions?: CreateDeductionInput[]) => {
        const db = await getDatabase();
        await updateJob(db, id, updates, deductions);
        await loadData();
        showToast('Job updated');
    };

    const handleArchiveJob = async (id: string) => {
        const db = await getDatabase();
        await archiveJob(db, id);
        await loadData();
        showToast('Job archived');
    };

    const handleUnarchiveJob = async (id: string) => {
        const db = await getDatabase();
        await unarchiveJob(db, id);
        await loadData();
        showToast('Job unarchived');
    };

    const handleDeleteJob = async (id: string) => {
        const db = await getDatabase();
        await deleteJob(db, id);
        await loadData();
        showToast('Job removed');
    };

    const handleRecordPayday = async (job: JobRecord) => {
        const db = await getDatabase();
        const now = new Date();
        const payDate = getNextPayDate(job.pay_schedule, job.pay_day_1, job.pay_day_2, now, job.payout_date);
        await recordPaydayManual(db, job.id, payDate, `Manual payday payout for ${job.title}`);
        await loadData();
        showToast(job.pay_schedule === 'one_time' ? 'One-time payout deposited' : 'Payday deposited');
    };

    // Filtered lists
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

    const totalActiveLoans = useMemo(() => {
        return loans.filter((l) => l.status === 'active').reduce((sum, l) => sum + l.remaining_balance, 0);
    }, [loans]);

    const headerTitle = selectedTab === 'loans' ? 'Loans & Debt' : selectedTab === 'subscriptions' ? 'Subscriptions' : 'Salary & Income';

    const headerSubtitle =
        selectedTab === 'loans'
            ? 'Installments, lending apps & payoff schedules'
            : selectedTab === 'subscriptions'
              ? 'Recurring bills, auto-pay & renewal alerts'
              : 'Multi-job streams, statutory deductions & paydays';

    const headerButtonLabel = selectedTab === 'loans' ? 'Add Loan' : selectedTab === 'subscriptions' ? 'Add Sub' : 'Add Job';

    const handleHeaderAddPress = () => {
        if (selectedTab === 'loans') {
            setAddLoanInitialProvider(undefined);
            setAddLoanVisible(true);
        } else if (selectedTab === 'subscriptions') {
            setEditingSubscription(null);
            setAddSubVisible(true);
        } else {
            setAddJobVisible(true);
        }
    };

    return (
        <View className="flex-1 bg-stone-50" style={{ paddingTop: Math.max(insets.top, 12) }}>
            {/* Header */}
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

            {/* 3-Way Segment Switcher: Loans, Subscriptions, Salary */}
            <View className="px-5 mb-3">
                <View accessibilityRole="tablist" className="flex-row bg-stone-200/80 p-1 rounded-2xl">
                    <Pressable
                        accessibilityRole="tab"
                        accessibilityLabel="Loans and Debt tab"
                        accessibilityState={{ selected: selectedTab === 'loans' }}
                        onPress={() => setSelectedTab('loans')}
                        hitSlop={6}
                        className={`flex-1 flex-row items-center justify-center py-2 rounded-xl ${selectedTab === 'loans' ? 'bg-[#18342B]' : ''}`}
                    >
                        <CreditCard size={15} color={selectedTab === 'loans' ? '#BBD583' : '#57534E'} strokeWidth={2.2} />
                        <Text className={`text-xs font-bold ml-1.5 ${selectedTab === 'loans' ? 'text-white' : 'text-stone-700'}`}>Loans</Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="tab"
                        accessibilityLabel="Subscriptions tab"
                        accessibilityState={{ selected: selectedTab === 'subscriptions' }}
                        onPress={() => setSelectedTab('subscriptions')}
                        hitSlop={6}
                        className={`flex-1 flex-row items-center justify-center py-2 rounded-xl ${selectedTab === 'subscriptions' ? 'bg-[#18342B]' : ''}`}
                    >
                        <Repeat size={15} color={selectedTab === 'subscriptions' ? '#BBD583' : '#57534E'} strokeWidth={2.2} />
                        <Text className={`text-xs font-bold ml-1.5 ${selectedTab === 'subscriptions' ? 'text-white' : 'text-stone-700'}`}>
                            Subscriptions
                        </Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="tab"
                        accessibilityLabel="Income and Jobs tab"
                        accessibilityState={{ selected: selectedTab === 'income' }}
                        onPress={() => setSelectedTab('income')}
                        hitSlop={6}
                        className={`flex-1 flex-row items-center justify-center py-2 rounded-xl ${selectedTab === 'income' ? 'bg-[#18342B]' : ''}`}
                    >
                        <Briefcase size={15} color={selectedTab === 'income' ? '#BBD583' : '#57534E'} strokeWidth={2.2} />
                        <Text className={`text-xs font-bold ml-1.5 ${selectedTab === 'income' ? 'text-white' : 'text-stone-700'}`}>Income</Text>
                    </Pressable>
                </View>
            </View>

            {/* Stat Banner */}
            <View className="px-5 mb-3">
                {selectedTab === 'loans' ? (
                    <View className="bg-amber-50/90 p-4 rounded-2xl border border-amber-200 flex-row items-center justify-between">
                        <View>
                            <Text className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Total Active Debt</Text>
                            <Text className="text-2xl font-bold text-stone-900 tracking-tight mt-0.5">{formatCurrency(totalActiveLoans)}</Text>
                        </View>
                        <View className="items-end">
                            <View className="bg-amber-100 px-2.5 py-1 rounded-full mb-1">
                                <Text className="text-xs font-bold text-amber-900">{loans.filter((l) => l.status === 'active').length} Active</Text>
                            </View>
                            <Text className="text-[10px] text-amber-700 font-medium">{loans.filter((l) => l.status === 'paid').length} Paid Off</Text>
                        </View>
                    </View>
                ) : selectedTab === 'subscriptions' ? (
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
                            ) : (
                                <Text className="text-[11px] text-stone-500 font-medium mt-1">No upcoming charges</Text>
                            )}
                        </View>
                        <View className="items-end">
                            <View className="bg-emerald-100 px-2.5 py-1 rounded-full mb-1">
                                <Text className="text-xs font-bold text-[#18342B]">{subsSummary.activeCount} Active</Text>
                            </View>
                            <Text className="text-[10px] text-stone-500 font-medium">
                                {subsSummary.pausedCount} Paused · {subsSummary.cancelledCount} Cancelled
                            </Text>
                        </View>
                    </View>
                ) : (
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
                )}
            </View>

            {/* Search Bar */}
            <View className="px-5 mb-3">
                <View className="flex-row items-center bg-white border border-stone-200/80 rounded-2xl px-3.5 py-2">
                    <Search size={16} color="#78716C" />
                    <TextInput
                        className="flex-1 ml-2.5 text-sm text-stone-900 font-medium p-0"
                        placeholder={
                            selectedTab === 'loans'
                                ? 'Search loans or lenders...'
                                : selectedTab === 'subscriptions'
                                  ? 'Search subscriptions or billing pockets...'
                                  : 'Search jobs, employers or notes...'
                        }
                        placeholderTextColor="#A8A29E"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                            <X size={15} color="#78716C" />
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Scrollable Content Body */}
            <ScrollView
                className="flex-1 px-5"
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#18342B']} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* LOANS TAB */}
                {selectedTab === 'loans' && (
                    <View>
                        {filteredLoans.length === 0 ? (
                            <View className="bg-white border border-stone-200/80 rounded-2xl p-6 items-center my-4">
                                <CreditCard size={36} color="#A8A29E" strokeWidth={1.5} />
                                <Text className="text-base font-bold text-stone-900 mt-3">No loans found</Text>
                                <Text className="text-xs text-stone-500 text-center mt-1 font-medium">
                                    {searchQuery ? 'Try matching another lender or loan title.' : 'You have no loans or debts registered.'}
                                </Text>
                                {!searchQuery && (
                                    <Pressable
                                        onPress={() => setAddLoanVisible(true)}
                                        className="mt-4 bg-[#18342B] px-4 py-2 rounded-xl active:opacity-90"
                                    >
                                        <Text className="text-xs font-bold text-white">Add First Loan</Text>
                                    </Pressable>
                                )}
                            </View>
                        ) : (
                            <View className="gap-3">
                                {filteredLoans.map((loan) => (
                                    <LoanCard
                                        key={loan.id}
                                        loan={loan}
                                        onPress={() => {
                                            setSelectedLoan(loan);
                                            setLoanDetailVisible(true);
                                        }}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* SUBSCRIPTIONS TAB */}
                {selectedTab === 'subscriptions' && (
                    <View>
                        {filteredSubscriptions.length === 0 ? (
                            <View className="bg-white border border-stone-200/80 rounded-2xl p-6 items-center my-4">
                                <Repeat size={36} color="#A8A29E" strokeWidth={1.5} />
                                <Text className="text-base font-bold text-stone-900 mt-3">No subscriptions found</Text>
                                <Text className="text-xs text-stone-500 text-center mt-1 font-medium">
                                    {searchQuery
                                        ? 'No recurring bill matches your search term.'
                                        : 'Track your streaming services, mobile plans, and utility subscriptions.'}
                                </Text>
                                {!searchQuery && (
                                    <Pressable
                                        onPress={() => {
                                            setEditingSubscription(null);
                                            setAddSubVisible(true);
                                        }}
                                        className="mt-4 bg-[#18342B] px-4 py-2 rounded-xl active:opacity-90"
                                    >
                                        <Text className="text-xs font-bold text-white">Add First Subscription</Text>
                                    </Pressable>
                                )}
                            </View>
                        ) : (
                            <View className="gap-3">
                                {filteredSubscriptions.map((sub) => (
                                    <SubscriptionCard
                                        key={sub.id}
                                        subscription={sub}
                                        onPress={() => {
                                            setSelectedSubscription(sub);
                                            setSubDetailVisible(true);
                                        }}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* SALARY & INCOME TAB */}
                {selectedTab === 'income' && (
                    <View>
                        {/* Sub-status Switcher: Active vs Archived */}
                        <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row bg-stone-200/80 p-0.5 rounded-xl">
                                <Pressable
                                    onPress={() => setIncomeTabStatus('active')}
                                    className={`px-3 py-1.5 rounded-lg ${incomeTabStatus === 'active' ? 'bg-white shadow-xs' : ''}`}
                                >
                                    <Text className={`text-xs font-bold ${incomeTabStatus === 'active' ? 'text-stone-900' : 'text-stone-600'}`}>
                                        Active ({incomeSummary.activeJobsCount})
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => setIncomeTabStatus('archived')}
                                    className={`px-3 py-1.5 rounded-lg ${incomeTabStatus === 'archived' ? 'bg-white shadow-xs' : ''}`}
                                >
                                    <Text className={`text-xs font-bold ${incomeTabStatus === 'archived' ? 'text-stone-900' : 'text-stone-600'}`}>
                                        Archived ({incomeSummary.archivedJobsCount})
                                    </Text>
                                </Pressable>
                            </View>

                            <Pressable
                                onPress={() => setAddJobVisible(true)}
                                className="flex-row items-center bg-emerald-700 px-3 py-1.5 rounded-xl active:opacity-90"
                            >
                                <Plus size={14} color="#FFFFFF" />
                                <Text className="text-xs font-bold text-white ml-1">New Job</Text>
                            </Pressable>
                        </View>

                        {/* Deductions Visual Breakdown Chart */}
                        {incomeSummary.activeJobsCount > 0 && incomeTabStatus === 'active' && (
                            <View className="mb-4">
                                <IncomeVisualBreakdownChart
                                    monthlyGross={incomeSummary.monthlyGross}
                                    monthlyNetTakeHome={incomeSummary.monthlyNetTakeHome}
                                    deductionBreakdown={incomeSummary.deductionBreakdown}
                                />
                            </View>
                        )}

                        {filteredJobs.length === 0 ? (
                            <View className="bg-white border border-stone-200/80 rounded-2xl p-6 items-center my-4">
                                <Briefcase size={36} color="#A8A29E" strokeWidth={1.5} />
                                <Text className="text-base font-bold text-stone-900 mt-3">
                                    {incomeTabStatus === 'active' ? 'No active jobs registered' : 'No archived jobs'}
                                </Text>
                                <Text className="text-xs text-stone-500 text-center mt-1 font-medium">
                                    {searchQuery
                                        ? 'No employment streams match your search term.'
                                        : incomeTabStatus === 'active'
                                          ? 'Configure your employment, salary schedule, and statutory deductions.'
                                          : 'Past employment records will be stored here.'}
                                </Text>
                                {!searchQuery && incomeTabStatus === 'active' && (
                                    <Pressable
                                        onPress={() => setAddJobVisible(true)}
                                        className="mt-4 bg-[#18342B] px-4 py-2 rounded-xl active:opacity-90"
                                    >
                                        <Text className="text-xs font-bold text-white">Add Job Stream</Text>
                                    </Pressable>
                                )}
                            </View>
                        ) : (
                            <View className="gap-3">
                                {filteredJobs.map((job) => (
                                    <JobCard
                                        key={job.id}
                                        job={job}
                                        onPress={() => {
                                            setSelectedJob(job);
                                            setJobDetailVisible(true);
                                        }}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Modals & Bottom Sheets */}
            {/* Loan Modals */}
            <AddLoanModal
                visible={addLoanVisible}
                initialProvider={addLoanInitialProvider}
                onClose={() => setAddLoanVisible(false)}
                onSubmit={handleCreateLoan}
            />

            <LoanDetailSheet
                visible={loanDetailVisible}
                loan={selectedLoan}
                onClose={() => {
                    setLoanDetailVisible(false);
                    setSelectedLoan(null);
                }}
                onEdit={(loan) => {
                    setEditingLoan(loan);
                    setLoanDetailVisible(false);
                }}
                onRecordPayment={(loan) => {
                    setSelectedLoan(loan);
                    setPaymentModalVisible(true);
                }}
                onDelete={handleDeleteLoan}
            />

            <EditLoanModal
                visible={!!editingLoan}
                loan={editingLoan}
                onClose={() => setEditingLoan(null)}
                onSave={async (loanId, updates) => {
                    await handleUpdateLoan(loanId, updates);
                    setEditingLoan(null);
                }}
            />

            <LoanPaymentModal
                visible={paymentModalVisible}
                loan={selectedLoan}
                pockets={allPockets}
                onClose={() => setPaymentModalVisible(false)}
                onSubmit={handleRecordPayment}
            />

            {/* Subscription Modals */}
            <AddSubscriptionModal
                visible={addSubVisible}
                pockets={allPockets}
                editingSubscription={editingSubscription}
                onClose={() => {
                    setAddSubVisible(false);
                    setEditingSubscription(null);
                }}
                onSubmit={async (data) => {
                    await handleCreateSubscription(data);
                    setAddSubVisible(false);
                    setEditingSubscription(null);
                }}
                onUpdate={async (id, data) => {
                    await handleUpdateSubscription(id, data);
                    setAddSubVisible(false);
                    setEditingSubscription(null);
                }}
            />

            <SubscriptionDetailSheet
                visible={subDetailVisible}
                subscription={selectedSubscription}
                onClose={() => {
                    setSubDetailVisible(false);
                    setSelectedSubscription(null);
                }}
                onEdit={(sub) => {
                    setSelectedSubscription(null);
                    setSubDetailVisible(false);
                    setEditingSubscription(sub);
                    setAddSubVisible(true);
                }}
                onTogglePause={handleTogglePauseSubscription}
                onCancelSubscription={handleCancelSubscription}
                onDelete={handleDeleteSubscription}
            />

            {/* Job Modals */}
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
                onEdit={(job) => {
                    setSelectedJob(job);
                    setJobDetailVisible(false);
                    setEditJobVisible(true);
                }}
                onRecordPayday={async (job) => {
                    await handleRecordPayday(job);
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
