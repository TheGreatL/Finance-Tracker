# 💰 Offline-First Personal Finance Tracker

A privacy-focused, offline-first personal finance tracker built with **React Native (Expo SDK 57)**, on-device **SQLite**, and **PanelUI** component system. It treats every money movement as an immutable ledger transaction while organizing accounts (Cash, Banks, eWallets, Credit Cards), income with deductions, expenses (needs vs. wants), recurring subscriptions, savings goals, loans/payables, and wishlist items.

---

## 🌟 Key Features

### 1. 📖 Source-of-Truth Financial Ledger
- **Transfer Isolation**: Money transfers between your own accounts (e.g. Bank $\leftrightarrow$ eWallet or Bank $\leftrightarrow$ Credit Card payment) automatically adjust account balances without distorting your income or expense analytics.
- **Income Deductions**: Track gross earnings, itemized deductions (withholding tax, social security/healthcare contributions, fees), and net received amount.
- **Expense Categorization**: Classify spending by category and nature (Essential **Needs**, Lifestyle **Wants**, or Debt **Obligations**).
- **Ledger Replay Reconciliation**: Atomic balance updates and reconciliation engine ensure 100% balance integrity without balance drift.

### 2. 💳 Multi-Account & Credit Card Management
- **Account Types**: Physical Cash, Bank Accounts, eWallets (GCash, Maya, etc.), and Credit Cards.
- **Credit Card Billing**: Track credit limits, current outstanding debt, statement cutoff days, and payment due days.
- **Credit Utilization Gauge**: Real-time per-card and aggregate utilization monitoring, alerting you when utilization exceeds the recommended 30% threshold.

### 3. 🎯 Goals, Loans & Wishlist
- **Savings Goals**: Set target amounts and dates, track accumulated funds with progress bars, and make contributions directly from any account.
- **Loans & Debt Tracking**: Manage loans (money you owe or money owed to you), interest rates, monthly installments, and log repayments with automatic balance reduction.
- **Wishlist with Live Affordability Scoring**: Prioritize items and assess whether purchasing now fits within your **Safe-to-Spend Runway** (*Confident Buy*, *Stretch Buy*, or *Exceeds Safe Cash*).

### 4. 🧮 Data-Driven Interactive Calculators
- **Safe-to-Spend Runway**: Real-time liquid cash minus upcoming active recurring bills, loan amortizations, and savings commitments, including a **Daily Discretionary Budget**.
- **Savings Goal Projector**: Monthly contribution vs. completion timeline calculator.
- **Debt Payoff Accelerator**: Calculates payoff duration, total interest, and comparison with accelerated monthly payments.
- **Purchase Affordability Simulator**: Tests prospective purchases against future cash flow before buying.
- **Credit Card Utilization Monitor**: Card-by-card and aggregate utilization analysis.

### 5. 📦 Versioned ZIP-of-CSVs Backup & Restore Hub
Because on-device SQLite databases are cleared when an app is uninstalled, this app provides complete, zero-data-loss backups:
- **Export**: Exports a versioned `backup.zip` containing 8 normalized CSV files and a `manifest.csv` via the native OS share sheet (`expo-sharing`).
- **Dry-Run Inspection**: Unpacks the ZIP in memory, validates headers, and previews incoming record counts before committing.
- **Merge or Replace**: Choose to non-destructively merge incoming records or wipe and restore a fresh database in an atomic SQLite transaction.
- **Bank CSV Import**: Support for importing standard external transaction CSV files from banking apps.

```
backup.zip
├── manifest.csv             # Backup format version, export timestamp, record counts
├── accounts.csv             # Cash, bank, eWallet, and credit card accounts
├── categories.csv           # System & custom categories
├── transactions.csv         # Immutable financial ledger records
├── deductions.csv           # Itemized income deductions (tax, contributions)
├── recurring_rules.csv      # Subscriptions and scheduled movements
├── savings_goals.csv        # Goals and accumulated savings
├── loans.csv                # Active and completed loans/debts
└── wishlist.csv             # Planned purchases
```

