# Hybrid Gemini AI & Offline Financial Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Created:** 2026-10-24 19:02 (Local Time)

**Goal:** Integrate Google Gemini API into the mobile assistant to provide rich, conversational financial reasoning with live SQLite context when online, while seamlessly falling back to our offline `chatEngine.ts` when offline/timeout, and persisting all chat history in SQLite.

**Architecture:** Create `chatStorageService.ts` to manage the `chat_messages` table in SQLite for conversation persistence. Create `geminiService.ts` to format financial context (balances, pockets, active loans) and call Gemini REST API with an 8-second timeout. Update `assistant.tsx` to query Gemini first, gracefully fallback to `chatEngine` on network failure, and persist messages to SQLite.

**Tech Stack:** React Native (Expo SDK 58), SQLite (`expo-sqlite`), Google Gemini REST API, Vitest.

**Spec:** [`docs/superpowers/specs/2026-10-24-1901-hybrid-gemini-and-offline-chat-design.md`](file:///c:/Users/user/Desktop/projects/finance-tracker/docs/superpowers/specs/2026-10-24-1901-hybrid-gemini-and-offline-chat-design.md)

## Global Constraints
- API key must be read from `EXPO_PUBLIC_GEMINI_API_KEY` (with a safe default constant fallback).
- Never hang the UI: online requests must timeout after 8 seconds and immediately fall back to the offline engine.
- Always persist messages to SQLite so chat history survives app restarts.
- All unit tests must pass via `npm test --workspace=@finance-tracker/mobile`.
- TypeScript compiler checks must pass cleanly via `npx turbo run typecheck`.

---

### Task 1: Chat Storage Service (`chatStorageService.ts`) & SQLite Schema

**Files:**
- Modify: [`apps/mobile/src/database/schema.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/database/schema.ts)
- Modify: [`apps/mobile/src/database/db.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/database/db.ts)
- Create: [`apps/mobile/src/services/chatStorageService.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/chatStorageService.ts)
- Create: [`apps/mobile/tests/chat_storage.test.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/tests/chat_storage.test.ts)

- [ ] **Step 1: Write unit tests for `chatStorageService.ts`**
  - Test saving user message and bot message.
  - Test retrieving messages in chronological order.
  - Test clearing messages.

- [ ] **Step 2: Update SQLite schema in `schema.ts` and `db.ts`**
  - Add `CREATE TABLE IF NOT EXISTS chat_messages`.
  - Add automatic table probe/creation in `db.ts`.

- [ ] **Step 3: Implement `chatStorageService.ts`**
  - `saveChatMessage(db, message): Promise<void>`
  - `getStoredChatMessages(db, limit = 50): Promise<ChatMessage[]>`
  - `clearChatStorage(db): Promise<void>`

- [ ] **Step 4: Run tests and typecheck**
  Run `npm test --workspace=@finance-tracker/mobile` and `npx turbo run typecheck`.

- [ ] **Step 5: Commit changes**
  Commit as: `feat(mobile): add SQLite chat storage service for persistent conversation history`

---

### Task 2: Gemini AI Service (`geminiService.ts`) with Context Injection

**Files:**
- Create: [`apps/mobile/src/constants/config.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/constants/config.ts)
- Create: [`apps/mobile/src/services/geminiService.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/services/geminiService.ts)
- Create: [`apps/mobile/tests/gemini_service.test.ts`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/tests/gemini_service.test.ts)

- [ ] **Step 1: Write unit tests for `geminiService.ts`**
  - Test building system financial context string from pockets and loans.
  - Test successful Gemini response parsing.
  - Test timeout / network error handling.

- [ ] **Step 2: Implement `config.ts`**
  - Export `GEMINI_API_KEY` from `process.env.EXPO_PUBLIC_GEMINI_API_KEY` or provided key.

- [ ] **Step 3: Implement `geminiService.ts`**
  - `buildFinancialSystemContext(db): Promise<string>`
  - `queryGeminiAdvisor(db, prompt): Promise<{ text: string; status: ChatStatus }>`
  - Use `AbortController` with 8000ms timeout.

- [ ] **Step 4: Run tests and typecheck**
  Run `npm test --workspace=@finance-tracker/mobile` and `npx turbo run typecheck`.

- [ ] **Step 5: Commit changes**
  Commit as: `feat(mobile): implement geminiService with live financial context and timeout handling`

---

### Task 3: Integrate Hybrid Mode & Chat Persistence in Assistant UI

**Files:**
- Modify: [`apps/mobile/src/components/chat/ChatMessageBubble.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/src/components/chat/ChatMessageBubble.tsx)
- Modify: [`apps/mobile/app/(tabs)/assistant.tsx`](file:///c:/Users/user/Desktop/projects/finance-tracker/apps/mobile/app/(tabs)/assistant.tsx)

- [ ] **Step 1: Update `ChatMessageBubble.tsx`**
  - Add `source?: 'gemini' | 'offline'` to `ChatMessage`.
  - Render `✨ Gemini AI` badge when `source === 'gemini'` and `⚡ Offline Engine` badge when `source === 'offline'`.

- [ ] **Step 2: Update `assistant.tsx`**
  - On mount, load stored messages via `getStoredChatMessages(db)`.
  - On send:
    1. Save user message to SQLite via `saveChatMessage`.
    2. Try `queryGeminiAdvisor(db, prompt)` first.
    3. If online fails or times out, immediately run `evaluateChatPrompt(db, prompt)` via offline engine.
    4. Save bot message to SQLite with its source badge.
  - On clear history: call `clearChatStorage(db)`.

- [ ] **Step 3: Run full tests and monorepo typecheck**
  Run `npm test --workspace=@finance-tracker/mobile` and `npx turbo run typecheck`.

- [ ] **Step 4: Commit changes**
  Commit as: `feat(mobile): integrate hybrid online/offline assistant with SQLite chat caching`

---

### Task 5: Final Verification

- [ ] **Step 1: Verify all unit tests pass**
- [ ] **Step 2: Verify typecheck passes**
- [ ] **Step 3: Provide testing instructions to user**
