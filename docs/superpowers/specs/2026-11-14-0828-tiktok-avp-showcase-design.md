# TikTok UI Showcase AVP (`apps/avp`) Design Specification

**Created:** 2026-11-14 08:28 (Local Time)

## 1. Intent & Why

We need a **75-second** (within the 60s–90s target) vertical (`9:16`, `1080×1920`) Audio-Visual Presentation (AVP) built to upload directly to **TikTok**. The video showcases every major UI screen and workflow of the **Personal Finance Tracker** mobile app using kinetic typography, smooth spring-driven UI animations, zoomed card callouts, and baked-in instrumental music + tactile UI sound effects — **with zero AI-generated footage, avatars, or AI voiceovers**.

---

## 2. Goals, Non-Goals, and Anti-Goals

### 2.1 Goals

1. **Real Screen Captures from Your `Pixel_7a` (`emulator-5554`) Android Virtual Device:**
    - Launch and drive `apps/mobile` directly on your connected **`Pixel_7a` (`emulator-5554`)** AVD via `adb -s emulator-5554` (`screencap -p` and `shell input tap/swipe`).
    - Capture crisp, native-resolution PNG screenshots (`apps/avp/public/screens/*.png`) of every tab, detail sheet, and modal from the live emulator.
2. **Complete Per-UI Feature Tour in 75 Seconds (`2,250 frames @ 30fps`):**
    - Showcase all 5 main bottom tabs (**Dashboard**, **Accounts**, **Advisor**, **Ledger**, **Analytics**) and the **Sidebar / Obligations** screens (**Multi-Job Salary & Payslips**, **Loans & Debt**, **Subscriptions**, **JSON Backup**).
3. **Authentic App UI & Brand Identity:**
    - Display the real `Pixel_7a` emulator captures inside an animated phone frame, paired with magnified (`1.15x–1.35x`) floating callout cards using the app's exact palette from `apps/mobile/global.css`:
        - Deep Forest Emerald backgrounds (`#0E1B16` and `#18342B`)
        - Primary Sage/Lime accent (`#BBD583`)
        - Warm Off-White surfaces (`#F9FAF7` and `#FFFFFF`)
        - Muted Sage (`#EBF0E6`, `#5C6E63`) and Terracotta expense accents (`#C2410C`, `#D97757`)
    - Render authentic Philippine institution SVG badges (BDO, BPI, UnionBank, GCash, Maya, GoTyme, SeaBank) and subscription logos (Netflix, Spotify, YouTube Premium, ChatGPT Plus).
4. **TikTok-Safe Vertical Framing (`1080×1920`):**
    - Respect TikTok in-feed UI safe zones:
        - **Top Safe Margin:** `180px` (clear of status bar / search header)
        - **Right Safe Margin:** `130px` on zoomed callout cards (clear of TikTok profile, like, comment, share buttons)
        - **Bottom Safe Margin:** `360px` for critical text/captions (clear of TikTok creator handle, caption text, and audio marquee)
5. **Baked-In Synchronized Audio (No AI Voiceover):**
    - Synthesize a crisp stereo `.wav` soundtrack locally via a deterministic Node script (`apps/avp/scripts/generate-audio.ts`):
        - **Background Groove:** Upbeat, modern warm synth-pluck & soft percussion beat (116 BPM) normalized with headroom.
        - **Frame-Accurate UI SFX:** Subtle tactile clicks, card pop-ins, coin/payday chimes, and scene-transition whooshes aligned to exact frame timestamps of the 7 scenes.

### 2.2 Non-Goals & Anti-Goals

- **No AI Video / Avatar / TTS Models:** Do not call Veo, Runway, HeyGen, ElevenLabs, or Gemini TTS.
- **No Wall-of-Text Slides:** Keep kinetic headlines to 3–6 words per beat, paired with a zoomed-in interactive UI demonstration so viewers on a phone screen can immediately read every number and label.
- **No Unreadable Wide Shots:** Whenever showing a phone screen, pair the full phone frame with floating, magnified (`1.15x–1.35x`) UI callout cards that spring forward into the foreground.

---

## 3. Approaches Considered

