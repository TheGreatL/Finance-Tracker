import React from 'react';
import { KineticHeader } from '../components/KineticHeader';
import { PhoneFrame } from '../components/PhoneFrame';
import { FloatingCalloutCard } from '../components/FloatingCalloutCard';
import { BrandLogo } from '../components/BrandLogos';
import { COLORS } from '../constants/theme';

export const Scene7LoansCashback: React.FC = () => {
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <KineticHeader
                badge="LOANS & UTANG"
                title="Crush Debt & Claim Cashback."
                accentWord="Claim Cashback."
                subtitle="Track installments, spot utang & early settlement interest rebates"
                delay={0}
            />

            <PhoneFrame screenFile="06-obligations-loans.png" activeTab="obligations" zoom={1.0} panY={0} delay={4} />

            {/* Loan Card Callout */}
            <FloatingCalloutCard delay={8} x={80} y={960} width={720} badge="ACTIVE LOAN TRACKER">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <BrandLogo code="gcash" size={40} />
                            <div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: '#FFF' }}>GCash GLoan Cash Loan</div>
                                <div style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.7)' }}>₱1,550.00 / mo • 50% Repaid</div>
                            </div>
                        </div>
                        <span
                            style={{
                                fontSize: 14,
                                color: COLORS.primary,
                                background: 'rgba(187, 213, 131, 0.15)',
                                padding: '4px 12px',
                                borderRadius: 12,
                                fontWeight: 700
                            }}
                        >
                            ON SCHEDULE
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }}>Remaining Debt</span>
                        <span style={{ fontSize: 32, fontWeight: 900, color: '#FFF' }}>₱9,300.00</span>
                    </div>
                </div>
            </FloatingCalloutCard>

            {/* Early Settlement Interest Cashback Alert Callout */}
            <FloatingCalloutCard delay={28} x={100} y={1300} width={680} badge="EARLY PAYOFF REBATE">
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
                                fontSize: 22
                            }}
                        >
                            🎁
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>₱680.00 Interest Cashback</span>
                            <span style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.65)' }}>Eligible for full settlement</span>
                        </div>
                    </div>
                    <span
                        style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: COLORS.primary,
                            background: 'rgba(187, 213, 131, 0.15)',
                            padding: '6px 14px',
                            borderRadius: 12
                        }}
                    >
                        CLAIM BONUS
                    </span>
                </div>
            </FloatingCalloutCard>
        </div>
    );
};
