import React, { useState, useEffect, useMemo } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { X, Plus, Trash2, Archive, RotateCcw, AlertCircle, Building2, Briefcase } from 'lucide-react-native';
import type {
    AccountPocket,
    JobRecord,
    UpdateJobInput,
    CreateDeductionInput,
    EmploymentType,
    PaySchedule,
    DeductionCategory
} from '../../types/database';
import { DEDUCTION_PRESETS, EMPLOYMENT_TYPE_OPTIONS, PAY_SCHEDULE_OPTIONS, DEDUCTION_CATEGORY_CONFIG } from '../../constants/salaryPresets';
import { formatCurrency, formatMoneyInput, parseMoneyInput } from '../../utils/formatters';
import { calculateNetTakeHome, getDeductionsByJobId } from '../../services/salaryService';
import { getDatabase } from '../../database/db';
import { SearchableSelectField, type SelectOption } from '../common/SearchableSelectModal';
import { useKeyboardBottomInset } from '../../hooks/useKeyboardBottomInset';

interface EditJobModalProps {
    visible: boolean;
    job: JobRecord | null;
    pockets: (AccountPocket & { institution_name?: string; institution_color?: string })[];
    onClose: () => void;
    onSubmit: (id: string, updates: UpdateJobInput, deductions?: CreateDeductionInput[]) => Promise<void>;
    onArchive?: (id: string) => Promise<void>;
    onUnarchive?: (id: string) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
}

interface DeductionFormRow {
    id: string;
    name: string;
    category: DeductionCategory;
    amountStr: string;
    isPercentage: boolean;
    percentageRateStr: string;
}