| Approach                                    | Description                                                                                                                                                           | Trade-offs                                                                                                                         | Decision     |
| :------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| **1. Remotion Workspace (`apps/avp`)**      | Add a dedicated `apps/avp` package in the Turborepo using React + TypeScript + Remotion (`remotion`, `@remotion/cli`, `@remotion/renderer`, `@remotion/transitions`). | 100% local, zero external accounts, shares TypeScript/React ecosystem and SVG brand assets, deterministic MP4 output via `ffmpeg`. | **Selected** |
| **2. Playwright + `invideo` Timeline**      | Capture web screens with Playwright and assemble on the cloud `invideo` timeline.                                                                                     | Requires interactive `invideo auth login` and cloud media uploads.                                                                 | Rejected     |
| **3. Hyperframes (`hyperframes` + `gsap`)** | Single HTML/CSS/GSAP file rendered via headless Chromium.                                                                                                             | Doesn't reuse React component patterns or JSX SVG logos from `apps/mobile`.                                                        | Rejected     |

---

## 4. Scene-by-Scene Storyboard & Timing (`75.0s = 2,250 Frames @ 30fps`)

Each scene uses Remotion `<Sequence>` blocks with spring physics (`spring({ frame, fps, config: { damping: 14, stiffness: 120 } })`) and crisp kinetic typography in the upper safe zone (`Y: 190px–430px`), the interactive Phone Frame in the center (`Y: 450px–1540px`), and zoomed floating UI callout cards that pop out over the frame.

| Scene                                    | Time              | Frames      | UI Screen Showcased                                                    | Visual & Animation Beats                                                                                                                                                                                                                                                                            | Audio SFX Cues                                        |
| :--------------------------------------- | :---------------- | :---------- | :--------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------- |
| **1. Hook & Dashboard Hero**             | `0:00–0:10` (10s) | `0–299`     | **Dashboard (`index.tsx`)** + **Sidebar Drawer**                       | Kinetic hook: _"Track Every Peso. 100% Offline."_ Phone springs in showing `BalanceHeroCard` counting up to `₱78,400.00` (`+₱45,000` Income / `-₱2,130.50` Expenses), `FinancialPulseStrip`, and `RecentTransactionsList` with dual-cue `CategoryIcon` + `PocketBadge`.                             | Intro riser + counter tick + card pop                 |
| **2. PH Banks, E-Wallets & Pockets**     | `0:10–0:22` (12s) | `300–659`   | **Accounts Tab (`accounts.tsx`)** + **InstitutionDetailSheet**         | Headline: _"All Your PH Banks & E-Wallets."_ Grid of BPI, BDO, Maya, GCash, GoTyme, SeaBank logos springs in. Zooms into **Maya Institution Detail Sheet** highlighting separate pockets: `Main Wallet (₱2,500)` + `Personal Savings (₱50,000 @ 4.5% p.a.)`.                                        | Whoosh transition + staggered pop for each bank badge |
| **3. Multi-Job Salary & Payslips**       | `0:22–0:35` (13s) | `660–1049`  | **Salary & Jobs** + **`RecordPaydayModal`** + **`PaySlipDetailModal`** | Headline: _"Multi-Job Payroll & Auto-Payslips."_ Shows Full-Time + Freelance jobs. Magnifies `RecordPaydayModal` adding **Overtime (`+₱3,500`)** & **Holiday Pay (`+₱2,000`)**, auto-computing **SSS, PhilHealth, Pag-IBIG & Tax**, and stamping an itemized **Payslip Receipt** into BPI Checking. | UI click + calculator tick + payday chime             |
| **4. Loans, Tenor & Cashback**           | `0:35–0:47` (12s) | `1050–1409` | **Loans & Debt** + **`LoanCard`** + **Early Payoff Cashback**          | Headline: _"Crush Debt & Claim Cashback."_ Displays Institutional (GCash GLoan, Maya Credit, BillEase) & P2P loans. Dual progress bars animate (**Monetary %** + **`4 / 12 mos elapsed`**). Final payment triggers **Early Payoff Interest Cashback (`+₱1,250 Rebate`)** credited back to GCash.    | Progress bar sweep + cashback coin chime              |
| **5. Subscriptions & Offline Catch-Up**  | `0:47–0:56` (9s)  | `1410–1679` | **Subscriptions** + **`NotificationCenterModal`**                      | Headline: _"Never Miss a Renewal."_ Cards for Netflix, Spotify, YouTube Premium, ChatGPT Plus animate in with normalized monthly spend (`₱1,847/mo`). Simulates billing day: **Auto-Deducted from Maya** toast + **Notification Center** badge alert.                                               | Pop sequence + notification bell ping                 |
| **6. Ledger & Analytics Breakdown**      | `0:56–1:05` (9s)  | `1680–1949` | **Ledger (`two.tsx`)** + **Analytics (`analytics.tsx`)**               | Headline: _"Visual Cashflow & Net Worth."_ Split/flip transition from atomic **Transfer (`BPI → Maya Savings ₱10,000`)** in the Ledger to the **Analytics** screen: animated `IncomeVisualBreakdownChart` (Gross vs. Deductions vs. Net) and Category Spend bars.                                   | Flip whoosh + chart bar growth ticks                  |
| **7. PocketBot Advisor & Privacy Outro** | `1:05–1:15` (10s) | `1950–2249` | **Advisor (`assistant.tsx`)** + **Backup Card** + **End Card**         | Headline: _"Ask PocketBot Before You Spend."_ User bubble asks: _"Kaya ba bumili ng ₱15k phone?"_ → PocketBot replies with a **SAFE Verdict** badge + projected balance. Transitions to clean End Card: **Personal Finance Tracker** logo lockup, `100% On-Device SQLite • Private by Design`.      | Chat send pop + bot reply chime + warm final chord    |

