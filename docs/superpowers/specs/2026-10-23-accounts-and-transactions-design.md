# Philippine Bank & E-Wallet Accounts with Nested Pockets & Transaction CRUD Design

## Intent & Why
Personal finance in the Philippines commonly involves multiple financial institutions—such as Maya, GoTyme, SeaBank, GCash, BPI, BDO, UnionBank, and physical cash. Users frequently hold both an everyday spending "Wallet" balance and an interest-earning "Savings" pocket (e.g. 4.0%–4.5% p.a. digital bank savings) within the same institution.

Presenting separate cards for every single account/pocket clutters the UI. This system groups balances by **Institution** (Bank or E-Wallet) into clean, recognizable cards. Tapping an institution card reveals its individual **Pockets** (Wallet vs. Savings with interest details). A transactional engine logs income, expenses, and inter-pocket transfers in local SQLite, ensuring balances always balance.

---

## Goals, Non-Goals, and Anti-Goals

### Goals
1. **Consolidated Institution Cards**: The main accounts view displays cards grouped by institution (e.g., *Maya: ₱52,000*), preventing screen clutter.
2. **Pockets / Sub-Accounts**: Each institution holds 1 or more pockets:
   - **Wallet Pocket**: Everyday spending, checking, e-wallet credits (0% interest).
   - **Savings Pocket**: Interest-bearing savings with annual interest rate (`interest_rate`, e.g. `4.5%`) and notes (`savings_details`, e.g. "Credited daily", "Emergency fund").
3. **Dynamic Philippine Catalog**: A comprehensive registry of Philippine banks and e-wallets (BPI, BDO, UnionBank, Metrobank, RCBC, Maya, GoTyme, SeaBank, GCash, GrabPay, ShopeePay, Physical Cash) with brand colors and logos/icons. No single provider is hardcoded as a static variable or special default.
4. **Transaction CRUD**: Full logging for:
   - **Expense**: Subtracts money from a designated pocket.
   - **Income**: Adds money to a designated pocket.
   - **Transfer**: Moves money from Pocket A to Pocket B (within the same institution or across institutions).
5. **Dev Seed & Production Reset**:
   - In `__DEV__`, seed realistic mock institutions, pockets, and transactions for immediate visual verification.
   - Provide a prominent "Reset to Zero" / "Wipe All Data" action to clear mock data so the user can enter their own real base money.
   - In production builds, the app starts with a clean empty database.

### Non-Goals
- Automated bank scraping or Open Banking API credential integrations (all tracking is private, manual, and offline-first).
- Multi-currency forex live rate conversion (base currency is PHP `₱` for this phase).

### Anti-Goals
- Hardcoding GCash as the default institution or singleton variable.
- Forcing a flat account list that creates 15+ disconnected cards on the home screen.

---

## Constraints
- **Offline-First Storage**: Powered entirely by `expo-sqlite` on the mobile device.
- **Color Contrast**: Follows the Pistachio (`#BBD583`) and Deep Forest Pine (`#18342B`) design system, meeting WCAG AA/AAA.
- **Double-Entry Balance Recalculation**: Account balances are derived from base starting balance plus transaction sums, or managed atomically inside SQLite transactions.

---

## Approaches Considered

### Approach 1: Flat Accounts with Tags
Every pocket is an independent top-level account card.
- *Pros:* Simple database structure.
- *Cons:* Visual clutter: users with 3 banks and 2 e-wallets, each with checking, savings, and stash pockets, end up with 10–15 cards on the screen.

### Approach 2: Parent Institution Cards with Drill-Down Pockets (Chosen by User)
Institutions are the top-level cards (e.g. *Maya*, *BPI*, *GoTyme*, *Cash*). Each card displays its total aggregate balance and pocket count. Tapping the card opens a detail view displaying the breakdown:
- *Wallet Pocket* (₱2,000)
- *Personal Savings Pocket* (₱50,000 @ 4.5% p.a.)
- *Pros:* Cleanest UI, realistic mental model of Philippine banking apps, expandable.
- *Trade-off:* Requires a two-tier relational model (`institutions` -> `pockets`), which is well-supported by SQLite foreign keys.

---

## Data Model (SQLite Schema)

