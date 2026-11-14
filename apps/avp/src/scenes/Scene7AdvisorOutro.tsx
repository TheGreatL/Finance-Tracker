import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { KineticHeader } from '../components/KineticHeader';
import { PhoneFrame } from '../components/PhoneFrame';
import { FloatingCalloutCard } from '../components/FloatingCalloutCard';
import { COLORS } from '../constants/theme';
import { computeSpringProgress } from '../utils/motion';

export const Scene7AdvisorOutro: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Outro transition triggers around frame 170 (last ~4.3s of scene)
    const outroSpring = computeSpringProgress(frame, fps, 170, 16, 90);
    const outroOpacity = interpolate(outroSpring, [0, 1], [0, 1], { extrapolateRight: 'clamp' });
    const outroScale = interpolate(outroSpring, [0, 1], [0.9, 1], { extrapolateRight: 'clamp' });

    // Fade out phone frame during outro
    const phoneFade = interpolate(outroSpring, [0, 1], [1, 0.05], { extrapolateRight: 'clamp' });

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div style={{ opacity: phoneFade }}>
                <KineticHeader
                    badge="AI ADVISOR & PRIVACY"
                    title="Ask PocketBot Before You Spend."
                    accentWord="PocketBot"
                    subtitle="Taglish affordability checks & 100% On-Device SQLite privacy"
                    delay={0}
                />

                <PhoneFrame screenFile="10-advisor.png" activeTab="advisor" zoom={1.0} panY={0} delay={4} />

                {/* PocketBot Chat Q&A Callout */}
                <FloatingCalloutCard delay={12} x={80} y={960} width={720} badge="OFFLINE RULES & GEMINI ADVISOR">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* User Bubble */}
                        <div
                            style={{
                                alignSelf: 'flex-end',
                                background: 'rgba(187, 213, 131, 0.25)',
                                border: `1.5px solid ${COLORS.primary}`,
                                padding: '12px 18px',
                                borderRadius: '20px 20px 4px 20px',
                                maxWidth: '80%'
                            }}
                        >
                            <span style={{ fontSize: 20, fontWeight: 700, color: '#FFF' }}>Kaya ba bumili ng ₱15,000 phone?</span>
                        </div>

                        {/* PocketBot Answer Bubble */}
                        <div
                            style={{
                                alignSelf: 'flex-start',
                                background: 'rgba(255, 255, 255, 0.08)',
                                padding: '14px 20px',
                                borderRadius: '20px 20px 20px 4px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span
                                    style={{
                                        background: '#22C55E',
                                        color: '#0E1B16',
                                        fontSize: 14,
                                        fontWeight: 900,
                                        padding: '3px 10px',
                                        borderRadius: 8
                                    }}
                                >
                                    ✓ SAFE TO BUY
                                </span>
                                <span style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600 }}>PocketBot Verdict</span>
                            </div>
                            <span style={{ fontSize: 18, color: '#FFF', lineHeight: 1.4 }}>
                                Yes! You will have <strong style={{ color: COLORS.primary }}>₱18,400.00</strong> spendable cash left, and your{' '}
                                <strong style={{ color: COLORS.primary }}>₱50,000.00</strong> Maya emergency savings stays intact.
                            </span>
                        </div>
                    </div>
                </FloatingCalloutCard>
            </div>

            {/* Outro Brand Lockup Card - Width 800 clamped safely inside TikTok margins (X: 140 to 940 <= 950 maxRightX) */}
            {frame >= 165 && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: `translate(-50%, -50%) scale(${outroScale})`,
                        opacity: outroOpacity,
                        width: 800,
                        background: 'rgba(14, 27, 22, 0.98)',
                        border: `2px solid ${COLORS.primary}`,
                        borderRadius: 36,
                        padding: '60px 40px',
                        boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.95), 0 0 60px rgba(187, 213, 131, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        zIndex: 90,
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}
                >
                    <div
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: 24,
                            background: COLORS.primary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 42,
                            marginBottom: 24,
                            boxShadow: '0 10px 30px rgba(187, 213, 131, 0.4)'
                        }}
                    >
                        🇵🇭
                    </div>

                    <h2 style={{ fontSize: 48, fontWeight: 900, color: '#FFFFFF', margin: 0, marginBottom: 12 }}>Personal Finance Tracker</h2>

                    <p style={{ fontSize: 24, color: 'rgba(235, 240, 230, 0.8)', margin: 0, marginBottom: 36, maxWidth: 650 }}>
                        The private, all-in-one financial manager for Philippine banks, e-wallets, multi-job salaries & loans.
                    </p>

                    <div style={{ display: 'flex', gap: 14 }}>
                        <span
                            style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                color: '#FFF',
                                padding: '10px 20px',
                                borderRadius: 999,
                                fontSize: 16,
                                fontWeight: 700
                            }}
                        >
                            🔒 100% On-Device SQLite
                        </span>

                        <span
                            style={{
                                background: 'rgba(187, 213, 131, 0.15)',
                                border: `1.5px solid ${COLORS.primary}`,
                                color: COLORS.primary,
                                padding: '10px 20px',
                                borderRadius: 999,
                                fontSize: 16,
                                fontWeight: 800
                            }}
                        >
                            ⚡ Zero Cloud Sync Needed
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
