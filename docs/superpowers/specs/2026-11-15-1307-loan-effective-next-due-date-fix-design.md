# Loan Effective Next Due Date Fix Design

**Created:** 2026-11-15 13:07 (Local Time)

## 1. Problem Statement

When a user makes installment payments on a loan (e.g. paying ahead for the current month and upcoming months), the loan's installment schedule correctly reflects that Month 1, Month 2, and Month 3 are settled (`status: 'paid'`). However, components throughout the app (such as the Financial Pulse Strip, Loan Card badges, Active Loans Banner, and Analytics) display:

- `"Due now"`
- `"Overdue by Xd"`
- `"Due Today"`

This occurs because:

1. Components directly inspect the static `loan.due_date` field (which stores the original initial due date of the first installment, e.g. `2026-10-12`).
2. When current and subsequent months are already settled, `loan.due_date` remains in the past (e.g. `2026-10-12` when today is `2026-11-15`), leading to `diff < 0` and false "Due now" / "Overdue" badges.
3. In `LoanDetailSheet.tsx`, the "Next Due Date" row displays the original static `loan.due_date` instead of the active installment's due date, conflicting with the timeline directly below it.

## 2. Proposed Architecture

### 2.1 Effective Next Due Date Computation

Introduce `getEffectiveNextDueDate(loan: LoanRecord, referenceDate?: Date): string | null` in `apps/mobile/src/services/loanService.ts`:

- If `loan.status === 'paid'` or `loan.remaining_balance <= 0`, return `null`.
- Calculate the installment schedule via `calculateLoanInstallmentSchedule(loan, referenceDate)`.
- If `schedule.activeInstallment` exists, return its `dueDate` (the date of the first unpaid or partially paid installment).
- Fallback to `loan.due_date || null`.

### 2.2 Active Loan Sorting & Summaries

Update `getActiveLoans` and `getLoansSummary` in `loanService.ts`:

- Order active loans by their effective next due date ascending (`getEffectiveNextDueDate(loan) || loan.due_date`).
- In `getLoansSummary`, assign `nextDueLoan` with its effective upcoming `due_date`, and compute `dueSoonCount` based on whether the effective due date falls within the next 7 days.

### 2.3 UI Components Integration

1. **`LoanCard.tsx`**:
    - Determine countdown using `getEffectiveNextDueDate(loan) || loan.due_date`.
    - If this month and future months are paid, it displays `Due in 58d` (neutral/amber) instead of `Overdue by 34d` (red).
2. **`FinancialPulseStrip.tsx`**:
    - Evaluate `effectiveDueDate` from `loansSummary.nextDueLoan`.
    - Update condition: if `loanDueDays < 0`, display `Overdue (${Math.abs(loanDueDays)}d)`; if `0`, display `Due today`; if `> 0`, display `${loanDueDays}d left`.
    - Avoid generic `Due now` when the next active payment is months away.
3. **`ActiveLoansBanner.tsx`**:
    - Calculate `diffDays` against `getEffectiveNextDueDate(nextDueLoan) || nextDueLoan.due_date`.
4. **`LoanDetailSheet.tsx`**:
    - Under "Next Due Date", display `isPaid ? 'Paid Off' : formatDisplayDate(getEffectiveNextDueDate(loan) || loan.due_date)`.
5. **`analyticsService.ts`**:
    - Sort active loans by `getEffectiveNextDueDate(l) || l.due_date` and populate `nextDueLoan` with its effective due date.
6. **`notificationCenterService.ts`**:
    - Check `getEffectiveNextDueDate(loan)` against the threshold to avoid firing false notifications for already-paid installments.

## 3. Verification Plan

- Unit tests in `loan_service.test.ts`:
    - Assert `getEffectiveNextDueDate` returns Month 1 due date when 0 paid.
    - Assert `getEffectiveNextDueDate` advances to Month 4 due date when 3 installments are paid ahead.
    - Assert `getEffectiveNextDueDate` returns `null` when remaining balance is 0 or loan is paid.
    - Assert `getLoansSummary` picks the loan with the nearest effective active due date.
- Verification across monorepo:
    - `npm test --workspace=@finance-tracker/mobile`
    - `npm run typecheck`