```sql
-- 1. Financial Institutions (Banks, E-Wallets, Cash)
CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,               -- e.g. 'inst_maya', 'inst_bpi', 'inst_cash'
  name TEXT NOT NULL,                -- 'Maya', 'BPI', 'Cash Wallet'
  type TEXT NOT NULL CHECK(type IN ('bank', 'ewallet', 'cash', 'other')),
  code TEXT NOT NULL,                -- 'maya', 'bpi', 'gotyme', 'seabank', 'gcash', 'bdo', 'cash'
  color TEXT NOT NULL,               -- Brand hex color, e.g. '#2ECC71', '#B91C1C'
  icon TEXT NOT NULL,                -- Icon identifier
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Account Pockets (Wallets vs Savings)
CREATE TABLE IF NOT EXISTS account_pockets (
  id TEXT PRIMARY KEY,               -- e.g. 'pock_123'
  institution_id TEXT NOT NULL,
  name TEXT NOT NULL,                -- 'Main Wallet', 'Emergency Savings'
  pocket_type TEXT NOT NULL CHECK(pocket_type IN ('wallet', 'savings')),
  currency TEXT NOT NULL DEFAULT 'PHP',
  starting_balance REAL NOT NULL DEFAULT 0.0,
  current_balance REAL NOT NULL DEFAULT 0.0,
  interest_rate REAL DEFAULT NULL,   -- e.g. 4.5 for 4.5% p.a. (only if pocket_type = 'savings')
  savings_details TEXT DEFAULT '',   -- e.g. 'Credited daily', 'Goal: Emergency Fund'
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
);

-- 3. Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,               -- e.g. 'Whole Foods Market', 'Salary Deposit'
  pocket_id TEXT NOT NULL,           -- Source pocket (for expense, transfer, or income destination)
  to_pocket_id TEXT DEFAULT NULL,    -- Destination pocket (for transfer)
  type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,                -- ISO 8601 string
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (pocket_id) REFERENCES account_pockets(id) ON DELETE RESTRICT,
  FOREIGN KEY (to_pocket_id) REFERENCES account_pockets(id) ON DELETE RESTRICT
);
```

---

## Philippine Institution Catalog (`src/constants/institutions.ts`)
A typed catalog of popular Philippine providers:
- **E-Wallets & Digital Banks**:
  - `maya`: Maya (Color: `#00D665`, Digital Bank / E-Wallet)
  - `gotyme`: GoTyme Bank (Color: `#00B4D8`, Digital Bank)
  - `seabank`: SeaBank (Color: `#FF5722`, Digital Bank)
  - `gcash`: GCash (Color: `#007DFE`, E-Wallet)
  - `grabpay`: GrabPay (Color: `#00B14F`, E-Wallet)
  - `shopeepay`: ShopeePay (Color: `#EE4D2D`, E-Wallet)
  - `cimb`: CIMB Bank (Color: `#ED1C24`, Digital Bank)
  - `tonik`: Tonik (Color: `#6F2DBD`, Digital Bank)
- **Universal / Commercial Banks**:
  - `bpi`: Bank of the Philippine Islands (Color: `#B11116`, Bank)
  - `bdo`: BDO Unibank (Color: `#002B7F`, Bank)
  - `unionbank`: UnionBank of the Philippines (Color: `#F58220`, Bank)
  - `metrobank`: Metrobank (Color: `#003882`, Bank)
  - `rcbc`: RCBC (Color: `#0066B2`, Bank)
  - `security_bank`: Security Bank (Color: `#005596`, Bank)
- **Cash & Custom**:
  - `cash`: Physical Cash / Personal Wallet (Color: `#10B981`)
  - `custom`: Other / Custom Bank (Color: `#5C6E63`)

## Business Logic & Technical Rules (Builder Calls)

1. **Transaction Title**: `title TEXT NOT NULL` is explicitly included in the `transactions` schema and form, matching `TransactionItem.tsx`.
2. **Atomic Balance Updates & Reversal**:
   - Creating an expense decreases pocket balance; creating income increases pocket balance; transfer moves from source to destination.
   - Deleting or editing a transaction atomically reverses the previous amount before applying the new values inside a single SQLite transaction (`db.withTransactionAsync`).
3. **Archiving Invariant**:
   - A pocket cannot be archived if its balance is greater than ₱0.00 (users must transfer funds out first). Archived pockets are excluded from active picker dropdowns and the main carousel.
4. **CRUD Scope**:
   - Includes Add Transaction modal, Edit/Delete Transaction action with automatic balance adjustment, Dashboard recent list integration, and the full Ledger tab (`(tabs)/two.tsx`).

---

## UI Components & User Flow

1. **Dashboard Accounts Carousel / Grid**:
   - Shows summary cards for each active institution with logo, brand color bar, total balance (sum of all pockets), and pocket count badge (e.g. *"2 pockets"*).
   - Tap opens the **Institution Detail Sheet**.
2. **Institution Detail Modal / Sheet**:
   - Lists the pockets belonging to this institution:
     - **Wallet Pocket Card**: Balance, quick "Add Expense" button.
     - **Savings Pocket Card**: Balance, Interest Badge (`4.5% p.a.`), and savings details note.
   - Button to `+ Add Pocket` (e.g., add a second savings goal or stash).
3. **Add / Edit Pocket Modal**:
   - Select pocket type (`Wallet / Everyday` vs `Savings / Interest`).
   - If Savings selected: reveals `Interest Rate (%)` field and `Savings Details / Notes` input.
   - Input initial base money (`Starting Balance`).
4. **Add Transaction Modal (CRUD)**:
   - Type selector: `Expense` | `Income` | `Transfer`.
   - Amount keypad/input with currency symbol.
   - Category picker (Food, Groceries, Salary, Utilities, etc.).
   - Source Pocket picker (organized by Institution > Pocket).
   - If Transfer: Destination Pocket picker.
5. **Database Reset Feature**:
   - Located in Settings or quick action on Dashboard:
   - Wipes all tables, leaving 0 institutions, 0 pockets, and 0 transactions.
   - Prompts confirmation dialog before resetting.

