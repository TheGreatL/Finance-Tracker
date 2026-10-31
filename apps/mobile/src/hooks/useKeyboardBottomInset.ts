import { useState, useEffect } from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';
import { calculateKeyboardInset } from '../utils/keyboard';

/**
 * Returns dynamic bottom inset (padding) that expands when the on-screen keyboard
 * is visible, allowing inputs and submission buttons near the bottom of ScrollView
 * forms to comfortably sit above the keyboard.
 */
export function useKeyboardBottomInset(extraPadding: number = 32): number {
    const [bottomInset, setBottomInset] = useState<number>(() => calculateKeyboardInset(0, extraPadding));

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const onShow = (e: KeyboardEvent) => {
            const height = e.endCoordinates?.height ?? 0;
            setBottomInset(calculateKeyboardInset(height, extraPadding));
        };

        const onHide = () => {
            setBottomInset(calculateKeyboardInset(0, extraPadding));
        };

        const showSub = Keyboard.addListener(showEvent, onShow);
        const hideSub = Keyboard.addListener(hideEvent, onHide);

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, [extraPadding]);

    return bottomInset;
}
