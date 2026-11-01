import React, { useState, useEffect, useMemo } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator, Switch } from 'react-native';
import { X, Check, Calendar, AlertCircle, Briefcase } from 'lucide-react-native';
import type { JobRecord, AccountPocket, RecordPaydayInput, DeductionSnapshotItem, DeductionCategory, DeductionCutoff } from '../../types/database';
import { formatCurrency, formatDisplayDate, formatMoneyInput, parseMoneyInput } from '../../utils/formatters';
import { DatePickerModal } from '../common/DatePickerModal';
import { SearchableSelectField, type SelectOption } from '../common/SearchableSelectModal';
import { useKeyboardBottomInset } from '../../hooks/useKeyboardBottomInset';
import { getDatabase } from '../../database/db';
import { getDeductionsByJobId, getNextPayDate, calculateNetTakeHome, calculateAdjustedEarnings } from '../../services/salaryService';
import { DEDUCTION_CATEGORY_CONFIG } from '../../constants/salaryPresets';

interface RecordPaydayModalProps {
    visible: boolean;
    job: JobRecord | null;
    pockets: (AccountPocket & { institution_name?: string; institution_color?: string })[];
    onClose: () => void;
    onSubmit: (input: RecordPaydayInput) => Promise<void>;
}

interface DeductionAdjustItem {
    id: string;
    name: string;
    category: DeductionCategory;
    amountStr: string;
    isPercentage?: boolean;
    percentageRate?: number | null;
    payCutoff?: DeductionCutoff;
    enabled: boolean;
}

