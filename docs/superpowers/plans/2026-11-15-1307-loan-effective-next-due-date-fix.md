# Loan Effective Next Due Date Fix Implementation Plan

**Created:** 2026-11-15 13:07 (Local Time)

## Goal

Fix the logical bug where loans with installments already paid for the current month and upcoming months still display "Due now" or "Overdue by Xd" badges across the app.

## Tasks

1. **Loan Service Enhancements (`apps/mobile/src/services/loanService.ts`)**:
    - Implement and export `getEffectiveNextDueDate(loan: LoanRecord, referenceDate?: Date): string | null`.
    - Update `getActiveLoans` and `getAllLoans` to sort active loans by `getEffectiveNextDueDate(loan) || loan.due_date || '' ASC`.
    - Update `getLoansSummary` to map active loans with their effective upcoming due date, sorting `nextDueLoan` by effective due date and computing `dueSoonCount` against effective due date.
2. **Dashboard Pulse Strip (`apps/mobile/src/components/dashboard/FinancialPulseStrip.tsx`)**:
    - Calculate `loanDueDays` against `effectiveDueDate`.
    - Render `Overdue (${days}d)`, `Due today`, or `${days}d left` instead of a catch-all `Due now`.
3. **Loan Card Component (`apps/mobile/src/components/loans/LoanCard.tsx`)**:
    - Use `getEffectiveNextDueDate(loan) || loan.due_date` for the badge countdown calculation.
4. **Active Loans Banner (`apps/mobile/src/components/loans/ActiveLoansBanner.tsx`)**:
    - Use `getEffectiveNextDueDate(nextDueLoan) || nextDueLoan.due_date`.
5. **Loan Detail Sheet (`apps/mobile/src/components/loans/LoanDetailSheet.tsx`)**:
    - Display `getEffectiveNextDueDate(loan) || loan.due_date` for "Next Due Date".
6. **Analytics Service (`apps/mobile/src/services/analyticsService.ts`)**:
    - Sort active loans and set `nextDueLoan.dueDate` based on `getEffectiveNextDueDate`.
7. **Notification Center (`apps/mobile/src/services/notificationCenterService.ts`)**:
    - Filter upcoming loans based on `getEffectiveNextDueDate(loan)`.
8. **Unit Tests & Verification**:
    - Add unit tests in `apps/mobile/tests/loan_service.test.ts`.
    - Run mobile tests: `npm test --workspace=@finance-tracker/mobile`.
    - Run typecheck: `npm run typecheck`.
