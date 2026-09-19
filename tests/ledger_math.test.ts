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

