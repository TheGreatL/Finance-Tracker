# One-Time Job Payments & Payout Schedules Design Specification

**Created:** 2026-10-31 20:21 (Local Time)

## Overview

Not all jobs or income streams have continuous, recurring pay cycles. Freelance milestones, consulting gigs, project bounties, and independent contracts frequently operate on a **one-time agreed payment** paid out on a specific target date or upon project delivery.

This specification details adding first-class support for **One-Time Payments** in the Multi-Job Income system across the database, business logic, UI modals, and monthly summary metrics.

---

## 1. Data Model & Schema Migration

### PaySchedule Enum

Extend `PaySchedule` in `apps/mobile/src/types/database.ts`:

```typescript
export type PaySchedule = 'monthly' | 'semi_monthly' | 'biweekly' | 'weekly' | 'one_time';
```

### Table Schema & SQLite Evolution

In `apps/mobile/src/database/schema.ts` and `apps/mobile/src/database/db.ts`:

- Update `jobs` table definition to allow `'one_time'` in the `pay_schedule` CHECK constraint.
- Add an optional column `payout_date TEXT DEFAULT NULL` (stores ISO date `YYYY-MM-DD`).
- For existing databases, automatically detect if `jobs` schema includes `'one_time'`, and migrate columns seamlessly without data loss.

### Types & Inputs

```typescript
export interface CreateJobInput {
    title: string;
    companyName: string;
    employmentType: EmploymentType;
    paySchedule: PaySchedule;
    payDay1: number;
    payDay2?: number | null;
    payoutDate?: string | null;
    grossSalary: number;
    salaryPeriod?: 'monthly' | 'per_paycheck';
    targetPocketId: string;
    color?: string;
    notes?: string;
}
```

---

## 2. Business Logic & Income Calculations

### `salaryService.ts` Updates:

1. **`normalizeMonthlySalary(amount, schedule)`**:
    - For `schedule === 'one_time'`, returns `amount` (as a single payout amount).
2. **`getIncomeSummary(db)`**:
    - Active one-time jobs: Included in `monthlyGross` and `monthlyNetTakeHome` **only if their `payout_date` falls in the current calendar month** and has not yet been marked completed/archived. If `payout_date` is outside the current month, it is not multiplied as recurring monthly salary.
3. **`getNextPayDate(schedule, payDay1, payDay2, fromDate, payoutDate)`**:
    - For `one_time`, returns `payoutDate || todayStr`.
4. **`processDuePaydays(db, referenceDate)`**:
    - For `job.pay_schedule === 'one_time'`, candidate pay date is `job.payout_date`.
    - If `payout_date <= referenceDate` and no payslip exists yet for this job, deposits the net amount into `target_pocket_id`, generates a payslip, and marks the job with a paid badge.

---

## 3. UI & Component Experience

### `AddJobModal.tsx` & `EditJobModal.tsx`:

- Add `{ id: 'one_time', label: 'One-Time Payment', description: 'Single milestone, project or gig payout' }` to schedule options.
- When **One-Time Payment** is selected:
    - Hide recurring "Day of Month (1-31)" and "Second Payday" fields.
    - Display "Target Payout Date" with `YYYY-MM-DD` input and instant helper format.
    - Set `payDay1` to the day of `payoutDate` (or 1) for schema compatibility.
    - Validation: Ensure payout date is a valid date string.

### `JobCard.tsx` & `JobDetailSheet.tsx`:

- Display schedule badge: `"One-Time Payment"`.
- If already paid out (payslip exists or status reflects paid):
    - Badge: `"Paid • One-Time"` in emerald.
    - Action button: Changed to `"Paid Out"` (or disabled).
- If pending payout:
    - Badge: `"Pending Payout"` in amber.
    - Shows days remaining until the target payout date.

---

## 4. Design System Compliance

- **Zero Emojis/Emoticons**: Strict adherence across all copy, badges, and empty states.
- **Typography & Consistency**: Standard 16px corner radius (`rounded-2xl`), single border elevations, and pine/sage palette.
- **Feedback**: Integrated with `useToast` for payment notifications (`"One-time payout deposited"`).
