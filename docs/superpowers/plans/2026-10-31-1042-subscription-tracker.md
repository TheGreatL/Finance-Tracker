# Subscription Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Created:** 2026-10-31 10:42 (Local Time)

**Goal:** Build an offline-first Subscription Tracker with custom SVG service logos, automatic due-date pocket deductions and multi-cycle offline catch-up, ledger expense recording, 1-day-prior and payment-confirmation notifications, and a full management UI (add, edit, pause, resume, cancel, delete).

**Architecture:** Add a `subscriptions` table in `expo-sqlite` (`schema.ts`, `db.ts`) linked to `account_pockets(id)`. Implement `subscriptionService.ts` for CRUD, monthly spend normalization, billing date advancement, and `processDueSubscriptions` catch-up deductions inside atomic SQLite transactions. Extend `notificationService.ts` for 1-day-prior reminders and immediate confirmation alerts, build SVG brand logos in `SubscriptionLogo.tsx` and management modals/cards, and wire them into `(tabs)/index.tsx` and `(tabs)/accounts.tsx`.

**Tech Stack:** React Native 0.88 (Expo SDK 58), `expo-sqlite`, `expo-notifications`, `react-native-svg`, Lucide React Native, Uniwind (Tailwind v4), Vitest.

**Spec:** [`docs/superpowers/specs/2026-10-31-1041-subscription-tracker-design.md`](file:///c:/Users/user/Desktop/projects/finance-tracker/docs/superpowers/specs/2026-10-31-1041-subscription-tracker-design.md)

## Global Constraints

- All database operations run offline on-device via `expo-sqlite` with `PRAGMA foreign_keys = ON`.
- No new native dependencies may be installed; use existing `react-native-svg`, `expo-notifications`, `expo-sqlite`, and pure React Native modals (`DatePickerModal`).
- Catch-up auto-deductions must cap at `MAX_CATCHUP_CYCLES = 60` per subscription per run and execute pocket balance updates + transaction inserts atomically inside `db.withTransactionAsync`.
- All monetary amounts use PHP (`₱`) formatted via `formatCurrency`.

## Review Focus

- **Month-end & leap-year date rollover:** A monthly subscription billed on `2026-01-31` must advance to `2026-02-28` (not March 3), and a yearly subscription on `2024-02-29` must advance to `2025-02-28` (tested in Task 2).
- **Multi-cycle offline catch-up:** If the phone is off across 3 weekly cycles (`next_billing_date = '2026-10-10'`, reference date `'2026-10-25'`), `processDueSubscriptions` must deduct 3 times (`10-10`, `10-17`, `10-24`), insert 3 expense rows, and advance `next_billing_date` to `'2026-10-31'` (tested in Task 2).
- **Paused & cancelled immunity:** Subscriptions with `status = 'paused'` or `'cancelled'` must never be deducted by `processDueSubscriptions` even when `next_billing_date <= today` (tested in Task 2).
- **Resuming a paused subscription with a past billing date:** When `updateSubscriptionStatus(db, id, 'active', referenceDate)` resumes a subscription whose `next_billing_date` fell in the past while paused, it must advance `next_billing_date` forward to the next future cycle from `referenceDate` so the user is not retroactively charged for the paused period (tested in Task 2).
- **Past reminder window:** `calculateSubscriptionReminderTrigger` must return `null` when `next_billing_date - reminder_days_before` at 9:00 AM is already `<= referenceDate` (tested in Task 1).

---

### Task 1: Subscription Presets, Types & Notification Extensions

**Files:**
- Modify: [`apps/mobile/src/types/database.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/types/database.ts)
- Create: [`apps/mobile/src/constants/subscriptions.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/constants/subscriptions.ts)
- Modify: [`apps/mobile/src/services/notificationService.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/notificationService.ts)
- Modify: [`apps/mobile/tests/notification_service.test.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/tests/notification_service.test.ts)

**Interfaces:**
- Consumes: `Notifications` from `'expo-notifications'`
- Produces:
  - In `src/types/database.ts`:
    - `export type SubscriptionFrequency = 'weekly' | 'monthly' | 'yearly';`
    - `export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';`
    - `export interface SubscriptionRecord { id: string; service_name: string; service_code: string; pocket_id: string; amount: number; frequency: SubscriptionFrequency; start_date: string; next_billing_date: string; category: string; status: SubscriptionStatus; reminder_days_before: number; notification_id?: string; notes?: string; created_at: string; updated_at: string; pocket_name?: string; institution_name?: string; institution_code?: string; institution_color?: string; }`
    - `export interface CreateSubscriptionInput { serviceName: string; serviceCode?: string; pocketId: string; amount: number; frequency: SubscriptionFrequency; startDate: string; nextBillingDate: string; category: string; reminderDaysBefore?: number; notes?: string; }`
    - `export interface UpdateSubscriptionInput { serviceName?: string; serviceCode?: string; pocketId?: string; amount?: number; frequency?: SubscriptionFrequency; startDate?: string; nextBillingDate?: string; category?: string; reminderDaysBefore?: number; notes?: string; }`
  - In `src/constants/subscriptions.ts`:
    - `export interface SubscriptionPreset { code: string; name: string; color: string; defaultCategory: string; }`
    - `export const SUBSCRIPTION_PRESETS: SubscriptionPreset[]` (`netflix`, `spotify`, `youtube`, `disney`, `apple`, `google_one`, `chatgpt`, `canva`, `microsoft_365`, `prime`, `gym`, `internet`, `custom`)
    - `export const SUBSCRIPTION_CATEGORIES: string[]`
    - `export function getSubscriptionPreset(codeOrName?: string): SubscriptionPreset`
  - In `src/services/notificationService.ts`:
    - `export function calculateSubscriptionReminderTrigger(nextBillingDateStr: string, daysBefore?: number, referenceDate?: Date): Date | null`
    - `export function formatSubscriptionReminderBody(details: { serviceName: string; amount: number; nextBillingDate: string; pocketLabel: string; daysBefore?: number }): string`
    - `export function scheduleSubscriptionReminder(sub: { id: string; service_name: string; amount: number; next_billing_date: string; pocket_label: string; days_before?: number }): Promise<string | null>`
    - `export function sendSubscriptionPaymentConfirmation(charge: { service_name: string; amount: number; pocket_label: string; cycles?: number }): Promise<string | null>`

- [x] **Step 1: Write failing tests in `apps/mobile/tests/notification_service.test.ts`**

Add tests for `calculateSubscriptionReminderTrigger` and `formatSubscriptionReminderBody`:
```ts
it('calculateSubscriptionReminderTrigger schedules 1 day before next_billing_date at 9:00 AM', () => {
  const ref = new Date(2026, 10, 10, 8, 0, 0); // Nov 10, 2026
  const trigger = calculateSubscriptionReminderTrigger('2026-11-15', 1, ref);
  expect(trigger).not.toBeNull();
  expect(trigger?.getFullYear()).toBe(2026);
  expect(trigger?.getMonth()).toBe(10);
  expect(trigger?.getDate()).toBe(14);
  expect(trigger?.getHours()).toBe(9);
});

it('calculateSubscriptionReminderTrigger returns null when trigger time has already passed', () => {
  const ref = new Date(2026, 10, 14, 10, 0, 0); // Nov 14, 2026 10:00 AM
  const trigger = calculateSubscriptionReminderTrigger('2026-11-15', 1, ref);
  expect(trigger).toBeNull();
});

it('formatSubscriptionReminderBody includes amount, billing date, and pocket label', () => {
  const body = formatSubscriptionReminderBody({
    serviceName: 'Netflix',
    amount: 549,
    nextBillingDate: '2026-11-15',
    pocketLabel: 'GCash • Main Wallet',
    daysBefore: 1,
  });
  expect(body).toContain('₱549');
  expect(body).toContain('2026-11-15');
  expect(body).toContain('GCash • Main Wallet');
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@finance-tracker/mobile -- tests/notification_service.test.ts`
Expected: FAIL with `calculateSubscriptionReminderTrigger is not a function`

- [x] **Step 3: Add subscription types in `apps/mobile/src/types/database.ts`, create `apps/mobile/src/constants/subscriptions.ts`, and implement subscription notification functions in `apps/mobile/src/services/notificationService.ts`**

- In `src/constants/subscriptions.ts`, include all 13 presets (`netflix`, `spotify`, `youtube`, `disney`, `apple`, `google_one`, `chatgpt`, `canva`, `microsoft_365`, `prime`, `gym`, `internet`, `custom`) and `getSubscriptionPreset` that matches by `code` or case-insensitive `name` substring, falling back to `custom`.
- In `src/services/notificationService.ts`, implement `calculateSubscriptionReminderTrigger`, `formatSubscriptionReminderBody`, `scheduleSubscriptionReminder` (using channel `'subscription-reminders'` on Android), and `sendSubscriptionPaymentConfirmation` (using `trigger: null` for immediate delivery).

- [x] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@finance-tracker/mobile -- tests/notification_service.test.ts`
Expected: PASS (all tests in `notification_service.test.ts` green)

- [x] **Step 5: Commit**

```bash
git add apps/mobile/src/types/database.ts apps/mobile/src/constants/subscriptions.ts apps/mobile/src/services/notificationService.ts apps/mobile/tests/notification_service.test.ts
git commit -m "feat(subscriptions): add types, service presets, and notification helpers"
```

---

### Task 2: SQLite Schema, Migration & `subscriptionService.ts` (Cycle Math, Auto-Deduction & Catch-Up)

**Files:**
- Modify: [`apps/mobile/src/database/schema.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/database/schema.ts)
- Modify: [`apps/mobile/src/database/db.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/database/db.ts)
- Modify: [`apps/mobile/src/database/seed.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/database/seed.ts)
- Create: [`apps/mobile/src/services/subscriptionService.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/subscriptionService.ts)
- Create: [`apps/mobile/tests/subscription_service.test.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/tests/subscription_service.test.ts)

