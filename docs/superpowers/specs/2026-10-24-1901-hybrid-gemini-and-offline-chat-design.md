# Hybrid Gemini AI & Offline Financial Assistant Design Specification

**Created:** 2026-10-24 19:01 (Local Time)

## Overview & User Goal

The user provided a Google Gemini API Key and requested a **Hybrid Assistant**:
1. **Online AI via Gemini API:** When internet access is available, the assistant leverages Google Gemini to provide conversational, intelligent financial advice with full real-time database context (live balances, pockets, active loans, and recent transactions).
2. **Offline Fallback via `chatEngine`:** When the device is offline, has poor connectivity, or when the API request times out/fails, the assistant seamlessly falls back to our local rule-based `chatEngine.ts`.
3. **Persistent Chat Cache (SQLite):** Chat history is persisted in a local `chat_messages` table in SQLite so the conversation history is preserved across app sessions and available offline.

---

## 1. Architecture & Component Design

```
+-------------------------------------------------------------+
|                     Assistant Screen                        |
|                     (assistant.tsx)                         |
+-------------------------------------------------------------+
                              |
                     handleSendMessage()
                              |
             +----------------+----------------+
             |                                 |
      1. Try Online                     2. Fallback Offline
             |                                 |
             v                                 v
   +--------------------+            +--------------------+
   |   geminiService    |            |     chatEngine     |
   | (Gemini 2.5/Flash) | (on error/ | (Deterministic     |
   | With SQLite Context|  timeout)  |  Rule Engine)      |
   +--------------------+            +--------------------+
             |                                 |
             +----------------+----------------+
                              |
                     Bot Response Output
                              |
                              v
                  +-----------------------+
                  |  chatStorageService   |
                  |  (SQLite Persistence) |
                  |  Table: chat_messages |
                  +-----------------------+
```

---

## 2. Gemini Financial Context Injection (`geminiService.ts`)

When making an API request to Gemini, the service constructs a financial context system prompt dynamically from SQLite:
- **Total Liquid Funds:** Sum of all active bank/e-wallet/cash pockets.
- **Pockets Breakdown:** Names, institutions, and individual balances.
- **Active Loans & Obligations:** Each loan's title, remaining balance, monthly amortization, and due date.
- **Recent Spending Trend:** Total income vs expenses this period.

### System Prompt Guidelines:
- Act as a supportive, prudent Philippine personal financial advisor ("PocketBot").
- Currency is Philippine Peso (₱).
- Provide clear answers to scenario questions ("Can I afford X?", "How much will I have left if I spend Y?").
- Always remind the user if spending compromises upcoming loan due dates.
- Keep responses concise, warm, formatted with bold highlights and bullet points.

---

## 3. Persistent Chat Storage (`chatStorageService.ts`)

### SQLite Table Schema:
```sql
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY NOT NULL,
  sender TEXT NOT NULL,       -- 'user' | 'bot'
  text TEXT NOT NULL,
  status TEXT,                -- 'safe' | 'tight' | 'unaffordable' | 'info' | 'unknown'
  source TEXT,                -- 'gemini' | 'offline'
  timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
```

### Storage Operations:
- `saveChatMessage(db, message): Promise<void>`
- `getRecentChatMessages(db, limit = 50): Promise<ChatMessage[]>`
- `clearChatHistory(db): Promise<void>`

---

## 4. UI Enhancements (`ChatMessageBubble.tsx` & `assistant.tsx`)

- **Source Indicator Badge:**
  - Online response: `✨ Gemini AI` (Pistachio badge)
  - Offline response: `⚡ Offline Engine` (Emerald badge)
- **Automatic Fallback Handling:** If the network request takes longer than 8 seconds or encounters an error, the UI catches it and immediately computes using `chatEngine.ts`.
- **Offline Banner Indicator:** Subtle indicator when device is running in offline mode.

---

## 5. Security & Configuration

- Store the API key in `.env` as `EXPO_PUBLIC_GEMINI_API_KEY`.
- Also provide fallback in `src/constants/config.ts` so development and production builds run reliably.
