# Centralized Icon and Badge System Design Specification

**Created:** 2026-11-01 10:13 (Local Time)

## 1. Problem Statement

Across the application, various financial entities (bank accounts, e-wallets, savings pockets, subscription providers, and expense/income categories) possess dedicated visual iconography. However, several critical touchpoints currently render plain text labels or generic fallback icons (e.g. gray wallet or generic tag icons). This causes visual inconsistency, breaks component vocabulary across screens, and deprives users of instant preattentive brand recognition.

## 2. Design Goals

1. **Single Source of Truth**: Centralize category resolution and pocket/institution badges into reusable, type-safe components.
2. **Deterministic Category Visuals**: Map all categories to a standardized Lucide icon with WCAG AA-compliant semantic background tints.
3. **Universal Selection Affordance**: Guarantee that every dropdown (`SearchableSelectField`) displays entity badges in both the searchable list and trigger button.
4. **Dual-Cue Recognition in Feeds**: Enable fast, low-friction scanning in list items (`TransactionItem`) by displaying the category/service avatar alongside a micro institution badge.
5. **Detail Sheet & Card Consistency**: Replace generic gray placeholders in cards and detail sheets (`JobCard`, `SubscriptionCard`, `TransactionDetailSheet`, `JobDetailSheet`, `SubscriptionDetailSheet`) with genuine brand logos.

---

## 3. Architecture & New Components

### 3.1 CategoryIcon Component (`apps/mobile/src/components/common/CategoryIcon.tsx`)

- Maps standard and custom category strings to a curated set of Lucide icons.
- Provides semantic background tints and stroke colors:
    - Food & Dining / Restaurants: `Utensils`, `#C2410C` (Terracotta)
    - Groceries / Shopping: `ShoppingBag`, `#D97706` (Amber)
    - Transport / Fuel: `Car`, `#7C3AED` (Violet)
    - Bills & Utilities / Electricity: `Zap`, `#2563EB` (Blue)
    - Salary / Income / Wages: `Briefcase`, `#18342B` (Deep Emerald)
    - Subscriptions / Streaming: `Repeat`, `#0D9488` (Teal)
    - Healthcare / Medical: `HeartPulse`, `#16A34A` (Green)
    - Education / Books: `GraduationCap`, `#4F46E5` (Indigo)
    - Entertainment / Fun: `Film`, `#DB2777` (Pink)
    - Housing / Rent: `Home`, `#475569` (Slate)
    - Investments / Savings: `TrendingUp`, `#059669` (Emerald)
    - Transfers: `ArrowLeftRight`, `#57534E` (Stone)
    - General / Other: `Tag`, `#78716C` (Warm Gray)
- Supports sizing tokens: `xs` (14px), `sm` (18px), `md` (24px), `lg` (32px), `xl` (40px).

### 3.2 PocketBadge Component (`apps/mobile/src/components/accounts/PocketBadge.tsx`)

- Props:
    - `institutionCode?: string | null`
    - `pocketType?: 'wallet' | 'savings'`
    - `size?: number` (defaults to 20)
    - `className?: string`
- Behavior:
    - If `institutionCode` exists, renders `InstitutionLogo` at the requested size.
    - If `pocketType === 'savings'`, renders `PiggyBank` in an emerald rounded badge.
    - Otherwise, renders `Wallet` in a neutral stone rounded badge.

---

## 4. Touchpoints & Integration Plan

### 4.1 Selectors (`SearchableSelectField`)

- **LoanPaymentModal**:
    - Enrich pocket options with `PocketBadge` using `p.institution_code` and `p.pocket_type`.
- **RecordPaydayModal**:
    - Enrich `pocketOptions` with `PocketBadge` using `p.institution_code` and `p.pocket_type`.
- **AddJobModal & EditJobModal**:
    - Enrich direct deposit pocket options with `PocketBadge`.
- **AddSubscriptionModal**:
    - Enrich payment source pocket options with `PocketBadge`.
    - Enrich category options with `CategoryIcon`.
- **TransactionFormModal & EditTransactionModal**:
    - Enrich category options with `CategoryIcon`.
    - Source and destination pocket selectors already use `InstitutionLogo`; standardize to `PocketBadge`.

### 4.2 Detail Sheets & Cards

- **TransactionDetailSheet**:
    - Render `PocketBadge` for `to_institution_code` on transfers.
    - Render `CategoryIcon` for `transaction.category` with semantic tint.
- **SubscriptionCard & SubscriptionDetailSheet**:
    - Replace gray `Wallet` icon in footer/detail rows with `PocketBadge` using `subscription.institution_code`.
- **JobCard & JobDetailSheet**:
    - Replace gray `Wallet` icon in footer/detail rows with `PocketBadge` using `job.institution_code`.

### 4.3 Transaction Lists (`TransactionItem`)

- Update `TransactionItemData` to include `institutionCode?: string` and `pocketType?: PocketType`.
- Render a micro (14px) `PocketBadge` inline next to the account name subtitle (`[Logo] BDO • Savings`).
- When a transaction is a subscription or loan payment, maintain the primary category/service visual cue on the avatar.

### 4.4 Service Query Updates

- In `getRecentTransactions` and `getTransactionById` ([`transactionService.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/transactionService.ts)):
    - Add `i_to.code AS to_institution_code` to the SELECT query.

---

## 5. Verification & Testing

1. **Unit Tests**:
    - Write tests for `CategoryIcon` resolver verifying mapping of standard categories and case-insensitive fallback.
    - Write tests for `PocketBadge` rendering logic (logo vs. savings vs. wallet).
2. **Monorepo Typecheck**:
    - Verify `npm run typecheck` across all monorepo packages.
3. **Vitest Suite**:
    - Verify all test suites pass with `npm run test --workspace=@finance-tracker/mobile`.
