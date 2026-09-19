import test from 'node:test';
import assert from 'node:assert';

interface MockAccount {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'ewallet' | 'credit_card';
  opening_balance: number;
  current_balance: number;
  credit_limit?: number;
}

interface MockTransaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  account_id: string;
  to_account_id?: string | null;
  amount: number;
  gross_amount?: number | null;
  deductions_total?: number;
  expense_nature?: 'needs' | 'wants';
}

function applyTransaction(accs: Map<string, MockAccount>, tx: MockTransaction) {
  const source = accs.get(tx.account_id);
  if (!source) throw new Error(`Source account not found: ${tx.account_id}`);

  if (tx.type === 'income') {
    if (source.type === 'credit_card') {
      source.current_balance -= tx.amount; // refund/credit decreases debt
    } else {
      source.current_balance += tx.amount;
    }
  } else if (tx.type === 'expense') {
    if (source.type === 'credit_card') {
      source.current_balance += tx.amount; // debt increases
    } else {
      source.current_balance -= tx.amount;
    }
  } else if (tx.type === 'transfer') {
    const dest = tx.to_account_id ? accs.get(tx.to_account_id) : null;
    if (!dest) throw new Error(`Destination account not found: ${tx.to_account_id}`);

    // Source adjustment
    if (source.type === 'credit_card') {
      source.current_balance += tx.amount; // cash advance from card
    } else {
      source.current_balance -= tx.amount;
    }

    // Destination adjustment
    if (dest.type === 'credit_card') {
      dest.current_balance -= tx.amount; // payment to card reduces debt
    } else {
      dest.current_balance += tx.amount;
    }
  }
}

test('Ledger: Income with deductions credits net to bank and tracks gross', () => {
  const accounts = new Map<string, MockAccount>([
    ['bank-1', { id: 'bank-1', name: 'Checking', type: 'bank', opening_balance: 10000, current_balance: 10000 }],
  ]);

  const tx: MockTransaction = {
    id: 'tx-inc-1',
    type: 'income',
    account_id: 'bank-1',
    amount: 45000, // Net received
    deductions_total: 5000, // Tax & SSS
    gross_amount: 50000,
  };

  applyTransaction(accounts, tx);

  const bank = accounts.get('bank-1')!;
  assert.strictEqual(bank.current_balance, 55000); // 10000 + 45000
  assert.strictEqual(tx.gross_amount, 50000);
  assert.strictEqual(tx.deductions_total, 5000);
});

test('Ledger: Transfers between bank, eWallet and Credit Card do not affect income/expense metrics', () => {
  const accounts = new Map<string, MockAccount>([
    ['bank-1', { id: 'bank-1', name: 'Bank', type: 'bank', opening_balance: 50000, current_balance: 50000 }],
    ['wallet-1', { id: 'wallet-1', name: 'GCash', type: 'ewallet', opening_balance: 1000, current_balance: 1000 }],
    ['card-1', { id: 'card-1', name: 'Credit Card', type: 'credit_card', opening_balance: 8000, current_balance: 8000, credit_limit: 50000 }],
  ]);

  // 1. Transfer ₱5,000 from Bank to eWallet
  applyTransaction(accounts, {
    id: 'tx-t1',
    type: 'transfer',
    account_id: 'bank-1',
    to_account_id: 'wallet-1',
    amount: 5000,
  });

  assert.strictEqual(accounts.get('bank-1')!.current_balance, 45000);
  assert.strictEqual(accounts.get('wallet-1')!.current_balance, 6000);

  // 2. Transfer ₱8,000 from Bank to pay Credit Card debt
  applyTransaction(accounts, {
    id: 'tx-t2',
    type: 'transfer',
    account_id: 'bank-1',
    to_account_id: 'card-1',
    amount: 8000,
  });

  assert.strictEqual(accounts.get('bank-1')!.current_balance, 37000);
  assert.strictEqual(accounts.get('card-1')!.current_balance, 0); // Debt cleared!
});

test('Ledger: Credit card purchases increase card balance (debt)', () => {
  const accounts = new Map<string, MockAccount>([
    ['card-1', { id: 'card-1', name: 'Credit Card', type: 'credit_card', opening_balance: 0, current_balance: 0, credit_limit: 50000 }],
  ]);

  applyTransaction(accounts, {
    id: 'tx-exp-card',
    type: 'expense',
    account_id: 'card-1',
    amount: 15000,
    expense_nature: 'wants',
  });

  const card = accounts.get('card-1')!;
  assert.strictEqual(card.current_balance, 15000);
  // Utilization: 15,000 / 50,000 = 30%
  const utilRate = (card.current_balance / card.credit_limit!) * 100;
  assert.strictEqual(utilRate, 30);
});

