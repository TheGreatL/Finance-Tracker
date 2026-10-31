import { describe, it, expect } from 'vitest';
import {
    formatCurrency,
    formatSignedCurrency,
    formatRelativeDate,
    formatDisplayDate,
    formatTime12,
    formatMoneyInput,
    parseMoneyInput
} from '../src/utils/formatters';

describe('formatters', () => {
    it('formatCurrency formats zero correctly', () => {
        expect(formatCurrency(0)).toBe('₱0.00');
    });

    it('formatCurrency formats positive amounts with commas and 2 decimals', () => {
        expect(formatCurrency(1250.5)).toBe('₱1,250.50');
        expect(formatCurrency(1000000)).toBe('₱1,000,000.00');
    });

    it('formatCurrency handles negative amounts with minus sign before currency', () => {
        expect(formatCurrency(-450.25)).toBe('-₱450.25');
    });

    it('formatCurrency supports custom currency symbol', () => {
        expect(formatCurrency(50, '$')).toBe('$50.00');
        expect(formatCurrency(-25, '$')).toBe('-$25.00');
    });

    it('formatSignedCurrency formats income with plus sign', () => {
        expect(formatSignedCurrency(5000, 'income', '₱')).toBe('+₱5,000.00');
        expect(formatSignedCurrency(-5000, 'income', '₱')).toBe('+₱5,000.00'); // prevents double negative
    });

    it('formatSignedCurrency formats expense with minus sign and avoids -₱0.00', () => {
        expect(formatSignedCurrency(1500, 'expense', '₱')).toBe('-₱1,500.00');
        expect(formatSignedCurrency(-1500, 'expense', '₱')).toBe('-₱1,500.00'); // prevents --₱1,500.00
        expect(formatSignedCurrency(0, 'expense', '₱')).toBe('₱0.00'); // zero expense has no negative sign
    });

    it('formatSignedCurrency formats transfer with neutral amount', () => {
        expect(formatSignedCurrency(2000, 'transfer', '₱')).toBe('₱2,000.00');
    });

    it('formatRelativeDate returns Today for current date', () => {
        const today = new Date().toISOString();
        expect(formatRelativeDate(today)).toBe('Today');
    });

    it('formatDisplayDate formats YYYY-MM-DD into human-readable date', () => {
        expect(formatDisplayDate('2026-11-24')).toBe('Nov 24, 2026');
        expect(formatDisplayDate('2026-01-05')).toBe('Jan 5, 2026');
    });

    it('formatDisplayDate returns fallback when empty or invalid', () => {
        expect(formatDisplayDate('')).toBe('Select date');
        expect(formatDisplayDate(undefined)).toBe('Select date');
        expect(formatDisplayDate('invalid-date-format')).toBe('invalid-date-format');
    });

    describe('formatTime12', () => {
        it('returns empty string for null, undefined, or empty values', () => {
            expect(formatTime12(null)).toBe('');
            expect(formatTime12(undefined)).toBe('');
            expect(formatTime12('')).toBe('');
        });

        it('formats Date objects to 12-hour format with AM/PM', () => {
            const morning = new Date(2026, 9, 31, 9, 5);
            expect(formatTime12(morning)).toBe('9:05 AM');

            const afternoon = new Date(2026, 9, 31, 16, 8);
            expect(formatTime12(afternoon)).toBe('4:08 PM');

            const midnight = new Date(2026, 9, 31, 0, 15);
            expect(formatTime12(midnight)).toBe('12:15 AM');

            const noon = new Date(2026, 9, 31, 12, 0);
            expect(formatTime12(noon)).toBe('12:00 PM');
        });

        it('converts 24-hour time strings to 12-hour format', () => {
            expect(formatTime12('16:08')).toBe('4:08 PM');
            expect(formatTime12('09:30')).toBe('9:30 AM');
            expect(formatTime12('00:00')).toBe('12:00 AM');
            expect(formatTime12('12:00')).toBe('12:00 PM');
            expect(formatTime12('23:59')).toBe('11:59 PM');
            expect(formatTime12('14:45:00')).toBe('2:45 PM');
        });

        it('preserves strings that already have AM or PM', () => {
            expect(formatTime12('4:08 PM')).toBe('4:08 PM');
            expect(formatTime12('11:30 AM')).toBe('11:30 AM');
        });
    });

    describe('formatMoneyInput', () => {
        it('returns empty string for empty input', () => {
            expect(formatMoneyInput('')).toBe('');
            expect(formatMoneyInput('   ')).toBe('');
        });

        it('formats single and multiple digits with comma thousands separators', () => {
            expect(formatMoneyInput('1')).toBe('1');
            expect(formatMoneyInput('12')).toBe('12');
            expect(formatMoneyInput('123')).toBe('123');
            expect(formatMoneyInput('1234')).toBe('1,234');
            expect(formatMoneyInput('12345')).toBe('12,345');
            expect(formatMoneyInput('123456')).toBe('123,456');
            expect(formatMoneyInput('1234567')).toBe('1,234,567');
            expect(formatMoneyInput('1000000000')).toBe('1,000,000,000');
        });

        it('handles decimal input smoothly during user typing', () => {
            expect(formatMoneyInput('.')).toBe('0.');
            expect(formatMoneyInput('0.')).toBe('0.');
            expect(formatMoneyInput('1234.')).toBe('1,234.');
            expect(formatMoneyInput('1234.5')).toBe('1,234.5');
            expect(formatMoneyInput('1234.50')).toBe('1,234.50');
        });

        it('limits decimals to at most 2 digits', () => {
            expect(formatMoneyInput('1234.509')).toBe('1,234.50');
            expect(formatMoneyInput('0.12345')).toBe('0.12');
        });

        it('handles leading zeroes correctly', () => {
            expect(formatMoneyInput('0')).toBe('0');
            expect(formatMoneyInput('00')).toBe('0');
            expect(formatMoneyInput('05')).toBe('5');
            expect(formatMoneyInput('00750')).toBe('750');
            expect(formatMoneyInput('0.05')).toBe('0.05');
        });

        it('sanitizes non-numeric and stray dot inputs', () => {
            expect(formatMoneyInput('₱1,250.75')).toBe('1,250.75');
            expect(formatMoneyInput('$10,000')).toBe('10,000');
            expect(formatMoneyInput('abc1234def')).toBe('1,234');
            expect(formatMoneyInput('12.34.56')).toBe('12.34');
        });
    });

    describe('parseMoneyInput', () => {
        it('returns 0 for empty or invalid values', () => {
            expect(parseMoneyInput('')).toBe(0);
            expect(parseMoneyInput('.')).toBe(0);
            expect(parseMoneyInput('0.')).toBe(0);
            expect(parseMoneyInput('abc')).toBe(0);
        });

        it('parses formatted strings with commas back to numbers', () => {
            expect(parseMoneyInput('1,234')).toBe(1234);
            expect(parseMoneyInput('1,234.5')).toBe(1234.5);
            expect(parseMoneyInput('1,234.50')).toBe(1234.5);
            expect(parseMoneyInput('1,000,000')).toBe(1000000);
            expect(parseMoneyInput('0.75')).toBe(0.75);
        });
    });
});
