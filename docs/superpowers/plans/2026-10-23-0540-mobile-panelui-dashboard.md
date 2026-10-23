# Mobile PanelUI Setup & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Created:** 2026-10-23 05:40 (Local Time)

**Goal:** Configure PanelUI with Uniwind v4 and the custom Pistachio (`#BBD583`) / Deep Forest Pine (`#18342B`) theme in `apps/mobile`, and implement the Core Finance Dashboard screen with balance summary, quick actions, and recent transactions.

**Architecture:** Install and configure `panelui-native` and `uniwind` in `apps/mobile`. Wrap root layout in `PanelUIProvider`. Style the interface using Tailwind CSS tokens (`bg-primary`, `text-primary-foreground`, `bg-card`) customized for Pistachio and Pine palettes. Build modular dashboard components with pure helper math tested via `node:test`.

**Tech Stack:** React Native 0.86+ / Expo SDK 57+, PanelUI (`panelui-native`), Uniwind v4 (`uniwind`, `tailwindcss`), Lucide Icons (`lucide-react-native`), TypeScript 5+.

**Spec:** User direction to stick with PanelUI, use Pistachio (`#BBD583`) as primary theme, Deep Forest Pine (`#18342B`) as secondary, and build the mobile dashboard feature first.

## Global Constraints

- Primary brand color: Pistachio `#BBD583` (high visibility, warm yellow-green).
- Secondary brand color: Deep Forest Pine `#18342B` (high-contrast structural ink, dark-mode surfaces).
- Accent / Expense color: Terracotta `#D97757` (cash outflows and expense badges).
- Exactly one `PanelUIProvider` at the root of `apps/mobile/app/_layout.tsx`.
- Semantic tokens only in UI components: `bg-card`, `bg-primary`, `text-muted-foreground`, no hardcoded colors in component bodies.
- All calculation helpers must have unit tests passing under `node --test`.

## Review Focus

- Empty transaction state displays clean placeholder without throwing `NaN` or unhandled errors.
- Currency formatting handles decimals, negatives, and zeroes correctly (e.g. `-₱1,250.00`, `+₱5,000.00`, `₱0.00`).
- Safe-area insets respect both Android gesture navigation bars and iOS dynamic island/home bar.
- Color contrast meets WCAG AAA standards: dark pine text `#18342B` on pistachio `#BBD583` background.
- Dev server reloads properly without missing variable errors in Uniwind.

---

### Task 1: Install PanelUI, Uniwind, and Configure Theme Tokens

**Files:**
- Modify: `apps/mobile/package.json`
- Create: `apps/mobile/global.css`
- Create: `apps/mobile/metro.config.js`
- Create: `apps/mobile/uniwind-types.d.ts`
- Modify: `apps/mobile/app/_layout.tsx`

**Interfaces:**
- Consumes: Theme specifications (Pistachio `#BBD583`, Pine `#18342B`).
- Produces: `PanelUIProvider` root context and Tailwind utility classes with Pistachio palette.

- [ ] **Step 1: Add PanelUI and Uniwind dependencies to `apps/mobile/package.json`**
Add `panelui-native`, `uniwind`, `tailwindcss@^4.3.3`, `lucide-react-native`, `react-native-svg` to `dependencies`.

- [ ] **Step 2: Create `apps/mobile/global.css` with Pistachio and Pine theme tokens**
Define `@import 'tailwindcss';`, `@import 'uniwind';`, `@import 'panelui-native/theme.css';`, and `@layer theme` tokens:
`--color-primary: #BBD583;`, `--color-primary-foreground: #18342B;`, `--color-secondary: #18342B;`, `--color-secondary-foreground: #F9FAF7;`, `--color-destructive: #D97757;`.

- [ ] **Step 3: Create `apps/mobile/metro.config.js` with `withUniwindConfig`**
Wrap Metro configuration with `cssEntryFile: './global.css'` and `dtsFile: './uniwind-types.d.ts'`.

- [ ] **Step 4: Update `apps/mobile/app/_layout.tsx` to wrap root with `PanelUIProvider` and import `../global.css`**
Import `../global.css` and wrap `<Slot />` or `<Stack />` in `<PanelUIProvider>`.

- [ ] **Step 5: Verify configuration and compile**
Run: `cd apps/mobile && npm run typecheck`
Expected: PASS with 0 TypeScript errors.

- [ ] **Step 6: Commit**
```bash
git add apps/mobile/package.json apps/mobile/global.css apps/mobile/metro.config.js apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): configure PanelUI with Pistachio theme"
```

---

### Task 2: Pure Calculation and Formatting Helpers with Unit Tests

**Files:**
- Create: `apps/mobile/src/utils/formatters.ts`
- Create: `apps/mobile/src/utils/calculations.ts`
- Create: `apps/mobile/tests/formatters.test.ts`
- Create: `apps/mobile/tests/calculations.test.ts`

**Interfaces:**
- Consumes: Raw numbers and transaction arrays.
- Produces:
  - `formatCurrency(amount: number, currency?: string): string`
  - `formatRelativeDate(dateString: string): string`
  - `calculateNetBalance(transactions: Array<{ type: 'income' | 'expense' | 'transfer', amount: number }>): { totalBalance: number, totalIncome: number, totalExpense: number }`

