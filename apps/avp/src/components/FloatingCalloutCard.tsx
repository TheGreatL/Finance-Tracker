import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS, clampCalloutBounds } from '../constants/theme';
import { computeSpringProgress } from '../utils/motion';

interface FloatingCalloutCardProps {
    delay?: number;
    x: number;
    y: number;
    width: number;
    badge?: string;
    badgeColor?: string;
    children: React.ReactNode;
}

export const FloatingCalloutCard: React.FC<FloatingCalloutCardProps> = ({
    delay = 10,
    x,
    y,
    width,
    badge,
    badgeColor = COLORS.primary,
    children
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const progress = computeSpringProgress(frame, fps, delay, 12, 110);
    const opacity = interpolate(progress, [0, 1], [0, 1]);
    const scale = interpolate(progress, [0, 1], [0.82, 1]);
    const translateY = interpolate(progress, [0, 1], [30, 0]);

    // Guarantee inside TikTok safe zones
    const pos = clampCalloutBounds(x, y, width, 320);

    return (
        <div
            style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width,
                opacity,
                transform: `translateY(${translateY}px) scale(${scale})`,
                transformOrigin: 'center center',
                background: 'rgba(20, 37, 31, 0.94)',
                border: '2px solid rgba(187, 213, 131, 0.35)',
                borderRadius: 28,
                padding: '24px 28px',
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.75), 0 0 30px rgba(187, 213, 131, 0.15)',
                backdropFilter: 'blur(16px)',
                zIndex: 60,
                color: '#FFF',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
        >
            {badge && (
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 14px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: `1px solid ${badgeColor}`,
                        borderRadius: 999,
                        marginBottom: 14
                    }}
                >
                    <span
                        style={{
                            color: badgeColor,
                            fontSize: 15,
                            fontWeight: 800,
                            letterSpacing: 1,
                            textTransform: 'uppercase'
                        }}
                    >
                        {badge}
                    </span>
                </div>
            )}
            {children}
        </div>
    );
};
