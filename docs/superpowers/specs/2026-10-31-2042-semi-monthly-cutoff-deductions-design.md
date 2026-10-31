# Semi-Monthly Cut-Off Deductions Specification

**Created:** 2026-10-31 20:42 (Local Time)

## Overview

In the Philippine workforce and modern payroll systems, semi-monthly compensation schedules (e.g. 15th and 30th/31st of the month) allocate statutory and workplace deductions across specific cut-offs rather than taking every deduction from both paychecks.

Specifically:

- **1st Cut-off (Pay Day 1 / 15th):** Typically carries **SSS** and **PhilHealth** employee contributions.
- **2nd Cut-off (Pay Day 2 / 30th):** Typically carries **Pag-IBIG (HDMF)** contributions.
- **Both Cut-offs:** Withholding tax and recurring workplace deductions (HMO, uniform, savings fund) are frequently split or applied uniformly across both paychecks.

This specification details the end-to-end implementation for first-class cut-off scheduling per deduction item.

---

## Architecture & Data Model

### 1. Database Schema

In `job_deductions`:

- New column: `pay_cutoff TEXT NOT NULL DEFAULT 'both' CHECK(pay_cutoff IN ('both', 'first_cutoff', 'second_cutoff'))`
- Preserves full backward compatibility for existing records (defaulting to `'both'`).

```sql
CREATE TABLE IF NOT EXISTS job_deductions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('tax', 'statutory', 'workplace', 'other')),
  amount REAL NOT NULL,
  is_percentage INTEGER NOT NULL DEFAULT 0,
  percentage_rate REAL DEFAULT NULL,
  pay_cutoff TEXT NOT NULL DEFAULT 'both' CHECK(pay_cutoff IN ('both', 'first_cutoff', 'second_cutoff')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
```

### 2. TypeScript Types

In `apps/mobile/src/types/database.ts`:

```ts
export type DeductionCutoff = 'both' | 'first_cutoff' | 'second_cutoff';

export interface JobDeductionRecord {
    id: string;
    job_id: string;
    name: string;
    category: DeductionCategory;
    amount: number;
    is_percentage: number;
    percentage_rate: number | null;
    pay_cutoff: DeductionCutoff;
    created_at: string;
    updated_at: string;
}

export interface CreateDeductionInput {
    name: string;
    category: DeductionCategory;
    amount: number;
    isPercentage?: boolean;
    percentageRate?: number | null;
    payCutoff?: DeductionCutoff;
}
```

---

## Business Logic & Calculations

### 1. Net Take-Home Pay Calculation

Function signature in `apps/mobile/src/services/salaryService.ts`:

```ts
export function calculateNetTakeHome(
    grossSalary: number,
    deductions: Array<JobDeductionRecord | CreateDeductionInput>,
    targetCutoff?: DeductionCutoff
): NetSalaryCalculation;
```

- When `targetCutoff` is provided (e.g. `'first_cutoff'` or `'second_cutoff'`):
    - Filters items where `item.payCutoff === 'both' || item.payCutoff === targetCutoff`.
- When `targetCutoff` is `'both'` or omitted:
    - Considers all deductions (used for baseline/every-check views).

### 2. Monthly Normalization

In `getIncomeSummary`:
For semi-monthly jobs:

- If `d.pay_cutoff === 'both'`: Monthly deduction = `d.amount * 2`.
- If `d.pay_cutoff === 'first_cutoff'`: Monthly deduction = `d.amount * 1` (deducted once a month).
- If `d.pay_cutoff === 'second_cutoff'`: Monthly deduction = `d.amount * 1` (deducted once a month).
- Monthly Gross = `job.gross_salary * 2` (or `job.gross_salary` if salary_period is monthly).
- Monthly Net Take-Home = `monthlyGross - monthlyDeductions`.

### 3. Payday Processing & Pay Slips

- When `processDuePaydays` or manual payday recording triggers:
    - Determines if the pay date corresponds to `pay_day_1` (`first_cutoff`) or `pay_day_2` (`second_cutoff`).
    - Itemizes only the active deductions for that specific cut-off.
    - Pay slip receipt snapshot (`deductions_snapshot`) and net amount reflect the actual deductions taken on that date.

---

## UI/UX & Modal Configuration

### 1. Deduction Cut-Off Selector

In `AddJobModal.tsx` and `EditJobModal.tsx`:

- When `paySchedule === 'semi_monthly'`, each deduction row renders an inline 3-way segment:
  `[ Every Payday | 1st Cut-off | 2nd Cut-off ]`
- When `paySchedule !== 'semi_monthly'`, the selector is hidden and defaults to `'both'`.

### 2. Gold Standard Presets

In `salaryPresets.ts`:

- When adding Philippine statutory deductions for semi-monthly schedules:
    - **SSS:** Defaults to `first_cutoff`
    - **PhilHealth:** Defaults to `first_cutoff`
    - **Pag-IBIG (HDMF):** Defaults to `second_cutoff`
    - **Withholding Tax:** Defaults to `both`

### 3. Display Badges

In `JobCard.tsx` and `JobDetailSheet.tsx`:

- Deduction lists display a subtle pill badge indicating the cut-off schedule:
    - `1st Cut-off` (Blue/Indigo badge)
    - `2nd Cut-off` (Purple badge)
    - `Both Cut-offs` (Neutral badge)
- Paycheck overview indicates the upcoming cut-off's anticipated net take-home pay.
