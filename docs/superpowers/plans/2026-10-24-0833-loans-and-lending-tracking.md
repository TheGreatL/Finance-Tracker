# Loans & Lending Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Created:** 2026-10-24 08:33 (Local Time)

**Goal:** Implement comprehensive loan and debt tracking across Philippine lending apps and bank credit lines, featuring dual metric tracking (Total Money vs Total Loans), filesystem-based photo/file attachments (no SQLite BLOBs), local 3-day due date push reminders, and loan payment deductions from bank pockets.

**Architecture:** Add `loans` table in SQLite (`schema.ts`, `db.ts`) storing loan metadata and persistent local file paths. Provide file storage helper (`fileStorage.ts`) and offline notification scheduler (`notificationService.ts`). Create `loanService.ts` to manage loans, summaries, and balance-reducing payment transactions. Render an `ActiveLoansBanner` on Dashboard and dedicated Loan views in `(tabs)/accounts.tsx`.

**Tech Stack:** React Native (Expo SDK 58), `expo-file-system`, `expo-image-picker`, `expo-document-picker`, `expo-notifications`, `expo-sqlite`, Lucide React Native, Vitest.

**Spec:** [`docs/superpowers/specs/2026-10-24-0832-loans-and-lending-tracking-design.md`](file:///c:/Users/user/Desktop/projects/finance-tracker/docs/superpowers/specs/2026-10-24-0832-loans-and-lending-tracking-design.md)

---

### Task 1: Install Dependencies & Setup File Storage & Notifications Helpers

**Files:**
- Modify: [`apps/mobile/package.json`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/package.json)
- Create: [`apps/mobile/src/utils/fileStorage.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/utils/fileStorage.ts)
- Create: [`apps/mobile/src/services/notificationService.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/notificationService.ts)
- Create: [`apps/mobile/tests/file_storage.test.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/tests/file_storage.test.ts)
- Create: [`apps/mobile/tests/notification_service.test.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/tests/notification_service.test.ts)

- [ ] **Step 1: Install Expo packages for attachments and notifications**
  Run `npx expo install expo-file-system expo-image-picker expo-document-picker expo-notifications` in `apps/mobile`.

- [ ] **Step 2: Write unit tests for file storage & notification calculation**
  - In `tests/file_storage.test.ts`: test filename sanitization, persistent URI formatting.
  - In `tests/notification_service.test.ts`: test trigger date calculation (exactly 3 days before due date at 9:00 AM) and handling of past due dates.

- [ ] **Step 3: Implement `fileStorage.ts`**
  - `saveAttachment(sourceUri: string, filename: string): Promise<string>`
  - `deleteAttachment(fileUri: string): Promise<void>`
  - Ensure directory `${FileSystem.documentDirectory}attachments/` exists.

- [ ] **Step 4: Implement `notificationService.ts`**
  - `requestNotificationPermissions(): Promise<boolean>`
  - `scheduleLoanReminder(loan: { id: string; title: string; monthly_payment: number; due_date: string; institution_name: string }): Promise<string | null>`
  - `cancelLoanReminder(notificationId: string): Promise<void>`

- [ ] **Step 5: Run tests and typecheck**
  Run `npm test --workspace=@finance-tracker/mobile` and `npx turbo run typecheck`.

- [ ] **Step 6: Commit changes**
  Commit as: `feat(mobile): add file storage and 3-day notification reminder services`

---

### Task 2: Database Schema, Lending Providers & Loan Service

**Files:**
- Modify: [`apps/mobile/src/types/database.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/types/database.ts)
- Modify: [`apps/mobile/src/constants/institutions.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/constants/institutions.ts)
- Modify: [`apps/mobile/src/database/schema.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/database/schema.ts)
- Modify: [`apps/mobile/src/database/db.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/database/db.ts)
- Create: [`apps/mobile/src/services/loanService.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/loanService.ts)
- Create: [`apps/mobile/tests/loan_service.test.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/tests/loan_service.test.ts)

- [ ] **Step 1: Write unit tests for loan operations**
  In `tests/loan_service.test.ts`, test:
  - `createLoan` inserts into `loans` with status `'active'`.
  - `getLoansSummary` accurately calculates total remaining debt, next payment due, and due soon count.
  - `recordLoanPayment` executes atomic balance deduction: pocket balance decreases, loan debt decreases, status changes to `'paid'` when balance reaches 0.

- [ ] **Step 2: Update types & constants**
  - Add `LoanRecord`, `LoanStatus`, `CreateLoanInput`, `RecordLoanPaymentInput` in `types/database.ts`.
  - Add `tala`, `homecredit`, `cashalo` to `PHILIPPINE_INSTITUTIONS` in `constants/institutions.ts`.

- [ ] **Step 3: Update SQLite schema & migration**
  - Add `CREATE TABLE IF NOT EXISTS loans` in `schema.ts`.
  - Add probe and automatic table creation in `db.ts`.

- [ ] **Step 4: Implement `loanService.ts`**
  - `createLoan(db, input): Promise<LoanRecord>`
  - `getActiveLoans(db): Promise<LoanRecord[]>`
  - `getLoansSummary(db): Promise<{ totalLoanBalance: number; nextDueLoan: LoanRecord | null; dueSoonCount: number }>`
  - `recordLoanPayment(db, input): Promise<void>`
  - `deleteLoan(db, loanId): Promise<void>`

- [ ] **Step 5: Run tests and typecheck**
  Run `npm test --workspace=@finance-tracker/mobile` and `npx turbo run typecheck`.

- [ ] **Step 6: Commit changes**
  Commit as: `feat(mobile): implement loans SQLite schema, lending providers, and loanService`

---

### Task 3: Loan UI Components (Modals, Sheets, Cards, Banners)

**Files:**
- Create: [`apps/mobile/src/components/loans/ActiveLoansBanner.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/ActiveLoansBanner.tsx)
- Create: [`apps/mobile/src/components/loans/LoanCard.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/LoanCard.tsx)
- Create: [`apps/mobile/src/components/loans/AddLoanModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/AddLoanModal.tsx)
- Create: [`apps/mobile/src/components/loans/LoanDetailSheet.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/LoanDetailSheet.tsx)
- Create: [`apps/mobile/src/components/loans/LoanPaymentModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/LoanPaymentModal.tsx)

- [ ] **Step 1: Build `ActiveLoansBanner.tsx`**
  - Renders total loan debt (`₱YY,YYY`) and next payment due badge.
  - Tapping calls `onPress` to open loans view.

- [ ] **Step 2: Build `LoanCard.tsx`**
  - Renders institution logo, loan title, note subtitle, remaining balance, amortization, and due date countdown badge (`Due in X days`).

- [ ] **Step 3: Build `AddLoanModal.tsx`**
  - Lender picker (GCash, Maya, BillEase, Tala, Home Credit, Banks).
  - Inputs: Title, Total Amount, Remaining Balance, Monthly Payment, Due Date, Interest Rate, Notes.
  - Attachment button: picks photo or document, displays thumbnail/filename with remove button.

- [ ] **Step 4: Build `LoanDetailSheet.tsx` & `LoanPaymentModal.tsx`**
  - `LoanDetailSheet`: repayment progress bar, full loan breakdown, attachment preview (tap to view full screen), "Record Payment" CTA.
  - `LoanPaymentModal`: select source pocket, payment amount (pre-filled), date, and confirm.

- [ ] **Step 5: Verify typecheck**
  Run `npx turbo run typecheck`.

- [ ] **Step 6: Commit changes**
  Commit as: `feat(mobile): add ActiveLoansBanner, LoanCard, AddLoanModal, and LoanDetailSheet`

---

### Task 4: Integrate Loans into Dashboard & Accounts Tab

**Files:**
- Modify: [`apps/mobile/app/(tabs)/index.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/index.tsx)
- Modify: [`apps/mobile/app/(tabs)/accounts.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/accounts.tsx)

- [ ] **Step 1: Update Dashboard (`(tabs)/index.tsx`)**
  - Load loans summary via `getLoansSummary(db)`.
  - Render `ActiveLoansBanner` below `BalanceHeroCard` when active loans exist.
  - Tapping banner navigates to `router.push({ pathname: '/(tabs)/accounts', params: { tab: 'loans' } })`.

- [ ] **Step 2: Update Accounts Tab (`(tabs)/accounts.tsx`)**
  - Add category filter chip: `Loans & Lending`.
  - Support `tab` search parameter to activate Loans filter.
  - When Loans filter is active, display Loans grid, "+ Add Loan" CTA, and aggregate Total Loans metric.
  - Wire `AddLoanModal`, `LoanDetailSheet`, and `LoanPaymentModal`.

- [ ] **Step 3: Full test suite verification**
  Run `npm test --workspace=@finance-tracker/mobile`.

- [ ] **Step 4: Monorepo typecheck**
  Run `npx turbo run typecheck`.

- [ ] **Step 5: Commit changes**
  Commit as: `feat(mobile): integrate loan tracking, dashboard summary banner, and payment flow`

---

### Task 5: Final Verification & Manual Testing Walkthrough

- [ ] **Step 1: Test loan creation with attachment**
  Create a test loan (e.g. BillEase Laptop, ₱15,000, ₱2,500/mo, due in 5 days) with a photo attachment.

- [ ] **Step 2: Test 3-day notification reminder**
  Verify local notification is scheduled 3 days before due date.

- [ ] **Step 3: Test loan payment deduction**
  Record a ₱2,500 payment from BDO savings; verify BDO balance decreases by ₱2,500 and loan balance decreases by ₱2,500.

- [ ] **Step 4: Verify metrics separation**
  Verify Total Money reflects cash/bank balances and Total Loans reflects debt without an abstract net worth formula.
