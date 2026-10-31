# 12-Hour Time Format Design Specification

**Created:** 2026-10-31 16:11 (Local Time)  
**Status:** Approved  
**Author:** Antigravity

---

## 1. Objective & Requirements

The user requested:

> "PLease use 12-Hour time format"

All time displays across the mobile application (chat timestamps, notification timestamps, message bubbles, and time formatters) must strictly use 12-hour time format with AM/PM indicators (e.g., `4:08 PM`, `12:15 AM`, `9:30 AM`).

---

## 2. Architecture & Design

### 2.1 Central Formatter Utility (`formatTime12`)

In [`apps/mobile/src/utils/formatters.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/utils/formatters.ts):

```typescript
/**
 * Formats a Date object, timestamp number, ISO date string, or 24-hour time string into a 12-hour time format (e.g. "4:08 PM", "12:15 AM").
 */
export function formatTime12(dateOrString?: Date | string | number | null): string;
```

#### Behavior & Edge Cases:

1. **Date Objects & Numeric Timestamps**: Formatted using `toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })`.
2. **ISO Date Strings** (e.g., `"2026-10-31T16:08:00.000Z"`): Converted to Date and formatted in 12-hour format.
3. **Existing 24-hour Strings** (e.g., `"16:08"`, `"00:15"`, `"12:00"`):
    - Parsed with regex `/^(\d{1,2}):(\d{2})(?::\d{2})?$/`.
    - Converted to 12-hour representation with period (`PM` if hour $\ge 12$, else `AM`).
    - Example: `"16:08"` $\rightarrow$ `"4:08 PM"`, `"09:05"` $\rightarrow$ `"9:05 AM"`, `"00:15"` $\rightarrow$ `"12:15 AM"`.
4. **Already Formatted Strings** (e.g., `"4:08 PM"`): Returned as is without double-formatting.
5. **Empty or Invalid Input**: Safely returns `""`.

### 2.2 Integration Touchpoints

1. **Chat Screen ([`apps/mobile/app/(tabs)/assistant.tsx`](<file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/assistant.tsx>))**:
    - Replace device-locale dependent `new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })` with `formatTime12(new Date())`.
2. **Chat Bubble ([`apps/mobile/src/components/chat/ChatMessageBubble.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/chat/ChatMessageBubble.tsx))**:
    - Display timestamp using `formatTime12(message.created_at || message.timestamp)` so historical messages loaded from SQLite are also formatted in 12-hour format.
3. **Notification Center ([`apps/mobile/src/components/notifications/NotificationCenterModal.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/notifications/NotificationCenterModal.tsx))**:
    - Explicitly add `hour12: true` to `d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })`.

---

## 3. Verification Plan

- Unit tests in `apps/mobile/tests/formatters.test.ts` covering Date instances, ISO strings, 24-hr time strings, 12-hr strings, and invalid inputs.
- Monorepo typecheck: `npm run typecheck`.
- Mobile test suite: `npm run test --workspace=@finance-tracker/mobile`.
