# Implementation Plan: Metadata Editing Across All Features

**Created:** 2026-10-31 13:52 (Local Time)

## Goal

Implement non-financial metadata editing across all entities (Transactions, Loans, Pockets) while keeping balance movement strictly immutable.

---

## Proposed Changes

### Task 1: Transaction Metadata Editing

1. **Service Layer** ([`transactionService.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/transactionService.ts)):
    - Implement `updateTransactionMetadata(db, transactionId, input)`:
        ```typescript
        export interface UpdateTransactionMetadataInput {
            title?: string;
            category?: string;
            date?: string;
            notes?: string;
        }
        ```
2. **UI Layer** ([`EditTransactionModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/transactions/EditTransactionModal.tsx)):
    - Create modal with prefilled inputs for Title, Category (with SearchableSelect / category chips), Date (DatePickerModal), and Notes.
    - Display amount and pocket as locked/read-only badges with an explanatory hint _"Amount and pocket are protected to maintain ledger accuracy"_.
3. **Detail Sheet** ([`TransactionDetailSheet.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/transactions/TransactionDetailSheet.tsx)):
    - Add "Edit Details" button next to Delete.
    - Wire up `onUpdate` callback to refresh parent screens.

---

### Task 2: Loan Metadata Editing

1. **Service Layer** ([`loanService.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/loanService.ts)):
    - Implement `updateLoanMetadata(db, loanId, input)`:
        ```typescript
        export interface UpdateLoanMetadataInput {
            title: string;
            institutionId?: string;
            dueDate: string;
            monthlyPayment?: number;
            notes?: string;
            attachmentPath?: string;
            attachmentName?: string;
        }
        ```
2. **UI Layer** ([`EditLoanModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/EditLoanModal.tsx)):
    - Allow editing Title, Institution, Due Date, Monthly Payment, Notes, and Attachment.
    - Display Total Principal and Remaining Balance as locked badges.
3. **Detail Sheet** ([`LoanDetailSheet.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/LoanDetailSheet.tsx)):
    - Add "Edit Details" button with Pencil icon in header or actions.

---

### Task 3: Pocket Metadata Editing

1. **Service Layer** ([`accountService.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/accountService.ts)):
    - Implement `updatePocketMetadata(db, pocketId, input)`:
        ```typescript
        export interface UpdatePocketMetadataInput {
            name: string;
            interestRate?: number | null;
            savingsDetails?: string;
        }
        ```
2. **UI Layer** ([`EditPocketModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/EditPocketModal.tsx)):
    - Allow renaming pocket and updating interest rate / savings details.
3. **Detail Sheet & Card** ([`InstitutionDetailSheet.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/InstitutionDetailSheet.tsx) & [`PocketCard.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/PocketCard.tsx)):
    - Add an edit icon on pockets to open `EditPocketModal`.

---

### Task 4: Screen Integration & Refresh

- Update screens:
    - `apps/mobile/app/(tabs)/index.tsx` (Dashboard recent transactions & pockets)
    - `apps/mobile/app/(tabs)/two.tsx` (Accounts & Pockets list)
    - `apps/mobile/src/components/loans/ActiveLoansBanner.tsx` and Loan cards
- Wire callbacks so updates immediately reflect in UI state.

---

### Task 5: Unit Tests & Verification

- Add unit tests in:
    - `apps/mobile/tests/transaction_service.test.ts`
    - `apps/mobile/tests/loan_service.test.ts`
    - `apps/mobile/tests/account_service.test.ts`
- Run `npm run typecheck`, `npm run lint`, `npm run test`.
