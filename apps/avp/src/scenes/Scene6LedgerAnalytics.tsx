import React from 'react';
import { KineticHeader } from '../components/KineticHeader';
import { PhoneFrame } from '../components/PhoneFrame';
import { FloatingCalloutCard } from '../components/FloatingCalloutCard';
import { BrandLogo } from '../components/BrandLogos';
import { COLORS } from '../constants/theme';

export const Scene6LedgerAnalytics: React.FC = () => {
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <KineticHeader
                badge="LEDGER & ANALYTICS"
                title="Visual Cashflow & Net Worth."
                accentWord="Net Worth."
                subtitle="Atomic inter-pocket transfers & interactive income breakdown charts"
                delay={0}
            />

            <PhoneFrame screenFile="09-analytics.png" activeTab="analytics" zoom={1.0} panY={0} delay={4} />

            {/* Atomic Transfer Callout */}
            <FloatingCalloutCard delay={12} x={80} y={960} width={720} badge="ATOMIC INTER-POCKET TRANSFER">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>Savings Allocation</span>
                        <span style={{ fontSize: 24, fontWeight: 900, color: '#FFF' }}>₱10,000.00</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <BrandLogo code="bpi" size={36} />
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#FFF' }}>BPI Payroll</div>
                                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)' }}>Source Pocket</div>
                            </div>
                        </div>

                        <span style={{ fontSize: 22, color: COLORS.primary, fontWeight: 900 }}>➔</span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <BrandLogo code="maya" size={36} />
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#FFF' }}>Maya Savings</div>
                                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)' }}>Target 4.5% p.a.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </FloatingCalloutCard>

            {/* Visual Income Breakdown Chart Callout */}
            <FloatingCalloutCard delay={45} x={100} y={1300} width={680} badge="INCOME BREAKDOWN CHART">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#FFF' }}>Gross vs. Deductions vs. Net</span>
                        <span style={{ fontSize: 18, fontWeight: 900, color: COLORS.primary }}>81% Take-Home</span>
                    </div>

                    {/* Stacked Visual Bar */}
                    <div style={{ width: '100%', height: 16, borderRadius: 8, overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: '81%', height: '100%', background: COLORS.primary }} />
                        <div style={{ width: '19%', height: '100%', background: COLORS.destructive }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
                        <span style={{ color: COLORS.primary, fontWeight: 700 }}>● Net Pay: ₱36,350.00</span>
                        <span style={{ color: COLORS.destructive, fontWeight: 700 }}>● Tax & Statutory: -₱8,650.00</span>
                    </div>
                </div>
            </FloatingCalloutCard>
        </div>
    );
};
