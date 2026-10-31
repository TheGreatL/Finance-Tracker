# Keyboard-Avoiding Form Inputs Design Specification

**Created:** 2026-10-31 15:36 (Local Time)

## 1. Problem Statement & Motivation

Across the mobile application, several modals contain lengthy forms with input fields located near the bottom:

- [`AddAccountModal`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/AddAccountModal.tsx): Starting balance, interest rate, savings details, and "Create Account" button.
- [`AddLoanModal`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/AddLoanModal.tsx): Due date, interest rate, notes, attachments, and "Save Loan" button.
- [`EditLoanModal`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/EditLoanModal.tsx): Monthly payment, due date, notes, and "Save Changes" button.
- [`AddPocketModal`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/AddPocketModal.tsx) & [`EditPocketModal`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/EditPocketModal.tsx): Starting balance, interest rate, details, and save button.
- [`LoanPaymentModal`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/LoanPaymentModal.tsx): Payment notes and "Confirm Payment" button.
- [`TransactionFormModal`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/transactions/TransactionFormModal.tsx) & [`EditTransactionModal`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/transactions/EditTransactionModal.tsx): Notes and "Save Transaction" button.
- [`AddSubscriptionModal`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/subscriptions/AddSubscriptionModal.tsx): Notes and "Save Subscription" button.

### Current Issue

When the user focuses an input near the bottom, the on-screen keyboard (280–350px tall) slides up and obscures the active input field and the submission button. Because the inner `ScrollView` instances lack keyboard-aware bottom padding (`contentContainerStyle`), the scroll view cannot scroll far enough down, causing fields to rubber-band back down underneath the keyboard.

### Target Experience

Similar to the successful implementation on the assistant/chatbot screen (`assistant.tsx`), the forms must dynamically elevate bottom content when the keyboard appears:

1. Active input fields and submission buttons must remain visible above the on-screen keyboard.
2. The user can effortlessly scroll all the way through the form without inputs getting blocked or trapped.
3. When the keyboard is dismissed, padding resets gracefully to normal spacing.

---

## 2. Technical Architecture

### 2.1. Dedicated Hook: `useKeyboardBottomInset`

Create a centralized hook in `apps/mobile/src/hooks/useKeyboardBottomInset.ts`:

```typescript
import { useState, useEffect } from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';

export function useKeyboardBottomInset(extraPadding: number = 32): number {
    const [bottomInset, setBottomInset] = useState<number>(extraPadding);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const onShow = (e: KeyboardEvent) => {
            const height = e.endCoordinates?.height ?? 0;
            setBottomInset(height + extraPadding);
        };

        const onHide = () => {
            setBottomInset(extraPadding);
        };

        const showSub = Keyboard.addListener(showEvent, onShow);
        const hideSub = Keyboard.addListener(hideEvent, onHide);

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, [extraPadding]);

    return bottomInset;
}
```

### 2.2. Standardized Modal Container Pattern

To eliminate OS-specific keyboard quirks:

1. **KeyboardAvoidingView**:
   Use `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`.
    - On iOS, this prevents the modal frame from being covered by the keyboard.
    - On Android, `undefined` prevents double-padding conflicts with Android's native `adjustResize` window behavior.
2. **ScrollView**:
    - Apply `contentContainerStyle={{ paddingBottom: keyboardInset }}`.
    - Ensure `keyboardShouldPersistTaps="handled"`.
    - Now the `ScrollView` has sufficient dynamic runway for the active `TextInput` and the submit button to sit above the keyboard.

---

## 3. Scope of Form Modals

Apply the keyboard-avoiding pattern to all 9 modal forms:

1. `apps/mobile/src/components/accounts/AddAccountModal.tsx`
2. `apps/mobile/src/components/accounts/AddPocketModal.tsx`
3. `apps/mobile/src/components/accounts/EditPocketModal.tsx`
4. `apps/mobile/src/components/loans/AddLoanModal.tsx`
5. `apps/mobile/src/components/loans/EditLoanModal.tsx`
6. `apps/mobile/src/components/loans/LoanPaymentModal.tsx`
7. `apps/mobile/src/components/subscriptions/AddSubscriptionModal.tsx`
8. `apps/mobile/src/components/transactions/TransactionFormModal.tsx`
9. `apps/mobile/src/components/transactions/EditTransactionModal.tsx`

---

## 4. Verification Plan

1. Unit test `useKeyboardBottomInset` testing show and hide event callbacks.
2. Run `npm run typecheck` across all workspaces.
3. Run `npm run test --workspace=@finance-tracker/mobile`.
4. Verify code formatting with Prettier.
