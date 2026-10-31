# Form Submitting State & Subscription Saving Resilience Implementation Plan

**Created:** 2026-10-31 14:18 (Local Time)

## 1. Goal

1. Prevent subscriptions from getting stuck at the saving state by making SQLite persistence primary, adding safety timeouts to native notification operations, and ensuring non-blocking reminder scheduling.
2. Disable all interactive input fields and all "out" / dismiss / close buttons across all application forms whenever they are in a submitting / saving state, preventing user interruption.

---

## 2. Proposed Changes

### Task 1: Add Notification Timeouts & Database-First Ingestion

- **File:** [`apps/mobile/src/services/notificationService.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/notificationService.ts)
    - Implement a `withTimeout<T>(promise, ms, fallback)` utility.
    - Wrap `Notifications.getPermissionsAsync()`, `Notifications.requestPermissionsAsync()`, `Notifications.setNotificationChannelAsync()`, and `Notifications.scheduleNotificationAsync()` with timeout guards (maximum 2000ms).
- **File:** [`apps/mobile/src/services/subscriptionService.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/subscriptionService.ts)
    - In `createSubscription`: Execute `INSERT INTO subscriptions` immediately first. Schedule notifications in a non-blocking try/catch and update `notification_id` upon resolution.
    - In `updateSubscription`: Execute `UPDATE subscriptions` first, then reschedule reminders safely.
    - In `processDueSubscriptions`: Guard confirmation notifications so background billing catch-up never delays screen loading.

### Task 2: Add `disabled` Prop to `SearchableSelectField`

- **File:** [`apps/mobile/src/components/common/SearchableSelectModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/common/SearchableSelectModal.tsx)
    - Add `disabled?: boolean` to `SearchableSelectFieldProps`.
    - Disable opening the modal and apply `opacity-60` styling when `disabled === true`.

### Task 3: Lock Inputs & "Out" Buttons During Submit Across All Forms

- **Files:**
    1. [`apps/mobile/src/components/subscriptions/AddSubscriptionModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/subscriptions/AddSubscriptionModal.tsx)
    2. [`apps/mobile/src/components/loans/AddLoanModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/AddLoanModal.tsx)
    3. [`apps/mobile/src/components/loans/LoanPaymentModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/LoanPaymentModal.tsx)
    4. [`apps/mobile/src/components/loans/EditLoanModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/EditLoanModal.tsx)
    5. [`apps/mobile/src/components/accounts/AddAccountModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/AddAccountModal.tsx)
    6. [`apps/mobile/src/components/accounts/AddPocketModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/AddPocketModal.tsx)
    7. [`apps/mobile/src/components/accounts/EditPocketModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/EditPocketModal.tsx)
    8. [`apps/mobile/src/components/transactions/TransactionFormModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/transactions/TransactionFormModal.tsx)
    9. [`apps/mobile/src/components/transactions/EditTransactionModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/transactions/EditTransactionModal.tsx)
- For each form:
    - Disable header close `X` button: `disabled={submitting}`, `pointerEvents={submitting ? 'none' : 'auto'}`.
    - Guard modal request close: `onRequestClose={submitting ? () => {} : onClose}`.
    - Set `editable={!submitting}` on all `TextInput` components.
    - Set `disabled={submitting}` on all `SearchableSelectField`, pill buttons, date triggers, and attachment buttons.
    - Apply `submitting ? 'opacity-50' : 'active:opacity-90'` styling to submit buttons.

### Task 4: Unit Testing & Verification

- **File:** [`apps/mobile/tests/subscription_service.test.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/tests/subscription_service.test.ts)
    - Add test confirming `createSubscription` and `updateSubscription` persist data even when notification scheduling fails or rejects.
- **Verification Commands:**
    - `npm run test --workspace=@finance-tracker/mobile`
    - `npm run typecheck`
    - `npm run lint`
    - `npx lint-staged`
