# Loans & Lending Tracking Design Specification

**Created:** 2026-10-24 08:32 (Local Time)

## 1. Intent & Context
In Philippine personal finance, users frequently manage short-term and long-term credit across:
1. **Dedicated Lending & BNPL Apps:** BillEase, Tala, Home Credit, Cashalo, JuanHand.
2. **Built-in Credit Lines inside Banks & E-Wallets:** GCash GLoan/GGives, Maya Credit/Personal Loan, CIMB Personal Loan, BDO/BPI Personal & Salary Loans, Shopee SPayLater / SLoan.

Unlike everyday bank deposits or wallet balances (which represent positive assets), loans represent **liabilities with repayment schedules, interest rates, contract attachments, and recurring deadlines**. 

Users need to:
- Track two independent, high-level metrics without an abstract net worth formula:
  1. **Total Money (Assets):** Sum of all bank accounts, e-wallets, and cash.
  2. **Total Loans (Debt):** Sum of all active loan balances.
- Store loan contracts/promissory notes/receipts **without saving binary BLOBs inside SQLite** (storing files in app storage and saving only the file URI path string in the database).
- Receive **local push notifications 3 days before payment due dates** to avoid late fees.
- Record loan payments that deduct funds from a chosen bank/e-wallet pocket and reduce the remaining loan debt.

---

## 2. Goals & Non-Goals

### Goals
- **Dual Metric Tracking:** Independent tracking of Total Money (Cash/Bank) and Total Loans (Active Debt).
- **Blob-Free Attachments:** Copy image/document files to `FileSystem.documentDirectory + 'attachments/'` and store only the file path string in SQLite.
- **Offline 3-Day Reminders:** Schedule local notifications via `expo-notifications` 3 days prior to loan due dates at 9:00 AM local time.
- **Dedicated Lending Entities:** Support loans from both specialized lending apps (Tala, Home Credit, BillEase) and existing banks/e-wallets (GCash, Maya, BDO).
- **Payment Deductions:** Recording a loan payment automatically reduces the chosen bank pocket's balance and reduces the loan's remaining balance.
- **Dashboard & Accounts Integration:** Show an Active Loans summary banner on the Dashboard and a dedicated "Loans" view in the Accounts tab.

### Non-Goals
- Cloud backup of attachments to AWS S3 / Firebase Storage (all files reside locally on device).
- Automated bank scraping or SMS parsing (manual logging and receipt scanning).
- Calculating complex multi-variable compound amortization tables (straightforward principal, interest rate, and monthly amortization tracking).

---

## 3. Approaches Considered & Selected

### Approach A: Dedicated `loans` System & Summary Integration *(Selected)*
- Add a dedicated `loans` table in SQLite linked to `institutions`.
- Dedicated `loanService.ts` for loans CRUD, payment deduction, and attachment management.
- Local notifications scheduled via `expo-notifications`.
- Files stored on the device filesystem with path strings in SQLite.
- **Why Selected:** Clean separation between assets and liabilities; no bloating of the SQLite database; allows specialized loan fields (due dates, amortizations, contracts) without polluting everyday transaction/pocket models.

### Approach B: Sub-Type of Account Pockets (`pocket_type = 'loan'`) *(Discarded)*
- Treat loans as negative pockets under institutions.
- **Why Discarded:** Conflates everyday cash balances with fixed installment contracts; breaks standard pocket balance aggregation and complicates due date reminders and file attachments.

---

## 4. Architectural & Implementation Details

### 4.1 Database Layer & Schema Migration

Add a new `loans` table to SQLite (`schema.ts`):
```sql
CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  title TEXT NOT NULL,
  total_amount REAL NOT NULL,
  remaining_balance REAL NOT NULL,
  monthly_payment REAL NOT NULL,
  due_date TEXT NOT NULL,
  interest_rate REAL DEFAULT NULL,
  attachment_path TEXT DEFAULT '',
  attachment_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paid', 'defaulted')),
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_loans_institution ON loans(institution_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
```

In `db.ts`, execute `CREATE TABLE IF NOT EXISTS loans ...` inside `SCHEMA_SQL` so the table is automatically initialized.

### 4.2 Lending App Providers in `institutions.ts`
Expand Philippine institutions with popular lending apps:
- `tala`: Tala Lending (color: `#008272`, type: `'other'`)
- `homecredit`: Home Credit (color: `#E60000`, type: `'other'`)
- `cashalo`: Cashalo (color: `#FFB800`, type: `'other'`)
- `billease`: (ensure tagged appropriately)
- Existing institutions (`gcash`, `maya`, `bdo`, `bpi`, `cimb`, `unionbank`) can also be chosen as loan providers (e.g. GLoan, Maya Credit, BDO Salary Loan).

