import type * as SQLite from 'expo-sqlite';
import type { LoanRecord, LoanStatus, LenderType, CreateLoanInput, RecordLoanPaymentInput, UpdateLoanMetadataInput } from '../types/database';
import { getInstitutionConfig } from '../constants/institutions';

export type { UpdateLoanMetadataInput };

async function resolveOrCreateInstitutionId(db: SQLite.SQLiteDatabase, institutionIdOrCode: string, now: string): Promise<string> {
    // If db does not have getFirstAsync (e.g. minimalist unit test mock), return as is
    if (typeof db.getFirstAsync !== 'function') {
        return institutionIdOrCode;
    }

    // 1. Check if it's already an exact ID in institutions
    const existingById = await db.getFirstAsync<{ id: string }>('SELECT id FROM institutions WHERE id = ? LIMIT 1;', [institutionIdOrCode]);
    if (existingById) {
        return existingById.id;
    }

    // 2. Check if an institution exists with this code
    const existingByCode = await db.getFirstAsync<{ id: string }>('SELECT id FROM institutions WHERE code = ? LIMIT 1;', [institutionIdOrCode]);
    if (existingByCode) {
        return existingByCode.id;
    }

    // 3. Auto-create institution for this provider config so Foreign Key constraint succeeds
    const config = getInstitutionConfig(institutionIdOrCode);
    const newInstId = `inst_${config.code}_${Date.now()}`;
    await db.runAsync(
        `INSERT INTO institutions (id, name, type, code, color, icon, notes, is_archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, '', 0, ?, ?)`,
        [newInstId, config.name, config.type, config.code, config.color, config.icon, now, now]
    );
    return newInstId;
}

export async function createLoan(db: SQLite.SQLiteDatabase, input: CreateLoanInput): Promise<LoanRecord> {
    const loanId = `loan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const remaining = input.remainingBalance ?? input.totalAmount;
    const lenderType: LenderType = input.lenderType || 'institution';
    const lenderName = input.lenderName?.trim() || '';

    // Resolve institution id if provided or if institutional loan
    let resolvedInstitutionId: string | null = null;
    if (input.institutionId) {
        resolvedInstitutionId = await resolveOrCreateInstitutionId(db, input.institutionId, now);
    }

    const principalAmount = input.principalAmount !== undefined && input.principalAmount !== null ? input.principalAmount : input.totalAmount;
    const processingFee = input.processingFee ?? 0.0;
    const startDate = input.startDate || null;
    const termMonths = input.termMonths ?? null;
    const hasInterestCashback = input.hasInterestCashback ? 1 : 0;

    await db.runAsync(
        `INSERT INTO loans (
      id, lender_type, lender_name, institution_id, title, principal_amount, processing_fee,
      total_amount, remaining_balance, monthly_payment, start_date, due_date, term_months,
      interest_rate, has_interest_cashback, interest_cashback_received, attachment_path,
      attachment_name, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, ?, ?, ?, ?)`,
        [
            loanId,
            lenderType,
            lenderName,
            resolvedInstitutionId,
            input.title.trim(),
            principalAmount,
            processingFee,
            input.totalAmount,
            remaining,
            input.monthlyPayment,
            startDate,
            input.dueDate,
            termMonths,
            input.interestRate ?? null,
            hasInterestCashback,
            input.attachmentPath || '',
            input.attachmentName || '',
            'active',
            input.notes?.trim() || '',
            now,
            now
        ]
    );

    // Disburse loan cash proceeds into designated pocket if selected
    if (input.disburseToPocketId) {
        const pocket =
            typeof db.getFirstAsync === 'function'
                ? await db.getFirstAsync<{ id: string; current_balance: number }>('SELECT id, current_balance FROM account_pockets WHERE id = ?;', [
                      input.disburseToPocketId
                  ])
                : null;
        if (pocket) {
            const netDisbursed = Math.max(0, (principalAmount || input.totalAmount) - processingFee);
            if (netDisbursed > 0) {
                const newPocketBalance = Math.round((pocket.current_balance + netDisbursed) * 100) / 100;
                await db.runAsync('UPDATE account_pockets SET current_balance = ?, updated_at = ? WHERE id = ?', [
                    newPocketBalance,
                    now,
                    input.disburseToPocketId
                ]);
                const txDisbId = `tx_disb_${loanId}`;
                await db.runAsync(
                    `INSERT INTO transactions (
            id, title, pocket_id, to_pocket_id, type, amount, category, date, notes, created_at, updated_at
          ) VALUES (?, ?, ?, NULL, 'income', ?, 'Loan Disbursement', ?, ?, ?, ?)`,
                    [
                        txDisbId,
                        `Loan Proceeds: ${input.title.trim()}`,
                        input.disburseToPocketId,
                        netDisbursed,
                        startDate || input.dueDate || now.split('T')[0],
                        input.notes?.trim() || `Disbursed loan proceeds for ${input.title.trim()}`,
                        now,
                        now
                    ]
                );
            }
        }
    }

    return {
        id: loanId,
        lender_type: lenderType,
        lender_name: lenderName,
        institution_id: resolvedInstitutionId,
        title: input.title.trim(),
        principal_amount: principalAmount,
        processing_fee: processingFee,
        total_amount: input.totalAmount,
        remaining_balance: remaining,
        monthly_payment: input.monthlyPayment,
        start_date: startDate,
        due_date: input.dueDate,
        term_months: termMonths,
        interest_rate: input.interestRate ?? null,
        has_interest_cashback: hasInterestCashback,
        interest_cashback_received: 0,
        attachment_path: input.attachmentPath || '',
        attachment_name: input.attachmentName || '',
        status: 'active',
        notes: input.notes?.trim() || '',
        created_at: now,
        updated_at: now
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
    LEFT JOIN institutions i ON l.institution_id = i.id
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
    LEFT JOIN institutions i ON l.institution_id = i.id
    ORDER BY l.status ASC, l.due_date ASC`
    );
}

