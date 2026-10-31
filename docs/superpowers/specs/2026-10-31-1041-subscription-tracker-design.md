# Subscription Tracker Design Specification

**Created:** 2026-10-31 10:41 (Local Time)

## 1. Intent & Context
Recurring subscriptions (Netflix, Spotify, YouTube Premium, iCloud+, ChatGPT Plus, Gym memberships, fiber internet) silently drain bank and e-wallet balances every week, month, or year. Users want to register their subscriptions once and have the app:
1. Display recognizable **SVG brand logos** for each subscription service.
2. **Automatically deduct** the subscription cost from the linked bank/e-wallet pocket when the billing date arrives—and **catch up missed billing cycles automatically** the next time the app opens if the phone was off or idle.
3. Record each deduction as a regular `'expense'` transaction in the ledger (`transactions` table) and advance `next_billing_date` to the next cycle.
4. Send a **1-day-before reminder notification** and an immediate **payment confirmation alert** upon deduction.
5. Provide a dedicated **Subscription Management & Overview** section showing active subscriptions, normalized monthly spend, next upcoming bill, and controls to **edit, pause, resume, or cancel** any subscription.

---

## 2. Goals, Non-Goals & Constraints

### Goals
- **Complete Subscription Entry:** Capture Service Name (with preset picker + custom name), Payment Source (`pocket_id`), Amount, Frequency (`weekly`, `monthly`, `yearly`), Start Date, Next Billing Date (via `DatePickerModal`), and Category.
- **Custom SVG Brand Logos:** Render crisp vector logos via `react-native-svg` for popular services (`netflix`, `spotify`, `youtube`, `disney`, `apple`, `google_one`, `chatgpt`, `canva`, `microsoft_365`, `prime`, `gym`, `internet`, `custom`).
- **Atomic Auto-Deduction & Catch-Up Engine:** On app launch / screen focus, detect all `active` subscriptions where `next_billing_date <= today` (local `YYYY-MM-DD`), deduct the amount from `account_pockets.current_balance`, insert a ledger record into `transactions`, and advance `next_billing_date` cycle-by-cycle until it is in the future.
- **Dual Local Notifications (`expo-notifications`):**
  - **Upcoming Reminder:** Scheduled 1 day before `next_billing_date` at 9:00 AM local time naming the amount and payment pocket.
  - **Payment Confirmation:** Immediate local notification fired right after an automatic deduction completes.
- **Overview & Lifecycle Management:** View active/paused/cancelled subscriptions, total monthly subscription spend (normalizing weekly $\times 52/12$ and yearly $\div 12$), next upcoming bill, and actions to Edit, Pause/Resume, Cancel, or Delete.

### Non-Goals
- Server-side cron jobs or bank webhook scraping (all data is offline-first in `expo-sqlite`).
- Multi-currency FX conversion per billing cycle (all amounts are in `₱` PHP consistent with the ledger).

### Constraints
- **Offline On-Device Execution:** iOS and Android do not allow killed apps to run arbitrary SQLite transactions while the phone is powered off. Scheduled reminders (`1 day before`) are registered with the OS notification scheduler ahead of time, while balance deductions, ledger inserts, next-date rollovers, and confirmation alerts execute automatically via the catch-up engine whenever the app opens or regains focus.
- **Safety Cap on Catch-Up Cycles:** If a user enters a historical `next_billing_date`, cap catch-up iterations at `60` cycles per run to prevent accidental infinite loops.

---

## 3. Approaches Considered & Selected

### Approach A: Dedicated `subscriptions` Table + Focus Catch-Up Engine + Accounts Filter & Dashboard Banner *(Selected)*
- Create a dedicated `subscriptions` SQLite table referencing `account_pockets(id)`.
- Run `processDueSubscriptions(db)` inside the Dashboard and Accounts data loaders before querying balances and transactions.
- Surface a `SubscriptionsBanner` on the Dashboard and a `🔄 Subscriptions` view inside `(tabs)/accounts.tsx` (matching the existing `💳 Loans & Debt` pattern without crowding the 5-tab bottom bar).
- **Why Selected:** Preserves the 5-tab navigation layout, guarantees atomic balance + transaction updates via `db.withTransactionAsync`, and handles multi-cycle offline catch-up deterministically.

### Approach B: Adding a 6th Bottom Tab for Subscriptions *(Discarded)*
- **Why Discarded:** 6 tabs cramp small Android screens and break the centered floating `Advisor` button symmetry in `(tabs)/_layout.tsx`.

---

## 4. Architectural & Implementation Details

### 4.1 SQLite Schema (`src/database/schema.ts` & `src/database/db.ts`)
```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  service_name TEXT NOT NULL,
  service_code TEXT NOT NULL DEFAULT 'custom',
  pocket_id TEXT NOT NULL,
  amount REAL NOT NULL,
  frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'monthly', 'yearly')),
  start_date TEXT NOT NULL,
  next_billing_date TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'cancelled')),
  reminder_days_before INTEGER NOT NULL DEFAULT 1,
  notification_id TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (pocket_id) REFERENCES account_pockets(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_pocket ON subscriptions(pocket_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date);
```

