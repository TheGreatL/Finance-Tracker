import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Briefcase, ChevronRight, Calendar } from 'lucide-react-native';
import { formatCurrency, formatDisplayDate } from '../../utils/formatters';

interface UpcomingPaydayBannerProps {
    nextPayday?: {
        jobId: string;
        jobTitle: string;
        companyName: string;
        payDate: string;
        netAmount: number;
        pocketName: string;
        daysRemaining: number;
    };
    onPress?: () => void;
    className?: string;
}

export function UpcomingPaydayBanner({ nextPayday, onPress, className = '' }: UpcomingPaydayBannerProps) {
    if (!nextPayday) return null;

    const dueBadge =
        nextPayday.daysRemaining === 0 ? 'Payday Today' : nextPayday.daysRemaining === 1 ? 'Tomorrow' : `In ${nextPayday.daysRemaining}d`;

    return (
        <View className={`px-5 mb-4 ${className}`}>
            <Pressable
                onPress={onPress}
                className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/50 bg-emerald-50/90 dark:bg-emerald-950/30 p-3.5 shadow-xs active:opacity-90"
            >
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                        <View className="w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 items-center justify-center">
                            <Briefcase size={18} color="#FFFFFF" />
                        </View>
                        <View className="flex-1">
                            <View className="flex-row items-center gap-1.5">
                                <Text className="text-xs font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                                    {nextPayday.companyName} • {nextPayday.jobTitle}
                                </Text>
                            </View>
                            <Text className="text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold mt-0.5">
                                Expected Net: {formatCurrency(nextPayday.netAmount)}
                                <Text className="text-[10px] text-slate-500 font-normal"> to {nextPayday.pocketName}</Text>
                            </Text>
                        </View>
                    </View>

                    <View className="items-end gap-1">
                        <View className="rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5">
                            <Text className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">{dueBadge}</Text>
                        </View>
                        <View className="flex-row items-center gap-0.5">
                            <Calendar size={10} className="text-slate-400" />
                            <Text className="text-[10px] text-slate-500 font-medium">{formatDisplayDate(nextPayday.payDate)}</Text>
                            <ChevronRight size={12} className="text-slate-400" />
                        </View>
                    </View>
                </View>
            </Pressable>
        </View>
    );
}
