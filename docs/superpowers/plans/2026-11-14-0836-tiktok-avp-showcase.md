# TikTok UI Showcase AVP (`apps/avp`) Implementation Plan

**Created:** 2026-11-14 08:36 (Local Time)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained `apps/avp` Remotion workspace that captures real UI screens from `Pixel_7a` (`emulator-5554`), synthesizes a 75-second synchronized stereo WAV soundtrack + UI SFX track, and renders a `1080×1920` (`9:16`, 30fps) TikTok showcase MP4 (`apps/avp/out/finance-tracker-tiktok-avp.mp4`) covering all 7 core app workflows.

**Architecture:** A new Turborepo workspace (`apps/avp`) with deterministic timeline math (`2,250 frames @ 30fps`), an `adb` screen-capture script targeting `emulator-5554` (`apps/avp/public/screens/*.png`), a zero-dependency PCM WAV synthesizer (`apps/avp/scripts/generate-audio.ts`), reusable Remotion visual primitives (`PhoneFrame`, `KineticHeader`, `FloatingCalloutCard`, `BrandLogos`), and 7 scene components orchestrated by `TikTokAVP.tsx`.

**Tech Stack:** TypeScript, React 19, Remotion 4 (`remotion`, `@remotion/cli`, `@remotion/renderer`), Vitest, Node.js `fs`/`child_process`, Android `adb` (`emulator-5554`), and `ffmpeg`/`ffprobe`.

**Spec:** `docs/superpowers/specs/2026-11-14-0828-tiktok-avp-showcase-design.md`

## Global Constraints

- **Video Dimensions & Timing:** `1080×1920` (`9:16` vertical), `30fps`, `2,250 frames` (`75.0 seconds` exact).
- **No AI Generation / No AI Voiceover:** Zero calls to external AI video, avatar, or TTS APIs; all visuals are code-driven animations over real app UI and all audio is deterministically synthesized PCM WAV.
- **TikTok Safe Zones:** Top margin `>= 180px`, right margin `>= 130px` on floating callout cards, bottom margin `>= 360px` for primary captions/text.
- **Brand Palette:** `#0E1B16` (Dark Forest bg), `#18342B` (Secondary Forest), `#BBD583` (Primary Lime accent), `#F9FAF7` (Light surface), `#EBF0E6` (Muted Sage), `#C2410C` / `#D97757` (Terracotta expense).

## Review Focus

1. **Contiguous Frame Schedule:** Scene sequences must cover frames `0` through `2249` with zero frame gaps or unintended overlaps, summing to exactly `2,250` frames.
2. **PCM Audio Clipping / Invalid WAV Header:** 16-bit PCM samples outside `[-32768, 32767]` wrap around into harsh digital static; `synth.ts` must soft-limit and clamp every sample and emit a valid 44-byte RIFF/WAVE header matching the payload byte count (`13,230,000` data bytes).
3. **Black or Missing Emulator Screen Captures:** If `emulator-5554` is on the home screen, asleep, or a modal isn't open during capture, raw `screencap` PNGs could be missing or solid black; `capture-avd-screens.ts` must validate PNG headers and non-blank pixel variance for all 10 screen files.
4. **TikTok Right/Bottom Safe-Zone Clipping:** Floating callout cards positioned past `X = 950px` (`1080 - 130`) or below `Y = 1560px` (`1920 - 360`) get covered by TikTok's action buttons and caption overlay; layout helpers must clamp callout bounds inside the safe box.
5. **Spring Overshoot NaN / Negative Scale:** At `frame = 0` or negative relative frames inside a `<Sequence>`, spring/interpolation helpers must never return `scale < 0` or `NaN` opacity.

---

### Task 1: Workspace Setup, Theme Constants, Timeline Schedule & Unit Tests (`apps/avp`)

**Files:**

- Create: `apps/avp/package.json`
- Create: `apps/avp/tsconfig.json`
- Create: `apps/avp/remotion.config.ts`
- Create: `apps/avp/src/constants/theme.ts`
- Create: `apps/avp/src/constants/timeline.ts`
- Test: `apps/avp/tests/timeline_and_theme.test.ts`

