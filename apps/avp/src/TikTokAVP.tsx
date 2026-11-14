import React from 'react';
import { Sequence, Audio, staticFile, useCurrentFrame, AbsoluteFill } from 'remotion';
import { SCENES } from './constants/timeline';
import { COLORS } from './constants/theme';
import { Scene1Dashboard } from './scenes/Scene1Dashboard';
import { Scene2SidebarPrivacy } from './scenes/Scene2SidebarPrivacy';
import { Scene3AccountsGrid } from './scenes/Scene3AccountsGrid';
import { Scene4PocketsDetail } from './scenes/Scene4PocketsDetail';
import { Scene5SalaryStreams } from './scenes/Scene5SalaryStreams';
import { Scene6StatutoryDeductions } from './scenes/Scene6StatutoryDeductions';
import { Scene7LoansCashback } from './scenes/Scene7LoansCashback';
import { Scene8Subscriptions } from './scenes/Scene8Subscriptions';
import { Scene9LedgerTransfers } from './scenes/Scene9LedgerTransfers';
import { Scene10AdvisorOutro } from './scenes/Scene10AdvisorOutro';

export const TikTokAVP: React.FC = () => {
    const frame = useCurrentFrame();
    const progressPercent = Math.min((frame / 1800) * 100, 100);

    return (
        <AbsoluteFill
            style={{
                width: 1080,
                height: 1920,
                backgroundColor: COLORS.bgDark,
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {/* Background Ambient Glow Gradients */}
            <div
                style={{
                    position: 'absolute',
                    top: -100,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 900,
                    height: 600,
                    borderRadius: 450,
                    background: 'radial-gradient(circle, rgba(187, 213, 131, 0.12) 0%, rgba(14, 27, 22, 0) 70%)',
                    pointerEvents: 'none'
                }}
            />

            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    right: -100,
                    width: 800,
                    height: 800,
                    borderRadius: 400,
                    background: 'radial-gradient(circle, rgba(24, 52, 43, 0.45) 0%, rgba(14, 27, 22, 0) 70%)',
                    pointerEvents: 'none'
                }}
            />

            {/* Top Video Progress Bar (TikTok Upper Edge) */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: 6,
                    background: 'rgba(255, 255, 255, 0.08)',
                    zIndex: 100
                }}
            >
                <div
                    style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: COLORS.primary,
                        boxShadow: `0 0 12px ${COLORS.primary}`
                    }}
                />
            </div>

            {/* Master Audio Track (60.0s Synthesized Soundtrack + Tactile SFX) */}
            <Audio src={staticFile('audio/soundtrack.wav')} />

            {/* Scene 1: Dashboard (0:00 - 0:06 | frames 0 - 179) */}
            <Sequence from={SCENES[0].startFrame} durationInFrames={SCENES[0].durationInFrames}>
                <Scene1Dashboard />
            </Sequence>

            {/* Scene 2: Sidebar Privacy (0:06 - 0:12 | frames 180 - 359) */}
            <Sequence from={SCENES[1].startFrame} durationInFrames={SCENES[1].durationInFrames}>
                <Scene2SidebarPrivacy />
            </Sequence>

            {/* Scene 3: Philippine Accounts Grid (0:12 - 0:18 | frames 360 - 539) */}
            <Sequence from={SCENES[2].startFrame} durationInFrames={SCENES[2].durationInFrames}>
                <Scene3AccountsGrid />
            </Sequence>

            {/* Scene 4: High-Yield Pockets Detail (0:18 - 0:24 | frames 540 - 719) */}
            <Sequence from={SCENES[3].startFrame} durationInFrames={SCENES[3].durationInFrames}>
                <Scene4PocketsDetail />
            </Sequence>

            {/* Scene 5: Multi-Job Salary Streams (0:24 - 0:30 | frames 720 - 899) */}
            <Sequence from={SCENES[4].startFrame} durationInFrames={SCENES[4].durationInFrames}>
                <Scene5SalaryStreams />
            </Sequence>

            {/* Scene 6: Statutory Deductions (0:30 - 0:36 | frames 900 - 1079) */}
            <Sequence from={SCENES[5].startFrame} durationInFrames={SCENES[5].durationInFrames}>
                <Scene6StatutoryDeductions />
            </Sequence>

            {/* Scene 7: Loans & Cashback (0:36 - 0:42 | frames 1080 - 1259) */}
            <Sequence from={SCENES[6].startFrame} durationInFrames={SCENES[6].durationInFrames}>
                <Scene7LoansCashback />
            </Sequence>

            {/* Scene 8: Subscriptions & Renewal (0:42 - 0:48 | frames 1260 - 1439) */}
            <Sequence from={SCENES[7].startFrame} durationInFrames={SCENES[7].durationInFrames}>
                <Scene8Subscriptions />
            </Sequence>

            {/* Scene 9: Atomic Inter-Pocket Transfers (0:48 - 0:54 | frames 1440 - 1619) */}
            <Sequence from={SCENES[8].startFrame} durationInFrames={SCENES[8].durationInFrames}>
                <Scene9LedgerTransfers />
            </Sequence>

            {/* Scene 10: PocketBot Advisor & Outro (0:54 - 1:00 | frames 1620 - 1799) */}
            <Sequence from={SCENES[9].startFrame} durationInFrames={SCENES[9].durationInFrames}>
                <Scene10AdvisorOutro />
            </Sequence>
        </AbsoluteFill>
    );
};
