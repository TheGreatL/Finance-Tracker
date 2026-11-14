import React from 'react';
import { KineticHeader } from '../components/KineticHeader';
import { PhoneFrame } from '../components/PhoneFrame';
import { FloatingCalloutCard } from '../components/FloatingCalloutCard';
import { COLORS } from '../constants/theme';

export const Scene2SidebarPrivacy: React.FC = () => {
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <KineticHeader
                badge="SECURE ARCHITECTURE"
                title="100% On-Device Privacy."
                accentWord="On-Device Privacy."
                subtitle="Encrypted local SQLite storage • Zero account linking required"
                delay={0}
            />

            <PhoneFrame screenFile="02-sidebar.png" activeTab="dashboard" zoom={1.0} panY={0} delay={4} />

            {/* Local SQLite Engine Callout */}
            <FloatingCalloutCard delay={8} x={80} y={960} width={720} badge="OFFLINE-FIRST ENGINE">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                                fontSize: 22
                            }}
                        >
                            🛡️
                        </div>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#FFF' }}>Local SQLite Active & Encrypted</div>
                            <div style={{ fontSize: 16, color: COLORS.primary, fontWeight: 600 }}>Bank Credentials Never Leave Your Device</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <div
                            style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.08)',
                                padding: '10px 14px',
                                borderRadius: 14,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            <span style={{ fontSize: 16 }}>🔒</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFF' }}>Zero Cloud Leaks</span>
                        </div>
                        <div
                            style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.08)',
                                padding: '10px 14px',
                                borderRadius: 14,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            <span style={{ fontSize: 16 }}>⚡</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFF' }}>Instant Launch</span>
                        </div>
                    </div>
                </div>
            </FloatingCalloutCard>

            {/* Encrypted JSON Backup Callout */}
            <FloatingCalloutCard delay={28} x={100} y={1300} width={680} badge="PORTABLE OWNERSHIP">
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
                            📦
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>1-Click Encrypted Backups</span>
                            <span style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.65)' }}>Full SQLite Snapshot (.json)</span>
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
                        RESTORE READY
                    </span>
                </div>
            </FloatingCalloutCard>
        </div>
    );
};
