# Typography System & Emoji Removal Implementation Plan

**Created:** 2026-10-31 18:21 (Local Time)
**Status:** Approved

---

## Tasks

### Phase 1: Complete Emoji & Emoticon Elimination

- [ ] In `apps/mobile/src/services/chatEngine.ts`: Strip emojis (`❌`, `⚠️`, `✅`, `📊`, `🎉`, `💳`, `⏰`, `🏦`, `💰`, `👋`) from offline assistant text templates.
- [ ] In `apps/mobile/src/services/geminiService.ts`: Add rule prohibiting emojis in AI responses.
- [ ] In `apps/mobile/app/(tabs)/assistant.tsx`: Strip emojis from welcome message, offline fallback notice, error text, and clear notification.
- [ ] In `apps/mobile/app/(tabs)/accounts.tsx`: Clean emoji icons (`💼`, `🔄`, `💳`) from filter pills.
- [ ] In `apps/mobile/src/components/navigation/SidebarDrawer.tsx`: Change `badge="✨ AI"` to `badge="AI"`.
- [ ] In `apps/mobile/src/components/salary/JobCard.tsx`, `JobDetailSheet.tsx`, `UpcomingPaydayBanner.tsx`: Strip `🎉` from `'Payday Today'`.
- [ ] In `apps/mobile/src/components/salary/PaySlipDetailModal.tsx`: Strip `📄` from receipt title.
- [ ] In `apps/mobile/src/components/salary/salaryService.ts`: Strip `💰` from payday notification title.
- [ ] In `apps/mobile/src/components/loans/AddLoanModal.tsx`: Strip `🔔` from helper text.
- [ ] In `apps/mobile/src/components/dashboard/DatabaseManagementCard.tsx`: Strip `⚠️` from alert warning.

### Phase 2: Typography & Font Scale Normalization

- [ ] In `apps/mobile/app/(tabs)/_layout.tsx`: Standardize `tabBarLabel` style so Advisor tab matches `fontWeight: '600'`.
- [ ] In `apps/mobile/app/(tabs)/accounts.tsx` and `two.tsx`: Replace `font-black` on screen titles with `font-bold`.
- [ ] In `apps/mobile/app/(tabs)/accounts.tsx` and `analytics.tsx`: Replace `font-black` and `font-extrabold` in stats with `font-bold`.
- [ ] In `apps/mobile/src/components/dashboard/BalanceHeroCard.tsx` and `DashboardHeader.tsx`: Normalize font weights to `font-bold`.
- [ ] In salary, loan, subscription, and transaction components: Replace all occurrences of `font-black` and `font-extrabold` with `font-bold`.

### Phase 3: Automated Verification

- [ ] Run Node emoji scanner script to verify 0 emoji occurrences.
- [ ] Run `npm run typecheck` across monorepo.
- [ ] Run `npm run test --workspace=@finance-tracker/mobile`.
- [ ] Format files with Prettier.
- [ ] Commit to `main` with `BypassSandbox: true`.

