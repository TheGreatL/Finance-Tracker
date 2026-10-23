# Philippine Accounts, Nested Pockets & Transaction CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a local SQLite account management system grouping Philippine banks and e-wallets into institution cards with nested pockets (wallets and interest-bearing savings), full transaction CRUD with atomic balance recalculations, and a development data reset tool.

**Architecture:** Two-tier relational SQLite schema (`institutions` -> `account_pockets` -> `transactions`) with foreign key constraints. Dynamic Philippine institution registry (`src/constants/institutions.ts`) without hardcoded singleton e-wallets. Unified "Add Account" flow (Option A) creating an institution with its initial base money pocket. Atomic balance recalculations using `db.withTransactionAsync`.

**Tech Stack:** React Native 0.88 / Expo SDK 58, `expo-sqlite`, PanelUI (`panelui-native`), Uniwind v4 / Tailwind CSS, Lucide Icons, TypeScript 5+.

**Spec:** `docs/superpowers/specs/2026-10-23-accounts-and-transactions-design.md`

## Global Constraints

- No hardcoded singletons for GCash or any other specific provider; all institutions are handled dynamically through the catalog.
- Color palette adheres to Pistachio (`#BBD583`) and Deep Forest Pine (`#18342B`) with WCAG AA/AAA contrast.
- Every transaction write, edit, or delete must atomically update the corresponding pocket balance inside a single database transaction.
- Option A: Adding an account prompts for both the institution provider and initial pocket starting balance in a unified modal.
- `__DEV__` seeds starter data on first load; production builds initialize with an empty database.
- A reset feature allows clearing all user and mock data back to 0.

## Review Focus

- Inter-pocket transfers correctly debit source and credit destination without changing overall net balance.
- Editing a transaction's amount or switching pockets atomically reverses the old amount before applying the new amount.
- Savings pockets validate interest rates (`>= 0`) and allow custom details notes without throwing errors.
- Deleting an account pocket with existing transaction history is blocked by `ON DELETE RESTRICT` foreign key integrity.
- Zero-pocket state after database reset renders an inviting empty state without throwing unhandled exceptions.

---

### Task 1: Philippine Institution Catalog & Domain Types

**Files:**
- Create: `apps/mobile/src/types/database.ts`
- Create: `apps/mobile/src/constants/institutions.ts`
- Create: `apps/mobile/tests/institutions.test.ts`

**Interfaces:**
- Produces:
  - `InstitutionConfig` interface and `PHILIPPINE_INSTITUTIONS` catalog
  - `getInstitutionConfig(code: string): InstitutionConfig`
  - Domain types for `Institution`, `AccountPocket`, `TransactionRecord`

- [ ] **Step 1: Write failing test for catalog lookups**
Test that `getInstitutionConfig('maya')`, `getInstitutionConfig('bpi')`, `getInstitutionConfig('cash')`, and `getInstitutionConfig('unknown')` return valid configs with colors, icons, and display names.

- [ ] **Step 2: Run test to verify failure**
Run: `node --test apps/mobile/tests/institutions.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement domain types in `apps/mobile/src/types/database.ts`**
Define interfaces for `Institution`, `AccountPocket`, `TransactionRecord`, `PocketType`, and `TransactionType`.

- [ ] **Step 4: Implement `apps/mobile/src/constants/institutions.ts`**
Populate the Philippine registry with Maya, GoTyme, SeaBank, GCash, GrabPay, ShopeePay, CIMB, Tonik, BPI, BDO, UnionBank, Metrobank, RCBC, Security Bank, and Physical Cash. Implement `getInstitutionConfig(code: string)`.

- [ ] **Step 5: Run test to verify it passes**
Run: `node --test apps/mobile/tests/institutions.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add apps/mobile/src/types/database.ts apps/mobile/src/constants/institutions.ts apps/mobile/tests/institutions.test.ts
git commit -m "feat(mobile): add Philippine institution catalog and account types"
```

---

### Task 2: SQLite Schema, Migrations, and Core Services

**Files:**
- Create: `apps/mobile/src/database/schema.ts`
- Create: `apps/mobile/src/database/db.ts`
- Create: `apps/mobile/src/services/accountService.ts`
- Create: `apps/mobile/src/services/transactionService.ts`
- Create: `apps/mobile/tests/balance_logic.test.ts`

**Interfaces:**
- Consumes: `getDatabase()`, `PHILIPPINE_INSTITUTIONS`.
- Produces:
  - `initDatabase(db)`: executes schema DDL
  - `accountService.createInstitutionWithPocket(...)`: atomic creation of institution + starting pocket
  - `accountService.addPocket(...)`: creates pocket for existing institution
  - `transactionService.createTransaction(...)`: writes transaction and atomically adjusts pocket balance
  - `transactionService.deleteTransaction(...)`: reverses balance adjustment and deletes row

- [ ] **Step 1: Write unit tests for atomic balance calculations**
Write tests in `tests/balance_logic.test.ts` testing balance math for income addition, expense deduction, transfer debit/credit, and transaction reversal (e.g. changing an expense from ₱1,000 to ₱1,500).

- [ ] **Step 2: Run test to verify failure**
Run: `node --test apps/mobile/tests/balance_logic.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement schema and initialization in `apps/mobile/src/database/`**
Define DDL tables for `institutions`, `account_pockets`, and `transactions` with foreign keys and WAL mode.

