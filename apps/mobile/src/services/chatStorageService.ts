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

export type ChatTimelineItem =
  | {
      type: 'date_header';
      id: string;
      dateKey: string;
      label: string;
    }
  | {
      type: 'message';
      id: string;
      message: StoredChatMessage;
    };

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Extracts a local YYYY-MM-DD date key from an ISO timestamp or Date object.
 */
export function toLocalDateKey(input?: string | Date, fallback: Date = new Date()): string {
  const d =
    input instanceof Date
      ? input
      : input
      ? new Date(input)
      : fallback;

  const validDate = isNaN(d.getTime()) ? fallback : d;
  const year = validDate.getFullYear();
  const month = String(validDate.getMonth() + 1).padStart(2, '0');
  const day = String(validDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date string into a friendly chat section header:
 * - "Today • Oct 31, 2026"
 * - "Yesterday • Oct 30, 2026"
 * - "Sat, Oct 24, 2026"
 */
export function formatChatDayHeader(
  isoDateStr?: string,
  referenceDate: Date = new Date()
): string {
  const dateKey = toLocalDateKey(isoDateStr, referenceDate);
  const [y, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  const msgDate = new Date(y, m - 1, d);

  const todayKey = toLocalDateKey(referenceDate, referenceDate);
  const yesterdayDate = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() - 1
  );
  const yesterdayKey = toLocalDateKey(yesterdayDate, referenceDate);

  const monthDayYear = `${SHORT_MONTHS[msgDate.getMonth()]} ${msgDate.getDate()}, ${msgDate.getFullYear()}`;

  if (dateKey === todayKey) {
    return `Today • ${monthDayYear}`;
  }
  if (dateKey === yesterdayKey) {
    return `Yesterday • ${monthDayYear}`;
  }

  const weekday = SHORT_WEEKDAYS[msgDate.getDay()];
  return `${weekday}, ${monthDayYear}`;
}

/**
 * Groups chronologically ordered chat messages by calendar day, inserting a
 * `date_header` item whenever the day changes.
 */
export function buildChatTimelineItems(
  messages: StoredChatMessage[],
  referenceDate: Date = new Date()
): ChatTimelineItem[] {
  const items: ChatTimelineItem[] = [];
  let lastDateKey = '';

  for (const msg of messages) {
    const dateKey = toLocalDateKey(msg.created_at, referenceDate);
    if (dateKey !== lastDateKey) {
      lastDateKey = dateKey;
      items.push({
        type: 'date_header',
        id: `date-header-${dateKey}`,
        dateKey,
        label: formatChatDayHeader(msg.created_at, referenceDate),
      });
    }
    items.push({
      type: 'message',
      id: msg.id,
      message: msg,
    });
  }

  return items;
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
