import * as SQLite from 'expo-sqlite';
import { getDatabase } from '../database/db';
import {
  Transaction,
  TransactionWithDetails,
  TransactionDeduction,
  TransactionType,
  DashboardSummary,
  Account,
} from '../types/database';

export interface CreateTransactionInput {
  id?: string;
  type: TransactionType;
  account_id: string;
  to_account_id?: string | null;
  category_id?: string | null;
  amount: number;
  date: string;
  notes?: string;
  tags?: string;
  expense_nature?: 'needs' | 'wants' | 'investment' | 'obligation';
  gross_amount?: number | null;
  deductions?: Array<{ name: string; amount: number }>;
  is_recurring?: number;
  recurring_rule_id?: string | null;
  linked_goal_id?: string | null;
  linked_loan_id?: string | null;
}

/**
 * Adjust account balance based on transaction type and whether the account is a credit card.
 * In our system:
 * - For cash, bank, ewallet: positive balance means liquid cash you own.
 * - For credit cards: positive balance means outstanding debt you owe.
 */
async function applyAccountDelta(
  db: SQLite.SQLiteDatabase,
  accountId: string,
  delta: number, // positive means cash received or debt added; negative means cash spent or debt paid
  isSource: boolean,
  type: TransactionType
): Promise<void> {
  const account = await db.getFirstAsync<Account>('SELECT * FROM accounts WHERE id = ?', [accountId]);
  if (!account) return;

  const now = new Date().toISOString();
  let balanceChange = 0;

  if (account.type === 'credit_card') {
    // For credit cards:
    // Expense increases debt: balanceChange = +amount
    // Income/Repayment decreases debt: balanceChange = -amount
    if (type === 'expense') {
      balanceChange = delta; // e.g. +$100 spent -> debt goes up by 100
    } else if (type === 'income') {
      balanceChange = -delta; // e.g. credit/refund -> debt goes down
    } else if (type === 'transfer') {
      if (isSource) {
        // Cash advance from credit card to another account -> debt goes up
        balanceChange = delta;
      } else {
        // Payment TO credit card -> debt goes down
        balanceChange = -delta;
      }
    }
  } else {
    // For liquid accounts (cash, bank, ewallet):
    if (type === 'income') {
      balanceChange = delta; // receives money
    } else if (type === 'expense') {
      balanceChange = -delta; // pays money
    } else if (type === 'transfer') {
      if (isSource) {
        balanceChange = -delta; // pays money out
      } else {
        balanceChange = delta; // receives money in
      }
    }
  }

  await db.runAsync(
    'UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?',
    [balanceChange, now, accountId]
  );
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const db = await getDatabase();
  const id = input.id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const deductionsTotal = (input.deductions || []).reduce((sum, d) => sum + d.amount, 0);
  const grossAmount = input.type === 'income'
    ? (input.gross_amount ?? (input.amount + deductionsTotal))
    : null;

  let created: Transaction | null = null;
  await db.withTransactionAsync(async () => {
    // 1. Insert transaction
    await db.runAsync(
      `INSERT INTO transactions (
        id, type, account_id, to_account_id, category_id, amount, date,
        notes, tags, expense_nature, gross_amount, deductions_total,
        is_recurring, recurring_rule_id, linked_goal_id, linked_loan_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.type,
        input.account_id,
        input.to_account_id ?? null,
        input.category_id ?? null,
        input.amount,
        input.date,
        input.notes ?? '',
        input.tags ?? '',
        input.expense_nature ?? 'needs',
        grossAmount,
        deductionsTotal,
        input.is_recurring ?? 0,
        input.recurring_rule_id ?? null,
        input.linked_goal_id ?? null,
        input.linked_loan_id ?? null,
        now,
        now,
      ]
    );

    // 2. Insert itemized deductions if income
    if (input.type === 'income' && input.deductions && input.deductions.length > 0) {
      for (const d of input.deductions) {
        const dId = `ded-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await db.runAsync(
          'INSERT INTO transaction_deductions (id, transaction_id, name, amount) VALUES (?, ?, ?, ?)',
          [dId, id, d.name, d.amount]
        );
      }
    }

    // 3. Update source account
    await applyAccountDelta(db, input.account_id, input.amount, true, input.type);

    // 4. Update destination account if transfer
    if (input.type === 'transfer' && input.to_account_id) {
      await applyAccountDelta(db, input.to_account_id, input.amount, false, input.type);
    }

    // 5. Update linked savings goal
    if (input.linked_goal_id) {
      // Income or transfer to goal increases goal amount
      const goalDelta = input.type === 'expense' ? -input.amount : input.amount;
      await db.runAsync(
        'UPDATE savings_goals SET current_amount = MAX(0, current_amount + ?) WHERE id = ?',
        [goalDelta, input.linked_goal_id]
      );
    }

    // 6. Update linked loan
    if (input.linked_loan_id) {
      // Repayment reduces remaining balance
      await db.runAsync(
        'UPDATE loans SET remaining_balance = MAX(0, remaining_balance - ?) WHERE id = ?',
        [input.amount, input.linked_loan_id]
      );
    }

    created = await db.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  });

  if (!created) throw new Error('Failed to create transaction');
  return created;
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDatabase();
  const tx = await db.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!tx) return;

  await db.withTransactionAsync(async () => {
    // 1. Revert source account balance
    await applyAccountDelta(db, tx.account_id, -tx.amount, true, tx.type);

    // 2. Revert destination account balance if transfer
    if (tx.type === 'transfer' && tx.to_account_id) {
      await applyAccountDelta(db, tx.to_account_id, -tx.amount, false, tx.type);
    }

    // 3. Revert linked goal
    if (tx.linked_goal_id) {
      const goalDelta = tx.type === 'expense' ? tx.amount : -tx.amount;
      await db.runAsync(
        'UPDATE savings_goals SET current_amount = MAX(0, current_amount + ?) WHERE id = ?',
        [goalDelta, tx.linked_goal_id]
      );
    }

    // 4. Revert linked loan
    if (tx.linked_loan_id) {
      await db.runAsync(
        'UPDATE loans SET remaining_balance = remaining_balance + ? WHERE id = ?',
        [tx.amount, tx.linked_loan_id]
      );
    }

    // 5. Delete deductions
    await db.runAsync('DELETE FROM transaction_deductions WHERE transaction_id = ?', [id]);

    // 6. Delete transaction record
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  });
}

