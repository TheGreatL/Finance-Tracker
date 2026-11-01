# Comprehensive Loan Management Implementation Plan

**Created:** 2026-11-01 08:51 (Local Time)

## Overview

Implement the **Gold Standard** loan management system across the mobile app, supporting:

1. **Lender Types**: Institutional loans (Banks, E-wallets, Fintech, Government) vs. Peer-to-Peer personal loans (Borrowing from a person: Family, Friend, Colleague).
2. **Dual Monetary Tracking**: Principal amount borrowed, upfront processing fee deduction (with net cash proceeds calculation), total contract payable, and computed total interest.
3. **Timeline & Duration**: Loan origination start date, loan tenure in months (`term_months` with quick chips), next payment due date, auto-projected maturity date, and dual progress tracking (amount paid % and months elapsed).
4. **Interest Cashback (Early Repayment)**: Flag for early payoff interest cashback (e.g. GLoan), cashback detection when paying off in full early, and optional refund recording.
5. **Non-Destructive Database Migration & Full Backup/Restore Compatibility**.

---

## Proposed Changes & File Impact

### 1. Types & Data Models

- **`apps/mobile/src/types/database.ts`**:
    - Add `LenderType = 'institution' | 'person'`.
    - Extend `LoanRecord` with `lender_type`, `lender_name`, `principal_amount`, `processing_fee`, `start_date`, `term_months`, `has_interest_cashback`, `interest_cashback_received`. Make `institution_id` optional for person loans.
    - Extend `CreateLoanInput` and `UpdateLoanInput` with new optional fields.

### 2. Database Schema & Migrations

- **`apps/mobile/src/database/schema.ts`**:
    - Update `SCHEMA_SQL` to define `lender_type`, `lender_name`, `principal_amount`, `processing_fee`, `start_date`, `term_months`, `has_interest_cashback`, `interest_cashback_received` on `loans`.
- **`apps/mobile/src/database/db.ts`**:
    - Add non-destructive migration in `runSchemaSetup` via `PRAGMA table_info(loans);` and `ALTER TABLE loans ADD COLUMN ...` for all new columns.
- **`apps/mobile/src/database/seed.ts`**:
    - Update `resetDatabase` to ensure clean drop and recreation.

### 3. Business Logic & Calculations

- **`apps/mobile/src/services/loanService.ts`**:
    - Update `createLoan`, `getAllLoans`, `getActiveLoans`, `getLoansByInstitution`, and `updateLoanMetadata` to query and persist new fields.
    - Add timeline calculation helper: `getLoanTimelineMetrics(loan: LoanRecord)`:
        - Calculates projected maturity date from `start_date + term_months`.
        - Calculates months elapsed, months remaining, and time progress percentage.
        - Calculates net proceeds (`principal - fee`) and total interest (`total - principal`).
        - Detects whether an early full payoff qualifies for interest cashback.
    - Extend `recordLoanPayment` to optionally credit interest cashback to target pocket if specified.

### 4. Backup & Restore Compatibility

- **`apps/mobile/src/services/databaseBackupService.ts`**:
    - Include new loan columns in export JSON, backup schema validator, and import restoration transaction.

### 5. UI Components

- **`apps/mobile/src/components/loans/AddLoanModal.tsx`**:
    - Top 2-way segment control: **Bank / Financial Institution** vs. **Person (Personal Loan)**.
    - When Person: text input for `lender_name` (e.g., "Tito Boy", "Mom", "Alex"), default 0% interest.
    - When Institution: institution dropdown picker.
    - Number inputs for:
        - Principal Amount (Cash Borrowed).
        - Upfront Processing Fee (deducted from proceeds).
        - Live banner: Net cash proceeds received (`principal - fee`).
        - Total Payable Amount (Principal + Interest).
        - Live banner: Total Interest & Financing charges (`total - principal`).
    - Date & Duration:
        - Start / Disbursement Date (via `DatePickerModal`).
        - Term in Months with quick pill buttons (`3m`, `6m`, `12m`, `24m`, `36m`, `48m`, `60m`).
        - Next Due Date (via `DatePickerModal`).
        - Live banner: Projected Maturity Date.
    - Toggle: _"Eligible for Early Payoff Interest Cashback"_ (defaults to checked if lender is GCash/GLoan).