### 6. 🎨 Theming & PanelUI Components
- Built with [PanelUI](https://panelui.dev) and Tailwind CSS (Uniwind) on React Native Reanimated.
- Supports 6 themes across 3 theme families (**Panel**, **Moon**, and **Grass**) in both **Light** and **Dark** modes.
- Configurable currency symbols (`₱`, `$`, `€`, `£`, `¥`, `₹`, etc.).

---

## 📁 Project Structure

```
finance-tracker/
├── app/
│   ├── _layout.tsx              # Root layout, ThemeProvider, PanelUIProvider, FinanceProvider
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Expo Router bottom tabs configuration
│   │   ├── index.tsx            # Dashboard (Net Worth, Safe-to-Spend, Cashflow, Quick Actions)
│   │   ├── ledger.tsx           # Full Transactions Ledger with search and filters
│   │   ├── accounts.tsx         # Accounts & Credit Cards with utilization tracking
│   │   ├── planning.tsx         # Savings Goals, Loans & Repayments, and Wishlist
│   │   ├── calculators.tsx      # Interactive financial calculators
│   │   └── settings.tsx         # Settings, Theme selector, and Backup/Restore hub
│   ├── modal-transaction.tsx    # Modal: Add/Edit movement (Income/Expense/Transfer)
│   ├── modal-account.tsx        # Modal: Add new account or credit card
│   ├── modal-goal.tsx           # Modal: Create savings goal
│   ├── modal-loan.tsx           # Modal: Record new loan / payable obligation
│   └── modal-wishlist.tsx       # Modal: Add wishlist item
├── src/
│   ├── database/
│   │   └── db.ts                # SQLite client, schema DDL, indexes, and starter seeds
│   ├── services/
│   │   ├── ledgerService.ts     # Core ledger transactions & atomic balance management
│   │   ├── accountService.ts    # Account CRUD and balance calculations
│   │   ├── categoryService.ts  # Category management
│   │   ├── recurringService.ts  # Subscription and recurring rules engine
│   │   ├── goalService.ts       # Savings goals and contribution transactions
│   │   ├── loanService.ts       # Loans, debt tracking, and repayment transactions
│   │   ├── wishlistService.ts   # Wishlist items & affordability assessment
│   │   ├── calculatorService.ts # Safe-to-spend, savings projector, debt payoff math
│   │   └── backupService.ts     # ZIP-of-CSVs export, inspection, and atomic restore
│   ├── context/
│   │   └── FinanceContext.tsx   # Reactive state provider synchronizing screens with SQLite
│   └── types/
│       └── database.ts          # TypeScript interfaces and data models
└── tests/
    ├── pure_calculators.test.ts # Unit tests for savings projection, debt payoff, and ZIP packing
    └── ledger_math.test.ts      # Unit tests for transfer isolation, deductions, and card debt
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v20 or later
- npm or pnpm or bun
- [Expo Go](https://expo.dev/go) app on your mobile device (iOS/Android) or an emulator/simulator

### Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd finance-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npx expo start
   ```
   - Scan the QR code with the **Expo Go** app on Android or the Camera app on iOS.
   - Or press `w` to open in a web browser.

---

## 🧪 Verification & Testing

### TypeScript Type Checking
Run the TypeScript compiler to ensure 100% type safety across the entire application:
```bash
npm run typecheck
```

### Automated Unit Tests
Run the automated test suite verifying ledger accounting, transfer isolation, deduction math, financial calculators, and ZIP backup integrity:
```bash
node --test tests/*.test.ts
```

---

## 🔒 Privacy & Offline First

All your financial data stays strictly on your device inside a local SQLite database (`finance_tracker.db`). No servers, analytics trackers, or third-party APIs have access to your money movements. Use the **ZIP Export** feature in Settings periodically to keep offline backups of your data.

