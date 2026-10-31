# Form Submitting State & Subscription Saving Resilience Design Specification

**Created:** 2026-10-31 14:18 (Local Time)

## 1. Overview & Problem Diagnosis

### Problem 1: Subscription Saving Stuck at Saving State

- **Symptom:** Saving a subscription in [`AddSubscriptionModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/subscriptions/AddSubscriptionModal.tsx) gets permanently stuck at `"Saving Subscription..."`.
- **Root Cause:**
    1. [`createSubscription`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/subscriptionService.ts#L132) previously awaited `scheduleSubscriptionReminder` _before_ inserting into SQLite.
    2. `scheduleSubscriptionReminder` invokes `requestNotificationPermissions()` which interacts with native `expo-notifications` (`getPermissionsAsync`, `requestPermissionsAsync`, and `setNotificationChannelAsync`). On Android devices / emulators or when a permission prompt is pending or obstructed by a React Native `<Modal>`, `expo-notifications` native promises can hang or fail to resolve.
    3. Because the notification scheduling was blocking and had no timeout, the database record was never saved and the submit promise never resolved, leaving `submitting === true` indefinitely.
    4. Additionally, in [`processDueSubscriptions`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/subscriptionService.ts#L396) called during `loadData()`, notification reminders and confirmation alerts were also awaited synchronously without timeouts.

### Problem 2: Inputs and "Out" Buttons Allowed Interruption During Submitting

- **Symptom:** When a user taps Save across all forms, input fields, dropdown selectors, pickers, and modal dismiss / close buttons (`X`, backdrop, hardware back) remained active. Tapping them or re-submitting interrupted pending database writes or caused inconsistent UI state.
- **Affected Forms:**
    1. [`AddSubscriptionModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/subscriptions/AddSubscriptionModal.tsx)
    2. [`AddLoanModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/AddLoanModal.tsx)
    3. [`LoanPaymentModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/LoanPaymentModal.tsx)
    4. [`EditLoanModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/EditLoanModal.tsx)
    5. [`AddAccountModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/AddAccountModal.tsx)
    6. [`AddPocketModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/AddPocketModal.tsx)
    7. [`EditPocketModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/EditPocketModal.tsx)
    8. [`TransactionFormModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/transactions/TransactionFormModal.tsx)
    9. [`EditTransactionModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/transactions/EditTransactionModal.tsx)

---

## 2. Architecture & Design Solutions

### 2.1 Database-First & Timed Notification Safety

1. **Database-First Ingestion:**
   In `createSubscription` and `updateSubscription`, SQLite `runAsync` (`INSERT` / `UPDATE`) executes first. Once the financial record is committed to SQLite, notification scheduling executes safely with non-blocking error handling. If notifications fail or are denied, the subscription remains saved and accessible.
2. **Safety Timeout on Native Notifications:**
   In [`notificationService.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/notificationService.ts), introduce `withTimeout<T>(promise, ms = 2000, fallback)` to guarantee that no notification permission check or scheduling call can ever hang longer than 2 seconds.
3. **Safe Fallbacks in `processDueSubscriptions`:**
   Wrap notification confirmations and reminder renewals in `processDueSubscriptions` so subscription billing catch-up never blocks `loadData()`.

### 2.2 Global Form Locking Standard During Submitting State

Every form modal adheres to the locked submit state pattern:

1. **Disable All Inputs:**
    - Text inputs receive `editable={!submitting}`.
    - Dropdown selectors receive `disabled={submitting}` via an added `disabled?: boolean` prop on [`SearchableSelectField`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/common/SearchableSelectModal.tsx).
    - Frequency/type toggles receive `disabled={submitting}`.
    - Date picker triggers receive `disabled={submitting}`.
    - File attachment and delete buttons receive `disabled={submitting}`.
2. **Disable "Out" Buttons:**
    - Header close `X` button receives `disabled={submitting}` and `pointerEvents={submitting ? 'none' : 'auto'}`.
    - Cancel buttons receive `disabled={submitting}`.
    - Modal `onRequestClose` is guarded: `onRequestClose={submitting ? () => {} : onClose}` to prevent Android back button from dismissing a saving form mid-flight.
3. **Submit Button State & Visual Feedback:**
    - `disabled={submitting}`
    - Styling switches to `opacity-50` when submitting.
    - Text updates to show progress (e.g., `"Saving Subscription..."`, `"Saving...", "Recording Payment..."`).

---

## 3. Detailed Component Plan

| Component               | In inputs disabled                                                                    | Out/close buttons disabled                          | Submit button disabled & styled          |
| ----------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------- |
| `SearchableSelectField` | Add `disabled?: boolean` prop; grey out and block opening when true                   | N/A                                                 | N/A                                      |
| `AddSubscriptionModal`  | All text fields, preset chips, pocket/category selects, frequency pills, date buttons | Header `X`, `onRequestClose`                        | `"Saving Subscription..."`, `opacity-50` |
| `AddLoanModal`          | All text fields, lender select, date picker, document attachment & remove buttons     | Header `X`, `onRequestClose`                        | `"Saving Loan..."`, `opacity-50`         |
| `LoanPaymentModal`      | Source pocket select, amount field, date picker, preset buttons, notes field          | Header `X`, `onRequestClose`                        | `"Recording Payment..."`, `opacity-50`   |
| `EditLoanModal`         | Title, provider select, due date, monthly payment, notes, attachments                 | Header `X`, `onRequestClose`                        | `"Saving Changes..."`, `opacity-50`      |
| `AddAccountModal`       | Account name, institution select, type toggle, starting balance, interest, notes      | Header `X`, switch to loan banner, `onRequestClose` | `"Creating Account..."`, `opacity-50`    |
| `AddPocketModal`        | Pocket name, pocket type toggle, starting balance, interest, notes                    | Header `X`, `onRequestClose`                        | `"Adding Pocket..."`, `opacity-50`       |
| `EditPocketModal`       | Pocket name, pocket type toggle, interest, savings details                            | Header `X`, `onRequestClose`                        | `"Saving Changes..."`, `opacity-50`      |
| `TransactionFormModal`  | Type pills, amount, title, pocket select, destination pocket select, category, notes  | Header `X`, `onRequestClose`                        | `"Recording...", `opacity-50`            |
| `EditTransactionModal`  | Title, category select, date picker, notes                                            | Header `X`, `onRequestClose`                        | `"Saving Changes..."`, `opacity-50`      |

---

## 4. Verification Plan

1. **Unit Tests:**
    - Run `subscription_service.test.ts` to confirm subscription creation and updates persist immediately.
    - Run `loan_service.test.ts`, `transaction_service.test.ts`, and `account_service.test.ts`.
    - Add unit test verifying that `createSubscription` succeeds even if notification scheduling rejects or times out.
2. **Typecheck & Linting:**
    - `npm run typecheck` across all workspaces.
    - `npm run lint` across all workspaces.
3. **Format Verification:**
    - Prettier check respecting `.prettierrc` (`printWidth: 150`, `tabWidth: 4`).
