# Multi-Job Salary & Deductions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade ("Gold Standard") Multi-Job Salary & Itemized Deductions tracking system in `@finance-tracker/mobile` to track concurrent income streams, itemize payroll deductions, calculate take-home pay, record automated payday deposits into account balances, and display comprehensive Active/Archived career directories and visual income breakdown charts.

**Architecture:** Extend SQLite database with three relational tables (`jobs`, `job_deductions`, `pay_slips`). Implement a central `salaryService.ts` encapsulating salary breakdown math, deduction aggregation, pay schedule normalization, and automated payday deposits into the ledger. Present a dedicated Income sub-view in the Accounts screen with summary banners, visual distribution charts, active/archived directory cards, interactive detail sheets, digital pay slip receipts, and full backup/advisor integration.

**Tech Stack:** React Native, Expo, SQLite (`expo-sqlite`), TypeScript, TailwindCSS (`nativewind`), Lucide Icons, Vitest.

**Spec:** [`docs/superpowers/specs/2026-10-31-1616-multi-job-salary-deductions-design.md`](file:///c:/Users/user/Desktop/projects/finance-tracker/docs/superpowers/specs/2026-10-31-1616-multi-job-salary-deductions-design.md)

---

## Global Constraints

- **Local Time Format**: Strictly use 12-hour time format with AM/PM indicators (`formatTime12`).
- **Money Formatting**: Real-time live input formatting (`formatMoneyInput`) and numeric parsing (`parseMoneyInput`) with `keyboardType="decimal-pad"`.
- **Keyboard Overlap Handling**: Every modal form must use `useKeyboardBottomInset` on `contentContainerStyle`.
- **Safe Ledger Transactions**: Payday deposits must credit target account balances and create `transactions` records without bypassing double-entry balance integrity.
- **Archive Preserves History**: Ending a job changes status to `'archived'`, retaining lifetime pay slips and past deduction snapshots.
- **Zero TypeScript Errors**: `npm run typecheck` must pass with 0 errors across all tasks.
- **Automated Test Coverage**: Every service and computation must be verified with pure unit tests before marking tasks complete.

---

## Review Focus

1. **Short-Month Pay Date Clamping**: If payday is set to the 30th or 31st and the current month is February (28/29 days) or a 30-day month, must clamp to the last valid day of the month without throwing `Invalid Date` or skipping deposits.
2. **Deductions Greater than Gross Validation**: Input validation must prevent total deductions from exceeding gross salary, ensuring net take-home pay cannot be negative.
3. **Duplicate Payout Prevention**: Idempotency check via unique `(job_id, pay_date)` must ensure a scheduled payday cannot be credited to an account balance twice.
4. **Active vs. Archived Segregation**: Monthly projected earnings and upcoming payday reminders must only compute for `active` jobs; archived jobs must appear exclusively under the Archived directory.
5. **Backup & Restore Round-Trip**: All jobs, itemized deductions, and historical pay slips must be serialized into the JSON backup format and restored without foreign key constraint violations.

---

## Tasks

### Task 1: Database Schema & Migration for Jobs, Deductions, and Pay Slips

**Files:**

- Modify: `apps/mobile/src/database/schema.ts`
- Modify: `apps/mobile/src/database/db.ts`
- Modify: `apps/mobile/src/types/database.ts`
- Test: `apps/mobile/tests/salary_database.test.ts`

- [ ] **Step 1.1: Define TypeScript interfaces**
      Add TypeScript types to `apps/mobile/src/types/database.ts`:
    - `JobRecord`: `id`, `title`, `company_name`, `employment_type`, `pay_schedule`, `pay_day_1`, `pay_day_2`, `gross_salary`, `salary_period`, `target_pocket_id`, `status`, `color`, `notes`, `created_at`, `updated_at`.
    - `JobDeductionRecord`: `id`, `job_id`, `name`, `category`, `amount`, `is_percentage`, `percentage_rate`, `created_at`, `updated_at`.
    - `PaySlipRecord`: `id`, `job_id`, `pocket_id`, `transaction_id`, `pay_date`, `gross_amount`, `total_deductions`, `net_amount`, `deductions_snapshot`, `status`, `notes`, `created_at`, `updated_at`.
    - Input types: `CreateJobInput`, `UpdateJobInput`, `CreateDeductionInput`, `DeductionSnapshotItem`.

- [ ] **Step 1.2: Add DDL in `schema.ts`**
      Add `jobs`, `job_deductions`, and `pay_slips` tables with foreign keys and indexes to `SCHEMA_SQL` in `apps/mobile/src/database/schema.ts`.

- [ ] **Step 1.3: Add migration steps in `db.ts`**
      In `apps/mobile/src/database/db.ts`, add migration blocks (9, 10, 11) to create `jobs`, `job_deductions`, and `pay_slips` if they do not yet exist.

- [ ] **Step 1.4: Write unit test to verify database tables and foreign keys**
      Create `apps/mobile/tests/salary_database.test.ts` testing table creation and constraint enforcement.

- [ ] **Step 1.5: Run test & commit**
      Run `npm run test --workspace=@finance-tracker/mobile -- tests/salary_database.test.ts`. Commit changes.

---

### Task 2: Salary & Payday Service Layer (`salaryService.ts`) with Calculation TDD

**Files:**

- Create: `apps/mobile/src/services/salaryService.ts`
- Test: `apps/mobile/tests/salary_service.test.ts`

- [ ] **Step 2.1: Write failing unit tests for salary math and schedule normalization**
      Create `apps/mobile/tests/salary_service.test.ts` testing:
    - `calculateNetTakeHome(gross, deductions)` $\rightarrow$ `gross - sum(deductions)`
    - `normalizeMonthlySalary(gross, schedule)` for monthly, semi-monthly, biweekly, weekly
    - `categorizeDeductions(deductions)` breaking down into `tax`, `statutory`, `workplace`, `other`
    - `getNextPayDate(paySchedule, payDay1, payDay2, fromDate)` with short month clamping

- [ ] **Step 2.2: Implement calculations and CRUD methods in `salaryService.ts`**
      Implement in `apps/mobile/src/services/salaryService.ts`:
    - `calculateNetTakeHome`
    - `normalizeMonthlySalary`
    - `categorizeDeductions`
    - `getNextPayDate`
    - `clampDayToMonth`
    - CRUD operations:
        - `getAllJobs(db, status?: 'active' | 'archived')`
        - `getJobById(db, id)`
        - `createJob(db, input: CreateJobInput, deductions: CreateDeductionInput[])`
        - `updateJob(db, id, input: UpdateJobInput, deductions?: CreateDeductionInput[])`
        - `archiveJob(db, id)`
        - `unarchiveJob(db, id)`
        - `deleteJob(db, id)`
        - `getIncomeSummary(db)`

- [ ] **Step 2.3: Run tests and ensure all tests pass**
      Run `npm run test --workspace=@finance-tracker/mobile -- tests/salary_service.test.ts`.

- [ ] **Step 2.4: Commit changes**
      `git commit -m "feat(mobile): add salaryService with calculation engine and job CRUD"`

---

### Task 3: Automated Payday Processing & Ledger Balance Synchronization

**Files:**

- Modify: `apps/mobile/src/services/salaryService.ts`
- Test: `apps/mobile/tests/salary_payday_processing.test.ts`

- [ ] **Step 3.1: Write failing unit test for payday processing**
      Create `apps/mobile/tests/salary_payday_processing.test.ts` verifying:
    - When payday is due, an income transaction is added to `transactions` table.
    - Target pocket `current_balance` is incremented by `net_amount`.
    - A `pay_slips` record is created with the exact itemized deduction JSON snapshot.
    - Idempotency: re-running on the same pay date does NOT create duplicate transactions or pay slips.
    - In-app notification is queued.

- [ ] **Step 3.2: Implement `processDuePaydays` in `salaryService.ts`**
      Implement:

    ```typescript
    export async function processDuePaydays(
        db: SQLiteDatabase,
        referenceDate: Date = new Date()
    ): Promise<{ processedCount: number; totalCredited: number }>;
    ```

- [ ] **Step 3.3: Implement manual "Record Payday Now" trigger**
      Implement:

    ```typescript
    export async function recordPaydayManual(db: SQLiteDatabase, jobId: string, payDate: string, notes?: string): Promise<PaySlipRecord>;
    ```

- [ ] **Step 3.4: Verify tests pass & commit**
      Run `npm run test --workspace=@finance-tracker/mobile -- tests/salary_payday_processing.test.ts`. Commit changes.

---

### Task 4: Preset Constants & Salary Dialog Modals (`AddJobModal`, `EditJobModal`, `PaySlipDetailModal`)

**Files:**

- Create: `apps/mobile/src/constants/salaryPresets.ts`
- Create: `apps/mobile/src/components/salary/AddJobModal.tsx`
- Create: `apps/mobile/src/components/salary/EditJobModal.tsx`
- Create: `apps/mobile/src/components/salary/PaySlipDetailModal.tsx`

- [ ] **Step 4.1: Create Philippine & global deduction presets**
      In `apps/mobile/src/constants/salaryPresets.ts`:
      Presets for: Withholding Tax (`tax`), SSS (`statutory`), PhilHealth (`statutory`), Pag-IBIG (`statutory`), HMO / Health Insurance (`workplace`), Retirement / 401k (`workplace`), Staff Loan (`workplace`).

- [ ] **Step 4.2: Build `AddJobModal.tsx`**
      3-Step wizard or clean accordion:
    - Employer name, Job Title, Employment Type.
    - Pay Schedule (`monthly` vs `semi_monthly` 15th/30th), Gross Salary (using `formatMoneyInput`).
    - Target deposit pocket selection using `SearchableSelectField`.
    - Itemized deductions list with quick-add chips and custom row adder.
    - Live calculation bar: `Gross − Deductions = Net Take-Home Pay`.
    - Responsive keyboard inset using `useKeyboardBottomInset`.

- [ ] **Step 4.3: Build `EditJobModal.tsx`**
      Allows updating title, gross salary, pay schedule, and deductions, plus an "Archive Job" button.

- [ ] **Step 4.4: Build `PaySlipDetailModal.tsx`**
      Digital pay slip receipt displaying Gross, itemized Deductions breakdown, Net Take-Home, Deposit Target, and Date in 12-hour format.

- [ ] **Step 4.5: Typecheck & commit**
      Verify with `npm run typecheck`. Commit changes.

---

### Task 5: Job Directory Cards, Detail Sheet & Visual Breakdown Chart

**Files:**

- Create: `apps/mobile/src/components/salary/JobCard.tsx`
- Create: `apps/mobile/src/components/salary/JobDetailSheet.tsx`
- Create: `apps/mobile/src/components/salary/IncomeVisualBreakdownChart.tsx`

- [ ] **Step 5.1: Build `JobCard.tsx`**
      Card displaying:
    - Job Title, Company, Employment type badge.
    - Gross Salary, Total Deductions tag, and Net Take-Home Pay.
    - Next payday countdown badge ("Payday in X days • Date").
    - Direct deposit destination pocket.
    - Tap opens `JobDetailSheet`.

- [ ] **Step 5.2: Build `JobDetailSheet.tsx`**
      BottomSheet / Modal displaying:
    - Header: Net Take-Home Pay per paycheck and monthly equivalent.
    - Itemized deductions breakdown table (Taxes, SSS, PhilHealth, Pag-IBIG, HMO, etc.).
    - Next scheduled payday alert.
    - Pay Slip History list: taps open `PaySlipDetailModal`.
    - Action buttons: "Edit Terms", "Archive / End Job", "Record Payday Now".

- [ ] **Step 5.3: Build `IncomeVisualBreakdownChart.tsx`**
      Visual horizontal progress bar and legend showing:
    - Take-Home Cash (Emerald)
    - Withholding Tax (Rose)
    - Statutory Contributions (Amber)
    - Workplace Benefits & Other (Indigo)

- [ ] **Step 5.4: Typecheck & commit**
      Run `npm run typecheck`. Commit changes.

---

### Task 6: Screen Integration in Accounts, Dashboard, and Analytics

**Files:**

- Modify: `apps/mobile/app/(tabs)/accounts.tsx`
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/app/(tabs)/analytics.tsx`

- [ ] **Step 6.1: Add `Income` tab to `accounts.tsx`**
    - Add `'income'` to `FilterCategory`.
    - Add `Income` segmented pill with Briefcase icon.
    - Render Monthly Summary Banner (Combined Gross, Deductions, Net).
    - Render `IncomeVisualBreakdownChart`.
    - Render Active vs. Archived segmented control.
    - Render job cards list and empty states.
    - Wire `AddJobModal`, `EditJobModal`, `JobDetailSheet`, `PaySlipDetailModal`.

- [ ] **Step 6.2: Auto-check paydays on Dashboard (`index.tsx`)**
    - Call `processDuePaydays(db)` during dashboard load/refresh.
    - Display Next Payday preview banner on Dashboard if active jobs exist.

- [ ] **Step 6.3: Incorporate True Deductions into Analytics (`analytics.tsx`)**
    - Include itemized statutory/tax deductions in total outflow and true cost-of-living breakdowns.

- [ ] **Step 6.4: Verify tests & typecheck**
      Run `npm run typecheck` and `npm run test --workspace=@finance-tracker/mobile`. Commit changes.

---

### Task 7: Database Backup/Restore & Advisor Knowledge Integration

**Files:**

- Modify: `apps/mobile/src/services/databaseBackupService.ts`
- Modify: `apps/mobile/src/services/geminiService.ts`
- Test: `apps/mobile/tests/database_backup_service.test.ts`

- [ ] **Step 7.1: Include jobs, deductions, and pay slips in Database Backup Service**
    - Update `DatabaseBackupData` interface in `databaseBackupService.ts`.
    - Export `jobs`, `job_deductions`, and `pay_slips` in `exportDatabaseBackup`.
    - Import and restore `jobs`, `job_deductions`, and `pay_slips` in `importDatabaseBackup`.

- [ ] **Step 7.2: Update backup unit test**
      Update `apps/mobile/tests/database_backup_service.test.ts` verifying round-trip backup/restore with jobs data.

- [ ] **Step 7.3: Inject salary snapshot into Gemini Financial Context**
      In `geminiService.ts`, inject active jobs, gross salary, total tax/statutory deductions, and net take-home pay so the AI advisor can answer career and income scenario queries.

- [ ] **Step 7.4: Run tests & commit**
      Run `npm run test --workspace=@finance-tracker/mobile`. Commit changes.

---

### Task 8: Final Verification & End-to-End Quality Gate

**Files:**

- All modified and newly created files.

- [ ] **Step 8.1: Run monorepo typecheck**
      Run `npm run typecheck`. Ensure 0 errors across `@finance-tracker/mobile`, `@finance-tracker/shared`, and `@finance-tracker/web`.

- [ ] **Step 8.2: Run entire test suite**
      Run `npm run test --workspace=@finance-tracker/mobile`. Ensure 100% of test suites pass.

- [ ] **Step 8.3: Format with Prettier**
      Run `npx prettier --write .` to ensure perfect code styling.

- [ ] **Step 8.4: Commit & integrate**
      Stage and commit all files to `main`.
