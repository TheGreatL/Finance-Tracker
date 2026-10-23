import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNetBalance } from '../src/utils/calculations.ts';

test('calculateNetBalance returns zeros for empty transactions', () => {
  const result = calculateNetBalance([]);
  assert.deepEqual(result, {
    totalBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
  });
});

test('calculateNetBalance aggregates income and expenses accurately', () => {
  const transactions = [
    { type: 'income' as const, amount: 5000 },
    { type: 'expense' as const, amount: 1500 },
    { type: 'expense' as const, amount: 500.5 },
    { type: 'income' as const, amount: 1200 },
    { type: 'transfer' as const, amount: 1000 },
  ];

  const result = calculateNetBalance(transactions);
  assert.equal(result.totalIncome, 6200);
  assert.equal(result.totalExpense, 2000.5);
  assert.equal(result.totalBalance, 4199.5);
});