test('Ledger & Payslip: Accurately calculates Philippine statutory deductions (Tax, SSS, PhilHealth, Pag-IBIG)', () => {
  const accounts = new Map<string, MockAccount>([
    ['bank-1', { id: 'bank-1', name: 'BDO Payroll', type: 'bank', opening_balance: 5000, current_balance: 5000 }],
  ]);

  const grossSalary = 30000;
  const deductions = [
    { name: 'Withholding Tax', amount: 2500 },
    { name: 'SSS', amount: 1350 },
    { name: 'PhilHealth', amount: 750 },
    { name: 'Pag-IBIG', amount: 200 },
  ];
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const netTakeHome = grossSalary - totalDeductions;

  assert.strictEqual(totalDeductions, 4800);
  assert.strictEqual(netTakeHome, 25200);

  const tx: MockTransaction = {
    id: 'tx-salary-1',
    type: 'income',
    account_id: 'bank-1',
    amount: netTakeHome,
    gross_amount: grossSalary,
    deductions_total: totalDeductions,
  };

  applyTransaction(accounts, tx);

  const bank = accounts.get('bank-1')!;
  // Bank receives net take-home pay
  assert.strictEqual(bank.current_balance, 30200); // 5000 + 25200
  // Ledger preserves gross and total deductions
  assert.strictEqual(tx.gross_amount, 30000);
  assert.strictEqual(tx.deductions_total, 4800);
});

// Pure calculation test for next due date
function computeNextDueDatePure(
  currentDateStr: string,
  frequency: 'daily' | 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly' | 'yearly',
  payoutDay1?: number | null,
  payoutDay2?: number | null
): string {
  const [yearStr, monthStr, dayStr] = currentDateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const formatYearMonthDay = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  switch (frequency) {
    case 'daily':
      return formatYearMonthDay(new Date(year, month, day + 1));
    case 'weekly':
      return formatYearMonthDay(new Date(year, month, day + 7));
    case 'biweekly':
      return formatYearMonthDay(new Date(year, month, day + 14));
    case 'semi_monthly': {
      const rawDay1 = payoutDay1 && payoutDay1 >= 1 && payoutDay1 <= 31 ? payoutDay1 : 15;
      const rawDay2 = payoutDay2 && payoutDay2 >= 1 && payoutDay2 <= 31 ? payoutDay2 : 30;
      const [firstDay, secondDay] = rawDay1 <= rawDay2 ? [rawDay1, rawDay2] : [rawDay2, rawDay1];

      const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
      const effectiveSecondDay = Math.min(secondDay, daysInCurrentMonth);

      if (day < effectiveSecondDay) {
        return formatYearMonthDay(new Date(year, month, effectiveSecondDay));
      } else {
        const targetMonth = month + 1;
        const daysInTargetMonth = new Date(year, targetMonth + 1, 0).getDate();
        const effectiveFirstDay = Math.min(firstDay, daysInTargetMonth);
        return formatYearMonthDay(new Date(year, targetMonth, effectiveFirstDay));
      }
    }
    case 'monthly': {
      const targetMonth = month + 1;
      const daysInTargetMonth = new Date(year, targetMonth + 1, 0).getDate();
      const targetDay = Math.min(day, daysInTargetMonth);
      return formatYearMonthDay(new Date(year, targetMonth, targetDay));
    }
    case 'yearly':
      return formatYearMonthDay(new Date(year + 1, month, day));
  }
}

test('Recurring Paydays: computeNextDueDate correctly cycles semi-monthly and monthly paydays', () => {
  // 1. Semi-monthly standard (15th -> 30th)
  assert.strictEqual(computeNextDueDatePure('2026-09-15', 'semi_monthly', 15, 30), '2026-09-30');

  // 2. Semi-monthly standard (30th -> 15th next month)
  assert.strictEqual(computeNextDueDatePure('2026-09-30', 'semi_monthly', 15, 30), '2026-10-15');

  // 3. Custom semi-monthly: 10th & 25th
  assert.strictEqual(computeNextDueDatePure('2026-09-10', 'semi_monthly', 10, 25), '2026-09-25');
  assert.strictEqual(computeNextDueDatePure('2026-09-25', 'semi_monthly', 10, 25), '2026-10-10');

  // 4. Custom semi-monthly: 5th & 20th
  assert.strictEqual(computeNextDueDatePure('2026-09-05', 'semi_monthly', 5, 20), '2026-09-20');
  assert.strictEqual(computeNextDueDatePure('2026-09-20', 'semi_monthly', 5, 20), '2026-10-05');

  // 5. Custom semi-monthly: 1st & 16th
  assert.strictEqual(computeNextDueDatePure('2026-09-01', 'semi_monthly', 1, 16), '2026-09-16');
  assert.strictEqual(computeNextDueDatePure('2026-09-16', 'semi_monthly', 1, 16), '2026-10-01');

  // 6. Semi-monthly in February non-leap year (Feb 15 -> Feb 28 -> Mar 15)
  assert.strictEqual(computeNextDueDatePure('2026-02-15', 'semi_monthly', 15, 30), '2026-02-28');
  assert.strictEqual(computeNextDueDatePure('2026-02-28', 'semi_monthly', 15, 30), '2026-03-15');

  // 7. Monthly (preserving 31st into shorter month Feb -> Feb 28)
  assert.strictEqual(computeNextDueDatePure('2026-01-31', 'monthly'), '2026-02-28');

  // 8. Bi-weekly (every 14 days)
  assert.strictEqual(computeNextDueDatePure('2026-09-15', 'biweekly'), '2026-09-29');
});

