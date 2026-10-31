export interface KeyboardOverlapInput {
    viewBottomY: number;
    windowHeight: number;
    keyboardHeight: number;
    keyboardScreenY?: number;
}

/**
 * Calculates how many vertical pixels of a view are obscured by the on-screen keyboard,
 * ensuring the input bar sits directly at the top edge of the keyboard without
 * double-padding if the OS (adjustResize) has already shrunk the view.
 */
export function computeKeyboardOverlap({ viewBottomY, windowHeight, keyboardHeight, keyboardScreenY = 0 }: KeyboardOverlapInput): number {
    if (keyboardHeight <= 0) {
        return 0;
    }

    const keyboardTopY = keyboardScreenY > 0 && keyboardScreenY < windowHeight ? keyboardScreenY : windowHeight - keyboardHeight;

    const effectiveBottomY = viewBottomY > 0 ? viewBottomY : windowHeight;

    return Math.max(0, Math.round(effectiveBottomY - keyboardTopY));
}

/**
 * Calculates dynamic bottom inset padding for scroll views, giving active input fields
 * and action buttons enough runway to sit above the keyboard.
 */
export function calculateKeyboardInset(keyboardHeight: number, extraPadding: number = 32): number {
    return keyboardHeight > 0 ? keyboardHeight + extraPadding : extraPadding;
}
