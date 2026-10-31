import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Dimensions, ScrollView, BackHandler, Alert, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import {
    LayoutDashboard,
    WalletCards,
    Briefcase,
    CalendarClock,
    Bot,
    ReceiptText,
    PieChart,
    Database,
    Upload,
    Bell,
    Clock,
    Sparkles,
    X,
    ShieldCheck
} from 'lucide-react-native';
import { useSidebar } from '../../context/SidebarContext';
import { SidebarItem } from './SidebarItem';
import { getDatabase } from '../../database/db';
import { exportDatabaseBackup, importDatabaseBackup, pickAndValidateBackupFile } from '../../services/databaseBackupService';

const DRAWER_MAX_WIDTH = 340;

export interface SidebarDrawerProps {
    onNotificationPress?: () => void;
    onDataChanged?: () => Promise<void>;
}

export function SidebarDrawer({ onNotificationPress, onDataChanged }: SidebarDrawerProps) {
    const insets = useSafeAreaInsets();
    const pathname = usePathname();
    const { isOpen, closeSidebar } = useSidebar();

    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const windowWidth = Dimensions.get('window').width;
    const drawerWidth = Math.min(windowWidth * 0.82, DRAWER_MAX_WIDTH);

    const animValue = useRef(new Animated.Value(0)).current;

    // Handle open/close animation
    useEffect(() => {
        if (isOpen) {
            Animated.timing(animValue, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true
            }).start();
        } else {
            Animated.timing(animValue, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true
            }).start();
        }
    }, [isOpen, animValue]);

    // Handle Android hardware back button
    useEffect(() => {
        if (!isOpen) return;

        const onBackPress = () => {
            closeSidebar();
            return true;
        };

        const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => sub.remove();
    }, [isOpen, closeSidebar]);

    if (!isOpen) {
        return null;
    }

    const backdropOpacity = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5]
    });

    const translateX = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-drawerWidth, 0]
    });

    const navigateTo = (route: string, params?: Record<string, string>) => {
        closeSidebar();
        setTimeout(() => {
            if (params) {
                router.navigate({ pathname: route as any, params });
            } else {
                router.navigate(route as any);
            }
        }, 80);
    };

    const handleExportBackup = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            const db = await getDatabase();
            const { summary } = await exportDatabaseBackup(db);
            Alert.alert(
                'Database Backup Created',
                `Successfully exported complete snapshot!\n\n` +
                    `• Accounts & Pockets: ${summary.institutionsCount} / ${summary.pocketsCount}\n` +
                    `• Transactions: ${summary.transactionsCount}\n` +
                    `• Active Loans: ${summary.loansCount}\n` +
                    `• Subscriptions: ${summary.subscriptionsCount}\n` +
                    `• Jobs & Pay Slips: ${summary.jobsCount ?? 0} / ${summary.paySlipsCount ?? 0}`
            );
        } catch (err: any) {
            Alert.alert('Export Failed', err?.message || 'Could not create database backup');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportBackup = async () => {
        if (isImporting) return;
        setIsImporting(true);
        try {
            const backup = await pickAndValidateBackupFile();
            if (!backup) {
                setIsImporting(false);
                return;
            }

            Alert.alert(
                'Confirm Database Restore',
                `Restore database from backup created on ${new Date(backup.exportedAt).toLocaleDateString()}?\n\n` +
                    `• ${backup.summary.institutionsCount} accounts\n` +
                    `• ${backup.summary.transactionsCount} transactions\n` +
                    `• ${backup.summary.loansCount} loans\n\n` +
                    `This will merge backup records into your database.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Restore Now',
                        onPress: async () => {
                            try {
                                const db = await getDatabase();
                                const result = await importDatabaseBackup(db, backup);
                                if (result.success) {
                                    Alert.alert(
                                        'Restore Complete',
                                        `Database restored successfully!\n\n` +
                                            `• Accounts: ${result.restoredCounts.institutions}\n` +
                                            `• Pockets: ${result.restoredCounts.pockets}\n` +
                                            `• Transactions: ${result.restoredCounts.transactions}\n` +
                                            `• Loans: ${result.restoredCounts.loans}`
                                    );
                                    if (onDataChanged) {
                                        await onDataChanged();
                                    }
                                } else {
                                    Alert.alert('Restore Failed', 'Could not restore backup into database.');
                                }
                            } catch (err: any) {
                                Alert.alert('Restore Failed', err?.message || 'Failed to import backup');
                            }
                        }
                    }
                ]
            );
        } catch (err: any) {
            Alert.alert('Import Failed', err?.message || 'Failed to pick or parse backup file');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Modal transparent visible={isOpen} animationType="none" onRequestClose={closeSidebar} statusBarTranslucent>
            <View className="flex-1 flex-row">
                {/* Backdrop Overlay */}
                <Animated.View
                    style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: '#000000',
                        opacity: backdropOpacity
                    }}
                >
                    <Pressable onPress={closeSidebar} style={{ flex: 1 }} accessibilityLabel="Dismiss menu" accessibilityRole="button" />
                </Animated.View>

                {/* Animated Drawer Panel */}
                <Animated.View
                    style={{
                        width: drawerWidth,
                        transform: [{ translateX }],
                        paddingTop: Math.max(insets.top, 16),
                        paddingBottom: Math.max(insets.bottom, 16)
                    }}
                    className="h-full bg-white border-r border-stone-200 shadow-2xl"
                >
                    {/* Header */}
                    <View className="px-5 pt-2 pb-4 border-b border-stone-100 flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1 mr-2">
                            <View className="w-10 h-10 rounded-2xl bg-[#18342B] items-center justify-center shadow-xs">
                                <WalletCards size={20} color="#BBD583" strokeWidth={2.4} />
                            </View>
                            <View className="ml-3 flex-1">
                                <Text className="text-base font-bold text-stone-900 tracking-tight" numberOfLines={1}>
                                    Pocket Tracker
                                </Text>
                                <View className="flex-row items-center mt-0.5">
                                    <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                                    <Text className="text-[11px] font-semibold text-emerald-700">SQLite Active</Text>
                                </View>
                            </View>
                        </View>

                        <Pressable
                            onPress={closeSidebar}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Close navigation drawer"
                            className="w-8 h-8 rounded-full bg-stone-100 items-center justify-center active:bg-stone-200"
                        >
                            <X size={16} color="#57534E" />
                        </Pressable>
                    </View>

                    {/* Scrollable Content */}
                    <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-3 pt-3">
                        {/* Section 1: Navigation Destinations */}
                        <Text className="text-[11px] font-bold text-stone-400 tracking-wider uppercase px-3.5 mb-1.5">Navigation</Text>
                        <SidebarItem
                            icon={LayoutDashboard}
                            label="Dashboard"
                            subtitle="Overview & quick actions"
                            isActive={pathname === '/' || pathname === '/index'}
                            onPress={() => navigateTo('/')}
                        />
                        <SidebarItem
                            icon={WalletCards}
                            label="Accounts & Pockets"
                            subtitle="Wallets, savings & bank pockets"
                            isActive={pathname === '/accounts'}
                            onPress={() => navigateTo('/accounts')}
                        />
                        <SidebarItem
                            icon={CalendarClock}
                            label="Obligations & Income"
                            subtitle="Loans, subscriptions & paydays"
                            isActive={pathname === '/obligations'}
                            onPress={() => navigateTo('/obligations')}
                        />
                        <SidebarItem
                            icon={Bot}
                            label="PocketBot Advisor"
                            subtitle="AI financial assistant"
                            badge="AI"
                            badgeColor="bg-[#BBD583]/40 text-[#18342B]"
                            isActive={pathname === '/assistant'}
                            onPress={() => navigateTo('/assistant')}
                        />
                        <SidebarItem
                            icon={ReceiptText}
                            label="Transactions Ledger"
                            subtitle="Historical income & expenses"
                            isActive={pathname === '/two'}
                            onPress={() => navigateTo('/two')}
                        />
                        <SidebarItem
                            icon={PieChart}
                            label="Analytics & Trends"
                            subtitle="Spending & gross income breakdown"
                            isActive={pathname === '/analytics'}
                            onPress={() => navigateTo('/analytics')}
                        />

                        {/* Section 2: Management & Utilities */}
                        <View className="mt-4 pt-3 border-t border-stone-100">
                            <Text className="text-[11px] font-bold text-stone-400 tracking-wider uppercase px-3.5 mb-1.5">Management & Tools</Text>
                            <SidebarItem
                                icon={Database}
                                label={isExporting ? 'Exporting...' : 'Export Backup'}
                                subtitle="Download encrypted snapshot"
                                badge={isExporting ? '...' : '.json'}
                                onPress={handleExportBackup}
                            />
                            <SidebarItem
                                icon={Upload}
                                label={isImporting ? 'Selecting...' : 'Restore Database'}
                                subtitle="Restore from JSON file"
                                onPress={handleImportBackup}
                            />
                            {onNotificationPress ? (
                                <SidebarItem
                                    icon={Bell}
                                    label="Notification Center"
                                    subtitle="Due dates & alerts"
                                    onPress={() => {
                                        closeSidebar();
                                        onNotificationPress();
                                    }}
                                />
                            ) : null}
                        </View>

                        {/* Section 3: Preferences & Diagnostics */}
                        <View className="mt-4 pt-3 border-t border-stone-100">
                            <Text className="text-[11px] font-bold text-stone-400 tracking-wider uppercase px-3.5 mb-1.5">System & Diagnostics</Text>
                            <SidebarItem
                                icon={Clock}
                                label="Time Format"
                                subtitle="Standard 12-hour clock"
                                badge="12-Hour"
                                badgeColor="bg-stone-100 text-stone-700"
                                onPress={() => {}}
                            />
                            <SidebarItem
                                icon={Sparkles}
                                label="AI Engine"
                                subtitle="Gemini 3.5 Flash-Lite"
                                badge="Hybrid"
                                badgeColor="bg-emerald-100 text-emerald-800"
                                onPress={() => navigateTo('/assistant')}
                            />
                            <SidebarItem
                                icon={ShieldCheck}
                                label="Storage Engine"
                                subtitle="Local SQLite on-device"
                                badge="Encrypted"
                                badgeColor="bg-sky-100 text-sky-800"
                                onPress={() => {}}
                            />
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View className="px-5 pt-3 border-t border-stone-100 flex-row items-center justify-between">
                        <Text className="text-xs text-stone-400 font-medium">Pocket Tracker v1.2.0</Text>
                        <Text className="text-[10px] text-stone-300 font-semibold">2026.10 Build</Text>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}
