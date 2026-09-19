import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Alert, TextInput } from 'react-native';
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
  Calculator,
  Plus,
  ShieldCheck,
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

  const handleAddPresetDeduction = (presetName: string) => {
    const existingIndex = deductions.findIndex(
      (d) => d.name.toLowerCase() === presetName.toLowerCase()
    );
    if (existingIndex >= 0) {
      toast.show({
        variant: 'info',
        label: 'Already In List',
        description: `${presetName} is already in your deductions list below.`,
      });
      return;
    }
    setDeductions([...deductions, { name: presetName, amount: 0 }]);
  };

  const handleAddCutoffPreset = (cutoff: 'first' | 'second') => {
    const list =
      cutoff === 'first'
        ? ['SSS', 'PhilHealth']
        : ['Withholding Tax', 'Pag-IBIG'];
    const existing = new Set(deductions.map((d) => d.name.toLowerCase()));
    const toAdd: Array<{ name: string; amount: number }> = [];
    for (const name of list) {
      if (!existing.has(name.toLowerCase())) {
        toAdd.push({ name, amount: 0 });
      }
    }
    if (toAdd.length === 0) {
      toast.show({
        variant: 'info',
        label: 'Already In List',
        description: `${cutoff === 'first' ? 'SSS and PhilHealth' : 'Tax and Pag-IBIG'} are already in your list.`,
      });
    } else {
      setDeductions([...deductions, ...toAdd]);
      toast.show({
        variant: 'success',
        label: `${cutoff === 'first' ? '1st Cutoff (SSS & PhilHealth)' : '2nd Cutoff (Tax & Pag-IBIG)'} Added`,
        description: 'Enter deduction amounts in the fields below.',
      });
    }
  };

  const handleAddStandard4Deductions = () => {
    const standard = ['Withholding Tax', 'SSS', 'PhilHealth', 'Pag-IBIG'];
    const existing = new Set(deductions.map((d) => d.name.toLowerCase()));
    const toAdd: Array<{ name: string; amount: number }> = [];
    for (const name of standard) {
      if (!existing.has(name.toLowerCase())) {
        toAdd.push({ name, amount: 0 });
      }
    }
    if (toAdd.length === 0) {
      toast.show({
        variant: 'info',
        label: 'All Present',
        description: 'Tax, SSS, PhilHealth, and Pag-IBIG are already in your list.',
      });
    } else {
      setDeductions([...deductions, ...toAdd]);
      toast.show({
        variant: 'success',
        label: 'Standard Deductions Added',
        description: 'Enter the deduction amounts in the fields below.',
      });
    }
  };

  const handleUpdateDeductionAmount = (index: number, val: string) => {
    const clean = cleanNumericString(val);
    const num = parseFloat(clean) || 0;
    const updated = [...deductions];
    updated[index] = { ...updated[index], amount: num };
    setDeductions(updated);
  };

  const handleRemoveDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const netAmountNum = parseFloat(cleanNumericString(amount)) || 0;
  const grossIncome = netAmountNum + totalDeductions;

  const [grossInput, setGrossInput] = useState('');
  const [showGrossHelper, setShowGrossHelper] = useState(false);

  const handleComputeNetFromGross = () => {
    const cleanGross = cleanNumericString(grossInput);
    const grossNum = parseFloat(cleanGross);
    if (isNaN(grossNum) || grossNum <= 0) {
      Alert.alert('Invalid Gross Amount', 'Please enter a valid gross salary amount.');
      return;
    }
    const computedNet = Math.max(0, grossNum - totalDeductions);
    setAmount(computedNet.toFixed(2));
    clearFieldError('amount');
    setShowGrossHelper(false);
    toast.show({
      variant: 'success',
      label: 'Net Pay Calculated',
      description: `Net Take-Home Pay set to ${currency}${computedNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
    });
  };

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
            {/* Header: Title on left with flex-1, Gross Helper button on right */}
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center gap-1.5">
                  <ShieldCheck size={16} color="#10B981" />
                  <Text size="sm" weight="bold">
                    Itemized Deductions & Payslip
                  </Text>
                </View>
                <Text size="xs" muted>
                  Tax, SSS, PhilHealth, Pag-IBIG
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowGrossHelper(!showGrossHelper)}
                className="flex-row items-center gap-1 bg-primary/10 px-2.5 py-1.5 rounded-lg shrink-0 active:opacity-75"
              >
                <Calculator size={13} color="#4F46E5" />
                <Text size="xs" weight="semibold" className="text-primary">
                  {showGrossHelper ? 'Hide Helper' : 'Gross Helper'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text size="xs" muted>
              Track statutory government contributions (Tax, SSS, PhilHealth, Pag-IBIG) or employer deductions.
            </Text>

            {/* Quick Presets */}
            <View className="gap-1.5 pt-1">
              <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
                Quick Presets
              </Text>
              <View className="flex-row gap-2 flex-wrap">
                <TouchableOpacity
                  onPress={() => handleAddCutoffPreset('first')}
                  className="bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg flex-row items-center gap-1 active:opacity-75"
                >
                  <Plus size={12} color="#10B981" />
                  <Text size="xs" weight="bold" className="text-emerald-700 dark:text-emerald-300">
                    1st Cutoff (SSS & PhilHealth)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAddCutoffPreset('second')}
                  className="bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1.5 rounded-lg flex-row items-center gap-1 active:opacity-75"
                >
                  <Plus size={12} color="#6366F1" />
                  <Text size="xs" weight="bold" className="text-indigo-700 dark:text-indigo-300">
                    2nd Cutoff (Tax & Pag-IBIG)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddStandard4Deductions}
                  className="bg-muted/30 border border-border px-2.5 py-1.5 rounded-lg flex-row items-center gap-1 active:opacity-75"
                >
                  <Plus size={12} color="#6B7280" />
                  <Text size="xs" weight="bold" className="text-foreground">
                    All 4 (PH)
                  </Text>
                </TouchableOpacity>
                <Chip onPress={() => handleAddPresetDeduction('Withholding Tax')}>
                  Tax (BIR)
                </Chip>
                <Chip onPress={() => handleAddPresetDeduction('SSS')}>
                  SSS
                </Chip>
                <Chip onPress={() => handleAddPresetDeduction('PhilHealth')}>
                  PhilHealth
                </Chip>
                <Chip onPress={() => handleAddPresetDeduction('Pag-IBIG')}>
                  Pag-IBIG
                </Chip>
              </View>
            </View>

            {/* Gross-to-Net Helper Modal/Box */}
            {showGrossHelper && (
              <View className="p-3 bg-primary/5 border border-primary/20 rounded-xl gap-2 mt-1">
                <Text size="xs" weight="bold" className="text-primary">
                  Calculate Net Pay from Gross Salary
                </Text>
                <Text size="xs" muted>
                  Enter your contracted Gross Pay. The app will subtract total deductions ({currency}{totalDeductions.toFixed(2)}) and fill in your Net Take-Home Pay.
                </Text>
                <View className="flex-row gap-2 items-center">
                  <View className="flex-1 bg-card border border-border rounded-xl px-3 py-2 flex-row items-center min-w-0">
                    <Text size="xs" muted className="mr-1 font-semibold">
                      {currency}
                    </Text>
                    <TextInput
                      value={grossInput}
                      onChangeText={setGrossInput}
                      placeholder="e.g. 50000"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="decimal-pad"
                      className="flex-1 text-sm text-foreground py-0"
                    />
                  </View>
                  <Button
                    size="sm"
                    onPress={handleComputeNetFromGross}
                    className="shrink-0 px-3 min-w-[84px]"
                  >
                    Apply Net
                  </Button>
                </View>
              </View>
            )}

            {/* Deductions List */}
            {deductions.length > 0 && (
              <View className="gap-2 pt-2 border-t border-border">
                <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
                  Configured Deductions ({deductions.length})
                </Text>
                {deductions.map((d, i) => (
                  <View
                    key={i}
                    className="flex-row justify-between items-center p-2.5 bg-muted/20 border border-border/50 rounded-xl gap-2"
                  >
                    <View className="flex-1 min-w-0 pr-1">
                      <Text size="sm" weight="semibold" numberOfLines={1}>
                        {d.name}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2 shrink-0">
                      <View className="bg-card border border-border rounded-lg px-2 py-1.5 flex-row items-center">
                        <Text size="xs" muted className="mr-0.5">
                          -{currency}
                        </Text>
                        <TextInput
                          value={d.amount > 0 ? String(d.amount) : ''}
                          onChangeText={(val) => handleUpdateDeductionAmount(i, val)}
                          placeholder="0.00"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="decimal-pad"
                          className="w-20 text-right text-sm font-semibold text-foreground py-0"
                        />
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveDeduction(i)}
                        className="p-1.5 rounded-lg bg-rose-500/10 active:opacity-75"
                      >
                        <Trash2 size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Custom Deduction Input */}
            <View className="gap-1.5 pt-2 border-t border-border">
              <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
                Add Other / Custom Deduction
              </Text>
              <View className="flex-row gap-2 items-center">
                <View className="flex-1 bg-card border border-border rounded-xl px-3 py-2 min-w-0">
                  <TextInput
                    value={newDedName}
                    onChangeText={(val) => {
                      setNewDedName(val);
                      setDedError('');
                    }}
                    placeholder="Name (e.g. HMO, Loan)"
                    placeholderTextColor="#9CA3AF"
                    className="text-sm text-foreground py-0"
                  />
                </View>
                <View className="w-24 bg-card border border-border rounded-xl px-2.5 py-2 flex-row items-center shrink-0">
                  <Text size="xs" muted className="mr-0.5">
                    {currency}
                  </Text>
                  <TextInput
                    value={newDedAmount}
                    onChangeText={(val) => {
                      setNewDedAmount(val);
                      setDedError('');
                    }}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    className="flex-1 text-sm text-foreground text-right py-0"
                  />
                </View>
                <Button
                  size="sm"
                  variant="outline"
                  onPress={handleAddDeduction}
                  className="shrink-0 px-3"
                >
                  Add
                </Button>
              </View>
              {dedError ? (
                <Text size="xs" className="text-destructive font-medium">
                  {dedError}
                </Text>
              ) : null}
            </View>

            {/* Realtime Payslip Summary */}
            {deductions.length > 0 && (
              <View className="p-3 bg-muted/10 rounded-xl border border-border gap-1.5 mt-1">
                <Text size="xs" weight="bold" className="text-foreground">
                  Payslip Breakdown
                </Text>
                <View className="flex-row justify-between">
                  <Text size="xs" muted>Gross Income:</Text>
                  <Text size="xs" weight="semibold">{currency}{grossIncome.toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text size="xs" muted>Total Deductions:</Text>
                  <Text size="xs" weight="semibold" className="text-rose-500">-{currency}{totalDeductions.toFixed(2)}</Text>
                </View>
                <View className="h-px bg-border my-0.5" />
                <View className="flex-row justify-between items-center">
                  <Text size="xs" weight="bold">Net Take-Home Deposit:</Text>
                  <Text size="sm" weight="bold" className="text-emerald-500">{currency}{netAmountNum.toFixed(2)}</Text>
                </View>
              </View>
            )}
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
