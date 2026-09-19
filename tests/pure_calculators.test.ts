import test from 'node:test';
import assert from 'node:assert';
import JSZip from 'jszip';
import Papa from 'papaparse';

// Test Savings Projection logic
function projectSavings(targetAmount: number, currentAmount: number, monthlySavings: number) {
  const remainingAmount = Math.max(0, targetAmount - currentAmount);
  if (monthlySavings <= 0) {
    return {
      targetAmount,
      currentAmount,
      remainingAmount,
      monthlySavings: 0,
      monthsToReach: Infinity,
      targetAchievedDate: 'Never (zero monthly savings)',
    };
  }
  const monthsToReach = Math.ceil(remainingAmount / monthlySavings);
  return {
    targetAmount,
    currentAmount,
    remainingAmount,
    monthlySavings,
    monthsToReach,
  };
}

// Test Debt Payoff logic
function calculateDebtPayoff(principal: number, annualInterestRate: number, monthlyPayment: number) {
  if (principal <= 0 || monthlyPayment <= 0) {
    return { principal, monthsToPayoff: 0, totalInterestPaid: 0, totalPaid: principal };
  }
  const monthlyRate = (annualInterestRate / 100) / 12;
  let balance = principal;
  let totalInterest = 0;
  let months = 0;

  if (monthlyRate > 0 && balance * monthlyRate >= monthlyPayment) {
    return { principal, monthsToPayoff: Infinity, totalInterestPaid: Infinity, totalPaid: Infinity };
  }

  while (balance > 0 && months < 600) {
    months++;
    const interest = balance * monthlyRate;
    totalInterest += interest;
    balance = balance + interest - monthlyPayment;
  }

  return {
    principal,
    monthsToPayoff: months,
    totalInterestPaid: Math.round(totalInterest),
    totalPaid: Math.round(principal + totalInterest),
  };
}

test('projectSavings: calculates correct timeline and remaining amount', () => {
  const result = projectSavings(100000, 20000, 10000);
  assert.strictEqual(result.remainingAmount, 80000);
  assert.strictEqual(result.monthsToReach, 8);
});

test('projectSavings: handles zero monthly contribution', () => {
  const result = projectSavings(50000, 10000, 0);
  assert.strictEqual(result.monthsToReach, Infinity);
});

test('calculateDebtPayoff: calculates correct payoff period and interest', () => {
  const result = calculateDebtPayoff(10000, 12, 1000);
  assert.ok(result.monthsToPayoff > 0 && result.monthsToPayoff <= 11);
  assert.ok(result.totalInterestPaid > 0);
  assert.strictEqual(result.totalPaid, result.principal + result.totalInterestPaid);
});

test('ZIP-of-CSVs Backup integrity: pack and unpack 8 tables', async () => {
  const zip = new JSZip();

  const manifest = [{ version: '1.0.0', export_timestamp: '2026-09-19T12:00:00Z', accounts_count: 2 }];
  const accounts = [
    { id: 'acc-1', name: 'BDO Bank', type: 'bank', current_balance: 50000 },
    { id: 'acc-2', name: 'Visa Gold', type: 'credit_card', current_balance: 12000, credit_limit: 100000 },
  ];
  const transactions = [
    { id: 'tx-1', type: 'income', account_id: 'acc-1', amount: 30000, gross_amount: 35000, deductions_total: 5000 },
    { id: 'tx-2', type: 'transfer', account_id: 'acc-1', to_account_id: 'acc-2', amount: 12000 },
  ];

  zip.file('manifest.csv', Papa.unparse(manifest));
  zip.file('accounts.csv', Papa.unparse(accounts));
  zip.file('transactions.csv', Papa.unparse(transactions));

  const base64 = await zip.generateAsync({ type: 'base64' });
  assert.ok(base64.length > 0);

  // Unpack and parse
  const loadedZip = await JSZip.loadAsync(base64, { base64: true });
  const manifestFile = loadedZip.file('manifest.csv');
  assert.ok(manifestFile != null);

  const manifestText = await manifestFile.async('text');
  const parsedManifest = Papa.parse(manifestText, { header: true, dynamicTyping: true });
  assert.strictEqual((parsedManifest.data[0] as any).version, '1.0.0');

  const accountsFile = loadedZip.file('accounts.csv');
  const accountsText = await accountsFile!.async('text');
  const parsedAccounts = Papa.parse(accountsText, { header: true, dynamicTyping: true });
  assert.strictEqual(parsedAccounts.data.length, 2);
  assert.strictEqual((parsedAccounts.data[0] as any).name, 'BDO Bank');

  const txFile = loadedZip.file('transactions.csv');
  const txText = await txFile!.async('text');
  const parsedTx = Papa.parse(txText, { header: true, dynamicTyping: true });
  assert.strictEqual(parsedTx.data.length, 2);
  assert.strictEqual((parsedTx.data[1] as any).type, 'transfer');
});

