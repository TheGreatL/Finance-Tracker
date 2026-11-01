# Product Marketing Context: Personal Finance Tracker

## Product Overview
- **Product Name:** Personal Finance Tracker
- **Category:** Private, offline-first personal finance, payroll, and debt tracker built specifically for the Philippines.
- **Platform:** Android / iOS (React Native / Expo SDK 58), storing 100% of data locally on-device in SQLite (`expo-sqlite`) with full JSON export/restore (`databaseBackupService.ts`).

## Verified Capabilities (Grounding Corpus)
1. **16 Built-in Philippine Institution Presets (`institutions.ts`):**
   - **11 Banks:** BDO, BPI, UnionBank, Metrobank, RCBC, Security Bank, CIMB, Tonik, GoTyme, SeaBank, Maya.
   - **5 E-Wallets:** GCash, GrabPay, ShopeePay, Lazada Wallet, TikTok Wallet.
   - **4 Lending Apps:** BillEase, Tala, Home Credit, Cashalo, plus Physical Cash and Custom institutions.
   - **Nested Pockets (`account_pockets`):** Separate everyday `wallet` pockets from interest-bearing `savings` pockets (% p.a.) under the same institution.
2. **Philippine Multi-Job Payroll & Variable Attendance (`salaryService.ts`):**
   - Supports `monthly`, `semi_monthly` (1st & 2nd cutoffs), `biweekly`, `weekly`, and `one_time` project payouts.
   - Itemized statutory and tax deductions (`SSS`, `PhilHealth`, `Pag-IBIG`, withholding tax) with cutoff targeting (`both`, `first_cutoff`, `second_cutoff`).
   - **Variable Salary Confirmation (`RecordPaydayModal.tsx`):** Adjust any paycheck for Overtime Pay, Holiday/Rest Day Pay, Allowances, Undertime, and Absences (LWOP) before crediting the target bank/e-wallet pocket, or override with Exact Net Pay.
3. **Philippine Lending App & Peer-to-Peer (P2P) Debt Mechanics (`loanService.ts`):**
   - Tracks institutional loans (`institution`) and personal debt (`person`, e.g., barkada/family *utang*).
   - Separates **Principal Borrowed**, **Upfront Processing Fee** (showing actual net cash disbursed), **Total Contract Amount**, and **Contract Interest**.
   - Tracks origination date, tenor months elapsed (`X / Y mos elapsed`), and **Early Payoff Interest Cashback** (e.g., GCash GLoan rebates deposited back into your pocket).
4. **Subscriptions with Offline Auto-Deduction (`subscriptionService.ts`):**
   - 12 service presets with SVG logos (Netflix, Spotify, YouTube Premium, Disney+, iCloud+, Google One, ChatGPT Plus, Canva Pro, Microsoft 365, Amazon Prime, Gym, Fiber Internet).
   - Automatically deducts from the linked pocket on the billing date (or catches up on next app launch if offline) and advances the cycle.
5. **Taglish & English Financial Advisor ("PocketBot", `chatEngine.ts` & `geminiService.ts`):**
   - Understands Taglish queries (*"Kaya ko ba bilhin ang ₱15k phone?"*, *"Magkano pa utang ko?"*) and shorthand (`15k`, `2.5k`, `₱15,000`).
   - Works completely offline via the built-in rules engine, or connects to `gemini-2.5-flash` when a user supplies their own API key.

## Brand Voice & Anti-Slop Guardrails
- **Voice:** Direct, practical, Filipino-context fluent. Speaks in concrete banking/payroll terms (`15th/30th cutoff`, `undertime`, `SSS/Pag-IBIG`, `GLoan cashback`, `utang`, `SeaBank/GoTyme pockets`).
- **Hard Bans:** Zero contrast reveals ("It's not X, it's Y"), zero negation lists ("No X, no Y, no Z"), zero em dashes in ad copy, zero invented user reviews or fabricated statistics.

## Paid Ads & Learnings
- **Missing Data (labeled `MISSING` until live campaigns run):**
  - Historical baseline CTR, CPC, CPI (Cost Per Install), and post-install activation rate: `MISSING` (pre-launch).
  - Customer review corpus (`inputs/reviews/` and `inputs/comments/`): `MISSING` (use verified codebase capabilities and flagged dramatizations only).

