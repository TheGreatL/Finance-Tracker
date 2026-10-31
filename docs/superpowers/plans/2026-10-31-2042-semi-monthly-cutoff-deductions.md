# Semi-Monthly Cut-Off Deductions Implementation Plan

**Created:** 2026-10-31 20:42 (Local Time)

## Overview

Implement per-deduction cut-off scheduling (`both`, `first_cutoff`, `second_cutoff`) for semi-monthly jobs in the finance tracker. This enables accurate simulation of Philippine and modern payroll systems where SSS/PhilHealth are taken on the 1st cut-off and Pag-IBIG is taken on the 2nd cut-off.

---

## Tasks

### Task 1: Data Model & Database Migrations

- [ ] Add `DeductionCutoff` type (`'both' | 'first_cutoff' | 'second_cutoff'`) in `apps/mobile/src/types/database.ts`.
- [ ] Add `pay_cutoff` to `JobDeductionRecord`, `CreateDeductionInput`, and `UpdateDeductionInput`.
- [ ] Update `apps/mobile/src/database/schema.ts` to include `pay_cutoff TEXT NOT NULL DEFAULT 'both' CHECK(pay_cutoff IN ('both', 'first_cutoff', 'second_cutoff'))`.
- [ ] Update `apps/mobile/src/database/db.ts` to migrate existing databases by running `ALTER TABLE job_deductions ADD COLUMN pay_cutoff TEXT NOT NULL DEFAULT 'both'`.
- [ ] Update `apps/mobile/src/services/databaseBackupService.ts` to preserve `pay_cutoff`.

### Task 2: Service Calculations & Payday Processing

- [ ] Update `calculateNetTakeHome` in `salaryService.ts` to support optional `targetCutoff?: DeductionCutoff`.
- [ ] Update `normalizeMonthlySalary` / `getIncomeSummary` in `salaryService.ts` to calculate semi-monthly deductions based on cut-off frequency (1x for single cut-off, 2x for both).
- [ ] Update `createJob`, `updateJob`, `recordPaydayManual`, and `processDuePaydays` in `salaryService.ts` to store and evaluate `pay_cutoff`.
- [ ] Determine cut-off targeting in `processDuePaydays` based on whether the pay date is `pay_day_1` or `pay_day_2`.
- [ ] Update unit tests in `salary_service.test.ts` and `salary_payday_processing.test.ts` to assert cut-off behavior.

### Task 3: Salary Presets & Defaults

- [ ] Update `PHILIPPINE_STATUTORY_PRESETS` in `salaryPresets.ts` to provide gold-standard cut-off defaults:
    - SSS -> `first_cutoff`
    - PhilHealth -> `first_cutoff`
    - Pag-IBIG -> `second_cutoff`
    - Withholding Tax -> `both`

### Task 4: UI Modals (AddJobModal & EditJobModal)

- [ ] In `AddJobModal.tsx`:
    - Add cut-off selector (`Both`, `1st Cut-off`, `2nd Cut-off`) to deduction inputs when `paySchedule === 'semi_monthly'`.
    - Wire preset selection to initialize cut-offs with gold standard defaults.
- [ ] In `EditJobModal.tsx`:
    - Load existing `pay_cutoff` and allow editing.

### Task 5: UI Cards & Detail Sheets (JobCard & JobDetailSheet)

- [ ] In `JobDetailSheet.tsx`:
    - Display cut-off badges next to deduction names (`1st Cut-off`, `2nd Cut-off`, `Every Paycheck`).
    - Show upcoming cut-off expected take-home based on whether the next payday is Cut-off 1 or Cut-off 2.
- [ ] In `JobCard.tsx`:
    - Ensure net take-home pay and deduction counts accurately convey semi-monthly terms.

### Task 6: Verification

- [ ] Run full mobile test suite with `vitest`.
- [ ] Run monorepo typecheck with `turbo run typecheck`.
- [ ] Run prettier formatting check.
