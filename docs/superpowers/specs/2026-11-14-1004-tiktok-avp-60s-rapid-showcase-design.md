# TikTok AVP 60s Rapid-Fire Showcase Design Specification

**Created:** 2026-11-14 10:04 (Local Time)
**Status:** Approved
**Target:** 60.0s (1800 frames @ 30fps), 1080×1920 (9:16), H.264 + AAC Stereo
**Target Platform:** TikTok (Strict Safe Zones: Top 180px, Right 130px, Bottom 360px)

---

## 1. Problem Statement & Motivation

The previous 75s AVP held individual screens for ~11–12 seconds each, creating noticeable "dead time" between text card appearances. On TikTok, audience retention drops rapidly if visual motion or new information stalls for more than 2–3 seconds.

This updated design eliminates dead time completely by compressing the pacing to a **60.0-second rapid-fire showcase** across **10 distinct 6-second scenes**, highlighting every feature of the Personal Finance Tracker application with continuous kinetic animations, camera micro-pans, and synchronized audio beats.

---

## 2. 10-Scene Timeline Breakdown (1,800 Frames Exact)

| Scene        | Frame Range   | Time Range    | Screen Capture Asset               | Feature Highlight & Motion                                                                                                  |
| :----------- | :------------ | :------------ | :--------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **Scene 1**  | `0 – 179`     | `0:00 – 0:06` | `01-dashboard.png`                 | **Instant Net Worth:** Animated ₱197,041.00 counter, income `+₱16.9k` / expense `-₱8.6k`, and upcoming payday.              |
| **Scene 2**  | `180 – 359`   | `0:06 – 0:12` | `02-sidebar.png`                   | **100% On-Device Privacy:** Navigation drawer, offline SQLite encryption badge, zero account linking required.              |
| **Scene 3**  | `360 – 539`   | `0:12 – 0:18` | `03-accounts.png`                  | **Philippine Financial Institutions:** Official brand marks (BPI, BDO, Maya, GCash, GoTyme, SeaBank) with balances.         |
| **Scene 4**  | `540 – 719`   | `0:18 – 0:24` | `04-institution-detail.png`        | **Nested High-Yield Pockets:** Everyday wallet vs. high-yield savings (4.5% p.a. daily interest crediting).                 |
| **Scene 5**  | `720 – 899`   | `0:24 – 0:30` | `05-obligations-salary.png`        | **Multi-Job Salary Tracking:** Principal Engineer income stream, gross salary vs. net take-home `₱31,400.00`.               |
| **Scene 6**  | `900 – 1079`  | `0:30 – 0:36` | `05-obligations-salary.png`        | **Automated Statutory Deductions:** Real Philippine deductions (SSS, PhilHealth, Pag-IBIG, withholding tax) breakdown bar.  |
| **Scene 7**  | `1080 – 1259` | `0:36 – 0:42` | `06-obligations-loans.png`         | **Loans & Cashback Incentives:** GCash GLoan payoff schedule + `₱680.00` early settlement interest cashback badge.          |
| **Scene 8**  | `1260 – 1439` | `0:42 – 0:48` | `07-obligations-subscriptions.png` | **Subscriptions & Renewal Guard:** Netflix (`₱549`), Spotify Duo (`₱239`), billing cycle countdowns & auto-debit alerts.    |
| **Scene 9**  | `1440 – 1619` | `0:48 – 0:54` | `09-analytics.png`                 | **Atomic Inter-Pocket Transfers:** BDO Payroll → SeaBank High-Yield `₱5,000.00` instant balance reallocation sheet.         |
| **Scene 10** | `1620 – 1799` | `0:54 – 1:00` | `10-advisor.png`                   | **PocketBot AI & Final CTA:** On-device financial assistant conversation, zero cloud leaks, and App Store / GitHub callout. |

---

## 3. Motion & Animation Rhythm (Per 6-Second Scene)

To guarantee zero dead time:

- **T = 0s (Frame 0):** Kinetic header springs into view with tag badge and punchy headline.
- **T = 0.5s (Frame 15):** Phone frame slides up smoothly with subtle tilt and reflection.
- **T = 1.0s (Frame 30):** Primary glassmorphic callout card snaps in with spring physics (`damping: 14, stiffness: 120`).
- **T = 2.0s (Frame 60):** Secondary badge / metric highlight triggers with micro-zoom or number ticker.
- **T = 4.5s (Frame 135):** Phone frame gently settles while safe-zone indicators remain pinned.
- **T = 5.6s (Frame 170):** Quick smooth cross-dissolve into next scene.

At no point does the screen remain static for more than 1.5 seconds.

---

## 4. Audio Synthesis Spec (60.0s Exact)

- **Duration:** Exactly 60.0 seconds (`2,646,000` samples @ 44.1kHz 16-bit Stereo PCM).
- **Tempo:** 96 BPM (upbeat modern lo-fi chillhop beat).
- **Chord Progression:** `Fmaj7` → `Em7` → `Dm7` → `Cmaj7` (warm, sophisticated, trustworthy).
- **Percussion:** Rhythmic bass kick, snare snaps on beat 2 & 4, closed hi-hat shuffle.
- **SFX Sync Points:**
    - Tactile UI pop/chime SFX triggered every 6 seconds on each scene entry.
    - Sub-chimes on key card entrances at 1.5s into each scene.
- **Safety:** Hard/soft limiting via `Math.tanh` to ensure 0dB true peak headroom and zero digital clipping.

---

## 5. Safe Zone & Accessibility Rules

- **Header Y:** `y = 200` (well clear of TikTok top overlay `y < 180`).
- **Right Margin:** Max card width `800px` centered (`x = 140` to `x = 940`), ensuring `> 140px` clearance from TikTok right-side action buttons (`x > 950`).
- **Bottom Clearance:** Callout cards end at `y <= 1520` (well above TikTok bottom captions/sound footer at `y = 1560`).
- **Phone Frame:** Center `x = 540`, display height `1400px`, scaled to fit neatly behind frosted cards.