**Interfaces:**
- Consumes: `SubscriptionRecord`, `SubscriptionFrequency`, `SubscriptionStatus`, `CreateSubscriptionInput`, `UpdateSubscriptionInput` from `../types/database`; `scheduleSubscriptionReminder`, `cancelLoanReminder`, `sendSubscriptionPaymentConfirmation` from `./notificationService`
- Produces in `src/services/subscriptionService.ts`:
  - `export interface SubscriptionsSummary { monthlyTotal: number; activeCount: number; pausedCount: number; cancelledCount: number; nextUpcoming: SubscriptionRecord | null; }`
  - `export interface ProcessedSubscriptionCharge { subscriptionId: string; serviceName: string; pocketId: string; pocketLabel: string; amountPerCycle: number; cyclesProcessed: number; totalDeducted: number; newNextBillingDate: string; }`
  - `export function toLocalISODate(date?: Date): string`
  - `export function advanceBillingDate(dateStr: string, frequency: SubscriptionFrequency): string`
  - `export function normalizeToMonthlyAmount(amount: number, frequency: SubscriptionFrequency): number`
  - `export function createSubscription(db: SQLite.SQLiteDatabase, input: CreateSubscriptionInput): Promise<SubscriptionRecord>`
  - `export function getAllSubscriptions(db: SQLite.SQLiteDatabase): Promise<SubscriptionRecord[]>`
  - `export function getSubscriptionsSummary(db: SQLite.SQLiteDatabase): Promise<SubscriptionsSummary>`
  - `export function updateSubscription(db: SQLite.SQLiteDatabase, id: string, input: UpdateSubscriptionInput): Promise<void>`
  - `export function updateSubscriptionStatus(db: SQLite.SQLiteDatabase, id: string, status: SubscriptionStatus, referenceDate?: Date): Promise<void>`
  - `export function deleteSubscription(db: SQLite.SQLiteDatabase, id: string): Promise<void>`
  - `export function processDueSubscriptions(db: SQLite.SQLiteDatabase, referenceDate?: Date): Promise<ProcessedSubscriptionCharge[]>`

