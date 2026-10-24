import { describe, it, expect } from 'vitest';
import { formatCurrency, formatSignedCurrency, formatRelativeDate } from '../src/utils/formatters';

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
});