### 4.2 Subscription Presets & SVG Logos
- **`src/constants/subscriptions.ts`**:
  - Defines `SUBSCRIPTION_PRESETS` (`netflix`, `spotify`, `youtube`, `disney`, `apple`, `google_one`, `chatgpt`, `canva`, `microsoft_365`, `prime`, `gym`, `internet`, `custom`) with `code`, `name`, `color`, and `defaultCategory`.
  - Defines `SUBSCRIPTION_CATEGORIES`: `['Entertainment', 'Software', 'Cloud Storage', 'Utilities', 'Fitness & Health', 'Gaming', 'News & Education', 'Other']`.
- **`src/components/subscriptions/SubscriptionLogo.tsx`**:
  - Uses `react-native-svg` (`Svg`, `Rect`, `Path`, `Circle`, `Polygon`, `G`) to draw each service's vector icon inside a rounded squircle (`rx="24"` on a `0 0 100 100` viewBox), matching `InstitutionLogo.tsx`.

### 4.3 Billing Cycle Date Math & Normalization (`src/services/subscriptionService.ts`)
- `advanceBillingDate(dateStr: string, frequency: SubscriptionFrequency): string`:
  - Parses local `YYYY-MM-DD`.
  - `'weekly'`: adds 7 days.
  - `'monthly'`: increments month by 1 and clamps the day to the last day of the target month (`new Date(targetYear, targetMonth + 1, 0).getDate()`), so Jan 31 advances to Feb 28 (or Feb 29 in a leap year).
  - `'yearly'`: increments year by 1 and clamps Feb 29 to Feb 28 on non-leap years.
- `normalizeToMonthlyAmount(amount: number, frequency: SubscriptionFrequency): number`:
  - `'weekly'`: `Math.round(amount * (52 / 12) * 100) / 100`
  - `'monthly'`: `amount`
  - `'yearly'`: `Math.round((amount / 12) * 100) / 100`

### 4.4 Catch-Up Auto-Deduction (`processDueSubscriptions`)
- Queries all `status = 'active'` rows where `next_billing_date <= todayLocalISO`.
- For each due subscription:
  - Inside `db.withTransactionAsync`:
    - Loops while `next_billing_date <= todayLocalISO` (up to `MAX_CATCHUP_CYCLES = 60`):
      1. Reads current `account_pockets.current_balance` for `pocket_id`.
      2. Updates `account_pockets` with `current_balance = current_balance - sub.amount`.
      3. Inserts an `'expense'` row into `transactions` with `title = "Subscription: " + sub.service_name`, `amount = sub.amount`, `category = sub.category`, `date = currentBillingDate`, `notes = "Auto-deducted (" + sub.frequency + " subscription)"`.
      4. Advances `currentBillingDate = advanceBillingDate(currentBillingDate, sub.frequency)`.
    - Updates `subscriptions` row with the new future `next_billing_date` and `updated_at`.
  - Outside the SQLite transaction:
    - Fires `sendSubscriptionPaymentConfirmation(...)` via `expo-notifications`.
    - Schedules the next 1-day-prior reminder via `scheduleSubscriptionReminder(...)` and stores the returned `notification_id`.

### 4.5 Local Notifications (`src/services/notificationService.ts`)
- **Upcoming Reminder (`calculateSubscriptionReminderTrigger` & `scheduleSubscriptionReminder`):**
  - Trigger timestamp: `next_billing_date` minus `reminder_days_before` (default `1` day) at `09:00:00` local time.
  - Title: `Upcoming Subscription: ${service_name}`
  - Body: `₱${amount.toLocaleString()} will be charged tomorrow (${next_billing_date}) from ${pocketLabel}.`
- **Payment Confirmation (`sendSubscriptionPaymentConfirmation`):**
  - Immediate notification (`trigger: null`).
  - Title: `Subscription Paid: ${service_name}`
  - Body: `₱${totalDeducted.toLocaleString()} was automatically deducted from ${pocketLabel}.`

### 4.6 UI Screens & Components
- **`SubscriptionsBanner.tsx` (on Dashboard):** Displays active subscription count, monthly spend, and next upcoming charge. Tapping navigates to `/(tabs)/accounts?tab=subscriptions`.
- **`SubscriptionCard.tsx`:** Displays `SubscriptionLogo`, service name, payment pocket badge, frequency & category, amount, next due date badge, and status pill (`active`, `paused`, `cancelled`).
- **`AddSubscriptionModal.tsx`:** Supports both creating and editing a subscription. Includes preset service selector with SVG logos, service name input, payment pocket selector, amount input, frequency selector (`weekly` / `monthly` / `yearly`), start date & next billing date via `DatePickerModal`, and category chips.
- **`SubscriptionDetailSheet.tsx`:** Shows full billing summary, normalized monthly cost, payment pocket, and action buttons: **Edit Subscription**, **Pause / Resume**, **Cancel Subscription**, and **Delete**.

---

## 5. Verification Strategy
- **Unit Tests (Vitest):**
  - `tests/subscription_service.test.ts`: test `advanceBillingDate` (including Jan 31 -> Feb 28 month-end clamping and leap-year clamping), `normalizeToMonthlyAmount`, `createSubscription`, `processDueSubscriptions` (single due cycle, multi-cycle offline catch-up when phone was off for 3 months, skipping paused/cancelled subscriptions), `updateSubscriptionStatus`, and `getSubscriptionsSummary`.
  - `tests/notification_service.test.ts`: test 1-day-prior reminder trigger calculation and confirmation body formatting.
- **Typecheck:** `npx turbo run typecheck` with 0 errors.
