import React from 'react';
import { KineticHeader } from '../components/KineticHeader';
import { PhoneFrame } from '../components/PhoneFrame';
import { FloatingCalloutCard } from '../components/FloatingCalloutCard';
import { BrandLogo, BrandCode } from '../components/BrandLogos';
import { COLORS } from '../constants/theme';

export const Scene2AccountsPockets: React.FC = () => {
    const brands: BrandCode[] = ['bpi', 'bdo', 'maya', 'gcash', 'gotyme', 'seabank'];

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <KineticHeader
                badge="ACCOUNTS & POCKETS"
                title="All Your PH Banks & E-Wallets."
                accentWord="Banks & E-Wallets."
                subtitle="Separate everyday spending wallets from high-yield savings pockets"
                delay={0}
            />

            <PhoneFrame screenFile="03-accounts.png" activeTab="accounts" zoom={1.0} panY={0} delay={4} />

            {/* PH Institution Grid Callout */}
            <FloatingCalloutCard delay={12} x={80} y={960} width={720} badge="OFFICIAL PRESETS & LOGOS">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.75)', fontWeight: 600 }}>
                        Supported Philippine Financial Institutions
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        {brands.map((b) => (
                            <div
                                key={b}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    padding: '10px 14px',
                                    borderRadius: 16
                                }}
                            >
                                <BrandLogo code={b} size={36} />
                                <span style={{ fontSize: 18, fontWeight: 700, color: '#FFF', textTransform: 'capitalize' }}>{b}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </FloatingCalloutCard>

            {/* High-Yield Savings Pocket Detail Sheet Callout */}
            <FloatingCalloutCard delay={50} x={100} y={1300} width={680} badge="NESTED HIGH-YIELD POCKETS">
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
                            <span style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.65)' }}>Wallet Pocket</span>
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
        </div>
    );
};
