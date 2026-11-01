import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Wallet, PiggyBank } from 'lucide-react-native';
import { InstitutionLogo } from './InstitutionLogo';
import type { PocketType } from '../../types/database';

export interface PocketBadgeProps {
    institutionCode?: string | null;
    pocketType?: PocketType;
    size?: number;
    className?: string;
    style?: StyleProp<ViewStyle>;
}

export function PocketBadge({ institutionCode, pocketType = 'wallet', size = 20, className = '', style }: PocketBadgeProps) {
    if (institutionCode) {
        return <InstitutionLogo code={institutionCode} size={size} className={className} style={style} />;
    }

    const isSavings = pocketType === 'savings';
    const Icon = isSavings ? PiggyBank : Wallet;
    const iconSize = Math.max(10, Math.round(size * 0.6));
    const borderRadius = Math.round(size * 0.28);

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
                    backgroundColor: isSavings ? '#D1FAE5' : '#E7E5E4'
                },
                style
            ]}
        >
            <Icon size={iconSize} color={isSavings ? '#059669' : '#57534E'} strokeWidth={2.2} />
        </View>
    );
}
