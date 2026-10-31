# Implementation Plan: Action Feedback Toast & Reversible Safeguards

**Created:** 2026-10-31 19:08 (Local Time)

## Proposed Changes

### 1. Toast Context & Component

- Create `apps/mobile/src/context/ToastContext.tsx`:
    - `ToastProvider`: Manages active toast state, animation transitions, auto-dismiss timers, and renders the floating toast overlay.
    - `useToast()`: Hook exposing `showToast` and `hideToast`.
- Create unit test `apps/mobile/tests/toast_context.test.ts`.

### 2. Root Provider Integration

- Mount `<ToastProvider>` in `apps/mobile/app/_layout.tsx` within `RootLayoutNav`.

### 3. Screen Integration

- Update `apps/mobile/app/(tabs)/index.tsx` (Dashboard):
    - On transaction created -> `showToast('Transaction recorded')`.
    - On account/pocket created -> `showToast('Account created')`.
    - On transaction deleted -> `showToast({ message: 'Transaction deleted', action: { label: 'Undo', onPress: restoreTx } })`.
- Update `apps/mobile/app/(tabs)/two.tsx` (Ledger):
    - On transaction recorded/edited -> `showToast('Transaction saved')`.
    - On transaction deleted -> `showToast({ message: 'Transaction deleted', action: { label: 'Undo', onPress: restoreTx } })`.
- Update `apps/mobile/app/(tabs)/accounts.tsx` (Accounts):
    - On job created -> `showToast('Job stream added')`.
    - On loan created/payment recorded -> `showToast('Loan updated')`.
    - On subscription created/status changed -> `showToast('Subscription updated')`.

### 4. Verification & Impeccable Critique

- Run `npm run typecheck` and `npm run test --workspace=@finance-tracker/mobile`.
- Run `$impeccable critique` to verify the score impact.
