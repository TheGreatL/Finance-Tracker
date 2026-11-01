# Universal Modal Back-Stack Navigation Design Specification

**Created:** 2026-11-01 09:46 (Local Time)

## Overview

In complex mobile financial applications, workflows frequently traverse layered dialogs and detail sheets:

1. **Obligations Screen (`obligations.tsx`)**:
    - **Job Stream Flow**:
        - `JobDetailSheet` $\rightarrow$ Edit Job (`EditJobModal`)
        - `JobDetailSheet` $\rightarrow$ Record Payday (`RecordPaydayModal`)
        - `JobDetailSheet` $\rightarrow$ View Past Pay Slip (`PaySlipDetailModal`)
    - **Loan Flow**:
        - `LoanDetailSheet` $\rightarrow$ Record Payment (`LoanPaymentModal`)
        - `LoanDetailSheet` $\rightarrow$ Edit Loan (`EditLoanModal`)
    - **Subscription Flow**:
        - `SubscriptionDetailSheet` $\rightarrow$ Edit Subscription (`AddSubscriptionModal`)
2. **Accounts Screen (`accounts.tsx`)**:
    - `InstitutionDetailSheet` $\rightarrow$ Add Pocket (`AddPocketModal`)
    - `InstitutionDetailSheet` $\rightarrow$ Edit Pocket (`EditPocketModal`)
    - `InstitutionDetailSheet` $\rightarrow$ Add Loan (`AddLoanModal`)
    - `InstitutionDetailSheet` $\rightarrow$ View Loan Details (`LoanDetailSheet`) $\rightarrow$ Record Payment (`LoanPaymentModal`) / Edit Loan (`EditLoanModal`)
3. **Ledger / Transactions Screen (`two.tsx`)**:
    - `TransactionDetailSheet` $\rightarrow$ Edit Transaction (`EditTransactionModal`)
4. **Dashboard Screen (`index.tsx`)**:
    - `InstitutionDetailSheet` $\rightarrow$ Quick Expense (`TransactionFormModal`)

### Current Pain Points

1. **Premature Dismissal / Loss of Context**:
    - Closing or submitting a child modal (e.g. `RecordPaydayModal`, `EditJobModal`, `PaySlipDetailModal`, `LoanPaymentModal`, `EditLoanModal`, `EditSubscriptionModal`) currently dismisses all parent dialogs and drops the user back to the root tab screen, forcing them to re-navigate and search for their active item.
2. **Double-Stacked Modals in React Native**:
    - In several locations (e.g. `PaySlipDetailModal` opened from `JobDetailSheet`, `LoanPaymentModal` opened from `LoanDetailSheet`, and `EditTransactionModal` opened from `TransactionDetailSheet`), the parent modal's `visible` state is not set to `false`, causing two native iOS/Android modals to be presented simultaneously. This causes UI freeze warnings, touch intercept conflicts, and double-dimmed backdrop overlays.

---

## 1. Architectural Model & Invariants

### 1.1 Single-Modal Invariant

At any given moment, **at most one native `<Modal>` component is visible (`visible={true}`)**.

- When opening a child modal from a parent sheet, the parent modal is dismissed (`visible={false}`), and a breadcrumb entry describing the parent state is pushed onto `modalBackStackRef`.
- When closing or saving in a child modal, `popAndRestoreModal()` pops the breadcrumb entry and restores the parent modal with freshly synchronized data after a short transition delay (~120ms) ensuring the previous native animation has finished.

### 1.2 Back-Stack Types

```typescript
export type ModalStackItem =
    | { type: 'institution'; institutionId: string }
    | { type: 'jobDetail'; jobId: string }
    | { type: 'loanDetail'; loanId: string }
    | { type: 'subscriptionDetail'; subscriptionId: string }
    | { type: 'transactionDetail'; transactionId: string };
```

---

## 2. Screen-by-Screen Implementations

### 2.1 Obligations Screen (`apps/mobile/app/(tabs)/obligations.tsx`)

#### Stack States & Transitions

- **Job Stream Flow**:
    - `JobDetailSheet` $\rightarrow$ `onEdit`:
        - `pushModalBackStack({ type: 'jobDetail', jobId: job.id })`
        - `setJobDetailVisible(false)`
        - `setEditJobVisible(true)`
    - `JobDetailSheet` $\rightarrow$ `onRecordPayday`:
        - `pushModalBackStack({ type: 'jobDetail', jobId: job.id })`
        - `setJobDetailVisible(false)`
        - `setRecordPaydayJob(job)`
        - `setRecordPaydayVisible(true)`
    - `JobDetailSheet` $\rightarrow$ `onViewPaySlip`:
        - `pushModalBackStack({ type: 'jobDetail', jobId: job.id })`
        - `setJobDetailVisible(false)`
        - `setSelectedPaySlip(slip)`
        - `setPaySlipModalVisible(true)`
    - On closing or saving `EditJobModal`, `RecordPaydayModal`, or `PaySlipDetailModal`:
        - Dismiss the child modal.
        - Call `popAndRestoreModal()` to refetch fresh job data via `getJobById(db, jobId)` and reopen `JobDetailSheet`.
