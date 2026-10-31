# Typography System & Emoji Removal Design Specification

**Created:** 2026-10-31 18:21 (Local Time)
**Status:** Approved
**Scope:** `@finance-tracker/mobile`

---

## 1. Problem Statement & Objectives

1. **Emoji & Emoticon Elimination**: The app currently uses emojis across offline chat responses, notifications, filter pill tabs, warning alerts, and badges (e.g., `✨ AI`, `🎉 Payday`, `❌`, `⚠️`, `💼`). Emojis detract from a serious, refined, banking-grade aesthetic and cause visual inconsistencies across mobile operating systems.
2. **Typography Consistency**: Screen headers, card titles, and monetary figures currently mix `font-black` (weight 900), `font-extrabold` (weight 800), and `font-bold` (weight 700) unpredictably. Some tabs used `font-black` for headers (`accounts.tsx`, `two.tsx`) while others used `font-bold` (`DashboardHeader.tsx`, `analytics.tsx`). Bottom navigation tabs also mixed `fontWeight: '600'` and `fontWeight: '700'`.

---

## 2. Design Decisions

### A. Strict Emoji Removal

- **Filter Pills (`accounts.tsx`)**: Replace `💼 Income & Jobs`, `🔄 Subscriptions`, `💳 Loans & Debt` with clean labels: `Income & Jobs`, `Subscriptions`, `Loans & Debt`.
- **Navigation Badges (`SidebarDrawer.tsx`)**: Change `✨ AI` badge to `AI`.
- **Chat Engine (`chatEngine.ts`)**: Remove all emoji prefixes (`❌`, `⚠️`, `✅`, `📊`, `🎉`, `💳`, `⏰`, `🏦`, `💰`, `👋`) from rule-based answers while maintaining markdown bolding and clean formatting.
- **Chat Assistant (`assistant.tsx`)**: Remove emojis from welcome greeting, offline fallback indicator, error messages, and clear confirmations.
- **Gemini System Prompt (`geminiService.ts`)**: Add explicit negative constraint instructing the model never to use emojis or emoticons in its generated responses.
- **Salary & Loan Notifications / Modals**: Remove party poppers (`🎉`), paper icons (`📄`), bells (`🔔`), money bags (`💰`), and hazard icons (`⚠️`) from titles and alert descriptions.

### B. Standardized Typography Scale

| Hierarchy Role          | Tailwind Classes                                                       | Target Visual           | Where Used                                          |
| :---------------------- | :--------------------------------------------------------------------- | :---------------------- | :-------------------------------------------------- |
| **Screen Title**        | `text-2xl font-bold tracking-tight text-foreground` / `text-stone-900` | 24px, 700 weight        | Screen headers across all 5 tabs                    |
| **Hero Balance**        | `text-3xl font-bold tracking-tight` (or `text-4xl` for BalanceHero)    | 30px / 36px, 700 weight | Dashboard total liquid balance, Transaction amounts |
| **Section Title**       | `text-lg font-bold tracking-tight text-stone-900`                      | 18px, 700 weight        | Modal titles, Sheet headers, Card section headers   |
| **Card / List Title**   | `text-base font-semibold text-stone-900`                               | 16px, 600 weight        | Account name, Job title, Loan provider              |
| **Form Labels & Body**  | `text-sm font-medium text-stone-700`                                   | 14px, 500 weight        | Form inputs, descriptions, modal field labels       |
| **Secondary Metadata**  | `text-xs font-medium text-stone-500`                                   | 12px, 500 weight        | Screen subtitles, card subtitles, pocket tags       |
| **Badges / Micro Tags** | `text-[10px]` / `text-[11px] font-semibold tracking-wider uppercase`   | 10–11px, 600 weight     | Status badges, category pills, timestamps           |

### C. Elimination of Extreme Font Weights

- All occurrences of `font-black` (900) and `font-extrabold` (800) are mapped to `font-bold` (700).
- Bottom navigation tab labels (`_layout.tsx`) standardized to `fontWeight: '600'`.

---

## 3. Verification Plan

- `npm run typecheck`: Confirm TypeScript compilation across the monorepo.
- `npm run test --workspace=@finance-tracker/mobile`: Verify all 25 test suites pass without regression.
- Unicode regex scan: Ensure zero emoji occurrences remain in `apps/mobile/src` and `apps/mobile/app`.

