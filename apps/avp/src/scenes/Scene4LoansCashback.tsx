import React from 'react';
import { KineticHeader } from '../components/KineticHeader';
import { PhoneFrame } from '../components/PhoneFrame';
import { FloatingCalloutCard } from '../components/FloatingCalloutCard';
import { BrandLogo } from '../components/BrandLogos';
import { COLORS } from '../constants/theme';

export const Scene4LoansCashback: React.FC = () => {
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <KineticHeader
                badge="LOANS & DEBT MANAGEMENT"
                title="Crush Debt & Claim Cashback."
                accentWord="Claim Cashback."
                subtitle="Track institutional & P2P loans, elapsed tenors & early payoff rebates"
                delay={0}
            />

            <PhoneFrame screenFile="06-obligations-loans.png" activeTab="obligations" zoom={1.0} panY={0} delay={4} />

            {/* Dual Progress Loan Card Callout */}
            <FloatingCalloutCard delay={12} x={80} y={960} width={720} badge="DUAL PROGRESS TRACKING">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <BrandLogo code="gcash" size={40} />
                            <div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: '#FFF' }}>GCash GLoan (Gadget Loan)</div>
                                <div style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.65)' }}>₱2,083.33 / mo • Due in 5 days</div>
                            </div>
                        </div>
                        <span style={{ fontSize: 24, fontWeight: 900, color: '#FFF' }}>₱8,333.00</span>
                    </div>

                    {/* Monetary Progress Bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, color: 'rgba(255, 255, 255, 0.7)' }}>
                            <span>Repayment Progress</span>
                            <span style={{ color: COLORS.primary, fontWeight: 700 }}>67% Repaid</span>
                        </div>
                        <div style={{ width: '100%', height: 10, background: 'rgba(255, 255, 255, 0.12)', borderRadius: 5, overflow: 'hidden' }}>
                            <div style={{ width: '67%', height: '100%', background: COLORS.primary, borderRadius: 5 }} />
                        </div>
                    </div>

                    {/* Tenor Elapsed Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.65)' }}>Tenor Elapsed</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#FFF' }}>8 / 12 Months (4 Remaining)</span>
                    </div>
                </div>
            </FloatingCalloutCard>

            {/* Early Payoff Interest Cashback Callout */}
            <FloatingCalloutCard delay={50} x={100} y={1300} width={680} badge="EARLY PAYOFF INTEREST CASHBACK">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.65)' }}>GLoan Interest Rebate Credited</span>
                        <span style={{ fontSize: 32, fontWeight: 900, color: COLORS.primary }}>+₱1,250.00 Cashback</span>
                    </div>
                    <div
                        style={{
                            background: 'rgba(34, 197, 94, 0.2)',
                            border: '1.5px solid #22C55E',
                            color: '#22C55E',
                            padding: '8px 18px',
                            borderRadius: 14,
                            fontWeight: 800,
                            fontSize: 16
                        }}
                    >
                        ✓ CLAIMED
                    </div>
                </div>
            </FloatingCalloutCard>
        </div>
    );
};
