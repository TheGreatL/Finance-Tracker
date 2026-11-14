import React from 'react';
import { KineticHeader } from '../components/KineticHeader';
import { PhoneFrame } from '../components/PhoneFrame';
import { FloatingCalloutCard } from '../components/FloatingCalloutCard';
import { BrandLogo, BrandCode } from '../components/BrandLogos';
import { COLORS } from '../constants/theme';

export const Scene3AccountsGrid: React.FC = () => {
    const brands: BrandCode[] = ['bpi', 'bdo', 'maya', 'gcash', 'gotyme', 'seabank'];

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <KineticHeader
                badge="ACCOUNTS & INSTITUTIONS"
                title="All Your PH Banks & Wallets."
                accentWord="Banks & Wallets."
                subtitle="Native presets for every major Philippine digital bank & e-wallet"
                delay={0}
            />

            <PhoneFrame screenFile="03-accounts.png" activeTab="accounts" zoom={1.0} panY={0} delay={4} />

            {/* PH Institution Grid Callout */}
            <FloatingCalloutCard delay={8} x={80} y={960} width={720} badge="OFFICIAL PRESETS & LOGOS">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.75)', fontWeight: 600 }}>
                        Supported Philippine Financial Institutions
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                        {brands.map((b) => (
                            <div
                                key={b}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    padding: '8px 12px',
                                    borderRadius: 14
                                }}
                            >
                                <BrandLogo code={b} size={32} />
                                <span style={{ fontSize: 16, fontWeight: 700, color: '#FFF', textTransform: 'capitalize' }}>{b}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </FloatingCalloutCard>

            {/* Total Liquid Assets Summary Card */}
            <FloatingCalloutCard delay={28} x={100} y={1300} width={680} badge="LIQUID ASSET TRACKER">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.65)', fontWeight: 600 }}>Total Liquid Balance</span>
                        <span style={{ fontSize: 32, fontWeight: 900, color: '#FFF' }}>₱197,041.00</span>
                    </div>
                    <div
                        style={{
                            background: 'rgba(187, 213, 131, 0.15)',
                            border: `1px solid ${COLORS.primary}`,
                            padding: '8px 16px',
                            borderRadius: 14,
                            textAlign: 'right'
                        }}
                    >
                        <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.primary }}>6 Accounts</div>
                        <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.75)' }}>7 Active Pockets</div>
                    </div>
                </div>
            </FloatingCalloutCard>
        </div>
    );
};
