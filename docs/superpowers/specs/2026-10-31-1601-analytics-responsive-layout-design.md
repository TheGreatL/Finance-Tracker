# Analytics Screen Responsive Layout Design Specification

**Created:** 2026-10-31 16:01 (Local Time)  
**Status:** Approved  
**Author:** Antigravity

---

## 1. Problem Statement & User Need

In [`apps/mobile/app/(tabs)/analytics.tsx`](<file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/analytics.tsx>), several components suffer from responsiveness and layout overflow issues on varying mobile screen widths (e.g. 360px–390px mobile screens, devices with enlarged display scale or system font zoom, and large monetary numbers):

1. **Fixed Horizontal Padding & Margins**: Cards use `mx-5 p-5` (80px total horizontal spacing), squeezing available content width down to ~280px on standard Android/iOS screens.
2. **Fixed Monthly Commitments Banner Overflow** (line 183-196): Long header titles ("Fixed Monthly Commitments", "Recurring bills & mandatory debt") sit alongside a large formatted currency string without `flex-1`, `min-w-0`, or `flex-shrink-0`, causing horizontal collision or text clipping.
3. **Inflow / Outflow Split**: Total Inflow and Outflow cards lack equal flex partitioning (`flex-1`), causing multi-digit financial numbers to collide or wrap awkwardly.
4. **Header / Metric Collision Across All Cards**:
    - Subscriptions Card: Header and metric column totals wrap or clip when currency amounts exceed 5 digits.
    - Loans & Debt Obligations: Outstanding debt vs Monthly due and the repayment progress label ("Repaid ₱X of ₱Y") clip against percentage badges.
    - Category Spending: Long category names lack `flex-1` and `ellipsizeMode="tail"`, causing overlap with amount badges.
    - Asset Allocation: Long names ("Traditional & Digital Banks") push right-hand formatted balances off-screen.

---

## 2. Design Principles & Solution Strategy

### 2.1 Responsive Spacing

- Adjust card outer margins and inner padding to `mx-4 sm:mx-5 mb-4 p-4 sm:p-5` to gain 16px of horizontal space on compact mobile devices while preserving aesthetic proportions on tablets/larger phones.

### 2.2 Strict Flex Boundaries & Text Truncation Safety

- **Two-Column Header Rows**: Always wrap left title groupings in `flex-1 min-w-0 mr-2` and right actions/amounts in `flex-shrink-0 items-end`.
- **Text Labels**: Apply `numberOfLines={1}` and `ellipsizeMode="tail"` on descriptive labels that could otherwise push numbers off-screen.
- **Large Currency Amounts**: Apply `numberOfLines={1}` with `adjustsFontSizeToFit` and `minimumFontScale={0.8}` so high-value amounts dynamically scale down cleanly rather than breaking across multiple lines.

### 2.3 Equal-Width Split Grids

- Inflow vs Outflow: Use `flex-1` on both items with appropriate internal padding and alignment.
- Fixed Commitment Badges: Ensure both sub-cards (Subscriptions & Loan Repayments) handle long currency amounts with font scaling.

---

## 3. Targeted Components in `analytics.tsx`

| Section                          | Issue                                                       | Fix                                                                        |
| -------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| **1. Cash Flow Summary**         | Inflow / Outflow amounts collide when amounts are large     | `flex-1` on both halves, `numberOfLines={1}`, `adjustsFontSizeToFit`       |
| **2. Fixed Monthly Commitments** | Header title + large `/mo` amount collide (line 183-196)    | Left `flex-1 min-w-0 mr-2`, Right `flex-shrink-0 items-end`                |
| **3. Recurring Subscriptions**   | Metric columns and list row amounts lack shrink/flex bounds | Left `flex-1 min-w-0`, Right `flex-shrink-0`, `adjustsFontSizeToFit`       |
| **4. Loans & Debt Obligations**  | Outstanding debt header & progress bar labels collide       | Repayment label `flex-1 min-w-0 mr-2`, right percentage `flex-shrink-0`    |
| **5. Spending by Category**      | Long category names collide with currency + percentage      | Left `flex-1 min-w-0 mr-2` with `numberOfLines={1}`, Right `flex-shrink-0` |
| **6. Asset Allocation**          | "Traditional & Digital Banks" overflows and pushes balance  | Left `flex-1 min-w-0 mr-2` with `numberOfLines={1}`, Right `flex-shrink-0` |

---

## 4. Verification Plan

1. Typecheck: `npm run typecheck` passes with zero errors.
2. Mobile unit tests: `npm run test --workspace=@finance-tracker/mobile` passes all 132 tests.
3. Code formatting: Run Prettier.
