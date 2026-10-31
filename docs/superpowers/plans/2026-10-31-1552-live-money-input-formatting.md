# Live Money Input Real-Time Formatting Implementation Plan

**Created:** 2026-10-31 15:52 (Local Time)  
**Spec Reference:** [`docs/superpowers/specs/2026-10-31-1552-live-money-input-formatting-design.md`](file:///c:/Users/user/Desktop/projects/finance-tracker/docs/superpowers/specs/2026-10-31-1552-live-money-input-formatting-design.md)  
**Status:** In Progress

---

## 1. Goal & Scope

Implement live comma thousands formatting and decimal formatting for numeric money inputs across all 7 financial modal components in `@finance-tracker/mobile`, accompanied by unit tests, type safety, and verification.

---

## 2. Step-by-Step Execution Plan

### Step 1: Implement Formatter & Parser Functions with TDD

- File: [`apps/mobile/src/utils/formatters.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/utils/formatters.ts)
- Test File: [`apps/mobile/tests/formatters.test.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/tests/formatters.test.ts)
- Add comprehensive unit test cases covering:
    - Thousands separation (`1000` $\rightarrow$ `1,000`, `1234567` $\rightarrow$ `1,234,567`)
    - Intermediate typing (`.` $\rightarrow$ `0.`, `1234.` $\rightarrow$ `1,234.`, `1234.5` $\rightarrow$ `1,234.5`)
    - Decimal precision limiting (`1234.567` $\rightarrow$ `1,234.56`)
    - Leading zeros normalization (`050` $\rightarrow$ `50`, `0` $\rightarrow$ `0`)
    - Deletion to empty string (`""` $\rightarrow$ `""`)
    - Parsing formatted strings back to float (`parseMoneyInput("1,234.50")` $\rightarrow$ `1234.5`)
- Run vitest to verify tests pass.

### Step 2: Wire Formatter into Account Modals

- Files:
    - [`AddAccountModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/AddAccountModal.tsx)
    - [`AddPocketModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/AddPocketModal.tsx)
- Connect `formatMoneyInput` to `startingBalanceStr` `onChangeText`.
- Set `keyboardType="decimal-pad"`.
- Use `parseMoneyInput(startingBalanceStr)` in submit handlers.

### Step 3: Wire Formatter into Loan Modals

- Files:
    - [`AddLoanModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/AddLoanModal.tsx)
    - [`EditLoanModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/EditLoanModal.tsx)
    - [`LoanPaymentModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/LoanPaymentModal.tsx)
- Connect `formatMoneyInput` to:
    - `totalAmountStr`, `remainingBalanceStr`, `monthlyPaymentStr` in `AddLoanModal`.
    - `monthlyPaymentStr` in `EditLoanModal` (both `onChangeText` and `useEffect` initial load).
    - `amountStr` in `LoanPaymentModal` (both `onChangeText` and `useEffect` initial load).
- Set `keyboardType="decimal-pad"` on all money inputs.
- Use `parseMoneyInput` in submission handlers.

### Step 4: Wire Formatter into Subscription & Transaction Modals

- Files:
    - [`AddSubscriptionModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/subscriptions/AddSubscriptionModal.tsx)
    - [`TransactionFormModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/transactions/TransactionFormModal.tsx)
- Connect `formatMoneyInput` to:
    - `amountStr` in `AddSubscriptionModal` (both `onChangeText` and `useEffect` editing load).
    - `amountStr` in `TransactionFormModal`.
- Set `keyboardType="decimal-pad"`.
- Use `parseMoneyInput` in submit handlers.

### Step 5: Verification & Quality Assurance

- Run `npm run typecheck` across the monorepo.
- Run `npm run test --workspace=@finance-tracker/mobile`.
- Verify all unit tests pass with zero regressions.
