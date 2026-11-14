import React from 'react';
import { staticFile, Img, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { computeSpringProgress } from '../utils/motion';

interface PhoneFrameProps {
    screenFile: string;
    activeTab?: string;
    zoom?: number;
    panY?: number;
    delay?: number;
    overlayChildren?: React.ReactNode;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ screenFile, zoom = 1.0, panY = 0, delay = 0, overlayChildren }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const entrySpring = computeSpringProgress(frame, fps, delay, 15, 100);
    const scale = interpolate(entrySpring, [0, 1], [0.92, zoom]);
    const opacity = interpolate(entrySpring, [0, 1], [0, 1]);
    const translateY = interpolate(entrySpring, [0, 1], [40, panY]);

    return (
        <div
            style={{
                position: 'absolute',
                top: 450,
                left: 120,
                width: 840,
                height: 1240,
                opacity,
                transform: `translateY(${translateY}px) scale(${scale})`,
                transformOrigin: 'top center',
                zIndex: 20
            }}
        >
            {/* Phone Bezel */}
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    borderRadius: 54,
                    background: '#1A2923',
                    padding: 14,
                    boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.85), 0 0 50px rgba(187, 213, 131, 0.18), inset 0 0 0 3px rgba(255, 255, 255, 0.12)'
                }}
            >
                {/* Screen Glass Container */}
                <div
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        borderRadius: 42,
                        overflow: 'hidden',
                        background: '#0E1B16'
                    }}
                >
                    {/* Punch Hole Camera */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 14,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            background: '#000000',
                            zIndex: 50,
                            boxShadow: 'inset 0 0 3px rgba(255, 255, 255, 0.3)'
                        }}
                    />

                    {/* Captured Real Emulator Screen */}
                    <Img
                        src={staticFile(`screens/${screenFile}`)}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'top center'
                        }}
                    />

                    {/* Subtle Glass Reflection Overlay */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 45%)',
                            pointerEvents: 'none'
                        }}
                    />
                </div>
            </div>

            {/* Overlays / Callouts */}
            {overlayChildren}
        </div>
    );
};
