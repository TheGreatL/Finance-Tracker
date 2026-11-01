import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Menu, Plus, Search, X, WalletCards } from 'lucide-react-native';
import { useSidebar } from '../../src/context/SidebarContext';
import { useToast } from '../../src/context/ToastContext';
import { getDatabase } from '../../src/database/db';
import {
    getInstitutionsWithBalances,
    getPocketsByInstitution,
    createInstitutionWithPocket,
    addPocket,
    updatePocketMetadata,
    updateInstitutionNotes,
    getAllActivePockets,
    type CreateAccountInput
} from '../../src/services/accountService';
import { getLoansByInstitution, getLoanById, createLoan, recordLoanPayment, deleteLoan, updateLoanMetadata } from '../../src/services/loanService';
import { formatCurrency } from '../../src/utils/formatters';
import type {
    Institution,
    AccountPocket,
    PocketType,
    LoanRecord,
    CreateLoanInput,
    UpdateLoanMetadataInput,
    RecordLoanPaymentInput
} from '../../src/types/database';

import { InstitutionGrid } from '../../src/components/accounts/InstitutionGrid';
import { AddAccountModal } from '../../src/components/accounts/AddAccountModal';
import { InstitutionDetailSheet } from '../../src/components/accounts/InstitutionDetailSheet';
import { AddPocketModal } from '../../src/components/accounts/AddPocketModal';
import { EditPocketModal } from '../../src/components/accounts/EditPocketModal';
import { AddLoanModal } from '../../src/components/loans/AddLoanModal';
import { LoanDetailSheet } from '../../src/components/loans/LoanDetailSheet';
import { LoanPaymentModal } from '../../src/components/loans/LoanPaymentModal';
import { EditLoanModal } from '../../src/components/loans/EditLoanModal';

type FilterCategory = 'all' | 'bank' | 'ewallet' | 'cash';

type ModalStackItem = { type: 'institution'; institutionId: string } | { type: 'loanDetail'; loanId: string };

