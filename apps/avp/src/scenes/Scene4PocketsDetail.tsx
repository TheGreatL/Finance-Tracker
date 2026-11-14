import React from 'react';
import { KineticHeader } from '../components/KineticHeader';
import { PhoneFrame } from '../components/PhoneFrame';
import { FloatingCalloutCard } from '../components/FloatingCalloutCard';
import { BrandLogo } from '../components/BrandLogos';
import { COLORS } from '../constants/theme';

export const Scene4PocketsDetail: React.FC = () => {
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <KineticHeader
                badge="SMART SAVINGS"
                title="Nested High-Yield Pockets."
                accentWord="High-Yield Pockets."
                subtitle="Separate everyday spending wallets from 4.5% p.a. savings pockets"
                delay={0}
            />

            <PhoneFrame screenFile="04-institution-detail.png" activeTab="accounts" zoom={1.0} panY={0} delay={4} />

            {/* High-Yield Savings Pocket Detail Sheet Callout */}
            <FloatingCalloutCard delay={8} x={80} y={960} width={720} badge="NESTED HIGH-YIELD POCKETS">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <BrandLogo code="maya" size={44} />
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#FFF' }}>Maya Savings Account</div>
                            <div style={{ fontSize: 16, color: COLORS.primary, fontWeight: 600 }}>4.5% p.a. • Credited Daily</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <div
                            style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.08)',
                                padding: '12px 16px',
                                borderRadius: 16
                            }}
                        >
                            <span style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.65)' }}>Everyday Wallet</span>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#FFF' }}>₱2,500.00</div>
                        </div>

                        <div
                            style={{
                                flex: 1,
                                background: 'rgba(187, 213, 131, 0.15)',
                                border: `1px solid ${COLORS.primary}`,
                                padding: '12px 16px',
                                borderRadius: 16
                            }}
                        >
                            <span style={{ fontSize: 14, color: COLORS.primary, fontWeight: 700 }}>Personal Savings</span>
                            <div style={{ fontSize: 22, fontWeight: 900, color: '#FFF' }}>₱50,000.00</div>
                        </div>
                    </div>
                </div>
            </FloatingCalloutCard>

            {/* Daily Crediting Badge Callout */}
            <FloatingCalloutCard delay={28} x={100} y={1300} width={680} badge="INTEREST GAINS">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 14,
                                background: 'rgba(187, 213, 131, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 20
                            }}
                        >
                            📈
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>Daily Passive Yield</span>
                            <span style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.65)' }}>Tax-Optimized Projections</span>
                        </div>
                    </div>
                    <span
                        style={{
                            fontSize: 18,
                            fontWeight: 900,
                            color: COLORS.primary,
                            background: 'rgba(187, 213, 131, 0.15)',
                            padding: '6px 14px',
                            borderRadius: 12
                        }}
                    >
                        +₱6.16 / day
                    </span>
                </div>
            </FloatingCalloutCard>
        </div>
    );
};