### 4.3 Blob-Free Attachment Storage
1. Dependencies: `expo-image-picker`, `expo-document-picker`, `expo-file-system`.
2. Storage Helper `src/utils/fileStorage.ts`:
   - Ensures directory `${FileSystem.documentDirectory}attachments/` exists.
   - Generates unique filename: `loan_${Date.now()}_${cleanName}`.
   - Copies file from picked URI to `${FileSystem.documentDirectory}attachments/${filename}`.
   - Returns the persistent local URI.
   - Deleting a loan removes the associated local file from disk.

### 4.4 Push Notifications (3-Day Due Date Reminder)
1. Dependency: `expo-notifications`.
2. Notification Helper `src/services/notificationService.ts`:
   - Requests user notification permissions.
   - Calculates trigger date: 3 days before `due_date` at 9:00 AM:
     ```ts
     const trigger = new Date(dueDate);
     trigger.setDate(trigger.getDate() - 3);
     trigger.setHours(9, 0, 0, 0);
     ```
   - If `trigger > now`, schedules local notification:
     - Title: `Loan Payment Reminder: ${title}`
     - Body: `₱${formatCurrency(monthlyPayment)} is due in 3 days (${dueDate}) on ${institutionName}.`
   - Returns scheduled notification ID to store or cancel if paid.

### 4.5 Loan Service (`src/services/loanService.ts`)
- `createLoan(db, input: CreateLoanInput): Promise<LoanRecord>`
- `getActiveLoans(db): Promise<LoanRecord[]>`
- `getLoansSummary(db): Promise<{ totalLoanBalance: number; nextDueLoan: LoanRecord | null; dueSoonCount: number }>`
- `recordLoanPayment(db, input: { loanId: string; pocketId: string; amount: number; date: string; notes?: string }): Promise<void>`
  - Executes in a single database transaction:
    1. Deducts `amount` from `account_pockets.current_balance`.
    2. Deducts `amount` from `loans.remaining_balance` (marks `status = 'paid'` if $\le 0$).
    3. Inserts transaction into `transactions` table with category `'Loan Payment'`.
- `deleteLoan(db, loanId: string): Promise<void>`

### 4.6 UI Components & User Flow

#### 1. Dashboard Active Loans Banner (`BalanceHeroCard` / Dashboard Banner)
- Clean banner rendered below the Hero Card:
  - **Total Active Debt:** `₱YY,YYY`
  - **Upcoming Payment:** Next due date countdown (e.g. *"Due in 3 days • ₱2,500"*).
  - Tapping navigates to Accounts tab with Loans filter active.

#### 2. Accounts Tab (`(tabs)/accounts.tsx`)
- Add filter chip: `Loans & Lending`.
- When selected, shows 2-column grid of active loans:
  - Lender icon & Brand accent.
  - Loan title & Note subtitle.
  - Remaining balance & Amortization amount.
  - Due date countdown badge (`"Due Oct 27"`).
- "+ Add Loan" button opens `AddLoanModal`.

#### 3. `AddLoanModal.tsx`
- Input fields:
  - Loan Title (e.g. *"GLoan - Side Business"*, *"BillEase Laptop"*)
  - Lender Provider (picker: GCash, Maya, BillEase, Tala, Home Credit, Banks)
  - Total Borrowed / Principal (₱)
  - Remaining Balance (₱)
  - Monthly Due Amount (₱)
  - Next Due Date (Date picker / ISO selector)
  - Interest Rate (% p.a., optional)
  - File / Photo Attachment picker (Camera / Document Picker) with preview thumbnail
  - Notes / Details

#### 4. `LoanDetailSheet.tsx`
- Complete loan overview:
  - Repayment progress bar (`(Total - Remaining) / Total * 100%`)
  - Monthly installment amount & Due date badge
  - Document attachment thumbnail (tap to view full-screen image)
  - Action button: **"Record Payment"** (opens payment modal pre-selected to this loan)
  - Delete / Close actions

---

## 5. Verification & Testing Strategy
1. **Unit Tests (Vitest):**
   - Test `createLoan` with attachments and notifications scheduled.
   - Test `recordLoanPayment` balance deductions (pocket balance decreases, loan debt decreases, status becomes `'paid'` on zero balance).
   - Test `getLoansSummary` returns accurate active debt and nearest due date.
2. **Typecheck:** `npx turbo run typecheck` across the monorepo.
3. **Device & Emulator Testing:**
   - Verify picking a photo copies file to app directory and saves path in SQLite.
   - Verify loan payment deduction updates both pocket balance and loan balance.
   - Verify notifications permissions and scheduling.

