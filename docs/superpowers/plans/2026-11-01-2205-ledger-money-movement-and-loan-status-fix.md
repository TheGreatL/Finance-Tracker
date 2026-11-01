# Implementation Plan: Complete Ledger Money Movement & Loan Status Alignment

**Created:** 2026-11-01 22:05 (Local Time)
**Design Spec:** [`docs/superpowers/specs/2026-11-01-2205-ledger-money-movement-and-loan-status-fix-design.md`](file:///c:/Users/user/Desktop/projects/finance-tracker/docs/superpowers/specs/2026-11-01-2205-ledger-money-movement-and-loan-status-fix-design.md)

---

## 1. Objectives

1. **Fix Loan Paid Status & Schedule Inconsistency**:
    - Ensure `calculateLoanInstallmentSchedule` marks 100% of installments as `paid` (`remainingDue: 0`, `settledCount = totalTermMonths`, `activeInstallment = null`) whenever `loan.status === 'paid'` or `loan.remaining_balance <= 0`.
    - Ensure `LoanDetailSheet.tsx` suppresses the "Pay Remaining" button and any residual payment prompts when a loan is fully paid.
    - Guard against contracts where `total_amount` was set lower than `monthly_payment * term_months`.
2. **Log All Money Movements in the Ledger**:
    - Automatically log an `'Initial Balance'` income transaction in `transactions` when an account/pocket is created with `startingBalance > 0`.
    - Provide an automatic, idempotent backfill migration for existing pockets that have `starting_balance > 0` but no opening transaction.
    - Allow loan disbursements to deposit into a designated pocket and log an incoming `'Loan Disbursement'` transaction.
    - Add `reconcilePocketBalance` in `accountService.ts` to log adjustments as `'Balance Adjustment'` transactions.
3. **Verification**:
    - Write comprehensive unit tests for all new behaviors.
    - Run typecheck and ESLint.

---

## 2. Proposed Changes & Steps

### Step 1: Fix Loan Installment Schedule & LoanDetailSheet

- **File:** `apps/mobile/src/services/loanService.ts`
    - In `calculateLoanInstallmentSchedule`:
        - Add early return or full settlement path when `loan.status === 'paid'` or `loan.remaining_balance <= 0.009`:
            - Set all installments to `status: 'paid'`, `amountPaid = scheduledAmount`, `remainingDue = 0`.
            - Set `settledCount = termMonths`, `upcomingCount = 0`, `activeInstallment = null`, `remainingDebt = 0`.
        - Compute `contractTotal = Math.max(loan.total_amount, Math.round(loan.monthly_payment * termMonths * 100) / 100)`.
        - When `loan.total_amount < contractTotal`, scale or adjust scheduled amounts so installments match the true obligation.
- **File:** `apps/mobile/src/components/loans/LoanDetailSheet.tsx`
    - In the schedule rendering, check `if (isPaid)`:
        - Never render "Pay Remaining" button.
        - Show `3 of 3 Installments Settled (₱X.XX)`.
- **File:** `apps/mobile/tests/loan_service.test.ts`
    - Add tests for a fully paid loan (such as the user's TikTok TrustLoan with `total_amount: 7000`, `remaining_balance: 0`, `monthly_payment: 2753.34`, `term_months: 3`, `status: 'paid'`) verifying all 3 installments are marked `paid` and `activeInstallment` is `null`.

### Step 2: Implement Opening Balance Ledger Logging & Backfill Migration

- **File:** `apps/mobile/src/services/accountService.ts`
    - In `addCustomInstitution`:
        - If `startingBalance > 0`, insert an `'Initial Balance'` transaction into `transactions`.
    - In `addPocket`:
        - If `startingBalance > 0`, insert an `'Initial Balance'` transaction into `transactions`.
    - Add `backfillInitialBalanceTransactions(db: SQLiteDatabase)`:
        - Queries active pockets with `starting_balance > 0` that have no transaction with category `'Initial Balance'`.
        - Inserts the missing `'Initial Balance'` transactions without altering `current_balance`.
    - Add `reconcilePocketBalance(db, pocketId, newBalance, notes)`:
        - Adjusts balance and logs an audit transaction with category `'Balance Adjustment'`.
- **File:** `apps/mobile/src/database/db.ts`
    - Call `backfillInitialBalanceTransactions(db)` during database initialization/startup.
- **File:** `apps/mobile/tests/account_service.test.ts`
    - Add tests verifying `addCustomInstitution` and `addPocket` insert `'Initial Balance'` transactions.
    - Add tests for `backfillInitialBalanceTransactions` ensuring idempotency.
    - Add tests for `reconcilePocketBalance`.

### Step 3: Implement Loan Disbursement to Pocket

- **File:** `apps/mobile/src/services/loanService.ts`
    - Update `CreateLoanInput` to include `disburseToPocketId?: string`.
    - In `createLoan`:
        - If `input.disburseToPocketId` is provided:
            - Credit the pocket: `pocket.current_balance += netProceeds`.
            - Insert an `'income'` transaction:
                - `title: 'Loan Proceeds: ' + loan.title`
                - `category: 'Loan Disbursement'`
                - `amount: netProceeds`
                - `pocket_id: input.disburseToPocketId`
- **File:** `apps/mobile/src/components/loans/AddLoanModal.tsx`
    - Add a "Deposit proceeds to pocket" selector (optional, defaults to none or selected provider).
    - When `monthlyPayment` and `termMonths` are entered, if `monthlyPayment * termMonths > principalAmount`, auto-compute and display the Total Contract Obligation.
- **File:** `apps/mobile/tests/loan_service.test.ts`
    - Add test verifying loan creation with `disburseToPocketId` credits the pocket and logs a `'Loan Disbursement'` transaction.

### Step 4: Verification

- Run `npm test --workspace=@finance-tracker/mobile`.
- Run `npm run typecheck`.
- Run `npx eslint` on modified files.
