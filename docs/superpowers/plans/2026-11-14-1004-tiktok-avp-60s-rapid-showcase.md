# TikTok AVP 60s Rapid-Fire Showcase Implementation Plan

**Created:** 2026-11-14 10:04 (Local Time)
**Design Spec:** [2026-11-14-1004-tiktok-avp-60s-rapid-showcase-design.md](file:///c:/Users/user/Desktop/projects/finance-tracker/docs/superpowers/specs/2026-11-14-1004-tiktok-avp-60s-rapid-showcase-design.md)
**Target:** 60.0s (1,800 frames @ 30fps), 1080×1920 (9:16), H.264 + AAC Stereo
**Target Deliverable:** `apps/avp/out/finance-tracker-tiktok-avp.mp4`

---

## Proposed Changes

### 1. Timeline & Theme Constants

- Update `apps/avp/src/constants/theme.ts`:
    - `AVP_CONFIG.durationInFrames = 1800` (60.0s @ 30fps).
- Update `apps/avp/src/constants/timeline.ts`:
    - Define 10 scenes, each `180 frames` (6.0s), summing to `1800 frames`.

### 2. Audio Synthesizer Update

- Update `apps/avp/src/audio/synth.ts`:
    - Target duration: `60.0s` (`2,646,000` samples @ 44.1kHz).
    - Regenerate `public/audio/soundtrack.wav`.
    - Add rhythmic chimes on each 6-second scene transition and 1.5s sub-card beats.

### 3. Scene Refactoring & New Scenes

- Create / update scenes in `apps/avp/src/scenes/`:
    - `Scene1Dashboard.tsx`: 6.0s (Net worth counter + income/expense stats).
    - `Scene2SidebarPrivacy.tsx`: 6.0s (Drawer + offline encrypted SQLite architecture).
    - `Scene3AccountsGrid.tsx`: 6.0s (PH Banks: BPI, BDO, Maya, GCash, GoTyme, SeaBank).
    - `Scene4PocketsDetail.tsx`: 6.0s (Nested high-yield pockets & 4.5% daily interest).
    - `Scene5SalaryStreams.tsx`: 6.0s (Multi-job salary & payday countdown).
    - `Scene6StatutoryDeductions.tsx`: 6.0s (SSS, PhilHealth, Pag-IBIG take-home breakdown).
    - `Scene7LoansCashback.tsx`: 6.0s (GCash GLoan & ₱680 early payoff cashback).
    - `Scene8Subscriptions.tsx`: 6.0s (Netflix/Spotify & auto-renewal alert).
    - `Scene9LedgerTransfers.tsx`: 6.0s (Atomic BDO → SeaBank inter-pocket transfer).
    - `Scene10AdvisorOutro.tsx`: 6.0s (PocketBot AI conversation + final CTA).

### 4. Root & TikTokAVP Integration

- Update `apps/avp/src/TikTokAVP.tsx` to mount the 10 contiguous sequences (`180 frames` each).
- Update `apps/avp/src/Root.tsx` default duration to 1,800 frames.

### 5. Automated Tests

- Update `apps/avp/tests/timeline_and_theme.test.ts` to assert 10 scenes summing to 1,800 frames.
- Run all 4 vitest test suites to verify passing.
- Run typecheck across `@finance-tracker/avp`.

### 6. Render & Verification

- Execute `npm run build:video --workspace=@finance-tracker/avp` with `BypassSandbox: true`.
- Verify with `ffprobe` (1080x1920, 30fps, 60.0s exact, H.264 + AAC).
- Extract preview frames from scenes.

---

## Verification Plan

### Automated Tests

- `npx vitest run --dir apps/avp/tests` (must pass 100%).
- `npm run typecheck --workspace=@finance-tracker/avp` (0 errors).

### Media Verification

- `ffprobe` check duration = 60.00s, resolution = 1080x1920.
- Check file size ~9–10 MB.
- Extract sample frames from all 10 scenes.
