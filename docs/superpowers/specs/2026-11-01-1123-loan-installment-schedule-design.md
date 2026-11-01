# Loan Installment Schedule & Waterfall Amortization Design

**Created:** 2026-11-01 11:23 (Local Time)

## 1. Overview & Context

Users tracking loans (like GCash GLoan, bank loans, or amortized credit facilities) need visibility into how payments map to scheduled monthly installments. When advance or partial payments are made (e.g. paying ₱8,284.67 on a ₱2,284.67/mo loan), generic calendar elapsed counters (such as "Month 2 of 12") create confusion because cash payments settle upcoming months in advance (e.g. Months 1, 2, 3 fully paid, and Month 4 partially paid with ₱854.01 remaining due).

This design introduces a **Gold-Standard Amortization Installment Waterfall Schedule** inside `LoanDetailSheet.tsx` and upgrades `LoanPaymentModal.tsx` to support dynamic residual payment pre-filling.

## 2. Key Architecture & Data Flow

### 2.1 Installment Model (`InstallmentItem`)

```typescript
export type InstallmentStatus = 'paid' | 'partially_paid' | 'upcoming';

export interface InstallmentItem {
    index: number; // 1-based (e.g. 1 of 12)
    dueDate: string; // YYYY-MM-DD
    scheduledAmount: number; // Full monthly amortization
    amountPaid: number; // Amount allocated to this installment
    remainingDue: number; // scheduledAmount - amountPaid
    status: InstallmentStatus;
    isSettledEarly: boolean; // True if status === 'paid' and reference date < dueDate
    advanceCredit?: number; // For partially paid: scheduledAmount - remainingDue
}

export interface LoanInstallmentSchedule {
    totalTermMonths: number;
    installments: InstallmentItem[];
    activeInstallment: InstallmentItem | null; // Earliest non-'paid' installment
    settledCount: number;
    upcomingCount: number;
    totalPaid: number;
    remainingDebt: number;
}
```

### 2.2 Waterfall Allocation Algorithm

1. Total paid cash $C = \max(0, \text{total\_amount} - \text{remaining\_balance})$.
2. If loan has valid `start_date` and `term_months > 0` and `monthly_payment > 0`:
    - Iterate $i = 1 \dots \text{term\_months}$.
    - Compute due date for installment $i$: start date plus $i$ months (preserving the day of month).
    - If $C \ge \text{monthly\_payment}$:
        - Installment $i$ gets $\text{amountPaid} = \text{monthly\_payment}$, $\text{status} = \text{'paid'}$.
        - $C \gets C - \text{monthly\_payment}$.
        - $\text{isSettledEarly} = (\text{today} < \text{dueDate})$.
    - Else if $C > 0$:
        - Installment $i$ gets $\text{amountPaid} = C$, $\text{remainingDue} = \text{monthly\_payment} - C$, $\text{status} = \text{'partially\_paid'}$.
        - $C \gets 0$.
    - Else:
        - Installment $i$ gets $\text{amountPaid} = 0$, $\text{remainingDue} = \text{monthly\_payment}$, $\text{status} = \text{'upcoming'}$.
3. For irregular personal loans without `term_months`, the schedule safely yields an empty list and the UI falls back to the existing payment ledger.

## 3. UI/UX Specifications

### 3.1 Amortization Timeline Card in `LoanDetailSheet`

- **Header & Summary**:
    - Title: `Payment Schedule`
    - Subtitle or chip: `X of Y Settled • Next Due: Jan 12, 2027 (₱854.01)`
    - "Hide Settled" / "Show All" toggle button with an Eye icon (`Eye` / `EyeOff` from `lucide-react-native`).
    - Auto-collapses settled installments by default when $\ge 3$ installments are settled, presenting a compact summary banner:
      `3 Installments Settled (₱6,854.01) • Tap to view history`.
- **Timeline Stepper Nodes**:
    - Vertical connecting lines:
        - Solid emerald line between settled nodes.
        - Dashed amber line into the active/partially-paid node.
        - Light gray dotted line between upcoming nodes.
    - Circular Node Indicators:
        - 🟢 Green solid dot with checkmark or filled circle for `PAID`.
        - 🟡 Amber dot with inner ring for `PARTIALLY PAID`.
        - ⚪ Light stone outline circle for `UPCOMING`.
    - Item Row Layout:
        - Left: Due date (e.g. `Jan 12, 2027`) and index (`4 of 12`).
        - Right: Balance due / paid amount with status pill badge:
            - `PAID` in green badge (`bg-emerald-50 text-emerald-800 border-emerald-200`).
            - `PARTIALLY PAID` in amber badge (`bg-amber-50 text-amber-800 border-amber-200`).
            - Upcoming shows standard amount (`₱2,284.67`) in neutral text.
    - Interactive Details:
        - Tapping a partially paid installment reveals mathematical transparency:
          `Scheduled: ₱2,284.67 • Advance Credit: -₱1,430.66 • Remaining Due: ₱854.01`.
        - Tapping the active installment opens payment recording with that exact residual pre-filled.

### 3.2 Dynamic Pre-fill in Payment Flow

- Primary button in `LoanDetailSheet`:
    - If `activeInstallment` is partially paid with residual $R$:
      `Record Loan Payment (₱854.01 Due)`
    - Pre-fills `LoanPaymentModal` with `amount = R`.
    - Otherwise pre-fills with standard `monthly_payment` (or `remaining_balance` if less).

## 4. Verification & Testing

- Unit tests in `salary_service.test.ts` or `loan_service.test.ts`:
    - Test ₱20,000 loan with 12 months at ₱2,284.67/month and ₱8,284.67 paid.
    - Verify Months 1, 2, 3 are `paid` with `isSettledEarly` correctly determined.
    - Verify Month 4 is `partially_paid` with `remainingDue = 854.01`.
    - Verify Months 5–12 are `upcoming` with `remainingDue = 2,284.67`.
    - Test edge cases: ₱0 paid, fully paid (100%), overpaid/exact match.
