export const AVP_CONFIG = {
    width: 1080,
    height: 1920,
    fps: 30,
    durationInFrames: 1050,
    durationSeconds: 35
} as const;

export const TIKTOK_SAFE_ZONE = {
    top: 180,
    right: 130,
    bottom: 360,
    left: 48,
    maxRightX: 950, // 1080 - 130
    maxBottomY: 1560 // 1920 - 360
} as const;

export const COLORS = {
    bgDark: '#0E1B16',
    secondary: '#18342B',
    primary: '#BBD583',
    surface: '#F9FAF7',
    card: '#FFFFFF',
    muted: '#EBF0E6',
    mutedText: '#5C6E63',
    expense: '#C2410C',
    destructive: '#D97757',
    accent: '#E5EFD0',
    border: '#E0E7DC'
} as const;

export function clampCalloutBounds(x: number, y: number, width: number, height: number): { x: number; y: number } {
    const minX = TIKTOK_SAFE_ZONE.left;
    const maxX = Math.max(minX, TIKTOK_SAFE_ZONE.maxRightX - width);
    const minY = TIKTOK_SAFE_ZONE.top;
    const maxY = Math.max(minY, TIKTOK_SAFE_ZONE.maxBottomY - height);

    return {
        x: Math.min(Math.max(x, minX), maxX),
        y: Math.min(Math.max(y, minY), maxY)
    };
}
