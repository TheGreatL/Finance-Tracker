# Design Specification: Complete Ledger Money Movement & Loan Status Alignment

**Created:** 2026-11-01 22:05 (Local Time)
**Topic:** Ledger Money Movement Integrity & Loan Schedule Paid-Status Resolution
**Status:** Approved for Implementation

---

## 1. Problem Statement & Motivation

### Problem A: Loan Status & Schedule Inconsistency (Reported Bug)

In the Loans & Debt screen, when viewing a loan that has been paid off (such as TikTok TrustLoan with `total_amount: ₱7,000.00` and `remaining_balance: ₱0.00`):

- The header card correctly displays `REMAINING DEBT: ₱0.00` (green, strike-through) and `status: paid`.
- However, the **Payment Schedule** below displays:
    - `2 of 3 Installments Settled (₱5,506.68)`
    - Month 3 shows: `Dec 12, 2026 • ₱1,260.02 PARTIAL`
    - Expanding Month 3 shows:
        - Scheduled Installment: `₱2,753.34`
        - Advance Credit Applied: `-₱1,493.32`
        - Remaining Due: `₱1,260.02`
        - **Active Button:** `Pay Remaining ₱1,260.02`
- **Root Cause Analysis:**
    1. `calculateLoanInstallmentSchedule(loan)` computed `totalPaid = loan.total_amount - loan.remaining_balance` (i.e. `7000 - 0 = 7000`).
    2. The loan had `term_months: 3` and `monthly_payment: 2753.34`. The sum of the 3 scheduled installments is `3 * 2753.34 = ₱8,260.02`.
    3. Because `7,000 < 8,260.02`, the waterfall algorithm allocated ₱7,000 across the installments, leaving Month 3 with a residual ₱1,260.02 unpaid.
    4. The algorithm **never checked** whether `loan.status === 'paid'` or `loan.remaining_balance <= 0`. If a loan is fully paid, no installment should ever be marked `partially_paid` or `upcoming`, and no "Pay Remaining" action should be presented to the user.
    5. Furthermore, when `loan.total_amount` is entered as the principal amount (`₱7,000`) rather than the full interest-bearing contract obligation (`₱8,260.02`), the schedule's scheduled amounts exceed `loan.total_amount`.

### Problem B: Money Movements Bypassing the Ledger

The user requested: _"All the transactions (movement of money) should be log at the ledger"_.
Currently, money moves into the app without a ledger transaction in two key scenarios:

1. **Initial Account / Pocket Balances:**
    - When an institution or pocket is created with `starting_balance > 0`, the balance is set directly on `account_pockets.current_balance`, but no transaction is inserted into `transactions`.
    - As a result, the Ledger screen (`two.tsx`) does not show where the money came from, and users have been creating manual workaround transactions (e.g., "Balance Data", "Balance out data") to account for discrepancies.
2. **Loan Disbursements:**
    - When adding a loan (e.g., borrowing ₱20,000 from GLoan or ₱7,000 from TrustLoan), the debt obligation is registered, but the disbursed cash is not credited to a pocket and no incoming ledger transaction is recorded.
3. **Pocket Balance Reconciliation / Adjustments:**
    - There is no formal ledger-backed way to reconcile or adjust an account balance when bank statements differ. Any balance adjustment should generate a clear `Balance Adjustment` ledger entry rather than an untracked update.

---

## 2. Architecture & Design Solutions

### 2.1 Loan Schedule Paid-Status & Contract Alignment

#### 1. Full Settlement Guard in `calculateLoanInstallmentSchedule`:

If `loan.status === 'paid'` or `loan.remaining_balance <= 0.009`:

- The loan is completely settled.
- Every installment in the schedule is marked:
    - `status: 'paid'`
    - `amountPaid: scheduledAmount`
    - `remainingDue: 0`
    - `advanceCredit: undefined`
    - `isSettledEarly: false` (or true if settled before due date)
- `settledCount = totalTermMonths`
- `upcomingCount = 0`
- `activeInstallment = null`
- `remainingDebt = 0`

#### 2. Contract Total Amount Calculation:

If `loan.term_months > 0` and `loan.monthly_payment > 0`:

- Compute `contractTotal = Math.max(loan.total_amount, Math.round(loan.monthly_payment * loan.term_months * 100) / 100)`.
- If `loan.total_amount < contractTotal` and `loan.status === 'active'`:
    - The scheduled amounts must tie to `contractTotal` or adjust the final installment so the sum of installments matches the total payable obligation.
    - In `AddLoanModal.tsx` and `EditLoanModal.tsx`, when `monthlyPayment` and `termMonths` are entered, auto-suggest or update `totalAmount` to `monthlyPayment * termMonths` so the stored obligation is mathematically sound from origination.

