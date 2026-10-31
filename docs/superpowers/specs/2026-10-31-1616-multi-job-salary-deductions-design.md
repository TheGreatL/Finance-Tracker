# Multi-Job Salary & Itemized Deductions Design Specification

**Created:** 2026-10-31 16:16 (Local Time)  
**Status:** Approved  
**Author:** Antigravity

---

## 1. Executive Summary & Objective

In modern financial management, users frequently manage multiple income streams (primary employment, side gigs, freelance contracts, and part-time jobs). Furthermore, gross salary rarely reflects actual cash received due to mandatory deductions (withholding tax, statutory contributions like SSS, PhilHealth, Pag-IBIG in the Philippines, and workplace benefits like HMO and retirement plans).

### Goal

Provide a **Gold Standard** income and payroll tracking system within `@finance-tracker/mobile`:

1. **Manage Multiple Concurrent Jobs**: Create and maintain multiple employer/client profiles with distinct pay schedules.
2. **Active vs. Archived Lifecycle**: Active jobs drive current monthly expected cash flows and scheduled payday deposits; ended jobs are moved to "Archived", permanently preserving historical pay slips and deductions in lifetime records.
3. **Salary Breakdown & Customizable Itemized Deductions**: Gross salary entry with itemized deductions (Taxes, Statutory Contributions, Workplace Deductions, and Custom Line Items) with automatic computation of net take-home pay and destination deposit account mapping.
4. **Automated Payday Deposits & Ledger Integration**: On scheduled paydays, records net take-home salary into the designated account balance, while logging itemized deduction snapshots for true cost-of-living visibility.
5. **Income Directory & Visual Breakdown**: Dedicated Active vs. Archived job directory, monthly income summary cards (Gross, Deductions, Net), and visual breakdown charts (Take-Home vs. Taxes vs. Statutory vs. Benefits).
6. **AI Advisor & Backup Integration**: Expose salary and deduction streams to the Gemini / Offline Advisor and include jobs in full SQLite JSON backups.

---

## 2. Domain Model & Database Schema

### 2.1 Table: `jobs`

Stores employer and client profiles.

```sql
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  employment_type TEXT NOT NULL CHECK(employment_type IN ('full_time', 'part_time', 'freelance', 'contract')),
  pay_schedule TEXT NOT NULL CHECK(pay_schedule IN ('monthly', 'semi_monthly', 'weekly', 'biweekly')),
  pay_day_1 INTEGER NOT NULL,
  pay_day_2 INTEGER DEFAULT NULL,
  gross_salary REAL NOT NULL,
  salary_period TEXT NOT NULL DEFAULT 'per_paycheck' CHECK(salary_period IN ('per_paycheck', 'monthly')),
  target_pocket_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  color TEXT DEFAULT '#18342B',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (target_pocket_id) REFERENCES account_pockets(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_pocket ON jobs(target_pocket_id);
```

### 2.2 Table: `job_deductions`

Stores itemized deduction line items configured for each job.

```sql
CREATE TABLE IF NOT EXISTS job_deductions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('tax', 'statutory', 'workplace', 'other')),
  amount REAL NOT NULL,
  is_percentage INTEGER NOT NULL DEFAULT 0,
  percentage_rate REAL DEFAULT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_job_deductions_job ON job_deductions(job_id);
CREATE INDEX IF NOT EXISTS idx_job_deductions_category ON job_deductions(category);
```

### 2.3 Table: `pay_slips`

Stores historical payday executions and snapshots of itemized deductions at the time of payout.

```sql
CREATE TABLE IF NOT EXISTS pay_slips (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  pocket_id TEXT NOT NULL,
  transaction_id TEXT DEFAULT NULL,
  pay_date TEXT NOT NULL,
  gross_amount REAL NOT NULL,
  total_deductions REAL NOT NULL,
  net_amount REAL NOT NULL,
  deductions_snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid' CHECK(status IN ('pending', 'paid', 'skipped')),
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT,
  FOREIGN KEY (pocket_id) REFERENCES account_pockets(id) ON DELETE RESTRICT,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pay_slips_job ON pay_slips(job_id);
CREATE INDEX IF NOT EXISTS idx_pay_slips_date ON pay_slips(pay_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pay_slips_unique_job_date ON pay_slips(job_id, pay_date);
```

---

## 3. Business Logic & Calculations

### 3.1 Pay Schedule Normalization

Jobs can be paid on different frequencies:

- **`monthly`**: Paid once a month on `pay_day_1` (multiplier to monthly: $\times 1$).
- **`semi_monthly`**: Paid twice a month on `pay_day_1` and `pay_day_2` (e.g. 15th and 30th) (multiplier to monthly: $\times 2$).
- **`biweekly`**: Paid every 2 weeks (multiplier to monthly: $\times 26 / 12 \approx 2.1667$).
- **`weekly`**: Paid every week (multiplier to monthly: $\times 52 / 12 \approx 4.3333$).

