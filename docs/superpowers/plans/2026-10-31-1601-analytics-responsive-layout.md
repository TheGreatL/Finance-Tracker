# Analytics Screen Responsive Layout Implementation Plan

**Created:** 2026-10-31 16:01 (Local Time)  
**Spec Reference:** [`docs/superpowers/specs/2026-10-31-1601-analytics-responsive-layout-design.md`](file:///c:/Users/user/Desktop/projects/finance-tracker/docs/superpowers/specs/2026-10-31-1601-analytics-responsive-layout-design.md)  
**Status:** In Progress

---

## 1. Goal

Fix the responsiveness of all cards and components in [`apps/mobile/app/(tabs)/analytics.tsx`](<file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/analytics.tsx>) so that layouts adapt cleanly to narrow screens, large font zoom, and high currency figures without clipping or horizontal overflow.

---

## 2. Step-by-Step Execution Plan

### Step 1: Update Card Outer Spacing & Cash Flow Summary Card

- Update card margins and paddings: `mx-4 sm:mx-5 mb-4 p-4 sm:p-5`.
- In Cash Flow Card:
    - Wrap net savings in `flex-1 min-w-0 mr-3`.
    - Partition Inflow and Outflow into equal `flex-1` columns with `numberOfLines={1}` and `adjustsFontSizeToFit`.

### Step 2: Fix Fixed Monthly Commitments Banner (Lines 180-220)

- In the banner header:
    - Wrap the left icon + title/subtitle in `flex-row items-center flex-1 min-w-0 mr-2`.
    - Add `numberOfLines={1}` on title text with `ellipsizeMode="tail"`.
    - Wrap the right `/mo` total in `flex-shrink-0 items-end` with `numberOfLines={1}`.
- In the two sub-cards:
    - Add `numberOfLines={1}` and `adjustsFontSizeToFit` to Subscriptions `/mo` and Loan Repayments `/mo` amounts.

### Step 3: Fix Recurring Subscriptions Analytics Card (Lines 222-316)

- Wrap header left in `flex-row items-center flex-1 min-w-0 mr-2`.
- Set `flex-shrink-0` on "Manage" button.
- Add `numberOfLines={1}` and `adjustsFontSizeToFit` on Monthly Total and Annual Cost metric cards.
- In subscription list items, ensure left container is `flex-1 min-w-0 mr-2` and right price container is `flex-shrink-0 items-end`.

### Step 4: Fix Loans & Debt Obligations Analytics Card (Lines 318-449)

- Wrap header left in `flex-row items-center flex-1 min-w-0 mr-2`, right button in `flex-shrink-0`.
- In Outstanding Debt progress box:
    - Left outstanding debt: `flex-1 min-w-0 mr-3`.
    - Right monthly due: `flex-shrink-0 items-end`.
    - Progress label: left "Repaid ₱X of ₱Y" is `flex-1 min-w-0 mr-2` with `numberOfLines={1}`, right percentage is `flex-shrink-0`.
- In active loans list:
    - Left container: `flex-1 min-w-0 mr-2`.
    - Right container: `flex-shrink-0 items-end`.

### Step 5: Fix Category Spending Breakdown & Asset Allocation (Lines 451-563)

- In Category Breakdown:
    - Left category info: `flex-row items-center flex-1 min-w-0 mr-2` with `numberOfLines={1}` on category name.
    - Right values: `flex-shrink-0 items-end`.
- In Asset Allocation:
    - Left info: `flex-row items-center flex-1 min-w-0 mr-2`.
    - Title text: `numberOfLines={1}` with `ellipsizeMode="tail"`.
    - Right total: `flex-shrink-0 items-end`.

### Step 6: Verification & Git Commit

- Run `npm run typecheck` across the monorepo.
- Run `npm run test --workspace=@finance-tracker/mobile`.
- Format with Prettier and commit changes.
