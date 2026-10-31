# One-Time Job Payments & Payout Schedules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Created:** 2026-10-31 20:21 (Local Time)

**Goal:** Add first-class support for one-time job payments (freelance projects, gigs, bonuses, single contract milestones) across database schema, salary service calculations, and UI modals/cards.

**Architecture:** Extend `PaySchedule` enum with `'one_time'`. Add `payout_date` column to SQLite `jobs` table with non-destructive migration. Update `salaryService.ts` to compute one-time payout dates, handle single auto-deposit, and factor one-time income into monthly summaries appropriately. Update `AddJobModal`, `EditJobModal`, `JobCard`, and `JobDetailSheet` for one-time payment selection and status badges.

**Tech Stack:** React Native, Expo SQLite, TypeScript, Vitest, NativeWind.

**Spec:** `docs/superpowers/specs/2026-10-31-2021-one-time-job-payments-design.md`

## Global Constraints

- Zero emojis or emoticons across all code, UI labels, toasts, and comments.
- Monorepo constraint: NEVER execute `git commit` or `git add` - leave all changes unstaged for user review.
- Preserve full backward compatibility with all existing recurring jobs and tests.

## Review Focus

1. One-time jobs must not repeat in subsequent months after payout.
2. Form validation in `AddJobModal` must validate `payoutDate` when `paySchedule === 'one_time'`.
3. Monthly income summary must only include active one-time jobs whose `payout_date` falls in the current month.
4. All existing tests (184 tests) and new unit tests must pass.

---

### Task 1: Update Types and Database Migration for One-Time Jobs

**Files:**

- Modify: `apps/mobile/src/types/database.ts`
- Modify: `apps/mobile/src/constants/salaryPresets.ts`
- Modify: `apps/mobile/src/database/schema.ts`
- Modify: `apps/mobile/src/database/db.ts`

- [ ] Add `'one_time'` to `PaySchedule` type in `database.ts`.
- [ ] Add `payout_date?: string | null` to `JobRecord`, `CreateJobInput`, and `UpdateJobInput`.
- [ ] Add `{ id: 'one_time', label: 'One-Time Payment', description: 'Single milestone, project or gig payout' }` to `PAY_SCHEDULE_OPTIONS` in `salaryPresets.ts`.
- [ ] Update `SCHEMA_SQL` in `schema.ts` to include `'one_time'` and `payout_date`.
- [ ] Add schema migration in `db.ts` to evolve `jobs` table with `payout_date` and allow `'one_time'`.

### Task 2: Update Salary Service Logic and Calculations

**Files:**

- Modify: `apps/mobile/src/services/salaryService.ts`
- Test: `apps/mobile/tests/salary_service.test.ts`
- Test: `apps/mobile/tests/salary_payday_processing.test.ts`

- [ ] Update `getNextPayDate` to return `payoutDate` for `one_time` schedule.
- [ ] Update `normalizeMonthlySalary` for `one_time` to return amount.
- [ ] Update `getIncomeSummary` so one-time jobs only count toward the current month if `payout_date` matches current month.
- [ ] Update `processDuePaydays` to deposit one-time job when reference date reaches or exceeds `payout_date` (and never repeat).
- [ ] Add unit tests in `salary_service.test.ts` and `salary_payday_processing.test.ts` verifying one-time job creation, next pay date calculation, and single auto-deposit behavior.

### Task 3: Update Job Form Modals (`AddJobModal` & `EditJobModal`)

**Files:**

- Modify: `apps/mobile/src/components/salary/AddJobModal.tsx`
- Modify: `apps/mobile/src/components/salary/EditJobModal.tsx`

- [ ] When `paySchedule === 'one_time'`, hide day-1 / day-2 recurring inputs.
- [ ] Show `payoutDate` input with validation for valid `YYYY-MM-DD`.
- [ ] Ensure `onSubmit` correctly includes `payoutDate`.

### Task 4: Update `JobCard` and `JobDetailSheet`

**Files:**

- Modify: `apps/mobile/src/components/salary/JobCard.tsx`
- Modify: `apps/mobile/src/components/salary/JobDetailSheet.tsx`

- [ ] Render "One-Time Payment" label on `JobCard`.
- [ ] Display "Paid • One-Time" or "Pending Payout" badges depending on whether a payslip exists.
- [ ] Update `JobDetailSheet` to reflect one-time payout status and adjust action button label.

### Task 5: Verification & Prettier Check

- [ ] Run `npm run test --workspace=@finance-tracker/mobile`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npx prettier --check` on touched files.
