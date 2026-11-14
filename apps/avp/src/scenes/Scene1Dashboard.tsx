import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticHeader } from '../components/KineticHeader';
import { PhoneFrame } from '../components/PhoneFrame';
import { FloatingCalloutCard } from '../components/FloatingCalloutCard';
import { BrandLogo } from '../components/BrandLogos';
import { COLORS } from '../constants/theme';
import { computeSpringProgress, formatPesoAnimated } from '../utils/motion';

export const Scene1Dashboard: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Balance count-up animation over 30 frames starting at frame 8
    const countProgress = computeSpringProgress(frame, fps, 8, 16, 90);
    const heroBalance = formatPesoAnimated(197041, countProgress);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Header in TikTok Upper Safe Zone */}
            <KineticHeader
                badge="DASHBOARD HERO"
                title="Track Every Peso. 100% Offline."
                accentWord="100% Offline."
                subtitle="Live net worth, dual cashflow tracking & quick ledger logging"
                delay={0}
            />

            {/* Central Phone Frame with Real Emulator Capture */}
            <PhoneFrame screenFile="01-dashboard.png" activeTab="dashboard" zoom={1.0} panY={0} delay={4} />

            {/* Magnified Hero Balance Card Callout */}
            <FloatingCalloutCard delay={8} x={80} y={980} width={720} badge="REAL-TIME CASHFLOW">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>Total Net Worth • This Month</span>
                        <span
                            style={{
                                fontSize: 16,
                                color: COLORS.primary,
                                background: 'rgba(187, 213, 131, 0.15)',
                                padding: '4px 12px',
                                borderRadius: 12,
                                fontWeight: 700
                            }}
                        >
                            ● ACTIVE
                        </span>
                    </div>

                    <div style={{ fontSize: 56, fontWeight: 900, color: '#FFFFFF', letterSpacing: -1 }}>{heroBalance}</div>

                    <div style={{ display: 'flex', gap: 14 }}>
                        <div
                            style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.08)',
                                padding: '12px 18px',
                                borderRadius: 18,
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <span style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.65)', fontWeight: 600 }}>Income</span>
                            <span style={{ fontSize: 24, color: COLORS.primary, fontWeight: 800 }}>+₱16,930.00</span>
                        </div>

                        <div
                            style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.08)',
                                padding: '12px 18px',
                                borderRadius: 18,
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <span style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.65)', fontWeight: 600 }}>Expenses</span>
                            <span style={{ fontSize: 24, color: COLORS.destructive, fontWeight: 800 }}>-₱8,603.00</span>
                        </div>
                    </div>
                </div>
            </FloatingCalloutCard>

            {/* Quick Micro Transaction Callout */}
            <FloatingCalloutCard delay={28} x={120} y={1340} width={640} badge="ATOMIC BALANCE UPDATE">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <BrandLogo code="maya" size={48} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 22, fontWeight: 800, color: '#FFF' }}>Whole Foods Market</span>
                            <span style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.65)' }}>Maya Main Wallet • Groceries</span>
                        </div>
                    </div>
                    <span style={{ fontSize: 24, fontWeight: 900, color: COLORS.destructive }}>-₱1,850.50</span>
                </div>
            </FloatingCalloutCard>
        </div>
    );
};
