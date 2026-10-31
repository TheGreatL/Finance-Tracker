# Separate Accounts and Obligations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Created:** 2026-10-31 19:25 (Local Time)

**Goal:** Decouple Liquid Accounts & Wallets and Obligations & Income into two dedicated screens, replace the Analytics bottom navigation tab with Obligations, and expose Analytics in the Sidebar Drawer.

**Architecture:** Create `apps/mobile/app/(tabs)/obligations.tsx` containing all liabilities, recurring subscriptions, and salary streams. Streamline `apps/mobile/app/(tabs)/accounts.tsx` to focus strictly on liquid institutions and pockets. Update `(tabs)/_layout.tsx` to set `obligations` as the 5th bottom tab while hiding `analytics` from the tab bar via `href: null`. Update `SidebarDrawer.tsx` to surface both Obligations and Analytics.

**Tech Stack:** React Native, Expo Router, TypeScript, SQLite, Lucide Icons, Tailwind / NativeWind.

**Spec:** `docs/superpowers/specs/2026-10-31-1925-separate-accounts-and-obligations-design.md`

## Global Constraints

- Zero emojis or emoticons in code, UI copy, empty states, or alerts.
- Standardized 16px corner radius (`rounded-2xl` / pill badges), normalized typography weights, deep pine (`#18342B`) and pale sage (`#BBD583`) brand colors.
- Monorepo constraint: NEVER execute `git commit` or `git add` - leave all changes unstaged for user review.

## Review Focus

1. Deep links to `tab=loans`, `tab=subscriptions`, `tab=income` must cleanly route to the corresponding tab on `obligations.tsx`.
2. `analytics.tsx` must still be directly navigatable from `SidebarDrawer.tsx` when clicked.
3. Liquid totals on `accounts.tsx` must correctly reflect banks, e-wallets, and cash without being skewed by debt.
4. All existing tests and typecheck checks must pass with 0 errors.

---

### Task 1: Create Dedicated `obligations.tsx` Page

**Files:**

- Create: `apps/mobile/app/(tabs)/obligations.tsx`

- [ ] Extract loans, subscriptions, and salary streams from `accounts.tsx` into `obligations.tsx`.
- [ ] Implement top summary cards: Total Active Debt, Monthly Subscriptions, Next Payday.
- [ ] Implement 3-segment switcher: Loans, Subscriptions, Income.
- [ ] Wire modals and sheets: `AddLoanModal`, `LoanDetailSheet`, `EditLoanModal`, `LoanPaymentModal`, `AddSubscriptionModal`, `SubscriptionDetailSheet`, `AddJobModal`, `JobDetailSheet`, `EditJobModal`, `PaySlipDetailModal`, `IncomeVisualBreakdownChart`.
- [ ] Connect `useToast` for action feedback.

### Task 2: Distill `accounts.tsx` to Liquid Accounts & Wallets

**Files:**

- Modify: `apps/mobile/app/(tabs)/accounts.tsx`

- [ ] Remove all debt, loan, subscription, and salary state and components.
- [ ] Retain liquid metrics: Total Liquid Net Worth, Available Cash, Total Pockets.
- [ ] Provide simple segment filtering: `All`, `Banks`, `E-Wallets`, `Cash`.
- [ ] Ensure `AddAccountModal`, `InstitutionGrid`, `InstitutionDetailSheet`, `AddPocketModal`, and `EditPocketModal` work seamlessly.

### Task 3: Update Navigation Layout & Sidebar Drawer

**Files:**

- Modify: `apps/mobile/app/(tabs)/_layout.tsx`
- Modify: `apps/mobile/src/components/navigation/SidebarDrawer.tsx`
- Modify: `apps/mobile/app/(tabs)/index.tsx`

- [ ] In `(tabs)/_layout.tsx`, replace `analytics` bottom tab with `obligations` (using `CalendarClock` icon and "Obligations" title).
- [ ] In `(tabs)/_layout.tsx`, configure `analytics` with `options={{ href: null }}` so the route remains active and accessible.
- [ ] In `SidebarDrawer.tsx`, add dedicated links for `Obligations & Income` (`/obligations`) and `Analytics` (`/analytics`).
- [ ] In `index.tsx`, update `FinancialPulseStrip` handlers to route to `/(tabs)/obligations` with `tab: 'income'`, `tab: 'loans'`, and `tab: 'subscriptions'`.

### Task 4: Verification & Linting

**Files:**

- Verify: `apps/mobile/tests/setup.ts`
- Run: `npm run test --workspace=@finance-tracker/mobile`
- Run: `npm run typecheck`
- Format: `npx prettier --check`
