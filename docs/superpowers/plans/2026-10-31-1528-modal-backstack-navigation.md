# Modal Back-Stack Navigation Implementation Plan

**Created:** 2026-10-31 15:28 (Local Time)

## Overview

Implement a modal back-stack navigation system across the React Native mobile app (`apps/mobile`). When a user dismisses or finishes an action in a nested/child modal (e.g. closing a loan payment modal or saving a pocket), the application automatically restores the previous parent modal (e.g. returning to loan details, which subsequently returns to institution details), preventing loss of navigation context while eliminating React Native modal nesting conflicts.

---

## Proposed Changes

### 1. Accounts Screen (`app/(tabs)/accounts.tsx`)

#### File: [`apps/mobile/app/(tabs)/accounts.tsx`](<file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/accounts.tsx>)

- Define `ModalStackItem` type (`institution`, `loanDetail`, `subscriptionDetail`).
- Add `modalBackStackRef = useRef<ModalStackItem[]>([])`.
- Add `pushModalBackStack(item)` and `popAndRestoreModal()`.
- Implement `reopenInstitution(id)`, `reopenLoan(id)`, and `reopenSubscription(id)`:
    - Fetches the freshest database state for the entity.
    - Updates state and presents the sheet.
- Update modal triggers:
    - From `InstitutionDetailSheet`:
        - `onAddPocket`: push institution, close sheet, open `AddPocketModal`.
        - `onEditPocket`: push institution, close sheet, open `EditPocketModal`.
        - `onAddLoan`: push institution, close sheet, open `AddLoanModal`.
        - `onSelectLoan`: push institution, close sheet, open `LoanDetailSheet`.
    - From `LoanDetailSheet`:
        - `onRecordPayment`: push loanDetail, close sheet, open `LoanPaymentModal`.
        - `onEdit`: push loanDetail, close sheet, open `EditLoanModal`.
        - `onClose`: if stack not empty, `popAndRestoreModal()`; else close completely.
    - From `SubscriptionDetailSheet`:
        - `onEdit`: push subscriptionDetail, close sheet, open `AddSubscriptionModal`.
        - `onClose`: close completely.
    - In sub-modal `onClose` and completion handlers:
        - `AddPocketModal.onClose` / `onSubmit` $\rightarrow$ `popAndRestoreModal()`.
        - `EditPocketModal.onClose` / `onSave` $\rightarrow$ `popAndRestoreModal()`.
        - `AddLoanModal.onClose` / `onSubmit` $\rightarrow$ if stack has institution, `popAndRestoreModal()`.
        - `LoanPaymentModal.onClose` / `onSubmit` $\rightarrow$ `popAndRestoreModal()`.
        - `EditLoanModal.onClose` / `onSave` $\rightarrow$ `popAndRestoreModal()`.
        - `AddSubscriptionModal.onClose` / `onUpdate` $\rightarrow$ if editing, `popAndRestoreModal()`.

---

### 2. Dashboard Screen (`app/(tabs)/index.tsx`)

#### File: [`apps/mobile/app/(tabs)/index.tsx`](<file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/index.tsx>)

- Add `modalBackStackRef = useRef<ModalStackItem[]>([])`.
- Add `pushModalBackStack(item)` and `popAndRestoreModal()`.
- Wire `InstitutionDetailSheet` navigation:
    - `onAddPocket`, `onEditPocket`, `onAddLoan`, `onSelectLoan` push institution to stack and cleanly open the respective sub-modal.
    - On sub-modal dismiss/complete $\rightarrow$ pop and restore `InstitutionDetailSheet` with refreshed pockets and balances.
- Wire `LoanDetailSheet` navigation:
    - `onRecordPayment`, `onEdit` push loanDetail to stack and open the modal.
    - On payment or edit complete/dismiss $\rightarrow$ pop and restore `LoanDetailSheet` with refreshed loan balance.
    - On `LoanDetailSheet` close $\rightarrow$ if stack has institution, pop and restore `InstitutionDetailSheet`.
- Wire `TransactionDetailSheet` navigation:
    - `onEdit`: push transactionDetail, close sheet, open `EditTransactionModal`.
    - On edit save or cancel $\rightarrow$ pop and restore `TransactionDetailSheet` with refreshed transaction.

---

### 3. Verification & Safety

- Run `npm run typecheck` across all packages.
- Run `npm run test --workspace=@finance-tracker/mobile`.
- Verify smooth back-navigation transitions on both Android and iOS without double modals or blank screens.
