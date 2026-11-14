import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS } from '../constants/theme';
import { computeSpringProgress } from '../utils/motion';

interface KineticHeaderProps {
    badge: string;
    title: string;
    subtitle: string;
    accentWord?: string;
    delay?: number;
}

export const KineticHeader: React.FC<KineticHeaderProps> = ({ badge, title, subtitle, accentWord, delay = 0 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const badgeSpring = computeSpringProgress(frame, fps, delay);
    const titleSpring = computeSpringProgress(frame, fps, delay + 4);
    const subSpring = computeSpringProgress(frame, fps, delay + 8);

    const badgeOpacity = interpolate(badgeSpring, [0, 1], [0, 1]);
    const badgeScale = interpolate(badgeSpring, [0, 1], [0.85, 1]);

    const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
    const titleY = interpolate(titleSpring, [0, 1], [24, 0]);

    const subOpacity = interpolate(subSpring, [0, 1], [0, 1]);
    const subY = interpolate(subSpring, [0, 1], [18, 0]);

    // Format title if accentWord provided
    const renderTitle = () => {
        if (!accentWord || !title.includes(accentWord)) {
            return <span>{title}</span>;
        }
        const parts = title.split(accentWord);
        return (
            <span>
                {parts[0]}
                <span style={{ color: COLORS.primary }}>{accentWord}</span>
                {parts[1]}
            </span>
        );
    };

    return (
        <div
            style={{
                position: 'absolute',
                top: 180,
                left: 48,
                right: 48,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                zIndex: 40
            }}
        >
            {/* Badge Pill */}
            <div
                style={{
                    opacity: badgeOpacity,
                    transform: `scale(${badgeScale})`,
                    transformOrigin: 'left center',
                    background: 'rgba(187, 213, 131, 0.18)',
                    border: `1.5px solid ${COLORS.primary}`,
                    borderRadius: 999,
                    padding: '8px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 16
                }}
            >
                <div
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        background: COLORS.primary
                    }}
                />
                <span
                    style={{
                        color: COLORS.primary,
                        fontSize: 20,
                        fontWeight: 800,
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}
                >
                    {badge}
                </span>
            </div>

            {/* Kinetic Title */}
            <h1
                style={{
                    opacity: titleOpacity,
                    transform: `translateY(${titleY}px)`,
                    color: '#FFFFFF',
                    fontSize: 54,
                    fontWeight: 900,
                    lineHeight: 1.12,
                    letterSpacing: -1.2,
                    margin: 0,
                    marginBottom: 12,
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
            >
                {renderTitle()}
            </h1>

            {/* Subtitle */}
            <p
                style={{
                    opacity: subOpacity,
                    transform: `translateY(${subY}px)`,
                    color: 'rgba(235, 240, 230, 0.78)',
                    fontSize: 26,
                    fontWeight: 500,
                    lineHeight: 1.35,
                    margin: 0,
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
            >
                {subtitle}
            </p>
        </div>
    );
};
