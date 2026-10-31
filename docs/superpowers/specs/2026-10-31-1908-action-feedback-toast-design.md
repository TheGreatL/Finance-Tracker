# Design Specification: Action Feedback Toast & Reversible Safeguards

**Created:** 2026-10-31 19:08 (Local Time)

## 1. Overview & Objective

To enhance usability, system transparency, and user safety, we are implementing a global, non-blocking toast notification system with support for reversible ("Undo") safeguards.

This directly elevates:

- **Nielsen Heuristic #1 (Visibility of System Status)**: Provides immediate, unambiguous confirmation that data (transactions, pockets, accounts, jobs, loans) has been successfully persisted to SQLite.
- **Nielsen Heuristic #3 (User Control & Freedom)**: Introduces reversible deletion safeguards for transactions and accounts via a 4-second "Undo" snackbar.

## 2. Visual & Interaction Design

- **Positioning**: Floats centered above the bottom tab bar (`bottom: 80px`), safe from device home bars and tab bars.
- **Palette & Typography**:
    - Container: Deep Pine (`#18342B`) with soft border (`border border-[#BBD583]/20`) and rounded pill styling (`rounded-full`).
    - Icons: Lucide `<CheckCircle2 size={16} color="#BBD583" />` for success, `<Info size={16} color="#BBD583" />` for info, `<AlertCircle size={16} color="#F87171" />` for errors. No emojis.
    - Text: `text-xs font-semibold text-white`.
    - Action Button: Soft sage pill (`bg-[#BBD583]/20 active:bg-[#BBD583]/30`) with `text-xs font-bold text-[#BBD583]`.
- **Motion**:
    - Fade-in and gentle upward slide (180ms ease-out).
    - Auto-dismiss after 3.5 seconds (or custom duration).
    - Dismissible immediately upon swipe or tap.

## 3. Architecture & Interfaces

```typescript
export interface ToastAction {
    label: string;
    onPress: () => void;
}

export interface ToastOptions {
    message: string;
    type?: 'success' | 'info' | 'error';
    action?: ToastAction;
    durationMs?: number;
}

export interface ToastContextValue {
    showToast: (options: ToastOptions | string) => void;
    hideToast: () => void;
}
```

## 4. Reversible Deletion Flow (Undo)

1. User requests deletion (e.g., swipe or tap delete transaction in Ledger or Dashboard).
2. Record is removed from visible state immediately.
3. Toast triggers: `showToast({ message: 'Transaction deleted', action: { label: 'Undo', onPress: () => restoreTx() } })`.
4. If "Undo" is clicked within 4 seconds, the transaction is re-inserted into the visible list and SQLite.
5. If dismissed or timed out, deletion is committed to the database.
