# Account Notes & Dedicated Accounts Screen Design Specification

**Created:** 2026-10-24 08:11 (Local Time)

## 1. Intent & Context
In Philippine personal finance, users frequently hold multiple accounts under the same banking or e-wallet institution (e.g., two BDO accounts: one for corporate payroll and one for joint personal savings; or two GCash accounts: personal vs. side-business). Currently, all accounts under the same bank display the identical institution name, making them indistinguishable on the dashboard.

Furthermore, as users add more accounts, displaying every account on the main Dashboard clutters the vertical space and pushes recent ledger activity far down the viewport.

This specification addresses both needs by:
1. Adding an optional **Note field** to each institution account (e.g., *"Payroll"*, *"Emergency Fund"*, *"Card ending in 4589"*), visible as a card subtitle and editable anytime.
2. Introducing a **dedicated 3-tab navigation** with a full-featured **Accounts Screen** (`(tabs)/accounts.tsx`), while keeping a streamlined 4-account preview on the Dashboard with a *"See All (N) →"* shortcut.

---

## 2. Goals & Non-Goals

### Goals
- **Account Disambiguation:** Provide a user-defined note/label for each institution account to instantly differentiate duplicates.
- **Glanceable Display:** Show the note subtitle directly on [`InstitutionCard`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/InstitutionCard.tsx) in the 2-column grid and on list items.
- **In-Sheet Editing:** Allow users to edit the account note directly from [`InstitutionDetailSheet`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/InstitutionDetailSheet.tsx) without needing to recreate or delete the account.
- **Dedicated Accounts Screen:** Create `apps/mobile/app/(tabs)/accounts.tsx` with search, institution type filters (`All`, `Banks`, `E-Wallets`, `Cash`), aggregate balance stats, and full pocket inspection.
- **3-Tab Navigation:** Integrate `Accounts` into `(tabs)/_layout.tsx` between `Dashboard` and `Ledger` using Lucide's `WalletCards` icon.
- **Dashboard Preview:** Cap the Dashboard's accounts grid to the top 4 accounts and provide a *"See All (N) →"* button that switches to the Accounts tab.
- **Non-Destructive Migration:** Upgrade SQLite schema automatically via `ALTER TABLE institutions ADD COLUMN notes TEXT DEFAULT ''` in [`db.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/database/db.ts) preserving existing user data.

### Non-Goals
- Multi-currency conversions for notes (currency remains PHP).
- Tagging individual transactions with account notes (transactions already link to pockets).

---

## 3. Approaches Considered & Selected

### Approach A: 3-Tab Bottom Navigation with Dedicated Accounts Screen *(Selected)*
- Bottom tab bar becomes `Dashboard` | `Accounts` | `Ledger`.
- Accounts tab provides full list, search by bank name/note, and category filters.
- Dashboard limits grid to top 4 accounts with *"See All (N) →"*.
- **Why Selected:** 1-tap direct access from anywhere in the app, matches top-tier finance app ergonomics (Copilot, Monarch), and completely solves dashboard crowding without deep navigation stack overhead.

### Approach B: Push Stack Screen (`/accounts`) *(Discarded)*
- Retains 2 tabs (`Dashboard` and `Ledger`), opening `/accounts` as a push screen from the Dashboard.
- **Why Discarded:** Requires back-and-forth arrow navigation whenever switching between Ledger and Accounts, causing friction for daily budget tracking.

---

## 4. Architectural & Implementation Details

### 4.1 Database Layer & Schema Migration
- Update `institutions` table definition in `schema.ts`:
  ```sql
  CREATE TABLE IF NOT EXISTS institutions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('bank', 'ewallet', 'cash', 'other')),
    code TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    notes TEXT DEFAULT '',
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  ```
- In `db.ts`, add non-destructive column probe and migration:
  ```ts
  try {
    await db.getFirstAsync('SELECT notes FROM institutions LIMIT 1;');
  } catch (err: any) {
    if (String(err?.message || err).includes('no such column')) {
      await db.execAsync("ALTER TABLE institutions ADD COLUMN notes TEXT DEFAULT '';");
    }
  }
  ```
- In `types/database.ts`:
  ```ts
  export interface Institution {
    // ...
    notes?: string;
  }
  ```

### 4.2 Account Service Functions
- Update `CreateAccountInput` in `accountService.ts` to include optional `notes?: string`.
- Update `createInstitutionWithPocket` to persist `notes`.
- Add `updateInstitutionNotes(db: SQLite.SQLiteDatabase, institutionId: string, notes: string): Promise<void>`:
  ```ts
  export async function updateInstitutionNotes(
    db: SQLite.SQLiteDatabase,
    institutionId: string,
    notes: string
  ): Promise<void> {
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE institutions SET notes = ?, updated_at = ? WHERE id = ?`,
      [notes.trim(), now, institutionId]
    );
  }
  ```

### 4.3 UI Components

#### 1. `AddAccountModal.tsx`
- Add optional text input field below Custom Name:
  - Label: *"Account Note / Description (Optional)"*
  - Placeholder: *"e.g. Payroll account, Joint savings, Card ending in 1234"*

#### 2. `InstitutionCard.tsx`
- Render `institution.notes` below `institution.name`:
  - When notes are present, render a small, readable subtext (e.g., `text-[11px] text-stone-500 font-normal italic`).
  - Gracefully truncates with `numberOfLines={1}` to maintain grid card vertical harmony.

#### 3. `InstitutionDetailSheet.tsx`
- Display current note prominently in the header area.
- Add an inline edit trigger (pencil icon / tap to edit) toggling a quick input with Save/Cancel buttons.
- On save, invokes `onUpdateNotes(institution.id, newNotes)` which calls `updateInstitutionNotes` and refreshes the state.

#### 4. `apps/mobile/app/(tabs)/accounts.tsx` (New Dedicated Screen)
- Header with total aggregate balance across all accounts and "+ Add Account" CTA.
- Search input filtering by institution name, code, or custom notes.
- Filter chips: `All`, `Banks`, `E-Wallets`, `Cash`.
- Full list of institution accounts with pocket breakdowns.
- Pull-to-refresh and empty state handling.

#### 5. `apps/mobile/app/(tabs)/_layout.tsx`
- Add 3rd tab:
  - Tab 1: `Dashboard` (LayoutDashboard)
  - Tab 2: `Accounts` (WalletCards)
  - Tab 3: `Ledger` (ReceiptText)

#### 6. `apps/mobile/app/(tabs)/index.tsx`
- Slice `institutions.slice(0, 4)` for the 2-column preview.
- Update header to show *"Accounts"* + badge count + *"See All →"* button which uses `router.push('/(tabs)/accounts')`.

---

## 5. Verification & Testing Strategy
1. **Unit Tests (Vitest):**
   - Add test case verifying `createInstitutionWithPocket` stores notes.
   - Add test case verifying `updateInstitutionNotes` correctly updates `notes` and `updated_at`.
   - Ensure all existing 17 tests remain green.
2. **Typecheck:** Run `npx turbo run typecheck` across monorepo with zero errors.
3. **Emulator / Touch Verification:**
   - Verify note displays as a subtitle on dashboard cards.
   - Open detail sheet, edit note, save, and confirm card reflects new note immediately.
   - Switch between Dashboard, Accounts, and Ledger tabs.

