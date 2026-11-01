# AI Agent Financial Context Expansion Plan

**Created:** 2026-11-01 12:28 (Local Time)

Enhance PocketBot's AI intelligence by supplying rich, holistic financial context (subscriptions, spending categories, recent transactions, savings vs wallet separation, and loan waterfall amortization) to both the Gemini online advisor and the local offline engine.

## Proposed Changes

### 1. `apps/mobile/src/services/geminiService.ts`

- Extend `buildFinancialSystemContext`:
    - Accept optional `subscriptionsSummary`, `spendingSummary`, and `amortizationDetails`.
    - Format **Spendable Cash vs Reserved Savings** separation.
    - Format **Fixed Recurring Commitments**: Subscriptions (Netflix, Spotify, utilities, etc.) and exact next billing dates.
    - Format **Current Month Spending & Top Categories**: Total expense, top 3 categories by spend, and recent 5 transactions.
    - Format **Amortization Waterfall Status**: Detail which installments are settled in advance and exact residual due (e.g. ₱854.01).
    - Update system prompt instructions to guide the model on spending questions, subscription auditing, and protecting emergency savings.
- Extend `queryGeminiAdvisor`:
    - Ingest `getAllSubscriptions` (via `calculateSubscriptionsAnalytics`), `getRecentTransactions`, and `calculateCategoryBreakdown` / `calculateMonthlyFlow` from `analyticsService.ts`.
    - Fetch and format loan installment schedules for active loans via `calculateLoanInstallmentSchedule`.

### 2. `apps/mobile/src/services/chatEngine.ts`

- Add new `ChatIntent` types: `'subscriptions'` and `'spending'`.
- Detect keywords for subscriptions ("subscription", "netflix", "recurring", "bills due") and spending ("spent", "gastos", "expenses this month", "saan napunta pera").
- In `evaluateChatPrompt`:
    - Ingest subscriptions and recent transactions.
    - Check upcoming subscriptions in affordability checks along with upcoming loan payments.
    - Return dedicated answers for subscription totals and monthly spending breakdowns.

### 3. Tests

- Update `apps/mobile/tests/gemini_service.test.ts`:
    - Test system prompt construction with subscriptions, spending breakdown, and savings separation.
    - Test advisor query with mock analytics and subscriptions.
- Update `apps/mobile/tests/chat_engine.test.ts`:
    - Test offline subscription intent and response.
    - Test offline spending intent and response.
    - Test affordability calculation with combined loan + subscription 14-day obligations.

## Verification Plan

### Automated Tests

- Run `npm test --workspace=@finance-tracker/mobile -- tests/gemini_service.test.ts tests/chat_engine.test.ts`.
- Run `npm run typecheck` across monorepo.
- Run `npm run lint` to guarantee 0 errors.
