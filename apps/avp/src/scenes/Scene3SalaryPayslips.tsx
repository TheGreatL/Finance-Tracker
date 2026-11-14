import React from 'react';
import { KineticHeader } from '../components/KineticHeader';
import { PhoneFrame } from '../components/PhoneFrame';
import { FloatingCalloutCard } from '../components/FloatingCalloutCard';
import { BrandLogo } from '../components/BrandLogos';
import { COLORS } from '../constants/theme';

export const Scene3SalaryPayslips: React.FC = () => {
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <KineticHeader
                badge="MULTI-JOB SALARY & PAYROLL"
                title="Multi-Job Payroll & Auto-Payslips."
                accentWord="Auto-Payslips."
                subtitle="Track multiple jobs, overtime additions, statutory deductions & receipts"
                delay={0}
            />

            <PhoneFrame screenFile="05-obligations-salary.png" activeTab="obligations" zoom={1.0} panY={0} delay={4} />

            {/* Attendance & Gross-to-Net Payday Modal Callout */}
            <FloatingCalloutCard delay={12} x={80} y={960} width={720} badge="PAYDAY ATTENDANCE ADJUSTMENT">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <BrandLogo code="bpi" size={36} />
                            <div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>Senior Software Engineer</div>
                                <div style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.65)' }}>Tech Corp • Semi-Monthly</div>
                            </div>
                        </div>
                        <span style={{ fontSize: 18, color: COLORS.primary, fontWeight: 700 }}>Base: ₱45,000.00</span>
                    </div>

                    {/* Adjustments row */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <div
                            style={{
                                flex: 1,
                                background: 'rgba(187, 213, 131, 0.12)',
                                border: `1px solid ${COLORS.primary}`,
                                padding: '10px 14px',
                                borderRadius: 14
                            }}
                        >
                            <span style={{ fontSize: 13, color: COLORS.primary, fontWeight: 700 }}>+ Overtime Pay</span>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>+₱3,500.00</div>
                        </div>

                        <div
                            style={{
                                flex: 1,
                                background: 'rgba(187, 213, 131, 0.12)',
                                border: `1px solid ${COLORS.primary}`,
                                padding: '10px 14px',
                                borderRadius: 14
                            }}
                        >
                            <span style={{ fontSize: 13, color: COLORS.primary, fontWeight: 700 }}>+ Holiday Pay</span>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>+₱2,000.00</div>
                        </div>
                    </div>

                    {/* Statutory snapshot pill */}
                    <div
                        style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            padding: '10px 16px',
                            borderRadius: 14,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <span style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.75)' }}>SSS, PhilHealth, Pag-IBIG & Withholding Tax</span>
                        <span style={{ fontSize: 18, color: COLORS.destructive, fontWeight: 800 }}>-₱8,650.00</span>
                    </div>
                </div>
            </FloatingCalloutCard>

            {/* Generated Itemized Payslip Callout */}
            <FloatingCalloutCard delay={50} x={110} y={1320} width={660} badge="ITEMIZED PAYSLIP RECEIPT">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.65)' }}>Net Deposited to BPI Checking</span>
                        <span style={{ fontSize: 32, fontWeight: 900, color: COLORS.primary }}>₱41,850.00</span>
                    </div>
                    <div
                        style={{
                            background: 'rgba(187, 213, 131, 0.2)',
                            border: `1.5px solid ${COLORS.primary}`,
                            color: COLORS.primary,
                            padding: '8px 18px',
                            borderRadius: 14,
                            fontWeight: 800,
                            fontSize: 16
                        }}
                    >
                        ✓ AUTO-CREDITED
                    </div>
                </div>
            </FloatingCalloutCard>
        </div>
    );
};