export async function getLoanById(db: SQLite.SQLiteDatabase, id: string): Promise<LoanRecord | null> {
    return await db.getFirstAsync<LoanRecord>(
        `SELECT
      l.*,
      i.name AS institution_name,
      i.code AS institution_code,
      i.color AS institution_color
    FROM loans l
    LEFT JOIN institutions i ON l.institution_id = i.id
    WHERE l.id = ?
    LIMIT 1`,
        [id]
    );
}

export async function getLoansByInstitution(db: SQLite.SQLiteDatabase, institutionId?: string | null): Promise<LoanRecord[]> {
    if (!institutionId) {
        return await db.getAllAsync<LoanRecord>(
            `SELECT
          l.*,
          i.name AS institution_name,
          i.code AS institution_code,
          i.color AS institution_color
        FROM loans l
        LEFT JOIN institutions i ON l.institution_id = i.id
        WHERE l.institution_id IS NULL
        ORDER BY l.status ASC, l.due_date ASC`
        );
    }
    return await db.getAllAsync<LoanRecord>(
        `SELECT
      l.*,
      i.name AS institution_name,
      i.code AS institution_code,
      i.color AS institution_color
    FROM loans l
    LEFT JOIN institutions i ON l.institution_id = i.id
    WHERE l.institution_id = ?
    ORDER BY l.status ASC, l.due_date ASC`,
        [institutionId]
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
        dueSoonCount
    };
}

