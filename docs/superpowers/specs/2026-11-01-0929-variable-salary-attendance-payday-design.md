# Variable Salary, Attendance & Payday Confirmation Design Specification

**Created:** 2026-11-01 09:29 (Local Time)

## Overview

In the Philippine employment and payroll ecosystem, take-home pay is rarely static from one cut-off to the next:

1. **Attendance Adjustments**: Tardiness (late arrival in minutes/hours), undertime (leaving before shift end), and absences or Leave Without Pay (LWOP) reduce the gross pay.
2. **Variable Compensation & Overtime**: Overtime (regular OT, rest day OT, special/regular holiday OT), night shift differential (NSD), allowances (meal, travel, de minimis), and performance incentives increase the payout.
3. **Cut-off Specific Deductions**: Statutory contributions (SSS, PhilHealth, Pag-IBIG) and withholding taxes are frequently partitioned across specific semi-monthly cut-offs (e.g. SSS in 1st cut-off, PhilHealth in 2nd cut-off).
4. **Direct Bank Credits**: Workers often confirm their exact compensation directly from bank SMS alerts or mobile banking push notifications (e.g., BPI, BDO, UnionBank, Maya, GCash).

Prior to this specification, the system automatically credited an assumed fixed salary whenever a pay date arrived or when the user tapped "Record Now", without presenting a confirmation dialog or allowing inputs for variable attendance and overtime.

This specification defines the **Gold Standard Variable Salary & Attendance Payday Confirmation System**, introducing:

- A dedicated **Record Payday Confirmation Modal** (`RecordPaydayModal.tsx`) with dual modes:
    - **Quick Mode**: Direct input of exact net bank credit received.
    - **Detailed Mode**: Comprehensive attendance adjustments (Base Pay, OT, Holiday Pay, Allowances, Tardiness/Undertime, Absences) and statutory deduction toggles.
- Job-level variable salary preference (`is_variable_salary`), preventing background routines from prematurely crediting an assumed fixed amount for variable income streams.
- Historical pay slip schema enhancements storing attendance and overtime snapshots for comprehensive digital pay slips.

---

## 1. Architectural Principles & Requirements

### 1.1 Dual-Mode Recording Experience

- **Quick Net Pay Override**:
    - For users who check their bank account balance or payroll SMS and want to deposit the exact net amount immediately (e.g., `₱18,432.50`) without breaking down every minute of overtime or tardiness.
- **Detailed Attendance & Overtime Breakdown**:
    - **Basic Pay**: Pre-filled with base salary for the cut-off.
    - **Additions (+)**: Overtime Pay, Holiday Pay / Night Differential, Allowances / Bonuses.
    - **Attendance Deductions (-)**: Tardiness / Undertime, Absences / LWOP.
    - **Statutory / Voluntary Deductions (-)**: Pre-populated from job profile with ability to toggle or adjust for the specific cut-off.
    - **Real-Time Dynamic Net Computation**:
      $$\text{Adjusted Gross} = \text{Basic Pay} + \text{OT} + \text{Holiday} + \text{Allowances} - \text{Undertime} - \text{Absences}$$
      $$\text{Net Take-Home} = \max(0, \text{Adjusted Gross} - \text{Total Deductions})$$

### 1.2 Variable vs. Fixed Salary Handling

- If `job.is_variable_salary === 1`:
    - `processDuePaydays` does NOT automatically deposit money into the user's pocket on the due date.
    - Instead, it generates an in-app reminder notification informing the user that payday has arrived and requires attendance confirmation.
    - The UI (Upcoming Payday Banner and Job Cards) highlights a "Confirm & Deposit" action.
- If `job.is_variable_salary === 0`:
    - Standard fixed salary behavior remains supported.
    - Tapping "Record Now" still opens the confirmation modal, allowing manual adjustments if an exception occurred in that pay period.

---

## 2. Data Model & Database Schema

### 2.1 Jobs Table Evolution

Add `is_variable_salary` column:

- `is_variable_salary INTEGER NOT NULL DEFAULT 0` (0 = Fixed recurring amount, 1 = Variable / Attendance-based).

```sql
ALTER TABLE jobs ADD COLUMN is_variable_salary INTEGER NOT NULL DEFAULT 0;
```

### 2.2 Pay Slips Table Evolution

Add attendance, overtime, and earnings snapshot columns:

- `basic_pay REAL DEFAULT 0.0`: Base pay before attendance adjustments.
- `overtime_pay REAL DEFAULT 0.0`: Additional overtime pay.
- `holiday_pay REAL DEFAULT 0.0`: Premium pay for holiday or night differential.
- `allowances REAL DEFAULT 0.0`: Discretionary allowances or non-taxable bonuses.
- `undertime_deduction REAL DEFAULT 0.0`: Tardiness and undertime deductions.
- `absence_deduction REAL DEFAULT 0.0`: Absences and LWOP deductions.
- `earnings_snapshot TEXT DEFAULT NULL`: JSON array containing detailed earnings breakdown.

