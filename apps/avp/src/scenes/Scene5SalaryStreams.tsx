import React from 'react';
import { KineticHeader } from '../components/KineticHeader';
import { PhoneFrame } from '../components/PhoneFrame';
import { FloatingCalloutCard } from '../components/FloatingCalloutCard';
import { COLORS } from '../constants/theme';

export const Scene5SalaryStreams: React.FC = () => {
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <KineticHeader
                badge="SALARY & JOBS"
                title="Multi-Job Payroll Tracking."
                accentWord="Payroll Tracking."
                subtitle="Manage multiple jobs, cutoff dates & automated take-home math"
                delay={0}
            />

            <PhoneFrame screenFile="05-obligations-salary.png" activeTab="obligations" zoom={1.0} panY={0} delay={4} />

            {/* Job Stream Hero Card Callout */}
            <FloatingCalloutCard delay={8} x={80} y={960} width={720} badge="ACTIVE INCOME STREAM">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#FFF' }}>Principal Software Engineer</div>
                            <div style={{ fontSize: 16, color: COLORS.primary, fontWeight: 600 }}>BGC Tech Solutions • Semi-Monthly</div>
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
                            PRIMARY
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }}>Net Take-Home Pay</span>
                        <span style={{ fontSize: 32, fontWeight: 900, color: '#FFF' }}>₱31,400.00</span>
                    </div>
                </div>
            </FloatingCalloutCard>

            {/* Payday Countdown Callout */}
            <FloatingCalloutCard delay={28} x={100} y={1300} width={680} badge="PAYDAY COUNTDOWN">
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
                            📅
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>15th Mid-Month Cutoff</span>
                            <span style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.65)' }}>Direct Auto-Deposit Scheduled</span>
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
                        PAYDAY TOMORROW
                    </span>
                </div>
            </FloatingCalloutCard>
        </div>
    );
};