export async function recordLoanPayment(db: SQLite.SQLiteDatabase, input: RecordLoanPaymentInput): Promise<void> {
    const now = new Date().toISOString();
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db.withTransactionAsync(async () => {
        // 1. Fetch loan
        const loan = await db.getFirstAsync<LoanRecord>('SELECT * FROM loans WHERE id = ?', [input.loanId]);
        if (!loan) {
            throw new Error('Loan not found');
        }

        // 2. Fetch pocket
        const pocket = await db.getFirstAsync<{ current_balance: number }>('SELECT current_balance FROM account_pockets WHERE id = ?', [
            input.pocketId
        ]);
        if (!pocket) {
            throw new Error('Payment source pocket not found');
        }

        const newPocketBalance = pocket.current_balance - input.amount;
        const newLoanBalance = Math.max(0, loan.remaining_balance - input.amount);
        const newStatus: LoanStatus = newLoanBalance <= 0 ? 'paid' : 'active';

        // 3. Update pocket balance
        await db.runAsync('UPDATE account_pockets SET current_balance = ?, updated_at = ? WHERE id = ?', [newPocketBalance, now, input.pocketId]);

        // 4. Update loan remaining balance and status
        await db.runAsync('UPDATE loans SET remaining_balance = ?, status = ?, updated_at = ? WHERE id = ?', [
            newLoanBalance,
            newStatus,
            now,
            input.loanId
        ]);

        // 5. Insert transaction into ledger
        const txTitle = `Loan Payment: ${loan.title}`;
        const txNotes = input.notes?.trim() || `Payment for ${loan.title}`;

        await db.runAsync(
            `INSERT INTO transactions (
        id, title, pocket_id, to_pocket_id, type, amount, category, date, notes, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, 'expense', ?, ?, ?, ?, ?, ?)`,
            [txId, txTitle, input.pocketId, input.amount, 'Loan Payment', input.date || now.split('T')[0], txNotes, now, now]
        );

        // 6. Handle interest cashback on early full payoff
        if (input.interestCashback && input.interestCashback > 0) {
            const balanceWithCashback = newPocketBalance + input.interestCashback;
            await db.runAsync('UPDATE account_pockets SET current_balance = ?, updated_at = ? WHERE id = ?', [
                balanceWithCashback,
                now,
                input.pocketId
            ]);
            await db.runAsync('UPDATE loans SET interest_cashback_received = interest_cashback_received + ?, updated_at = ? WHERE id = ?', [
                input.interestCashback,
                now,
                input.loanId
            ]);

            const cashbackTxId = `tx_cb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            await db.runAsync(
                `INSERT INTO transactions (
            id, title, pocket_id, to_pocket_id, type, amount, category, date, notes, created_at, updated_at
          ) VALUES (?, ?, ?, NULL, 'income', ?, ?, ?, ?, ?, ?)`,
                [
                    cashbackTxId,
                    `Loan Interest Cashback: ${loan.title}`,
                    input.pocketId,
                    input.interestCashback,
                    'Loan Cashback',
                    input.date || now.split('T')[0],
                    `Interest cashback for early payoff of ${loan.title}`,
                    now,
                    now
                ]
            );
        }
    });
}

export async function deleteLoan(db: SQLite.SQLiteDatabase, loanId: string): Promise<void> {
    await db.runAsync('DELETE FROM loans WHERE id = ?', [loanId]);
}

/**
 * Updates descriptive metadata and terms for a loan.
 * Original remaining balance is protected and only modified through recordLoanPayment.
 */
export async function updateLoanMetadata(db: SQLite.SQLiteDatabase, loanId: string, input: UpdateLoanMetadataInput): Promise<void> {
    const existing = await db.getFirstAsync<LoanRecord>('SELECT * FROM loans WHERE id = ?', [loanId]);
    if (!existing) {
        throw new Error('Loan not found');
    }

    const now = new Date().toISOString();
    let institutionId = existing.institution_id ?? null;
    if (input.institutionId !== undefined) {
        if (input.institutionId) {
            institutionId = await resolveOrCreateInstitutionId(db, input.institutionId, now);
        } else {
            institutionId = null;
        }
    }

    const title = input.title !== undefined ? input.title.trim() : existing.title;
    const lenderType: LenderType = input.lenderType !== undefined ? input.lenderType : existing.lender_type || 'institution';
    const lenderName = (input.lenderName !== undefined ? input.lenderName.trim() : existing.lender_name) ?? null;
    const principalAmount = (input.principalAmount !== undefined ? input.principalAmount : existing.principal_amount) ?? null;
    const processingFee = (input.processingFee !== undefined ? input.processingFee : existing.processing_fee) ?? 0;
    const startDate = (input.startDate !== undefined ? input.startDate : existing.start_date) ?? null;
    const termMonths = (input.termMonths !== undefined ? input.termMonths : existing.term_months) ?? null;
    const dueDate = input.dueDate !== undefined ? input.dueDate.trim() : existing.due_date;
    const monthlyPayment = input.monthlyPayment !== undefined ? input.monthlyPayment : existing.monthly_payment;
    const interestRate = (input.interestRate !== undefined ? input.interestRate : existing.interest_rate) ?? null;
    const hasInterestCashback = input.hasInterestCashback !== undefined ? (input.hasInterestCashback ? 1 : 0) : existing.has_interest_cashback || 0;
    const notes = (input.notes !== undefined ? input.notes.trim() : existing.notes) ?? null;
    const attachmentPath = (input.attachmentPath !== undefined ? input.attachmentPath : existing.attachment_path) ?? null;
    const attachmentName = (input.attachmentName !== undefined ? input.attachmentName : existing.attachment_name) ?? null;

    await db.runAsync(
        `UPDATE loans 
     SET title = ?, lender_type = ?, lender_name = ?, institution_id = ?, principal_amount = ?, processing_fee = ?,
         start_date = ?, term_months = ?, due_date = ?, monthly_payment = ?, interest_rate = ?, has_interest_cashback = ?,
         notes = ?, attachment_path = ?, attachment_name = ?, updated_at = ? 
     WHERE id = ?`,
        [
            title,
            lenderType,
            lenderName,
            institutionId,
            principalAmount,
            processingFee,
            startDate,
            termMonths,
            dueDate,
            monthlyPayment,
            interestRate,
            hasInterestCashback,
            notes,
            attachmentPath,
            attachmentName,
            now,
            loanId
        ]
    );
}

export interface LoanTimelineMetrics {
    principalAmount: number;
    processingFee: number;
    netProceeds: number;
    totalInterest: number;
    projectedMaturityDate: string | null;
    elapsedMonths: number | null;
    remainingMonths: number | null;
    termProgressPercent: number | null;
    financialProgressPercent: number;
    isEligibleForEarlyCashback: boolean;
    hasTimeline: boolean;
}

export function getLoanTimelineMetrics(loan: LoanRecord, referenceDate: Date = new Date()): LoanTimelineMetrics {
    const principal = loan.principal_amount ?? loan.total_amount;
    const fee = loan.processing_fee || 0;
    const netProceeds = Math.max(0, principal - fee);
    const totalInterest = Math.max(0, loan.total_amount - principal);

    const paidAmount = Math.max(0, loan.total_amount - loan.remaining_balance);
    const financialProgressPercent = loan.total_amount > 0 ? Math.min(100, Math.max(0, Math.round((paidAmount / loan.total_amount) * 100))) : 0;

    let projectedMaturityDate: string | null = null;
    let elapsedMonths: number | null = null;
    let remainingMonths: number | null = null;
    let termProgressPercent: number | null = null;
    let isEligibleForEarlyCashback = false;

    if (loan.start_date && loan.term_months && loan.term_months > 0) {
        const parts = loan.start_date.split('-');
        if (parts.length === 3) {
            const sy = parseInt(parts[0], 10);
            const sm = parseInt(parts[1], 10);
            const sd = parseInt(parts[2], 10);

            if (!isNaN(sy) && !isNaN(sm) && !isNaN(sd)) {
                const matDate = new Date(sy, sm - 1 + loan.term_months, sd);
                const pad = (n: number) => String(n).padStart(2, '0');
                projectedMaturityDate = `${matDate.getFullYear()}-${pad(matDate.getMonth() + 1)}-${pad(matDate.getDate())}`;

                const refY = referenceDate.getFullYear();
                const refM = referenceDate.getMonth();
                const monthsPassed = (refY - sy) * 12 + (refM - (sm - 1));
                elapsedMonths = Math.min(loan.term_months, Math.max(0, monthsPassed));
                remainingMonths = Math.max(0, loan.term_months - elapsedMonths);
                termProgressPercent = Math.min(100, Math.max(0, Math.round((elapsedMonths / loan.term_months) * 100)));

                if (loan.has_interest_cashback && loan.remaining_balance > 0 && remainingMonths >= 1) {
                    isEligibleForEarlyCashback = true;
                }
            }
        }
    } else if (loan.term_months && loan.term_months > 0) {
        if (loan.monthly_payment > 0) {
            remainingMonths = Math.min(loan.term_months, Math.ceil(loan.remaining_balance / loan.monthly_payment));
            elapsedMonths = Math.max(0, loan.term_months - remainingMonths);
            termProgressPercent = Math.min(100, Math.max(0, Math.round((elapsedMonths / loan.term_months) * 100)));
        }
    }

    return {
        principalAmount: principal,
        processingFee: fee,
        netProceeds,
        totalInterest,
        projectedMaturityDate,
        elapsedMonths,
        remainingMonths,
        termProgressPercent,
        financialProgressPercent,
        isEligibleForEarlyCashback,
        hasTimeline: Boolean(loan.start_date || loan.term_months)
    };
}

export type InstallmentStatus = 'paid' | 'partially_paid' | 'upcoming';

export interface InstallmentItem {
    index: number;
    dueDate: string;
    scheduledAmount: number;
    amountPaid: number;
    remainingDue: number;
    status: InstallmentStatus;
    isSettledEarly: boolean;
    advanceCredit?: number;
}

export interface LoanInstallmentSchedule {
    totalTermMonths: number;
    installments: InstallmentItem[];
    activeInstallment: InstallmentItem | null;
    settledCount: number;
    upcomingCount: number;
    totalPaid: number;
    remainingDebt: number;
}

export function calculateLoanInstallmentSchedule(loan: LoanRecord, referenceDate: Date = new Date()): LoanInstallmentSchedule {
    const isFullyPaid = loan.status === 'paid' || (loan.remaining_balance !== undefined && loan.remaining_balance <= 0.009);
    const termMonths = loan.term_months ?? 0;
    const nominalMonthly = loan.monthly_payment ?? 0;

    const contractTotal = Math.max(
        loan.total_amount,
        termMonths > 0 && nominalMonthly > 0 ? Math.round(nominalMonthly * termMonths * 100) / 100 : loan.total_amount
    );
    const totalPaid = isFullyPaid ? contractTotal : Math.max(0, Math.round((contractTotal - Math.max(0, loan.remaining_balance)) * 100) / 100);

    if (termMonths <= 0 || nominalMonthly <= 0) {
        return {
            totalTermMonths: 0,
            installments: [],
            activeInstallment: null,
            settledCount: 0,
            upcomingCount: 0,
            totalPaid,
            remainingDebt: isFullyPaid ? 0 : loan.remaining_balance
        };
    }

    const installments: InstallmentItem[] = [];
    let unallocatedCash = isFullyPaid ? contractTotal : totalPaid;
    let settledCount = 0;
    let upcomingCount = 0;

    const pad = (n: number) => String(n).padStart(2, '0');
    const refDateStr = `${referenceDate.getFullYear()}-${pad(referenceDate.getMonth() + 1)}-${pad(referenceDate.getDate())}`;

    let baseYear = referenceDate.getFullYear();
    let baseMonth = referenceDate.getMonth();
    let baseDay = 12;
    let hasStartDate = false;

    if (loan.start_date) {
        const parts = loan.start_date.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const d = parseInt(parts[2], 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                baseYear = y;
                baseMonth = m - 1;
                baseDay = d;
                hasStartDate = true;
            }
        }
    }

    if (!hasStartDate && loan.due_date) {
        const parts = loan.due_date.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const d = parseInt(parts[2], 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                baseYear = y;
                baseMonth = m - 1; // Month 1 due date
                baseDay = d;
            }
        }
    }

    for (let i = 1; i <= termMonths; i++) {
        // If hasStartDate, month 1 is baseMonth + 1; otherwise baseMonth is month 1
        const targetMonthOffset = hasStartDate ? i : i - 1;
        const targetMonth = baseMonth + targetMonthOffset;
        const tempDate = new Date(baseYear, targetMonth + 1, 0);
        const day = Math.min(baseDay, tempDate.getDate());
        const instDate = new Date(baseYear, targetMonth, day);
        const dueDateStr = `${instDate.getFullYear()}-${pad(instDate.getMonth() + 1)}-${pad(instDate.getDate())}`;

        // Scheduled amount handling for last installment rounding
        let scheduledAmount = Math.round(loan.monthly_payment * 100) / 100;
        if (i === termMonths && loan.total_amount > 0) {
            const prevTotal = Math.round(loan.monthly_payment * (termMonths - 1) * 100) / 100;
            const lastScheduled = Math.max(0, Math.round((loan.total_amount - prevTotal) * 100) / 100);
            if (Math.abs(lastScheduled - loan.monthly_payment) < 1.0) {
                scheduledAmount = lastScheduled;
            }
        }

        let amountPaid: number;
        let remainingDue: number;
        let status: InstallmentStatus;
        let advanceCredit: number | undefined;

        if (isFullyPaid) {
            status = 'paid';
            amountPaid = scheduledAmount;
            remainingDue = 0;
            settledCount++;
        } else if (unallocatedCash >= scheduledAmount - 0.009) {
            status = 'paid';
            amountPaid = scheduledAmount;
            remainingDue = 0;
            unallocatedCash = Math.max(0, Math.round((unallocatedCash - scheduledAmount) * 100) / 100);
            settledCount++;
        } else if (unallocatedCash > 0.009) {
            status = 'partially_paid';
            amountPaid = unallocatedCash;
            remainingDue = Math.max(0, Math.round((scheduledAmount - unallocatedCash) * 100) / 100);
            advanceCredit = amountPaid;
            unallocatedCash = 0;
        } else {
            status = 'upcoming';
            amountPaid = 0;
            remainingDue = scheduledAmount;
            upcomingCount++;
        }

        const isSettledEarly = status === 'paid' && refDateStr < dueDateStr;

        installments.push({
            index: i,
            dueDate: dueDateStr,
            scheduledAmount,
            amountPaid,
            remainingDue,
            status,
            isSettledEarly,
            advanceCredit
        });
    }

    const activeInstallment = isFullyPaid ? null : installments.find((inst) => inst.status !== 'paid') || null;

    return {
        totalTermMonths: termMonths,
        installments,
        activeInstallment,
        settledCount: isFullyPaid ? termMonths : settledCount,
        upcomingCount: isFullyPaid ? 0 : upcomingCount,
        totalPaid,
        remainingDebt: isFullyPaid ? 0 : loan.remaining_balance
    };
}
