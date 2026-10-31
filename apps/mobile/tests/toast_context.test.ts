import { describe, it, expect } from 'vitest';
import { normalizeToastOptions, computeToastDuration } from '../src/context/ToastContext';
import type { ToastOptions } from '../src/context/ToastContext';

describe('ToastContext helpers', () => {
    it('normalizes a string message into a success toast options object', () => {
        const options = normalizeToastOptions('Transaction saved');
        expect(options.message).toBe('Transaction saved');
        expect(options.type).toBe('success');
    });

    it('preserves existing options while defaulting type to success if missing', () => {
        const options = normalizeToastOptions({ message: 'Item saved' });
        expect(options.message).toBe('Item saved');
        expect(options.type).toBe('success');
    });

    it('honors explicitly specified toast type and action', () => {
        const dummyAction = () => {};
        const options = normalizeToastOptions({
            message: 'Deleted record',
            type: 'error',
            action: { label: 'Undo', onPress: dummyAction }
        });
        expect(options.message).toBe('Deleted record');
        expect(options.type).toBe('error');
        expect(options.action?.label).toBe('Undo');
        expect(options.action?.onPress).toBe(dummyAction);
    });

    it('computes 3200ms default duration for standard notifications without actions', () => {
        const duration = computeToastDuration({ message: 'Success' });
        expect(duration).toBe(3200);
    });

    it('computes 4500ms extended duration for toasts with an interactive Undo action', () => {
        const duration = computeToastDuration({
            message: 'Deleted',
            action: { label: 'Undo', onPress: () => {} }
        });
        expect(duration).toBe(4500);
    });

    it('respects custom durationMs if explicitly passed', () => {
        const duration = computeToastDuration({
            message: 'Custom duration',
            durationMs: 7000
        });
        expect(duration).toBe(7000);
    });
});
