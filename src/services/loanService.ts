import { getDatabase } from '../database/db';
import { Loan, LoanStatus } from '../types/database';
import { createTransaction } from './ledgerService';

export async function getAllLoans(status?: LoanStatus): Promise<Loan[]> {
  const db = await getDatabase();
  const query = status
    ? 'SELECT * FROM loans WHERE status = ? ORDER BY due_date ASC'
    : 'SELECT * FROM loans ORDER BY (status = "active") DESC, due_date ASC';
  const params = status ? [status] : [];
  return await db.getAllAsync<Loan>(query, params);
}

export async function getLoanById(id: string): Promise<Loan | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<Loan>('SELECT * FROM loans WHERE id = ?', [id]);
}

export async function createLoan(loan: Omit<Loan, 'created_at'>): Promise<Loan> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const newLoan: Loan = {
    ...loan,
    created_at: now,
  };

  await db.runAsync(
    `INSERT INTO loans (
      id, title, lender_or_borrower, type, principal_amount,
      interest_rate, installment_amount, payment_frequency,
      start_date, due_date, remaining_balance, account_id,
      status, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newLoan.id,
      newLoan.title,
      newLoan.lender_or_borrower,
      newLoan.type,
      newLoan.principal_amount,
      newLoan.interest_rate,
      newLoan.installment_amount,
      newLoan.payment_frequency,
      newLoan.start_date,
      newLoan.due_date,
      newLoan.remaining_balance,
      newLoan.account_id ?? null,
      newLoan.status,
      newLoan.notes ?? '',
      newLoan.created_at,
    ]
  );

  return newLoan;
}

export async function updateLoan(loan: Partial<Loan> & { id: string }): Promise<void> {
  const db = await getDatabase();
  const existing = await getLoanById(loan.id);
  if (!existing) throw new Error('Loan not found');

  const remainingBalance = loan.remaining_balance ?? existing.remaining_balance;
  let status = loan.status ?? existing.status;
  if (remainingBalance <= 0 && status === 'active') {
    status = 'paid_off';
  }

  await db.runAsync(
    `UPDATE loans
     SET title = ?, lender_or_borrower = ?, type = ?, principal_amount = ?,
         interest_rate = ?, installment_amount = ?, payment_frequency = ?,
         start_date = ?, due_date = ?, remaining_balance = ?, account_id = ?,
         status = ?, notes = ?
     WHERE id = ?`,
    [
      loan.title ?? existing.title,
      loan.lender_or_borrower ?? existing.lender_or_borrower,
      loan.type ?? existing.type,
      loan.principal_amount ?? existing.principal_amount,
      loan.interest_rate ?? existing.interest_rate,
      loan.installment_amount ?? existing.installment_amount,
      loan.payment_frequency ?? existing.payment_frequency,
      loan.start_date ?? existing.start_date,
      loan.due_date ?? existing.due_date,
      remainingBalance,
      loan.account_id ?? existing.account_id ?? null,
      status,
      loan.notes ?? existing.notes ?? '',
      loan.id,
    ]
  );
}

export async function recordLoanRepayment(
  loanId: string,
  amount: number,
  sourceAccountId: string,
  notes?: string
): Promise<void> {
  const loan = await getLoanById(loanId);
  if (!loan) throw new Error('Loan not found');

  await createTransaction({
    type: 'expense',
    account_id: sourceAccountId,
    amount,
    date: new Date().toISOString().split('T')[0],
    notes: notes || `Repayment for loan: ${loan.title} (${loan.lender_or_borrower})`,
    expense_nature: 'obligation',
    linked_loan_id: loanId,
  });

  const updated = await getLoanById(loanId);
  if (updated && updated.remaining_balance <= 0 && updated.status === 'active') {
    await updateLoan({ id: loanId, status: 'paid_off' });
  }
}

export async function deleteLoan(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM loans WHERE id = ?', [id]);
}
