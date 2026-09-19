import React, { useState, useMemo } from 'react';
import { ScrollView, View, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Text,
  Card,
  Input,
  Button,
  Badge,
  Chip,
  Dialog,
  useToast,
} from 'panelui-native';
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Search,
  Filter,
  Trash2,
  Calendar,
  Tag,
  Plus,
  ReceiptText,
} from 'lucide-react-native';
import { useFinance } from '../../src/context/FinanceContext';
import { deleteTransaction } from '../../src/services/ledgerService';
import { TransactionWithDetails, TransactionType } from '../../src/types/database';
import FinancialCalendarView from '../../src/components/FinancialCalendarView';

export default function LedgerScreen() {
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const {
    currency,
    recentTransactions,
    accounts,
    categories,
    refreshAll,
  } = useFinance();

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedNature, setSelectedNature] = useState<string>('all');
  const [selectedTx, setSelectedTx] = useState<TransactionWithDetails | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const formatMoney = (amount: number) => {
    return `${currency}${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return recentTransactions.filter(tx => {
      // Type filter
      if (selectedType !== 'all' && tx.type !== selectedType) return false;
      // Account filter
      if (
        selectedAccount !== 'all' &&
        tx.account_id !== selectedAccount &&
        tx.to_account_id !== selectedAccount
      ) {
        return false;
      }
      // Nature filter
      if (selectedNature !== 'all' && tx.expense_nature !== selectedNature) return false;
      // Search term
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesNotes = (tx.notes || '').toLowerCase().includes(query);
        const matchesCat = (tx.category_name || '').toLowerCase().includes(query);
        const matchesTags = (tx.tags || '').toLowerCase().includes(query);
        const matchesAccount = (tx.account_name || '').toLowerCase().includes(query);
        if (!matchesNotes && !matchesCat && !matchesTags && !matchesAccount) return false;
      }
      return true;
    });
  }, [recentTransactions, selectedType, selectedAccount, selectedNature, search]);

  const handleDelete = async () => {
    if (!selectedTx) return;
    setDeleting(true);
    try {
      await deleteTransaction(selectedTx.id);
      await refreshAll();
      setDeleteConfirmOpen(false);
      setSelectedTx(null);
      toast.show({
        variant: 'info',
        label: 'Transaction Deleted',
        description: 'Account balance and ledger have been reconciled.',
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not delete transaction');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: 40,
          paddingHorizontal: 16,
          gap: 16,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View className="gap-0.5">
            <Text size="sm" muted weight="medium">
              Transactions & Ledgers
            </Text>
            <Text size="2xl" weight="bold">
              Ledger History
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/modal-transaction')}
            className="flex-row items-center bg-primary px-3 py-2 rounded-xl gap-1.5 active:opacity-80"
          >
            <Plus size={16} color="#FFFFFF" />
            <Text size="sm" weight="semibold" className="text-white">
              Add Record
            </Text>
          </TouchableOpacity>
        </View>

        {/* View Mode Toggle */}
        <View className="flex-row p-1 bg-card border border-border rounded-2xl gap-1">
          <TouchableOpacity
            onPress={() => setViewMode('list')}
            className={`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5 ${
              viewMode === 'list' ? 'bg-primary' : 'bg-transparent'
            }`}
          >
            <ReceiptText size={16} color={viewMode === 'list' ? '#FFFFFF' : '#6B7280'} />
            <Text
              size="xs"
              weight="semibold"
              className={viewMode === 'list' ? 'text-white' : 'text-muted-foreground'}
            >
              Ledger Stream
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewMode('calendar')}
            className={`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5 ${
              viewMode === 'calendar' ? 'bg-primary' : 'bg-transparent'
            }`}
          >
            <Calendar size={16} color={viewMode === 'calendar' ? '#FFFFFF' : '#6B7280'} />
            <Text
              size="xs"
              weight="semibold"
              className={viewMode === 'calendar' ? 'text-white' : 'text-muted-foreground'}
            >
              Calendar View
            </Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'calendar' ? (
          <FinancialCalendarView onSelectTransaction={(tx) => setSelectedTx(tx)} />
        ) : (
          <>
            {/* Search Bar */}
        <View className="flex-row items-center bg-card border border-border rounded-xl px-3 py-2 gap-2">
          <Search size={18} color="#9CA3AF" />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search notes, categories, tags..."
            className="flex-1 border-0 p-0 bg-transparent"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text size="xs" muted>
                Clear
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Type Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          <View className="flex-row gap-2">
            <Chip
              selected={selectedType === 'all'}
              onPress={() => setSelectedType('all')}
            >
              All Types
            </Chip>
            <Chip
              selected={selectedType === 'income'}
              onPress={() => setSelectedType('income')}
            >
              Income
            </Chip>
            <Chip
              selected={selectedType === 'expense'}
              onPress={() => setSelectedType('expense')}
            >
              Expenses
            </Chip>
            <Chip
              selected={selectedType === 'transfer'}
              onPress={() => setSelectedType('transfer')}
            >
              Transfers
            </Chip>
          </View>
        </ScrollView>

        {/* Expense Nature Filter Chips (Needs vs Wants) */}
        {selectedType === 'expense' || selectedType === 'all' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              <Chip
                variant="outline"
                selected={selectedNature === 'all'}
                onPress={() => setSelectedNature('all')}
              >
                All Natures
              </Chip>
              <Chip
                variant="outline"
                selected={selectedNature === 'needs'}
                onPress={() => setSelectedNature('needs')}
              >
                Needs
              </Chip>
              <Chip
                variant="outline"
                selected={selectedNature === 'wants'}
                onPress={() => setSelectedNature('wants')}
              >
                Wants
              </Chip>
              <Chip
                variant="outline"
                selected={selectedNature === 'obligation'}
                onPress={() => setSelectedNature('obligation')}
              >
                Debt / Loans
              </Chip>
            </View>
          </ScrollView>
        ) : null}

        {/* List of Ledger Items */}
        <View className="gap-2">
          <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
            Showing {filteredTransactions.length} movements
          </Text>

          {filteredTransactions.length === 0 ? (
            <Card className="p-8 bg-card border border-border rounded-xl items-center gap-3">
              <Text size="sm" muted>
                No ledger transactions match this filter.
              </Text>
              <Button
                size="sm"
                variant="outline"
                onPress={() => {
                  setSelectedType('all');
                  setSelectedNature('all');
                  setSearch('');
                }}
              >
                Reset Filters
              </Button>
            </Card>
          ) : (
            filteredTransactions.map(tx => {
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';
              return (
                <TouchableOpacity
                  key={tx.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedTx(tx)}
                  className="p-3.5 bg-card border border-border rounded-xl flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3 flex-1 pr-3">
                    <View
                      className={`p-2.5 rounded-xl ${
                        isIncome
                          ? 'bg-emerald-500/10'
                          : isTransfer
                          ? 'bg-blue-500/10'
                          : 'bg-rose-500/10'
                      }`}
                    >
                      {isIncome ? (
                        <TrendingUp size={18} color="#10B981" />
                      ) : isTransfer ? (
                        <ArrowRightLeft size={18} color="#3B82F6" />
                      ) : (
                        <TrendingDown size={18} color="#EF4444" />
                      )}
                    </View>

                    <View className="flex-1">
                      <Text size="sm" weight="semibold" numberOfLines={1}>
                        {tx.notes || tx.category_name || (isTransfer ? 'Account Transfer' : 'Expense')}
                      </Text>
                      <View className="flex-row items-center gap-2 mt-0.5">
                        <Text size="xs" muted>
                          {tx.date}
                        </Text>
                        <Text size="xs" muted>
                          •
                        </Text>
                        <Text size="xs" muted numberOfLines={1}>
                          {isTransfer ? `${tx.account_name} ➔ ${tx.to_account_name}` : tx.account_name}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="items-end gap-1">
                    <Text
                      size="sm"
                      weight="bold"
                      className={
                        isIncome
                          ? 'text-emerald-500'
                          : isTransfer
                          ? 'text-blue-500'
                          : 'text-rose-500'
                      }
                    >
                      {isIncome ? '+' : isTransfer ? '' : '-'}
                      {formatMoney(tx.amount)}
                    </Text>

                    {tx.expense_nature && !isTransfer && !isIncome ? (
                      <Badge variant="outline" className="px-1.5 py-0">
                        <Text size="xs" className="capitalize text-[10px]">
                          {tx.expense_nature}
                        </Text>
                      </Badge>
                    ) : null}

                    {isIncome && tx.deductions_total ? (
                      <Text size="xs" muted className="text-[10px]">
                        Ded: -{formatMoney(tx.deductions_total)}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
        </>
        )}
      </ScrollView>

      {/* Transaction Details Modal Dialog */}
      {selectedTx ? (
        <Dialog open={!!selectedTx} onOpenChange={open => !open && setSelectedTx(null)}>
          <Dialog.Content className="p-5 gap-4">
            <View className="flex-row items-center justify-between border-b border-border pb-3">
              <Text size="lg" weight="bold">
                Transaction Details
              </Text>
              <Badge
                variant="outline"
                className={
                  selectedTx.type === 'income'
                    ? 'border-emerald-500'
                    : selectedTx.type === 'transfer'
                    ? 'border-blue-500'
                    : 'border-rose-500'
                }
              >
                <Text
                  size="xs"
                  weight="semibold"
                  className={
                    selectedTx.type === 'income'
                      ? 'text-emerald-500 uppercase'
                      : selectedTx.type === 'transfer'
                      ? 'text-blue-500 uppercase'
                      : 'text-rose-500 uppercase'
                  }
                >
                  {selectedTx.type}
                </Text>
              </Badge>
            </View>

            <View className="gap-2.5">
              <View className="flex-row justify-between">
                <Text size="sm" muted>
                  Net Amount:
                </Text>
                <Text size="base" weight="bold">
                  {formatMoney(selectedTx.amount)}
                </Text>
              </View>

              {selectedTx.gross_amount ? (
                <View className="flex-row justify-between">
                  <Text size="sm" muted>
                    Gross Amount:
                  </Text>
                  <Text size="sm" weight="semibold">
                    {formatMoney(selectedTx.gross_amount)}
                  </Text>
                </View>
              ) : null}

              {selectedTx.deductions && selectedTx.deductions.length > 0 ? (
                <View className="p-2.5 bg-muted/20 rounded-xl gap-1">
                  <Text size="xs" weight="semibold" muted>
                    Itemized Deductions:
                  </Text>
                  {selectedTx.deductions.map(d => (
                    <View key={d.id} className="flex-row justify-between">
                      <Text size="xs">{d.name}</Text>
                      <Text size="xs" weight="semibold" className="text-rose-500">
                        -{formatMoney(d.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View className="flex-row justify-between">
                <Text size="sm" muted>
                  Date:
                </Text>
                <Text size="sm" weight="medium">
                  {selectedTx.date}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text size="sm" muted>
                  Account:
                </Text>
                <Text size="sm" weight="medium">
                  {selectedTx.account_name}
                </Text>
              </View>

              {selectedTx.to_account_name ? (
                <View className="flex-row justify-between">
                  <Text size="sm" muted>
                    To Account:
                  </Text>
                  <Text size="sm" weight="medium">
                    {selectedTx.to_account_name}
                  </Text>
                </View>
              ) : null}

              {selectedTx.category_name ? (
                <View className="flex-row justify-between">
                  <Text size="sm" muted>
                    Category:
                  </Text>
                  <Text size="sm" weight="medium">
                    {selectedTx.category_name}
                  </Text>
                </View>
              ) : null}

              {selectedTx.expense_nature ? (
                <View className="flex-row justify-between">
                  <Text size="sm" muted>
                    Nature:
                  </Text>
                  <Text size="sm" weight="medium" className="capitalize">
                    {selectedTx.expense_nature}
                  </Text>
                </View>
              ) : null}

              {selectedTx.notes ? (
                <View className="gap-0.5 pt-1">
                  <Text size="xs" muted>
                    Notes:
                  </Text>
                  <Text size="sm">{selectedTx.notes}</Text>
                </View>
              ) : null}
            </View>

            <View className="flex-row gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                className="flex-1"
                onPress={() => {
                  const txId = selectedTx.id;
                  setSelectedTx(null);
                  router.push({
                    pathname: '/modal-transaction',
                    params: { editId: txId },
                  });
                }}
              >
                Edit / Adjust
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onPress={() => setDeleteConfirmOpen(true)}
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                className="px-3"
                onPress={() => setSelectedTx(null)}
              >
                Close
              </Button>
            </View>
          </Dialog.Content>
        </Dialog>
      ) : null}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <Dialog.Content className="p-5 gap-3">
          <Text size="lg" weight="bold">
            Delete Transaction?
          </Text>
          <Text size="sm" muted>
            Are you sure you want to delete this ledger entry? Your account balance and linked records will automatically be adjusted.
          </Text>
          <View className="flex-row gap-2 pt-2">
            <Button
              variant="destructive"
              className="flex-1"
              loading={deleting}
              onPress={handleDelete}
            >
              Confirm Delete
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
          </View>
        </Dialog.Content>
      </Dialog>
    </View>
  );
}
