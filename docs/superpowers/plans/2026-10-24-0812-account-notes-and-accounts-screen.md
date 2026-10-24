# Account Notes & Dedicated Accounts Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Created:** 2026-10-24 08:12 (Local Time)

**Goal:** Allow users to add and edit custom notes per account to disambiguate duplicate bank accounts, and provide a dedicated Accounts tab with search and category filtering while keeping a streamlined 4-account preview on the Dashboard.

**Architecture:** Extend SQLite `institutions` table with a non-destructive `notes TEXT DEFAULT ''` column migration. Provide `updateInstitutionNotes` in `accountService.ts`. Add an optional Note input in `AddAccountModal`, display note subtitles on `InstitutionCard`, and allow in-sheet note editing in `InstitutionDetailSheet`. Introduce a dedicated `(tabs)/accounts.tsx` screen and configure 3-tab navigation (`Dashboard` | `Accounts` | `Ledger`) in `(tabs)/_layout.tsx`.

**Tech Stack:** React Native (Expo SDK 58), SQLite (`expo-sqlite`), NativeWind (Tailwind CSS), Lucide React Native, Vitest.

**Spec:** [`docs/superpowers/specs/2026-10-24-0811-account-notes-and-accounts-screen-design.md`](file:///c:/Users/user/Desktop/projects/finance-tracker/docs/superpowers/specs/2026-10-24-0811-account-notes-and-accounts-screen-design.md)

---

### Task 1: Database Schema & Service Extension for Account Notes

**Files:**
- Modify: [`apps/mobile/src/types/database.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/types/database.ts)
- Modify: [`apps/mobile/src/database/schema.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/database/schema.ts)
- Modify: [`apps/mobile/src/database/db.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/database/db.ts)
- Modify: [`apps/mobile/src/services/accountService.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/accountService.ts)
- Create: [`apps/mobile/tests/account_notes.test.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/tests/account_notes.test.ts)

- [ ] **Step 1: Write unit test for `updateInstitutionNotes` and notes persistence**
  Create `apps/mobile/tests/account_notes.test.ts` testing:
  - `notes` field is returned by `getInstitutionConfig` or custom input.
  - `updateInstitutionNotes` issues SQL `UPDATE institutions SET notes = ?, updated_at = ? WHERE id = ?`.
  - Formatters or helper functions handle empty/undefined notes cleanly.

- [ ] **Step 2: Run test to observe baseline**
  Run `npm test --workspace=@finance-tracker/mobile` and verify test execution.

- [ ] **Step 3: Update database types and schema**
  - Add `notes?: string` to `Institution` in `types/database.ts`.
  - Add `notes TEXT DEFAULT ''` to `institutions` table creation in `schema.ts`.
  - In `db.ts`, add migration probe:
    ```ts
    try {
      await db.getFirstAsync('SELECT notes FROM institutions LIMIT 1;');
    } catch (err: any) {
      if (String(err?.message || err).includes('no such column')) {
        await db.execAsync("ALTER TABLE institutions ADD COLUMN notes TEXT DEFAULT '';");
      }
    }
    ```

- [ ] **Step 4: Update `accountService.ts`**
  - Add optional `notes?: string` to `CreateAccountInput`.
  - In `createInstitutionWithPocket`, insert `notes` into `institutions` table (`notes || ''`).
  - Implement and export `updateInstitutionNotes(db, institutionId, notes)`.

- [ ] **Step 5: Run unit tests and typecheck**
  Run:
  - `npm test --workspace=@finance-tracker/mobile`
  - `npx turbo run typecheck`

- [ ] **Step 6: Commit changes**
  Commit as: `feat(mobile): add notes column to institutions and updateInstitutionNotes service`

---

### Task 2: Add Notes to UI Components & In-Sheet Editing

**Files:**
- Modify: [`apps/mobile/src/components/accounts/AddAccountModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/AddAccountModal.tsx)
- Modify: [`apps/mobile/src/components/accounts/InstitutionCard.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/InstitutionCard.tsx)
- Modify: [`apps/mobile/src/components/accounts/InstitutionDetailSheet.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/InstitutionDetailSheet.tsx)

- [ ] **Step 1: Update `AddAccountModal.tsx`**
  - Add state `notes` (string, default `''`).
  - Add text input in modal:
    - Label: `"Account Note / Description (Optional)"`
    - Placeholder: `"e.g. Payroll account, Joint savings, Card #1234"`
  - Pass `notes: notes.trim() || undefined` in `onSubmit`.

- [ ] **Step 2: Update `InstitutionCard.tsx`**
  - If `institution.notes` is present and non-empty:
    Render as subtitle right under `institution.name`:
    ```tsx
    <Text className="text-[11px] text-stone-500 font-normal mt-0.5" numberOfLines={1}>
      {institution.notes}
    </Text>
    ```

- [ ] **Step 3: Update `InstitutionDetailSheet.tsx`**
  - Accept `onUpdateNotes?: (institutionId: string, notes: string) => Promise<void>` prop.
  - Display the note in the header card with an Edit pencil button.
  - In edit mode, display a text input with Save and Cancel buttons.
  - On save, await `onUpdateNotes` and exit edit mode.

- [ ] **Step 4: Verify typecheck and tests**
  Run `npx turbo run typecheck` and `npm test --workspace=@finance-tracker/mobile`.

- [ ] **Step 5: Commit changes**
  Commit as: `feat(mobile): add note field in AddAccountModal, InstitutionCard subtitle, and in-sheet editing`

---

### Task 3: Build Dedicated Accounts Screen & 3-Tab Navigation

**Files:**
- Modify: [`apps/mobile/src/components/accounts/InstitutionGrid.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/accounts/InstitutionGrid.tsx)
- Create: [`apps/mobile/app/(tabs)/accounts.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/accounts.tsx)
- Modify: [`apps/mobile/app/(tabs)/_layout.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/_layout.tsx)
- Modify: [`apps/mobile/app/(tabs)/index.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/index.tsx)

- [ ] **Step 1: Update `InstitutionGrid.tsx` for header actions & limits**
  - Add optional prop `onSeeAll?: () => void`.
  - Add optional prop `limit?: number`.
  - If `limit` is provided, slice `institutions.slice(0, limit)` for display.
  - Render a `"See All (N) →"` button next to the Accounts section header when `onSeeAll` is provided.

- [ ] **Step 2: Create dedicated `apps/mobile/app/(tabs)/accounts.tsx`**
  - Load accounts using `getInstitutionsWithTotals`.
  - Include search bar filtering by name, code, or notes.
  - Filter pills: `All`, `Banks`, `E-Wallets`, `Cash`.
  - Stat bar showing total balance across all accounts and total pocket count.
  - Render 2-column `InstitutionGrid` with full accounts list.
  - Support `onSelectInstitution`, `onAddAccount`, and `onUpdateNotes`.
  - Include `AddAccountModal`, `InstitutionDetailSheet`, and `AddPocketModal`.

- [ ] **Step 3: Update `(tabs)/_layout.tsx` for 3-Tab Bar**
  - Import `WalletCards` from `lucide-react-native`.
  - Insert `accounts` tab between `index` (Dashboard) and `two` (Ledger):
    - Tab 1: `index` (Dashboard, LayoutDashboard)
    - Tab 2: `accounts` (Accounts, WalletCards)
    - Tab 3: `two` (Ledger, ReceiptText)

- [ ] **Step 4: Update `(tabs)/index.tsx` Dashboard preview**
  - Pass `limit={4}` and `onSeeAll={() => router.push('/(tabs)/accounts')}` to `InstitutionGrid`.
  - Wire `handleUpdateNotes` to `updateInstitutionNotes` and reload dashboard data.

- [ ] **Step 5: Verify typecheck and unit tests**
  Run:
  - `npm test --workspace=@finance-tracker/mobile`
  - `npx turbo run typecheck`

- [ ] **Step 6: Commit changes**
  Commit as: `feat(mobile): add dedicated accounts screen, 3-tab navigation, and dashboard preview`

---

### Task 4: Final Verification & Integration Testing

- [ ] **Step 1: Full unit test suite verification**
  Run `npm test --workspace=@finance-tracker/mobile` to verify all unit tests pass.

- [ ] **Step 2: Full monorepo typecheck**
  Run `npx turbo run typecheck` across the monorepo.

- [ ] **Step 3: Provide testing guide to user**
  Explain how to reload Expo Metro (`r`) and test:
  1. Adding an account with notes (e.g. "BDO" with note "Payroll").
  2. Viewing the subtitle on the Dashboard card and the dedicated Accounts tab.
  3. Editing the note directly in the detail sheet.
  4. Switching tabs between Dashboard, Accounts, and Ledger.
