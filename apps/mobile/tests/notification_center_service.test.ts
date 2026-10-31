import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addAppNotification,
  getAppNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  syncAppNotificationsFromSchedule,
  type AppNotificationRecord,
} from '../src/services/notificationCenterService';

describe('notificationCenterService', () => {
  let mockDb: any;
  let executedSql: { sql: string; params?: any[] }[] = [];
  let storedRows: AppNotificationRecord[] = [];

  beforeEach(() => {
    executedSql = [];
    storedRows = [
      {
        id: 'notif-1',
        type: 'subscription_due',
        title: 'Upcoming Subscription: Netflix',
        body: '₱549 will be charged tomorrow from Maya',
        data: JSON.stringify({ subscriptionId: 'sub-1' }),
        is_read: 0,
        created_at: '2026-10-31T08:00:00.000Z',
      },
      {
        id: 'notif-2',
        type: 'loan_due',
        title: 'Loan Due Soon: BillEase',
        body: '₱2,500 monthly payment is due in 2 days',
        data: JSON.stringify({ loanId: 'loan-1' }),
        is_read: 1,
        created_at: '2026-10-30T09:00:00.000Z',
      },
    ];

    mockDb = {
      runAsync: vi.fn(async (sql: string, ...params: any[]) => {
        executedSql.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      }),
      getAllAsync: vi.fn(async (sql: string, ...params: any[]) => {
        executedSql.push({ sql, params });
        if (sql.includes('FROM app_notifications')) {
          return storedRows;
        }
        if (sql.includes('FROM subscriptions')) {
          return [
            {
              id: 'sub-netflix',
              service_name: 'Netflix',
              amount: 549,
              next_billing_date: '2026-11-01',
              status: 'active',
              pocket_name: 'Main Wallet',
              institution_name: 'Maya',
            },
          ];
        }
        if (sql.includes('FROM loans')) {
          return [
            {
              id: 'loan-billease',
              title: 'BillEase Laptop',
              monthly_payment: 2500,
              due_date: '2026-11-02',
              status: 'active',
              institution_name: 'BillEase',
            },
          ];
        }
        return [];
      }),
      getFirstAsync: vi.fn(async (sql: string, ...params: any[]) => {
        executedSql.push({ sql, params });
        if (sql.includes('COUNT(*)')) {
          return { count: 1 };
        }
        return null;
      }),
    };
  });

  it('retrieves all app notifications and unread count', async () => {
    const list = await getAppNotifications(mockDb);
    expect(list).toHaveLength(2);

    const count = await getUnreadNotificationCount(mockDb);
    expect(count).toBe(1);
  });

  it('adds an app notification', async () => {
    await addAppNotification(mockDb, {
      id: 'notif-new',
      type: 'subscription_paid',
      title: 'Subscription Paid: Spotify',
      body: '₱149 deducted successfully',
      data: { subscriptionId: 'sub-spotify' },
    });

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app_notifications'),
      'notif-new',
      'subscription_paid',
      'Subscription Paid: Spotify',
      '₱149 deducted successfully',
      JSON.stringify({ subscriptionId: 'sub-spotify' }),
      0,
      expect.any(String)
    );
  });

  it('marks a single notification as read', async () => {
    await markNotificationAsRead(mockDb, 'notif-1');
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE app_notifications SET is_read = 1 WHERE id = ?'),
      'notif-1'
    );
  });

  it('marks all notifications as read', async () => {
    await markAllNotificationsAsRead(mockDb);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE app_notifications SET is_read = 1 WHERE is_read = 0')
    );
  });

  it('clears all notifications', async () => {
    await clearAllNotifications(mockDb);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM app_notifications')
    );
  });

  it('syncs upcoming subscriptions and loans into app notifications', async () => {
    const refDate = new Date(2026, 9, 31, 10, 0, 0); // 2026-10-31
    const syncedCount = await syncAppNotificationsFromSchedule(mockDb, refDate);

    expect(syncedCount).toBeGreaterThanOrEqual(1);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO app_notifications'),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      0,
      expect.any(String)
    );
  });
});

