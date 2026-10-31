import React, { useState, useMemo } from 'react';
import { Modal, View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { X, Bell, Check, CheckCheck, Trash2, Calendar, Wallet, AlertTriangle, Info } from 'lucide-react-native';
import type { AppNotificationRecord } from '../../services/notificationCenterService';

interface NotificationCenterModalProps {
    visible: boolean;
    notifications: AppNotificationRecord[];
    onClose: () => void;
    onMarkAsRead: (id: string) => Promise<void>;
    onMarkAllAsRead: () => Promise<void>;
    onClearAll: () => Promise<void>;
}

export function NotificationCenterModal({
    visible,
    notifications,
    onClose,
    onMarkAsRead,
    onMarkAllAsRead,
    onClearAll
}: NotificationCenterModalProps) {
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [actionLoading, setActionLoading] = useState(false);

    const unreadCount = useMemo(() => notifications.filter((n) => n.is_read === 0).length, [notifications]);

    const displayedNotifications = useMemo(() => {
        if (filter === 'unread') {
            return notifications.filter((n) => n.is_read === 0);
        }
        return notifications;
    }, [notifications, filter]);

    const handleClearAll = () => {
        if (notifications.length === 0) return;
        Alert.alert('Clear Notifications', 'Are you sure you want to delete all notification history?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear All',
                style: 'destructive',
                onPress: async () => {
                    setActionLoading(true);
                    try {
                        await onClearAll();
                    } finally {
                        setActionLoading(false);
                    }
                }
            }
        ]);
    };

    const handleMarkAllAsRead = async () => {
        setActionLoading(true);
        try {
            await onMarkAllAsRead();
        } finally {
            setActionLoading(false);
        }
    };

    const formatTimestamp = (isoDate: string) => {
        try {
            const d = new Date(isoDate);
            const now = new Date();
            const diffMs = now.getTime() - d.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

            if (diffMins < 2) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;

            return d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return isoDate;
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white rounded-t-3xl p-6 max-h-[85%] border-t border-stone-100 flex-1">
                    {/* Header */}
                    <View className="flex-row items-center justify-between pb-3 border-b border-stone-100">
                        <View className="flex-row items-center">
                            <View className="w-9 h-9 rounded-full bg-[#BBD583]/40 items-center justify-center mr-2.5">
                                <Bell size={18} color="#18342B" />
                            </View>
                            <View>
                                <View className="flex-row items-center">
                                    <Text className="text-lg font-bold text-stone-900">Notifications</Text>
                                    {unreadCount > 0 && (
                                        <View className="bg-red-500 rounded-full px-2 py-0.5 ml-2">
                                            <Text className="text-[10px] font-bold text-white">{unreadCount} new</Text>
                                        </View>
                                    )}
                                </View>
                                <Text className="text-xs text-stone-500">Billing reminders & payment alerts</Text>
                            </View>
                        </View>

                        <Pressable
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close notifications"
                            hitSlop={8}
                            pressRetentionOffset={20}
                            className="w-8 h-8 rounded-full bg-stone-100 items-center justify-center active:bg-stone-200"
                        >
                            <X size={18} color="#78716C" />
                        </Pressable>
                    </View>

                    {/* Filter Tabs & Quick Actions */}
                    <View className="flex-row items-center justify-between my-3">
                        <View className="flex-row bg-stone-100 p-1 rounded-xl">
                            <Pressable
                                onPress={() => setFilter('all')}
                                className={`px-3 py-1.5 rounded-lg ${filter === 'all' ? 'bg-white shadow-xs' : ''}`}
                            >
                                <Text className={`text-xs font-semibold ${filter === 'all' ? 'text-stone-900' : 'text-stone-500'}`}>
                                    All ({notifications.length})
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setFilter('unread')}
                                className={`px-3 py-1.5 rounded-lg ${filter === 'unread' ? 'bg-white shadow-xs' : ''}`}
                            >
                                <Text className={`text-xs font-semibold ${filter === 'unread' ? 'text-stone-900' : 'text-stone-500'}`}>
                                    Unread ({unreadCount})
                                </Text>
                            </Pressable>
                        </View>

                        {unreadCount > 0 && (
                            <Pressable
                                onPress={handleMarkAllAsRead}
                                disabled={actionLoading}
                                className="flex-row items-center px-2.5 py-1.5 rounded-xl bg-stone-100 active:bg-stone-200"
                            >
                                <CheckCheck size={14} color="#18342B" />
                                <Text className="text-xs font-bold text-[#18342B] ml-1">Mark all read</Text>
                            </Pressable>
                        )}
                    </View>

                    {/* Notifications List */}
                    <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingBottom: 16 }}>
                        {displayedNotifications.length === 0 ? (
                            <View className="items-center justify-center py-12">
                                <View className="w-14 h-14 rounded-full bg-stone-100 items-center justify-center mb-3">
                                    <Bell size={24} color="#A8A29E" />
                                </View>
                                <Text className="text-sm font-bold text-stone-800">No Notifications</Text>
                                <Text className="text-xs text-stone-500 text-center mt-1 max-w-[240px]">
                                    {filter === 'unread'
                                        ? "You've read all your notifications!"
                                        : "You're all caught up! Upcoming bills, loans, and auto-payments will appear here."}
                                </Text>
                            </View>
                        ) : (
                            displayedNotifications.map((item) => {
                                const isUnread = item.is_read === 0;

                                let IconComponent = Info;
                                let iconBg = 'bg-stone-100';
                                let iconColor = '#57534E';

                                if (item.type === 'subscription_due') {
                                    IconComponent = Calendar;
                                    iconBg = 'bg-amber-100/70';
                                    iconColor = '#D97706';
                                } else if (item.type === 'subscription_paid') {
                                    IconComponent = Wallet;
                                    iconBg = 'bg-emerald-100/80';
                                    iconColor = '#059669';
                                } else if (item.type === 'loan_due') {
                                    IconComponent = AlertTriangle;
                                    iconBg = 'bg-rose-100/70';
                                    iconColor = '#E11D48';
                                }

                                return (
                                    <Pressable
                                        key={item.id}
                                        onPress={() => isUnread && onMarkAsRead(item.id)}
                                        className={`p-3.5 rounded-2xl mb-2.5 border flex-row items-start ${
                                            isUnread ? 'bg-emerald-50/40 border-emerald-200' : 'bg-stone-50/70 border-stone-200/80'
                                        }`}
                                    >
                                        <View className={`w-9 h-9 rounded-xl ${iconBg} items-center justify-center mr-3 mt-0.5`}>
                                            <IconComponent size={18} color={iconColor} />
                                        </View>

                                        <View className="flex-1 mr-2">
                                            <View className="flex-row items-center justify-between">
                                                <Text className={`text-xs font-bold ${isUnread ? 'text-stone-900' : 'text-stone-700'}`}>
                                                    {item.title}
                                                </Text>
                                                {isUnread && <View className="w-2 h-2 rounded-full bg-emerald-600 ml-1" />}
                                            </View>
                                            <Text className="text-xs text-stone-600 mt-1 leading-relaxed">{item.body}</Text>
                                            <Text className="text-[10px] text-stone-400 mt-1.5 font-medium">{formatTimestamp(item.created_at)}</Text>
                                        </View>
                                    </Pressable>
                                );
                            })
                        )}
                    </ScrollView>

                    {/* Footer Actions */}
                    {notifications.length > 0 && (
                        <View className="pt-3 border-t border-stone-100 flex-row justify-end">
                            <Pressable
                                onPress={handleClearAll}
                                disabled={actionLoading}
                                className="flex-row items-center px-3 py-2 rounded-xl active:bg-stone-100"
                            >
                                <Trash2 size={14} color="#78716C" />
                                <Text className="text-xs font-semibold text-stone-600 ml-1.5">Clear All History</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}
