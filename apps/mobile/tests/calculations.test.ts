import { describe, it, expect } from 'vitest';
import { calculateNetBalance } from '../src/utils/calculations';

describe('calculations', () => {
  it('calculateNetBalance returns zeros for empty transactions', () => {
    const result = calculateNetBalance([]);
    expect(result).toEqual({
      totalBalance: 0,
      totalIncome: 0,
      totalExpense: 0,
    });
  });

  it('calculateNetBalance aggregates income and expenses accurately', () => {
    const transactions = [
      { type: 'income' as const, amount: 5000 },
      { type: 'expense' as const, amount: 1500 },
      { type: 'expense' as const, amount: 500.5 },
      { type: 'income' as const, amount: 1200 },
      { type: 'transfer' as const, amount: 1000 },
    ];

    const result = calculateNetBalance(transactions);
    expect(result.totalIncome).toBe(6200);
    expect(result.totalExpense).toBe(2000.5);
    expect(result.totalBalance).toBe(4199.5);
  });
});