```sql
ALTER TABLE pay_slips ADD COLUMN basic_pay REAL DEFAULT 0.0;
ALTER TABLE pay_slips ADD COLUMN overtime_pay REAL DEFAULT 0.0;
ALTER TABLE pay_slips ADD COLUMN holiday_pay REAL DEFAULT 0.0;
ALTER TABLE pay_slips ADD COLUMN allowances REAL DEFAULT 0.0;
ALTER TABLE pay_slips ADD COLUMN undertime_deduction REAL DEFAULT 0.0;
ALTER TABLE pay_slips ADD COLUMN absence_deduction REAL DEFAULT 0.0;
ALTER TABLE pay_slips ADD COLUMN earnings_snapshot TEXT DEFAULT NULL;
```

### 2.3 TypeScript Interfaces

```typescript
export interface EarningsSnapshotItem {
    name: string;
    amount: number;
    type: 'basic' | 'overtime' | 'holiday' | 'allowance' | 'undertime' | 'absence';
}

export interface RecordPaydayInput {
    jobId: string;
    payDate: string;
    pocketId?: string;
    mode: 'quick' | 'detailed';
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

---

## 3. User Interface & Interaction Flow

### 3.1 Record Payday Modal (`RecordPaydayModal.tsx`)

1. **Modal Header**:
    - Title: "Record Payday Deposit"
    - Subtitle: `<Job Title>` at `<Company Name>`
    - Cut-off Badge (e.g., "1st Cut-off" or "2nd Cut-off" for semi-monthly jobs).
2. **Destination & Date Bar**:
    - Target Pocket selector: Preselected to `job.target_pocket_id`, with picker allowing deposit to another pocket if desired.
    - Pay Date selector: Defaults to candidate due date, editable.
3. **Mode Segmented Switcher**:
    - `[ Quick Net Pay ]` | `[ Attendance & Overtime ]`
4. **Mode A: Quick Net Pay**:
    - Large numeric input for exact net cash received (`₱`).
    - Pre-filled with standard calculated net for 1-tap confirmation.
    - Helper label: "Enter the exact take-home amount credited to your bank account or wallet."
5. **Mode B: Attendance & Overtime**:
    - **Section 1: Base & Additions (+)**:
        - Basic Pay input (pre-filled).
        - Overtime Pay input (+).
        - Holiday / Night Differential input (+).
        - Allowances & Bonuses input (+).
    - **Section 2: Attendance Deductions (-)**:
        - Late & Undertime input (-).
        - Absences & LWOP input (-).
    - **Section 3: Statutory & Job Deductions (-)**:
        - Interactive list of deductions with amount inputs and checkbox toggles.
    - **Live Net Calculation Summary**:
        - Visual breakdown of Adjusted Gross, Total Deductions, and Final Deposited Net.
6. **Action Footer**:
    - "Cancel" button.
    - "Confirm & Deposit ₱{netAmount}" button with loading spinner state.

### 3.2 Job Settings Integration (`AddJobModal.tsx` & `EditJobModal.tsx`)

- Toggle: **Variable Salary (Attendance Based)**
    - Caption: "Prompt on payday for actual hours, overtime, absences, or exact net payout."
    - When enabled, `is_variable_salary` is saved as `1`.

### 3.3 Digital Pay Slip Receipt (`PaySlipDetailModal.tsx`)

- Enhanced layout displaying:
    - Header: Company, Job Title, Pay Date, Timestamp.
    - Net Deposited Hero card with destination pocket badge.
    - **Attendance & Earnings Breakdown** (if attendance fields or `earnings_snapshot` are recorded):
        - Basic Pay
        - Overtime Pay
        - Holiday / Night Diff Pay
        - Allowances
        - Less: Tardiness / Undertime
        - Less: Absences / LWOP
        - Total Gross Earnings
    - **Deductions Breakdown**:
        - Itemized statutory contributions (Tax, SSS, PhilHealth, Pag-IBIG).
    - Share Receipt formatting includes attendance lines.

---

## 4. Verification & Testing Strategy

1. **Database Schema Verification**:
    - Unit tests verifying migration execution, adding columns to `jobs` and `pay_slips` without losing data.
2. **Service Layer Calculation Tests**:
    - Test calculating adjusted gross pay with positive additions (OT, holiday, allowances) and negative reductions (undertime, absences).
    - Test recording payday with quick net override.
    - Test recording payday with full itemized attendance breakdown and custom deductions snapshot.
    - Test `processDuePaydays` skipping automatic crediting for jobs with `is_variable_salary === 1` while generating due notification.
3. **End-to-End Typecheck & Suite Run**:
    - Full TypeScript check (`npm run typecheck`).
    - Run complete unit test suite across mobile app.
