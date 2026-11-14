import React from 'react';
import { KineticHeader } from '../components/KineticHeader';
import { PhoneFrame } from '../components/PhoneFrame';
import { FloatingCalloutCard } from '../components/FloatingCalloutCard';
import { BrandLogo } from '../components/BrandLogos';
import { COLORS } from '../constants/theme';

export const Scene9LedgerTransfers: React.FC = () => {
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <KineticHeader
                badge="TRANSACTION LEDGER"
                title="Atomic Inter-Pocket Transfers."
                accentWord="Atomic Transfers."
                subtitle="Instant reallocations between payroll & high-yield savings"
                delay={0}
            />

            <PhoneFrame screenFile="09-analytics.png" activeTab="ledger" zoom={1.0} panY={0} delay={4} />

            {/* Atomic Transfer Callout */}
            <FloatingCalloutCard delay={8} x={80} y={960} width={720} badge="ATOMIC INTER-POCKET TRANSFER">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>Savings Allocation</span>
                        <span style={{ fontSize: 28, fontWeight: 900, color: '#FFF' }}>₱5,000.00</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <BrandLogo code="bdo" size={36} />
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#FFF' }}>BDO Payroll</div>
                                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)' }}>Source Pocket</div>
                            </div>
                        </div>

                        <span style={{ fontSize: 22, color: COLORS.primary, fontWeight: 900 }}>➔</span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <BrandLogo code="seabank" size={36} />
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#FFF' }}>SeaBank High-Yield</div>
                                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)' }}>4.5% p.a. Savings</div>
                            </div>
                        </div>
                    </div>
                </div>
            </FloatingCalloutCard>

            {/* Reversible Transaction Audit Card */}
            <FloatingCalloutCard delay={28} x={100} y={1300} width={680} badge="LEDGER AUDIT TRAIL">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
                            ⚡
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>Zero Fee InstaPay Movement</span>
                            <span style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.65)' }}>1-Tap Reversible Balance Entry</span>
                        </div>
                    </div>
                    <span
                        style={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: COLORS.primary,
                            background: 'rgba(187, 213, 131, 0.15)',
                            padding: '6px 14px',
                            borderRadius: 12
                        }}
                    >
                        AUDITED
                    </span>
                </div>
            </FloatingCalloutCard>
        </div>
    );
};
