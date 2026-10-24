# Offline Finance Assistant Chatbot & 5-Tab Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Created:** 2026-10-24 18:35 (Local Time)

**Goal:** Build a 100% offline rule-based financial chatbot ("PocketBot") querying local SQLite data for affordability, projections, and loan obligations, and upgrade the mobile app navigation to a 5-tab layout featuring the Assistant as the elevated center tab alongside a new Analytics tab.

**Architecture:** Create `chatEngine.ts` to parse prompts and amounts, query SQLite pockets and loans, and generate deterministic financial advice with zero AI APIs. Update `_layout.tsx` to host 5 tabs (`index`, `accounts`, `assistant`, `two`, `analytics`) with a prominent center button. Build `assistant.tsx` with chat history and quick suggestion chips, and build `analytics.tsx` for spending category breakdowns.

**Tech Stack:** React Native (Expo SDK 58), Expo Router, SQLite (`expo-sqlite`), Lucide Icons, Vitest.

**Spec:** [`docs/superpowers/specs/2026-10-24-1832-offline-finance-assistant-and-5-tab-nav-design.md`](file:///c:/Users/user/Desktop/projects/finance-tracker/docs/superpowers/specs/2026-10-24-1832-offline-finance-assistant-and-5-tab-nav-design.md)

## Global Constraints
- Zero external AI APIs: all processing and calculations must be 100% local, offline, deterministic, and instant.
- Maintain accurate financial calculations (strictly compare liquid assets and upcoming loan obligations).
- All unit tests must pass via `npm test --workspace=@finance-tracker/mobile`.
- TypeScript compiler checks must pass cleanly via `npx turbo run typecheck`.

## Review Focus
- Amount parsing edge cases: shorthand notation (`15k`, `1.5k`), currency prefixes (`₱`, `P`, `php`), comma-separated numbers (`15,000`).
- Affordability calculation safety: warning if purchase risks loan payments due within 14 days.
- Tab bar center alignment: center tab must feel elevated and tap targets must remain responsive.
- Empty states: graceful messaging when no loans or no transactions exist.

---

### Task 1: Offline NLP Intent & Calculation Engine (`chatEngine.ts`)

**Files:**
- Create: [`apps/mobile/src/services/chatEngine.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/chatEngine.ts)
- Create: [`apps/mobile/tests/chat_engine.test.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/tests/chat_engine.test.ts)

- [ ] **Step 1: Write unit tests for `chatEngine.ts`**
  - Test `parseAmount`: `"5000"`, `"₱12,500"`, `"15k"`, `"2.5k"`, `"php 3500"`, and invalid inputs.
  - Test `detectIntent`: `"can i afford 5000"` -> `affordability`, `"how much will i have if 3000"` -> `projection`, `"how much do i owe"` -> `debt`, `"how much money in gcash"` -> `institution_balance`, `"total balance"` -> `balance`.
  - Test `evaluateChatPrompt`:
    - Affordability verdict when user has plenty of funds (`safe`).
    - Affordability verdict when user has enough cash but an upcoming loan due in 5 days is compromised (`tight`).
    - Affordability verdict when amount exceeds total money (`unaffordable`).
    - Projection balance calculation.
    - Debt summary reporting active loans and next due date.
    - Institution-specific balance reporting.

- [ ] **Step 2: Implement `parseAmount` and `detectIntent` in `chatEngine.ts`**
  - Regular expressions for extracting numerical values, currency signs, and multipliers (`k`, `m`).
  - Intent classification using keyword tokens.

- [ ] **Step 3: Implement `evaluateChatPrompt` in `chatEngine.ts`**
  - Integrate with `getAllActivePockets`, `getLoansSummary`, and `getActiveLoans`.
  - Construct markdown-formatted conversational response strings with status indicators (`safe` | `tight` | `unaffordable` | `info`).

- [ ] **Step 4: Run tests and typecheck**
  Run `npm test --workspace=@finance-tracker/mobile` and `npx turbo run typecheck`.

- [ ] **Step 5: Commit changes**
  Commit as: `feat(mobile): implement offline chatEngine with intent parsing and financial calculations`

---

### Task 2: 5-Tab Navigation Layout with Center Assistant (`_layout.tsx`)

**Files:**
- Modify: [`apps/mobile/app/(tabs)/_layout.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/_layout.tsx)

- [ ] **Step 1: Configure 5 tabs in `_layout.tsx`**
  - Tab 1: `index` (Dashboard) — `LayoutDashboard`
  - Tab 2: `accounts` (Accounts & Loans) — `WalletCards`
  - Tab 3: `assistant` (Advisor) — Raised center pill with `Bot` / `Sparkles` icon, Pistachio `#BBD583` background, and Deep Pine `#18342B` tint.
  - Tab 4: `two` (Ledger) — `ReceiptText`
  - Tab 5: `analytics` (Analytics) — `PieChart` or `BarChart3`

- [ ] **Step 2: Verify typecheck**
  Run `npx turbo run typecheck`.

- [ ] **Step 3: Commit changes**
  Commit as: `feat(mobile): update bottom navigation to 5-tab layout with elevated center assistant`

---

### Task 3: Conversational Assistant Screen & UI Components

**Files:**
- Create: [`apps/mobile/src/components/chat/ChatMessageBubble.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/chat/ChatMessageBubble.tsx)
- Create: [`apps/mobile/src/components/chat/PromptSuggestionChips.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/chat/PromptSuggestionChips.tsx)
- Create: [`apps/mobile/app/(tabs)/assistant.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/assistant.tsx)

- [ ] **Step 1: Build `ChatMessageBubble.tsx`**
  - Distinguish user vs bot messages.
  - Support formatted responses, bullet points, and colored verdict banners.

- [ ] **Step 2: Build `PromptSuggestionChips.tsx`**
  - Horizontal scroll of quick prompt chips.
  - Tapping emits prompt to parent screen.

- [ ] **Step 3: Build `apps/mobile/app/(tabs)/assistant.tsx`**
  - Message state initialized with a friendly welcome message.
  - Chat list with auto-scroll on new message.
  - Text input with submit action calling `evaluateChatPrompt`.
  - "Clear Chat" action in header.

- [ ] **Step 4: Verify typecheck**
  Run `npx turbo run typecheck`.

- [ ] **Step 5: Commit changes**
  Commit as: `feat(mobile): add conversational assistant screen and prompt suggestion chips`

---

### Task 4: Analytics Screen (`analytics.tsx`)

**Files:**
- Create: [`apps/mobile/src/services/analyticsService.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/analyticsService.ts)
- Create: [`apps/mobile/app/(tabs)/analytics.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/analytics.tsx)

- [ ] **Step 1: Implement `analyticsService.ts`**
  - Calculate category breakdown from current month's transactions.
  - Calculate total inflow vs outflow.
  - Calculate asset distribution (Banks vs E-Wallets vs Cash).

- [ ] **Step 2: Build `apps/mobile/app/(tabs)/analytics.tsx`**
  - Monthly Cash Flow card (Income vs Expense).
  - Category spending progress bars with percentages.
  - Asset distribution card.

- [ ] **Step 3: Run tests and typecheck**
  Run `npm test --workspace=@finance-tracker/mobile` and `npx turbo run typecheck`.

- [ ] **Step 4: Commit changes**
  Commit as: `feat(mobile): implement analytics screen with category spending and cash flow`

---

### Task 5: Final Verification & Manual Testing Walkthrough

- [ ] **Step 1: Run complete test suite and monorepo typecheck**
  - `npm test --workspace=@finance-tracker/mobile`
  - `npx turbo run typecheck`

- [ ] **Step 2: Test chatbot scenarios**
  - Test `"can i afford 5000"`
  - Test `"how much will i have if i buy this for 2500"`
  - Test `"how much do i owe?"`
  - Test `"how much in GCash?"`
  - Test tapping suggestion chips.

- [ ] **Step 3: Verify 5-tab navigation on mobile**
