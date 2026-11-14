import { describe, expect, it } from 'vitest';
import { computeSpringProgress, formatPesoAnimated } from '../src/utils/motion';

describe('Motion & currency counter helpers', () => {
    it('never returns negative or NaN values for negative, zero, or large frames', () => {
        expect(computeSpringProgress(-15, 30, 10)).toBe(0);
        expect(computeSpringProgress(0, 30, 10)).toBe(0);
        const mid = computeSpringProgress(25, 30, 10);
        expect(mid).toBeGreaterThan(0.5);
        expect(Number.isNaN(mid)).toBe(false);
    });

    it('formats animated Philippine Peso amounts with tabular thousands separators', () => {
        expect(formatPesoAnimated(78400, 0)).toBe('₱0.00');
        expect(formatPesoAnimated(78400, 1)).toBe('₱78,400.00');
    });
});