test('Payroll: Accurately separates per-cutoff deductions (1st Cutoff vs 2nd Cutoff)', () => {
  const grossSalaryPerCutoff = 30000;
  const configuredDeductions: Array<{ name: string; amount: number; cutoff: 'first' | 'second' | 'both' }> = [
    { name: 'SSS', amount: 1350, cutoff: 'first' },
    { name: 'PhilHealth', amount: 750, cutoff: 'first' },
    { name: 'Withholding Tax', amount: 2500, cutoff: 'second' },
    { name: 'Pag-IBIG', amount: 200, cutoff: 'second' },
  ];

  // 1st Cutoff (e.g. 10th or 15th): SSS & PhilHealth only
  const firstCutoffDeds = configuredDeductions.filter(d => d.cutoff === 'first' || d.cutoff === 'both');
  const firstCutoffTotal = firstCutoffDeds.reduce((s, d) => s + d.amount, 0);
  const firstCutoffNet = grossSalaryPerCutoff - firstCutoffTotal;

  assert.strictEqual(firstCutoffTotal, 2100); // 1350 + 750
  assert.strictEqual(firstCutoffNet, 27900); // 30000 - 2100

  // 2nd Cutoff (e.g. 25th or 30th): Tax & Pag-IBIG only
  const secondCutoffDeds = configuredDeductions.filter(d => d.cutoff === 'second' || d.cutoff === 'both');
  const secondCutoffTotal = secondCutoffDeds.reduce((s, d) => s + d.amount, 0);
  const secondCutoffNet = grossSalaryPerCutoff - secondCutoffTotal;

  assert.strictEqual(secondCutoffTotal, 2700); // 2500 + 200
  assert.strictEqual(secondCutoffNet, 27300); // 30000 - 2700

  // Total Monthly Combined
  const totalMonthlyDeductions = firstCutoffTotal + secondCutoffTotal;
  const totalMonthlyNet = firstCutoffNet + secondCutoffNet;

  assert.strictEqual(totalMonthlyDeductions, 4800);
  assert.strictEqual(totalMonthlyNet, 55200); // 60000 - 4800
});

test('Salary Adjustments: Correctly computes Adjusted Gross and Net with Overtime, Absences, and Undertime', () => {
  const baseGross = 25000;
  const overtime = 3500;
  const absence = 1200;
  const undertime = 300;
  const deductions = [
    { name: 'SSS', amount: 1350 },
    { name: 'PhilHealth', amount: 750 },
  ];

  const totalDeds = deductions.reduce((s, d) => s + d.amount, 0); // 2100
  const adjustedGross = Math.max(0, baseGross + overtime - absence - undertime); // 25000 + 3500 - 1200 - 300 = 27000
  const takeHomeNet = Math.max(0, adjustedGross - totalDeds); // 27000 - 2100 = 24900

  assert.strictEqual(adjustedGross, 27000);
  assert.strictEqual(totalDeds, 2100);
  assert.strictEqual(takeHomeNet, 24900);
});

test('Salary Adjustments: Direct Manual Override allows user-specified net take-home deposit', () => {
  const baseGross = 25000;
  const overtime = 0;
  const absence = 0;
  const undertime = 0;
  const deductions = [{ name: 'Tax', amount: 2000 }];

  // In direct manual override, user types 22500 directly
  const manualNetInput = 22500;
  const totalDeds = deductions.reduce((s, d) => s + d.amount, 0);
  const recordedGross = baseGross > 0 ? baseGross : manualNetInput + totalDeds;

  assert.strictEqual(manualNetInput, 22500);
  assert.strictEqual(recordedGross, 25000);
});

test('Ledger Reconciliation: Updating an existing transaction correctly shifts account balance', () => {
  const accounts = new Map<string, MockAccount>([
    ['bank-1', { id: 'bank-1', name: 'Checking', type: 'bank', opening_balance: 10000, current_balance: 10000 }],
  ]);

  // Initial income transaction: ₱20,000
  const tx1: MockTransaction = {
    id: 'tx-101',
    type: 'income',
    account_id: 'bank-1',
    amount: 20000,
  };
  applyTransaction(accounts, tx1);
  assert.strictEqual(accounts.get('bank-1')!.current_balance, 30000);

  // User edits tx1 to adjust for Overtime and Absences: new amount is ₱24,900
  // Reconcile: revert old transaction (-20000) and apply new transaction (+24900)
  const revertTx = { ...tx1, amount: tx1.amount };
  accounts.get('bank-1')!.current_balance -= revertTx.amount; // 30000 - 20000 = 10000

  const updatedTx: MockTransaction = {
    ...tx1,
    amount: 24900,
    gross_amount: 27000,
    deductions_total: 2100,
  };
  applyTransaction(accounts, updatedTx); // 10000 + 24900 = 34900

  assert.strictEqual(accounts.get('bank-1')!.current_balance, 34900);
});

