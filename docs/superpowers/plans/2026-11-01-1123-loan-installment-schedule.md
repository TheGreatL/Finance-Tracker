# Loan Installment Schedule Implementation Plan

**Created:** 2026-11-01 11:23 (Local Time)

Implement the Gold-Standard monthly installment timeline schedule for loans, providing waterfall payment allocation, compact auto-collapsing UI with stepper nodes, and dynamic residual payment pre-filling.

## Proposed Changes

### 1. `apps/mobile/src/services/loanService.ts`

- Define `InstallmentStatus`, `InstallmentItem`, and `LoanInstallmentSchedule`.
- Implement `calculateLoanInstallmentSchedule(loan: LoanRecord, referenceDate?: Date): LoanInstallmentSchedule`.
- Add calculation for `dueDate` cascading per month preserving the origination day.
- Waterfall total paid amount across the installments.
- Detect `isSettledEarly` and `advanceCredit`.

### 2. `apps/mobile/src/components/loans/LoanDetailSheet.tsx`

- Replace or enhance the simple "Current Tenor Status: Month 2 of 12" text with the comprehensive **Amortization Timeline**.
- Add "Hide Settled" / "Show All" toggle with `Eye` / `EyeOff` icons.
- Auto-collapse settled installments when $\ge 3$ are paid, showing a summary banner.
- Render vertical stepper timeline with colored status nodes:
    - 🟢 `PAID` (Green badge + node)
    - 🟡 `PARTIALLY PAID` (Amber badge + node showing remaining due and breakdown math)
    - ⚪ `UPCOMING` (Neutral node)
- Update primary CTA button text to reflect the exact active residual due (e.g. `Record Loan Payment (₱854.01 Due)`).
- When recording a payment, pass the suggested amount to the payment modal.

### 3. `apps/mobile/src/components/loans/LoanPaymentModal.tsx` & `obligations.tsx`

- Support an optional `initialAmount?: number` prop in `LoanPaymentModal` so tapping the active installment or primary CTA auto-populates the exact residual balance.

### 4. Tests

- Add unit tests in `apps/mobile/tests/loan_service.test.ts` covering:
    - Waterfall allocation with advance payments (including the exact user scenario: ₱20,000 / 12 mo / ₱8,284.67 paid).
    - Residual balance accuracy for Month 4 (₱854.01).
    - Status transitions (all upcoming, partially paid, all paid).
    - Graceful degradation for loans without `term_months`.

## Verification Plan

### Automated Tests

- Run `npm run test` or `npx vitest run tests/loan_service.test.ts`.
- Run `npm run lint` to guarantee zero ESLint warnings/errors.
- Run `npm run typecheck`.

### Manual / Scenario Verification

- Verify the ₱20,000 GLoan test case renders Months 1-3 as settled in advance, Month 4 as partially paid with ₱854.01, and Months 5-12 as upcoming.
