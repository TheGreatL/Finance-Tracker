# Design Specification: Metadata Editing Across All Features

**Created:** 2026-10-31 13:52 (Local Time)

## 1. Overview & Philosophy

A core rule of financial integrity is the **immutability of money movement**:

- **Balance Ledger Immutability:** Balances, transferred amounts, transaction types, and payment histories must never be directly manipulated or overwritten. Money movement occurs exclusively through logged double-entry / single-ledger transactions (`income`, `expense`, `transfer`, `loan_payment`).
- **Descriptive Metadata Flexibility:** Users frequently need to correct typos, refine categorization, update notes, adjust due dates, or rename pockets. All non-financial metadata must be easily editable across every screen and feature.

---

## 2. Entity Specifications

### 2.1 Transactions

- **Editable Metadata:**
    - `title`: String (e.g. "Grocery Shopping at SM")
    - `category`: String (e.g. "Food & Dining", "Utilities", "Transportation")
    - `date`: String (YYYY-MM-DD)
    - `notes`: Optional text
- **Locked Attributes (Financial Integrity):**
    - `amount`: Strictly immutable (to alter amount, delete and re-enter or create adjusting transaction)
    - `type`: `income` | `expense` | `transfer` (immutable)
    - `pocket_id` / `to_pocket_id`: Immutable source and destination
- **UI Integration:**
    - Add an **Edit Details** button in [`TransactionDetailSheet.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/transactions/TransactionDetailSheet.tsx).
    - Open a dedicated [`EditTransactionModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/transactions/EditTransactionModal.tsx) pre-populated with current values.
- **Service Layer:**
    - [`updateTransactionMetadata`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/transactionService.ts) in `transactionService.ts`.

---

### 2.2 Loans

- **Editable Metadata:**
    - `title`: String (e.g., "BPI Personal Loan", "Car Loan")
    - `institution_id` / `institution_name`: Provider details
    - `due_date`: String (e.g., "15th of the month" or specific date)
    - `notes`: Optional notes
    - `attachment_path` & `attachment_name`: Contract / receipt documents
- **Locked Attributes:**
    - `total_amount`: Original borrowed principal
    - `remaining_balance`: Updated strictly via `recordLoanPayment`
    - `status`: Automatically calculated based on remaining balance
- **UI Integration:**
    - Add an **Edit Details** button in [`LoanDetailSheet.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/LoanDetailSheet.tsx).
    - Open a dedicated [`EditLoanModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/loans/EditLoanModal.tsx).
- **Service Layer:**
    - [`updateLoanMetadata`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/loanService.ts) in `loanService.ts`.

---

### 2.3 Accounts & Pockets

- **Editable Metadata:**
    - Pocket `name`: String (e.g., rename "Wallet" to "Daily Spending", or "Savings" to "Emergency Fund")
    - Pocket `interest_rate`: Optional number for savings pockets
    - Pocket `savings_details`: Optional notes
    - Institution `notes`: Already supported via inline pencil edit
- **Locked Attributes:**
    - `current_balance`: Updated strictly through transactions and transfers
- **UI Integration:**
    - Add an edit trigger / pencil icon on [`PocketCard.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/PocketCard.tsx) and inside [`InstitutionDetailSheet.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/InstitutionDetailSheet.tsx).
    - Open a dedicated [`EditPocketModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/EditPocketModal.tsx).
- **Service Layer:**
    - [`updatePocketMetadata`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/accountService.ts) in `accountService.ts`.

---

### 2.4 Subscriptions

- **Editable Metadata:**
    - `service_name`: String
    - `amount`: Recurring plan cost
    - `frequency`: `weekly` | `monthly` | `yearly`
    - `next_billing_date`: YYYY-MM-DD
    - `category`: String
    - `reminder_days_before`: Number
    - `notes`: Optional text
- **UI Integration:**
    - Already integrated via `onEdit` in [`SubscriptionDetailSheet.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/subscriptions/SubscriptionDetailSheet.tsx) opening [`AddSubscriptionModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/subscriptions/AddSubscriptionModal.tsx) in edit mode.

---

## 3. Database Schema Consistency

All update operations will update the `updated_at` timestamp:

```sql
UPDATE transactions SET title = ?, category = ?, date = ?, notes = ?, updated_at = ? WHERE id = ?
UPDATE loans SET title = ?, institution_id = ?, due_date = ?, notes = ?, attachment_path = ?, attachment_name = ?, updated_at = ? WHERE id = ?
UPDATE account_pockets SET name = ?, interest_rate = ?, savings_details = ?, updated_at = ? WHERE id = ?
```

---

## 4. Verification Plan

1. **Unit Tests**:
    - `tests/transaction_service.test.ts`: test `updateTransactionMetadata`.
    - `tests/loan_service.test.ts`: test `updateLoanMetadata`.
    - `tests/account_service.test.ts`: test `updatePocketMetadata`.
2. **UI & Navigation Verification**:
    - Open detail sheet -> click Edit Details -> modal appears with current values -> save -> sheet and lists refresh immediately with updated values.
3. **Typecheck & Linter**:
    - Monorepo `npm run typecheck`, `npm run lint`, and `npm run test` must pass with 0 errors.