export function RecordPaydayModal({ visible, job, pockets, onClose, onSubmit }: RecordPaydayModalProps) {
    const [mode, setMode] = useState<'quick' | 'detailed'>('quick');
    const [selectedPocketId, setSelectedPocketId] = useState<string>('');
    const [payDate, setPayDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [datePickerVisible, setDatePickerVisible] = useState(false);

    // Quick Mode state
    const [quickNetStr, setQuickNetStr] = useState<string>('');

    // Detailed Mode state: Attendance & Additions
    const [basicPayStr, setBasicPayStr] = useState<string>('');
    const [overtimePayStr, setOvertimePayStr] = useState<string>('');
    const [holidayPayStr, setHolidayPayStr] = useState<string>('');
    const [allowancesStr, setAllowancesStr] = useState<string>('');

    // Detailed Mode state: Attendance Deductions
    const [undertimeStr, setUndertimeStr] = useState<string>('');
    const [absencesStr, setAbsencesStr] = useState<string>('');

    // Detailed Mode state: Statutory / Job deductions
    const [deductionsList, setDeductionsList] = useState<DeductionAdjustItem[]>([]);
    const [notes, setNotes] = useState<string>('');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string>('');
    const keyboardInset = useKeyboardBottomInset(36);

    const pocketOptions: SelectOption[] = useMemo(() => {
        return pockets.map((p) => ({
            id: p.id,
            label: p.name,
            subtitle: `${p.institution_name ? p.institution_name + ' • ' : ''}Balance: ${formatCurrency(p.current_balance)}`
        }));
    }, [pockets]);

    // Initialize inputs when modal opens
    useEffect(() => {
        if (!visible || !job) return;

        const now = new Date();
        const nextDue = getNextPayDate(job.pay_schedule, job.pay_day_1, job.pay_day_2, now, job.payout_date);
        setPayDate(nextDue);
        setSelectedPocketId(job.target_pocket_id || (pockets[0]?.id ?? ''));
        setError('');
        setNotes('');

        // Determine base gross for the period
        let baseGross = job.gross_salary;
        if (job.salary_period === 'monthly' && job.pay_schedule === 'semi_monthly') {
            baseGross = Math.round((job.gross_salary / 2) * 100) / 100;
        }

        setBasicPayStr(formatMoneyInput(String(baseGross)));
        setOvertimePayStr('');
        setHolidayPayStr('');
        setAllowancesStr('');
        setUndertimeStr('');
        setAbsencesStr('');

        // Determine target cutoff for semi-monthly jobs
        let targetCutoff: DeductionCutoff = 'both';
        if (job.pay_schedule === 'semi_monthly') {
            const payDayNum = parseInt(nextDue.split('-')[2], 10);
            const d1 = Math.min(job.pay_day_1, job.pay_day_2 || 30);
            const d2 = Math.max(job.pay_day_1, job.pay_day_2 || 30);
            const diff1 = Math.abs(payDayNum - d1);
            const diff2 = Math.abs(payDayNum - d2);
            targetCutoff = diff1 <= diff2 ? 'first_cutoff' : 'second_cutoff';
        }

        // Fetch configured deductions
        (async () => {
            try {
                const db = await getDatabase();
                const existing = await getDeductionsByJobId(db, job.id);
                const breakdown = calculateNetTakeHome(baseGross, existing, targetCutoff);

                // Quick mode pre-filled with standard calculated net
                setQuickNetStr(formatMoneyInput(String(breakdown.netTakeHome)));

                // Populate deduction items
                const initialList: DeductionAdjustItem[] = existing.map((d) => {
                    const cutoff = d.pay_cutoff || 'both';
                    const isApplicable = targetCutoff === 'both' || cutoff === 'both' || cutoff === targetCutoff;
                    const calculatedAmt =
                        d.is_percentage && d.percentage_rate && d.percentage_rate > 0
                            ? Math.round(((baseGross * d.percentage_rate) / 100) * 100) / 100
                            : d.amount;

                    return {
                        id: d.id,
                        name: d.name,
                        category: d.category,
                        amountStr: formatMoneyInput(String(calculatedAmt)),
                        isPercentage: Boolean(d.is_percentage),
                        percentageRate: d.percentage_rate ?? null,
                        payCutoff: cutoff,
                        enabled: isApplicable
                    };
                });

                setDeductionsList(initialList);
            } catch (err) {
                console.error('Failed to initialize payday deductions:', err);
            }
        })();
    }, [visible, job, pockets]);

    // Calculated amounts in Detailed Mode
    const detailedCalculation = useMemo(() => {
        const basic = parseMoneyInput(basicPayStr);
        const ot = parseMoneyInput(overtimePayStr);
        const holiday = parseMoneyInput(holidayPayStr);
        const allowances = parseMoneyInput(allowancesStr);
        const undertime = parseMoneyInput(undertimeStr);
        const absences = parseMoneyInput(absencesStr);

        const earnings = calculateAdjustedEarnings(basic, {
            overtimePay: ot,
            holidayPay: holiday,
            allowances,
            undertimeDeduction: undertime,
            absenceDeduction: absences
        });

        let totalDeductions = 0;
        const deductionsSnapshot: DeductionSnapshotItem[] = [];

        for (const item of deductionsList) {
            if (item.enabled) {
                const amt = parseMoneyInput(item.amountStr);
                totalDeductions += amt;
                deductionsSnapshot.push({
                    name: item.name,
                    category: item.category,
                    amount: amt,
                    is_percentage: item.isPercentage,
                    percentage_rate: item.percentageRate,
                    pay_cutoff: item.payCutoff
                });
            }
        }

        totalDeductions = Math.round(totalDeductions * 100) / 100;
        const netTakeHome = Math.max(0, Math.round((earnings.grossEarnings - totalDeductions) * 100) / 100);

        return {
            basic,
            ot,
            holiday,
            allowances,
            undertime,
            absences,
            grossEarnings: earnings.grossEarnings,
            totalDeductions,
            netTakeHome,
            deductionsSnapshot,
            earningsSnapshot: earnings.itemized
        };
    }, [basicPayStr, overtimePayStr, holidayPayStr, allowancesStr, undertimeStr, absencesStr, deductionsList]);

    const activeNetAmount = mode === 'quick' ? parseMoneyInput(quickNetStr) : detailedCalculation.netTakeHome;

    if (!job) return null;

    const handleConfirm = async () => {
        setError('');
        if (!selectedPocketId) {
            setError('Please select a target pocket for deposit.');
            return;
        }

        if (activeNetAmount <= 0) {
            setError('Net deposit amount must be greater than zero.');
            return;
        }

        try {
            setSubmitting(true);
            const input: RecordPaydayInput = {
                jobId: job.id,
                payDate,
                pocketId: selectedPocketId,
                mode,
                netAmount: activeNetAmount,
                notes: notes.trim() || undefined
            };

            if (mode === 'detailed') {
                input.basicPay = detailedCalculation.basic;
                input.overtimePay = detailedCalculation.ot;
                input.holidayPay = detailedCalculation.holiday;
                input.allowances = detailedCalculation.allowances;
                input.undertimeDeduction = detailedCalculation.undertime;
                input.absenceDeduction = detailedCalculation.absences;
                input.grossAmount = detailedCalculation.grossEarnings;
                input.totalDeductions = detailedCalculation.totalDeductions;
                input.deductionsSnapshot = detailedCalculation.deductionsSnapshot;
                input.earningsSnapshot = detailedCalculation.earningsSnapshot;
            }

            await onSubmit(input);
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to record payday deposit');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleDeduction = (id: string) => {
        setDeductionsList((prev) => prev.map((d) => (d.id === id ? { ...d, enabled: !d.enabled } : d)));
    };

    const updateDeductionAmount = (id: string, text: string) => {
        setDeductionsList((prev) => prev.map((d) => (d.id === id ? { ...d, amountStr: formatMoneyInput(text) } : d)));
    };

    return (
        <>
            <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={submitting ? () => {} : onClose}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/60">
                    <View className="bg-white dark:bg-slate-900 rounded-t-3xl max-h-[92%] border-t border-slate-200 dark:border-slate-800">
                        {/* Header */}
                        <View className="flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                            <View className="flex-row items-center gap-2.5">
                                <View className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 items-center justify-center">
                                    <Briefcase size={20} className="text-emerald-700 dark:text-emerald-400" />
                                </View>
                                <View>
                                    <Text className="text-base font-bold text-slate-900 dark:text-white">Record Payday Deposit</Text>
                                    <Text className="text-xs text-slate-500 dark:text-slate-400">
                                        {job.company_name} • {job.title}
                                    </Text>
                                </View>
                            </View>
                            <Pressable
                                onPress={onClose}
                                disabled={submitting}
                                hitSlop={12}
                                className="rounded-full p-2 bg-slate-100 dark:bg-slate-800"
                            >
                                <X size={18} className="text-slate-600 dark:text-slate-300" />
                            </Pressable>
                        </View>

                        <ScrollView className="px-6 py-3" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {/* Error Banner */}
                            {error ? (
                                <View className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 border border-rose-200 dark:border-rose-900/40 flex-row items-center gap-2">
                                    <AlertCircle size={16} className="text-rose-600 dark:text-rose-400" />
                                    <Text className="text-xs font-medium text-rose-700 dark:text-rose-300 flex-1">{error}</Text>
                                </View>
                            ) : null}

                            {/* Destination Pocket & Pay Date Row */}
                            <View className="mb-4 space-y-3">
                                <SearchableSelectField
                                    label="Target Account Pocket"
                                    selectedId={selectedPocketId}
                                    options={pocketOptions}
                                    onSelect={(opt) => setSelectedPocketId(opt.id)}
                                    placeholder="Select deposit pocket"
                                />

                                <View>
                                    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Pay Date</Text>
                                    <Pressable
                                        onPress={() => setDatePickerVisible(true)}
                                        className="h-12 flex-row items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3.5"
                                    >
                                        <Text className="text-sm font-semibold text-slate-900 dark:text-white">{formatDisplayDate(payDate)}</Text>
                                        <Calendar size={18} className="text-slate-400" />
                                    </Pressable>
                                </View>
                            </View>

                            {/* Mode Segmented Switcher */}
                            <View className="mb-5 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 flex-row">
                                <Pressable
                                    onPress={() => setMode('quick')}
                                    className={`flex-1 py-2 rounded-xl items-center justify-center ${
                                        mode === 'quick' ? 'bg-white dark:bg-slate-700 shadow-xs' : ''
                                    }`}
                                >
                                    <Text
                                        className={`text-xs font-bold ${
                                            mode === 'quick' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'
                                        }`}
                                    >
                                        Direct Net Cash
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => setMode('detailed')}
                                    className={`flex-1 py-2 rounded-xl items-center justify-center ${
                                        mode === 'detailed' ? 'bg-white dark:bg-slate-700 shadow-xs' : ''
                                    }`}
                                >
                                    <Text
                                        className={`text-xs font-bold ${
                                            mode === 'detailed' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'
                                        }`}
                                    >
                                        Attendance & Overtime
                                    </Text>
                                </Pressable>
                            </View>

                            {/* QUICK MODE */}
                            {mode === 'quick' ? (
                                <View className="mb-4">
                                    <View className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 mb-4">
                                        <Text className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-1">
                                            Exact Net Cash Received (Bank / Wallet)
                                        </Text>
                                        <Text className="text-[11px] text-slate-600 dark:text-slate-400 mb-3">
                                            Enter the take-home pay credited to your account from your payroll notification.
                                        </Text>

                                        <View className="flex-row items-center h-14 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-3">
                                            <Text className="text-xl font-bold text-slate-400 mr-2">₱</Text>
                                            <TextInput
                                                value={quickNetStr}
                                                onChangeText={(t) => setQuickNetStr(formatMoneyInput(t))}
                                                keyboardType="decimal-pad"
                                                placeholder="0.00"
                                                placeholderTextColor="#94A3B8"
                                                className="flex-1 text-2xl font-bold text-slate-900 dark:text-white"
                                            />
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                /* DETAILED MODE */
                                <View className="space-y-4 mb-4">
                                    {/* Section 1: Base & Additions */}
                                    <View className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30">
                                        <Text className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-2">
                                            Earnings & Premium Additions (+)
                                        </Text>

                                        <View className="space-y-3">
                                            <View>
                                                <Text className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                    Basic / Regular Cut-off Pay
                                                </Text>
                                                <View className="flex-row items-center h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3">
                                                    <Text className="text-sm font-bold text-slate-400 mr-1.5">₱</Text>
                                                    <TextInput
                                                        value={basicPayStr}
                                                        onChangeText={(t) => setBasicPayStr(formatMoneyInput(t))}
                                                        keyboardType="decimal-pad"
                                                        placeholder="0.00"
                                                        placeholderTextColor="#94A3B8"
                                                        className="flex-1 text-sm font-bold text-slate-900 dark:text-white"
                                                    />
                                                </View>
                                            </View>

                                            <View className="flex-row gap-2.5">
                                                <View className="flex-1">
                                                    <Text className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                        Overtime (OT) Pay (+)
                                                    </Text>
                                                    <View className="flex-row items-center h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3">
                                                        <Text className="text-sm font-bold text-slate-400 mr-1.5">₱</Text>
                                                        <TextInput
                                                            value={overtimePayStr}
                                                            onChangeText={(t) => setOvertimePayStr(formatMoneyInput(t))}
                                                            keyboardType="decimal-pad"
                                                            placeholder="0.00"
                                                            placeholderTextColor="#94A3B8"
                                                            className="flex-1 text-sm font-bold text-slate-900 dark:text-white"
                                                        />
                                                    </View>
                                                </View>

                                                <View className="flex-1">
                                                    <Text className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                        Holiday / NSD (+)
                                                    </Text>
                                                    <View className="flex-row items-center h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3">
                                                        <Text className="text-sm font-bold text-slate-400 mr-1.5">₱</Text>
                                                        <TextInput
                                                            value={holidayPayStr}
                                                            onChangeText={(t) => setHolidayPayStr(formatMoneyInput(t))}
                                                            keyboardType="decimal-pad"
                                                            placeholder="0.00"
                                                            placeholderTextColor="#94A3B8"
                                                            className="flex-1 text-sm font-bold text-slate-900 dark:text-white"
                                                        />
                                                    </View>
                                                </View>
                                            </View>

                                            <View>
                                                <Text className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                    Allowances & Incentives (+)
                                                </Text>
                                                <View className="flex-row items-center h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3">
                                                    <Text className="text-sm font-bold text-slate-400 mr-1.5">₱</Text>
                                                    <TextInput
                                                        value={allowancesStr}
                                                        onChangeText={(t) => setAllowancesStr(formatMoneyInput(t))}
                                                        keyboardType="decimal-pad"
                                                        placeholder="0.00"
                                                        placeholderTextColor="#94A3B8"
                                                        className="flex-1 text-sm font-bold text-slate-900 dark:text-white"
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Section 2: Attendance Deductions */}
                                    <View className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30">
                                        <Text className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-2">
                                            Attendance Reductions (-)
                                        </Text>

                                        <View className="flex-row gap-2.5">
                                            <View className="flex-1">
                                                <Text className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                    Late / Undertime (-)
                                                </Text>
                                                <View className="flex-row items-center h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3">
                                                    <Text className="text-sm font-bold text-slate-400 mr-1.5">₱</Text>
                                                    <TextInput
                                                        value={undertimeStr}
                                                        onChangeText={(t) => setUndertimeStr(formatMoneyInput(t))}
                                                        keyboardType="decimal-pad"
                                                        placeholder="0.00"
                                                        placeholderTextColor="#94A3B8"
                                                        className="flex-1 text-sm font-bold text-slate-900 dark:text-white"
                                                    />
                                                </View>
                                            </View>

                                            <View className="flex-1">
                                                <Text className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                    Absences / LWOP (-)
                                                </Text>
                                                <View className="flex-row items-center h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3">
                                                    <Text className="text-sm font-bold text-slate-400 mr-1.5">₱</Text>
                                                    <TextInput
                                                        value={absencesStr}
                                                        onChangeText={(t) => setAbsencesStr(formatMoneyInput(t))}
                                                        keyboardType="decimal-pad"
                                                        placeholder="0.00"
                                                        placeholderTextColor="#94A3B8"
                                                        className="flex-1 text-sm font-bold text-slate-900 dark:text-white"
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Section 3: Statutory & Job Deductions Review */}
                                    <View className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30">
                                        <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                                            Statutory & Cut-off Deductions
                                        </Text>

                                        {deductionsList.length === 0 ? (
                                            <Text className="text-xs text-slate-400 italic">No deductions registered for this job stream.</Text>
                                        ) : (
                                            <View className="space-y-2">
                                                {deductionsList.map((item) => {
                                                    const catConfig = DEDUCTION_CATEGORY_CONFIG[item.category] || DEDUCTION_CATEGORY_CONFIG.other;
                                                    return (
                                                        <View
                                                            key={item.id}
                                                            className={`flex-row items-center justify-between p-2.5 rounded-xl border ${
                                                                item.enabled
                                                                    ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                                                                    : 'border-slate-100 dark:border-slate-800/40 opacity-50 bg-slate-100/50 dark:bg-slate-800/20'
                                                            }`}
                                                        >
                                                            <View className="flex-1 flex-row items-center gap-2 mr-2">
                                                                <Switch
                                                                    value={item.enabled}
                                                                    onValueChange={() => toggleDeduction(item.id)}
                                                                    trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                                                                />
                                                                <View className="flex-1">
                                                                    <Text
                                                                        className="text-xs font-semibold text-slate-900 dark:text-white"
                                                                        numberOfLines={1}
                                                                    >
                                                                        {item.name}
                                                                    </Text>
                                                                    <Text className="text-[10px] text-slate-400">
                                                                        {catConfig.label} • {item.payCutoff || 'both'}
                                                                    </Text>
                                                                </View>
                                                            </View>

                                                            {item.enabled ? (
                                                                <View className="flex-row items-center h-9 w-28 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2">
                                                                    <Text className="text-xs font-bold text-slate-400 mr-1">₱</Text>
                                                                    <TextInput
                                                                        value={item.amountStr}
                                                                        onChangeText={(t) => updateDeductionAmount(item.id, t)}
                                                                        keyboardType="decimal-pad"
                                                                        className="flex-1 text-xs font-bold text-slate-900 dark:text-white"
                                                                    />
                                                                </View>
                                                            ) : (
                                                                <Text className="text-xs font-semibold text-slate-400">Deselected</Text>
                                                            )}
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Live Summary Hero Card */}
                            <View className="rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 p-4 mb-4">
                                <Text className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-1">
                                    Net Take-Home Deposit
                                </Text>
                                <Text className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                                    {formatCurrency(activeNetAmount)}
                                </Text>

                                {mode === 'detailed' ? (
                                    <View className="pt-2 border-t border-emerald-500/20 space-y-1">
                                        <View className="flex-row justify-between items-center">
                                            <Text className="text-xs text-slate-600 dark:text-slate-400">Adjusted Gross Earnings</Text>
                                            <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                {formatCurrency(detailedCalculation.grossEarnings)}
                                            </Text>
                                        </View>
                                        <View className="flex-row justify-between items-center">
                                            <Text className="text-xs text-rose-600 dark:text-rose-400">Total Deductions</Text>
                                            <Text className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                                                - {formatCurrency(detailedCalculation.totalDeductions)}
                                            </Text>
                                        </View>
                                    </View>
                                ) : (
                                    <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Will be credited to target pocket and logged on your digital pay slip.
                                    </Text>
                                )}
                            </View>

                            {/* Notes Input */}
                            <View className="mb-6">
                                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Notes (Optional)</Text>
                                <TextInput
                                    value={notes}
                                    onChangeText={setNotes}
                                    placeholder="e.g. Regular cut-off, bonus included, 8 hours OT"
                                    placeholderTextColor="#94A3B8"
                                    className="h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3.5 text-xs text-slate-900 dark:text-white"
                                />
                            </View>
                        </ScrollView>

                        {/* Action Footer */}
                        <View
                            style={{ paddingBottom: Math.max(16, keyboardInset) }}
                            className="flex-row items-center gap-3 border-t border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900"
                        >
                            <Pressable
                                onPress={onClose}
                                disabled={submitting}
                                className="flex-1 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center active:bg-slate-200 dark:active:bg-slate-700"
                            >
                                <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">Cancel</Text>
                            </Pressable>

                            <Pressable
                                onPress={handleConfirm}
                                disabled={submitting || activeNetAmount <= 0}
                                className={`flex-1 h-12 rounded-xl flex-row items-center justify-center gap-2 ${
                                    submitting || activeNetAmount <= 0 ? 'bg-emerald-400 opacity-60' : 'bg-emerald-600 active:bg-emerald-700'
                                }`}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Check size={18} color="#FFFFFF" />
                                        <Text className="text-sm font-bold text-white">Confirm Deposit</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <DatePickerModal
                visible={datePickerVisible}
                initialDate={payDate}
                onSelectDate={(d: string) => {
                    setPayDate(d);
                    setDatePickerVisible(false);
                }}
                onClose={() => setDatePickerVisible(false)}
            />
        </>
    );
}
