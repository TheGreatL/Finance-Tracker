import React from 'react';
import { KineticHeader } from '../components/KineticHeader';
import { PhoneFrame } from '../components/PhoneFrame';
import { FloatingCalloutCard } from '../components/FloatingCalloutCard';
import { BrandLogo } from '../components/BrandLogos';
import { COLORS } from '../constants/theme';

export const Scene5Subscriptions: React.FC = () => {
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <KineticHeader
                badge="RECURRING SUBSCRIPTIONS"
                title="Never Miss a Renewal."
                accentWord="Renewal."
                subtitle="Normalized monthly spend, offline auto-deduction & smart reminders"
                delay={0}
            />

            <PhoneFrame screenFile="07-obligations-subscriptions.png" activeTab="obligations" zoom={1.0} panY={0} delay={4} />

            {/* Active Subscriptions Callout */}
            <FloatingCalloutCard delay={12} x={80} y={960} width={720} badge="MONTHLY SPEND BURDEN">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.75)', fontWeight: 600 }}>Active Recurring Services</span>
                        <span style={{ fontSize: 24, fontWeight: 900, color: '#FFF' }}>₱1,847.00 / mo</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'rgba(255, 255, 255, 0.06)',
                                padding: '10px 14px',
                                borderRadius: 14
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <BrandLogo code="netflix" size={32} />
                                <span style={{ fontSize: 18, fontWeight: 700, color: '#FFF' }}>Netflix Standard</span>
                            </div>
                            <span style={{ fontSize: 18, fontWeight: 800, color: '#FFF' }}>₱549.00</span>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'rgba(255, 255, 255, 0.06)',
                                padding: '10px 14px',
                                borderRadius: 14
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <BrandLogo code="spotify" size={32} />
                                <span style={{ fontSize: 18, fontWeight: 700, color: '#FFF' }}>Spotify Family</span>
                            </div>
                            <span style={{ fontSize: 18, fontWeight: 800, color: '#FFF' }}>₱149.00</span>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'rgba(255, 255, 255, 0.06)',
                                padding: '10px 14px',
                                borderRadius: 14
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <BrandLogo code="chatgpt" size={32} />
                                <span style={{ fontSize: 18, fontWeight: 700, color: '#FFF' }}>ChatGPT Plus</span>
                            </div>
                            <span style={{ fontSize: 18, fontWeight: 800, color: '#FFF' }}>₱1,149.00</span>
                        </div>
                    </div>
                </div>
            </FloatingCalloutCard>

            {/* Offline Auto-Deduction Notification Center Alert Callout */}
            <FloatingCalloutCard delay={45} x={100} y={1340} width={680} badge="OFFLINE AUTO-DEDUCTION">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            background: 'rgba(187, 213, 131, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 22
                        }}
                    >
                        🔔
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#FFF' }}>Auto-Deducted from Maya Wallet</span>
                        <span style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.7)' }}>Netflix ₱549.00 logged to Ledger • Next due Dec 14</span>
                    </div>
                </div>
            </FloatingCalloutCard>
        </div>
    );
};
