import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Alert, Switch, TextInput } from 'react-native';
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
  Calendar as CalendarIcon,
  Repeat,
  Plus,
  Trash2,
  Calculator,
  ShieldCheck,
} from 'lucide-react-native';
import { useFinance } from '../src/context/FinanceContext';
import { createRecurringRule } from '../src/services/recurringService';
import { TransactionType, FrequencyType, RecurringDeduction, DeductionCutoff } from '../src/types/database';
import {
  recurringRuleFormSchema,
  validateForm,
  cleanNumericString,
} from '../src/schemas/validationSchemas';
import CalendarPickerModal from '../src/components/CalendarPickerModal';

export default function ModalRecurringScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string }>();
  const { toast } = useToast();
  const { currency, accounts, categories, refreshAll } = useFinance();

  const [type, setType] = useState<TransactionType>(
    (params.type as TransactionType) || 'income'
  );
  const [title, setTitle] = useState(type === 'income' ? 'Semi-Monthly Salary' : '');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<FrequencyType>('semi_monthly');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState(
    categories.find(c => c.name.toLowerCase() === 'salary')?.id || ''
  );
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoCreate, setAutoCreate] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Payout cutoff days for semi_monthly rules
  const [payoutDay1, setPayoutDay1] = useState(15);
  const [payoutDay2, setPayoutDay2] = useState(30);
  const [customDay1Text, setCustomDay1Text] = useState('15');
  const [customDay2Text, setCustomDay2Text] = useState('30');

  // Deductions state for income rules with cutoff assignment
  const [deductions, setDeductions] = useState<RecurringDeduction[]>([]);
  const [newDedName, setNewDedName] = useState('');
  const [newDedAmount, setNewDedAmount] = useState('');
  const [newDedCutoff, setNewDedCutoff] = useState<DeductionCutoff>('both');
  const [dedError, setDedError] = useState('');
  const [grossInput, setGrossInput] = useState('');
  const [showGrossHelper, setShowGrossHelper] = useState(false);

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const relevantCategories = categories.filter(
    c => c.type === (type === 'income' ? 'income' : 'expense')
  );

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const netAmountNum = parseFloat(cleanNumericString(amount)) || 0;
  const grossIncome = netAmountNum + totalDeductions;

  // Per-cutoff deduction sums for semi_monthly
  const cutoff1Deductions = deductions.filter(
    (d) => !d.cutoff || d.cutoff === 'first' || d.cutoff === 'both'
  );
  const cutoff2Deductions = deductions.filter(
    (d) => !d.cutoff || d.cutoff === 'second' || d.cutoff === 'both'
  );
  const cutoff1Total = cutoff1Deductions.reduce((sum, d) => sum + d.amount, 0);
  const cutoff2Total = cutoff2Deductions.reduce((sum, d) => sum + d.amount, 0);

  const handleSetCutoffPreset = (day1: number, day2: number) => {
    setPayoutDay1(day1);
    setPayoutDay2(day2);
    setCustomDay1Text(String(day1));
    setCustomDay2Text(String(day2));
  };

  const handleCustomDayChange = (cutoff: 'first' | 'second', val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    if (cutoff === 'first') {
      setCustomDay1Text(clean);
      const num = parseInt(clean, 10);
      if (!isNaN(num) && num >= 1 && num <= 31) {
        setPayoutDay1(num);
      }
    } else {
      setCustomDay2Text(clean);
      const num = parseInt(clean, 10);
      if (!isNaN(num) && num >= 1 && num <= 31) {
        setPayoutDay2(num);
      }
    }
  };

  const handleAddPresetDeduction = (presetName: string, defaultCutoff: DeductionCutoff = 'both') => {
    const existingIndex = deductions.findIndex(
      (d) => d.name.toLowerCase() === presetName.toLowerCase()
    );
    if (existingIndex >= 0) {
      toast.show({
        variant: 'info',
        label: 'Already In List',
        description: `${presetName} is already configured in the list below.`,
      });
      return;
    }
    setDeductions([...deductions, { name: presetName, amount: 0, cutoff: defaultCutoff }]);
  };

  const handleAddStandard4Deductions = (splitCutoffs: boolean = false) => {
    // If splitCutoffs is true: SSS & PhilHealth -> 1st cutoff; Tax & Pag-IBIG -> 2nd cutoff
    const standardConfig: Array<{ name: string; cutoff: DeductionCutoff }> = splitCutoffs
      ? [
          { name: 'SSS', cutoff: 'first' },
          { name: 'PhilHealth', cutoff: 'first' },
          { name: 'Withholding Tax', cutoff: 'second' },
          { name: 'Pag-IBIG', cutoff: 'second' },
        ]
      : [
          { name: 'Withholding Tax', cutoff: 'both' },
          { name: 'SSS', cutoff: 'both' },
          { name: 'PhilHealth', cutoff: 'both' },
          { name: 'Pag-IBIG', cutoff: 'both' },
        ];

    const existing = new Set(deductions.map((d) => d.name.toLowerCase()));
    const toAdd: RecurringDeduction[] = [];
    for (const item of standardConfig) {
      if (!existing.has(item.name.toLowerCase())) {
        toAdd.push({ name: item.name, amount: 0, cutoff: item.cutoff });
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
        label: splitCutoffs ? 'PH Split Added' : 'Standard 4 Added',
        description: splitCutoffs
          ? 'SSS & PhilHealth set to 1st cutoff; Tax & Pag-IBIG set to 2nd cutoff.'
          : 'Enter deduction amounts below.',
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

  const handleUpdateDeductionCutoff = (index: number, cutoff: DeductionCutoff) => {
    const updated = [...deductions];
    updated[index] = { ...updated[index], cutoff };
    setDeductions(updated);
  };

  const handleRemoveDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const handleAddCustomDeduction = () => {
    const cleanAmt = cleanNumericString(newDedAmount);
    const dedAmt = parseFloat(cleanAmt);
    if (!newDedName.trim()) {
      setDedError('Please enter a deduction name');
      return;
    }
    if (isNaN(dedAmt) || dedAmt <= 0) {
      setDedError('Amount must be greater than 0');
      return;
    }
    setDedError('');
    setDeductions([
      ...deductions,
      { name: newDedName.trim(), amount: dedAmt, cutoff: newDedCutoff },
    ]);
    setNewDedName('');
    setNewDedAmount('');
    setNewDedCutoff('both');
  };

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
      label: 'Net Pay Computed',
      description: `Net Take-Home Pay set to ${currency}${computedNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
    });
  };

  const handleSubmit = async () => {
    const formData = {
      title,
      type,
      amount,
      frequency,
      accountId,
      categoryId,
      startDate,
      payoutDay1: frequency === 'semi_monthly' ? payoutDay1 : undefined,
      payoutDay2: frequency === 'semi_monthly' ? payoutDay2 : undefined,
    };

    const validation = validateForm(recurringRuleFormSchema, formData);
    if (!validation.success) {
      setErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      toast.show({
        variant: 'destructive',
        label: 'Validation Error',
        description: firstError || 'Please check highlighted fields.',
      });
      return;
    }

    if (frequency === 'semi_monthly' && payoutDay1 >= payoutDay2) {
      Alert.alert(
        'Invalid Cutoff Dates',
        'The 1st cutoff day must be earlier than the 2nd cutoff day (e.g. 15th & 30th, 10th & 25th).'
      );
      return;
    }

    setErrors({});
    const finalAmount = parseFloat(cleanNumericString(amount));

    setSubmitting(true);
    try {
      const id = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await createRecurringRule({
        id,
        type,
        account_id: accountId,
        to_account_id: null,
        category_id: categoryId || null,
        amount: finalAmount,
        frequency,
        start_date: startDate,
        end_date: null,
        next_due_date: startDate,
        auto_create: autoCreate ? 1 : 0,
        is_active: 1,
        notes: title.trim(),
        gross_amount: type === 'income' && deductions.length > 0 ? grossIncome : null,
        deductions_json: type === 'income' && deductions.length > 0 ? JSON.stringify(deductions) : null,
        payout_day_1: frequency === 'semi_monthly' ? payoutDay1 : null,
        payout_day_2: frequency === 'semi_monthly' ? payoutDay2 : null,
      });

      await refreshAll();
      toast.show({
        variant: 'success',
        label: 'Recurring Rule Saved',
        description: `"${title}" will be tracked automatically on every ${frequency} cycle.`,
      });
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save recurring rule');
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
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <Text size="2xl" weight="bold">
            Recurring Income / Bill
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-full bg-muted/20 active:opacity-75"
          >
            <X size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Type Toggle: Income vs Expense */}
        <View className="flex-row p-1 bg-card border border-border rounded-2xl gap-1">
          <TouchableOpacity
            onPress={() => {
              setType('income');
              if (!title || title === 'Monthly Bill') setTitle('Semi-Monthly Salary');
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
              Recurring Income (Salary)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setType('expense');
              if (title.includes('Salary')) setTitle('Monthly Bill');
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
              Recurring Bill / Sub
            </Text>
          </TouchableOpacity>
        </View>

        {/* Basic Details */}
        <Card className="p-4 bg-card border border-border rounded-2xl gap-4">
          <Input
            label={type === 'income' ? 'Income Label' : 'Subscription / Bill Name'}
            isRequired
            value={title}
            onChangeText={(val) => {
              setTitle(val);
              clearFieldError('title');
            }}
            errorMessage={errors.title}
            placeholder={type === 'income' ? 'e.g. Semi-Monthly Salary, Company Payroll' : 'e.g. Netflix, Internet, Rent'}
          />

          <Input
            label={`${type === 'income' ? 'Net Take-Home Pay' : 'Amount'} per Cycle (${currency})`}
            isRequired
            value={amount}
            onChangeText={(val) => {
              setAmount(val);
              clearFieldError('amount');
            }}
            errorMessage={errors.amount}
            keyboardType="decimal-pad"
            placeholder="25000.00"
          />
        </Card>

        {/* Frequency Selector */}
        <View className="gap-2">
          <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
            Payout / Billing Frequency
          </Text>
          <View className="flex-row gap-2 flex-wrap">
            <Chip
              selected={frequency === 'semi_monthly'}
              onPress={() => {
                setFrequency('semi_monthly');
                if (title === 'Monthly Salary') setTitle('Semi-Monthly Salary');
              }}
            >
              Twice a Month (Cutoff Dates)
            </Chip>
            <Chip
              selected={frequency === 'biweekly'}
              onPress={() => {
                setFrequency('biweekly');
                if (title === 'Monthly Salary') setTitle('Bi-Weekly Salary');
              }}
            >
              Bi-Weekly (Every 2 Weeks)
            </Chip>
            <Chip
              selected={frequency === 'monthly'}
              onPress={() => {
                setFrequency('monthly');
                if (title.includes('Semi-Monthly') || title.includes('Bi-Weekly')) {
                  setTitle('Monthly Salary');
                }
              }}
            >
              Once a Month (Monthly)
            </Chip>
            <Chip selected={frequency === 'weekly'} onPress={() => setFrequency('weekly')}>
              Weekly
            </Chip>
            <Chip selected={frequency === 'yearly'} onPress={() => setFrequency('yearly')}>
              Yearly
            </Chip>
          </View>
        </View>

        {/* Semi-Monthly Cutoff Days Configuration */}
        {frequency === 'semi_monthly' && (
          <Card className="p-4 bg-card border border-border rounded-2xl gap-3">
            <View className="gap-0.5">
              <View className="flex-row items-center gap-1.5">
                <Repeat size={16} color="#6366F1" />
                <Text size="sm" weight="bold">
                  Twice-a-Month Cutoff Dates
                </Text>
              </View>
              <Text size="xs" muted>
                Select standard payroll payout days or customize your pay schedule.
              </Text>
            </View>

            {/* Quick Cutoff Presets */}
            <View className="flex-row gap-2 flex-wrap pt-1">
              <TouchableOpacity
                onPress={() => handleSetCutoffPreset(15, 30)}
                className={`px-2.5 py-1.5 rounded-lg border active:opacity-75 ${
                  payoutDay1 === 15 && payoutDay2 === 30
                    ? 'bg-primary/15 border-primary'
                    : 'bg-muted/20 border-border/60'
                }`}
              >
                <Text
                  size="xs"
                  weight="semibold"
                  className={payoutDay1 === 15 && payoutDay2 === 30 ? 'text-primary' : 'text-foreground'}
                >
                  15th & 30th
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSetCutoffPreset(10, 25)}
                className={`px-2.5 py-1.5 rounded-lg border active:opacity-75 ${
                  payoutDay1 === 10 && payoutDay2 === 25
                    ? 'bg-primary/15 border-primary'
                    : 'bg-muted/20 border-border/60'
                }`}
              >
                <Text
                  size="xs"
                  weight="semibold"
                  className={payoutDay1 === 10 && payoutDay2 === 25 ? 'text-primary' : 'text-foreground'}
                >
                  10th & 25th
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSetCutoffPreset(5, 20)}
                className={`px-2.5 py-1.5 rounded-lg border active:opacity-75 ${
                  payoutDay1 === 5 && payoutDay2 === 20
                    ? 'bg-primary/15 border-primary'
                    : 'bg-muted/20 border-border/60'
                }`}
              >
                <Text
                  size="xs"
                  weight="semibold"
                  className={payoutDay1 === 5 && payoutDay2 === 20 ? 'text-primary' : 'text-foreground'}
                >
                  5th & 20th
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSetCutoffPreset(1, 16)}
                className={`px-2.5 py-1.5 rounded-lg border active:opacity-75 ${
                  payoutDay1 === 1 && payoutDay2 === 16
                    ? 'bg-primary/15 border-primary'
                    : 'bg-muted/20 border-border/60'
                }`}
              >
                <Text
                  size="xs"
                  weight="semibold"
                  className={payoutDay1 === 1 && payoutDay2 === 16 ? 'text-primary' : 'text-foreground'}
                >
                  1st & 16th
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom Day inputs */}
            <View className="flex-row gap-3 pt-1 border-t border-border">
              <View className="flex-1 gap-1">
                <Text size="xs" weight="medium" muted>
                  1st Cutoff Day
                </Text>
                <View className="flex-row items-center bg-card border border-border rounded-xl px-3 py-1.5">
                  <TextInput
                    value={customDay1Text}
                    onChangeText={(v) => handleCustomDayChange('first', v)}
                    placeholder="15"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={2}
                    className="text-base font-bold text-foreground text-center w-10 py-0"
                  />
                  <Text size="xs" muted className="ml-1">th of month</Text>
                </View>
              </View>

              <View className="flex-1 gap-1">
                <Text size="xs" weight="medium" muted>
                  2nd Cutoff Day
                </Text>
                <View className="flex-row items-center bg-card border border-border rounded-xl px-3 py-1.5">
                  <TextInput
                    value={customDay2Text}
                    onChangeText={(v) => handleCustomDayChange('second', v)}
                    placeholder="30"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={2}
                    className="text-base font-bold text-foreground text-center w-10 py-0"
                  />
                  <Text size="xs" muted className="ml-1">th of month</Text>
                </View>
              </View>
            </View>
            {payoutDay1 >= payoutDay2 && (
              <Text size="xs" className="text-rose-500 font-medium">
                1st cutoff day must be earlier in the month than 2nd cutoff day.
              </Text>
            )}
          </Card>
        )}

        {/* Itemized Deductions & Payslip (Income only) */}
        {type === 'income' && (
          <Card className="p-4 bg-card border border-border rounded-2xl gap-3">
            {/* Header: Title on left with flex-1, Gross Helper button on right */}
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center gap-1.5">
                  <ShieldCheck size={16} color="#10B981" />
                  <Text size="sm" weight="bold">
                    Payroll Deductions
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
              Track deductions per cycle or assign them to specific cutoffs (e.g. SSS on 1st cutoff, Tax on 2nd cutoff).
            </Text>

            {/* Quick Presets */}
            <View className="gap-1.5 pt-1">
              <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
                Quick Presets
              </Text>
              <View className="flex-row gap-2 flex-wrap">
                <TouchableOpacity
                  onPress={() => handleAddStandard4Deductions(true)}
                  className="bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg flex-row items-center gap-1 active:opacity-75"
                >
                  <Plus size={12} color="#10B981" />
                  <Text size="xs" weight="bold" className="text-emerald-700 dark:text-emerald-300">
                    Standard PH Split
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAddStandard4Deductions(false)}
                  className="bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded-lg flex-row items-center gap-1 active:opacity-75"
                >
                  <Plus size={12} color="#6366F1" />
                  <Text size="xs" weight="bold" className="text-primary">
                    All 4 (Both)
                  </Text>
                </TouchableOpacity>
                <Chip onPress={() => handleAddPresetDeduction('Withholding Tax', 'second')}>
                  Tax (BIR)
                </Chip>
                <Chip onPress={() => handleAddPresetDeduction('SSS', 'first')}>
                  SSS
                </Chip>
                <Chip onPress={() => handleAddPresetDeduction('PhilHealth', 'first')}>
                  PhilHealth
                </Chip>
                <Chip onPress={() => handleAddPresetDeduction('Pag-IBIG', 'second')}>
                  Pag-IBIG
                </Chip>
              </View>
            </View>

            {/* Gross-to-Net Helper */}
            {showGrossHelper && (
              <View className="p-3 bg-primary/5 border border-primary/20 rounded-xl gap-2 mt-1">
                <Text size="xs" weight="bold" className="text-primary">
                  Compute Net Pay from Gross Salary
                </Text>
                <Text size="xs" muted>
                  Enter your gross pay per cycle. The app will subtract total deductions ({currency}{totalDeductions.toFixed(2)}) and set your Net Take-Home Pay.
                </Text>
                <View className="flex-row gap-2 items-center">
                  <View className="flex-1 bg-card border border-border rounded-xl px-3 py-2 flex-row items-center min-w-0">
                    <Text size="xs" muted className="mr-1 font-semibold">
                      {currency}
                    </Text>
                    <TextInput
                      value={grossInput}
                      onChangeText={setGrossInput}
                      placeholder="e.g. 30000"
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

            {/* Configured Deductions List */}
            {deductions.length > 0 && (
              <View className="gap-2.5 pt-2 border-t border-border">
                <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
                  Configured Deductions ({deductions.length})
                </Text>
                {deductions.map((d, i) => (
                  <View
                    key={i}
                    className="p-3 bg-muted/20 border border-border/50 rounded-xl gap-2"
                  >
                    {/* Top Row: Name, Amount Input, Delete */}
                    <View className="flex-row justify-between items-center gap-2">
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

                    {/* Cutoff Assignment Chips (especially relevant for semi_monthly) */}
                    {frequency === 'semi_monthly' && (
                      <View className="flex-row items-center gap-1.5 pt-1 border-t border-border/40">
                        <Text size="xs" muted className="text-[11px] font-medium mr-1">
                          Deduct on:
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleUpdateDeductionCutoff(i, 'first')}
                          className={`px-2 py-1 rounded-md border text-center ${
                            d.cutoff === 'first'
                              ? 'bg-emerald-500/20 border-emerald-500'
                              : 'bg-muted/30 border-transparent'
                          }`}
                        >
                          <Text
                            size="xs"
                            className={`text-[11px] ${
                              d.cutoff === 'first' ? 'text-emerald-600 font-bold' : 'text-muted-foreground'
                            }`}
                          >
                            1st ({payoutDay1}th)
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleUpdateDeductionCutoff(i, 'second')}
                          className={`px-2 py-1 rounded-md border text-center ${
                            d.cutoff === 'second'
                              ? 'bg-indigo-500/20 border-indigo-500'
                              : 'bg-muted/30 border-transparent'
                          }`}
                        >
                          <Text
                            size="xs"
                            className={`text-[11px] ${
                              d.cutoff === 'second' ? 'text-indigo-600 font-bold' : 'text-muted-foreground'
                            }`}
                          >
                            2nd ({payoutDay2}th)
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleUpdateDeductionCutoff(i, 'both')}
                          className={`px-2 py-1 rounded-md border text-center ${
                            !d.cutoff || d.cutoff === 'both'
                              ? 'bg-primary/20 border-primary'
                              : 'bg-muted/30 border-transparent'
                          }`}
                        >
                          <Text
                            size="xs"
                            className={`text-[11px] ${
                              !d.cutoff || d.cutoff === 'both' ? 'text-primary font-bold' : 'text-muted-foreground'
                            }`}
                          >
                            Both Cutoffs
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Custom Deduction Input */}
            <View className="gap-2 pt-2 border-t border-border">
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
                  onPress={handleAddCustomDeduction}
                  className="shrink-0 px-3"
                >
                  Add
                </Button>
              </View>

              {/* Cutoff selection for new deduction */}
              {frequency === 'semi_monthly' && (
                <View className="flex-row items-center gap-1.5">
                  <Text size="xs" muted className="text-[11px]">
                    Cutoff:
                  </Text>
                  <TouchableOpacity
                    onPress={() => setNewDedCutoff('first')}
                    className={`px-2 py-1 rounded-md border ${
                      newDedCutoff === 'first'
                        ? 'bg-emerald-500/20 border-emerald-500'
                        : 'bg-muted/20 border-border/40'
                    }`}
                  >
                    <Text
                      size="xs"
                      className={`text-[11px] ${
                        newDedCutoff === 'first' ? 'text-emerald-600 font-bold' : 'text-muted-foreground'
                      }`}
                    >
                      1st Cutoff
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setNewDedCutoff('second')}
                    className={`px-2 py-1 rounded-md border ${
                      newDedCutoff === 'second'
                        ? 'bg-indigo-500/20 border-indigo-500'
                        : 'bg-muted/20 border-border/40'
                    }`}
                  >
                    <Text
                      size="xs"
                      className={`text-[11px] ${
                        newDedCutoff === 'second' ? 'text-indigo-600 font-bold' : 'text-muted-foreground'
                      }`}
                    >
                      2nd Cutoff
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setNewDedCutoff('both')}
                    className={`px-2 py-1 rounded-md border ${
                      newDedCutoff === 'both'
                        ? 'bg-primary/20 border-primary'
                        : 'bg-muted/20 border-border/40'
                    }`}
                  >
                    <Text
                      size="xs"
                      className={`text-[11px] ${
                        newDedCutoff === 'both' ? 'text-primary font-bold' : 'text-muted-foreground'
                      }`}
                    >
                      Both Cutoffs
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {dedError ? (
                <Text size="xs" className="text-destructive font-medium">
                  {dedError}
                </Text>
              ) : null}
            </View>

            {/* Realtime Payslip Summary */}
            {deductions.length > 0 && (
              <View className="p-3 bg-muted/10 rounded-xl border border-border gap-2 mt-1">
                <Text size="xs" weight="bold" className="text-foreground">
                  {frequency === 'semi_monthly' ? 'Cutoff & Monthly Payslip Summary' : 'Per-Cycle Payslip Breakdown'}
                </Text>

                {frequency === 'semi_monthly' ? (
                  <View className="gap-2">
                    {/* 1st Cutoff */}
                    <View className="p-2 rounded-lg bg-card/60 border border-border/40 gap-1">
                      <View className="flex-row justify-between items-center">
                        <Text size="xs" weight="bold" className="text-foreground">
                          1st Cutoff ({payoutDay1}th of Month)
                        </Text>
                        <Text size="xs" className="text-rose-500 font-medium">
                          Deductions: -{currency}{cutoff1Total.toFixed(2)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center">
                        <Text size="xs" muted>Est. Net Deposit:</Text>
                        <Text size="xs" weight="bold" className="text-emerald-500">
                          {currency}{Math.max(0, grossIncome - cutoff1Total).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {/* 2nd Cutoff */}
                    <View className="p-2 rounded-lg bg-card/60 border border-border/40 gap-1">
                      <View className="flex-row justify-between items-center">
                        <Text size="xs" weight="bold" className="text-foreground">
                          2nd Cutoff ({payoutDay2}th of Month)
                        </Text>
                        <Text size="xs" className="text-rose-500 font-medium">
                          Deductions: -{currency}{cutoff2Total.toFixed(2)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center">
                        <Text size="xs" muted>Est. Net Deposit:</Text>
                        <Text size="xs" weight="bold" className="text-emerald-500">
                          {currency}{Math.max(0, grossIncome - cutoff2Total).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    <View className="h-px bg-border my-0.5" />
                    <View className="flex-row justify-between items-center">
                      <Text size="xs" weight="bold">Total Monthly Deductions:</Text>
                      <Text size="xs" weight="bold" className="text-rose-500">
                        -{currency}{(cutoff1Total + cutoff2Total).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <>
                    <View className="flex-row justify-between">
                      <Text size="xs" muted>Gross Earnings:</Text>
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
                  </>
                )}
              </View>
            )}
          </Card>
        )}

        {/* Account Picker */}
        <View className="gap-2">
          <View className="flex-row justify-between items-center">
            <Text size="xs" weight="semibold" muted className="uppercase tracking-wider">
              {type === 'income' ? 'Deposit To Account' : 'Paid From Account'}
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

        {/* Category Picker */}
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

        {/* Start Date & Automation */}
        <Card className="p-4 bg-card border border-border rounded-2xl gap-4">
          <Input
            label={type === 'income' ? 'Next Payday / Start Date' : 'Next Billing Date'}
            isRequired
            value={startDate}
            onChangeText={(val) => {
              setStartDate(val);
              clearFieldError('startDate');
            }}
            errorMessage={errors.startDate}
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

          <View className="flex-row items-center justify-between pt-2 border-t border-border">
            <View className="flex-1 pr-2">
              <Text size="sm" weight="semibold">
                Auto-post to Ledger
              </Text>
              <Text size="xs" muted>
                Automatically create ledger transaction on due date with configured deductions.
              </Text>
            </View>
            <Switch value={autoCreate} onValueChange={setAutoCreate} />
          </View>
        </Card>

        {/* Submit */}
        <Button
          loading={submitting}
          onPress={handleSubmit}
          className="mt-2"
        >
          {type === 'income' ? 'Set Up Recurring Salary' : 'Save Recurring Bill'}
        </Button>
      </ScrollView>

      <CalendarPickerModal
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        selectedDate={startDate}
        onSelectDate={(newDate) => {
          setStartDate(newDate);
          clearFieldError('startDate');
        }}
        title={type === 'income' ? 'Select Next Payday' : 'Select Billing Date'}
      />
    </View>
  );
}