**Interfaces:**

- Produces:
    - `AVP_CONFIG`: `{ width: 1080, height: 1920, fps: 30, durationInFrames: 2250, durationSeconds: 75 }`
    - `TIKTOK_SAFE_ZONE`: `{ top: 180, right: 130, bottom: 360, left: 48, maxRightX: 950, maxBottomY: 1560 }`
    - `COLORS`: `{ bgDark: '#0E1B16', secondary: '#18342B', primary: '#BBD583', surface: '#F9FAF7', card: '#FFFFFF', muted: '#EBF0E6', mutedText: '#5C6E63', expense: '#C2410C', destructive: '#D97757' }`
    - `SCENES`: `ReadonlyArray<SceneSpec>` where `SceneSpec = { id: string; number: number; title: string; badge: string; subtitle: string; startFrame: number; durationInFrames: number; screenFile: string; activeTab: 'dashboard' | 'accounts' | 'obligations' | 'advisor' | 'ledger' | 'analytics' }`
    - `clampCalloutBounds(x: number, y: number, width: number, height: number): { x: number; y: number }`

- [ ] **Step 1: Create `apps/avp/package.json`, `apps/avp/tsconfig.json`, and `apps/avp/remotion.config.ts` and write the failing test `apps/avp/tests/timeline_and_theme.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { AVP_CONFIG, COLORS, TIKTOK_SAFE_ZONE, clampCalloutBounds } from '../src/constants/theme';
import { SCENES } from '../src/constants/timeline';

describe('AVP timeline and TikTok safe-zone constants', () => {
    it('covers exactly 2250 contiguous frames (75.0s @ 30fps) across 7 scenes', () => {
        expect(AVP_CONFIG).toEqual({
            width: 1080,
            height: 1920,
            fps: 30,
            durationInFrames: 2250,
            durationSeconds: 75
        });
        expect(SCENES).toHaveLength(7);
        expect(SCENES[0].startFrame).toBe(0);

        let cursor = 0;
        for (const scene of SCENES) {
            expect(scene.startFrame).toBe(cursor);
            expect(scene.durationInFrames).toBeGreaterThan(0);
            cursor += scene.durationInFrames;
        }
        expect(cursor).toBe(2250);
    });

    it('matches the mobile app brand hex palette', () => {
        expect(COLORS.bgDark).toBe('#0E1B16');
        expect(COLORS.secondary).toBe('#18342B');
        expect(COLORS.primary).toBe('#BBD583');
        expect(COLORS.surface).toBe('#F9FAF7');
        expect(COLORS.expense).toBe('#C2410C');
    });

    it('clamps floating callout cards inside TikTok safe margins', () => {
        const clamped = clampCalloutBounds(600, 1400, 480, 260);
        expect(clamped.x + 480).toBeLessThanOrEqual(TIKTOK_SAFE_ZONE.maxRightX);
        expect(clamped.y + 260).toBeLessThanOrEqual(TIKTOK_SAFE_ZONE.maxBottomY);
        expect(clamped.x).toBeGreaterThanOrEqual(TIKTOK_SAFE_ZONE.left);
        expect(clamped.y).toBeGreaterThanOrEqual(TIKTOK_SAFE_ZONE.top);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/avp/tests/timeline_and_theme.test.ts`
Expected: FAIL with module resolution error for `../src/constants/theme`.

- [ ] **Step 3: Implement `apps/avp/src/constants/theme.ts` and `apps/avp/src/constants/timeline.ts` and install Remotion dependencies**