### 3.2 Salary Breakdown & Deductions

For each job:
$$\text{Total Deductions} = \sum \text{Deduction Amounts}$$
$$\text{Net Take-Home Pay} = \text{Gross Salary} - \text{Total Deductions}$$

Monthly Projected Figures across all active jobs:
$$\text{Combined Monthly Gross} = \sum (\text{Job Gross} \times \text{Schedule Multiplier})$$
$$\text{Combined Monthly Deductions} = \sum (\text{Job Deductions} \times \text{Schedule Multiplier})$$
$$\text{Combined Monthly Net} = \text{Combined Gross} - \text{Combined Deductions}$$

### 3.3 End-of-Month Clamping

For days like 30 or 31 in shorter months (e.g. February):
`clampDayToMonth(year, month, targetDay)` returns `Math.min(targetDay, daysInMonth(year, month))`.

---

## 4. UI/UX Architecture

### 4.1 Income Sub-Tab in Accounts (`apps/mobile/app/(tabs)/accounts.tsx`)

Add `'income'` to the Accounts segmented categories:
`[All] [Banks] [E-Wallets] [Income] [Subscriptions] [Loans] [Cash]`

When `Income` is selected:

1. **Summary Banner**:
    - Combined Monthly Gross
    - Combined Monthly Deductions
    - Combined Monthly Net Take-Home Pay
2. **Visual Breakdown Card**:
    - Distribution Bar & Legend:
        - 🟢 Net Cash Take-Home
        - 🔴 Income Tax
        - 🟡 Statutory Contributions (SSS, PhilHealth, Pag-IBIG)
        - 🟣 Workplace Benefits & Other (HMO, Retirement)
3. **Active vs. Archived Segment Filter**:
    - `Active Jobs (N)` / `Archived Jobs (N)`
4. **Job Cards**:
    - Title, Company, Employment Type badge
    - Target Account pocket tag (e.g., "Maya Wallet")
    - Gross $\rightarrow$ Deductions $\rightarrow$ Net preview
    - Next Payday pill with countdown ("Payday in 4 days • Nov 15")
    - Tap opens `JobDetailSheet`
5. **Floating Action Button / Header**:
    - `+ Add Job`

### 4.2 Modal Dialogs

- [`AddJobModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/salary/AddJobModal.tsx):
    - Step 1: Employer/Client profile, Job Title, Employment Type, Pay Schedule (Monthly, Semi-monthly / 15th & 30th, Weekly, Bi-weekly), Pay Dates.
    - Step 2: Agreed Gross Salary (formatted real-time with `formatMoneyInput`), Target Deposit Pocket (via `SearchableSelectField`).
    - Step 3: Itemized Deductions Manager:
        - Quick-add common presets: Withholding Tax, SSS, PhilHealth, Pag-IBIG, HMO / Health Insurance, Retirement/401k, Staff Loan.
        - Custom deduction row: Name, Category, Amount (with `formatMoneyInput`).
    - Real-time calculation preview bar: `Gross − Deductions = Net Take-Home Pay`.
- [`EditJobModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/salary/EditJobModal.tsx):
    - Edit terms, salary, deductions, or archive/unarchive job.
- [`JobDetailSheet.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/salary/JobDetailSheet.tsx):
    - Detailed breakdown of gross, deductions, and net.
    - Pay Slip History list (each historical payout with viewable receipt/deductions).
    - Quick actions: "Edit Job", "Archive Job", "Generate / Record Payday Now".
- [`PaySlipDetailModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/salary/PaySlipDetailModal.tsx):
    - Digital pay slip receipt showing line-by-line itemized deductions, net deposit, and date.

---

## 5. Automated Payday Processing & Ledgers

- Automatically runs on app launch or screen refresh (`processDuePaydays`).
- For any active job whose scheduled pay date $\le \text{today}$ and no pay slip exists for that date:
    1. Inserts an income transaction in `transactions`:
        - `amount = net_amount`
        - `pocket_id = target_pocket_id`
        - `category = 'Salary'`
        - `title = `${job.title} - ${job.company_name} Net Salary``
        - `notes = `Payday deposit (${formatDisplayDate(payDate)}). Gross: ${formatCurrency(gross)} - Deductions: ${formatCurrency(deductions)}``
    2. Updates target pocket `current_balance += net_amount`.
    3. Inserts a record in `pay_slips` with a JSON snapshot of the itemized deductions.
    4. Posts an in-app notification: _"🎉 Payday! {net_amount} deposited into {pocket_name} from {company_name}."_