- [x] **Step 1: Write failing tests in `apps/mobile/tests/subscription_service.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import {
  advanceBillingDate,
  normalizeToMonthlyAmount,
  createSubscription,
  processDueSubscriptions,
  updateSubscriptionStatus,
  getSubscriptionsSummary,
} from '../src/services/subscriptionService';

describe('subscriptionService', () => {
  it('advanceBillingDate handles weekly, monthly month-end clamping, and leap-year yearly rollover', () => {
    expect(advanceBillingDate('2026-10-01', 'weekly')).toBe('2026-10-08');
    expect(advanceBillingDate('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(advanceBillingDate('2024-01-31', 'monthly')).toBe('2024-02-29');
    expect(advanceBillingDate('2024-02-29', 'yearly')).toBe('2025-02-28');
  });

  it('normalizeToMonthlyAmount converts weekly, monthly, and yearly costs to monthly equivalent', () => {
    expect(normalizeToMonthlyAmount(549, 'monthly')).toBe(549);
    expect(normalizeToMonthlyAmount(1200, 'yearly')).toBe(100);
    expect(normalizeToMonthlyAmount(100, 'weekly')).toBeCloseTo(433.33, 2);
  });

  it('createSubscription inserts active subscription record', async () => {
    const executed: { sql: string; params: any[] }[] = [];
    const mockDb: any = {
      getFirstAsync: vi.fn(async () => ({ pocket_name: 'Main Wallet', institution_name: 'GCash' })),
      runAsync: vi.fn(async (sql: string, params: any[]) => {
        executed.push({ sql, params });
        return { changes: 1 };
      }),
    };

    const res = await createSubscription(mockDb, {
      serviceName: 'Netflix',
      serviceCode: 'netflix',
      pocketId: 'p_gcash',
      amount: 549,
      frequency: 'monthly',
      startDate: '2026-10-15',
      nextBillingDate: '2026-11-15',
      category: 'Entertainment',
    });

    expect(res.service_name).toBe('Netflix');
    expect(res.status).toBe('active');
    expect(executed[0].sql).toContain('INSERT INTO subscriptions');
  });

  it('processDueSubscriptions catches up multiple missed cycles atomically when phone was off', async () => {
    const runQueries: { sql: string; params: any[] }[] = [];
    let currentPocketBalance = 2000;

    const mockDb: any = {
      getAllAsync: vi.fn(async () => [
        {
          id: 'sub_1',
          service_name: 'Gym Weekly',
          service_code: 'gym',
          pocket_id: 'p1',
          amount: 300,
          frequency: 'weekly',
          start_date: '2026-10-03',
          next_billing_date: '2026-10-10', // 3 cycles due by 2026-10-25: Oct 10, Oct 17, Oct 24
          category: 'Fitness & Health',
          status: 'active',
          reminder_days_before: 1,
          pocket_name: 'Wallet',
          institution_name: 'Maya',
        },
      ]),
      withTransactionAsync: vi.fn(async (cb: () => Promise<void>) => {
        await cb();
      }),
      getFirstAsync: vi.fn(async (sql: string) => {
        if (sql.includes('FROM account_pockets')) {
          return { id: 'p1', current_balance: currentPocketBalance };
        }
        return null;
      }),
      runAsync: vi.fn(async (sql: string, params: any[]) => {
        runQueries.push({ sql, params });
        if (sql.includes('UPDATE account_pockets')) {
          currentPocketBalance = params[0];
        }
        return { changes: 1 };
      }),
    };

    const refDate = new Date(2026, 9, 25, 12, 0, 0); // Oct 25, 2026 local
    const processed = await processDueSubscriptions(mockDb, refDate);

    expect(processed).toHaveLength(1);
    expect(processed[0].cyclesProcessed).toBe(3);
    expect(processed[0].totalDeducted).toBe(900);
    expect(processed[0].newNextBillingDate).toBe('2026-10-31');
    expect(currentPocketBalance).toBe(1100); // 2000 - (3 * 300)

    const txInserts = runQueries.filter((q) => q.sql.includes('INSERT INTO transactions'));
    expect(txInserts).toHaveLength(3);
    expect(txInserts[0].params).toContain('Subscription: Gym Weekly');
    expect(txInserts[0].params).toContain('2026-10-10');
    expect(txInserts[1].params).toContain('2026-10-17');
    expect(txInserts[2].params).toContain('2026-10-24');
  });

  it('processDueSubscriptions ignores paused and cancelled subscriptions', async () => {
    const mockDb: any = {
      getAllAsync: vi.fn(async () => []),
      runAsync: vi.fn(),
    };
    const processed = await processDueSubscriptions(mockDb, new Date(2026, 9, 25));
    expect(processed).toHaveLength(0);
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });

  it('updateSubscriptionStatus advances past next_billing_date into the future when resuming to active', async () => {
    const runQueries: { sql: string; params: any[] }[] = [];
    const mockDb: any = {
      getFirstAsync: vi.fn(async () => ({
        id: 'sub_spotify',
        service_name: 'Spotify',
        pocket_id: 'p1',
        amount: 149,
        frequency: 'monthly',
        next_billing_date: '2026-08-15',
        status: 'paused',
        notification_id: '',
        pocket_name: 'Wallet',
        institution_name: 'GCash',
      })),
      runAsync: vi.fn(async (sql: string, params: any[]) => {
        runQueries.push({ sql, params });
        return { changes: 1 };
      }),
    };

    const refDate = new Date(2026, 9, 25, 12, 0, 0); // Oct 25, 2026
    await updateSubscriptionStatus(mockDb, 'sub_spotify', 'active', refDate);

    const statusUpdate = runQueries.find((q) => q.sql.includes('UPDATE subscriptions SET status = ?'));
    expect(statusUpdate).toBeDefined();
    expect(statusUpdate?.params[0]).toBe('active');
    expect(statusUpdate?.params[1]).toBe('2026-11-15'); // Advanced past Oct 25 without retroactive charge
  });

  it('getSubscriptionsSummary calculates normalized monthly spend and nearest upcoming active subscription', async () => {
    const mockDb: any = {
      getAllAsync: vi.fn(async () => [
        {
          id: 's1',
          service_name: 'Netflix',
          amount: 549,
          frequency: 'monthly',
          next_billing_date: '2026-11-10',
          status: 'active',
        },
        {
          id: 's2',
          service_name: 'Canva Pro',
          amount: 2400,
          frequency: 'yearly',
          next_billing_date: '2026-11-02',
          status: 'active',
        },
        {
          id: 's3',
          service_name: 'Spotify',
          amount: 149,
          frequency: 'monthly',
          next_billing_date: '2026-11-01',
          status: 'paused',
        },
      ]),
    };

    const summary = await getSubscriptionsSummary(mockDb);
    expect(summary.activeCount).toBe(2);
    expect(summary.pausedCount).toBe(1);
    expect(summary.monthlyTotal).toBe(749); // 549 + (2400 / 12)
    expect(summary.nextUpcoming?.id).toBe('s2'); // Nov 02 is earliest active
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@finance-tracker/mobile -- tests/subscription_service.test.ts`
Expected: FAIL with `Cannot find module '../src/services/subscriptionService'`

