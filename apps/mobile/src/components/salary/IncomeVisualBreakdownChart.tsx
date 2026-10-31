import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { formatCurrency } from '../../utils/formatters';
import type { CategorizedDeductions } from '../../services/salaryService';

interface IncomeVisualBreakdownChartProps {
    monthlyGross: number;
    monthlyNetTakeHome: number;
    deductionBreakdown: CategorizedDeductions;
}

export function IncomeVisualBreakdownChart({ monthlyGross, monthlyNetTakeHome, deductionBreakdown }: IncomeVisualBreakdownChartProps) {
    const segments = useMemo(() => {
        if (monthlyGross <= 0) return [];

        const netPct = Math.max(0, Math.min(100, (monthlyNetTakeHome / monthlyGross) * 100));
        const taxPct = Math.max(0, Math.min(100, (deductionBreakdown.tax / monthlyGross) * 100));
        const statPct = Math.max(0, Math.min(100, (deductionBreakdown.statutory / monthlyGross) * 100));
        const workPct = Math.max(0, Math.min(100, ((deductionBreakdown.workplace + deductionBreakdown.other) / monthlyGross) * 100));

        return [
            {
                id: 'net',
                label: 'Take-Home Pay',
                amount: monthlyNetTakeHome,
                pct: netPct,
                color: '#10B981', // Emerald
                bgClass: 'bg-emerald-500'
            },
            {
                id: 'tax',
                label: 'Income Taxes',
                amount: deductionBreakdown.tax,
                pct: taxPct,
                color: '#F43F5E', // Rose
                bgClass: 'bg-rose-500'
            },
            {
                id: 'statutory',
                label: 'Statutory (SSS/PhilHealth/HDMF)',
                amount: deductionBreakdown.statutory,
                pct: statPct,
                color: '#F59E0B', // Amber
                bgClass: 'bg-amber-500'
            },
            {
                id: 'workplace',
                label: 'Workplace & Other',
                amount: deductionBreakdown.workplace + deductionBreakdown.other,
                pct: workPct,
                color: '#6366F1', // Indigo
                bgClass: 'bg-indigo-500'
            }
        ].filter((s) => s.amount > 0);
    }, [monthlyGross, monthlyNetTakeHome, deductionBreakdown]);

    if (monthlyGross <= 0 || segments.length === 0) {
        return null;
    }

    return (
        <View className="mb-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-2.5">
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Monthly Gross Distribution</Text>
                <Text className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(monthlyGross)}/mo</Text>
            </View>

            {/* Multi-segment horizontal progress bar */}
            <View className="h-4 w-full flex-row overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 mb-3.5">
                {segments.map((seg) => (
                    <View key={seg.id} style={{ width: `${Math.max(2, seg.pct)}%` }} className={`h-full ${seg.bgClass}`} />
                ))}
            </View>

            {/* Distribution Legend Grid */}
            <View className="flex-row flex-wrap gap-y-2.5">
                {segments.map((seg) => (
                    <View key={seg.id} className="w-1/2 pr-2">
                        <View className="flex-row items-center gap-1.5 mb-0.5">
                            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                            <Text className="text-[11px] font-medium text-slate-600 dark:text-slate-400" numberOfLines={1}>
                                {seg.label}
                            </Text>
                        </View>
                        <View className="flex-row items-baseline gap-1 pl-4">
                            <Text className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(seg.amount)}</Text>
                            <Text className="text-[10px] text-slate-400 font-semibold">({seg.pct.toFixed(1)}%)</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}
