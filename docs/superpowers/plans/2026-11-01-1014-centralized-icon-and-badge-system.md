# Centralized Icon and Badge System Implementation Plan

**Created:** 2026-11-01 10:14 (Local Time)

## Overview

Implement Approach 1 (The Gold Standard) to establish a unified, centralized iconography system across the mobile app. This ensures every dropdown selector, card, detail sheet, and transaction feed displays authentic institution logos, pocket indicators, and semantic category icons.

---

## Tasks

### Task 1: Create Centralized Icon & Badge Components

- [ ] Create `apps/mobile/src/components/common/CategoryIcon.tsx`:
    - Mapping for categories: Food, Groceries, Transport, Bills, Salary, Subscriptions, Healthcare, Education, Entertainment, Housing, Investments, Transfers, General.
    - WCAG AA compliant semantic colors with light container tints.
    - Sizing support (`xs`: 14, `sm`: 18, `md`: 24, `lg`: 32, `xl`: 40).
- [ ] Create `apps/mobile/src/components/accounts/PocketBadge.tsx`:
    - Wrapper that renders `InstitutionLogo` when `institutionCode` is present.
    - Renders `PiggyBank` in an emerald badge when `pocketType === 'savings'`.
    - Renders `Wallet` in a stone badge when `pocketType === 'wallet'`.
    - Supports sizes (`xs`: 14, `sm`: 18, `md`: 24, `lg`: 32).
- [ ] Unit tests for `CategoryIcon` and `PocketBadge`.

### Task 2: Service Layer & Type Enhancements

- [ ] In `apps/mobile/src/services/transactionService.ts`:
    - Add `i_to.code AS to_institution_code` to `getRecentTransactions` and `getTransactionById`.
- [ ] In `apps/mobile/src/components/dashboard/TransactionItem.tsx`:
    - Extend `TransactionItemData` with `institutionCode?: string` and `pocketType?: PocketType`.
    - Render micro (14px) `PocketBadge` inline next to `accountName` in the subtitle.

### Task 3: Universal Selectors Integration

- [ ] In `apps/mobile/src/components/loans/LoanPaymentModal.tsx`:
    - Enrich pocket options with `PocketBadge`.
- [ ] In `apps/mobile/src/components/salary/RecordPaydayModal.tsx`:
    - Enrich `pocketOptions` with `PocketBadge`.
- [ ] In `apps/mobile/src/components/salary/AddJobModal.tsx` & `EditJobModal.tsx`:
    - Enrich `pocketOptions` with `PocketBadge`.
- [ ] In `apps/mobile/src/components/subscriptions/AddSubscriptionModal.tsx`:
    - Enrich payment source pocket options with `PocketBadge`.
    - Enrich category options with `CategoryIcon`.
- [ ] In `apps/mobile/src/components/transactions/TransactionFormModal.tsx` & `EditTransactionModal.tsx`:
    - Enrich category options with `CategoryIcon`.
    - Use `PocketBadge` for source and destination pocket options.

### Task 4: Cards & Detail Sheets Integration

- [ ] In `apps/mobile/src/components/transactions/TransactionDetailSheet.tsx`:
    - Render `PocketBadge` for `to_institution_code` on transfers.
    - Render `CategoryIcon` for the category metadata row.
- [ ] In `apps/mobile/src/components/subscriptions/SubscriptionCard.tsx` & `SubscriptionDetailSheet.tsx`:
    - Replace generic `Wallet` with `PocketBadge` displaying `subscription.institution_code`.
- [ ] In `apps/mobile/src/components/salary/JobCard.tsx` & `JobDetailSheet.tsx`:
    - Replace generic `Wallet` with `PocketBadge` displaying `job.institution_code`.
- [ ] In `apps/mobile/app/(tabs)/two.tsx` & `apps/mobile/src/components/dashboard/RecentTransactionsList.tsx`:
    - Pass `institutionCode={t.institution_code}` and `pocketType={t.pocket_type}` to `TransactionItem`.

### Task 5: Verification & Quality Assurance

- [ ] Run `npm run typecheck` across all packages.
- [ ] Run `npm run test --workspace=@finance-tracker/mobile`.
- [ ] Format with Prettier.
- [ ] Verify `git status` shows all changes unstaged.