- [x] **Step 3: Add `subscriptions` table to `schema.ts`, `db.ts`, `seed.ts` and implement `src/services/subscriptionService.ts`**

- In `src/database/schema.ts`, append `CREATE TABLE IF NOT EXISTS subscriptions` and its 3 indexes (`idx_subscriptions_pocket`, `idx_subscriptions_status`, `idx_subscriptions_next_billing`).
- In `src/database/db.ts`, add `DROP TABLE IF EXISTS subscriptions;` in the legacy rebuild block and a non-destructive probe (`SELECT id FROM subscriptions LIMIT 1;`) that runs `CREATE TABLE IF NOT EXISTS subscriptions ...` on existing installations.
- In `src/database/seed.ts`, add `DELETE FROM subscriptions;` inside `resetDatabase(db)` prior to `DELETE FROM account_pockets;`.
- In `src/services/subscriptionService.ts`, implement date advancement with calendar month-end clamping (`new Date(targetYear, targetMonth + 1, 0).getDate()`), `normalizeToMonthlyAmount`, CRUD functions, and `processDueSubscriptions`.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@finance-tracker/mobile -- tests/subscription_service.test.ts`
Expected: PASS (all 7 tests in `subscription_service.test.ts` green)

- [x] **Step 5: Commit**

```bash
git add apps/mobile/src/database/schema.ts apps/mobile/src/database/db.ts apps/mobile/src/database/seed.ts apps/mobile/src/services/subscriptionService.ts apps/mobile/tests/subscription_service.test.ts
git commit -m "feat(subscriptions): add SQLite schema and subscriptionService with auto-deduction catch-up"
```

---

### Task 3: Subscription SVG Logos & UI Components

**Files:**
- Create: [`apps/mobile/src/components/subscriptions/SubscriptionLogo.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/subscriptions/SubscriptionLogo.tsx)
- Create: [`apps/mobile/src/components/subscriptions/SubscriptionsBanner.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/subscriptions/SubscriptionsBanner.tsx)
- Create: [`apps/mobile/src/components/subscriptions/SubscriptionCard.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/subscriptions/SubscriptionCard.tsx)
- Create: [`apps/mobile/src/components/subscriptions/AddSubscriptionModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/subscriptions/AddSubscriptionModal.tsx)
- Create: [`apps/mobile/src/components/subscriptions/SubscriptionDetailSheet.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/subscriptions/SubscriptionDetailSheet.tsx)

