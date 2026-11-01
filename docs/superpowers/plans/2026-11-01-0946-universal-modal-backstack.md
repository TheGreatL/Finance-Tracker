# Universal Modal Back-Stack Navigation Implementation Plan

**Created:** 2026-11-01 09:46 (Local Time)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement universal modal back-stack navigation across `obligations.tsx`, `accounts.tsx`, `two.tsx`, and `index.tsx`, ensuring single-modal presentation invariance and breadcrumb history when dialogs trigger nested child dialogs.

**Architecture:** Maintain a ref-based breadcrumb stack (`modalBackStackRef`) on screens with multi-level dialog flows (`obligations.tsx`, `accounts.tsx`, `two.tsx`, `index.tsx`); dismiss parent sheets before presenting child dialogs; restore parent sheets with fresh database state on child dismissal or completion.

**Tech Stack:** React Native (Expo SDK 54), TypeScript, SQLite (expo-sqlite), TailwindCSS (NativeWind v4).

**Spec:** [docs/superpowers/specs/2026-11-01-0946-universal-modal-backstack-design.md](file:///c:/Users/user/Desktop/projects/finance-tracker/docs/superpowers/specs/2026-11-01-0946-universal-modal-backstack-design.md)

## Global Constraints

- **CRITICAL**: The user instructed _"for this time, let me commit and add the changes"_. **NEVER run `git add` or `git commit`**. All changes must remain unstaged.
- Zero emojis or emoticons anywhere in code or user-facing strings.
- All file and component links must use clickable `file:///` markdown syntax.
- Follow existing codebase patterns for modal transitions (~120ms animation debounce) and state syncing.

## Review Focus

1. **Double Presentation Prevention**: Confirm that opening any child dialog immediately sets the parent modal's visibility to `false` so two native modals are never active simultaneously.
2. **Back-Stack Re-entry Consistency**: Confirm that closing a child dialog via Cancel, Close button, or background tap correctly triggers `popAndRestoreModal()` without leaving orphaned state.
3. **Fresh Data Sync**: Confirm that saving in an edit/record modal refreshes the underlying database records before presenting the parent detail sheet.
4. **Empty Stack Safety**: Confirm that dismissing top-level dialogs (when the stack is empty) cleanly closes without errors or unhandled timeouts.
5. **Memory & Timer Leaks**: Ensure timeouts for modal restoration are guarded or safe against unmounted components.

---

### Task 1: Modal Back-Stack in Obligations Screen (`obligations.tsx`)

**Files:**

- Modify: `apps/mobile/app/(tabs)/obligations.tsx`

**Features:**

- Define `ModalStackItem` union (`jobDetail`, `loanDetail`, `subscriptionDetail`).
- Add `modalBackStackRef`, `pushModalBackStack`, and `popAndRestoreModal`.
- Wire `JobDetailSheet` transitions:
    - `onEdit` $\rightarrow$ push `jobDetail`, hide sheet, open `EditJobModal`.
    - `onRecordPayday` $\rightarrow$ push `jobDetail`, hide sheet, open `RecordPaydayModal`.
    - `onViewPaySlip` $\rightarrow$ push `jobDetail`, hide sheet, open `PaySlipDetailModal`.
    - On close/save in `EditJobModal`, `RecordPaydayModal`, or `PaySlipDetailModal` $\rightarrow$ pop and restore `JobDetailSheet` with fresh job record.
- Wire `LoanDetailSheet` transitions:
    - `onRecordPayment` $\rightarrow$ push `loanDetail`, hide sheet, open `LoanPaymentModal`.
    - `onEdit` $\rightarrow$ push `loanDetail`, hide sheet, open `EditLoanModal`.
    - On close/submit in `LoanPaymentModal` or `EditLoanModal` $\rightarrow$ pop and restore `LoanDetailSheet` with fresh loan record.
- Wire `SubscriptionDetailSheet` transitions:
    - `onEdit` $\rightarrow$ push `subscriptionDetail`, hide sheet, open `AddSubscriptionModal` (editing).
    - On close/save in `AddSubscriptionModal` $\rightarrow$ pop and restore `SubscriptionDetailSheet` with fresh subscription record.

- [ ] **Step 1: Define `ModalStackItem` and back-stack handlers in `obligations.tsx`**
- [ ] **Step 2: Update `JobDetailSheet`, `EditJobModal`, `RecordPaydayModal`, and `PaySlipDetailModal` handlers**
- [ ] **Step 3: Update `LoanDetailSheet`, `EditLoanModal`, and `LoanPaymentModal` handlers**
- [ ] **Step 4: Update `SubscriptionDetailSheet` and `AddSubscriptionModal` handlers**

---

### Task 2: Modal Back-Stack in Accounts Screen (`accounts.tsx`)

**Files:**

- Modify: `apps/mobile/app/(tabs)/accounts.tsx`

**Features:**

- Define `ModalStackItem` union (`institution`, `loanDetail`).
- Add `modalBackStackRef`, `pushModalBackStack`, and `popAndRestoreModal`.
- Wire `InstitutionDetailSheet` transitions:
    - `onAddPocket` $\rightarrow$ push `institution`, hide sheet, open `AddPocketModal`.
    - `onEditPocket` $\rightarrow$ push `institution`, hide sheet, open `EditPocketModal`.
    - `onAddLoan` $\rightarrow$ push `institution`, hide sheet, open `AddLoanModal`.
    - `onSelectLoan` $\rightarrow$ push `institution`, hide sheet, open `LoanDetailSheet`.
- Wire `LoanDetailSheet` transitions on Accounts:
    - `onRecordPayment` $\rightarrow$ push `loanDetail`, hide sheet, open `LoanPaymentModal`.
    - `onEdit` $\rightarrow$ push `loanDetail`, hide sheet, open `EditLoanModal`.
    - `onClose` $\rightarrow$ pop and restore `InstitutionDetailSheet`.
- On close/save in child modals $\rightarrow$ call `popAndRestoreModal()`.

- [ ] **Step 1: Define `ModalStackItem` and back-stack handlers in `accounts.tsx`**
- [ ] **Step 2: Wire `InstitutionDetailSheet` sub-actions and child modals**
- [ ] **Step 3: Wire `LoanDetailSheet` and child loan modals**

---

### Task 3: Modal Back-Stack in Ledger Screen (`two.tsx`) and Dashboard (`index.tsx`)

**Files:**

- Modify: `apps/mobile/app/(tabs)/two.tsx`
- Modify: `apps/mobile/app/(tabs)/index.tsx`

**Features:**

- In `two.tsx`:
    - Add `modalBackStackRef`, `pushModalBackStack`, and `popAndRestoreModal`.
    - When `onEdit` is tapped in `TransactionDetailSheet` $\rightarrow$ push `transactionDetail`, hide sheet, open `EditTransactionModal`.
    - When `EditTransactionModal` is closed or saved $\rightarrow$ pop and restore `TransactionDetailSheet` with refreshed transaction.
- In `index.tsx`:
    - Wire `onQuickExpense` on `InstitutionDetailSheet` $\rightarrow$ push `institution`, hide sheet, open `TransactionFormModal`.
    - When `TransactionFormModal` is closed or saved $\rightarrow$ pop and restore `InstitutionDetailSheet` if opened from an institution.

- [ ] **Step 1: Implement back-stack in `two.tsx` for transaction edit flow**
- [ ] **Step 2: Connect quick expense modal back-stack in `index.tsx`**

---

### Task 4: Full Verification & Codebase Integrity

**Files:**

- All touched files
- Monorepo test suites

- [ ] **Step 1: Run TypeScript compiler check (`npm run typecheck`)**
- [ ] **Step 2: Run all unit tests (`npm run test --workspace=@finance-tracker/mobile`)**
- [ ] **Step 3: Format code with Prettier (`npx prettier --write`)**
- [ ] **Step 4: Confirm all changes remain unstaged (NO `git add`, NO `git commit`)**
- [ ] **Step 5: Present results and summary to the user**
