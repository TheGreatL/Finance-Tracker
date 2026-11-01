---
target_identity: "file:C:\\Users\\user\\Desktop\\projects\\finance-tracker\\apps\\mobile\\src\\components\\loans\\LoanDetailSheet.tsx"
target_fingerprint: 'sha256:5e9e6ee9c0b46da07e58d0fb9c7893bb3abc1acf9768b784c1a497fab10797a9'
target_path: "C:\\Users\\user\\Desktop\\projects\\finance-tracker\\apps\\mobile\\src\\components\\loans\\LoanDetailSheet.tsx"
timestamp: 2026-11-01T03-21-23Z
slug: src-components-loans-loandetailsheet-tsx-ccfd7988
---

### Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                                         |
| --------- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 4         | Stepper node states (Paid, Partially Paid, Upcoming) provide instant clarity on repayment status. |
| 2         | Match System / Real World       | 3         | Follows standard digital lending ledger conventions; needs handling for irregular personal loans. |
| 3         | User Control and Freedom        | 3         | "Hide Paid" toggle allows decluttering; lacks direct "Pay this installment" trigger.              |
| 4         | Consistency and Standards       | 3         | Status pill colors (Green, Amber, Gray) align with standard financial semantics.                  |
| 5         | Error Prevention                | 3         | Prominently showing the exact residual balance (₱854.01) prevents accidental over/under-payment.  |
| 6         | Recognition Rather Than Recall  | 4         | Complete eradication of mental math; exact installment slots replace vague calendar tenure.       |
| 7         | Flexibility and Efficiency      | 3         | Collapsible list speeds up scanning; needs default auto-collapse for older settled months.        |
| 8         | Aesthetic and Minimalist Design | 3         | High clarity, but risks creating a long "scroll wall" inside an already tall bottom sheet.        |
| 9         | Error Recovery                  | 3         | Clearly isolates partial payments rather than failing silently or mislabeling the cycle.          |
| 10        | Help and Documentation          | 3         | Clear status indicators; could benefit from inline microcopy explaining advance roll-forward.     |
| **Total** |                                 | **32/40** | **Good**                                                                                          |

### Design Specificity Verdict

**LLM assessment**: The proposed plan solves the acute mental model disconnect where calendar tenure ("Month 2 of 12") conflicted with financial prepayment. However, to meet true **Gold Standard** mobile craft, it cannot simply be a copy of GCash's full-screen list pasted into our React Native modal bottom sheet. It requires compact node density, native tactile feedback, an accordion wrapper, and a dynamic "Pay Next Residual" action that directly addresses the active partial payment.

**Deterministic scan**: not applicable (native platform)

**Visual overlays**: not applicable (native platform)

### Overall Impression

The plan is functionally sound and addresses the exact root cause of user confusion. To elevate it from "functional copy" to "Gold Standard" craft, we must refine the spatial hierarchy inside the modal sheet, ensure one-tap contextual payment actions, and add mathematical transparency to partial payments.

### What's Working

1. **Accurate Mental Model Mapping**: Replacing generic calendar elapsed time with a waterfall amortization ledger directly matches how borrowers understand debt retirement.
2. **"Hide Paid" Cognitive Filter**: Giving users the power to hide historical noise keeps the screen actionable and focused on the future.
3. **Partial Payment Status Differentiation**: Introducing the distinct Amber `[PARTIALLY PAID]` state with the exact remaining balance (e.g. ₱854.01) eliminates any panic about "missing" money.

### Priority Issues

- **[P1] Modal Sheet "Scroll Wall" & Cognitive Overload**
    - **Why it matters**: In mobile bottom sheets (`max-h-[90%]`), stacking 12–24 vertical stepper items below existing financial cards pushes the primary action button offscreen and overwhelms thumb navigation.
    - **Fix**: Wrap the timeline in a dedicated collapsible card (`Installment Schedule • 3 Settled, 1 Due`) with a compact timeline layout and auto-collapse past paid months by default.
    - **Suggested command**: `$impeccable layout`

- **[P1] One-Tap Contextual Payment Pre-fill**
    - **Why it matters**: Currently, tapping "Record Loan Payment" defaults to the standard monthly payment (`₱2,284.67`). If Month 4 is partially paid (only `₱854.01` due), defaulting to `₱2,284.67` causes user error and confusion.
    - **Fix**: Tapping the active installment or the primary CTA should dynamically pre-fill the exact remaining residual balance (`₱854.01`).
    - **Suggested command**: `$impeccable clarify`

- **[P2] Partial Payment Math Transparency**
    - **Why it matters**: Users seeing `₱854.01` might wonder how that strange number was derived if they don't recall their prior excess payment.
    - **Fix**: Expandable chevron on partially paid items detailing: `Scheduled: ₱2,284.67 • Advance Credit: -₱1,430.66 • Remaining Due: ₱854.01`.
    - **Suggested command**: `$impeccable delight`

- **[P2] Graceful Degradation for Irregular / Non-amortized Loans**
    - **Why it matters**: Personal loans from friends or credit lines without fixed `term_months` would break a rigid 12-month installment generator.
    - **Fix**: Render the installment stepper only when `term_months` and `monthly_payment` are valid; fall back to a chronological transaction ledger for unstructured loans.
    - **Suggested command**: `$impeccable harden`

### Persona Red Flags

**Casey (Distracted Mobile User)**:

- Must scroll through 12 vertical cards on a phone screen just to reach the "Record Payment" button.
- Risk: Sheet scrolls endlessly; thumb cannot reach primary action without aggressive flicking.

**Jordan (Confused First-Timer)**:

- Sees `₱854.01` under January and worries that an unexpected penalty or fee was assessed.
- Risk: Hesitates to pay because the difference between `₱2,284.67` and `₱854.01` is not explained inline.

**Riley (Financial Auditor / Stress Tester)**:

- Checks if interest cashback is calculated correctly when advance payments are made.
- Risk: Wonders whether paying 3 months early reduced the interest owed or if interest was front-loaded without rebate.

### Minor Observations

- Stepper connectors should be dotted for future/upcoming cycles and solid emerald for past paid cycles.
- Include a subtle "Settled Early" micro-badge on installments paid ahead of their calendar due date to provide positive reinforcement.

### Questions to Consider

- Should the active installment card be visually highlighted (e.g. subtle amber border or elevated card) to immediately draw the eye when opening the sheet?
- Would users benefit from a "Next Due" summary chip right in the sheet header before scrolling down to the timeline?