**Interfaces:**
- Consumes: `SubscriptionRecord`, `CreateSubscriptionInput`, `UpdateSubscriptionInput`, `SubscriptionStatus`, `AccountPocket` from `../../types/database`; `SUBSCRIPTION_PRESETS`, `SUBSCRIPTION_CATEGORIES`, `getSubscriptionPreset` from `../../constants/subscriptions`; `normalizeToMonthlyAmount` from `../../services/subscriptionService`; `DatePickerModal` from `../common/DatePickerModal`; `formatCurrency`, `formatDisplayDate` from `../../utils/formatters`
- Produces:
  - `export function SubscriptionLogo(props: { code?: string; serviceName?: string; size?: number; className?: string; style?: StyleProp<ViewStyle> }): React.JSX.Element`
  - `export function SubscriptionsBanner(props: { monthlyTotal: number; activeCount: number; nextUpcoming: SubscriptionRecord | null; onPress: () => void }): React.JSX.Element | null`
  - `export function SubscriptionCard(props: { subscription: SubscriptionRecord; onPress: () => void }): React.JSX.Element`
  - `export function AddSubscriptionModal(props: { visible: boolean; pockets: (AccountPocket & { institution_name?: string })[]; editingSubscription?: SubscriptionRecord | null; onClose: () => void; onSubmit: (input: CreateSubscriptionInput) => Promise<void>; onUpdate?: (id: string, input: UpdateSubscriptionInput) => Promise<void> }): React.JSX.Element`
  - `export function SubscriptionDetailSheet(props: { visible: boolean; subscription: SubscriptionRecord | null; onClose: () => void; onEdit: (sub: SubscriptionRecord) => void; onTogglePause: (sub: SubscriptionRecord) => Promise<void>; onCancelSubscription: (sub: SubscriptionRecord) => Promise<void>; onDelete: (id: string) => Promise<void> }): React.JSX.Element | null`

