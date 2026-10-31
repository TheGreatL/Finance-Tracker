# Keyboard-Avoiding Form Inputs Implementation Plan

**Created:** 2026-10-31 15:36 (Local Time)

## Overview

Implement dynamic keyboard-avoiding bottom insets across all 9 application modal forms in `apps/mobile`. When the keyboard appears, forms will dynamically expand their bottom scroll runway so that inputs near the bottom (notes, interest rates, savings details, due dates) and action buttons sit comfortably above the keyboard rather than being obscured.

---

## Proposed Changes

### 1. Create `useKeyboardBottomInset` Hook

#### File: [`apps/mobile/src/hooks/useKeyboardBottomInset.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/hooks/useKeyboardBottomInset.ts)

- Implement `useKeyboardBottomInset(extraPadding = 32): number`.
- Subscribes to `keyboardWillShow` / `keyboardDidShow` and `keyboardWillHide` / `keyboardDidHide`.
- Returns dynamic bottom padding in pixels (`keyboardHeight + extraPadding` when visible, `extraPadding` when hidden).

---

### 2. Update All 9 Modal Forms

Apply `useKeyboardBottomInset` and standardize `KeyboardAvoidingView` & `ScrollView` in:

1. [`AddAccountModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/AddAccountModal.tsx)
2. [`AddPocketModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/AddPocketModal.tsx)
3. [`EditPocketModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/EditPocketModal.tsx)
4. [`AddLoanModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/AddLoanModal.tsx)
5. [`EditLoanModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/EditLoanModal.tsx)
6. [`LoanPaymentModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/LoanPaymentModal.tsx)
7. [`AddSubscriptionModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/subscriptions/AddSubscriptionModal.tsx)
8. [`TransactionFormModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/transactions/TransactionFormModal.tsx)
9. [`EditTransactionModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/transactions/EditTransactionModal.tsx)

In each modal:

- Import `useKeyboardBottomInset`.
- `const keyboardInset = useKeyboardBottomInset(32);`
- Update `KeyboardAvoidingView` to `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`.
- Update `ScrollView` to `contentContainerStyle={{ paddingBottom: keyboardInset }}` and `keyboardShouldPersistTaps="handled"`.

---

### 3. Testing & Verification

#### File: [`apps/mobile/tests/keyboard_inset.test.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/tests/keyboard_inset.test.ts)

- Add unit tests verifying `useKeyboardBottomInset` responds to keyboard show and hide events.
- Run `npm run test --workspace=@finance-tracker/mobile`.
- Run `npm run typecheck`.
- Format modified files with Prettier.
