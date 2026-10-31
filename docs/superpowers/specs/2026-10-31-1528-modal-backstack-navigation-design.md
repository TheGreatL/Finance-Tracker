# Modal Back-Stack Navigation Design Specification

**Created:** 2026-10-31 15:28 (Local Time)

## 1. Problem Statement & User Experience Goals

In the mobile application, user workflows frequently navigate through multiple layers of dialogs and sheets:

1. **Institution View $\rightarrow$ Sub-flows**:
    - When viewing an account in `InstitutionDetailSheet` (e.g., Maya), the user can tap `+ Add Pocket`, `Edit Pocket`, `+ Loan`, or tap a specific loan to inspect details (`LoanDetailSheet`).
2. **Loan Detail View $\rightarrow$ Sub-flows**:
    - Inside `LoanDetailSheet`, the user can tap `Record Payment` (`LoanPaymentModal`) or `Edit Loan` (`EditLoanModal`).
3. **Transaction & Subscription Detail Views $\rightarrow$ Edit Flows**:
    - Inside `TransactionDetailSheet` or `SubscriptionDetailSheet`, tapping "Edit" opens the corresponding edit modal.

### Current Pain Points

- **Loss of Navigation Context**: When a user completes or dismisses the last/child modal (e.g. cancels or records a loan payment), all parent sheets are currently closed, dumping the user all the way back to the root tab screen. The user loses their place and must navigate back through the hierarchy.
- **Nested Modal Conflicts in React Native**: Displaying multiple native `<Modal>` components simultaneously leads to UIKit presentation warnings/freezes on iOS and double-dimmed backdrop overlays on Android.

### Target User Experience

- **Modal Back-Stack (Breadcrumb History)**: When a user closes or completes an action in a child modal, the app automatically transitions back to the previous modal in the stack (e.g., closing `LoanPaymentModal` returns to `LoanDetailSheet`, and closing `LoanDetailSheet` returns to `InstitutionDetailSheet`).
- **Single-Modal Invariance**: Only one native modal is presented at any given time. Transitioning forward preserves the parent state on a back-stack and dismisses the parent before presenting the child. Transitioning backward pops the stack and restores the parent with freshly synced data.

---

## 2. Modal Back-Stack Architecture

### 2.1. Stack Item Type Definition

```typescript
export type ModalStackItem =
    | { type: 'institution'; institutionId: string }
    | { type: 'loanDetail'; loanId: string }
    | { type: 'subscriptionDetail'; subscriptionId: string }
    | { type: 'transactionDetail'; transactionId: string };
```

### 2.2. State Flow Diagram

```
[ Dashboard / Accounts Screen ]
             |
             | (Tap Institution Card)
             v
+------------------------------------------+
|  Level 1: InstitutionDetailSheet (Maya)  | <---------+
+------------------------------------------+           |
     |                     |                           | (Close Loan Detail)
     | (+ Add Pocket)      | (Tap Loan)                |
     v                     v                           |
[ AddPocketModal ]   +----------------------------+    |
     |               | Level 2: LoanDetailSheet   | ---+
     | (Save/Cancel) +----------------------------+
     v                     |
(Returns to Maya)          | (Record Payment)
                           v
                     +----------------------------+
                     | Level 3: LoanPaymentModal  |
                     +----------------------------+
                           |
                           | (Submit Payment or Cancel)
                           v
                     (Returns to LoanDetailSheet)
```

---

## 3. Screen Implementations

### 3.1. Accounts Screen (`apps/mobile/app/(tabs)/accounts.tsx`)

- Maintain `modalBackStackRef = useRef<ModalStackItem[]>([])`.
- Helper `pushModalBackStack(item: ModalStackItem)`.
- Helper `popAndRestoreModal()`:
    - Pops the top entry from `modalBackStackRef`.
    - Safely schedules the restoration of the target modal after child dismissal animation (~120ms):
        - `'institution'`: Refetches pockets & loans for `institutionId`, sets `selectedInstitution`, and opens `detailSheetVisible(true)`.
        - `'loanDetail'`: Refetches loan for `loanId`, sets `selectedLoan`, and opens `loanDetailVisible(true)`.
        - `'subscriptionDetail'`: Refetches subscription for `subscriptionId`, sets `selectedSubscription`, and opens `subDetailVisible(true)`.
- Wire `onClose` and completion handlers:
    - `AddPocketModal`: On save or cancel $\rightarrow$ pop and restore institution sheet.
    - `EditPocketModal`: On save or cancel $\rightarrow$ pop and restore institution sheet.
    - `AddLoanModal`: On save or cancel $\rightarrow$ if stack has institution, pop and restore institution sheet.
    - `LoanDetailSheet`: On close $\rightarrow$ pop and restore institution sheet (if opened from institution).
    - `LoanPaymentModal`: On submit or cancel $\rightarrow$ pop and restore loan detail sheet.
    - `EditLoanModal`: On save or cancel $\rightarrow$ pop and restore loan detail sheet.
    - `AddSubscriptionModal`: On save or cancel $\rightarrow$ if editing, pop and restore subscription detail sheet.

### 3.2. Dashboard Screen (`apps/mobile/app/(tabs)/index.tsx`)

- Maintain `modalBackStackRef = useRef<ModalStackItem[]>([])`.
- Helper `pushModalBackStack(item: ModalStackItem)` and `popAndRestoreModal()`.
- Wire `InstitutionDetailSheet` sub-actions:
    - `onAddPocket`: Push institution, hide institution sheet, open `AddPocketModal`.
    - `onEditPocket`: Push institution, hide institution sheet, open `EditPocketModal`.
    - `onAddLoan`: Push institution, hide institution sheet, open `AddLoanModal`.
    - `onSelectLoan`: Push institution, hide institution sheet, open `LoanDetailSheet`.
- Wire `LoanDetailSheet` sub-actions:
    - `onRecordPayment`: Push loanDetail, hide loan sheet, open `LoanPaymentModal`.
    - `onEdit`: Push loanDetail, hide loan sheet, open `EditLoanModal`.
    - `onClose`: If stack has parent, pop and restore it.
- Wire `TransactionDetailSheet` sub-actions:
    - `onEdit`: Push transactionDetail, hide transaction sheet, open `EditTransactionModal`.
    - On edit save or cancel $\rightarrow$ pop and restore transaction detail sheet with refreshed transaction data.

---

## 4. Verification Strategy

1. **Unit & Logic Testing**:
    - Verify modal stack push/pop sequencing with test assertions.
2. **Type Checking**:
    - Run `npm run typecheck` across all workspaces to guarantee strict typing.
3. **Automated Test Suite**:
    - Run `npm run test --workspace=@finance-tracker/mobile`.
4. **Formatting & Pre-commit Hooks**:
    - Format with Prettier and verify lint-staged clean pass.
