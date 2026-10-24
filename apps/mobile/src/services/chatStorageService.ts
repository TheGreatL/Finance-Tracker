import type { SQLiteDatabase } from 'expo-sqlite';
import type { ChatStatus } from './chatEngine';

export interface StoredChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  status?: ChatStatus;
  source?: 'gemini' | 'offline';
  timestamp: string;
  created_at?: string;
}

/**
 * Saves a chat message to the local SQLite database.
 */
export async function saveChatMessage(
  db: SQLiteDatabase,
  message: StoredChatMessage
): Promise<void> {
  const createdAt = message.created_at || new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO chat_messages (
      id, sender, text, status, source, timestamp, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    message.id,
    message.sender,
    message.text,
    message.status || 'info',
    message.source || 'offline',
    message.timestamp,
    createdAt
  );
}

/**
 * Retrieves stored chat messages in chronological order.
 */
export async function getStoredChatMessages(
  db: SQLiteDatabase,
  limit: number = 50
): Promise<StoredChatMessage[]> {
  return await db.getAllAsync<StoredChatMessage>(
    `SELECT * FROM chat_messages ORDER BY created_at ASC LIMIT ?;`,
    limit
  );
}

/**
 * Clears all conversation history from SQLite.
 */
export async function clearChatStorage(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM chat_messages;');
}
