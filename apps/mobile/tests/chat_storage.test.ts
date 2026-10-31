import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveChatMessage,
  getStoredChatMessages,
  clearChatStorage,
  formatChatDayHeader,
  buildChatTimelineItems,
  type StoredChatMessage,
} from '../src/services/chatStorageService';

describe('chatStorageService', () => {
  let mockDb: any;
  let executedSql: { sql: string; params: any[] }[] = [];

  beforeEach(() => {
    executedSql = [];
    mockDb = {
      runAsync: vi.fn(async (sql: string, ...params: any[]) => {
        executedSql.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      }),
      getAllAsync: vi.fn(async (sql: string, ...params: any[]) => {
        executedSql.push({ sql, params });
        return [
          {
            id: 'msg-1',
            sender: 'user',
            text: 'Can I afford ₱5,000?',
            status: 'info',
            source: 'offline',
            timestamp: '07:30 PM',
            created_at: '2026-10-24T19:30:00.000Z',
          },
          {
            id: 'msg-2',
            sender: 'bot',
            text: 'Yes, you have ₱45,000 available.',
            status: 'safe',
            source: 'gemini',
            timestamp: '07:30 PM',
            created_at: '2026-10-24T19:30:02.000Z',
          },
        ];
      }),
    };
  });

  it('saves a chat message with source and status', async () => {
    const message: StoredChatMessage = {
      id: 'msg-test',
      sender: 'bot',
      text: 'Affordability confirmed.',
      status: 'safe',
      source: 'gemini',
      timestamp: '07:31 PM',
      created_at: '2026-10-24T19:31:00.000Z',
    };

    await saveChatMessage(mockDb, message);

    expect(mockDb.runAsync).toHaveBeenCalled();
    const runCall = executedSql[0];
    expect(runCall.sql).toContain('INSERT OR REPLACE INTO chat_messages');
    expect(runCall.params).toEqual([
      'msg-test',
      'bot',
      'Affordability confirmed.',
      'safe',
      'gemini',
      '07:31 PM',
      '2026-10-24T19:31:00.000Z',
    ]);
  });

  it('retrieves stored chat messages in chronological order', async () => {
    const messages = await getStoredChatMessages(mockDb, 30);

    expect(mockDb.getAllAsync).toHaveBeenCalled();
    const getCall = executedSql[0];
    expect(getCall.sql).toContain('SELECT * FROM chat_messages ORDER BY created_at ASC');
    expect(messages).toHaveLength(2);
    expect(messages[0].id).toBe('msg-1');
    expect(messages[1].source).toBe('gemini');
  });

  it('clears all messages from storage', async () => {
    await clearChatStorage(mockDb);

    expect(mockDb.runAsync).toHaveBeenCalled();
    const runCall = executedSql[0];
    expect(runCall.sql).toContain('DELETE FROM chat_messages');
  });

  it('formats day headers for Today, Yesterday, and older dates', () => {
    const refDate = new Date(2026, 9, 31, 12, 0, 0); // Oct 31, 2026 local

    expect(formatChatDayHeader('2026-10-31T09:15:00', refDate)).toBe('Today • Oct 31, 2026');
    expect(formatChatDayHeader('2026-10-30T21:00:00', refDate)).toBe('Yesterday • Oct 30, 2026');
    expect(formatChatDayHeader('2026-10-24T10:00:00', refDate)).toBe('Sat, Oct 24, 2026');
  });

  it('groups chat messages by calendar day and inserts date headers', () => {
    const refDate = new Date(2026, 9, 31, 12, 0, 0);
    const messages: StoredChatMessage[] = [
      {
        id: 'm1',
        sender: 'user',
        text: 'Yesterday question',
        timestamp: '08:00 PM',
        created_at: '2026-10-30T20:00:00',
      },
      {
        id: 'm2',
        sender: 'bot',
        text: 'Yesterday answer',
        timestamp: '08:00 PM',
        created_at: '2026-10-30T20:00:05',
      },
      {
        id: 'm3',
        sender: 'user',
        text: 'Today question',
        timestamp: '11:00 AM',
        created_at: '2026-10-31T11:00:00',
      },
    ];

    const timeline = buildChatTimelineItems(messages, refDate);

    expect(timeline.map((t) => t.type)).toEqual([
      'date_header',
      'message',
      'message',
      'date_header',
      'message',
    ]);
    expect(timeline[0]).toMatchObject({
      type: 'date_header',
      dateKey: '2026-10-30',
      label: 'Yesterday • Oct 30, 2026',
    });
    expect(timeline[3]).toMatchObject({
      type: 'date_header',
      dateKey: '2026-10-31',
      label: 'Today • Oct 31, 2026',
    });
  });
});