- [ ] **Step 4: Implement `accountService.ts` and `transactionService.ts`**
Implement CRUD functions wrapped in `db.withTransactionAsync` ensuring balances never drift.

- [ ] **Step 5: Run tests and typecheck**
Run: `node --test apps/mobile/tests/*.test.ts && cd apps/mobile && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add apps/mobile/src/database/ apps/mobile/src/services/ apps/mobile/tests/
git commit -m "feat(mobile): implement SQLite database layer with atomic balance updates"
```

---

### Task 3: Unified "Add Account" Modal & Institution Dashboard Cards

**Files:**
- Create: `apps/mobile/src/components/accounts/AddAccountModal.tsx`
- Create: `apps/mobile/src/components/accounts/InstitutionCard.tsx`
- Create: `apps/mobile/src/components/accounts/InstitutionCarousel.tsx`

**Interfaces:**
- Consumes: `accountService`, `PHILIPPINE_INSTITUTIONS`.
- Produces:
  - `AddAccountModal`: Option A modal allowing selection of institution provider + initial pocket name & starting balance.
  - `InstitutionCard`: Visual card displaying institution logo, brand color bar, aggregate balance, and pocket count badge.
  - `InstitutionCarousel`: Horizontal scroll of active institution cards on the dashboard.

- [ ] **Step 1: Implement `InstitutionCard.tsx`**
Card with institution icon, total balance across all child pockets, and count pill (e.g. "Maya • ₱52,000 • 2 pockets").

- [ ] **Step 2: Implement `AddAccountModal.tsx`**
Unified modal with two sections:
1. Institution Picker: grid/list of Philippine institutions from catalog.
2. Initial Pocket Form: Pocket name (defaults to "Main Wallet" or custom), pocket type (`wallet` | `savings`), starting base money input, and optional interest rate.

- [ ] **Step 3: Implement `InstitutionCarousel.tsx`**
Horizontal list showing institution cards plus a "+ Add Account" shortcut button.

- [ ] **Step 4: Verify TypeScript compilation**
Run: `cd apps/mobile && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/src/components/accounts/
git commit -m "feat(mobile): add institution cards and unified account creation modal"
```

---

### Task 4: Institution Detail Sheet & Nested Pockets Management

**Files:**
- Create: `apps/mobile/src/components/accounts/PocketCard.tsx`
- Create: `apps/mobile/src/components/accounts/AddPocketModal.tsx`
- Create: `apps/mobile/src/components/accounts/InstitutionDetailSheet.tsx`

**Interfaces:**
- Consumes: Selected institution ID, `account_pockets` table.
- Produces:
  - `InstitutionDetailSheet`: Modal displaying all pockets under the selected institution.
  - `PocketCard`: Displays individual pocket balance, pocket type badge, and interest rate badge (e.g., `4.5% p.a. - Credited daily`).
  - `AddPocketModal`: Form to add a second or third pocket (e.g., a high-yield savings stash).

- [ ] **Step 1: Implement `PocketCard.tsx`**
Displays pocket name, balance, interest rate tag (`4.5% p.a.` in green), and savings note.

- [ ] **Step 2: Implement `AddPocketModal.tsx`**
Form to add an additional pocket to an existing institution with pocket type, name, initial balance, interest rate, and notes.

