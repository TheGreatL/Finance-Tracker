import React, { useState, useEffect } from 'react';
import { ScrollView, View, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Text,
  Card,
  Input,
  Button,
  Chip,
  Badge,
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
  ScanLine,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react-native';
import { useFinance } from '../src/context/FinanceContext';
import {
  createTransaction,
  updateTransaction,
  getTransactionById,
} from '../src/services/ledgerService';
import {
  getRecurringRuleById,
  claimRecurringRule,
} from '../src/services/recurringService';
import {
  TransactionType,
  ExpenseNature,
  RecurringRule,
  RecurringDeduction,
} from '../src/types/database';
import {
  transactionFormSchema,
  validateForm,
  cleanNumericString,
} from '../src/schemas/validationSchemas';
import CalendarPickerModal from '../src/components/CalendarPickerModal';

export default function ModalTransactionScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    type?: string;
    to_account_id?: string;
    date?: string;
    editId?: string;
    recurring_rule_id?: string;
    cutoff?: 'first' | 'second';
  }>();
  const { toast } = useToast();
  const { currency, accounts, categories, loans, savingsGoals, recurringRules, refreshAll } = useFinance();

  const isEditing = !!params.editId;

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

  // Salary payoff adjustments (Overtime, Absent, Undertime)
  const [baseGrossInput, setBaseGrossInput] = useState('');
  const [overtimeInput, setOvertimeInput] = useState('');
  const [absenceInput, setAbsenceInput] = useState('');
  const [undertimeInput, setUndertimeInput] = useState('');
  const [isManualOverride, setIsManualOverride] = useState(false);

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

  // Active recurring salary rules available to preload
  const activeSalaryRules = recurringRules.filter(
    r => r.type === 'income' && r.is_active
  );

  // Numbers breakdown calculation
  const baseGrossNum = parseFloat(cleanNumericString(baseGrossInput)) || 0;
  const overtimeNum = parseFloat(cleanNumericString(overtimeInput)) || 0;
  const absenceNum = parseFloat(cleanNumericString(absenceInput)) || 0;
  const undertimeNum = parseFloat(cleanNumericString(undertimeInput)) || 0;
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

  const adjustedGrossNum = Math.max(0, baseGrossNum + overtimeNum - absenceNum - undertimeNum);
  const calculatedNetNum = Math.max(0, adjustedGrossNum - totalDeductions);
  const netAmountNum = parseFloat(cleanNumericString(amount)) || 0;
  const grossIncome = baseGrossNum > 0 ? adjustedGrossNum : netAmountNum + totalDeductions;

  // Recompute net pay if not in manual override mode
  const recomputeNet = (
    baseGrossStr: string,
    otStr: string,
    absStr: string,
    utStr: string,
    currentDeds: Array<{ name: string; amount: number }>,
    manualOverride: boolean
  ) => {
    if (manualOverride) return;
    const base = parseFloat(cleanNumericString(baseGrossStr)) || 0;
    const ot = parseFloat(cleanNumericString(otStr)) || 0;
    const abs = parseFloat(cleanNumericString(absStr)) || 0;
    const ut = parseFloat(cleanNumericString(utStr)) || 0;
    const dedTotal = currentDeds.reduce((s, d) => s + d.amount, 0);

    if (base > 0 || ot > 0 || abs > 0 || ut > 0) {
      const adjGross = Math.max(0, base + ot - abs - ut);
      const computedNet = Math.max(0, adjGross - dedTotal);
      setAmount(computedNet.toFixed(2));
      clearFieldError('amount');
    }
  };

  const handleAdjustmentChange = (
    field: 'base' | 'ot' | 'abs' | 'ut',
    val: string
  ) => {
    let nextBase = baseGrossInput;
    let nextOt = overtimeInput;
    let nextAbs = absenceInput;
    let nextUt = undertimeInput;

    if (field === 'base') {
      setBaseGrossInput(val);
      nextBase = val;
    } else if (field === 'ot') {
      setOvertimeInput(val);
      nextOt = val;
    } else if (field === 'abs') {
      setAbsenceInput(val);
      nextAbs = val;
    } else if (field === 'ut') {
      setUndertimeInput(val);
      nextUt = val;
    }

    if (!isManualOverride) {
      recomputeNet(nextBase, nextOt, nextAbs, nextUt, deductions, false);
    }
  };

  const handleLoadSalaryTemplate = (rule: RecurringRule, cutoffPick?: 'first' | 'second') => {
    // 1. Set type to income
    setType('income');

    // 2. Account
    if (rule.account_id) {
      setAccountId(rule.account_id);
      clearFieldError('accountId');
    }

    // 3. Category (Salary)
    const salCat = categories.find(c => c.name.toLowerCase() === 'salary');
    if (salCat) setCategoryId(salCat.id);
    else if (rule.category_id) setCategoryId(rule.category_id);

    // 4. Cutoff selection & deductions
    let chosenCutoff = cutoffPick;
    if (!chosenCutoff && rule.frequency === 'semi_monthly') {
      const todayDay = new Date().getDate();
      const d1 = rule.payout_day_1 ?? 15;
      const d2 = rule.payout_day_2 ?? 30;
      chosenCutoff = todayDay <= Math.floor((d1 + d2) / 2) ? 'first' : 'second';
    }

    let loadedDeductions: Array<{ name: string; amount: number }> = [];
    if (rule.deductions_json) {
      try {
        const parsed: RecurringDeduction[] = JSON.parse(rule.deductions_json);
        loadedDeductions = parsed
          .filter(d => {
            if (!chosenCutoff || !d.cutoff || d.cutoff === 'both') return true;
            return d.cutoff === chosenCutoff;
          })
          .map(d => ({ name: d.name, amount: d.amount }));
      } catch (e) {}
    }
    setDeductions(loadedDeductions);

    const dedTotal = loadedDeductions.reduce((s, d) => s + d.amount, 0);

    // 5. Gross and Net
    const grossVal = rule.gross_amount ?? (rule.amount + dedTotal);
    setBaseGrossInput(grossVal.toFixed(2));
    setOvertimeInput('');
    setAbsenceInput('');
    setUndertimeInput('');
    setIsManualOverride(false);

    const netVal = Math.max(0, grossVal - dedTotal);
    setAmount(netVal.toFixed(2));
    clearFieldError('amount');

    // 6. Notes label
    const cutoffLabel = chosenCutoff
      ? chosenCutoff === 'first'
        ? `1st Cutoff (${rule.payout_day_1 ?? 15}th)`
        : `2nd Cutoff (${rule.payout_day_2 ?? 30}th)`
      : 'Payday';

    setNotes(`[Payday: ${cutoffLabel}] ${rule.notes || ''}`.trim());

    toast.show({
      variant: 'success',
      label: 'Salary Setup Loaded',
      description: `Loaded ${rule.notes || 'Salary'} (${cutoffLabel}). Adjust Overtime, Absences, or Net below.`,
    });
  };

  // Load existing transaction if editId, or recurring rule if recurring_rule_id
  useEffect(() => {
    async function loadInitialData() {
      if (params.editId) {
        try {
          const tx = await getTransactionById(params.editId);
          if (tx) {
            setType(tx.type);
            setAmount(String(tx.amount));
            setDate(tx.date);
            setAccountId(tx.account_id);
            if (tx.to_account_id) setToAccountId(tx.to_account_id);
            if (tx.category_id) setCategoryId(tx.category_id);
            if (tx.notes) setNotes(tx.notes);
            if (tx.tags) setTags(tx.tags);
            if (tx.expense_nature) setExpenseNature(tx.expense_nature);
            if (tx.gross_amount) {
              setBaseGrossInput(String(tx.gross_amount));
            }
            if (tx.deductions && tx.deductions.length > 0) {
              setDeductions(tx.deductions.map(d => ({ name: d.name, amount: d.amount })));
            }
          }
        } catch (e) {
          console.error('Failed to load transaction for edit', e);
        }
      } else if (params.recurring_rule_id) {
        try {
          const rule = await getRecurringRuleById(params.recurring_rule_id);
          if (rule) {
            handleLoadSalaryTemplate(rule, params.cutoff);
          }
        } catch (e) {
          console.error('Failed to preload recurring rule', e);
        }
      }
    }
    loadInitialData();
  }, [params.editId, params.recurring_rule_id]);

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
    const updated = [...deductions, { name: newDedName.trim(), amount: dedAmt }];
    setDeductions(updated);
    setNewDedName('');
    setNewDedAmount('');
    recomputeNet(baseGrossInput, overtimeInput, absenceInput, undertimeInput, updated, isManualOverride);
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
    const updated = [...deductions, { name: presetName, amount: 0 }];
    setDeductions(updated);
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
      const updated = [...deductions, ...toAdd];
      setDeductions(updated);
      recomputeNet(baseGrossInput, overtimeInput, absenceInput, undertimeInput, updated, isManualOverride);
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
      const updated = [...deductions, ...toAdd];
      setDeductions(updated);
      recomputeNet(baseGrossInput, overtimeInput, absenceInput, undertimeInput, updated, isManualOverride);
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
    recomputeNet(baseGrossInput, overtimeInput, absenceInput, undertimeInput, updated, isManualOverride);
  };

  const handleRemoveDeduction = (index: number) => {
    const updated = deductions.filter((_, i) => i !== index);
    setDeductions(updated);
    recomputeNet(baseGrossInput, overtimeInput, absenceInput, undertimeInput, updated, isManualOverride);
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

    // Append adjustments audit note if relevant
    let finalNotes = notes.trim();
    if (type === 'income' && (overtimeNum > 0 || absenceNum > 0 || undertimeNum > 0)) {
      const parts: string[] = [];
      if (overtimeNum > 0) parts.push(`OT: +${currency}${overtimeNum.toFixed(2)}`);
      if (absenceNum > 0) parts.push(`Absent: -${currency}${absenceNum.toFixed(2)}`);
      if (undertimeNum > 0) parts.push(`Undertime: -${currency}${undertimeNum.toFixed(2)}`);
      const adjTag = `[Adjustments: ${parts.join(', ')}]`;
      if (!finalNotes.includes(adjTag)) {
        finalNotes = finalNotes ? `${finalNotes} ${adjTag}` : adjTag;
      }
    }

    setSubmitting(true);
    try {
      if (isEditing && params.editId) {
        await updateTransaction(params.editId, {
          type,
          account_id: accountId,
          to_account_id: type === 'transfer' ? toAccountId : null,
          category_id: type !== 'transfer' ? categoryId || null : null,
          amount: finalAmount,
          date,
          notes: finalNotes,
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
          label: 'Transaction Updated',
          description: 'Ledger record and balances reconciled.',
        });
      } else {
        await createTransaction({
          type,
          account_id: accountId,
          to_account_id: type === 'transfer' ? toAccountId : null,
          category_id: type !== 'transfer' ? categoryId || null : null,
          amount: finalAmount,
          date,
          notes: finalNotes,
          tags: tags.trim(),
          expense_nature: type === 'expense' ? expenseNature : 'needs',
          gross_amount: type === 'income' ? grossIncome : null,
          deductions: type === 'income' ? deductions : [],
          linked_loan_id: linkedLoanId || null,
          linked_goal_id: linkedGoalId || null,
          is_recurring: params.recurring_rule_id ? 1 : 0,
          recurring_rule_id: params.recurring_rule_id || null,
        });

        // If claimed from a recurring rule, advance its next_due_date!
        if (params.recurring_rule_id) {
          await claimRecurringRule(params.recurring_rule_id);
        }

        await refreshAll();
        toast.show({
          variant: 'success',
          label: params.recurring_rule_id ? 'Payday Claimed & Recorded' : 'Transaction Saved',
          description: params.recurring_rule_id
            ? 'Salary credited to ledger and advanced to the next cutoff.'
            : 'Account balance updated in SQLite ledger.',
        });
      }

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
          <View className="flex-1">
            <Text size="2xl" weight="bold">
              {isEditing ? 'Edit Transaction' : 'Record Movement'}
            </Text>
            {isEditing && (
              <Text size="xs" muted>
                Reconciles account balance & deduction records automatically
              </Text>
            )}
          </View>
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

        {/* Quick Preload Salary Setup (Income mode only) */}
        {type === 'income' && activeSalaryRules.length > 0 && !isEditing && (
          <View className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
                Preload Salary Setup
              </Text>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0">
                <Text size="xs" className="text-[10px] font-bold text-emerald-600">
                  Planning Rules
                </Text>
              </Badge>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {activeSalaryRules.map((rule) => {
                  if (rule.frequency === 'semi_monthly') {
                    const d1 = rule.payout_day_1 ?? 15;
                    const d2 = rule.payout_day_2 ?? 30;
                    return (
                      <React.Fragment key={rule.id}>
                        <TouchableOpacity
                          onPress={() => handleLoadSalaryTemplate(rule, 'first')}
                          className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-xl flex-row items-center gap-1.5 active:opacity-75"
                        >
                          <Sparkles size={13} color="#10B981" />
                          <Text size="xs" weight="semibold" className="text-emerald-700 dark:text-emerald-300">
                            {rule.notes || 'Salary'}: 1st Cutoff ({d1}th)
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleLoadSalaryTemplate(rule, 'second')}
                          className="bg-indigo-500/10 border border-indigo-500/30 px-3 py-2 rounded-xl flex-row items-center gap-1.5 active:opacity-75"
                        >
                          <Sparkles size={13} color="#6366F1" />
                          <Text size="xs" weight="semibold" className="text-indigo-700 dark:text-indigo-300">
                            {rule.notes || 'Salary'}: 2nd Cutoff ({d2}th)
                          </Text>
                        </TouchableOpacity>
                      </React.Fragment>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={rule.id}
                      onPress={() => handleLoadSalaryTemplate(rule)}
                      className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-xl flex-row items-center gap-1.5 active:opacity-75"
                    >
                      <Sparkles size={13} color="#10B981" />
                      <Text size="xs" weight="semibold" className="text-emerald-700 dark:text-emerald-300">
                        Preload {rule.notes || 'Salary'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* OCR Payslip Scanner Button (Future AI OCR Feature) */}
        {type === 'income' && (
          <View className="bg-primary/5 border border-primary/25 rounded-2xl p-3 flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
              <View className="w-9 h-9 rounded-xl bg-primary/15 items-center justify-center shrink-0">
                <ScanLine size={18} color="#4F46E5" />
              </View>
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center gap-1.5 flex-wrap">
                  <Text size="sm" weight="bold">
                    Scan Payslip (OCR)
                  </Text>
                  <Badge variant="outline" className="border-amber-500 bg-amber-500/10 px-1.5 py-0">
                    <Text size="xs" className="text-[10px] font-bold text-amber-600">
                      Under Maintenance
                    </Text>
                  </Badge>
                </View>
                <Text size="xs" muted numberOfLines={1}>
                  Auto-populate from payslip scan (coming soon)
                </Text>
              </View>
            </View>

            <Button
              size="sm"
              variant="outline"
              onPress={() => {
                toast.show({
                  variant: 'info',
                  label: 'Feature Under Maintenance',
                  description: 'The OCR Payslip Scanner is currently undergoing maintenance and upgrade. Please use the Payoff Adjustments fields below to record overtime, absences, and deductions.',
                });
              }}
              className="shrink-0"
            >
              Scan
            </Button>
          </View>
        )}

        {/* Amount Input */}
        <Card className="p-4 bg-card border border-border rounded-2xl gap-2">
          <View className="flex-row items-center justify-between">
            <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
              {type === 'income' ? 'Net Take-Home Deposit' : 'Transaction Amount'}
            </Text>
            {type === 'income' && isManualOverride && (
              <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 px-2 py-0.5">
                <Text size="xs" className="text-[10px] font-bold text-amber-600">
                  Manual Net Override
                </Text>
              </Badge>
            )}
          </View>
          <Input
            isRequired
            value={amount}
            onChangeText={(val) => {
              setAmount(val);
              setIsManualOverride(true);
              clearFieldError('amount');
            }}
            errorMessage={errors.amount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            className="text-2xl font-bold"
          />
          {type === 'income' && (baseGrossNum > 0 || totalDeductions > 0) ? (
            <View className="flex-row justify-between pt-1 border-t border-border">
              <Text size="xs" muted>
                {baseGrossNum > 0 ? 'Adjusted Gross: ' : 'Calculated Gross: '}
                {currency}{grossIncome.toFixed(2)}
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

        {/* Earnings & Payoff Adjustments (Income only) */}
        {type === 'income' && (
          <Card className="p-4 bg-card border border-border rounded-2xl gap-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5 flex-1 min-w-0">
                <SlidersHorizontal size={16} color="#4F46E5" />
                <Text size="sm" weight="bold">
                  Earnings & Payoff Adjustments
                </Text>
              </View>
              {isManualOverride ? (
                <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 px-2 py-0.5">
                  <Text size="xs" className="text-[10px] font-bold text-amber-600">
                    Manual Override Active
                  </Text>
                </Badge>
              ) : (
                <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5">
                  <Text size="xs" className="text-[10px] font-bold text-emerald-600">
                    Auto-Calculating Net
                  </Text>
                </Badge>
              )}
            </View>

            <Text size="xs" muted>
              Adjust base earnings for this cutoff. Add overtime (+) or deduct absences and undertime (-).
            </Text>

            {/* Adjustment Fields Grid */}
            <View className="gap-2.5 pt-1">
              {/* Base Gross Pay */}
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-1 min-w-0">
                  <Text size="xs" weight="semibold">
                    Base Gross Pay
                  </Text>
                  <Text size="xs" muted className="text-[11px]">
                    Contracted cutoff salary
                  </Text>
                </View>
                <View className="w-36 bg-card border border-border rounded-xl px-2.5 py-1.5 flex-row items-center">
                  <Text size="xs" muted className="mr-1">
                    {currency}
                  </Text>
                  <TextInput
                    value={baseGrossInput}
                    onChangeText={(val) => handleAdjustmentChange('base', val)}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    className="flex-1 text-sm font-semibold text-foreground text-right py-0"
                  />
                </View>
              </View>

              {/* Overtime / Holiday Pay */}
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-1 min-w-0">
                  <Text size="xs" weight="semibold" className="text-emerald-700 dark:text-emerald-400">
                    Overtime / Holiday Pay (+)
                  </Text>
                  <Text size="xs" muted className="text-[11px]">
                    Additional hours or bonuses
                  </Text>
                </View>
                <View className="w-36 bg-emerald-500/5 border border-emerald-500/30 rounded-xl px-2.5 py-1.5 flex-row items-center">
                  <Text size="xs" className="mr-1 text-emerald-600 font-bold">
                    +{currency}
                  </Text>
                  <TextInput
                    value={overtimeInput}
                    onChangeText={(val) => handleAdjustmentChange('ot', val)}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    className="flex-1 text-sm font-semibold text-foreground text-right py-0"
                  />
                </View>
              </View>

              {/* Absences / Unpaid Leave */}
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-1 min-w-0">
                  <Text size="xs" weight="semibold" className="text-rose-700 dark:text-rose-400">
                    Absences / LWOP (-)
                  </Text>
                  <Text size="xs" muted className="text-[11px]">
                    Leave without pay deduction
                  </Text>
                </View>
                <View className="w-36 bg-rose-500/5 border border-rose-500/30 rounded-xl px-2.5 py-1.5 flex-row items-center">
                  <Text size="xs" className="mr-1 text-rose-600 font-bold">
                    -{currency}
                  </Text>
                  <TextInput
                    value={absenceInput}
                    onChangeText={(val) => handleAdjustmentChange('abs', val)}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    className="flex-1 text-sm font-semibold text-foreground text-right py-0"
                  />
                </View>
              </View>

              {/* Undertime / Tardiness */}
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-1 min-w-0">
                  <Text size="xs" weight="semibold" className="text-amber-700 dark:text-amber-400">
                    Undertime / Tardiness (-)
                  </Text>
                  <Text size="xs" muted className="text-[11px]">
                    Late arrivals & undertime
                  </Text>
                </View>
                <View className="w-36 bg-amber-500/5 border border-amber-500/30 rounded-xl px-2.5 py-1.5 flex-row items-center">
                  <Text size="xs" className="mr-1 text-amber-600 font-bold">
                    -{currency}
                  </Text>
                  <TextInput
                    value={undertimeInput}
                    onChangeText={(val) => handleAdjustmentChange('ut', val)}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    className="flex-1 text-sm font-semibold text-foreground text-right py-0"
                  />
                </View>
              </View>
            </View>

            {/* Manual Override Action & Formula Preview */}
            <View className="pt-2 border-t border-border gap-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1">
                  <Calculator size={13} color="#6B7280" />
                  <Text size="xs" muted>
                    Adjusted Gross: <Text size="xs" weight="bold">{currency}{adjustedGrossNum.toFixed(2)}</Text>
                  </Text>
                </View>

                {isManualOverride ? (
                  <TouchableOpacity
                    onPress={() => {
                      setIsManualOverride(false);
                      recomputeNet(baseGrossInput, overtimeInput, absenceInput, undertimeInput, deductions, false);
                      toast.show({
                        variant: 'info',
                        label: 'Net Recalculated',
                        description: 'Net take-home pay has been re-synchronized with your formula adjustments.',
                      });
                    }}
                    className="bg-primary/10 px-2.5 py-1 rounded-lg flex-row items-center gap-1 active:opacity-75"
                  >
                    <Calculator size={12} color="#4F46E5" />
                    <Text size="xs" weight="bold" className="text-primary">
                      Sync Net from Formula
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => setIsManualOverride(true)}
                    className="px-2 py-1 rounded-lg bg-muted/20 active:opacity-75"
                  >
                    <Text size="xs" muted className="text-[11px]">
                      Manual Override
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Card>
        )}

        {/* Itemized Deductions (Income only) */}
        {type === 'income' && (
          <Card className="p-4 bg-card border border-border rounded-2xl gap-3">
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center gap-1.5">
                  <ShieldCheck size={16} color="#10B981" />
                  <Text size="sm" weight="bold">
                    Itemized Deductions & Contributions
                  </Text>
                </View>
                <Text size="xs" muted>
                  Tax, SSS, PhilHealth, Pag-IBIG & Other Deductions
                </Text>
              </View>
            </View>

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
            <View className="p-3 bg-muted/10 rounded-xl border border-border gap-1.5 mt-1">
              <Text size="xs" weight="bold" className="text-foreground">
                Payslip Calculation Summary
              </Text>
              <View className="flex-row justify-between">
                <Text size="xs" muted>
                  {baseGrossNum > 0 ? 'Adjusted Gross Earnings:' : 'Gross Income:'}
                </Text>
                <Text size="xs" weight="semibold">
                  {currency}{grossIncome.toFixed(2)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text size="xs" muted>Total Deductions:</Text>
                <Text size="xs" weight="semibold" className="text-rose-500">
                  -{currency}{totalDeductions.toFixed(2)}
                </Text>
              </View>
              <View className="h-px bg-border my-0.5" />
              <View className="flex-row justify-between items-center">
                <Text size="xs" weight="bold">
                  Net Take-Home Deposit:
                </Text>
                <Text size="sm" weight="bold" className="text-emerald-500">
                  {currency}{netAmountNum.toFixed(2)}
                </Text>
              </View>
            </View>
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
          {isEditing
            ? 'Update Transaction'
            : params.recurring_rule_id
            ? 'Claim & Save Payday'
            : 'Commit to Ledger'}
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
