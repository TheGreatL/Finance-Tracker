import React from 'react';
import { KineticHeader } from '../components/KineticHeader';
import { PhoneFrame } from '../components/PhoneFrame';
import { FloatingCalloutCard } from '../components/FloatingCalloutCard';
import { COLORS } from '../constants/theme';

export const Scene6StatutoryDeductions: React.FC = () => {
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <KineticHeader
                badge="STATUTORY DEDUCTIONS"
                title="Automated Tax & Mandates."
                accentWord="Tax & Mandates."
                subtitle="Computed SSS, PhilHealth, Pag-IBIG & withholding tax per cutoff"
                delay={0}
            />

            <PhoneFrame screenFile="05-obligations-salary.png" activeTab="obligations" zoom={1.0} panY={0} delay={4} />

            {/* Deductions Breakdown Card */}
            <FloatingCalloutCard delay={8} x={80} y={960} width={720} badge="PAYROLL DEDUCTIONS BREAKDOWN">
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
                        <span style={{ color: COLORS.destructive, fontWeight: 700 }}>● Deductions: -₱8,650.00</span>
                    </div>
                </div>
            </FloatingCalloutCard>

            {/* Statutory Agency Badges */}
            <FloatingCalloutCard delay={28} x={100} y={1300} width={680} badge="GOVERNMENT MANDATES">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>Automatic Withholding & Contribution Slips</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {['SSS Contribution', 'PhilHealth', 'Pag-IBIG / HDMF', 'BIR Tax'].map((agency) => (
                            <div
                                key={agency}
                                style={{
                                    flex: 1,
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    padding: '8px 10px',
                                    borderRadius: 12,
                                    textAlign: 'center',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: '#FFF'
                                }}
                            >
                                {agency}
                            </div>
                        ))}
                    </div>
                </div>
            </FloatingCalloutCard>
        </div>
    );
};
