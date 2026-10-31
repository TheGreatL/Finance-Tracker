import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { X, Edit3, Calendar, Wallet, Building2, FileText, ChevronRight, Archive } from 'lucide-react-native';
import type { JobRecord, JobDeductionRecord, PaySlipRecord } from '../../types/database';
import { formatCurrency, formatDisplayDate } from '../../utils/formatters';
import { getDatabase } from '../../database/db';
import { getDeductionsByJobId, getPaySlipsByJob, getNextPayDate, calculateNetTakeHome } from '../../services/salaryService';
import { DEDUCTION_CATEGORY_CONFIG } from '../../constants/salaryPresets';

interface JobDetailSheetProps {
    visible: boolean;
    job: JobRecord | null;
    onClose: () => void;
    onEdit: (job: JobRecord) => void;
    onRecordPayday: (job: JobRecord) => void;
    onViewPaySlip: (paySlip: PaySlipRecord) => void;
}

export function JobDetailSheet({ visible, job, onClose, onEdit, onRecordPayday, onViewPaySlip }: JobDetailSheetProps) {
    const [deductions, setDeductions] = useState<JobDeductionRecord[]>([]);
    const [paySlips, setPaySlips] = useState<PaySlipRecord[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && job) {
            setLoading(true);
            (async () => {
                try {
                    const db = await getDatabase();
                    const [deds, slips] = await Promise.all([getDeductionsByJobId(db, job.id), getPaySlipsByJob(db, job.id)]);
                    setDeductions(deds);
                    setPaySlips(slips);
                } catch (err) {
                    console.warn('Failed to load job details', err);
                } finally {
                    setLoading(false);
                }
            })();
        }
    }, [visible, job]);

    if (!job) return null;

    const isArchived = job.status === 'archived';
    const isOneTime = job.pay_schedule === 'one_time';
    const isSemiMonthly = job.pay_schedule === 'semi_monthly';
    const now = new Date();
    const nextDate = !isArchived ? getNextPayDate(job.pay_schedule, job.pay_day_1, job.pay_day_2, now, job.payout_date) : null;
    const diffTime = nextDate ? new Date(nextDate).getTime() - new Date(now.toISOString().split('T')[0]).getTime() : 0;
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const targetCutoff =
        isSemiMonthly && nextDate
            ? Math.abs(parseInt(nextDate.split('-')[2], 10) - job.pay_day_1) <= Math.abs(parseInt(nextDate.split('-')[2], 10) - (job.pay_day_2 || 30))
                ? 'first_cutoff'
                : 'second_cutoff'
            : 'both';
    const upcomingBreakdown = calculateNetTakeHome(job.gross_salary, deductions, targetCutoff);

    const bannerTitle = isOneTime
        ? daysRemaining < 0
            ? 'Payout Pending'
            : daysRemaining === 0
              ? 'Payout Due Today'
              : daysRemaining === 1
                ? 'Payout Tomorrow'
                : `Payout in ${daysRemaining} days`
        : daysRemaining === 0
          ? 'Payday Today'
          : daysRemaining === 1
            ? 'Payday Tomorrow'
            : `Next Payday in ${daysRemaining} days`;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/60">
                <View className="max-h-[92%] rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    {/* Header */}
                    <View className="flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                        <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                            <View
                                className="w-10 h-10 rounded-xl items-center justify-center shadow-xs"
                                style={{ backgroundColor: job.color || '#4F46E5' }}
                            >
                                <Building2 size={20} color="#FFFFFF" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-base font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                                    {job.title}
                                </Text>
                                <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>
                                    {job.company_name}
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center gap-1.5">
                            <Pressable onPress={() => onEdit(job)} hitSlop={12} className="rounded-full p-2 bg-slate-100 dark:bg-slate-800">
                                <Edit3 size={16} className="text-slate-700 dark:text-slate-300" />
                            </Pressable>
                            <Pressable onPress={onClose} hitSlop={12} className="rounded-full p-2 bg-slate-100 dark:bg-slate-800">
                                <X size={18} className="text-slate-600 dark:text-slate-300" />
                            </Pressable>
                        </View>
                    </View>

                    {loading ? (
                        <View className="p-12 items-center justify-center">
                            <ActivityIndicator size="large" color="#10B981" />
                        </View>
                    ) : (
                        <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
                            {/* Status and Next Payday Banner */}
                            {isArchived ? (
                                <View className="mb-4 flex-row items-center gap-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-3.5 border border-slate-200 dark:border-slate-700">
                                    <Archive size={18} className="text-slate-500" />
                                    <View className="flex-1">
                                        <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">Archived Career Record</Text>
                                        <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Historical pay slips and past deductions are preserved.
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                <View className="mb-4 flex-row items-center justify-between rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-3.5 border border-amber-200 dark:border-amber-800/50">
                                    <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                                        <Calendar size={18} className="text-amber-600 dark:text-amber-400" />
                                        <View>
                                            <Text className="text-xs font-bold text-amber-900 dark:text-amber-300">{bannerTitle}</Text>
                                            <Text className="text-[11px] text-amber-700 dark:text-amber-400">
                                                Scheduled on {nextDate ? formatDisplayDate(nextDate) : 'upcoming'}
                                            </Text>
                                        </View>
                                    </View>
                                    <Pressable
                                        onPress={() => onRecordPayday(job)}
                                        className="rounded-xl bg-amber-500 active:bg-amber-600 px-3 py-1.5"
                                    >
                                        <Text className="text-xs font-bold text-white">{isOneTime ? 'Deposit' : 'Record Now'}</Text>
                                    </Pressable>
                                </View>
                            )}

                            {/* Earnings & Take-Home Card */}
                            <View className="mb-5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 p-4">
                                <Text className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 tracking-wider mb-1">
                                    {isOneTime
                                        ? 'Agreed Net Payout'
                                        : isSemiMonthly
                                          ? `Next Paycheck Net (${targetCutoff === 'first_cutoff' ? '1st Cut-off' : '2nd Cut-off'})`
                                          : 'Net Take-Home Pay (Per Paycheck)'}
                                </Text>
                                <Text className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-3">
                                    {formatCurrency(upcomingBreakdown.netTakeHome)}
                                </Text>

                                <View className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                                    <View className="flex-row justify-between items-center">
                                        <Text className="text-xs text-slate-600 dark:text-slate-400">
                                            {isOneTime ? 'Total Agreed' : 'Gross Earnings'}
                                        </Text>
                                        <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                            {formatCurrency(job.gross_salary)}
                                        </Text>
                                    </View>
                                    <View className="flex-row justify-between items-center">
                                        <Text className="text-xs text-rose-600 dark:text-rose-400">
                                            {isSemiMonthly
                                                ? `Deductions (${targetCutoff === 'first_cutoff' ? '1st Cut-off' : '2nd Cut-off'})`
                                                : 'Total Deductions'}
                                        </Text>
                                        <Text className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                                            - {formatCurrency(upcomingBreakdown.totalDeductions)}
                                        </Text>
                                    </View>
                                    <View className="flex-row justify-between items-center pt-1 border-t border-emerald-500/15">
                                        <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {isOneTime ? 'Current Month Budget Impact' : 'Estimated Monthly Take-Home'}
                                        </Text>
                                        <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                            {formatCurrency(job.monthly_net ?? 0)}/mo
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Direct Deposit Pocket */}
                            <View className="mb-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 flex-row items-center gap-3">
                                <View className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 items-center justify-center">
                                    <Wallet size={20} className="text-slate-600 dark:text-slate-300" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[10px] uppercase font-bold text-slate-400">Deposit Destination</Text>
                                    <Text className="text-xs font-bold text-slate-900 dark:text-white">{job.pocket_name || 'Account Pocket'}</Text>
                                    {job.institution_name ? (
                                        <Text className="text-[10px] text-slate-500 dark:text-slate-400">{job.institution_name}</Text>
                                    ) : null}
                                </View>
                            </View>

                            {/* Itemized Deductions Section */}
                            <View className="mb-5">
                                <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                                    Itemized Payroll Deductions ({deductions.length})
                                </Text>

                                {deductions.length === 0 ? (
                                    <View className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 items-center">
                                        <Text className="text-xs text-slate-400">No itemized deductions registered</Text>
                                    </View>
                                ) : (
                                    <View className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                                        {deductions.map((d) => {
                                            const catConfig = DEDUCTION_CATEGORY_CONFIG[d.category] || DEDUCTION_CATEGORY_CONFIG.other;
                                            return (
                                                <View key={d.id} className="flex-row items-center justify-between p-3.5">
                                                    <View className="flex-1 mr-2">
                                                        <Text className="text-xs font-semibold text-slate-900 dark:text-white">{d.name}</Text>
                                                        <View className="flex-row items-center gap-1.5 mt-0.5">
                                                            <View className={`rounded px-1.5 py-0.5 ${catConfig.badgeBg}`}>
                                                                <Text className={`text-[9px] font-bold ${catConfig.badgeText}`}>
                                                                    {catConfig.label}
                                                                </Text>
                                                            </View>
                                                            {isSemiMonthly && (
                                                                <View
                                                                    className={`rounded px-1.5 py-0.5 ${
                                                                        d.pay_cutoff === 'first_cutoff'
                                                                            ? 'bg-blue-50 dark:bg-blue-950/40'
                                                                            : d.pay_cutoff === 'second_cutoff'
                                                                              ? 'bg-purple-50 dark:bg-purple-950/40'
                                                                              : 'bg-slate-100 dark:bg-slate-800'
                                                                    }`}
                                                                >
                                                                    <Text
                                                                        className={`text-[9px] font-bold ${
                                                                            d.pay_cutoff === 'first_cutoff'
                                                                                ? 'text-blue-700 dark:text-blue-400'
                                                                                : d.pay_cutoff === 'second_cutoff'
                                                                                  ? 'text-purple-700 dark:text-purple-400'
                                                                                  : 'text-slate-600 dark:text-slate-400'
                                                                        }`}
                                                                    >
                                                                        {d.pay_cutoff === 'first_cutoff'
                                                                            ? '1st Cut-off'
                                                                            : d.pay_cutoff === 'second_cutoff'
                                                                              ? '2nd Cut-off'
                                                                              : 'Both Cut-offs'}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                            {Boolean(d.is_percentage) && d.percentage_rate ? (
                                                                <Text className="text-[10px] text-slate-400">({d.percentage_rate}%)</Text>
                                                            ) : null}
                                                        </View>
                                                    </View>
                                                    <Text className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                                        - {formatCurrency(d.amount)}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>

                            {/* Pay Slip History */}
                            <View className="mb-6">
                                <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                                    Lifetime Pay Slips ({paySlips.length})
                                </Text>

                                {paySlips.length === 0 ? (
                                    <View className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 items-center justify-center">
                                        <FileText size={24} className="text-slate-300 dark:text-slate-600 mb-1.5" />
                                        <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Pay Slips Recorded Yet</Text>
                                        <Text className="text-[11px] text-slate-400 text-center mt-0.5">
                                            Payday deposits will automatically generate digital pay slip receipts here.
                                        </Text>
                                    </View>
                                ) : (
                                    <View className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                                        {paySlips.map((slip) => (
                                            <Pressable
                                                key={slip.id}
                                                onPress={() => onViewPaySlip(slip)}
                                                className="flex-row items-center justify-between p-3.5 active:bg-slate-50 dark:active:bg-slate-800/60"
                                            >
                                                <View className="flex-1 mr-2">
                                                    <Text className="text-xs font-bold text-slate-900 dark:text-white">
                                                        {formatDisplayDate(slip.pay_date)}
                                                    </Text>
                                                    <Text className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                        Gross: {formatCurrency(slip.gross_amount)} • Deductions: -
                                                        {formatCurrency(slip.total_deductions)}
                                                    </Text>
                                                </View>
                                                <View className="flex-row items-center gap-1.5">
                                                    <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                        {formatCurrency(slip.net_amount)}
                                                    </Text>
                                                    <ChevronRight size={14} className="text-slate-400" />
                                                </View>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </ScrollView>
                    )}

                    {/* Footer Action Buttons */}
                    <View className="border-t border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 flex-row gap-3">
                        {!isArchived && (
                            <Pressable
                                onPress={() => onRecordPayday(job)}
                                className="flex-1 h-12 rounded-xl bg-emerald-600 items-center justify-center active:bg-emerald-700"
                            >
                                <Text className="text-sm font-bold text-white">{isOneTime ? 'Deposit Payout Now' : 'Record Payday Now'}</Text>
                            </Pressable>
                        )}
                        <Pressable
                            onPress={() => onEdit(job)}
                            className={`${
                                isArchived ? 'flex-1' : ''
                            } px-5 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center active:bg-slate-200`}
                        >
                            <Text className="text-sm font-bold text-slate-700 dark:text-slate-200">Edit Terms</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
