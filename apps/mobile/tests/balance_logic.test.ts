import { describe, it, expect } from 'vitest';
import {
  calculateBalanceDelta,
  applyTransactionBalance,
  reverseTransactionBalance,
} from '../src/services/transactionService';

describe('balance_logic', () => {
  it('calculateBalanceDelta returns correct arithmetic delta for transaction types', () => {
    // Income adds money (+amount)
    expect(calculateBalanceDelta('income', 1500)).toBe(1500);

    // Expense subtracts money (-amount)
    expect(calculateBalanceDelta('expense', 500)).toBe(-500);

    // Transfer source pocket loses money (-amount)
    expect(calculateBalanceDelta('transfer', 2000, true)).toBe(-2000);

    // Transfer destination pocket gains money (+amount)
    expect(calculateBalanceDelta('transfer', 2000, false)).toBe(2000);
  });

  it('applyTransactionBalance updates source and destination balances correctly', () => {
    // Expense
    const expenseResult = applyTransactionBalance({
      type: 'expense',
      amount: 350.5,
      sourceCurrentBalance: 5000,
    });
    expect(expenseResult.newSourceBalance).toBe(4649.5);
    expect(expenseResult.newDestinationBalance).toBeUndefined();

    // Income
    const incomeResult = applyTransactionBalance({
      type: 'income',
      amount: 10000,
      sourceCurrentBalance: 2000,
    });
    expect(incomeResult.newSourceBalance).toBe(12000);

    // Transfer
    const transferResult = applyTransactionBalance({
      type: 'transfer',
      amount: 1500,
      sourceCurrentBalance: 5000,
      destinationCurrentBalance: 200,
    });
    expect(transferResult.newSourceBalance).toBe(3500);
    expect(transferResult.newDestinationBalance).toBe(1700);
  });

  it('reverseTransactionBalance accurately restores original balances', () => {
    // Reversing an expense gives money back
    const reverseExpense = reverseTransactionBalance({
      type: 'expense',
      amount: 450,
      sourceCurrentBalance: 2550,
    });
    expect(reverseExpense.restoredSourceBalance).toBe(3000);

    // Reversing an income deducts money back
    const reverseIncome = reverseTransactionBalance({
      type: 'income',
      amount: 25000,
      sourceCurrentBalance: 30000,
    });
    expect(reverseIncome.restoredSourceBalance).toBe(5000);

    // Reversing a transfer moves money back from destination to source
    const reverseTransfer = reverseTransactionBalance({
      type: 'transfer',
      amount: 3000,
      sourceCurrentBalance: 2000,
      destinationCurrentBalance: 3500,
    });
    expect(reverseTransfer.restoredSourceBalance).toBe(5000);
    expect(reverseTransfer.restoredDestinationBalance).toBe(500);
  });
});
