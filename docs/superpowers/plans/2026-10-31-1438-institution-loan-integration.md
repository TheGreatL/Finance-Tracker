# Institution Loan Integration Implementation Plan

**Created:** 2026-10-31 14:38 (Local Time)

## Overview

Enable full visibility and management of loans directly when viewing financial institutions (e.g., Maya, GCash, BDO) across the application. When viewing an institution sheet, display its associated loans alongside its deposit pockets, surface clear asset vs. debt summaries, and allow instant navigation to loan details and repayments.

---

## Proposed Changes

### 1. Database Service Layer

#### File: [`apps/mobile/src/services/loanService.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/loanService.ts)

- Implement `getLoansByInstitution(db: SQLite.SQLiteDatabase, institutionId: string): Promise<LoanRecord[]>`.
- Queries loans joining `institutions` table where `loans.institution_id = ?`, sorted by status (`active` first) and due date.

---

### 2. UI Component: `InstitutionDetailSheet`

#### File: [`apps/mobile/src/components/accounts/InstitutionDetailSheet.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/InstitutionDetailSheet.tsx)

- Extend `InstitutionDetailSheetProps` with:
    - `loans?: LoanRecord[]`
    - `onSelectLoan?: (loan: LoanRecord) => void`
- Update Header Summary:
    - Calculate `totalBalance` (sum of pockets).
    - Calculate `totalDebt` (sum of active loans).
    - If both pockets and loans exist: show dual cards/badges for Deposits (`₱X,XXX`) and Outstanding Debt (`₱Y,YYY`).
    - If only loans exist: display Total Debt prominently.
- Update Content Body:
    - Render Pockets list (or empty prompt if zero pockets).
    - Render `Loans & Credit Lines ({loans.length})` section below pockets.
    - Render each loan using `LoanCard` with `onPress={() => onSelectLoan?.(loan)}`.
    - If loans are present, allow quick interaction with each loan.

---

### 3. Screen Integration: Dashboard (`index.tsx`)

#### File: [`apps/mobile/app/(tabs)/index.tsx`](<file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/index.tsx>)

- Add state for `selectedInstLoans: LoanRecord[]`.
- In `handleSelectInstitution(inst)`: concurrently fetch pockets and loans for that institution.
- Wire `loans={selectedInstLoans}` and `onSelectLoan` to `InstitutionDetailSheet`.
- Integrate `LoanDetailSheet`, `LoanPaymentModal`, `AddLoanModal`, and `EditLoanModal` so opening, paying, or managing a loan from the institution sheet works seamlessly on the Dashboard.

---

### 4. Screen Integration: Accounts Screen (`accounts.tsx`)

#### File: [`apps/mobile/app/(tabs)/accounts.tsx`](<file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/accounts.tsx>)

- Pass `loans={loans.filter((l) => l.institution_id === selectedInstitution?.id)}` to `InstitutionDetailSheet`.
- Pass `onSelectLoan={(loan) => { setDetailSheetVisible(false); setSelectedLoan(loan); setLoanDetailVisible(true); }}`.
- Wire `onAddLoan` from `InstitutionDetailSheet` to open `AddLoanModal` with `initialProvider={selectedInstitution?.code}`.

---

### 5. Testing & Verification

#### File: [`apps/mobile/tests/loan_service.test.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/tests/loan_service.test.ts)

- Add unit test verifying `getLoansByInstitution` returns loans filtered by `institution_id`.
- Run `npm run test --workspace=@finance-tracker/mobile`.
- Run `npm run typecheck`.
- Format modified files with Prettier.
