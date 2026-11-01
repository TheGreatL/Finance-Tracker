import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import {
    Utensils,
    ShoppingBag,
    Car,
    Zap,
    Home,
    HeartPulse,
    Film,
    Gamepad2,
    Cloud,
    GraduationCap,
    Briefcase,
    TrendingUp,
    Gift,
    Repeat,
    CreditCard,
    Tag,
    LucideIcon
} from 'lucide-react-native';

export interface CategoryVisualConfig {
    Icon: LucideIcon;
    color: string;
    backgroundColor: string;
}

export function getCategoryVisualConfig(category: string = '', type?: 'income' | 'expense' | 'transfer'): CategoryVisualConfig {
    if (type === 'transfer') {
        return { Icon: Repeat, color: '#57534E', backgroundColor: '#F5F5F4' };
    }

    const lower = category.toLowerCase().trim();

    if (type === 'income' || lower.includes('salary') || lower.includes('wage')) {
        return { Icon: Briefcase, color: '#18342B', backgroundColor: '#D1FAE5' };
    }
    if (lower.includes('freelance') || lower.includes('consulting')) {
        return { Icon: Briefcase, color: '#059669', backgroundColor: '#CCFBF1' };
    }
    if (lower.includes('invest')) {
        return { Icon: TrendingUp, color: '#0D9488', backgroundColor: '#CCFBF1' };
    }
    if (lower.includes('gift') || lower.includes('allowance')) {
        return { Icon: Gift, color: '#EA580C', backgroundColor: '#FFEDD5' };
    }
    if (lower.includes('dining') || lower.includes('food') || lower.includes('restaurant')) {
        return { Icon: Utensils, color: '#C2410C', backgroundColor: '#FFEDD5' };
    }
    if (lower.includes('grocer') || lower.includes('shop')) {
        return { Icon: ShoppingBag, color: '#D97706', backgroundColor: '#FEF3C7' };
    }
    if (lower.includes('transport') || lower.includes('fuel') || lower.includes('gas') || lower.includes('car')) {
        return { Icon: Car, color: '#7C3AED', backgroundColor: '#EDE9FE' };
    }
    if (lower.includes('util') || lower.includes('bill') || lower.includes('electric') || lower.includes('water')) {
        return { Icon: Zap, color: '#2563EB', backgroundColor: '#DBEAFE' };
    }
    if (lower.includes('rent') || lower.includes('housing') || lower.includes('mortgage')) {
        return { Icon: Home, color: '#475569', backgroundColor: '#F1F5F9' };
    }
    if (lower.includes('health') || lower.includes('medic') || lower.includes('fitness')) {
        return { Icon: HeartPulse, color: '#16A34A', backgroundColor: '#DCFCE7' };
    }
    if (lower.includes('game') || lower.includes('gaming')) {
        return { Icon: Gamepad2, color: '#8B5CF6', backgroundColor: '#F3E8FF' };
    }
    if (lower.includes('cloud') || lower.includes('software')) {
        return { Icon: Cloud, color: '#0284C7', backgroundColor: '#E0F2FE' };
    }
    if (lower.includes('entertain') || lower.includes('movie')) {
        return { Icon: Film, color: '#DB2777', backgroundColor: '#FCE7F3' };
    }
    if (lower.includes('edu') || lower.includes('book') || lower.includes('tuition') || lower.includes('course')) {
        return { Icon: GraduationCap, color: '#4F46E5', backgroundColor: '#EEF2FF' };
    }
    if (lower.includes('loan') || lower.includes('debt')) {
        return { Icon: CreditCard, color: '#18342B', backgroundColor: '#D1FAE5' };
    }
    if (lower.includes('subscript') || lower.includes('recurring')) {
        return { Icon: Repeat, color: '#0D9488', backgroundColor: '#CCFBF1' };
    }

    return { Icon: Tag, color: '#78716C', backgroundColor: '#F5F5F4' };
}

export interface CategoryIconProps {
    category: string;
    type?: 'income' | 'expense' | 'transfer';
    size?: number;
    showBackground?: boolean;
    className?: string;
    style?: StyleProp<ViewStyle>;
}

export function CategoryIcon({ category, type, size = 20, showBackground = true, className = '', style }: CategoryIconProps) {
    const { Icon, color, backgroundColor } = getCategoryVisualConfig(category, type);
    const iconSize = showBackground ? Math.max(10, Math.round(size * 0.58)) : size;
    const borderRadius = Math.round(size * 0.28);

    if (!showBackground) {
        return <Icon size={size} color={color} strokeWidth={2} />;
    }

    return (
        <View
            className={className}
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor
                },
                style
            ]}
        >
            <Icon size={iconSize} color={color} strokeWidth={2.2} />
        </View>
    );
}
