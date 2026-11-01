# Comprehensive Loan Management Design Specification

**Created:** 2026-11-01 08:50 (Local Time)

## Overview

Retail lending in the Philippines spans a diverse spectrum:

1. **Fintech / E-Wallet Micro-Loans** (e.g., GCash GLoan, Maya Personal Loan / Maya Credit, Shopee SLoan) featuring upfront processing fees, rapid disbursement, and early repayment interest cashback.
2. **Consumer Financing** (e.g., Home Credit) with cooling-off periods and interest-back programs.
3. **Government Social Loans** (e.g., SSS Salary Loan, Pag-IBIG Multi-Purpose Loan) with fixed statutory interest and service fee deductions.
4. **Traditional Commercial Bank Loans** (e.g., BPI, BDO, UnionBank, CIMB) for personal, auto, and home financing.
5. **Peer-to-Peer & Personal Lending** ("Utang sa Tao" — family, friends, colleagues, or informal lenders) with flexible tenors, zero-interest terms, or single lump-sum payoffs.

This specification elevates the loan tracking architecture to the **Gold Standard**, accommodating both institutional and personal lenders, explicit principal vs. total obligation separation, loan tenure and maturity tracking, upfront processing fee deduction, and early payoff interest cashback.

---

## 1. Loan Landscape & Specific Features

| Loan Category               | Providers                                      | Upfront Processing Fee                                             | Interest Structure                                          | Early Payoff & Cashback Policy                                                                                           |
| :-------------------------- | :--------------------------------------------- | :----------------------------------------------------------------- | :---------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| **Fintech Cash Loans**      | **GLoan** (Fuse / CIMB), **SLoan** (Shopee)    | 3% to 5% deducted upfront from disbursement (net cash < principal) | 1.59% to 6.99% / month (diminishing balance or flat add-on) | **Interest Cashback**: Full payment $\ge 1$ month before final due date refunds unbilled future interest back to wallet. |
| **Digital Banking**         | **Maya Personal Loan**, **CIMB Personal Loan** | 0% promo or 1%–3% processing fee                                   | ~0.77%–1.5% add-on / month                                  | Standard pre-termination terms; no automatic consumer cashback.                                                          |
| **Point of Sale Financing** | **Home Credit**                                | ~3% (capped e.g. ₱1,000) deducted upfront                          | 2.49% to 8.49% / month depending on promo                   | 15-day zero-interest cooling-off; "Interest Back" rebate on perfect payment records.                                     |
| **Government Agencies**     | **SSS Salary Loan**, **Pag-IBIG MPL**          | SSS: 1% service fee deducted; Pag-IBIG: minimal fee                | SSS: 8% p.a.; Pag-IBIG: 10.75% p.a.                         | No pre-termination penalties; excess payments reduce principal directly.                                                 |
| **Traditional Banks**       | **BPI**, **BDO**, **UnionBank**                | ₱1,500 to ₱3,000 fixed fee or 1.5%–3%                              | 1.2% to 1.9% monthly add-on                                 | Pre-termination penalty or unearned interest calculation.                                                                |
| **Personal / P2P Loan**     | **Family, Friend, Colleague, Private Lender**  | 0% (No processing fees)                                            | Usually 0% (friendly loan) or fixed informal rate           | Highly flexible; lump-sum or irregular installments.                                                                     |

---

## 2. Architecture & Data Model

### 2.1 Database Schema Enhancements

In `loans` table:

- `lender_type TEXT NOT NULL DEFAULT 'institution' CHECK(lender_type IN ('institution', 'person'))`
- `lender_name TEXT DEFAULT ''`: Custom name when `lender_type === 'person'` (e.g. "Tito Boy", "Mama", "Alex").
- `institution_id TEXT DEFAULT NULL`: Nullable when `lender_type === 'person'`, references `institutions(id)` when `'institution'`.
- `principal_amount REAL DEFAULT NULL`: The actual borrowed / principal amount.
- `processing_fee REAL NOT NULL DEFAULT 0.0`: Upfront fee deducted from proceeds.
- `start_date TEXT DEFAULT NULL`: Disbursement date (`YYYY-MM-DD`).
- `term_months INTEGER DEFAULT NULL`: Loan tenure in months (e.g. 6, 12, 24, 36).
- `has_interest_cashback INTEGER NOT NULL DEFAULT 0`: Whether early full payoff entitles user to interest rebate (e.g. GLoan).
- `interest_cashback_received REAL NOT NULL DEFAULT 0.0`: Total cashback credited to borrower upon early settlement.

