import React, { useState, useMemo } from 'react';
import { Modal, View, Text, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { X, Calendar, Paperclip, Trash2, Pencil, User, Sparkles, Clock, Check, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react-native';
import type { LoanRecord } from '../../types/database';
import { formatCurrency, formatDisplayDate } from '../../utils/formatters';
import { InstitutionLogo } from '../accounts/InstitutionLogo';
import { getLoanTimelineMetrics, calculateLoanInstallmentSchedule, type LoanInstallmentSchedule } from '../../services/loanService';

interface LoanDetailSheetProps {
    visible: boolean;
    loan: LoanRecord | null;
    onClose: () => void;
    onRecordPayment: (loan: LoanRecord, suggestedAmount?: number) => void;
    onDelete: (loanId: string) => Promise<void>;
    onEdit?: (loan: LoanRecord) => void;
}

export function LoanDetailSheet({ visible, loan, onClose, onRecordPayment, onDelete, onEdit }: LoanDetailSheetProps) {
    const [deleting, setDeleting] = useState(false);
    const [hideSettled, setHideSettled] = useState(true);
    const [expandedInstallmentIndex, setExpandedInstallmentIndex] = useState<number | null>(null);

    const schedule: LoanInstallmentSchedule | null = useMemo(() => (loan ? calculateLoanInstallmentSchedule(loan) : null), [loan]);

    const suggestedPaymentAmount = useMemo(() => {
        if (!loan) return 0;
        if (schedule?.activeInstallment && schedule.activeInstallment.remainingDue > 0) {
            return Math.min(schedule.activeInstallment.remainingDue, loan.remaining_balance);
        }
        return Math.min(loan.monthly_payment, loan.remaining_balance);
    }, [loan, schedule]);

    const totalSettledAmount = useMemo(() => {
        if (!schedule) return 0;
        return schedule.installments.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amountPaid, 0);
    }, [schedule]);

    if (!loan) return null;

    const isPaid = loan.status === 'paid';
    const progressPercent = Math.min(100, Math.max(0, Math.round(((loan.total_amount - loan.remaining_balance) / loan.total_amount) * 100)));
    const metrics = getLoanTimelineMetrics(loan);
    const isPerson = loan.lender_type === 'person';

    const handleDelete = () => {
        Alert.alert('Delete Loan', `Are you sure you want to delete "${loan.title}"? This cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setDeleting(true);
                        await onDelete(loan.id);
                        onClose();
                    } catch (err: any) {
                        Alert.alert('Error', err?.message || 'Failed to delete loan');
                    } finally {
                        setDeleting(false);
                    }
                }
            }
        ]);
    };

    const handleOpenAttachment = () => {
        if (loan.attachment_path) {
            Linking.openURL(loan.attachment_path).catch(() => {
                Alert.alert('Attachment', `File saved at:\n${loan.attachment_path}`);
            });
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-stone-50 rounded-t-3xl max-h-[90%] border-t border-stone-100">
                    {/* Header */}
                    <View className="bg-white px-6 pt-5 pb-4 rounded-t-3xl border-b border-stone-200/80">
                        <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row items-center flex-1 mr-3">
                                {isPerson ? (
                                    <View className="w-10 h-10 rounded-2xl bg-amber-100 items-center justify-center mr-3 border border-amber-200">
                                        <User size={20} color="#B45309" />
                                    </View>
                                ) : loan.institution_code ? (
                                    <InstitutionLogo code={loan.institution_code} size={40} className="mr-3" />
                                ) : null}
                                <View className="flex-1">
                                    <View className="flex-row items-center flex-wrap">
                                        <Text className="text-lg font-bold text-stone-900 mr-2" numberOfLines={1}>
                                            {loan.title}
                                        </Text>
                                        {loan.has_interest_cashback ? (
                                            <View className="flex-row items-center bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-full">
                                                <Sparkles size={10} color="#0D9488" />
                                                <Text className="text-[10px] font-bold text-teal-800 ml-1">Cashback</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <Text className="text-xs text-stone-500 font-medium mt-0.5">
                                        {isPerson
                                            ? loan.lender_name
                                                ? `Personal Loan • ${loan.lender_name}`
                                                : 'Personal Loan'
                                            : loan.institution_name || 'Lending Provider'}
                                    </Text>
                                </View>
                            </View>

                            <Pressable
                                onPress={onClose}
                                accessibilityRole="button"
                                accessibilityLabel="Close sheet"
                                hitSlop={8}
                                pressRetentionOffset={20}
                                className="w-8 h-8 rounded-full bg-stone-100 items-center justify-center"
                            >
                                <X size={18} color="#78716C" />
                            </Pressable>
                        </View>

                        {/* Total vs Remaining Debt Highlight */}
                        <View className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/60 flex-row items-center justify-between">
                            <View>
                                <Text className="text-xs font-semibold uppercase tracking-wider text-amber-800">Remaining Debt</Text>
                                <Text
                                    className={`text-2xl font-bold tracking-tight mt-0.5 ${
                                        isPaid ? 'text-emerald-700 line-through' : 'text-stone-900'
                                    }`}
                                >
                                    {formatCurrency(loan.remaining_balance)}
                                </Text>
                            </View>

                            <View className="items-end">
                                <Text className="text-[10px] text-stone-400 font-medium">Total Contract Obligation</Text>
                                <Text className="text-sm font-bold text-stone-700">{formatCurrency(loan.total_amount)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Details Scroll */}
                    <ScrollView className="p-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* Repayment Progress */}
                        <View className="bg-white p-4 rounded-2xl border border-stone-200/80 mb-3">
                            <View className="flex-row items-center justify-between mb-2">
                                <Text className="text-xs font-bold text-stone-700">Repayment Progress</Text>
                                <Text className="text-xs font-bold text-[#18342B]">{progressPercent}%</Text>
                            </View>
                            <View className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden mb-2">
                                <View
                                    className={`h-full rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-[#18342B]'}`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </View>
                            <Text className="text-[11px] text-stone-500 font-medium">
                                {formatCurrency(loan.total_amount - loan.remaining_balance)} paid of {formatCurrency(loan.total_amount)}
                            </Text>
                        </View>

                        {/* Financial Breakdown Card */}
                        <View className="bg-white p-4 rounded-2xl border border-stone-200/80 mb-3">
                            <Text className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Financial Breakdown</Text>
                            <View className="flex-row items-center justify-between mb-2">
                                <Text className="text-xs text-stone-600">Principal Borrowed</Text>
                                <Text className="text-xs font-bold text-stone-900">{formatCurrency(loan.principal_amount || loan.total_amount)}</Text>
                            </View>
                            {loan.processing_fee && loan.processing_fee > 0 ? (
                                <View className="flex-row items-center justify-between mb-2">
                                    <Text className="text-xs text-stone-600">Upfront Processing Fee</Text>
                                    <Text className="text-xs font-bold text-amber-900">- {formatCurrency(loan.processing_fee)}</Text>
                                </View>
                            ) : null}
                            {loan.processing_fee && loan.processing_fee > 0 ? (
                                <View className="flex-row items-center justify-between mb-2 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100">
                                    <Text className="text-xs font-medium text-emerald-800">Net Cash Disbursed</Text>
                                    <Text className="text-xs font-bold text-emerald-900">{formatCurrency(metrics.netProceeds)}</Text>
                                </View>
                            ) : null}
                            <View className="flex-row items-center justify-between mb-2 pt-2 border-t border-stone-100">
                                <Text className="text-xs text-stone-600">Total Contract Obligation</Text>
                                <Text className="text-xs font-bold text-stone-900">{formatCurrency(loan.total_amount)}</Text>
                            </View>
                            {metrics.totalInterest > 0 ? (
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-xs text-stone-600">Total Contract Interest</Text>
                                    <Text className="text-xs font-bold text-amber-800">{formatCurrency(metrics.totalInterest)}</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Timeline & Duration Card */}
                        <View className="bg-white p-4 rounded-2xl border border-stone-200/80 mb-3">
                            <View className="flex-row items-center justify-between mb-3">
                                <Text className="text-xs font-bold uppercase tracking-wider text-stone-400">Timeline & Tenor</Text>
                                {loan.term_months ? (
                                    <View className="flex-row items-center bg-stone-100 px-2 py-0.5 rounded-md">
                                        <Clock size={11} color="#57534E" />
                                        <Text className="text-[10px] font-bold text-stone-700 ml-1">{loan.term_months} Months Tenor</Text>
                                    </View>
                                ) : null}
                            </View>

                            {loan.start_date ? (
                                <View className="flex-row items-center justify-between mb-2">
                                    <Text className="text-xs text-stone-600">Origination / Start Date</Text>
                                    <Text className="text-xs font-bold text-stone-900">{formatDisplayDate(loan.start_date)}</Text>
                                </View>
                            ) : null}

                            <View className="flex-row items-center justify-between mb-2">
                                <Text className="text-xs text-stone-600">Next Due Date</Text>
                                <View className="flex-row items-center">
                                    <Calendar size={13} color="#57534E" />
                                    <Text className="text-xs font-bold text-stone-900 ml-1.5">{formatDisplayDate(loan.due_date)}</Text>
                                </View>
                            </View>

                            {metrics.projectedMaturityDate ? (
                                <View className="flex-row items-center justify-between mb-2">
                                    <Text className="text-xs text-stone-600">Projected Maturity Date</Text>
                                    <Text className="text-xs font-bold text-stone-900">{formatDisplayDate(metrics.projectedMaturityDate)}</Text>
                                </View>
                            ) : null}

                            {metrics.hasTimeline && !isPaid && loan.term_months ? (
                                <View className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/70 mt-1 flex-row items-center justify-between">
                                    <Text className="text-xs text-stone-600">Amortization Progress</Text>
                                    <Text className="text-xs font-bold text-stone-900">
                                        {schedule && schedule.installments.length > 0
                                            ? `${schedule.settledCount} of ${loan.term_months} Settled`
                                            : `Month ${metrics.elapsedMonths} of ${loan.term_months}`}
                                    </Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Payment Schedule & Installment Stepper Card */}
                        <View className="bg-white p-4 rounded-2xl border border-stone-200/80 mb-3">
                            <View className="flex-row items-center justify-between mb-3">
                                <View>
                                    <Text className="text-xs font-bold uppercase tracking-wider text-stone-400">Payment Schedule</Text>
                                    {schedule && schedule.installments.length > 0 ? (
                                        <Text className="text-xs font-bold text-stone-800 mt-0.5">
                                            {schedule.settledCount} of {schedule.totalTermMonths} Installments Settled
                                        </Text>
                                    ) : null}
                                </View>
                                {schedule && schedule.settledCount > 0 ? (
                                    <Pressable
                                        onPress={() => setHideSettled((prev) => !prev)}
                                        hitSlop={8}
                                        pressRetentionOffset={10}
                                        className="flex-row items-center bg-stone-100 active:bg-stone-200 px-2.5 py-1 rounded-full"
                                    >
                                        {hideSettled ? <Eye size={12} color="#57534E" /> : <EyeOff size={12} color="#57534E" />}
                                        <Text className="text-[11px] font-bold text-stone-700 ml-1.5">
                                            {hideSettled ? 'Show Settled' : 'Hide Settled'}
                                        </Text>
                                    </Pressable>
                                ) : null}
                            </View>

                            <View className="flex-row items-center justify-between mb-2.5 pb-2.5 border-b border-stone-100">
                                <Text className="text-xs text-stone-600">Monthly Amortization</Text>
                                <Text className="text-sm font-bold text-stone-900">{formatCurrency(loan.monthly_payment)}</Text>
                            </View>
                            {loan.interest_rate ? (
                                <View className="flex-row items-center justify-between mb-3 pb-2.5 border-b border-stone-100">
                                    <Text className="text-xs text-stone-600">Interest Rate</Text>
                                    <Text className="text-xs font-bold text-stone-900">{loan.interest_rate}% p.a.</Text>
                                </View>
                            ) : null}

                            {/* Installment Stepper Timeline */}
                            {schedule && schedule.installments.length > 0 ? (
                                <View className="mt-2">
                                    {/* Auto-collapse banner when settled items are hidden */}
                                    {hideSettled && schedule.settledCount > 0 ? (
                                        <Pressable
                                            onPress={() => setHideSettled(false)}
                                            hitSlop={8}
                                            pressRetentionOffset={15}
                                            className="bg-emerald-50/80 border border-emerald-200/70 rounded-xl p-2.5 flex-row items-center justify-between mb-3 active:bg-emerald-100/70"
                                        >
                                            <View className="flex-row items-center flex-1 mr-2">
                                                <View className="w-5 h-5 rounded-full bg-emerald-100 items-center justify-center mr-2">
                                                    <Check size={12} color="#059669" />
                                                </View>
                                                <Text className="text-xs font-semibold text-emerald-950">
                                                    {schedule.settledCount} {schedule.settledCount === 1 ? 'Month' : 'Months'} Settled (
                                                    {formatCurrency(totalSettledAmount)})
                                                </Text>
                                            </View>
                                            <Text className="text-xs font-bold text-emerald-700">Show</Text>
                                        </Pressable>
                                    ) : null}

                                    {/* Stepper items */}
                                    {schedule.installments
                                        .filter((item) => (hideSettled ? item.status !== 'paid' : true))
                                        .map((item, idx, arr) => {
                                            const isLast = idx === arr.length - 1;
                                            const isExpanded = expandedInstallmentIndex === item.index;

                                            return (
                                                <View key={item.index} className="flex-row">
                                                    {/* Node & vertical line column */}
                                                    <View className="items-center w-6 mr-3">
                                                        {item.status === 'paid' ? (
                                                            <View className="w-5 h-5 rounded-full bg-emerald-500 items-center justify-center">
                                                                <Check size={11} color="#FFFFFF" strokeWidth={3} />
                                                            </View>
                                                        ) : item.status === 'partially_paid' ? (
                                                            <View className="w-5 h-5 rounded-full bg-amber-500 items-center justify-center border-2 border-amber-200">
                                                                <View className="w-1.5 h-1.5 rounded-full bg-white" />
                                                            </View>
                                                        ) : (
                                                            <View className="w-5 h-5 rounded-full border-2 border-stone-300 bg-white" />
                                                        )}

                                                        {!isLast && (
                                                            <View
                                                                className={`w-0.5 flex-1 my-0.5 ${
                                                                    item.status === 'paid'
                                                                        ? 'bg-emerald-400'
                                                                        : item.status === 'partially_paid'
                                                                          ? 'bg-amber-300'
                                                                          : 'bg-stone-200'
                                                                }`}
                                                            />
                                                        )}
                                                    </View>

                                                    {/* Row content */}
                                                    <View className={`flex-1 ${isLast ? 'pb-1' : 'pb-4'}`}>
                                                        <Pressable
                                                            onPress={() => {
                                                                if (item.status === 'partially_paid') {
                                                                    setExpandedInstallmentIndex(isExpanded ? null : item.index);
                                                                } else if (item.status === 'upcoming') {
                                                                    onRecordPayment(loan, item.remainingDue);
                                                                }
                                                            }}
                                                            className="flex-row items-center justify-between"
                                                        >
                                                            <View className="flex-1 mr-2">
                                                                <View className="flex-row items-center flex-wrap">
                                                                    <Text
                                                                        className={`text-xs font-bold ${
                                                                            item.status === 'paid'
                                                                                ? 'text-stone-700'
                                                                                : item.status === 'partially_paid'
                                                                                  ? 'text-amber-950'
                                                                                  : 'text-stone-800'
                                                                        }`}
                                                                    >
                                                                        {formatDisplayDate(item.dueDate)}
                                                                    </Text>
                                                                    {item.isSettledEarly ? (
                                                                        <View className="ml-1.5 bg-emerald-100/90 px-1.5 py-0.5 rounded">
                                                                            <Text className="text-[9px] font-bold text-emerald-800">
                                                                                Settled Early
                                                                            </Text>
                                                                        </View>
                                                                    ) : null}
                                                                </View>
                                                                <Text className="text-[10px] text-stone-500 font-medium">
                                                                    {item.index} of {schedule.totalTermMonths}
                                                                </Text>
                                                            </View>

                                                            {/* Right amount and status pill */}
                                                            <View className="items-end">
                                                                <View className="flex-row items-center">
                                                                    <Text
                                                                        className={`text-xs font-bold mr-1.5 ${
                                                                            item.status === 'paid'
                                                                                ? 'text-stone-600'
                                                                                : item.status === 'partially_paid'
                                                                                  ? 'text-amber-900 font-extrabold'
                                                                                  : 'text-stone-700'
                                                                        }`}
                                                                    >
                                                                        {formatCurrency(
                                                                            item.status === 'partially_paid'
                                                                                ? item.remainingDue
                                                                                : item.scheduledAmount
                                                                        )}
                                                                    </Text>
                                                                    {item.status === 'paid' ? (
                                                                        <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                                                                            <Text className="text-[9px] font-bold text-emerald-800">PAID</Text>
                                                                        </View>
                                                                    ) : item.status === 'partially_paid' ? (
                                                                        <View className="bg-amber-100 px-2 py-0.5 rounded-full flex-row items-center">
                                                                            <Text className="text-[9px] font-bold text-amber-900 mr-0.5">
                                                                                PARTIAL
                                                                            </Text>
                                                                            {isExpanded ? (
                                                                                <ChevronUp size={10} color="#78350F" />
                                                                            ) : (
                                                                                <ChevronDown size={10} color="#78350F" />
                                                                            )}
                                                                        </View>
                                                                    ) : null}
                                                                </View>
                                                            </View>
                                                        </Pressable>

                                                        {/* Expandable breakdown for partially paid */}
                                                        {item.status === 'partially_paid' && isExpanded ? (
                                                            <View className="mt-2 bg-amber-50/90 border border-amber-200/80 rounded-xl p-3">
                                                                <Text className="text-[11px] font-semibold text-amber-900 mb-1">
                                                                    Partial Payment Breakdown
                                                                </Text>
                                                                <View className="flex-row items-center justify-between mb-1">
                                                                    <Text className="text-[10px] text-stone-600">Scheduled Installment</Text>
                                                                    <Text className="text-[10px] font-semibold text-stone-900">
                                                                        {formatCurrency(item.scheduledAmount)}
                                                                    </Text>
                                                                </View>
                                                                <View className="flex-row items-center justify-between mb-1">
                                                                    <Text className="text-[10px] text-emerald-700">Advance Credit Applied</Text>
                                                                    <Text className="text-[10px] font-bold text-emerald-700">
                                                                        - {formatCurrency(item.advanceCredit || 0)}
                                                                    </Text>
                                                                </View>
                                                                <View className="flex-row items-center justify-between pt-1 border-t border-amber-200/60 mb-2">
                                                                    <Text className="text-[10px] font-bold text-amber-950">Remaining Due</Text>
                                                                    <Text className="text-[11px] font-extrabold text-amber-950">
                                                                        {formatCurrency(item.remainingDue)}
                                                                    </Text>
                                                                </View>
                                                                <Pressable
                                                                    onPress={() => onRecordPayment(loan, item.remainingDue)}
                                                                    hitSlop={8}
                                                                    className="bg-amber-700 py-1.5 rounded-lg items-center active:bg-amber-800"
                                                                >
                                                                    <Text className="text-white text-[10px] font-bold">
                                                                        Pay Remaining {formatCurrency(item.remainingDue)}
                                                                    </Text>
                                                                </Pressable>
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                </View>
                                            );
                                        })}
                                </View>
                            ) : null}
                        </View>

                        {/* Early Payoff Cashback Card */}
                        {loan.has_interest_cashback ? (
                            <View className="bg-teal-50/80 p-4 rounded-2xl border border-teal-200 mb-3">
                                <View className="flex-row items-center mb-1">
                                    <Sparkles size={15} color="#0D9488" />
                                    <Text className="text-xs font-bold text-teal-900 ml-1.5">Early Payoff Interest Cashback</Text>
                                </View>
                                <Text className="text-[11px] text-teal-800 leading-relaxed mt-1">
                                    This loan qualifies for interest cashback upon full early settlement (e.g. GCash GLoan). Settle your remaining
                                    debt ahead of maturity to receive a refund on unearned interest.
                                </Text>
                            </View>
                        ) : null}

                        {/* Attachment preview if present */}
                        {loan.attachment_path ? (
                            <View className="bg-white p-4 rounded-2xl border border-stone-200/80 mb-3">
                                <Text className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Loan Document Attachment</Text>
                                <Pressable
                                    onPress={handleOpenAttachment}
                                    hitSlop={8}
                                    pressRetentionOffset={20}
                                    className="flex-row items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-200 active:bg-stone-100"
                                >
                                    <View className="flex-row items-center flex-1 mr-2">
                                        <Paperclip size={16} color="#18342B" />
                                        <Text className="text-xs font-semibold text-stone-800 ml-2" numberOfLines={1}>
                                            {loan.attachment_name || 'View Loan Document'}
                                        </Text>
                                    </View>
                                    <Text className="text-xs font-bold text-[#18342B]">Open</Text>
                                </Pressable>
                            </View>
                        ) : null}

                        {/* Notes if present */}
                        {loan.notes ? (
                            <View className="bg-white p-4 rounded-2xl border border-stone-200/80 mb-3">
                                <Text className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Notes</Text>
                                <Text className="text-xs text-stone-600 leading-relaxed">{loan.notes}</Text>
                            </View>
                        ) : null}

                        {/* Actions */}
                        <View className="mt-2 space-y-3 pb-8">
                            {!isPaid && (
                                <Pressable
                                    onPress={() => onRecordPayment(loan, suggestedPaymentAmount)}
                                    hitSlop={8}
                                    pressRetentionOffset={20}
                                    className="bg-[#18342B] py-3.5 rounded-2xl items-center active:opacity-90"
                                >
                                    <Text className="text-white font-bold text-sm">
                                        Record Loan Payment ({formatCurrency(suggestedPaymentAmount)}
                                        {schedule?.activeInstallment?.status === 'partially_paid' ? ' Due' : ''})
                                    </Text>
                                </Pressable>
                            )}

                            {onEdit && (
                                <Pressable
                                    onPress={() => {
                                        onClose();
                                        onEdit(loan);
                                    }}
                                    hitSlop={8}
                                    pressRetentionOffset={20}
                                    className="bg-stone-100 py-3.5 rounded-2xl items-center active:bg-stone-200 border border-stone-200/80 flex-row justify-center mt-2"
                                >
                                    <Pencil size={15} color="#18342B" />
                                    <Text className="text-stone-900 font-bold text-xs ml-1.5">Edit Details</Text>
                                </Pressable>
                            )}

                            <Pressable
                                onPress={handleDelete}
                                disabled={deleting}
                                hitSlop={8}
                                pressRetentionOffset={20}
                                className="py-3 items-center active:opacity-70 flex-row justify-center mt-1"
                            >
                                <Trash2 size={15} color="#DC2626" />
                                <Text className="text-xs font-bold text-red-600 ml-1.5">{deleting ? 'Deleting...' : 'Delete Loan'}</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