- **`apps/mobile/src/components/loans/EditLoanModal.tsx`**:
    - Add inputs to edit `lender_name`, `principal_amount`, `processing_fee`, `start_date`, `term_months`, `has_interest_cashback`.
- **`apps/mobile/src/components/loans/LoanCard.tsx`**:
    - Display Person avatar (user icon) or Institution logo.
    - Show dual progress: Amount paid progress bar + tenure progress badge (_"Month 8 of 24 • 16 months left"_).
    - Show cashback badge if eligible.
- **`apps/mobile/src/components/loans/LoanDetailSheet.tsx`**:
    - Display lender type / name.
    - Breakdown section: Principal vs. Fee vs. Net Received. Total Payable vs. Interest.
    - Schedule section: Start Date, Term (Months), Next Due Date, Projected Maturity Date.
    - Interest cashback details & status.
- **`apps/mobile/src/components/loans/LoanPaymentModal.tsx`**:
    - When paying remaining balance in full, if loan has `has_interest_cashback` and payoff is early, show interest cashback prompt and optional refund allocation.

### 6. Automated Testing

- **`apps/mobile/tests/loan_service.test.ts`**:
    - Test loan creation with new fields (institution and person loans).
    - Test `getLoanTimelineMetrics` (net proceeds, interest, maturity date, progress).
    - Test interest cashback on early payoff.
- **`apps/mobile/tests/database_backup_service.test.ts`**:
    - Test backup export and import with new loan schema columns.

---

## Step-by-Step Implementation Tasks

### Task 1: Type Definitions & Database Migration

1. Update `LoanRecord`, `CreateLoanInput`, `UpdateLoanInput`, and `LenderType` in `apps/mobile/src/types/database.ts`.
2. Update `SCHEMA_SQL` in `apps/mobile/src/database/schema.ts`.
3. Add migration in `apps/mobile/src/database/db.ts` to add columns via `ALTER TABLE loans ADD COLUMN ...`.
4. Update `seed.ts` if needed.
5. Verify schema tests pass.

### Task 2: Service Layer & Calculation Helpers

1. Update `loanService.ts` (`createLoan`, `updateLoanMetadata`, queries).
2. Add `getLoanTimelineMetrics` helper.
3. Update `recordLoanPayment` to support interest cashback refund.
4. Update `databaseBackupService.ts` to export and restore all new columns.
5. Write and run tests in `loan_service.test.ts` and `database_backup_service.test.ts`.

### Task 3: Modal Experience (AddLoanModal & EditLoanModal)

1. Enhance `AddLoanModal.tsx` with:
    - Lender type selector (Institution vs. Person).
    - Principal, processing fee, net proceeds live calculator.
    - Term in months with quick preset chips (`3m`, `6m`, `12m`, `24m`, `36m`, `48m`, `60m`).
    - Start Date via `DatePickerModal`.
    - Interest cashback toggle.
2. Enhance `EditLoanModal.tsx` to edit these parameters.
3. Verify typechecking and formatting.

### Task 4: Card, Sheet & Payment Presentation (LoanCard, LoanDetailSheet, LoanPaymentModal)

1. Update `LoanCard.tsx` to render Person avatar / name, tenure progress, and cashback badge.
2. Update `LoanDetailSheet.tsx` to render comprehensive financial breakdown and timeline card.
3. Update `LoanPaymentModal.tsx` to handle full early payoff cashback.
4. Verify typecheck, test suites, and formatting.

### Task 5: End-to-End Verification

1. Run `npm run typecheck` across monorepo.
2. Run `npm run test --workspace=@finance-tracker/mobile`.
3. Verify code style with `npx prettier`.
4. Leave changes unstaged for user review.
