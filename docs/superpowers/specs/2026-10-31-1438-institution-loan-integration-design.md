# Institution Loan Integration Design Specification

**Created:** 2026-10-31 14:38 (Local Time)

## 1. Problem Statement & Motivation

In the mobile application, whenever a user creates a loan (e.g., Maya Personal Loan, GCash Fuse Lending, BDO Credit Line), the loan is associated with an institution record in the `institutions` table. Consequently, this institution (e.g., Maya) appears in the **Accounts Grid** on both the Dashboard (`/(tabs)/index.tsx`) and the Accounts screen (`/(tabs)/accounts.tsx`).

However, when a user taps the institution to view its details:

1. `InstitutionDetailSheet` only displays `account_pockets` (such as Savings or Personal Wallet).
2. Any loans associated with that institution are completely omitted from the view.
3. If an institution only has loans (and zero deposit pockets), the sheet displays "Aggregate Balance: ₱0.00" and "Pockets (0)", making it look empty and disconnected from the loan displayed on the dashboard banner.
4. Users cannot view their total exposure (deposits vs. debt) with a financial institution in one unified place, nor can they jump directly into loan details or repayments from the institution sheet.

## 2. Core Objectives

1. **Include Loan Details in Institution View**:
    - In `InstitutionDetailSheet`, append a dedicated **Loans & Credit Lines** section below the Pockets section.
    - Display all active and completed loans linked to that institution with remaining debt, monthly amortizations, due dates, and status badges.
2. **Comprehensive Header Balances**:
    - When an institution has both pockets (deposits) and loans (debts), show a dual breakdown in the header: Total Assets (Deposits) and Total Outstanding Debt (Loans), providing a complete net overview of the relationship with that institution.
    - If an institution has only loans, display the total outstanding debt cleanly rather than ₱0.00.
3. **Seamless Loan Interaction**:
    - Tapping on a loan in `InstitutionDetailSheet` opens the full `LoanDetailSheet`, allowing the user to view payment history, inspect contract attachments, or record a repayment immediately.
    - Support adding a new loan directly under the current institution with pre-selected provider via the header `+ Loan` button.
4. **Integration Across Dashboard & Accounts Screen**:
    - Wire `loans` querying and modal management on both `app/(tabs)/index.tsx` (Dashboard) and `app/(tabs)/accounts.tsx` (Accounts Screen).

---

## 3. Architecture & Data Flow

```
                      +-----------------------------+
                      |   InstitutionDetailSheet    |
                      +-----------------------------+
                                     |
              +----------------------+----------------------+
              |                                             |
              v                                             v
     +-----------------+                           +-----------------+
     | Pockets Section |                           |  Loans Section  |
     | (Assets/Wallets)|                           | (Debt/Amortize) |
     +-----------------+                           +-----------------+
              |                                             |
              v                                             v
       [ PocketCard ]                                 [ LoanCard ]
       - Quick Expense                                - Remaining Debt
       - Edit Pocket                                  - Due countdown
                                                      - Tap -> LoanDetailSheet
```

### 3.1. Database Service Layer (`apps/mobile/src/services/loanService.ts`)

Add `getLoansByInstitution`:

```typescript
export async function getLoansByInstitution(db: SQLite.SQLiteDatabase, institutionId: string): Promise<LoanRecord[]> {
    return await db.getAllAsync<LoanRecord>(
        `SELECT
            l.*,
            i.name AS institution_name,
            i.code AS institution_code,
            i.color AS institution_color
        FROM loans l
        JOIN institutions i ON l.institution_id = i.id
        WHERE l.institution_id = ?
        ORDER BY l.status ASC, l.due_date ASC`,
        [institutionId]
    );
}
```

### 3.2. Institution Detail Sheet (`apps/mobile/src/components/accounts/InstitutionDetailSheet.tsx`)

Props Extension:

```typescript
interface InstitutionDetailSheetProps {
    visible: boolean;
    institution: Institution | null;
    pockets: AccountPocket[];
    loans?: LoanRecord[];
    onClose: () => void;
    onAddPocket: () => void;
    onAddLoan?: () => void;
    onSelectLoan?: (loan: LoanRecord) => void;
    onQuickExpense?: (pocket: AccountPocket) => void;
    onUpdateNotes?: (institutionId: string, notes: string) => Promise<void>;
    onEditPocket?: (pocket: AccountPocket) => void;
}
```

UI Layout in `InstitutionDetailSheet`:

1. **Header Overview**:
    - Total Deposits (Sum of pockets `current_balance`).
    - Total Active Debt (Sum of active loans `remaining_balance`).
    - If both exist, display side-by-side or stacked summary with clear "Assets" vs "Debt" styling.
2. **Pockets Section**:
    - Render `Pockets ({pockets.length})`.
    - If 0 pockets, display subtle text: "No deposit pockets created yet."
3. **Loans & Credit Lines Section**:
    - Render `Loans & Credit Lines ({loans.length})`.
    - Render each loan using `LoanCard` with `onPress={() => onSelectLoan(loan)}`.
    - If 0 loans, optionally show a subtle callout: "No loans linked to this provider."

### 3.3. Dashboard Wiring (`app/(tabs)/index.tsx`)

- Maintain `selectedInstLoans: LoanRecord[]` state.
- When `handleSelectInstitution(inst)` is triggered, fetch `getPocketsByInstitution` and `getLoansByInstitution` concurrently.
- Wire `LoanDetailSheet`, `LoanPaymentModal`, and `EditLoanModal` so opening a loan from the institution sheet works seamlessly on the Dashboard.

### 3.4. Accounts Screen Wiring (`app/(tabs)/accounts.tsx`)

- Pass `loans={loans.filter((l) => l.institution_id === selectedInstitution?.id)}` to `InstitutionDetailSheet`.
- Wire `onSelectLoan={(loan) => { setDetailSheetVisible(false); setSelectedLoan(loan); setLoanDetailVisible(true); }}`.
- Wire `onAddLoan={() => { setDetailSheetVisible(false); setAddLoanInitialProvider(selectedInstitution?.code); setAddLoanVisible(true); }}`.

---

## 4. Double-Entry & Safety Constraints

- Loan balances are strictly updated through `recordLoanPayment` which generates immutable double-entry ledger expense transactions.
- Viewing or editing metadata never alters `total_amount` or `remaining_balance`.
- In-flight operations retain safety disabled states.

## 5. Verification Strategy

1. Unit tests in `loan_service.test.ts` for `getLoansByInstitution`.
2. TypeScript typecheck verification across `@finance-tracker/mobile`.
3. Jest test suite verification (`npm run test --workspace=@finance-tracker/mobile`).
4. End-to-end component prop verification on both Dashboard and Accounts screens.
