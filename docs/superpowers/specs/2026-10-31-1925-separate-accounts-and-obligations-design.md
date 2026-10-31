# Separate Accounts and Obligations Navigation Architecture Specification

**Created:** 2026-10-31 19:25 (Local Time)

## Overview

Currently, `accounts.tsx` serves as an overloaded shared container handling two contrasting financial models:

1. **Liquid Assets & Wallets**: Checking/savings bank accounts, e-wallets (GCash, Maya), cash wallets, and granular pockets.
2. **Obligations & Income**: Liabilities (loans, credit card balances), recurring commitments (subscriptions), and active employment streams (salary, deductions, paydays).

This specification outlines the decoupling of these domains into two distinct, dedicated pages:

- **`accounts.tsx`**: Exclusively focused on liquid accounts, wallets, and pocket organization.
- **`obligations.tsx`**: Exclusively focused on financial obligations, recurring subscriptions, and salary streams.
- **Navigation Update**: Replace the `analytics` bottom tab with `obligations`, and expose `analytics` in the primary navigation list of the `SidebarDrawer`.

---

## Architecture & Layout

### 1. Dedicated `Accounts` Page (`apps/mobile/app/(tabs)/accounts.tsx`)

- **Domain**: Liquid cash, bank accounts, and e-wallets.
- **Metrics Strip**: Total Liquid Net Worth, Active Pockets Count, and Available Cash.
- **Filtering**: Segmented pill filter: `All`, `Banks`, `E-Wallets`, `Cash`.
- **Primary Actions**:
    - Open `AddAccountModal` (+ Account)
    - Institution details and pocket drill-down (`InstitutionDetailSheet`)
    - Add/Edit pocket modals (`AddPocketModal`, `EditPocketModal`)
- **Removed from this screen**: All loan cards, subscription cards, salary jobs, payslip details, and debt summaries.

### 2. Dedicated `Obligations` Page (`apps/mobile/app/(tabs)/obligations.tsx`)

- **Domain**: Financial liabilities, recurring bill obligations, and salary cashflow.
- **Metrics Strip**:
    - Total Outstanding Debt (Active loans)
    - Monthly Recurring Subscriptions
    - Next Payday countdown & estimated net income
- **Segmented Control (3 Views)**:
    - `Loans`: Active loans, payoff progress, payment log modal, loan detail sheet.
    - `Subscriptions`: Monthly commitment total, active/paused cards, recurring interval indicators.
    - `Income`: Active jobs, gross vs net breakdown chart, payday schedules, payslip detail modal.
- **Deep Link Navigation**: Accepts `tab?: 'loans' | 'subscriptions' | 'income' | 'salary'` to preserve smooth routing from Dashboard pulse cards and sidebar items.

### 3. Bottom Navigation (`apps/mobile/app/(tabs)/_layout.tsx`)

- **5 Bottom Tabs**:
    1. `index` -> **Dashboard** (`LayoutDashboard`)
    2. `accounts` -> **Accounts** (`WalletCards`)
    3. `assistant` -> **Advisor** (`Bot`, center floating button)
    4. `two` -> **Ledger** (`ReceiptText`)
    5. `obligations` -> **Obligations** (`CalendarClock` / `CircleDollarSign`)
- **Analytics Routing**:
    - `analytics` route remains defined in `(tabs)/_layout.tsx` with `options={{ href: null }}` so it can be navigated to via `router.navigate('/analytics')` without displaying as an icon in the bottom bar.

### 4. Sidebar Drawer (`SidebarDrawer.tsx`)

- **Navigation Links**:
    - `Dashboard`: `/`
    - `Accounts & Pockets`: `/accounts`
    - `Obligations & Income`: `/obligations`
    - `Ledger & Records`: `/two`
    - `Analytics & Reports`: `/analytics` (with `PieChart` icon and subtitle "Spending trends & charts")
    - `PocketBot Advisor`: `/assistant`

### 5. Dashboard Deep Links (`FinancialPulseStrip.tsx` & `index.tsx`)

- Next Payday card -> `/obligations?tab=income`
- Debt Obligations card -> `/obligations?tab=loans`
- Recurring Subscriptions card -> `/obligations?tab=subscriptions`

---

## Design System Constraints

- **Zero Emojis/Emoticons**: Prohibited across all screens, empty states, and toast messages.
- **Visual Rhythm**: Standardized 16px corner radius (`rounded-2xl`), single border elevation (`border border-stone-200/80`), deep pine (`#18342B`) and pale sage (`#BBD583`) brand colors.
- **Feedback**: Integrated with `ToastContext` for success actions (e.g. adding loans, recording job payments, creating accounts).
