import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrency, formatRelativeDate } from '../src/utils/formatters.ts';

test('formatCurrency formats zero correctly', () => {
  assert.equal(formatCurrency(0), '₱0.00');
});

test('formatCurrency formats positive amounts with commas and 2 decimals', () => {
  assert.equal(formatCurrency(1250.5), '₱1,250.50');
  assert.equal(formatCurrency(1000000), '₱1,000,000.00');
});

test('formatCurrency handles negative amounts with minus sign before currency', () => {
  assert.equal(formatCurrency(-450.25), '-₱450.25');
});

test('formatCurrency supports custom currency symbol', () => {
  assert.equal(formatCurrency(50, '$'), '$50.00');
  assert.equal(formatCurrency(-25, '$'), '-$25.00');
});

test('formatRelativeDate returns Today for current date', () => {
  const today = new Date().toISOString();
  assert.equal(formatRelativeDate(today), 'Today');
});