export default function AccountsScreen() {
    const insets = useSafeAreaInsets();
    const { openSidebar } = useSidebar();
    const { showToast } = useToast();

    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [allPockets, setAllPockets] = useState<(AccountPocket & { institution_name?: string })[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all');

    // Modals & Sheets
    const [addAccountVisible, setAddAccountVisible] = useState(false);
    const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
    const [institutionPockets, setInstitutionPockets] = useState<AccountPocket[]>([]);
    const [institutionLoans, setInstitutionLoans] = useState<LoanRecord[]>([]);
    const [detailSheetVisible, setDetailSheetVisible] = useState(false);
    const [addPocketVisible, setAddPocketVisible] = useState(false);
    const [addPocketInstitution, setAddPocketInstitution] = useState<Institution | null>(null);
    const [editingPocket, setEditingPocket] = useState<AccountPocket | null>(null);

    const [selectedLoan, setSelectedLoan] = useState<LoanRecord | null>(null);
    const [loanDetailVisible, setLoanDetailVisible] = useState(false);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [editingLoan, setEditingLoan] = useState<LoanRecord | null>(null);
    const [addLoanVisible, setAddLoanVisible] = useState(false);
    const [addLoanInitialProvider, setAddLoanInitialProvider] = useState<string | undefined>();

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
                    const target = insts.find((i: Institution) => i.id === prev.institutionId);
                    if (target) {
                        const [pocks, instLoans] = await Promise.all([getPocketsByInstitution(db, target.id), getLoansByInstitution(db, target.id)]);
                        setSelectedInstitution(target);
                        setInstitutionPockets(pocks);
                        setInstitutionLoans(instLoans);
                        setDetailSheetVisible(true);
                    } else if (modalBackStackRef.current.length > 0) {
                        popAndRestoreModal();
                    }
                } else if (prev.type === 'loanDetail') {
                    const target = await getLoanById(db, prev.loanId);
                    if (target) {
                        setSelectedLoan(target);
                        setLoanDetailVisible(true);
                    } else if (modalBackStackRef.current.length > 0) {
                        popAndRestoreModal();
                    }
                }
            } catch (err) {
                console.error('Failed to restore modal back-stack in accounts:', err);
            }
        }, 120);
    }, []);

    useEffect(() => {
        selectedInstitutionIdRef.current = selectedInstitution?.id ?? null;
    }, [selectedInstitution]);

    const loadData = useCallback(async () => {
        try {
            const db = await getDatabase();
            const [instItems, pocketItems] = await Promise.all([getInstitutionsWithBalances(db), getAllActivePockets(db)]);

            setInstitutions(instItems);
            setAllPockets(pocketItems);

            const openInstId = selectedInstitutionIdRef.current;
            if (openInstId) {
                const refreshedInst = instItems.find((i: Institution) => i.id === openInstId) || null;
                setSelectedInstitution((prev) => (prev && prev.id === openInstId ? refreshedInst : prev));
                if (refreshedInst) {
                    const [pockets, loans] = await Promise.all([
                        getPocketsByInstitution(db, refreshedInst.id),
                        getLoansByInstitution(db, refreshedInst.id)
                    ]);
                    if (selectedInstitutionIdRef.current === openInstId) {
                        setInstitutionPockets(pockets);
                        setInstitutionLoans(loans);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load accounts and wallets:', err);
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

    const handleSelectInstitution = async (inst: Institution) => {
        const db = await getDatabase();
        const [pockets, loans] = await Promise.all([getPocketsByInstitution(db, inst.id), getLoansByInstitution(db, inst.id)]);
        setSelectedInstitution(inst);
        setInstitutionPockets(pockets);
        setInstitutionLoans(loans);
        setDetailSheetVisible(true);
    };

    const handleCreateLoan = async (input: CreateLoanInput) => {
        const db = await getDatabase();
        await createLoan(db, input);
        await loadData();
        showToast('Loan added');
    };

    const handleRecordLoanPayment = async (input: RecordLoanPaymentInput) => {
        const db = await getDatabase();
        await recordLoanPayment(db, input);
        await loadData();
        showToast('Payment recorded');
    };

    const handleDeleteLoan = async (loanId: string) => {
        const db = await getDatabase();
        await deleteLoan(db, loanId);
        await loadData();
        showToast('Loan removed');
    };

    const handleUpdateLoan = async (loanId: string, updates: UpdateLoanMetadataInput) => {
        const db = await getDatabase();
        await updateLoanMetadata(db, loanId, updates);
        await loadData();
        showToast('Loan updated');
    };

    const handleCreateAccount = async (input: CreateAccountInput) => {
        const db = await getDatabase();
        await createInstitutionWithPocket(db, input);
        await loadData();
        showToast('Account added');
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
        const targetId = input.institutionId || selectedInstitution?.id || addPocketInstitution?.id;
        if (targetId) {
            const pockets = await getPocketsByInstitution(db, targetId);
            setInstitutionPockets(pockets);
        }
        await loadData();
        showToast(`Pocket "${input.name}" added`);
    };

    const handleUpdateNotes = async (institutionId: string, notes: string) => {
        const db = await getDatabase();
        await updateInstitutionNotes(db, institutionId, notes);
        await loadData();
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
        showToast('Pocket updated');
    };

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

    const totalMoney = useMemo(() => {
        return institutions.reduce((sum, inst) => sum + (inst.total_balance ?? 0), 0);
    }, [institutions]);

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
                        <Text className="text-2xl font-bold text-stone-900 tracking-tight">Accounts & Wallets</Text>
                        <Text className="text-xs text-stone-500 font-medium" numberOfLines={1}>
                            Banks, E-Wallets & Cash Pockets
                        </Text>
                    </View>
                </View>

                <Pressable
                    onPress={() => setAddAccountVisible(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Add Account"
                    hitSlop={8}
                    pressRetentionOffset={20}
                    className="flex-row items-center bg-[#18342B] px-3.5 py-2 rounded-2xl active:opacity-90"
                >
                    <Plus size={16} color="#FFFFFF" />
                    <Text className="text-xs font-bold text-white ml-1.5">Add Account</Text>
                </Pressable>
            </View>

            {/* Stat Banner: Total Liquid Holdings */}
            <View className="px-5 mb-3">
                <View className="bg-emerald-50/90 p-4 rounded-2xl border border-emerald-200 flex-row items-center justify-between">
                    <View>
                        <Text className="text-[11px] font-bold uppercase tracking-wider text-[#18342B]">Total Liquid Assets</Text>
                        <Text className="text-2xl font-bold text-stone-900 tracking-tight mt-0.5">{formatCurrency(totalMoney)}</Text>
                    </View>
                    <View className="items-end">
                        <View className="bg-emerald-100 px-2.5 py-1 rounded-full mb-1">
                            <Text className="text-xs font-bold text-[#18342B]">{institutions.length} Accounts</Text>
                        </View>
                        <Text className="text-[10px] text-stone-500 font-medium">{allPockets.length} Pockets active</Text>
                    </View>
                </View>
            </View>

            {/* Category Filter Tabs: All, Banks, E-Wallets, Cash */}
            <View className="px-5 mb-3">
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
            </View>

            {/* Search Bar */}
            <View className="px-5 mb-3">
                <View className="flex-row items-center bg-white border border-stone-200/80 rounded-2xl px-3.5 py-2">
                    <Search size={16} color="#78716C" />
                    <TextInput
                        className="flex-1 ml-2.5 text-sm text-stone-900 font-medium p-0"
                        placeholder="Search banks, e-wallets, or pockets..."
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

            {/* Content Body: Institution Grid */}
            <ScrollView
                className="flex-1 px-5"
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#18342B']} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {filteredInstitutions.length === 0 ? (
                    <View className="bg-white border border-stone-200/80 rounded-2xl p-6 items-center my-4">
                        <WalletCards size={36} color="#A8A29E" strokeWidth={1.5} />
                        <Text className="text-base font-bold text-stone-900 mt-3">No accounts found</Text>
                        <Text className="text-xs text-stone-500 text-center mt-1 font-medium">
                            {searchQuery
                                ? 'Try matching another name or institution code.'
                                : 'No financial institutions registered in this category.'}
                        </Text>
                        {!searchQuery && (
                            <Pressable
                                onPress={() => setAddAccountVisible(true)}
                                className="mt-4 bg-[#18342B] px-4 py-2 rounded-xl active:opacity-90"
                            >
                                <Text className="text-xs font-bold text-white">Add New Account</Text>
                            </Pressable>
                        )}
                    </View>
                ) : (
                    <InstitutionGrid
                        institutions={filteredInstitutions}
                        onSelectInstitution={handleSelectInstitution}
                        onAddAccount={() => setAddAccountVisible(true)}
                    />
                )}
            </ScrollView>

            {/* Modals & Sheets */}
            <AddAccountModal visible={addAccountVisible} onClose={() => setAddAccountVisible(false)} onSubmit={handleCreateAccount} />

            <InstitutionDetailSheet
                visible={detailSheetVisible}
                institution={selectedInstitution}
                pockets={institutionPockets}
                loans={institutionLoans}
                onClose={() => {
                    modalBackStackRef.current = [];
                    setDetailSheetVisible(false);
                    setSelectedInstitution(null);
                }}
                onAddPocket={() => {
                    if (selectedInstitution) {
                        pushModalBackStack({ type: 'institution', institutionId: selectedInstitution.id });
                    }
                    setAddPocketInstitution(selectedInstitution);
                    setDetailSheetVisible(false);
                    setAddPocketVisible(true);
                }}
                onEditPocket={(pocket) => {
                    if (selectedInstitution) {
                        pushModalBackStack({ type: 'institution', institutionId: selectedInstitution.id });
                    }
                    setDetailSheetVisible(false);
                    setEditingPocket(pocket);
                }}
                onAddLoan={() => {
                    if (selectedInstitution) {
                        pushModalBackStack({ type: 'institution', institutionId: selectedInstitution.id });
                    }
                    setAddLoanInitialProvider(selectedInstitution?.name);
                    setDetailSheetVisible(false);
                    setAddLoanVisible(true);
                }}
                onSelectLoan={(loan) => {
                    if (selectedInstitution) {
                        pushModalBackStack({ type: 'institution', institutionId: selectedInstitution.id });
                    }
                    setSelectedLoan(loan);
                    setDetailSheetVisible(false);
                    setLoanDetailVisible(true);
                }}
                onUpdateNotes={handleUpdateNotes}
            />

            {(selectedInstitution || addPocketInstitution) && (
                <AddPocketModal
                    visible={addPocketVisible}
                    institutionId={addPocketInstitution?.id || selectedInstitution?.id || ''}
                    institutionName={addPocketInstitution?.name || selectedInstitution?.name || 'Account'}
                    onClose={() => {
                        setAddPocketVisible(false);
                        setAddPocketInstitution(null);
                        popAndRestoreModal();
                    }}
                    onSubmit={async (input) => {
                        await handleAddPocket(input);
                        setAddPocketVisible(false);
                        setAddPocketInstitution(null);
                        popAndRestoreModal();
                    }}
                />
            )}

            <EditPocketModal
                visible={!!editingPocket}
                pocket={editingPocket}
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

            <AddLoanModal
                visible={addLoanVisible}
                initialProvider={addLoanInitialProvider}
                onClose={() => {
                    setAddLoanVisible(false);
                    popAndRestoreModal();
                }}
                onSubmit={async (input) => {
                    await handleCreateLoan(input);
                    setAddLoanVisible(false);
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
        </View>
    );
}