- [x] **Step 1: Implement `SubscriptionLogo.tsx` with `react-native-svg` vector logos**

Render custom SVG paths inside a `0 0 100 100` `Svg` viewBox with rounded `Rect` background (`rx="24"`) for `netflix`, `spotify`, `youtube`, `disney`, `apple`, `google_one`, `chatgpt`, `canva`, `microsoft_365`, `prime`, `gym`, `internet`, and `custom`.

- [x] **Step 2: Implement `SubscriptionsBanner.tsx` and `SubscriptionCard.tsx`**

- `SubscriptionsBanner`: displays monthly spend (`formatCurrency(monthlyTotal)`), active count badge, and next upcoming bill (`service_name` + `formatDisplayDate(next_billing_date)`). Returns `null` when `activeCount === 0`.
- `SubscriptionCard`: displays `SubscriptionLogo`, `service_name`, payment source (`institution_name • pocket_name`), frequency & category, billing amount, due-date countdown badge (`Due today`, `Due tomorrow`, `Due in X days`, or status pill when `paused`/`cancelled`).

- [x] **Step 3: Implement `AddSubscriptionModal.tsx` and `SubscriptionDetailSheet.tsx`**

- `AddSubscriptionModal`:
  - Horizontal preset picker showing `SubscriptionLogo` + service name; tapping pre-fills `serviceName`, `serviceCode`, and `category`.
  - Inputs for **Service Name**, **Payment Source** (pocket selector pills), **Amount (₱)**, **Frequency** (`weekly`, `monthly`, `yearly`), **Start Date** & **Next Billing Date** (both using `DatePickerModal`), **Category** chips, and **Notes**.
  - When `editingSubscription` is passed, pre-populates fields and calls `onUpdate(editingSubscription.id, ...)`.
