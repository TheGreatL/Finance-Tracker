# Live Money Input Real-Time Formatting Design Specification

**Created:** 2026-10-31 15:52 (Local Time)  
**Status:** Approved  
**Author:** Antigravity

---

## 1. Executive Summary & Objective

In financial and budgeting applications, entering numbers into input fields without thousands separators causes cognitive friction (e.g., distinguishing `10000` from `100000`).

The user requested:

> "Since majority of our input are money numbers, is it possible that you will convert our input into a money format.
> ex:
> when we are inputting 3 digit and going to 4, the current number input are in thousands, so a human readable format is we will append separate the 3 and one digit with \",\" also same with the decimals"

This specification details a robust, real-time input formatting utility (`formatMoneyInput`) and numeric parser (`parseMoneyInput`) designed for React Native text inputs across all modals in `@finance-tracker/mobile`.

---

## 2. Behavioral Requirements & Edge Cases

### 2.1 Live Formatting Requirements (`formatMoneyInput`)

1. **Real-time Thousands Separation**:
    - As the user types digits into the integer part, digits are grouped in triads separated by commas (`,`).
    - Example: `1` $\rightarrow$ `1`, `12` $\rightarrow$ `12`, `123` $\rightarrow$ `123`, `1234` $\rightarrow$ `1,234`, `12345` $\rightarrow$ `12,345`, `1000000` $\rightarrow$ `1,000,000`.
2. **Decimals Support**:
    - Supports user typing `.` or pasting decimal amounts.
    - When user types `.`, formats as `1,234.` without prematurely appending or stripping decimals while mid-typing.
    - When user types leading `.`, formats as `0.` so decimal entry is immediately clear.
    - Supports up to 2 decimal places (e.g., `1,234.5` and `1,234.50`). Excess decimal digits beyond 2 are trimmed.
3. **Leading Zero Normalization**:
    - Typing leading zeroes before non-zero digits normalizes cleanly: `05` $\rightarrow$ `5`, `007` $\rightarrow$ `7`.
    - Single zero is preserved: `0` $\rightarrow$ `0`, `0.` $\rightarrow$ `0.`, `0.5` $\rightarrow$ `0.5`.
4. **Smooth Backspacing & Deletion**:
    - Backspacing trailing digits, decimal digits, the decimal point, or integer digits must not lock up or re-insert removed characters.
    - Deleting the final character leaves an empty string `""`, allowing placeholders (e.g. `0.00`) to show.
5. **Non-numeric Sanitization**:
    - Strips non-digit and non-decimal characters (e.g., letters, multiple dots, currency signs like `₱` or `$`).
6. **Keyboard Type**:
    - Standardize `keyboardType="decimal-pad"` so numeric keypad with decimal dot is available on both iOS and Android.

### 2.2 Parser Requirements (`parseMoneyInput`)

1. Strips all thousands comma separators (`,`).
2. Safely parses float using `parseFloat`.
3. Returns `0` for empty strings, isolated dots, or invalid values.

---

## 3. Targeted Form Modals & Inputs

| Modal                     | Component File             | Form Input(s)                                           | State Variable(s)                                            |
| ------------------------- | -------------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| **Add Account**           | `AddAccountModal.tsx`      | Starting Base Money (₱)                                 | `startingBalanceStr`                                         |
| **Add Pocket**            | `AddPocketModal.tsx`       | Starting Balance (₱)                                    | `startingBalanceStr`                                         |
| **Add Loan**              | `AddLoanModal.tsx`         | Total Loan (₱), Remaining Debt (₱), Monthly Payment (₱) | `totalAmountStr`, `remainingBalanceStr`, `monthlyPaymentStr` |
| **Edit Loan**             | `EditLoanModal.tsx`        | Monthly Payment (₱)                                     | `monthlyPaymentStr`                                          |
| **Loan Payment**          | `LoanPaymentModal.tsx`     | Amount to Pay (₱)                                       | `amountStr`                                                  |
| **Add/Edit Subscription** | `AddSubscriptionModal.tsx` | Billing Amount (₱)                                      | `amountStr`                                                  |
| **Transaction Form**      | `TransactionFormModal.tsx` | Transaction Amount (₱)                                  | `amountStr`                                                  |

---

## 4. Architecture & Interface

In [`apps/mobile/src/utils/formatters.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/utils/formatters.ts):

```typescript
/**
 * Formats a raw user input string into real-time money display format with comma thousands separators.
 * Preserves incomplete decimal typing (e.g., "1,234." or "0.") and restricts to at most 2 decimal places.
 */
export function formatMoneyInput(raw: string): string;

/**
 * Safely parses a formatted money input string back into a numeric number.
 */
export function parseMoneyInput(formatted: string): number;
```

---

## 5. Verification Strategy

1. **Unit Tests** in `apps/mobile/tests/formatters.test.ts`:
    - Empty input `""` $\rightarrow$ `""`.
    - Single digit `5` $\rightarrow$ `5`.
    - 3 digits `999` $\rightarrow$ `999`.
    - 4 digits `1000` $\rightarrow$ `1,000`.
    - 7 digits `1000000` $\rightarrow$ `1,000,000`.
    - Trailing dot `1000.` $\rightarrow$ `1,000.`.
    - Single decimal `1000.5` $\rightarrow$ `1,000.5`.
    - Two decimals `1000.50` $\rightarrow$ `1,000.50`.
    - Three decimals capped at two `1000.509` $\rightarrow$ `1,000.50`.
    - Initial dot `.` $\rightarrow$ `0.`.
    - Multiple dots `1.2.3` $\rightarrow$ `1.23`.
    - Leading zeroes `0500` $\rightarrow$ `500`.
    - Parser tests for standard, formatted, empty, and partial strings.
2. **TypeScript Typecheck**:
    - `npm run typecheck` passes with zero errors.
3. **Full Test Suite**:
    - `npm run test --workspace=@finance-tracker/mobile` passes all tests.
