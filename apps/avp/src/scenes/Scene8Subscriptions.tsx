import React from 'react';
import { KineticHeader } from '../components/KineticHeader';
import { PhoneFrame } from '../components/PhoneFrame';
import { FloatingCalloutCard } from '../components/FloatingCalloutCard';
import { BrandLogo } from '../components/BrandLogos';
import { COLORS } from '../constants/theme';

export const Scene8Subscriptions: React.FC = () => {
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <KineticHeader
                badge="RECURRING BILLS"
                title="Never Miss a Renewal."
                accentWord="Renewal."
                subtitle="Auto-debit catch-up, billing cycles & offline payment reminders"
                delay={0}
            />

            <PhoneFrame screenFile="07-obligations-subscriptions.png" activeTab="obligations" zoom={1.0} panY={0} delay={4} />

            {/* Netflix & Spotify Subscription Callout */}
            <FloatingCalloutCard delay={8} x={80} y={960} width={720} badge="ACTIVE RECURRING SERVICES">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.08)',
                            padding: '10px 14px',
                            borderRadius: 16
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <BrandLogo code="netflix" size={36} />
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#FFF' }}>Netflix Premium</div>
                                <div style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.65)' }}>4K Family • Maya Wallet</div>
                            </div>
                        </div>
                        <span style={{ fontSize: 20, fontWeight: 900, color: '#FFF' }}>₱549.00 / mo</span>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.08)',
                            padding: '10px 14px',
                            borderRadius: 16
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <BrandLogo code="spotify" size={36} />
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#FFF' }}>Spotify Duo</div>
                                <div style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.65)' }}>Music • BDO Payroll</div>
                            </div>
                        </div>
                        <span style={{ fontSize: 20, fontWeight: 900, color: '#FFF' }}>₱239.00 / mo</span>
                    </div>
                </div>
            </FloatingCalloutCard>

            {/* Renewal Guard Banner Callout */}
            <FloatingCalloutCard delay={28} x={100} y={1300} width={680} badge="RENEWAL GUARD">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 14,
                                background: 'rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 20
                            }}
                        >
                            🔔
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>Spotify Renews in 3 Days</span>
                            <span style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.65)' }}>Auto-deduct from BDO Payroll</span>
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
                        AUTO-NOTIFY
                    </span>
                </div>
            </FloatingCalloutCard>
        </div>
    );
};