- **Loan Flow**:
    - `LoanDetailSheet` $\rightarrow$ `onRecordPayment`:
        - `pushModalBackStack({ type: 'loanDetail', loanId: loan.id })`
        - `setLoanDetailVisible(false)`
        - `setPaymentModalVisible(true)`
    - `LoanDetailSheet` $\rightarrow$ `onEdit`:
        - `pushModalBackStack({ type: 'loanDetail', loanId: loan.id })`
        - `setLoanDetailVisible(false)`
        - `setEditingLoan(loan)`
    - On closing or saving `LoanPaymentModal` or `EditLoanModal`:
        - Dismiss the child modal.
        - Call `popAndRestoreModal()` to refetch fresh loan data via `getLoanById(db, loanId)` and reopen `LoanDetailSheet`.
- **Subscription Flow**:
    - `SubscriptionDetailSheet` $\rightarrow$ `onEdit`:
        - `pushModalBackStack({ type: 'subscriptionDetail', subscriptionId: sub.id })`
        - `setSubDetailVisible(false)`
        - `setEditingSubscription(sub)`
        - `setAddSubVisible(true)`
    - On closing or updating `AddSubscriptionModal`:
        - Dismiss the child modal.
        - Call `popAndRestoreModal()` to refetch fresh subscription data via `getSubscriptionById(db, subscriptionId)` and reopen `SubscriptionDetailSheet`.

---

### 2.2 Accounts Screen (`apps/mobile/app/(tabs)/accounts.tsx`)

#### Stack States & Transitions

- `InstitutionDetailSheet` transitions:
    - `onAddPocket`: Push `{ type: 'institution', institutionId }`, dismiss sheet, open `AddPocketModal`.
    - `onEditPocket`: Push `{ type: 'institution', institutionId }`, dismiss sheet, open `EditPocketModal`.
    - `onAddLoan`: Push `{ type: 'institution', institutionId }`, dismiss sheet, open `AddLoanModal`.
    - `onSelectLoan`: Push `{ type: 'institution', institutionId }`, dismiss sheet, open `LoanDetailSheet`.
- `LoanDetailSheet` nested transitions:
    - `onRecordPayment`: Push `{ type: 'loanDetail', loanId }`, dismiss sheet, open `LoanPaymentModal`.
    - `onEdit`: Push `{ type: 'loanDetail', loanId }`, dismiss sheet, open `EditLoanModal`.
    - `onClose`: Call `popAndRestoreModal()` to return to `InstitutionDetailSheet` if opened from an institution.
- On closing or submitting any child modal:
    - Call `popAndRestoreModal()` to refetch the parent's current state and present the parent sheet.

---

### 2.3 Ledger Screen (`apps/mobile/app/(tabs)/two.tsx`)

#### Stack States & Transitions

- `TransactionDetailSheet` $\rightarrow$ `onEdit`:
    - `pushModalBackStack({ type: 'transactionDetail', transactionId: tx.id })`
    - `setSelectedTx(null)` (dismiss parent sheet)
    - `setEditingTx(tx)` (open `EditTransactionModal`)
- On closing or saving `EditTransactionModal`:
    - `setEditingTx(null)`
    - `popAndRestoreModal()` refetches the updated transaction via `getRecentTransactions` or direct query and restores `TransactionDetailSheet`.

---

### 2.4 Dashboard Screen (`apps/mobile/app/(tabs)/index.tsx`)

- Wire `onQuickExpense` on `InstitutionDetailSheet`:
    - Push `{ type: 'institution', institutionId }`, dismiss sheet, open `TransactionFormModal`.
    - When `TransactionFormModal` is dismissed or submitted, restore `InstitutionDetailSheet`.

---

## 3. Verification Strategy

1. **Type Checking**:
    - Run `npm run typecheck` across all monorepo workspaces to ensure clean interfaces and null-safety.
2. **Automated Unit Testing**:
    - Run `npm run test --workspace=@finance-tracker/mobile` to confirm all 26 test files and 206+ tests pass.
3. **Format & Integrity**:
    - Prettier formatting verification.
    - Confirm all git working tree modifications remain unstaged for the user.
