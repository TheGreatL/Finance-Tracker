import React, { useState } from 'react';
import { Modal, View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { X, Calendar, Wallet, PauseCircle, PlayCircle, XCircle, Trash2, Edit3, Bell } from 'lucide-react-native';
import type { SubscriptionRecord } from '../../types/database';
import { normalizeToMonthlyAmount } from '../../services/subscriptionService';
import { formatCurrency, formatDisplayDate } from '../../utils/formatters';
import { SubscriptionLogo } from './SubscriptionLogo';

interface SubscriptionDetailSheetProps {
    visible: boolean;
    subscription: SubscriptionRecord | null;
    onClose: () => void;
    onEdit: (sub: SubscriptionRecord) => void;
    onTogglePause: (sub: SubscriptionRecord) => Promise<void>;
    onCancelSubscription: (sub: SubscriptionRecord) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export function SubscriptionDetailSheet({
    visible,
    subscription,
    onClose,
    onEdit,
    onTogglePause,
    onCancelSubscription,
    onDelete
}: SubscriptionDetailSheetProps) {
    const [busy, setBusy] = useState(false);

    if (!subscription) return null;

    const isActive = subscription.status === 'active';
    const isPaused = subscription.status === 'paused';
    const isCancelled = subscription.status === 'cancelled';

    const monthlyEquivalent = normalizeToMonthlyAmount(subscription.amount, subscription.frequency);

    const pocketLabel = subscription.institution_name
        ? `${subscription.institution_name} • ${subscription.pocket_name || 'Wallet'}`
        : subscription.pocket_name || 'Selected Pocket';

    const handleTogglePause = async () => {
        try {
            setBusy(true);
            await onTogglePause(subscription);
        } finally {
            setBusy(false);
        }
    };

    const handleCancelSubscription = () => {
        Alert.alert('Cancel Subscription', `Mark "${subscription.service_name}" as cancelled? Future automatic deductions and reminders will stop.`, [
            { text: 'Keep Active', style: 'cancel' },
            {
                text: 'Cancel Subscription',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setBusy(true);
                        await onCancelSubscription(subscription);
                    } finally {
                        setBusy(false);
                    }
                }
            }
        ]);
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Subscription',
            `Remove "${subscription.service_name}" from your subscriptions list? Past recorded expenses in your ledger will be kept.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setBusy(true);
                            await onDelete(subscription.id);
                            onClose();
                        } finally {
                            setBusy(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-stone-50 rounded-t-3xl max-h-[88%] border-t border-stone-100">
                    {/* Header */}
                    <View className="bg-white px-6 pt-5 pb-4 rounded-t-3xl border-b border-stone-200/80">
                        <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row items-center flex-1 mr-3">
                                <SubscriptionLogo
                                    code={subscription.service_code}
                                    serviceName={subscription.service_name}
                                    size={44}
                                    className="mr-3"
                                />
                                <View className="flex-1">
                                    <Text className="text-lg font-bold text-stone-900" numberOfLines={1}>
                                        {subscription.service_name}
                                    </Text>
                                    <Text className="text-xs text-stone-500 font-medium">
                                        {subscription.category} • {subscription.frequency.charAt(0).toUpperCase() + subscription.frequency.slice(1)}{' '}
                                        Billing
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

                        {/* Cost Summary Box */}
                        <View className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/60 flex-row items-center justify-between">
                            <View>
                                <Text className="text-xs font-semibold uppercase tracking-wider text-[#18342B]">Billing Cycle Cost</Text>
                                <Text className="text-2xl font-bold text-stone-900 tracking-tight mt-0.5">
                                    {formatCurrency(subscription.amount)}
                                    <Text className="text-xs font-semibold text-stone-500"> /{subscription.frequency}</Text>
                                </Text>
                            </View>

                            <View className="items-end">
                                <Text className="text-[10px] text-stone-500 font-medium">Monthly Equivalent</Text>
                                <Text className="text-sm font-bold text-[#18342B]">{formatCurrency(monthlyEquivalent)}/mo</Text>
                                <View
                                    className={`px-2 py-0.5 rounded-full mt-1 ${
                                        isActive ? 'bg-emerald-100' : isPaused ? 'bg-amber-100' : 'bg-stone-200'
                                    }`}
                                >
                                    <Text
                                        className={`text-[10px] font-bold uppercase ${
                                            isActive ? 'text-emerald-800' : isPaused ? 'text-amber-800' : 'text-stone-600'
                                        }`}
                                    >
                                        {subscription.status}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <ScrollView className="p-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* Schedule & Payment Account Card */}
                        <View className="bg-white p-4 rounded-2xl border border-stone-200/80 mb-3">
                            <Text className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Auto-Deduction & Schedule</Text>

                            <View className="flex-row items-center justify-between mb-2.5">
                                <Text className="text-xs text-stone-500">Payment Source</Text>
                                <View className="flex-row items-center">
                                    <Wallet size={13} color="#18342B" />
                                    <Text className="text-xs font-bold text-stone-900 ml-1.5">{pocketLabel}</Text>
                                </View>
                            </View>

                            <View className="flex-row items-center justify-between mb-2.5">
                                <Text className="text-xs text-stone-500">Next Billing Date</Text>
                                <View className="flex-row items-center">
                                    <Calendar size={13} color="#18342B" />
                                    <Text className="text-xs font-bold text-stone-900 ml-1.5">
                                        {formatDisplayDate(subscription.next_billing_date)} ({subscription.next_billing_date})
                                    </Text>
                                </View>
                            </View>

                            <View className="flex-row items-center justify-between mb-2.5">
                                <Text className="text-xs text-stone-500">Start Date</Text>
                                <Text className="text-xs font-semibold text-stone-700">{formatDisplayDate(subscription.start_date)}</Text>
                            </View>

                            <View className="flex-row items-center justify-between pt-2 border-t border-stone-100">
                                <Text className="text-xs text-stone-500">Reminder Alert</Text>
                                <View className="flex-row items-center">
                                    <Bell size={12} color="#57534E" />
                                    <Text className="text-xs font-semibold text-stone-700 ml-1">
                                        {subscription.reminder_days_before || 1} day before due date
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {subscription.notes ? (
                            <View className="bg-white p-4 rounded-2xl border border-stone-200/80 mb-3">
                                <Text className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Notes</Text>
                                <Text className="text-xs text-stone-600 leading-relaxed">{subscription.notes}</Text>
                            </View>
                        ) : null}

                        {/* Lifecycle Management Actions */}
                        <View className="mt-2 pb-8">
                            <Pressable
                                onPress={() => onEdit(subscription)}
                                disabled={busy}
                                className="bg-[#18342B] py-3.5 rounded-2xl flex-row items-center justify-center active:opacity-90 mb-2.5"
                            >
                                <Edit3 size={15} color="#FFFFFF" />
                                <Text className="text-white font-bold text-sm ml-2">Edit Subscription</Text>
                            </Pressable>

                            <View className="flex-row gap-2.5 mb-2.5">
                                <Pressable
                                    onPress={handleTogglePause}
                                    disabled={busy}
                                    className="flex-1 bg-amber-50 border border-amber-200 py-3 rounded-2xl flex-row items-center justify-center active:bg-amber-100"
                                >
                                    {isActive ? (
                                        <>
                                            <PauseCircle size={15} color="#B45309" />
                                            <Text className="text-xs font-bold text-amber-900 ml-1.5">Pause</Text>
                                        </>
                                    ) : (
                                        <>
                                            <PlayCircle size={15} color="#18342B" />
                                            <Text className="text-xs font-bold text-[#18342B] ml-1.5">Resume</Text>
                                        </>
                                    )}
                                </Pressable>

                                {!isCancelled && (
                                    <Pressable
                                        onPress={handleCancelSubscription}
                                        disabled={busy}
                                        className="flex-1 bg-stone-100 border border-stone-200 py-3 rounded-2xl flex-row items-center justify-center active:bg-stone-200"
                                    >
                                        <XCircle size={15} color="#57534E" />
                                        <Text className="text-xs font-bold text-stone-700 ml-1.5">Cancel Sub</Text>
                                    </Pressable>
                                )}
                            </View>

                            <Pressable
                                onPress={handleDelete}
                                disabled={busy}
                                className="py-3 items-center justify-center flex-row mt-1 active:opacity-70"
                            >
                                <Trash2 size={15} color="#DC2626" />
                                <Text className="text-xs font-bold text-red-600 ml-1.5">Delete Subscription</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