```sql
CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  lender_type TEXT NOT NULL DEFAULT 'institution' CHECK(lender_type IN ('institution', 'person')),
  lender_name TEXT DEFAULT '',
  institution_id TEXT DEFAULT NULL,
  title TEXT NOT NULL,
  principal_amount REAL DEFAULT NULL,
  processing_fee REAL NOT NULL DEFAULT 0.0,
  total_amount REAL NOT NULL,
  remaining_balance REAL NOT NULL,
  monthly_payment REAL NOT NULL,
  start_date TEXT DEFAULT NULL,
  due_date TEXT NOT NULL,
  term_months INTEGER DEFAULT NULL,
  interest_rate REAL DEFAULT NULL,
  has_interest_cashback INTEGER NOT NULL DEFAULT 0,
  interest_cashback_received REAL NOT NULL DEFAULT 0.0,
  attachment_path TEXT DEFAULT '',
  attachment_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paid', 'defaulted')),
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE RESTRICT
);
```

### 2.2 TypeScript Type Definitions

In `apps/mobile/src/types/database.ts`:

```ts
export type LenderType = 'institution' | 'person';

export interface LoanRecord {
    id: string;
    lender_type: LenderType;
    lender_name?: string;
    institution_id?: string | null;
    title: string;
    principal_amount?: number | null;
    processing_fee: number;
    total_amount: number;
    remaining_balance: number;
    monthly_payment: number;
    start_date?: string | null;
    due_date: string;
    term_months?: number | null;
    interest_rate?: number | null;
    has_interest_cashback: number;
    interest_cashback_received: number;
    attachment_path?: string;
    attachment_name?: string;
    status: LoanStatus;
    notes?: string;
    created_at: string;
    updated_at: string;
    // Joined fields
    institution_name?: string;
    institution_code?: string;
    institution_color?: string;
}

export interface CreateLoanInput {
    lenderType?: LenderType;
    lenderName?: string;
    institutionId?: string | null;
    title: string;
    principalAmount?: number | null;
    processingFee?: number;
    totalAmount: number;
    remainingBalance?: number;
    monthlyPayment: number;
    startDate?: string | null;
    dueDate: string;
    termMonths?: number | null;
    interestRate?: number | null;
    hasInterestCashback?: boolean;
    attachmentPath?: string;
    attachmentName?: string;
    notes?: string;
}
```

---

## 3. UI & Experience Workflows

### 3.1 Lender Type Selector (Institutional vs. Person)

At the top of `AddLoanModal`:

- 2-Segment Control: **Bank / Financial Institution** vs. **Person / Personal Loan**.
- When **Bank / Financial Institution** is selected:
    - Standard Institution Picker (BDO, BPI, GCash, Maya, Shopee, SSS, Pag-IBIG, etc.).
- When **Person / Personal Loan** is selected:
    - Text input: `Lender Name *` (e.g., "Tito Boy", "Mom", "Colleague - Sarah").
    - Auto-defaults `interestRate` to `0%` (editable if informal interest applies).
    - Lender avatar displays a friendly user/contact icon with warm slate/pistachio styling instead of a bank logo.

### 3.2 Dual Amount & Fee Breakdown

- **Principal Amount (Cash Disbursed)**: The core amount borrowed (e.g., ₱5,000).
- **Processing Fee (Optional)**: Upfront deduction (e.g., ₱150 / 3%).
    - Live helper: _"Net cash proceeds received: ₱4,850.00"_.
- **Total Payable Amount (Principal + Interest)**: The full lifetime obligation (e.g., ₱5,760.00).
    - Live helper: _"Total Interest & Financing Charges: ₱760.00"_.

### 3.3 Term & Timeline Experience

- **Start / Origination Date**: Selected via `DatePickerModal`.
- **Loan Term (Months)**: Numeric input with quick preset pills: `3m`, `6m`, `12m`, `24m`, `36m`, `48m`.
- **Maturity Projection**: Auto-displays projected payoff date (`start_date + term_months`).
- **Next Due Date**: Selected via `DatePickerModal`.

### 3.4 Early Payoff Interest Cashback (GLoan Feature)

- Switch/Checkbox in modal: _"Eligible for Early Payoff Interest Cashback"_ (defaults to checked if lender is GCash/GLoan).
- In `LoanPaymentModal` / `LoanDetailSheet`:
    - When paying off remaining balance $\ge 1$ month before maturity:
        - Highlight banner: _"Early Settlement: You may be eligible for interest cashback from your lender."_
        - Allows recording cashback amount which can automatically deposit a refund transaction into the user's GCash or primary wallet.

---

## 4. Non-Destructive Database Migration Plan

1. In `apps/mobile/src/database/db.ts`:
    - Inspect existing `loans` table.
    - Use `PRAGMA table_info(loans);` to detect missing columns:
        - `lender_type`
        - `lender_name`
        - `principal_amount`
        - `processing_fee`
        - `start_date`
        - `term_months`
        - `has_interest_cashback`
        - `interest_cashback_received`
    - Execute non-destructive `ALTER TABLE loans ADD COLUMN ...` statements.
    - Ensure existing rows cleanly default `principal_amount` to `total_amount` and `lender_type` to `'institution'`.
2. Update `databaseBackupService.ts`:
    - Include all new columns in backup JSON export, validation schema, and SQL restore statement.
3. Update `seed.ts`:
    - Ensure `resetDatabase` drops and recreates `loans` with full column set.
