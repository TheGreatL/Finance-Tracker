import { describe, expect, it } from 'vitest';
import { AVP_CONFIG, COLORS, TIKTOK_SAFE_ZONE, clampCalloutBounds } from '../src/constants/theme';
import { SCENES } from '../src/constants/timeline';

describe('AVP timeline and TikTok safe-zone constants', () => {
    it('covers exactly 1050 contiguous frames (35.0s @ 30fps) across 10 scenes', () => {
        expect(AVP_CONFIG).toEqual({
            width: 1080,
            height: 1920,
            fps: 30,
            durationInFrames: 1050,
            durationSeconds: 35
        });
        expect(SCENES).toHaveLength(10);
        expect(SCENES[0].startFrame).toBe(0);

        let cursor = 0;
        for (const scene of SCENES) {
            expect(scene.startFrame).toBe(cursor);
            expect(scene.durationInFrames).toBe(105);
            cursor += scene.durationInFrames;
        }
        expect(cursor).toBe(1050);
    });

    it('matches the mobile app brand hex palette', () => {
        expect(COLORS.bgDark).toBe('#0E1B16');
        expect(COLORS.secondary).toBe('#18342B');
        expect(COLORS.primary).toBe('#BBD583');
        expect(COLORS.surface).toBe('#F9FAF7');
        expect(COLORS.expense).toBe('#C2410C');
    });

    it('clamps floating callout cards inside TikTok safe margins', () => {
        const clamped = clampCalloutBounds(600, 1400, 480, 260);
        expect(clamped.x + 480).toBeLessThanOrEqual(TIKTOK_SAFE_ZONE.maxRightX);
        expect(clamped.y + 260).toBeLessThanOrEqual(TIKTOK_SAFE_ZONE.maxBottomY);
        expect(clamped.x).toBeGreaterThanOrEqual(TIKTOK_SAFE_ZONE.left);
        expect(clamped.y).toBeGreaterThanOrEqual(TIKTOK_SAFE_ZONE.top);
    });
});