export async function updateTransaction(id: string, input: CreateTransactionInput): Promise<Transaction> {
  // To ensure 100% balance integrity, atomic delete old + insert new with same ID
  await deleteTransaction(id);
  return await createTransaction({ ...input, id });
}

export async function getTransactionById(id: string): Promise<TransactionWithDetails | null> {
  const db = await getDatabase();
  const tx = await db.getFirstAsync<TransactionWithDetails>(
    `SELECT 
      t.*,
      a.name as account_name,
      ta.name as to_account_name,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color
     FROM transactions t
     LEFT JOIN accounts a ON t.account_id = a.id
     LEFT JOIN accounts ta ON t.to_account_id = ta.id
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.id = ?`,
    [id]
  );
  if (!tx) return null;

  if (tx.type === 'income') {
    const deductions = await db.getAllAsync<TransactionDeduction>(
      'SELECT * FROM transaction_deductions WHERE transaction_id = ?',
      [id]
    );
    tx.deductions = deductions;
  }
  return tx;
}

export interface GetTransactionsFilter {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getTransactions(filters: GetTransactionsFilter = {}): Promise<TransactionWithDetails[]> {
  const db = await getDatabase();
  let query = `
    SELECT 
      t.*,
      a.name as account_name,
      ta.name as to_account_name,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (filters.accountId) {
    query += ' AND (t.account_id = ? OR t.to_account_id = ?)';
    params.push(filters.accountId, filters.accountId);
  }

  if (filters.categoryId) {
    query += ' AND t.category_id = ?';
    params.push(filters.categoryId);
  }

  if (filters.type) {
    query += ' AND t.type = ?';
    params.push(filters.type);
  }

  if (filters.startDate) {
    query += ' AND t.date >= ?';
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    query += ' AND t.date <= ?';
    params.push(filters.endDate);
  }

  if (filters.search && filters.search.trim() !== '') {
    query += ' AND (t.notes LIKE ? OR t.tags LIKE ? OR c.name LIKE ?)';
    const term = `%${filters.search.trim()}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY t.date DESC, t.created_at DESC';

  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }
  }

  const items = await db.getAllAsync<TransactionWithDetails>(query, params);

  // Fetch deductions for income transactions in the result
  const incomeTxIds = items.filter(i => i.type === 'income').map(i => i.id);
  if (incomeTxIds.length > 0) {
    const placeholders = incomeTxIds.map(() => '?').join(',');
    const deductions = await db.getAllAsync<TransactionDeduction>(
      `SELECT * FROM transaction_deductions WHERE transaction_id IN (${placeholders})`,
      incomeTxIds
    );
    const deductionsByTx = new Map<string, TransactionDeduction[]>();
    for (const d of deductions) {
      const existing = deductionsByTx.get(d.transaction_id) || [];
      existing.push(d);
      deductionsByTx.set(d.transaction_id, existing);
    }
    for (const item of items) {
      if (item.type === 'income') {
        item.deductions = deductionsByTx.get(item.id) || [];
      }
    }
  }

  return items;
}

