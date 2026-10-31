import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Briefcase, Calendar, ChevronRight, Wallet, CheckCircle2, Archive } from 'lucide-react-native';
import type { JobRecord } from '../../types/database';
import { formatCurrency, formatDisplayDate } from '../../utils/formatters';
import { getNextPayDate } from '../../services/salaryService';

interface JobCardProps {
    job: JobRecord;
    onPress: () => void;
}

export function JobCard({ job, onPress }: JobCardProps) {
    const isArchived = job.status === 'archived';

    const isOneTime = job.pay_schedule === 'one_time';

    const nextPayInfo = useMemo(() => {
        if (isArchived) return null;
        const now = new Date();
        const nextDate = getNextPayDate(job.pay_schedule, job.pay_day_1, job.pay_day_2, now, job.payout_date);
        const diffTime = new Date(nextDate).getTime() - new Date(now.toISOString().split('T')[0]).getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
            date: nextDate,
            daysRemaining
        };
    }, [isArchived, job.pay_schedule, job.pay_day_1, job.pay_day_2, job.payout_date]);

    const employmentTypeLabel = useMemo(() => {
        switch (job.employment_type) {
            case 'full_time':
                return 'Full-Time';
            case 'part_time':
                return 'Part-Time';
            case 'freelance':
                return 'Freelance';
            case 'contract':
                return 'Contract';
            default:
                return 'Other';
        }
    }, [job.employment_type]);

    const scheduleLabel = useMemo(() => {
        switch (job.pay_schedule) {
            case 'semi_monthly':
                return 'Semi-Monthly';
            case 'monthly':
                return 'Monthly';
            case 'biweekly':
                return 'Bi-Weekly';
            case 'weekly':
                return 'Weekly';
            case 'one_time':
                return 'One-Time';
            default:
                return 'Paycheck';
        }
    }, [job.pay_schedule]);

    return (
        <Pressable
            onPress={onPress}
            className={`mb-3.5 rounded-2xl border p-4 active:scale-[0.99] transition-transform ${
                isArchived
                    ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-80'
                    : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 shadow-sm'
            }`}
        >
            {/* Header: Title, Company, Badges */}
            <View className="flex-row items-start justify-between mb-3">
                <View className="flex-row items-center gap-3 flex-1 mr-2">
                    <View className="w-10 h-10 rounded-xl items-center justify-center shadow-xs" style={{ backgroundColor: job.color || '#4F46E5' }}>
                        <Briefcase size={20} color="#FFFFFF" />
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

                <View className="items-end gap-1">
                    {isArchived ? (
                        <View className="flex-row items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 border border-slate-200 dark:border-slate-700">
                            <Archive size={11} className="text-slate-500" />
                            <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Archived</Text>
                        </View>
                    ) : (
                        <View className="flex-row items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 border border-emerald-200 dark:border-emerald-800/50">
                            <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                            <Text className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Active</Text>
                        </View>
                    )}
                    <View className="rounded px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800">
                        <Text className="text-[10px] font-medium text-slate-600 dark:text-slate-400">{employmentTypeLabel}</Text>
                    </View>
                </View>
            </View>

            {/* Financials Row: Net Take-Home vs Deductions */}
            <View className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 mb-3 border border-slate-100 dark:border-slate-800">
                <View className="flex-row justify-between items-end mb-1.5">
                    <View>
                        <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {isOneTime ? 'Agreed Net Payout' : 'Net Take-Home Pay'}
                        </Text>
                        <Text className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(job.net_take_home ?? job.gross_salary)}
                            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {isOneTime ? ' (One-time)' : ` / ${scheduleLabel.toLowerCase()}`}
                            </Text>
                        </Text>
                    </View>

                    <View className="items-end">
                        <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {isOneTime ? 'Total Agreed' : 'Gross Pay'}
                        </Text>
                        <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(job.gross_salary)}</Text>
                    </View>
                </View>

                {/* Deductions line tag */}
                <View className="flex-row items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                    <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                        {job.deductions_count ? `${job.deductions_count} Itemized Deductions` : 'No Deductions'}
                    </Text>
                    <Text className="text-[11px] font-bold text-rose-600 dark:text-rose-400">- {formatCurrency(job.total_deductions ?? 0)}</Text>
                </View>
            </View>

            {/* Footer Info: Next Payday Countdown & Target Pocket */}
            <View className="flex-row items-center justify-between pt-1">
                {!isArchived && nextPayInfo ? (
                    <View className="flex-row items-center gap-1.5">
                        <Calendar size={13} className="text-amber-500" />
                        <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {isOneTime
                                ? nextPayInfo.daysRemaining < 0
                                    ? 'Payout Pending'
                                    : nextPayInfo.daysRemaining === 0
                                      ? 'Payout Today'
                                      : nextPayInfo.daysRemaining === 1
                                        ? 'Payout Tomorrow'
                                        : `Payout in ${nextPayInfo.daysRemaining} days`
                                : nextPayInfo.daysRemaining === 0
                                  ? 'Payday Today'
                                  : nextPayInfo.daysRemaining === 1
                                    ? 'Payday Tomorrow'
                                    : `Payday in ${nextPayInfo.daysRemaining} days`}
                            <Text className="text-[11px] font-normal text-slate-400"> • {formatDisplayDate(nextPayInfo.date)}</Text>
                        </Text>
                    </View>
                ) : (
                    <View className="flex-row items-center gap-1.5">
                        <Wallet size={13} className="text-slate-400" />
                        <Text className="text-xs text-slate-500 dark:text-slate-400">{job.pocket_name || 'Account Pocket'}</Text>
                    </View>
                )}

                <View className="flex-row items-center gap-0.5">
                    <Text className="text-xs font-bold text-slate-600 dark:text-slate-400">View</Text>
                    <ChevronRight size={14} className="text-slate-400" />
                </View>
            </View>
        </Pressable>
    );
}
