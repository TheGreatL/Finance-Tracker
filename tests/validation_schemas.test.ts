import test from 'node:test';
import assert from 'node:assert';
import {
  savingsGoalSchema,
  transactionFormSchema,
  accountFormSchema,
  loanFormSchema,
  wishlistFormSchema,
  recurringRuleFormSchema,
  validateForm,
  cleanNumericString,
} from '../src/schemas/validationSchemas.ts';

test('savingsGoalSchema: rejects empty title and non-numeric target amount with descriptive message', () => {
  const result = validateForm(savingsGoalSchema, {
    name: '',
    targetAmount: 'abc',
    currentAmount: '',
    targetDate: '',
  });

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.errors.name, 'Goal title is required (e.g. Emergency Fund)');
  assert.ok(
    result.errors.targetAmount.includes('must be a valid number'),
    `Expected valid number error message, got: ${result.errors.targetAmount}`
  );
});

test('savingsGoalSchema: rejects zero or negative target amounts', () => {
  const zeroResult = validateForm(savingsGoalSchema, {
    name: 'Retirement',
    targetAmount: '0',
    currentAmount: '0',
    targetDate: '',
  });
  assert.strictEqual(zeroResult.success, false);
  assert.strictEqual(zeroResult.errors.targetAmount, 'Target amount must be greater than 0');

  const negResult = validateForm(savingsGoalSchema, {
    name: 'Retirement',
    targetAmount: '-500',
    currentAmount: '0',
    targetDate: '',
  });
  assert.strictEqual(negResult.success, false);
  assert.strictEqual(negResult.errors.targetAmount, 'Target amount must be greater than 0');
});

test('savingsGoalSchema: accepts formatted numbers with commas and valid dates', () => {
  const result = validateForm(savingsGoalSchema, {
    name: 'Emergency Fund',
    targetAmount: '100,000.00',
    currentAmount: '5,000',
    targetDate: '2026-12-31',
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(cleanNumericString(result.data.targetAmount), '100000.00');
});

test('transactionFormSchema: rejects transfer if destination is same as source', () => {
  const result = validateForm(transactionFormSchema, {
    type: 'transfer',
    amount: '1500',
    accountId: 'acc-bank-1',
    toAccountId: 'acc-bank-1',
    date: '2026-09-19',
  });

  assert.strictEqual(result.success, false);
  assert.ok(
    result.errors.toAccountId.includes('different from source account'),
    `Expected destination error, got: ${result.errors.toAccountId}`
  );
});

test('transactionFormSchema: rejects non-numeric or negative transaction amounts', () => {
  const result = validateForm(transactionFormSchema, {
    type: 'expense',
    amount: 'xyz',
    accountId: 'acc-cash',
    date: '2026-09-19',
  });

  assert.strictEqual(result.success, false);
  assert.ok(result.errors.amount.includes('must be a valid number'));
});

test('accountFormSchema: validates credit card limit and statement cutoff day bounds', () => {
  const badDayResult = validateForm(accountFormSchema, {
    name: 'Gold Card',
    type: 'credit_card',
    openingBalance: '0',
    creditLimit: '50000',
    statementDay: '35',
    dueDay: '5',
  });

  assert.strictEqual(badDayResult.success, false);
  assert.strictEqual(badDayResult.errors.statementDay, 'Statement cutoff day must be between 1 and 31');
});

test('wishlistFormSchema: rejects non-numeric cost and validates optional store URLs', () => {
  const badCost = validateForm(wishlistFormSchema, {
    title: 'Monitor',
    cost: 'not-a-number',
  });
  assert.strictEqual(badCost.success, false);
  assert.ok(badCost.errors.cost.includes('must be a valid number'));

  const badUrl = validateForm(wishlistFormSchema, {
    title: 'Monitor',
    cost: '15000',
    url: 'ftp://bad-link',
  });
  assert.strictEqual(badUrl.success, false);
  assert.ok(badUrl.errors.url.includes('http:// or https://'));
});

test('recurringRuleFormSchema: validates semi_monthly, biweekly, and monthly salary frequencies', () => {
  const semiMonthly = validateForm(recurringRuleFormSchema, {
    title: 'Twice-a-Month Salary',
    type: 'income',
    amount: '25000',
    frequency: 'semi_monthly',
    accountId: 'acc-bank-1',
    categoryId: 'cat-inc-salary',
    startDate: '2026-09-15',
  });
  assert.strictEqual(semiMonthly.success, true);

  const biweekly = validateForm(recurringRuleFormSchema, {
    title: 'Bi-Weekly Pay',
    type: 'income',
    amount: '20000',
    frequency: 'biweekly',
    accountId: 'acc-bank-1',
    startDate: '2026-09-15',
  });
  assert.strictEqual(biweekly.success, true);

  const monthly = validateForm(recurringRuleFormSchema, {
    title: 'Monthly Pay',
    type: 'income',
    amount: '50000',
    frequency: 'monthly',
    accountId: 'acc-bank-1',
    startDate: '2026-09-30',
  });
  assert.strictEqual(monthly.success, true);

  const invalidFreq = validateForm(recurringRuleFormSchema, {
    title: 'Bad Frequency',
    type: 'income',
    amount: '50000',
    frequency: 'triweekly',
    accountId: 'acc-bank-1',
    startDate: '2026-09-30',
  });
  assert.strictEqual(invalidFreq.success, false);
  assert.ok(invalidFreq.errors.frequency != null);

  const customDaysValid = validateForm(recurringRuleFormSchema, {
    title: 'Custom Semi-Monthly',
    type: 'income',
    amount: '25000',
    frequency: 'semi_monthly',
    accountId: 'acc-bank-1',
    startDate: '2026-09-10',
    payoutDay1: 10,
    payoutDay2: 25,
  });
  assert.strictEqual(customDaysValid.success, true);

  const customDaysOutOfRange = validateForm(recurringRuleFormSchema, {
    title: 'Custom Semi-Monthly Bad Days',
    type: 'income',
    amount: '25000',
    frequency: 'semi_monthly',
    accountId: 'acc-bank-1',
    startDate: '2026-09-10',
    payoutDay1: 0,
    payoutDay2: 32,
  });
  assert.strictEqual(customDaysOutOfRange.success, false);
  assert.ok(customDaysOutOfRange.errors.payoutDay1 != null);
  assert.ok(customDaysOutOfRange.errors.payoutDay2 != null);
});
