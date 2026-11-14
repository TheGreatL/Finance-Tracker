# TikTok AVP 35s Ultra-Fast Cut Design Specification

**Created:** 2026-11-14 10:14 (Local Time)

## 1. Overview & Objective

Transform the TikTok App Video Presentation (AVP) from 60 seconds (6s/scene) to an ultra-punchy, high-retention **35.0-second rapid showcase** (3.5 seconds / 105 frames per scene) across all 10 distinct features.

This addresses user feedback directly: _"6 seconds is too long i think can you make it just 3-4 seconds and forget the aim length of 60-90s"_. 3.5 seconds per scene lands directly in the 3–4 second sweet spot, creating an electrifying pacing that maximizes TikTok / Reels retention without clipping any UI feature highlights.

---

## 2. Technical Specifications

- **Canvas Dimensions:** 1080 × 1920 (9:16 vertical)
- **Frame Rate:** 30.0 fps
- **Total Duration:** 35.00 seconds (1,050 frames)
- **Scene Duration:** 3.50 seconds (105 frames each)
- **Visual Source:** 10 authentic Android emulator (`Pixel_7a`) captures
- **Audio:** 35.0s synthesized 16-bit PCM stereo WAV (44.1 kHz, 120 BPM, lo-fi groove with pop & cash chimes)
- **Output Container:** MP4 (`H.264` video + `AAC` audio)

---

## 3. Timeline Breakdown (10 Scenes × 105 Frames = 1,050 Frames)

| Scene  | Name               | Frames     | Timestamp     | Primary Visual & Motion                   | Callout Badge                            |
| ------ | ------------------ | ---------- | ------------- | ----------------------------------------- | ---------------------------------------- |
| **1**  | Dashboard Hero     | 0 – 105    | 0.0s – 3.5s   | `01-dashboard.png` scale in (1.00 ➔ 1.03) | `₱197,041.00 Net Worth` + Cashflow badge |
| **2**  | Sidebar & Privacy  | 105 – 210  | 3.5s – 7.0s   | `02-sidebar.png` drawer reveal            | 100% On-Device SQLite Shield             |
| **3**  | Accounts Grid      | 210 – 315  | 7.0s – 10.5s  | `03-accounts.png` bank list               | `₱73.5k Liquid Assets` counter           |
| **4**  | High-Yield Pockets | 315 – 420  | 10.5s – 14.0s | `04-institution-detail.png` Maya list     | Maya 4.5% p.a. daily yield badge         |
| **5**  | Salary & Payday    | 420 – 525  | 14.0s – 17.5s | `05-obligations-salary.png` job streams   | `₱31.4k Next Payday` countdown           |
| **6**  | Statutory Taxes    | 525 – 630  | 17.5s – 21.0s | `05-obligations-salary.png` deductions    | Automated SSS, PhilHealth & Tax          |
| **7**  | Loans & Cashback   | 630 – 735  | 21.0s – 24.5s | `06-obligations-loans.png` GLoan          | `+₱680.00` Early payoff rebate           |
| **8**  | Subscriptions      | 735 – 840  | 24.5s – 28.0s | `07-obligations-subscriptions.png`        | Netflix & Spotify auto-debit alert       |
| **9**  | Transfer Ledger    | 840 – 945  | 28.0s – 31.5s | `09-analytics.png` transfer sheet         | BDO ➔ SeaBank `₱5,000.00` atomic         |
| **10** | PocketBot & Outro  | 945 – 1050 | 31.5s – 35.0s | `10-advisor.png` chat + CTA card          | Taglish advisor + Download free CTA      |

---

## 4. In-Scene Micro-Choreography (105 Frames / 3.5s)

- **Frame 0 – 10 (0.0s – 0.33s):** Whip-pan entrance / screen scale spring (`damping: 14, stiffness: 120`).
- **Frame 6 (0.2s):** Header badge & title text pop in (`spring` with bounce).
- **Frame 25 (0.83s):** Key feature floating callout card glides in (`translateY: 40 ➔ 0`, `opacity: 0 ➔ 1`).
- **Frame 25 – 85 (0.83s – 2.8s):** Peak visual focus with gentle phone breathing zoom.
- **Frame 85 – 105 (2.8s – 3.5s):** Fast sweep transition to next scene.

---

## 5. Audio Choreography (35s)

- **Duration:** 35.0 seconds (`1,543,500` samples @ 44.1 kHz).
- **Tempo:** 120 BPM lo-fi chord progression (Fmaj7 ➔ G6 ➔ Em7 ➔ Am7).
- **Chimes:** Synchronized sound effects on scene entries and card pops at `st + 0.8s`.
- **Special SFX:** Cash chime on Salary (scene 5) and Cashback (scene 7).
