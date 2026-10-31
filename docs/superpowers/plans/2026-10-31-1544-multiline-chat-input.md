# Multiline Chat Input Implementation Plan

**Created:** 2026-10-31 15:44 (Local Time)

## Overview

Update the chat `TextInput` in [`apps/mobile/app/(tabs)/assistant.tsx`](<file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/assistant.tsx>) to support multiline text entry with dynamic vertical expansion, capped height scrolling, and bottom-aligned send controls.

---

## Proposed Changes

### 1. Update Input Bar in `assistant.tsx`

#### File: [`apps/mobile/app/(tabs)/assistant.tsx`](<file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/assistant.tsx>)

- Enable `multiline={true}` on the `TextInput`.
- Add `scrollEnabled={true}` and `textAlignVertical="center"`.
- Set `maxHeight: 120` and `minHeight: 24` with `leading-5` so it smoothly expands up to ~5 lines before enabling internal scrolling.
- Change input bar container layout from `items-center` to `items-end` so the Send button stays anchored at the bottom-right as text expands.

---

### 2. Testing & Verification

- Run `npm run typecheck` across all workspaces.
- Run `npm run test --workspace=@finance-tracker/mobile`.
- Verify code formatting with Prettier.