export function EditJobModal({ visible, job, pockets, onClose, onSubmit, onArchive, onUnarchive, onDelete }: EditJobModalProps) {
    const [title, setTitle] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [employmentType, setEmploymentType] = useState<EmploymentType>('full_time');
    const [paySchedule, setPaySchedule] = useState<PaySchedule>('semi_monthly');
    const [payDay1Str, setPayDay1Str] = useState('15');
    const [payDay2Str, setPayDay2Str] = useState('30');
    const [grossSalaryStr, setGrossSalaryStr] = useState('');
    const [targetPocketId, setTargetPocketId] = useState('');
    const [notes, setNotes] = useState('');
    const [deductions, setDeductions] = useState<DeductionFormRow[]>([]);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const keyboardInset = useKeyboardBottomInset(36);

    useEffect(() => {
        if (visible && job) {
            setTitle(job.title);
            setCompanyName(job.company_name);
            setEmploymentType(job.employment_type);
            setPaySchedule(job.pay_schedule);
            setPayDay1Str(String(job.pay_day_1));
            setPayDay2Str(job.pay_day_2 ? String(job.pay_day_2) : '30');
            setGrossSalaryStr(formatMoneyInput(String(job.gross_salary)));
            setTargetPocketId(job.target_pocket_id);
            setNotes(job.notes || '');
            setError('');

            // Load existing deductions
            (async () => {
                try {
                    const db = await getDatabase();
                    const existingDeductions = await getDeductionsByJobId(db, job.id);
                    setDeductions(
                        existingDeductions.map((d) => ({
                            id: d.id,
                            name: d.name,
                            category: d.category,
                            amountStr: formatMoneyInput(String(d.amount)),
                            isPercentage: Boolean(d.is_percentage),
                            percentageRateStr: d.percentage_rate ? String(d.percentage_rate) : ''
                        }))
                    );
                } catch {
                    // If fail to load deductions, start with empty
                    setDeductions([]);
                }
            })();
        }
    }, [visible, job]);

    const pocketOptions: SelectOption[] = useMemo(() => {
        return pockets.map((p) => ({
            id: p.id,
            label: `${p.name} (${p.institution_name || 'Account'})`,
            subtitle: `Balance: ${formatCurrency(p.current_balance)}`,
            badge: p.pocket_type === 'savings' ? 'Savings' : 'Wallet'
        }));
    }, [pockets]);

    const calculation = useMemo(() => {
        const gross = parseMoneyInput(grossSalaryStr);
        const parsedDeductions: CreateDeductionInput[] = deductions.map((d) => ({
            name: d.name,
            category: d.category,
            amount: parseMoneyInput(d.amountStr),
            isPercentage: d.isPercentage,
            percentageRate: d.percentageRateStr ? parseFloat(d.percentageRateStr) : undefined
        }));
        return calculateNetTakeHome(gross, parsedDeductions);
    }, [grossSalaryStr, deductions]);

    const handleAddCustomDeduction = () => {
        setDeductions((prev) => [
            ...prev,
            {
                id: `ded_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: '',
                category: 'workplace',
                amountStr: '',
                isPercentage: false,
                percentageRateStr: ''
            }
        ]);
    };

    const handleAddPresetDeduction = (preset: (typeof DEDUCTION_PRESETS)[0]) => {
        const exists = deductions.some((d) => d.name.toLowerCase() === preset.name.toLowerCase());
        if (exists) return;

        setDeductions((prev) => [
            ...prev,
            {
                id: `ded_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: preset.name,
                category: preset.category,
                amountStr: preset.defaultAmount ? formatMoneyInput(String(preset.defaultAmount)) : '',
                isPercentage: Boolean(preset.isPercentage),
                percentageRateStr: preset.percentageRate ? String(preset.percentageRate) : ''
            }
        ]);
    };

    const handleUpdateDeduction = (id: string, updates: Partial<DeductionFormRow>) => {
        setDeductions((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
    };

    const handleRemoveDeduction = (id: string) => {
        setDeductions((prev) => prev.filter((d) => d.id !== id));
    };

    const handleSave = async () => {
        if (!job) return;
        setError('');
        const cleanTitle = title.trim();
        const cleanCompany = companyName.trim();
        const grossSalary = parseMoneyInput(grossSalaryStr);
        const d1 = parseInt(payDay1Str, 10);
        const d2 = paySchedule === 'semi_monthly' ? parseInt(payDay2Str, 10) : null;

        if (!cleanTitle) {
            setError('Please enter a job title');
            return;
        }
        if (!cleanCompany) {
            setError('Please enter employer or company name');
            return;
        }
        if (grossSalary <= 0) {
            setError('Please enter agreed gross salary per paycheck');
            return;
        }
        if (isNaN(d1) || d1 < 1 || d1 > 31) {
            setError('Pay date must be between 1 and 31');
            return;
        }
        if (paySchedule === 'semi_monthly' && (d2 === null || isNaN(d2) || d2 < 1 || d2 > 31)) {
            setError('Second pay date must be between 1 and 31');
            return;
        }

        if (calculation.totalDeductions > grossSalary) {
            setError('Total deductions cannot exceed gross earnings');
            return;
        }

        const cleanedDeductions: CreateDeductionInput[] = deductions
            .filter((d) => d.name.trim() !== '')
            .map((d) => ({
                name: d.name.trim(),
                category: d.category,
                amount: parseMoneyInput(d.amountStr),
                isPercentage: d.isPercentage,
                percentageRate: d.percentageRateStr ? parseFloat(d.percentageRateStr) : undefined
            }));

        try {
            setSubmitting(true);
            await onSubmit(
                job.id,
                {
                    title: cleanTitle,
                    companyName: cleanCompany,
                    employmentType,
                    paySchedule,
                    payDay1: d1,
                    payDay2: d2,
                    grossSalary,
                    targetPocketId,
                    notes: notes.trim()
                },
                cleanedDeductions
            );
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to update job');
        } finally {
            setSubmitting(false);
        }
    };

    const handleArchiveToggle = async () => {
        if (!job) return;
        try {
            setSubmitting(true);
            if (job.status === 'active') {
                if (onArchive) await onArchive(job.id);
            } else {
                if (onUnarchive) await onUnarchive(job.id);
            }
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to toggle archive status');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = () => {
        if (!job || !onDelete) return;
        Alert.alert(
            'Delete Job Permanently?',
            `Are you sure you want to delete ${job.title} at ${job.company_name}? Historical pay slips and records will also be removed. Consider archiving instead if you want to preserve payout history.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setSubmitting(true);
                            await onDelete(job.id);
                            onClose();
                        } catch (err: any) {
                            setError(err?.message || 'Failed to delete job');
                        } finally {
                            setSubmitting(false);
                        }
                    }
                }
            ]
        );
    };

    if (!job) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/60">
                <View className="max-h-[92%] rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    {/* Header */}
                    <View className="flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                        <View className="flex-row items-center gap-2.5">
                            <View className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/60 items-center justify-center">
                                <Briefcase size={20} className="text-emerald-600 dark:text-emerald-400" />
                            </View>
                            <View>
                                <Text className="text-lg font-bold text-slate-900 dark:text-white">Edit Job Terms</Text>
                                <Text className="text-xs text-slate-500 dark:text-slate-400">Update salary, deductions & schedule</Text>
                            </View>
                        </View>
                        <Pressable onPress={onClose} hitSlop={12} className="rounded-full p-2 bg-slate-100 dark:bg-slate-800">
                            <X size={18} className="text-slate-600 dark:text-slate-300" />
                        </Pressable>
                    </View>

                    {/* Error Banner */}
                    {error ? (
                        <View className="mx-6 mt-3 flex-row items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 border border-rose-200 dark:border-rose-900/50">
                            <AlertCircle size={18} className="text-rose-600 dark:text-rose-400" />
                            <Text className="flex-1 text-xs text-rose-700 dark:text-rose-300 font-medium">{error}</Text>
                        </View>
                    ) : null}

                    <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: keyboardInset }}>
                        {/* Employment Info */}
                        <View className="mb-4">
                            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">1. Job Details</Text>

                            <View className="space-y-3">
                                <View>
                                    <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Job Title *</Text>
                                    <TextInput
                                        value={title}
                                        onChangeText={setTitle}
                                        placeholder="Job Title"
                                        className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3.5 text-sm text-slate-900 dark:text-white"
                                    />
                                </View>

                                <View className="mt-2.5">
                                    <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Employer Name *</Text>
                                    <View className="flex-row items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3.5">
                                        <Building2 size={16} className="text-slate-400 mr-2" />
                                        <TextInput
                                            value={companyName}
                                            onChangeText={setCompanyName}
                                            placeholder="Employer Name"
                                            className="flex-1 h-11 text-sm text-slate-900 dark:text-white"
                                        />
                                    </View>
                                </View>

                                <View className="mt-2.5">
                                    <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Employment Type</Text>
                                    <View className="flex-row flex-wrap gap-1.5">
                                        {EMPLOYMENT_TYPE_OPTIONS.map((opt) => {
                                            const isSelected = employmentType === opt.id;
                                            return (
                                                <Pressable
                                                    key={opt.id}
                                                    onPress={() => setEmploymentType(opt.id)}
                                                    className={`rounded-lg px-3 py-1.5 border ${
                                                        isSelected
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700'
                                                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                                    }`}
                                                >
                                                    <Text
                                                        className={`text-xs font-medium ${
                                                            isSelected
                                                                ? 'text-emerald-700 dark:text-emerald-300 font-bold'
                                                                : 'text-slate-600 dark:text-slate-400'
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </Text>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Compensation & Schedule */}
                        <View className="mb-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                                2. Compensation & Pay Dates
                            </Text>

                            <View className="mb-3">
                                <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Pay Schedule</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {PAY_SCHEDULE_OPTIONS.map((opt) => {
                                        const isSelected = paySchedule === opt.id;
                                        return (
                                            <Pressable
                                                key={opt.id}
                                                onPress={() => setPaySchedule(opt.id)}
                                                className={`flex-1 min-w-[45%] rounded-xl p-2.5 border ${
                                                    isSelected
                                                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500'
                                                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                <Text
                                                    className={`text-xs font-bold ${
                                                        isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </Text>
                                                <Text className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5" numberOfLines={1}>
                                                    {opt.description}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>

                            <View className="flex-row gap-3 mb-3">
                                <View className="flex-1">
                                    <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        {paySchedule === 'semi_monthly' ? '1st Payday (Day)' : 'Payday of Month'}
                                    </Text>
                                    <TextInput
                                        value={payDay1Str}
                                        onChangeText={setPayDay1Str}
                                        keyboardType="number-pad"
                                        maxLength={2}
                                        className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3.5 text-sm text-slate-900 dark:text-white"
                                    />
                                </View>

                                {paySchedule === 'semi_monthly' && (
                                    <View className="flex-1">
                                        <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">2nd Payday (Day)</Text>
                                        <TextInput
                                            value={payDay2Str}
                                            onChangeText={setPayDay2Str}
                                            keyboardType="number-pad"
                                            maxLength={2}
                                            className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3.5 text-sm text-slate-900 dark:text-white"
                                        />
                                    </View>
                                )}
                            </View>

                            {/* Gross Salary */}
                            <View className="mb-3">
                                <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Gross Earnings (Per Paycheck) *</Text>
                                <View className="flex-row items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3.5">
                                    <Text className="text-slate-400 font-bold mr-1.5 text-sm">₱</Text>
                                    <TextInput
                                        value={grossSalaryStr}
                                        onChangeText={(val) => setGrossSalaryStr(formatMoneyInput(val))}
                                        keyboardType="decimal-pad"
                                        placeholder="0.00"
                                        placeholderTextColor="#94A3B8"
                                        className="flex-1 h-11 text-base font-semibold text-slate-900 dark:text-white"
                                    />
                                </View>
                            </View>

                            {/* Target Pocket Selection */}
                            <View className="mb-2">
                                <SearchableSelectField
                                    label="Direct Deposit Account Pocket *"
                                    selectedId={targetPocketId}
                                    options={pocketOptions}
                                    onSelect={(opt) => setTargetPocketId(opt.id)}
                                    placeholder="Select deposit pocket..."
                                />
                            </View>
                        </View>

                        {/* Itemized Deductions */}
                        <View className="mb-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <View className="flex-row items-center justify-between mb-2">
                                <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    3. Itemized Payroll Deductions
                                </Text>
                                <Pressable
                                    onPress={handleAddCustomDeduction}
                                    className="flex-row items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1"
                                >
                                    <Plus size={14} className="text-emerald-600 dark:text-emerald-400" />
                                    <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Custom</Text>
                                </Pressable>
                            </View>

                            {/* Quick Add Presets */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-3 pb-1">
                                {DEDUCTION_PRESETS.map((preset) => {
                                    const alreadyAdded = deductions.some((d) => d.name.toLowerCase() === preset.name.toLowerCase());
                                    return (
                                        <Pressable
                                            key={preset.name}
                                            onPress={() => handleAddPresetDeduction(preset)}
                                            disabled={alreadyAdded}
                                            className={`mr-2 flex-row items-center gap-1 rounded-full px-3 py-1 border ${
                                                alreadyAdded
                                                    ? 'bg-slate-100 dark:bg-slate-800 border-transparent opacity-50'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                            }`}
                                        >
                                            <Text
                                                className={`text-[11px] font-medium ${
                                                    alreadyAdded ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                + {preset.name}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>

                            {/* Deductions Rows */}
                            <View className="space-y-2.5">
                                {deductions.map((d) => {
                                    const catConfig = DEDUCTION_CATEGORY_CONFIG[d.category];
                                    return (
                                        <View
                                            key={d.id}
                                            className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 p-2.5"
                                        >
                                            <View className="flex-row items-center gap-2 mb-2">
                                                <TextInput
                                                    value={d.name}
                                                    onChangeText={(name) => handleUpdateDeduction(d.id, { name })}
                                                    placeholder="Deduction Name"
                                                    className="flex-1 h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 text-xs font-semibold text-slate-900 dark:text-white"
                                                />
                                                <View className={`rounded-lg px-2 py-1 ${catConfig.badgeBg}`}>
                                                    <Text className={`text-[10px] font-bold ${catConfig.badgeText}`}>{catConfig.label}</Text>
                                                </View>
                                                <Pressable
                                                    onPress={() => handleRemoveDeduction(d.id)}
                                                    className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40"
                                                >
                                                    <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
                                                </Pressable>
                                            </View>

                                            <View className="flex-row items-center gap-2">
                                                <View className="flex-1 flex-row items-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5">
                                                    <Text className="text-slate-400 font-bold mr-1 text-xs">₱</Text>
                                                    <TextInput
                                                        value={d.amountStr}
                                                        onChangeText={(val) => handleUpdateDeduction(d.id, { amountStr: formatMoneyInput(val) })}
                                                        keyboardType="decimal-pad"
                                                        placeholder="0.00"
                                                        className="flex-1 h-9 text-xs font-semibold text-slate-900 dark:text-white"
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Net Paycheck Summary */}
                        <View className="mb-5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 p-4">
                            <Text className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-2">
                                Revised Net Paycheck Summary
                            </Text>

                            <View className="flex-row justify-between items-center mb-1">
                                <Text className="text-xs text-slate-600 dark:text-slate-400">Gross Salary</Text>
                                <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    {formatCurrency(calculation.grossSalary)}
                                </Text>
                            </View>

                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-xs text-rose-600 dark:text-rose-400">Total Deductions</Text>
                                <Text className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                                    - {formatCurrency(calculation.totalDeductions)}
                                </Text>
                            </View>

                            <View className="h-px bg-emerald-500/20 my-1" />

                            <View className="flex-row justify-between items-center pt-1">
                                <Text className="text-sm font-bold text-slate-900 dark:text-white">Net Take-Home Pay</Text>
                                <Text className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(calculation.netTakeHome)}
                                </Text>
                            </View>
                        </View>

                        {/* Notes */}
                        <View className="mb-4">
                            <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes</Text>
                            <TextInput
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="Contract remarks..."
                                multiline
                                numberOfLines={2}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-slate-900 dark:text-white"
                            />
                        </View>

                        {/* Danger Actions: Archive & Delete */}
                        <View className="mb-6 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            <Pressable
                                onPress={handleArchiveToggle}
                                disabled={submitting}
                                className="flex-row items-center justify-center gap-2 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 p-3"
                            >
                                {job.status === 'active' ? (
                                    <>
                                        <Archive size={16} className="text-amber-700 dark:text-amber-400" />
                                        <Text className="text-xs font-bold text-amber-800 dark:text-amber-300">
                                            Archive Job (Preserve Past Pay Slips)
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw size={16} className="text-emerald-700 dark:text-emerald-400" />
                                        <Text className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Restore Job to Active</Text>
                                    </>
                                )}
                            </Pressable>

                            <Pressable
                                onPress={handleDelete}
                                disabled={submitting}
                                className="flex-row items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-3 mt-2"
                            >
                                <Trash2 size={16} className="text-rose-600 dark:text-rose-400" />
                                <Text className="text-xs font-bold text-rose-700 dark:text-rose-300">Delete Job & History</Text>
                            </Pressable>
                        </View>
                    </ScrollView>

                    {/* Footer Submit Button */}
                    <View className="border-t border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
                        <Pressable
                            onPress={handleSave}
                            disabled={submitting}
                            className={`h-12 rounded-xl bg-emerald-600 items-center justify-center ${
                                submitting ? 'opacity-60' : 'active:bg-emerald-700'
                            }`}
                        >
                            <Text className="text-sm font-bold text-white">{submitting ? 'Saving Changes...' : 'Save Changes'}</Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
