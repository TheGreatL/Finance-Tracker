# Offline Finance Assistant Chatbot & 5-Tab Navigation Design Specification

**Created:** 2026-10-24 18:32 (Local Time)

## Overview & Goals

This specification outlines the architecture and user experience for:
1. **Offline Rule-Based Financial Assistant ("PocketBot"):** An offline text chatbot that answers financial scenario questions (e.g., *"Can I afford this?"*, *"How much money will I have if I buy this?"*, *"How much do I owe right now?"*) using pattern matching and live queries to the local SQLite database. It requires **zero AI APIs**, has zero latency, guarantees 100% financial calculation accuracy, and works completely offline.
2. **5-Tab Bottom Navigation with Center Assistant:** Expanding the bottom navigation from 3 tabs to 5 tabs, featuring the Chatbot as the prominent center anchor:
   - **Tab 1:** Dashboard (`index.tsx`)
   - **Tab 2:** Accounts & Loans (`accounts.tsx`)
   - **Tab 3 (Center Anchor):** Assistant (`assistant.tsx` — highlighted with prominent styling)
   - **Tab 4:** Ledger (`two.tsx`)
   - **Tab 5:** Analytics & Insights (`analytics.tsx` — spending categories & monthly flow)

---

## 1. Offline Chatbot Engine Architecture (`src/services/chatEngine.ts`)

### Intent & Entity Recognition
The engine operates deterministically through regular expressions, tokenization, and number extraction.

#### Supported Patterns & Intents:

| Intent | Sample Prompts | Entity Extraction | Output |
| :--- | :--- | :--- | :--- |
| **Affordability** | `"can i afford 15000"`, `"can i afford a laptop for 25k"`, `"can i buy this for 3,500?"` | Amount (`₱15,000`), optional pocket/bank name | Verdict (Safe / Tight / Unaffordable), remaining balance, upcoming loan due warnings |
| **Projection / What-If** | `"how much money will i have if i buy this for 4500"`, `"remaining if i spend 2000"`, `"left after 5k"` | Amount (`₱4,500`) | Projected balance (`Current - Amount`), remaining runway, impact breakdown |
| **Debt & Loans** | `"how much do i owe"`, `"what are my loans"`, `"loans due"` | None | Total outstanding loan balance, next due date, lender breakdown |
| **Total Balance** | `"how much money do i have"`, `"total balance"`, `"net money"` | None | Total liquid funds across all banks, e-wallets, and cash pockets |
| **Institution Balance** | `"how much in gcash"`, `"maya balance"`, `"how much money in bdo"` | Institution name (`gcash`, `maya`, `bdo`) | Total in that institution and breakdown across its pockets |
| **Fallback** | Unrecognized input | None | Friendly guidance explaining supported questions with sample clickable chips |

### Amount Parsing Engine
Supports common Filipino and colloquial number notations:
- Standard digits: `1500`, `15,000`, `25000.50`
- Currency prefixed: `₱5000`, `P5000`, `php 5,000`
- Shorthand notations: `15k` (15,000), `1.5k` (1,500), `2.5m` (2,500,000)

### Affordability Logic & Decision Criteria
Given `TotalLiquidMoney` (all active pockets) and `TotalDueIn14Days` (loans due within 14 days):
- **Safe (Green):** `Amount <= (TotalLiquidMoney - TotalDueIn14Days) * 0.7`
  - *"Yes, you can comfortably afford this. You have ₱X available. After this purchase, you will retain ₱Y in liquid funds."*
- **Tight / Warning (Amber):** `Amount <= TotalLiquidMoney` but `Amount > (TotalLiquidMoney - TotalDueIn14Days)`
  - *"Caution: You have enough total cash (₱X), but this purchase leaves only ₱Y, which may risk your upcoming loan payment of ₱Z due in N days."*
- **Unaffordable (Red):** `Amount > TotalLiquidMoney`
  - *"No, this exceeds your total available funds (₱X). You are short by ₱Y."*

---

## 2. Conversational UI (`apps/mobile/app/(tabs)/assistant.tsx`)

### Layout & Components
1. **Header:** 
   - Clean Pistachio/Deep Pine branded title: *"Financial Assistant"*
   - Subtitle: *"100% Offline • Direct SQLite Calculations"*
   - Clear History action button.
2. **Scrollable Chat Feed:**
   - User messages: Align right with Deep Pine background (`#18342B`) and white text.
   - Assistant messages: Align left with clean card styling, markdown-like bolding, colored verdict badges (Safe / Warning / Alert), and bulleted breakdowns.
3. **Quick Suggestion Chips (Horizontal Scroll above Input):**
   - `"Can I afford ₱..."`
   - `"How much will I have if ₱..."`
   - `"What loans do I owe?"`
   - `"Total cash balance"`
   - `"How much in GCash?"`
   Tapping a chip pre-fills or immediately executes the question.
4. **Input Bar:**
   - Rounded text input with placeholder: *"Ask 'Can I afford ₱5,000?'..."*
   - Send button with Send/Arrow icon.

---

## 3. Navigation Structure (`apps/mobile/app/(tabs)/_layout.tsx`)

A balanced 5-tab layout:

```
[ Dashboard ]  [ Accounts ]  [  (★ Assistant)  ]  [ Ledger ]  [ Analytics ]
```

### Tab Configuration:
1. `index`: **Dashboard** (Icon: `LayoutDashboard`)
2. `accounts`: **Accounts** (Icon: `WalletCards` — Bank pockets, Cash, Loans)
3. `assistant`: **Advisor** (Icon: `Bot` or `Sparkles` or `MessageSquare` — Centered, raised/elevated with Pistachio circular background `#BBD583`, dark icon `#18342B`)
4. `two`: **Ledger** (Icon: `ReceiptText` — Transaction history)
5. `analytics`: **Analytics** (Icon: `PieChart` or `BarChart3` — Spending by category, cash flow)

---

## 4. Analytics Tab (`apps/mobile/app/(tabs)/analytics.tsx`)

To complete the 5th tab meaningfully:
- **Monthly Inflow vs Outflow:** Visual comparison of total income vs total expenses.
- **Spending by Category:** Grouped expense totals (Food, Bills, Shopping, Transportation, Loan Payments, etc.) with percentage bars.
- **Asset Distribution:** Percentage of money in Banks vs E-Wallets vs Cash.

---

## 5. Testing & Verification

1. **Unit Tests (`apps/mobile/tests/chat_engine.test.ts`):**
   - Test amount parser across `"5000"`, `"₱12,500"`, `"15k"`, `"2.5k"`, `"php 3500"`.
   - Test affordability scenarios (Safe, Tight with upcoming loan, Unaffordable).
   - Test projection calculation (`total - amount`).
   - Test debt summary with active loans.
   - Test institution balance query (e.g. Maya, GCash).
   - Test unrecognized query fallback.
2. **Typecheck & Monorepo Verification:**
   - `npx turbo run typecheck`
   - `npm test --workspace=@finance-tracker/mobile`

---

## 6. Approaches Considered & Selected

- **Approach A (Selected):** Pure TypeScript regex & keyword intent parser directly interrogating SQLite. Instant, predictable, zero hallucination, offline.
- **Approach B (Rejected):** Multi-step form/wizard modal. Too rigid and not a conversational experience as requested.
- **Approach C (Rejected):** External LLM API (OpenAI/Gemini). Rejected per explicit user instruction ("while not using any AI api").
