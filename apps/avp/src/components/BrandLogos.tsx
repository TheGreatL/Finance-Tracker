import React from 'react';

export type BrandCode = 'bpi' | 'bdo' | 'maya' | 'gcash' | 'gotyme' | 'seabank' | 'netflix' | 'spotify' | 'youtube' | 'chatgpt';

interface BrandLogoProps {
    code: BrandCode;
    size?: number;
    className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ code, size = 32, className = '' }) => {
    switch (code) {
        case 'bpi':
            return (
                <div
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 4,
                        background: '#991B1E',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontWeight: 900,
                        fontSize: size * 0.42,
                        letterSpacing: -0.5
                    }}
                    className={className}
                >
                    BPI
                </div>
            );
        case 'bdo':
            return (
                <div
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 4,
                        background: '#002B66',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#F4B400',
                        fontWeight: 900,
                        fontSize: size * 0.42,
                        letterSpacing: -0.5
                    }}
                    className={className}
                >
                    BDO
                </div>
            );
        case 'maya':
            return (
                <div
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 4,
                        background: '#1F2937',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#22C55E',
                        fontWeight: 900,
                        fontSize: size * 0.38,
                        letterSpacing: -0.5
                    }}
                    className={className}
                >
                    maya
                </div>
            );
        case 'gcash':
            return (
                <div
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 4,
                        background: '#005CE6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontWeight: 900,
                        fontSize: size * 0.36,
                        letterSpacing: -0.5
                    }}
                    className={className}
                >
                    GCash
                </div>
            );
        case 'gotyme':
            return (
                <div
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 4,
                        background: '#0D9488',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontWeight: 900,
                        fontSize: size * 0.36,
                        letterSpacing: -0.5
                    }}
                    className={className}
                >
                    GoTyme
                </div>
            );
        case 'seabank':
            return (
                <div
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 4,
                        background: '#EA580C',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontWeight: 900,
                        fontSize: size * 0.34,
                        letterSpacing: -0.5
                    }}
                    className={className}
                >
                    SeaBank
                </div>
            );
        case 'netflix':
            return (
                <div
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 4,
                        background: '#000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#E50914',
                        fontWeight: 900,
                        fontSize: size * 0.6
                    }}
                    className={className}
                >
                    N
                </div>
            );
        case 'spotify':
            return (
                <div
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        background: '#1DB954',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000',
                        fontWeight: 900,
                        fontSize: size * 0.5
                    }}
                    className={className}
                >
                    ≈
                </div>
            );
        case 'youtube':
            return (
                <div
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 3,
                        background: '#FF0000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontWeight: 900,
                        fontSize: size * 0.4
                    }}
                    className={className}
                >
                    ▶
                </div>
            );
        case 'chatgpt':
            return (
                <div
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        background: '#10A37F',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontWeight: 900,
                        fontSize: size * 0.45
                    }}
                    className={className}
                >
                    ✱
                </div>
            );
    }
};
