import { describe, it, expect } from 'vitest';
import { computeKeyboardOverlap, calculateKeyboardInset } from '../src/utils/keyboard';

describe('computeKeyboardOverlap', () => {
    it('returns 0 when keyboard height is 0 (hidden)', () => {
        expect(
            computeKeyboardOverlap({
                viewBottomY: 824,
                windowHeight: 824,
                keyboardHeight: 0,
                keyboardScreenY: 824
            })
        ).toBe(0);
    });

    it('computes exact overlap when keyboard covers full-height edge-to-edge view', () => {
        expect(
            computeKeyboardOverlap({
                viewBottomY: 824,
                windowHeight: 824,
                keyboardHeight: 310,
                keyboardScreenY: 514
            })
        ).toBe(310);
    });

    it('computes exact overlap when view ends above bottom tab bar', () => {
        expect(
            computeKeyboardOverlap({
                viewBottomY: 760,
                windowHeight: 824,
                keyboardHeight: 310,
                keyboardScreenY: 514
            })
        ).toBe(246);
    });

    it('returns 0 when OS adjustResize has already shrunk the view above the keyboard', () => {
        expect(
            computeKeyboardOverlap({
                viewBottomY: 514,
                windowHeight: 824,
                keyboardHeight: 310,
                keyboardScreenY: 514
            })
        ).toBe(0);
    });

    it('falls back to windowHeight - keyboardHeight if keyboardScreenY is 0 or invalid', () => {
        expect(
            computeKeyboardOverlap({
                viewBottomY: 824,
                windowHeight: 824,
                keyboardHeight: 300,
                keyboardScreenY: 0
            })
        ).toBe(300);
    });
});

describe('calculateKeyboardInset', () => {
    it('returns extraPadding when keyboard is closed (height = 0)', () => {
        expect(calculateKeyboardInset(0, 32)).toBe(32);
        expect(calculateKeyboardInset(0, 24)).toBe(24);
    });
    describe('calculateKeyboardInset', () => {
        it('returns extraPadding when keyboard is closed (height = 0)', () => {
            expect(calculateKeyboardInset(0, 32)).toBe(32);
            expect(calculateKeyboardInset(0, 24)).toBe(24);
        });

        it('adds keyboardHeight to extraPadding when keyboard is open', () => {
            expect(calculateKeyboardInset(310, 32)).toBe(342);
            expect(calculateKeyboardInset(280, 24)).toBe(304);
        });
    });

    it('adds keyboardHeight to extraPadding when keyboard is open', () => {
        expect(calculateKeyboardInset(310, 32)).toBe(342);
        expect(calculateKeyboardInset(280, 24)).toBe(304);
    });
});
