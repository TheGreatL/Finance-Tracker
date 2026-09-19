import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Text,
  Card,
  Input,
  Button,
  Chip,
  useToast,
} from 'panelui-native';
import {
  X,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Trash2,
  Calendar as CalendarIcon,
} from 'lucide-react-native';
import { useFinance } from '../src/context/FinanceContext';
import { createTransaction } from '../src/services/ledgerService';
import { TransactionType, ExpenseNature } from '../src/types/database';
import {
  transactionFormSchema,
  validateForm,
  cleanNumericString,
} from '../src/schemas/validationSchemas';
import CalendarPickerModal from '../src/components/CalendarPickerModal';

export default function ModalTransactionScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string; to_account_id?: string; date?: string }>();
  const { toast } = useToast();
  const { currency, accounts, categories, loans, savingsGoals, refreshAll } = useFinance();

  const [type, setType] = useState<TransactionType>(
    (params.type as TransactionType) || 'expense'
  );
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(params.date || new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(
    params.to_account_id || accounts.find(a => a.id !== accounts[0]?.id)?.id || ''
  );
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [expenseNature, setExpenseNature] = useState<ExpenseNature>('needs');
  const [linkedLoanId, setLinkedLoanId] = useState<string>('');
  const [linkedGoalId, setLinkedGoalId] = useState<string>('');

  // Itemized Deductions for Income
  const [deductions, setDeductions] = useState<Array<{ name: string; amount: number }>>([]);
  const [newDedName, setNewDedName] = useState('');
  const [newDedAmount, setNewDedAmount] = useState('');
  const [dedError, setDedError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  // Filter categories by type
  const relevantCategories = categories.filter(c => c.type === (type === 'income' ? 'income' : 'expense'));

  const handleAddDeduction = () => {
    const cleanAmt = cleanNumericString(newDedAmount);
    const dedAmt = parseFloat(cleanAmt);
    if (!newDedName.trim()) {
      setDedError('Please enter a deduction name (e.g. Tax, SSS)');
      return;
    }
    if (isNaN(dedAmt) || dedAmt <= 0) {
      setDedError('Deduction amount must be a positive number');
      return;
    }
    setDedError('');
    setDeductions([...deductions, { name: newDedName.trim(), amount: dedAmt }]);
    setNewDedName('');
    setNewDedAmount('');
  };

  const handleRemoveDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const netAmountNum = parseFloat(cleanNumericString(amount)) || 0;
  const grossIncome = netAmountNum + totalDeductions;

  const handleSubmit = async () => {
    const formData = {
      type,
      amount,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      categoryId: type !== 'transfer' ? categoryId : undefined,
      date,
      notes,
      tags,
    };

    const validation = validateForm(transactionFormSchema, formData);
    if (!validation.success) {
      setErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      toast.show({
        variant: 'destructive',
        label: 'Validation Error',
        description: firstError || 'Please check the highlighted fields.',
      });
      return;
    }

    setErrors({});
    const finalAmount = parseFloat(cleanNumericString(amount));

    setSubmitting(true);
    try {
      await createTransaction({
        type,
        account_id: accountId,
        to_account_id: type === 'transfer' ? toAccountId : null,
        category_id: type !== 'transfer' ? categoryId || null : null,
        amount: finalAmount,
        date,
        notes: notes.trim(),
        tags: tags.trim(),
        expense_nature: type === 'expense' ? expenseNature : 'needs',
        gross_amount: type === 'income' ? grossIncome : null,
        deductions: type === 'income' ? deductions : [],
        linked_loan_id: linkedLoanId || null,
        linked_goal_id: linkedGoalId || null,
      });

      await refreshAll();
      toast.show({
        variant: 'success',
        label: 'Transaction Saved',
        description: 'Account balance updated in SQLite ledger.',
      });
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save transaction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 40,
          paddingHorizontal: 16,
          gap: 18,
        }}
      >
        {/* Modal Header */}
        <View className="flex-row items-center justify-between">
          <Text size="2xl" weight="bold">
            Record Movement
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-full bg-muted/20 active:opacity-75"
          >
            <X size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Segmented Type Toggle */}
        <View className="flex-row p-1 bg-card border border-border rounded-2xl gap-1">
          <TouchableOpacity
            onPress={() => {
              setType('expense');
              clearFieldError('toAccountId');
            }}
            className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 ${
              type === 'expense' ? 'bg-rose-500' : 'bg-transparent'
            }`}
          >
            <TrendingDown size={16} color={type === 'expense' ? '#FFFFFF' : '#EF4444'} />
            <Text
              size="xs"
              weight="semibold"
              className={type === 'expense' ? 'text-white' : 'text-muted-foreground'}
            >
              Expense
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setType('income');
              clearFieldError('toAccountId');
            }}
            className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 ${
              type === 'income' ? 'bg-emerald-500' : 'bg-transparent'
            }`}
          >
            <TrendingUp size={16} color={type === 'income' ? '#FFFFFF' : '#10B981'} />
            <Text
              size="xs"
              weight="semibold"
              className={type === 'income' ? 'text-white' : 'text-muted-foreground'}
            >
              Income
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setType('transfer')}
            className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 ${
              type === 'transfer' ? 'bg-blue-500' : 'bg-transparent'
            }`}
          >
            <ArrowRightLeft size={16} color={type === 'transfer' ? '#FFFFFF' : '#3B82F6'} />
            <Text
              size="xs"
              weight="semibold"
              className={type === 'transfer' ? 'text-white' : 'text-muted-foreground'}
            >
              Transfer
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <Card className="p-4 bg-card border border-border rounded-2xl gap-2">
          <Input
            label={`${type === 'income' ? 'Net Received Amount' : 'Amount'} (${currency})`}
            isRequired
            value={amount}
            onChangeText={(val) => {
              setAmount(val);
              clearFieldError('amount');
            }}
            errorMessage={errors.amount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            className="text-2xl font-bold"
          />
          {type === 'income' && totalDeductions > 0 ? (
            <View className="flex-row justify-between pt-1 border-t border-border">
              <Text size="xs" muted>
                Gross Earnings: {currency}{grossIncome.toFixed(2)}
              </Text>
              <Text size="xs" muted className="text-rose-500">
                Total Deductions: -{currency}{totalDeductions.toFixed(2)}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Source Account Picker */}
        <View className="gap-2">
          <View className="flex-row justify-between items-center">
            <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
              {type === 'income' ? 'Deposit To Account' : type === 'transfer' ? 'From Account' : 'Paid From Account'}
            </Text>
            {errors.accountId ? (
              <Text size="xs" className="text-destructive font-medium">
                {errors.accountId}
              </Text>
            ) : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {accounts.map(acc => (
                <Chip
                  key={acc.id}
                  selected={accountId === acc.id}
                  onPress={() => {
                    setAccountId(acc.id);
                    clearFieldError('accountId');
                  }}
                >
                  {acc.name} ({currency}{acc.current_balance.toLocaleString()})
                </Chip>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Destination Account Picker (Transfer mode only) */}
        {type === 'transfer' && (
          <View className="gap-2">
            <View className="flex-row justify-between items-center">
              <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
                To Destination Account
              </Text>
              {errors.toAccountId ? (
                <Text size="xs" className="text-destructive font-medium">
                  {errors.toAccountId}
                </Text>
              ) : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {accounts
                  .filter(a => a.id !== accountId)
                  .map(acc => (
                    <Chip
                      key={acc.id}
                      selected={toAccountId === acc.id}
                      onPress={() => {
                        setToAccountId(acc.id);
                        clearFieldError('toAccountId');
                      }}
                    >
                      {acc.name} ({currency}{acc.current_balance.toLocaleString()})
                    </Chip>
                  ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Categories (Income & Expense only) */}
        {type !== 'transfer' && (
          <View className="gap-2">
            <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
              Category
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {relevantCategories.map(cat => (
                  <Chip
                    key={cat.id}
                    selected={categoryId === cat.id}
                    onPress={() => setCategoryId(cat.id)}
                  >
                    {cat.name}
                  </Chip>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Needs vs Wants Nature (Expense only) */}
        {type === 'expense' && (
          <View className="gap-2">
            <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
              Expense Nature (Needs vs Wants)
            </Text>
            <View className="flex-row gap-2">
              <Chip
                selected={expenseNature === 'needs'}
                onPress={() => setExpenseNature('needs')}
              >
                Needs (Essential)
              </Chip>
              <Chip
                selected={expenseNature === 'wants'}
                onPress={() => setExpenseNature('wants')}
              >
                Wants (Lifestyle)
              </Chip>
              <Chip
                selected={expenseNature === 'obligation'}
                onPress={() => setExpenseNature('obligation')}
              >
                Debt Obligation
              </Chip>
            </View>
          </View>
        )}

        {/* Itemized Deductions (Income only) */}
        {type === 'income' && (
          <Card className="p-4 bg-card border border-border rounded-2xl gap-3">
            <Text size="sm" weight="bold">
              Itemized Deductions (Taxes & Contributions)
            </Text>
            <Text size="xs" muted>
              Track taxes, healthcare, insurance, or company deductions withheld from your gross pay.
            </Text>

            {deductions.map((d, i) => (
              <View
                key={i}
                className="flex-row justify-between items-center p-2 bg-muted/20 rounded-xl"
              >
                <View>
                  <Text size="sm" weight="semibold">
                    {d.name}
                  </Text>
                  <Text size="xs" muted>
                    -{currency}{d.amount.toFixed(2)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveDeduction(i)}>
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}

            <View className="flex-row gap-2 items-center pt-2 border-t border-border">
              <Input
                value={newDedName}
                onChangeText={(val) => {
                  setNewDedName(val);
                  setDedError('');
                }}
                placeholder="e.g. Tax, SSS, Insurance"
                className="flex-1"
              />
              <Input
                value={newDedAmount}
                onChangeText={(val) => {
                  setNewDedAmount(val);
                  setDedError('');
                }}
                placeholder="Amount"
                keyboardType="decimal-pad"
                className="w-24"
              />
              <Button size="sm" variant="outline" onPress={handleAddDeduction}>
                Add
              </Button>
            </View>
            {dedError ? (
              <Text size="xs" className="text-destructive font-medium">
                {dedError}
              </Text>
            ) : null}
          </Card>
        )}

        {/* Link to Goal or Loan (Optional) */}
        {type === 'expense' && (loans.length > 0 || savingsGoals.length > 0) ? (
          <View className="gap-2">
            <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
              Link to Loan or Savings Goal (Optional)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                <Chip
                  selected={!linkedLoanId && !linkedGoalId}
                  onPress={() => {
                    setLinkedLoanId('');
                    setLinkedGoalId('');
                  }}
                >
                  None
                </Chip>
                {loans
                  .filter(l => l.status === 'active')
                  .map(l => (
                    <Chip
                      key={l.id}
                      selected={linkedLoanId === l.id}
                      onPress={() => {
                        setLinkedLoanId(l.id);
                        setLinkedGoalId('');
                        setExpenseNature('obligation');
                      }}
                    >
                      Loan: {l.title}
                    </Chip>
                  ))}
                {savingsGoals
                  .filter(g => g.status === 'active')
                  .map(g => (
                    <Chip
                      key={g.id}
                      selected={linkedGoalId === g.id}
                      onPress={() => {
                        setLinkedGoalId(g.id);
                        setLinkedLoanId('');
                      }}
                    >
                      Goal: {g.name}
                    </Chip>
                  ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {/* Date, Notes & Tags */}
        <Card className="p-4 bg-card border border-border rounded-2xl gap-4">
          <Input
            label="Transaction Date"
            isRequired
            value={date}
            onChangeText={(val) => {
              setDate(val);
              clearFieldError('date');
            }}
            errorMessage={errors.date}
            placeholder="YYYY-MM-DD"
            endContent={
              <TouchableOpacity
                onPress={() => setCalendarOpen(true)}
                className="p-1 rounded-lg bg-primary/10 active:opacity-75"
              >
                <CalendarIcon size={18} color="#6366F1" />
              </TouchableOpacity>
            }
          />

          <Input
            label="Notes / Description"
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Monthly salary, Groceries, Dinner"
          />

          <Input
            label="Tags (comma separated)"
            value={tags}
            onChangeText={setTags}
            placeholder="e.g. food, market, family"
          />
        </Card>

        {/* Submit Action */}
        <Button
          loading={submitting}
          onPress={handleSubmit}
          className="mt-2"
        >
          Commit to Ledger
        </Button>
      </ScrollView>

      <CalendarPickerModal
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        selectedDate={date}
        onSelectDate={(newDate) => {
          setDate(newDate);
          clearFieldError('date');
        }}
        title="Pick Transaction Date"
      />
    </View>
  );
}