---

## 5. Architecture & File Structure

We will create a new workspace package at `apps/avp` (automatically matched by `"workspaces": ["apps/*", "packages/*"]` in root `package.json`):

```text
apps/avp/
├── package.json                     # @finance-tracker/avp (remotion, @remotion/cli, @remotion/renderer, lucide-react)
├── tsconfig.json
├── remotion.config.ts
├── public/
│   ├── screens/                     # Real PNG screenshots captured from Pixel_7a (emulator-5554) via adb screencap
│   │   ├── 01-dashboard.png
│   │   ├── 02-sidebar.png
│   │   ├── 03-accounts.png
│   │   ├── 04-institution-detail.png
│   │   ├── 05-obligations-salary.png
│   │   ├── 06-obligations-loans.png
│   │   ├── 07-obligations-subscriptions.png
│   │   ├── 08-ledger.png
│   │   ├── 09-analytics.png
│   │   └── 10-advisor.png
│   └── audio/
│       └── soundtrack.wav           # Generated 75s stereo 44.1kHz WAV (music bed + frame-synced UI SFX)
├── scripts/
│   ├── capture-avd-screens.ts       # Drives Pixel_7a (emulator-5554) via adb input & captures native screenshots
│   └── generate-audio.ts            # Deterministic PCM synthesizer for background groove + scene SFX cues
├── src/
│   ├── index.ts                     # registerRoot(RemotionRoot)
│   ├── Root.tsx                     # <Composition id="TikTokAVP" width={1080} height={1920} fps={30} durationInFrames={2250} />
│   ├── TikTokAVP.tsx                # Master timeline orchestrating Scenes 1–7, transitions, progress bar, and <Audio />
│   ├── constants/
│   │   └── theme.ts                 # Exact palette, TikTok safe-zone metrics, PH bank/subscription metadata & SVG paths
│   ├── components/
│   │   ├── PhoneFrame.tsx           # Realistic Pixel 7a bezel displaying real captured AVD screens + pan/zoom camera
│   │   ├── KineticHeader.tsx        # Upper safe-zone animated pill tag + bold headline + subtitle
│   │   ├── FloatingCalloutCard.tsx  # Spring-animated zoomed UI card with drop shadow and highlight ring
│   │   └── BrandLogos.tsx           # BPI, BDO, Maya, GCash, GoTyme, SeaBank, Netflix, Spotify, YT, ChatGPT SVGs
│   └── scenes/
│       ├── Scene1Dashboard.tsx
│       ├── Scene2AccountsPockets.tsx
│       ├── Scene3SalaryPayslips.tsx
│       ├── Scene4LoansCashback.tsx
│       ├── Scene5Subscriptions.tsx
│       ├── Scene6LedgerAnalytics.tsx
│       └── Scene7AdvisorOutro.tsx
└── out/
    └── finance-tracker-tiktok-avp.mp4
```

---

## 6. Verification & Quality Criteria

1. **Automated Build & Render Verification:**
    - `npm run generate:audio --workspace=@finance-tracker/avp` generates `public/audio/soundtrack.wav` (exact 75.0s duration, valid PCM WAV header, non-zero amplitude, no clipping).
    - `npm run typecheck --workspace=@finance-tracker/avp` passes with 0 TypeScript errors.
    - `npm run build:video --workspace=@finance-tracker/avp` renders `apps/avp/out/finance-tracker-tiktok-avp.mp4` (`1080×1920`, H.264 video + AAC audio, 75.0s duration).
2. **Visual & Audio Frame Inspection:**
    - Verify rendered video stream metadata with `ffprobe` (`1080x1920`, `30fps`, `75.0s`, `h264` + `aac`).
    - Extract sample frames across all 7 scenes into a contact sheet / frame set using `ffmpeg` and inspect them via `read_file` to confirm legibility, brand fidelity, zero clipped text, and TikTok safe-zone compliance.