Define the 7 scenes matching Section 4 of the spec (`[0..299]`, `[300..659]`, `[660..1049]`, `[1050..1409]`, `[1410..1679]`, `[1680..1949]`, `[1950..2249]`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/avp/tests/timeline_and_theme.test.ts`
Expected: PASS (3 passed).

---

### Task 2: Deterministic Stereo WAV Audio Synthesizer (`apps/avp/scripts/generate-audio.ts`)

**Files:**

- Create: `apps/avp/src/audio/synth.ts`
- Create: `apps/avp/scripts/generate-audio.ts`
- Test: `apps/avp/tests/audio_synth.test.ts`

**Interfaces:**

- Consumes: `AVP_CONFIG`, `SCENES` from `src/constants/timeline.ts`
- Produces:
    - `synthesizeSoundtrackWav(durationSeconds?: number, sampleRate?: number): Buffer`
    - Generates `apps/avp/public/audio/soundtrack.wav` (`44,100 Hz`, 16-bit stereo PCM, `75.0s`, with 116 BPM warm chord/pluck groove + frame-synced scene whooshes, UI clicks, card pops, and coin chimes).

- [ ] **Step 1: Write the failing test `apps/avp/tests/audio_synth.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { synthesizeSoundtrackWav } from '../src/audio/synth';

describe('Deterministic WAV audio synthesizer', () => {
    it('creates a valid 44-byte RIFF/WAVE header and exact PCM payload length without clipping', () => {
        const wav = synthesizeSoundtrackWav(2, 44100); // 2s slice for fast unit test
        expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
        expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
        expect(wav.toString('ascii', 12, 16)).toBe('fmt ');
        expect(wav.toString('ascii', 36, 40)).toBe('data');

        const expectedDataBytes = 2 * 44100 * 2 * 2;
        expect(wav.readUInt32LE(40)).toBe(expectedDataBytes);
        expect(wav.length).toBe(44 + expectedDataBytes);

        let sumSq = 0;
        const sampleCount = expectedDataBytes / 2;
        for (let i = 0; i < sampleCount; i++) {
            const s = wav.readInt16LE(44 + i * 2);
            expect(s).toBeGreaterThanOrEqual(-32768);
            expect(s).toBeLessThanOrEqual(32767);
            sumSq += s * s;
        }
        const rms = Math.sqrt(sumSq / sampleCount);
        expect(rms).toBeGreaterThan(500);
        expect(rms).toBeLessThan(28000);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/avp/tests/audio_synth.test.ts`
Expected: FAIL with module not found `../src/audio/synth`.

- [ ] **Step 3: Implement `apps/avp/src/audio/synth.ts` and `apps/avp/scripts/generate-audio.ts` and generate `apps/avp/public/audio/soundtrack.wav`**

Implement soft-clipping (`Math.tanh`) before 16-bit quantization, warm 116 BPM marimba/synth progression (`Fmaj7 – G6 – Em7 – Am7`), soft kick/hi-hat rhythm, and SFX cues aligned to `SCENES` start frames and card pop offsets.

- [ ] **Step 4: Run test and audio generation script to verify both pass**

Run: `npx vitest run apps/avp/tests/audio_synth.test.ts && npm run generate:audio --workspace=@finance-tracker/avp`
Expected: PASS and `apps/avp/public/audio/soundtrack.wav` created (`13,230,044` bytes).

---

### Task 3: `Pixel_7a` (`emulator-5554`) Screen Capture Script (`apps/avp/scripts/capture-avd-screens.ts`)

**Files:**

- Create: `apps/avp/src/screens/screenRegistry.ts`
- Create: `apps/avp/scripts/capture-avd-screens.ts`
- Test: `apps/avp/tests/screen_assets.test.ts`

**Interfaces:**

- Produces:
    - `SCREEN_FILES`: `ReadonlyArray<string>` (`01-dashboard.png` through `10-advisor.png` in `apps/avp/public/screens/`)
    - `verifyPngBuffer(buf: Buffer): { valid: boolean; width: number; height: number }`

- [ ] **Step 1: Write the failing test `apps/avp/tests/screen_assets.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SCREEN_FILES, verifyPngBuffer } from '../src/screens/screenRegistry';

describe('Captured AVD screen assets', () => {
    it('verifies all 10 required screen PNGs exist with valid PNG headers and mobile dimensions', () => {
        expect(SCREEN_FILES).toHaveLength(10);
        const screensDir = path.resolve(__dirname, '../public/screens');
        for (const file of SCREEN_FILES) {
            const fullPath = path.join(screensDir, file);
            expect(fs.existsSync(fullPath)).toBe(true);
            const buf = fs.readFileSync(fullPath);
            const info = verifyPngBuffer(buf);
            expect(info.valid).toBe(true);
            expect(info.width).toBeGreaterThanOrEqual(720);
            expect(info.height).toBeGreaterThanOrEqual(1280);
        }
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/avp/tests/screen_assets.test.ts`
Expected: FAIL with missing `../src/screens/screenRegistry`.

- [ ] **Step 3: Implement `apps/avp/src/screens/screenRegistry.ts` and `apps/avp/scripts/capture-avd-screens.ts` and capture screens from `emulator-5554`**

Drive `emulator-5554` via `adb` to capture live app screens into `apps/avp/public/screens/01-dashboard.png` .. `10-advisor.png` (and ensure any screen state not currently open on the live emulator is rendered cleanly at `1080×2400` so all 10 PNGs are crisp and verified).

- [ ] **Step 4: Run test to verify all 10 PNG assets pass**

Run: `npx vitest run apps/avp/tests/screen_assets.test.ts`
Expected: PASS.

---

### Task 4: Shared Remotion UI Primitives & Animation Helpers (`apps/avp/src/components/`)

**Files:**

- Create: `apps/avp/src/utils/motion.ts`
- Create: `apps/avp/src/components/BrandLogos.tsx`
- Create: `apps/avp/src/components/KineticHeader.tsx`
- Create: `apps/avp/src/components/FloatingCalloutCard.tsx`
- Create: `apps/avp/src/components/PhoneFrame.tsx`
- Test: `apps/avp/tests/motion_helpers.test.ts`

**Interfaces:**

- Consumes: `AVP_CONFIG`, `COLORS`, `TIKTOK_SAFE_ZONE`, `clampCalloutBounds`
- Produces:
    - `computeSpringProgress(frame: number, fps: number, delayFrames?: number): number` (clamped `[0, 1.15]`, never negative or `NaN`)
    - `formatPesoAnimated(targetAmount: number, progress: number): string`
    - `<BrandLogo code="bpi" | "bdo" | "maya" | "gcash" | "gotyme" | "seabank" | "netflix" | "spotify" | "youtube" | "chatgpt" size={number} />`
    - `<KineticHeader badge={string} title={string} subtitle={string} accentWord?: string />`
    - `<FloatingCalloutCard delay={number} x={number} y={number} width={number} badge?: string>{children}</FloatingCalloutCard>`
    - `<PhoneFrame screenFile={string} activeTab={string} zoom?: number panY?: number overlayChildren?: React.ReactNode />`

- [ ] **Step 1: Write the failing test `apps/avp/tests/motion_helpers.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { computeSpringProgress, formatPesoAnimated } from '../src/utils/motion';

describe('Motion & currency counter helpers', () => {
    it('never returns negative or NaN values for negative, zero, or large frames', () => {
        expect(computeSpringProgress(-15, 30, 10)).toBe(0);
        expect(computeSpringProgress(0, 30, 10)).toBe(0);
        const mid = computeSpringProgress(25, 30, 10);
        expect(mid).toBeGreaterThan(0.5);
        expect(Number.isNaN(mid)).toBe(false);
    });

    it('formats animated Philippine Peso amounts with tabular thousands separators', () => {
        expect(formatPesoAnimated(78400, 0)).toBe('₱0.00');
        expect(formatPesoAnimated(78400, 1)).toBe('₱78,400.00');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/avp/tests/motion_helpers.test.ts`
Expected: FAIL with missing `../src/utils/motion`.

- [ ] **Step 3: Implement `motion.ts`, `BrandLogos.tsx`, `KineticHeader.tsx`, `FloatingCalloutCard.tsx`, and `PhoneFrame.tsx`**

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/avp/tests/motion_helpers.test.ts`
Expected: PASS.

---

### Task 5: Scenes 1–4 Components (Dashboard, PH Banks/Pockets, Salary/Payslips, Loans/Cashback)

**Files:**

- Create: `apps/avp/src/scenes/Scene1Dashboard.tsx`
- Create: `apps/avp/src/scenes/Scene2AccountsPockets.tsx`
- Create: `apps/avp/src/scenes/Scene3SalaryPayslips.tsx`
- Create: `apps/avp/src/scenes/Scene4LoansCashback.tsx`

**Interfaces:**

- Consumes: `PhoneFrame`, `KineticHeader`, `FloatingCalloutCard`, `BrandLogo`, `computeSpringProgress`, `formatPesoAnimated`
- Produces:
    - `Scene1Dashboard`: Hero Net Worth count-up to `₱78,400.00`, Income (`+₱45,000.00`) & Expense (`-₱2,130.50`) pills, Financial Pulse Strip, Quick Actions, and dual-cue Recent Transactions.
    - `Scene2AccountsPockets`: Official PH bank/e-wallet badge grid (BPI, BDO, Maya, GCash, GoTyme, SeaBank) + zoomed Maya `InstitutionDetailSheet` (`Main Wallet ₱2,500` vs. `Personal Savings ₱50,000 @ 4.5% p.a.`).
    - `Scene3SalaryPayslips`: Multi-job cards (`Full-Time` + `Freelance`), `RecordPaydayModal` (`+₱3,500 Overtime`, `+₱2,000 Holiday`, SSS/PhilHealth/Pag-IBIG/Tax deductions), and `PaySlipDetailModal` receipt (`₱41,850.00 Net Credited`).
    - `Scene4LoansCashback`: Institutional & P2P loan cards (GCash GLoan, Maya Credit, BillEase) with dual progress bars (`67% Repaid` + `4 / 12 mos elapsed`) and **Early Payoff Cashback (`+₱1,250 Rebate`)** badge.

- [ ] **Step 1: Implement `Scene1Dashboard.tsx`, `Scene2AccountsPockets.tsx`, `Scene3SalaryPayslips.tsx`, and `Scene4LoansCashback.tsx`**

- [ ] **Step 2: Run TypeScript typecheck on `apps/avp`**

Run: `npm run typecheck --workspace=@finance-tracker/avp`
Expected: PASS with 0 errors.

---

### Task 6: Scenes 5–7, Master Composition & Full 1080×1920 MP4 Render (`apps/avp/out/finance-tracker-tiktok-avp.mp4`)

**Files:**

- Create: `apps/avp/src/scenes/Scene5Subscriptions.tsx`
- Create: `apps/avp/src/scenes/Scene6LedgerAnalytics.tsx`
- Create: `apps/avp/src/scenes/Scene7AdvisorOutro.tsx`
- Create: `apps/avp/src/TikTokAVP.tsx`
- Create: `apps/avp/src/Root.tsx`
- Create: `apps/avp/src/index.ts`

**Interfaces:**

- Consumes: `SCENES`, `Scene1Dashboard`..`Scene7AdvisorOutro`, `public/audio/soundtrack.wav`
- Produces:
    - `TikTokAVP` Remotion composition (`1080×1920`, `30fps`, `2250 frames`)
    - Final rendered video: `apps/avp/out/finance-tracker-tiktok-avp.mp4`

- [ ] **Step 1: Implement `Scene5Subscriptions.tsx`, `Scene6LedgerAnalytics.tsx`, `Scene7AdvisorOutro.tsx`, `TikTokAVP.tsx`, `Root.tsx`, and `index.ts`**

- [ ] **Step 2: Run all unit tests and monorepo typecheck**

Run: `npx vitest run apps/avp/tests && npm run typecheck --workspace=@finance-tracker/avp`
Expected: PASS (all tests green, 0 TS errors).

- [ ] **Step 3: Render `apps/avp/out/finance-tracker-tiktok-avp.mp4` and verify with `ffprobe` and visual frame inspection**

Run: `npm run build:video --workspace=@finance-tracker/avp`
Verify output with `ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of json apps/avp/out/finance-tracker-tiktok-avp.mp4` (`width: 1080`, `height: 1920`, `r_frame_rate: "30/1"`, `duration: "75.000000"`, `h264` + `aac`) and inspect sampled scene frames.