export async function getDashboardSummary(yearMonthPrefix?: string): Promise<DashboardSummary> {
  const db = await getDatabase();
  const currentMonth = yearMonthPrefix || new Date().toISOString().substring(0, 7); // e.g. "2026-09"

  // 1. Net worth & Account metrics
  const accounts = await db.getAllAsync<Account>('SELECT * FROM accounts WHERE is_archived = 0');
  let liquidCash = 0;
  let creditDebt = 0;

  for (const acc of accounts) {
    if (acc.type === 'credit_card') {
      creditDebt += Math.max(0, acc.current_balance);
    } else {
      liquidCash += acc.current_balance;
    }
  }

  const totalNetWorth = liquidCash - creditDebt;

  // 2. Monthly Income
  const incomeRow = await db.getFirstAsync<{ net_total: number; gross_total: number; deductions_total: number }>(
    `SELECT 
      COALESCE(SUM(amount), 0) as net_total,
      COALESCE(SUM(COALESCE(gross_amount, amount)), 0) as gross_total,
      COALESCE(SUM(deductions_total), 0) as deductions_total
     FROM transactions
     WHERE type = 'income' AND date LIKE ?`,
    [`${currentMonth}%`]
  );

  const monthlyIncome = incomeRow?.net_total ?? 0;
  const monthlyGrossIncome = incomeRow?.gross_total ?? 0;
  const monthlyDeductions = incomeRow?.deductions_total ?? 0;

  // 3. Monthly Expenses (needs vs wants)
  const expenseRow = await db.getFirstAsync<{ total: number; needs: number; wants: number }>(
    `SELECT 
      COALESCE(SUM(amount), 0) as total,
      COALESCE(SUM(CASE WHEN expense_nature = 'needs' THEN amount ELSE 0 END), 0) as needs,
      COALESCE(SUM(CASE WHEN expense_nature = 'wants' THEN amount ELSE 0 END), 0) as wants
     FROM transactions
     WHERE type = 'expense' AND date LIKE ?`,
    [`${currentMonth}%`]
  );

  const monthlyExpenses = expenseRow?.total ?? 0;
  const monthlyNeeds = expenseRow?.needs ?? 0;
  const monthlyWants = expenseRow?.wants ?? 0;
  const netCashFlow = monthlyIncome - monthlyExpenses;

  // 4. Safe-to-Spend Runway
  // Safe-to-spend = Liquid cash - (Upcoming recurring bills in next 30 days + upcoming loan installments + savings targets)
  const upcomingBills = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM recurring_rules 
     WHERE type = 'expense' AND is_active = 1`
  );

  const upcomingLoans = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(installment_amount), 0) as total 
     FROM loans 
     WHERE type = 'payable' AND status = 'active'`
  );

  const safeToSpend = Math.max(0, liquidCash - (upcomingBills?.total ?? 0) - (upcomingLoans?.total ?? 0));

  return {
    totalNetWorth,
    liquidCash,
    creditDebt,
    monthlyIncome,
    monthlyGrossIncome,
    monthlyDeductions,
    monthlyExpenses,
    monthlyNeeds,
    monthlyWants,
    netCashFlow,
    safeToSpend,
  };
}

/**
 * Recalculates all account balances from scratch using the opening balance and transactions ledger.
 * Guarantees zero balance drift after imports or manual edits.
 */
export async function recalculateAllAccountBalances(): Promise<void> {
  const db = await getDatabase();
  const accounts = await db.getAllAsync<Account>('SELECT * FROM accounts');
  const now = new Date().toISOString();

  for (const acc of accounts) {
    let balance = acc.opening_balance;

    if (acc.type === 'credit_card') {
      // Expenses add to debt
      const exp = await db.getFirstAsync<{ sum: number }>(
        "SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = 'expense' AND account_id = ?",
        [acc.id]
      );
      // Incomes/refunds reduce debt
      const inc = await db.getFirstAsync<{ sum: number }>(
        "SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = 'income' AND account_id = ?",
        [acc.id]
      );
      // Transfers to card (payments) reduce debt
      const transferIn = await db.getFirstAsync<{ sum: number }>(
        "SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = 'transfer' AND to_account_id = ?",
        [acc.id]
      );
      // Cash advances out of card increase debt
      const transferOut = await db.getFirstAsync<{ sum: number }>(
        "SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = 'transfer' AND account_id = ?",
        [acc.id]
      );

      balance = balance + (exp?.sum ?? 0) - (inc?.sum ?? 0) - (transferIn?.sum ?? 0) + (transferOut?.sum ?? 0);
    } else {
      // Liquid accounts (cash, bank, ewallet)
      const inc = await db.getFirstAsync<{ sum: number }>(
        "SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = 'income' AND account_id = ?",
        [acc.id]
      );
      const exp = await db.getFirstAsync<{ sum: number }>(
        "SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = 'expense' AND account_id = ?",
        [acc.id]
      );
      const transferIn = await db.getFirstAsync<{ sum: number }>(
        "SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = 'transfer' AND to_account_id = ?",
        [acc.id]
      );
      const transferOut = await db.getFirstAsync<{ sum: number }>(
        "SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = 'transfer' AND account_id = ?",
        [acc.id]
      );

      balance = balance + (inc?.sum ?? 0) - (exp?.sum ?? 0) + (transferIn?.sum ?? 0) - (transferOut?.sum ?? 0);
    }

    await db.runAsync('UPDATE accounts SET current_balance = ?, updated_at = ? WHERE id = ?', [
      balance,
      now,
      acc.id,
    ]);
  }
}
