# TikTok AVP 35s Ultra-Fast Cut Implementation Plan

**Created:** 2026-11-14 10:14 (Local Time)

## Goal

Implement the 35.0-second ultra-fast cut (3.5s / 105 frames per scene) for the TikTok AVP, update timeline and theme constants, synthesize new 35.0s audio, refine scene motion delays, update tests, and render the final MP4 deliverable.

---

## Proposed Changes

### 1. Constants & Timeline Configuration

- Update `apps/avp/src/constants/theme.ts`:
    - `AVP_CONFIG.durationInFrames = 1050`
    - `AVP_CONFIG.durationSeconds = 35`
- Update `apps/avp/src/constants/timeline.ts`:
    - Each scene `durationInFrames = 105`
    - Start frames: `0, 105, 210, 315, 420, 525, 630, 735, 840, 945`

### 2. Audio Synthesizer Update & Regeneration

- Update `apps/avp/src/audio/synth.ts`:
    - Update default `durationSeconds = 35`
    - Update card pop offsets to `st + 0.8` (24 frames)
    - Update cash chimes for scenes 5 and 7 at `15.0s` and `22.5s`
- Update `apps/avp/scripts/generate-audio.ts`:
    - Run to re-generate `apps/avp/public/audio/soundtrack.wav` (35.0s PCM)

### 3. Scene Delays & Transition Snappiness

- In each scene component (`Scene1` to `Scene10`):
    - Tighten header entry delay to 6 frames
    - Tighten callout card entrance delay to 25 frames
    - Adjust any outro / transition triggers to frame 85-95

### 4. Tests Verification

- Update `apps/avp/tests/timeline_and_theme.test.ts` to expect 1050 frames total and 105 frames per scene.
- Run `vitest` across all 4 test suites.
- Run `npm run typecheck`.

### 5. Render & Verify Deliverable

- Run `npm run build:video --workspace=@finance-tracker/avp` with `BypassSandbox: true`.
- Run `ffprobe` to verify 1080×1920, 30fps, 35.0s, H.264/AAC.
- Run `npx tsx apps/avp/scripts/extract-previews.ts` (updated for 35s timeline).