#### 3. UI Guard in `LoanDetailSheet.tsx` & `LoanCard.tsx`:

- If `loan.status === 'paid'` or `loan.remaining_balance <= 0`:
    - Show all installments with green checkmark badges.
    - Suppress the "Pay Remaining" button and partial breakdown warning.
    - Display a clean "Loan Fully Paid" summary banner.

---

### 2.2 Complete Ledger Integration for All Money Movements

#### 1. Opening Balance Logging on Pocket Creation:

In `accountService.ts`:

- When `addCustomInstitution` or `addPocket` runs with `startingBalance > 0`:
    - Insert a ledger transaction into `transactions`:
        - `id`: `tx_init_${pockId}`
        - `title`: `Starting Balance: ${pocketName}`
        - `pocket_id`: `pockId`
        - `to_pocket_id`: null
        - `type`: `'income'`
        - `amount`: `startingBalance`
        - `category`: `'Initial Balance'`
        - `date`: local `YYYY-MM-DD`
        - `notes`: `Opening balance for ${pocketName}`

#### 2. Loan Disbursement Logging:

In `loanService.ts` & `AddLoanModal.tsx`:

- Extend `CreateLoanInput` with:
    - `disburseToPocketId?: string`: Target pocket to receive the cash.
- If `disburseToPocketId` is specified:
    - Calculate `netDisbursed = Math.max(0, principalAmount - processingFee)`.
    - Credit the target pocket balance: `pocket.current_balance += netDisbursed`.
    - Insert an incoming transaction into `transactions`:
        - `id`: `tx_disb_${loanId}`
        - `title`: `Loan Proceeds: ${loan.title}`
        - `pocket_id`: `disburseToPocketId`
        - `to_pocket_id`: null
        - `type`: `'income'`
        - `amount`: `netDisbursed`
        - `category`: `'Loan Disbursement'`
        - `date`: `loan.start_date || today`
        - `notes`: `Disbursed loan proceeds for ${loan.title} (Net of ₱${processingFee} fee)`

#### 3. Formal Pocket Balance Adjustment:

In `accountService.ts`:

- Export `reconcilePocketBalance(db, pocketId, newBalance, notes)`:
    - Fetch existing `current_balance`.
    - Compute `diff = newBalance - current_balance`.
    - If `diff !== 0`:
        - Update `account_pockets.current_balance = newBalance`.
        - Insert transaction into `transactions`:
            - `type`: `diff > 0 ? 'income' : 'expense'`
            - `amount`: `Math.abs(diff)`
            - `category`: `'Balance Adjustment'`
            - `title`: `Balance Adjustment: ${pocket.name}`
            - `notes`: `reconciliation notes`

#### 4. Automatic Backfill Migration for Existing Pockets:

In `database/db.ts` / `accountService.ts`:

- On database startup, check for any active `account_pockets` where `starting_balance > 0` that do not have an `'Initial Balance'` transaction.
- Insert the missing `'Initial Balance'` record using the pocket's `created_at` timestamp without modifying `current_balance` (since the current balance already incorporates the starting balance).
- This ensures all existing accounts immediately reconcile in the Ledger.

---

## 3. Verification Plan

1. **Unit Tests:**
    - In `loan_service.test.ts`:
        - Test `calculateLoanInstallmentSchedule` when `loan.status === 'paid'` or `remaining_balance === 0`: verify all installments are `paid`, `remainingDue === 0`, `settledCount === termMonths`, and `activeInstallment === null`.
        - Test `calculateLoanInstallmentSchedule` with `total_amount` less than `monthly_payment * term_months`.
        - Test `createLoan` with `disburseToPocketId`: verify target pocket is credited and `'Loan Disbursement'` transaction is inserted into `transactions`.
    - In `account_service.test.ts`:
        - Test `addPocket` with `startingBalance > 0`: verify `'Initial Balance'` transaction is inserted.
        - Test `addCustomInstitution` with `startingBalance > 0`: verify `'Initial Balance'` transaction is inserted.
        - Test `reconcilePocketBalance`: verify correct income or expense transaction is inserted and pocket balance is updated.
        - Test `backfillInitialBalanceTransactions`: verify idempotent backfill for existing pockets.
2. **End-to-End Consistency:**
    - Run full test suite: `npm test --workspace=@finance-tracker/mobile`.
    - Run typecheck: `npm run typecheck`.
    - Run ESLint on all touched files.
