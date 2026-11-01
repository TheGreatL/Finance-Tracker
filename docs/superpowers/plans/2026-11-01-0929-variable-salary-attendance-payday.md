# Variable Salary, Attendance & Payday Confirmation Implementation Plan

**Created:** 2026-11-01 09:29 (Local Time)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a comprehensive variable salary, attendance, overtime, and payday confirmation system allowing users to record exact net cash received or itemized attendance adjustments (OT, holiday, undertime, absences) with job-level auto-deposit preferences.

**Architecture:** Extend SQLite database schema (`jobs` with `is_variable_salary`, `pay_slips` with attendance and earnings fields); update `salaryService.ts` to support detailed and quick manual payday recording and skip auto-deposits for variable salary jobs in `processDuePaydays`; create `RecordPaydayModal.tsx`; update `JobDetailSheet.tsx`, `AddJobModal.tsx`, `EditJobModal.tsx`, `UpcomingPaydayBanner.tsx`, and `PaySlipDetailModal.tsx`.

**Tech Stack:** React Native (Expo SDK 54), TypeScript, SQLite (expo-sqlite), TailwindCSS (NativeWind v4), Lucide React Native icons.

**Spec:** [docs/superpowers/specs/2026-11-01-0929-variable-salary-attendance-payday-design.md](file:///c:/Users/user/Desktop/projects/finance-tracker/docs/superpowers/specs/2026-11-01-0929-variable-salary-attendance-payday-design.md)

## Global Constraints

- **CRITICAL**: The user instructed _"for this time, let me commit and add the changes"_. **NEVER run `git add` or `git commit`**. All changes must remain unstaged.
- Zero emojis or emoticons anywhere in code or user-facing strings.
- All file and component links must use clickable `file:///` markdown syntax.
- Follow existing codebase patterns for SQLite migrations, money formatting, and modal sheets.

## Review Focus

1. **Negative Deductions / Excessive Tardiness**: Ensure that if undertime and absences exceed gross salary, adjusted gross and net take-home clamp at 0 and do not produce negative balances.
2. **Backward Compatibility**: Ensure existing jobs without `is_variable_salary` default to `0` and continue functioning as fixed salaries without crashing or breaking existing pay slips.
3. **Transaction & Balance Sync**: Ensure recording variable payday deposits properly updates the target pocket's `current_balance` and records an income transaction matching the exact `net_amount`.
4. **Cut-off Specific Deductions**: Ensure when switching cut-offs, statutory deductions configured for `first_cutoff` or `second_cutoff` correctly pre-populate in the itemized breakdown.
5. **Direct Net Override**: Ensure when using Quick Mode, the user's custom net amount is strictly respected and recorded directly to pocket balance and transaction.

---

### Task 1: Database Schema & Type Definitions

**Files:**

- Modify: `apps/mobile/src/types/database.ts`
- Modify: `apps/mobile/src/database/schema.ts`
- Modify: `apps/mobile/src/database/db.ts`
- Modify: `apps/mobile/src/services/databaseBackupService.ts`
- Test: `apps/mobile/tests/salary_service.test.ts`

**Interfaces:**

- `JobRecord`: add `is_variable_salary?: number;`
- `CreateJobInput`: add `isVariableSalary?: boolean;`
- `UpdateJobInput`: add `isVariableSalary?: boolean;`
- `PaySlipRecord`: add `basic_pay?: number; overtime_pay?: number; holiday_pay?: number; allowances?: number; undertime_deduction?: number; absence_deduction?: number; earnings_snapshot?: string;`
- `EarningsSnapshotItem`: `{ name: string; amount: number; type: 'basic' | 'overtime' | 'holiday' | 'allowance' | 'undertime' | 'absence'; }`
- `RecordPaydayInput`:

    ```typescript
    export interface RecordPaydayInput {
        jobId: string;
        payDate: string;
        pocketId?: string;
        mode?: 'quick' | 'detailed';
        basicPay?: number;
        overtimePay?: number;
        holidayPay?: number;
        allowances?: number;
        undertimeDeduction?: number;
        absenceDeduction?: number;
        grossAmount?: number;
        totalDeductions?: number;
        netAmount: number;
        deductionsSnapshot?: DeductionSnapshotItem[];
        earningsSnapshot?: EarningsSnapshotItem[];
        notes?: string;
    }
    ```

- [ ] **Step 1: Write test for schema migration and variable salary fields**
- [ ] **Step 2: Update `types/database.ts` with new interfaces and fields**
- [ ] **Step 3: Update `database/schema.ts` with table DDL columns**
- [ ] **Step 4: Update `database/db.ts` with ALTER TABLE migrations**
- [ ] **Step 5: Update `databaseBackupService.ts` to preserve new fields**
- [ ] **Step 6: Run tests and verify schema passes**

---

### Task 2: Service Layer Enhancements (`salaryService.ts`)

**Files:**

- Modify: `apps/mobile/src/services/salaryService.ts`
- Test: `apps/mobile/tests/salary_service.test.ts`

**Interfaces:**

- `calculateAdjustedEarnings(basePay: number, adjustments: { overtime?: number; holiday?: number; allowances?: number; undertime?: number; absences?: number }): { grossEarnings: number; itemized: EarningsSnapshotItem[] }`
- `recordPaydayManual(db: SQLiteDatabase, input: RecordPaydayInput): Promise<PaySlipRecord>`
- `processDuePaydays(db: SQLiteDatabase, referenceDate?: Date)`: skip jobs where `is_variable_salary === 1` from auto-crediting and queue reminder notification instead.

- [ ] **Step 1: Write unit tests in `salary_service.test.ts` for attendance calculations and variable payday recording**
- [ ] **Step 2: Implement `calculateAdjustedEarnings` in `salaryService.ts`**
- [ ] **Step 3: Update `createJob` and `updateJob` to persist `is_variable_salary`**
- [ ] **Step 4: Update `recordPaydayManual` to accept `RecordPaydayInput` and record attendance snapshots**
- [ ] **Step 5: Update `processDuePaydays` to skip auto-depositing variable salary jobs and trigger payday due alerts**
- [ ] **Step 6: Run unit tests and verify all pass**

---

### Task 3: Build `RecordPaydayModal.tsx` Component

**Files:**

- Create: `apps/mobile/src/components/salary/RecordPaydayModal.tsx`
- Modify: `apps/mobile/src/components/salary/JobDetailSheet.tsx`
- Modify: `apps/mobile/app/(tabs)/obligations.tsx`

**Features:**

- Header with Job Title, Company, and Cut-off indicator
- Destination Account Pocket selector (switchable)
- Pay Date input/picker
- Dual Tab Switcher: "Quick Net Pay" vs "Itemized Attendance & OT"
- Quick Mode: Direct exact net amount input
- Itemized Mode:
    - Base Pay (prefilled)
    - Overtime Pay (+)
    - Holiday Pay / Night Diff (+)
    - Allowances (+)
    - Less: Tardiness / Undertime (-)
    - Less: Absences / LWOP (-)
    - Statutory Deductions review & checkboxes
    - Real-time Computed Net Take-home badge
- Submit action: calls `onConfirmPayday(input)`

- [ ] **Step 1: Implement `RecordPaydayModal.tsx` with clean NativeWind styling and accessibility**
- [ ] **Step 2: Connect `JobDetailSheet.tsx` to open `RecordPaydayModal` when "Record Now" / "Deposit" is pressed**
- [ ] **Step 3: Connect `obligations.tsx` to manage modal state and call `recordPaydayManual` with `RecordPaydayInput`**
- [ ] **Step 4: Verify UI interactions and state transitions**

---

### Task 4: Job Profile Settings (`AddJobModal.tsx` & `EditJobModal.tsx`)

**Files:**

- Modify: `apps/mobile/src/components/salary/AddJobModal.tsx`
- Modify: `apps/mobile/src/components/salary/EditJobModal.tsx`

**Features:**

- Add toggle switch: "Variable Salary (Attendance Based)"
- Subtitle: "Prompt on payday to enter actual hours, OT, absences, or exact net amount. Disables background auto-deposit."
- Save `isVariableSalary` on create and update.

- [ ] **Step 1: Add variable salary toggle in `AddJobModal.tsx`**
- [ ] **Step 2: Add variable salary toggle in `EditJobModal.tsx`**
- [ ] **Step 3: Wire submission inputs in `obligations.tsx`**
- [ ] **Step 4: Verify toggle state persists across job edit and reload**

---

### Task 5: Pay Slip Receipt (`PaySlipDetailModal.tsx`) & Banner Updates

**Files:**

- Modify: `apps/mobile/src/components/salary/PaySlipDetailModal.tsx`
- Modify: `apps/mobile/src/components/salary/UpcomingPaydayBanner.tsx`

**Features:**

- In `PaySlipDetailModal.tsx`:
    - Render attendance section when `overtime_pay`, `holiday_pay`, `allowances`, `undertime_deduction`, `absence_deduction`, or `earnings_snapshot` is present.
    - Update `handleShare` text message to include attendance details in the exported receipt.
- In `UpcomingPaydayBanner.tsx`:
    - Show "Confirm & Deposit" badge if job is variable salary.

- [ ] **Step 1: Update `PaySlipDetailModal.tsx` with attendance & earnings breakdown cards**
- [ ] **Step 2: Update share text formatter in `PaySlipDetailModal.tsx`**
- [ ] **Step 3: Update `UpcomingPaydayBanner.tsx` badge for variable salary jobs**

---

### Task 6: Full Verification & Codebase Integrity

**Files:**

- All touched files
- Workspace test suites

- [ ] **Step 1: Run TypeScript check (`npm run typecheck`) across the workspace**
- [ ] **Step 2: Run all Jest unit tests (`npm run test --workspace=@finance-tracker/mobile`)**
- [ ] **Step 3: Format code with Prettier (`npx prettier --write`)**
- [ ] **Step 4: Confirm all changes remain unstaged (NO `git add`, NO `git commit`)**
- [ ] **Step 5: Present results and summary to the user**
