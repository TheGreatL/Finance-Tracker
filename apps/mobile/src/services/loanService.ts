import type * as SQLite from 'expo-sqlite';
import type {
  LoanRecord,
  LoanStatus,
  CreateLoanInput,
  RecordLoanPaymentInput,
} from '../types/database';

export async function createLoan(
  db: SQLite.SQLiteDatabase,
  input: CreateLoanInput
): Promise<LoanRecord> {
  const loanId = `loan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const remaining = input.remainingBalance ?? input.totalAmount;

  await db.runAsync(
    `INSERT INTO loans (
      id, institution_id, title, total_amount, remaining_balance, monthly_payment,
      due_date, interest_rate, attachment_path, attachment_name, status, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      loanId,
      input.institutionId,
      input.title.trim(),
      input.totalAmount,
      remaining,
      input.monthlyPayment,
      input.dueDate,
      input.interestRate ?? null,
      input.attachmentPath || '',
      input.attachmentName || '',
      'active',
      input.notes?.trim() || '',
      now,
      now,
    ]
  );

  return {
    id: loanId,
    institution_id: input.institutionId,
    title: input.title.trim(),
    total_amount: input.totalAmount,
    remaining_balance: remaining,
    monthly_payment: input.monthlyPayment,
    due_date: input.dueDate,
    interest_rate: input.interestRate ?? null,
    attachment_path: input.attachmentPath || '',
    attachment_name: input.attachmentName || '',
    status: 'active',
    notes: input.notes?.trim() || '',
    created_at: now,
    updated_at: now,
  };
}

export async function getActiveLoans(db: SQLite.SQLiteDatabase): Promise<LoanRecord[]> {
  return await db.getAllAsync<LoanRecord>(
    `SELECT
      l.*,
      i.name AS institution_name,
      i.code AS institution_code,
      i.color AS institution_color
    FROM loans l
    JOIN institutions i ON l.institution_id = i.id
    WHERE l.status = 'active'
    ORDER BY l.due_date ASC`
  );
}

export async function getAllLoans(db: SQLite.SQLiteDatabase): Promise<LoanRecord[]> {
  return await db.getAllAsync<LoanRecord>(
    `SELECT
      l.*,
      i.name AS institution_name,
      i.code AS institution_code,
      i.color AS institution_color
    FROM loans l
    JOIN institutions i ON l.institution_id = i.id
    ORDER BY l.status ASC, l.due_date ASC`
  );
}

export async function getLoansSummary(
  db: SQLite.SQLiteDatabase,
  referenceDate: Date = new Date()
): Promise<{
  totalLoanBalance: number;
  activeCount: number;
  nextDueLoan: LoanRecord | null;
  dueSoonCount: number;
}> {
  const activeLoans = await getActiveLoans(db);

  const totalLoanBalance = activeLoans.reduce((sum, loan) => sum + loan.remaining_balance, 0);
  const activeCount = activeLoans.length;
  const nextDueLoan = activeLoans.length > 0 ? activeLoans[0] : null;

  // Due within 7 days
  const sevenDaysLater = new Date(referenceDate);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  const dueSoonCount = activeLoans.filter((loan) => {
    const due = new Date(loan.due_date);
    return due.getTime() >= referenceDate.getTime() && due.getTime() <= sevenDaysLater.getTime();
  }).length;

  return {
    totalLoanBalance,
    activeCount,
    nextDueLoan,
    dueSoonCount,
  };
}

export async function recordLoanPayment(
  db: SQLite.SQLiteDatabase,
  input: RecordLoanPaymentInput
): Promise<void> {
  const now = new Date().toISOString();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  await db.withTransactionAsync(async () => {
    // 1. Fetch loan
    const loan = await db.getFirstAsync<LoanRecord>(
      'SELECT * FROM loans WHERE id = ?',
      [input.loanId]
    );
    if (!loan) {
      throw new Error('Loan not found');
    }

    // 2. Fetch pocket
    const pocket = await db.getFirstAsync<{ current_balance: number }>(
      'SELECT current_balance FROM account_pockets WHERE id = ?',
      [input.pocketId]
    );
    if (!pocket) {
      throw new Error('Payment source pocket not found');
    }

    const newPocketBalance = pocket.current_balance - input.amount;
    const newLoanBalance = Math.max(0, loan.remaining_balance - input.amount);
    const newStatus: LoanStatus = newLoanBalance <= 0 ? 'paid' : 'active';

    // 3. Update pocket balance
    await db.runAsync(
      'UPDATE account_pockets SET current_balance = ?, updated_at = ? WHERE id = ?',
      [newPocketBalance, now, input.pocketId]
    );

    // 4. Update loan remaining balance and status
    await db.runAsync(
      'UPDATE loans SET remaining_balance = ?, status = ?, updated_at = ? WHERE id = ?',
      [newLoanBalance, newStatus, now, input.loanId]
    );

    // 5. Insert transaction into ledger
    const txTitle = `Loan Payment: ${loan.title}`;
    const txNotes = input.notes?.trim() || `Payment for ${loan.title}`;

    await db.runAsync(
      `INSERT INTO transactions (
        id, title, pocket_id, to_pocket_id, type, amount, category, date, notes, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, 'expense', ?, ?, ?, ?, ?, ?)`,
      [
        txId,
        txTitle,
        input.pocketId,
        input.amount,
        'Loan Payment',
        input.date || now.split('T')[0],
        txNotes,
        now,
        now,
      ]
    );
  });
}

export async function deleteLoan(db: SQLite.SQLiteDatabase, loanId: string): Promise<void> {
  await db.runAsync('DELETE FROM loans WHERE id = ?', [loanId]);
}