- `SubscriptionDetailSheet`:
  - Displays `SubscriptionLogo`, status badge, billing amount & frequency, normalized monthly cost, payment pocket, start date, next billing date, and notes.
  - Action buttons: **Edit Subscription**, **Pause / Resume Subscription**, **Cancel Subscription**, and **Delete**.

- [x] **Step 4: Run typecheck to verify all components compile cleanly**

Run: `npm run typecheck --workspace=@finance-tracker/mobile`
Expected: PASS (`tsc --noEmit` exits with code 0)

- [x] **Step 5: Commit**

```bash
git add apps/mobile/src/components/subscriptions/
git commit -m "feat(subscriptions): add SVG SubscriptionLogo, cards, banner, and management modals"
```

---

### Task 4: Wire Auto-Deduction Catch-Up & Subscription Management into Dashboard, Accounts & Advisor

**Files:**
- Modify: [`apps/mobile/app/(tabs)/index.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/index.tsx)
- Modify: [`apps/mobile/app/(tabs)/accounts.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/accounts.tsx)

**Interfaces:**
- Consumes: `processDueSubscriptions`, `getAllSubscriptions`, `getSubscriptionsSummary`, `createSubscription`, `updateSubscription`, `updateSubscriptionStatus`, `deleteSubscription` from `src/services/subscriptionService`; `SubscriptionsBanner`, `SubscriptionCard`, `AddSubscriptionModal`, `SubscriptionDetailSheet` from `src/components/subscriptions/*`
- Produces:
  - Automatic execution of `await processDueSubscriptions(db)` inside `loadData` on both `DashboardScreen` (`index.tsx`) and `AccountsScreen` (`accounts.tsx`) before loading balances and transactions.
  - `SubscriptionsBanner` rendered on `DashboardScreen` that navigates to `router.push({ pathname: '/(tabs)/accounts', params: { tab: 'subscriptions' } })`.
  - `'subscriptions'` filter tab (`🔄 Subscriptions`) in `AccountsScreen` displaying the monthly spend & next upcoming bill banner, list of subscriptions, `+ Add Sub` button, and full Edit / Pause / Resume / Cancel / Delete flows (using a `selectedSubscriptionIdRef` ref mirror so `loadData` stays stable and never re-opens a closed modal).

- [x] **Step 1: Update `apps/mobile/app/(tabs)/index.tsx` to run `processDueSubscriptions` and display `SubscriptionsBanner`**

- In `loadData`, call `await processDueSubscriptions(db)` before `Promise.all([getInstitutionsWithBalances(db), ...])` and include `getSubscriptionsSummary(db)`.
- Render `<SubscriptionsBanner />` right below `<ActiveLoansBanner />`, navigating to `/(tabs)/accounts?tab=subscriptions` on press.

- [x] **Step 2: Update `apps/mobile/app/(tabs)/accounts.tsx` with the `🔄 Subscriptions` tab and modals**

- Extend `FilterCategory` to `'all' | 'bank' | 'ewallet' | 'loans' | 'subscriptions' | 'cash'` and support `params.tab === 'subscriptions'`.
- In `loadData`, call `await processDueSubscriptions(db)` first, then load `getAllSubscriptions(db)` and `getSubscriptionsSummary(db)`. Mirror `selectedSubscription?.id` in `selectedSubscriptionIdRef` (matching `selectedInstitutionIdRef` and `selectedLoanIdRef`).
- When `selectedFilter === 'subscriptions'`, show:
  - Header title `"Subscriptions"` and `"+ Add Sub"` button.
  - Summary banner with **Total Monthly Spend**, **Next Upcoming Bill**, and **Active / Paused** counts.
  - Filtered list of `SubscriptionCard` items (searchable by service name, category, pocket, or notes).
  - Wired `AddSubscriptionModal` (for both create and edit) and `SubscriptionDetailSheet` (for edit, pause/resume, cancel, and delete).

- [x] **Step 3: Run full test suite and monorepo typecheck**

Run: `npm test --workspace=@finance-tracker/mobile && npx turbo run typecheck`
Expected: PASS (all test suites pass and 0 TypeScript errors across the monorepo)

- [x] **Step 4: Commit**

```bash
git add apps/mobile/app/(tabs)/index.tsx apps/mobile/app/(tabs)/accounts.tsx
git commit -m "feat(subscriptions): integrate auto-deduction catch-up and subscription management UI"
```