- [ ] **Step 3: Implement `InstitutionDetailSheet.tsx`**
Modal sheet showing institution header, total balance, pocket list, "+ Add Pocket" action, and recent transactions filtered by that institution.

- [ ] **Step 4: Verify typecheck**
Run: `cd apps/mobile && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/src/components/accounts/
git commit -m "feat(mobile): add institution detail sheet and nested pocket management"
```

---

### Task 5: Transaction CRUD Form Modal & Ledger Screen Integration

**Files:**
- Create: `apps/mobile/src/components/transactions/TransactionFormModal.tsx`
- Create: `apps/mobile/src/components/transactions/TransactionDetailSheet.tsx`
- Modify: `apps/mobile/app/(tabs)/two.tsx` (Ledger Screen)
- Modify: `apps/mobile/app/(tabs)/index.tsx` (Dashboard)

**Interfaces:**
- Consumes: `transactionService`, `accountService`.
- Produces:
  - `TransactionFormModal`: Modal supporting Create and Edit modes for expenses, income, and transfers.
  - `TransactionDetailSheet`: View transaction with Delete action and Edit button.
  - `(tabs)/two.tsx`: Complete transaction ledger with search, category filtering, and date grouping.

- [ ] **Step 1: Implement `TransactionFormModal.tsx`**
Form with tabs (`Expense` | `Income` | `Transfer`), amount numeric keypad/input, Payee/Merchant `Title` input, Category selector, Source Pocket picker (grouped by Institution), and Destination Pocket picker (for transfers).

- [ ] **Step 2: Implement `TransactionDetailSheet.tsx`**
Detailed view displaying transaction amount, timestamp, institution & pocket, category, notes, with "Edit" and "Delete Transaction" actions (with confirmation dialog).

- [ ] **Step 3: Update `apps/mobile/app/(tabs)/two.tsx` (Ledger Screen)**
Transform Tab 2 into a full transaction ledger with month header, search bar, category filter pills, and grouped transaction items.

- [ ] **Step 4: Connect modals to Dashboard quick actions in `apps/mobile/app/(tabs)/index.tsx`**
Wire `+ Expense`, `+ Income`, and `Transfer` buttons on the dashboard to open `TransactionFormModal` with the corresponding mode pre-selected.

- [ ] **Step 5: Verify tests and compile**
Run: `node --test apps/mobile/tests/*.test.ts && cd apps/mobile && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add apps/mobile/src/components/transactions/ apps/mobile/app/\(tabs\)/
git commit -m "feat(mobile): implement transaction CRUD modal and full ledger screen"
```

---

### Task 6: Dev Seed & Database Reset Feature

**Files:**
- Create: `apps/mobile/src/database/seed.ts`
- Create: `apps/mobile/src/components/dev/DatabaseResetDialog.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

**Interfaces:**
- Consumes: `getDatabase()`, `schema.ts`.
- Produces:
  - `seedDevData(db)`: Seeds mock Philippine institutions (Maya, BPI, Cash) with realistic wallet and savings pockets.
  - `resetDatabase(db)`: Wipes all tables, leaving 0 records for fresh user input.
  - `DatabaseResetDialog`: Confirmation prompt to execute database reset.

- [ ] **Step 1: Implement `apps/mobile/src/database/seed.ts`**
Seed realistic data (e.g. Maya with ₱2,000 Wallet and ₱50,000 Savings @ 4.5% p.a.; BPI with ₱15,000 Checking; Physical Cash with ₱3,500) and sample transactions only when running in `__DEV__` and the database is empty.

- [ ] **Step 2: Implement `resetDatabase(db)`**
Function to truncate/delete all rows from `transactions`, `account_pockets`, and `institutions`.

- [ ] **Step 3: Implement `DatabaseResetDialog.tsx`**
Alert dialog accessible from settings/header with warning: "Reset all data? This will wipe all mock and entered data."

- [ ] **Step 4: Run full test suite and typecheck**
Run:
```bash
node --test apps/mobile/tests/*.test.ts
npm run typecheck --workspace=@finance-tracker/mobile
```
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/src/database/seed.ts apps/mobile/src/components/dev/ apps/mobile/app/
git commit -m "feat(mobile): add dev database seeding and reset-to-zero functionality"
```