- [ ] **Step 1: Write failing tests for formatters and calculations**
Write unit tests in `apps/mobile/tests/formatters.test.ts` and `apps/mobile/tests/calculations.test.ts` checking positive/negative formatting, zero balance, and income/expense aggregations.

- [ ] **Step 2: Run tests to verify failure**
Run: `node --test apps/mobile/tests/*.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement `formatCurrency` and `formatRelativeDate` in `apps/mobile/src/utils/formatters.ts`**
Format amounts with currency symbol (`₱` default or `$`), commas, and 2 decimal places. Handle negative numbers cleanly (`-₱1,200.00`).

- [ ] **Step 4: Implement `calculateNetBalance` in `apps/mobile/src/utils/calculations.ts`**
Sum income, sum expense, and compute net balance.

- [ ] **Step 5: Run tests to verify they pass**
Run: `node --test apps/mobile/tests/*.test.ts`
Expected: PASS (all tests pass).

- [ ] **Step 6: Commit**
```bash
git add apps/mobile/src/utils/ apps/mobile/tests/
git commit -m "feat(mobile): add calculation and formatting helpers with unit tests"
```

---

### Task 3: Build Dashboard Header & Balance Hero Card

**Files:**
- Create: `apps/mobile/src/components/dashboard/BalanceHeroCard.tsx`
- Create: `apps/mobile/src/components/dashboard/DashboardHeader.tsx`

**Interfaces:**
- Consumes: `totalBalance: number`, `totalIncome: number`, `totalExpense: number`, `formatCurrency`.
- Produces: Visual hero card using Pistachio primary background and Deep Pine accents, displaying net worth and income/expense metric chips.

- [ ] **Step 1: Implement `DashboardHeader.tsx`**
Display user greeting, financial month/year indicator, and notification/scan icon button using Lucide icons (`Bell`, `ScanLine`).

- [ ] **Step 2: Implement `BalanceHeroCard.tsx`**
Create the hero container with `bg-primary rounded-3xl p-6` (Pistachio), primary text `text-primary-foreground` (Deep Pine), large bold net balance, and two pill badges:
- Income pill: `bg-white/40 text-[#18342B]` with upward arrow
- Expense pill: `bg-[#D97757]/20 text-[#D97757]` with downward arrow

- [ ] **Step 3: Verify TypeScript typing**
Run: `cd apps/mobile && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add apps/mobile/src/components/dashboard/
git commit -m "feat(mobile): create dashboard header and balance hero card"
```

---

### Task 4: Build Quick Actions & Recent Transactions List

**Files:**
- Create: `apps/mobile/src/components/dashboard/QuickActionsBar.tsx`
- Create: `apps/mobile/src/components/dashboard/RecentTransactionsList.tsx`
- Create: `apps/mobile/src/components/dashboard/TransactionItem.tsx`

**Interfaces:**
- Consumes: List of recent transactions (`id`, `title`, `category`, `amount`, `type`, `date`, `accountName`).
- Produces:
  - `QuickActionsBar`: 4 quick action pills (`Add Expense`, `Add Income`, `Transfer`, `Scan`).
  - `RecentTransactionsList`: Grouped transaction history with category icon, badges, and formatted amounts.

- [ ] **Step 1: Implement `QuickActionsBar.tsx`**
Horizontal row with 4 tactile buttons using Lucide icons (`ArrowDownLeft`, `ArrowUpRight`, `Repeat`, `Camera`). Styled with `bg-card` and `active:scale-95` tactile feedback.

- [ ] **Step 2: Implement `TransactionItem.tsx`**
Individual row item with category icon badge, vendor/notes, payment account (e.g. `BPI`, `Cash`), and amount colored green for income and terracotta for expenses.

- [ ] **Step 3: Implement `RecentTransactionsList.tsx`**
Container with section title "Recent Transactions", "See All" link, empty state when 0 transactions, and list of `TransactionItem`s.

- [ ] **Step 4: Verify typecheck**
Run: `cd apps/mobile && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/src/components/dashboard/
git commit -m "feat(mobile): add quick actions and recent transactions list"
```

---

### Task 5: Assemble Mobile Dashboard Screen & Configure Tab Navigation

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: Dashboard components from Tasks 3 and 4.
- Produces: Complete, interactive Dashboard screen with pull-to-refresh and Pistachio active tab highlights.

- [ ] **Step 1: Update `apps/mobile/app/(tabs)/_layout.tsx`**
Configure the bottom tab navigator with Lucide icons (`LayoutDashboard`, `ReceiptList`, `PieChart`, `Settings`), hiding tab headers, and setting `tabBarActiveTintColor: '#18342B'` and active tab indicator using Pistachio.

- [ ] **Step 2: Assemble `apps/mobile/app/(tabs)/index.tsx`**
Compose `DashboardHeader`, `BalanceHeroCard`, `QuickActionsBar`, and `RecentTransactionsList` inside a smooth `ScrollView` with safe-area padding and `RefreshControl`.

- [ ] **Step 3: Verify all unit tests and TypeScript compile**
Run:
```bash
node --test apps/mobile/tests/*.test.ts
npm run typecheck --workspace=@finance-tracker/mobile
```
Expected: All tests PASS, 0 TypeScript compile errors.

- [ ] **Step 4: Commit**
```bash
git add apps/mobile/app/\(tabs\)/
git commit -m "feat(mobile): assemble complete dashboard screen with tab navigation"
```

