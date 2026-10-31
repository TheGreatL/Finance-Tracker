import React, { useMemo } from 'react';
import { Modal, View, Text, Pressable, ScrollView, Share } from 'react-native';
import { X, FileCheck, Share2, Wallet, Building2, CheckCircle2 } from 'lucide-react-native';
import type { PaySlipRecord, DeductionSnapshotItem } from '../../types/database';
import { formatCurrency, formatDisplayDate, formatTime12 } from '../../utils/formatters';
import { DEDUCTION_CATEGORY_CONFIG } from '../../constants/salaryPresets';

interface PaySlipDetailModalProps {
    visible: boolean;
    paySlip: PaySlipRecord | null;
    onClose: () => void;
}

export function PaySlipDetailModal({ visible, paySlip, onClose }: PaySlipDetailModalProps) {
    const deductions: DeductionSnapshotItem[] = useMemo(() => {
        if (!paySlip?.deductions_snapshot) return [];
        try {
            return JSON.parse(paySlip.deductions_snapshot);
        } catch {
            return [];
        }
    }, [paySlip]);

    const handleShare = async () => {
        if (!paySlip) return;
        try {
            const breakdownText = deductions
                .map((d) => `  - ${d.name}: ₱${d.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
                .join('\n');

            const message = `PAY SLIP RECEIPT
Company: ${paySlip.company_name || 'Employer'}
Position: ${paySlip.job_title || 'Position'}
Pay Date: ${formatDisplayDate(paySlip.pay_date)}
--------------------------------
Gross Salary: ₱${paySlip.gross_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
Total Deductions: ₱${paySlip.total_deductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
${breakdownText}
--------------------------------
NET TAKE-HOME: ₱${paySlip.net_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
Deposited to: ${paySlip.pocket_name || 'Account Pocket'}
Status: Paid (${formatTime12(paySlip.created_at)})`;

            await Share.share({
                message,
                title: `Pay Slip - ${paySlip.company_name} - ${paySlip.pay_date}`
            });
        } catch {
            // Ignore share cancellation
        }
    };

    if (!paySlip) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/60">
                <View className="max-h-[88%] rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    {/* Header */}
                    <View className="flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                        <View className="flex-row items-center gap-2.5">
                            <View className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/60 items-center justify-center">
                                <FileCheck size={20} className="text-emerald-600 dark:text-emerald-400" />
                            </View>
                            <View>
                                <Text className="text-lg font-bold text-slate-900 dark:text-white">Pay Slip Receipt</Text>
                                <Text className="text-xs text-slate-500 dark:text-slate-400">
                                    {formatDisplayDate(paySlip.pay_date)} • {formatTime12(paySlip.created_at)}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row items-center gap-1.5">
                            <Pressable onPress={handleShare} hitSlop={12} className="rounded-full p-2 bg-slate-100 dark:bg-slate-800">
                                <Share2 size={16} className="text-slate-600 dark:text-slate-300" />
                            </Pressable>
                            <Pressable onPress={onClose} hitSlop={12} className="rounded-full p-2 bg-slate-100 dark:bg-slate-800">
                                <X size={18} className="text-slate-600 dark:text-slate-300" />
                            </Pressable>
                        </View>
                    </View>

                    <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
                        {/* Employer and Position Card */}
                        <View className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 p-4 mb-4">
                            <View className="flex-row items-center gap-2 mb-1">
                                <Building2 size={16} className="text-slate-400" />
                                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    {paySlip.company_name || 'Employer'}
                                </Text>
                            </View>
                            <Text className="text-base font-bold text-slate-900 dark:text-white mb-2">{paySlip.job_title || 'Employee'}</Text>
                            <View className="flex-row items-center gap-1.5">
                                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                                <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Direct Deposit Paid</Text>
                            </View>
                        </View>

                        {/* Payout Hero Card */}
                        <View className="rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 p-4 mb-4">
                            <Text className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-1">
                                Net Take-Home Deposited
                            </Text>
                            <Text className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-3">
                                {formatCurrency(paySlip.net_amount)}
                            </Text>

                            <View className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-xs text-slate-600 dark:text-slate-400">Gross Salary</Text>
                                    <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                        {formatCurrency(paySlip.gross_amount)}
                                    </Text>
                                </View>
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-xs text-rose-600 dark:text-rose-400">Total Deductions</Text>
                                    <Text className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                                        - {formatCurrency(paySlip.total_deductions)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Itemized Deductions Snapshot */}
                        <View className="mb-4">
                            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                                Itemized Deductions Snapshot
                            </Text>

                            {deductions.length === 0 ? (
                                <View className="rounded-xl border border-slate-100 dark:border-slate-800 p-4 items-center">
                                    <Text className="text-xs text-slate-400">No deductions recorded for this paycheck</Text>
                                </View>
                            ) : (
                                <View className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-850 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                                    {deductions.map((d, index) => {
                                        const catConfig = DEDUCTION_CATEGORY_CONFIG[d.category] || DEDUCTION_CATEGORY_CONFIG.other;
                                        return (
                                            <View key={index} className="flex-row items-center justify-between p-3">
                                                <View className="flex-1 mr-2">
                                                    <Text className="text-xs font-semibold text-slate-900 dark:text-white">{d.name}</Text>
                                                    <View className="flex-row items-center gap-1.5 mt-0.5">
                                                        <View className={`rounded px-1.5 py-0.5 ${catConfig.badgeBg}`}>
                                                            <Text className={`text-[9px] font-bold ${catConfig.badgeText}`}>{catConfig.label}</Text>
                                                        </View>
                                                        {d.is_percentage && d.percentage_rate ? (
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

                        {/* Target Account Pocket */}
                        <View className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 items-center justify-center">
                                <Wallet size={20} className="text-slate-600 dark:text-slate-300" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-[10px] uppercase font-bold text-slate-400">Deposited Into</Text>
                                <Text className="text-xs font-bold text-slate-900 dark:text-white">{paySlip.pocket_name || 'Account Pocket'}</Text>
                                {paySlip.institution_name ? (
                                    <Text className="text-[10px] text-slate-500 dark:text-slate-400">{paySlip.institution_name}</Text>
                                ) : null}
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer Close Button */}
                    <View className="border-t border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
                        <Pressable
                            onPress={onClose}
                            className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center active:bg-slate-200 dark:active:bg-slate-700"
                        >
                            <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">Close</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
