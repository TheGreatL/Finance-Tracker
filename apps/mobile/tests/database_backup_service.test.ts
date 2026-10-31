import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as FileSystem from 'expo-file-system';
import { Share } from 'react-native';
import {
  exportDatabaseBackup,
  validateDatabaseBackup,
  importDatabaseBackup,
  pickAndValidateBackupFile,
  type DatabaseBackup,
} from '../src/services/databaseBackupService';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

describe('databaseBackupService', () => {
  let mockDb: any;
  let executedSql: { sql: string; params?: any[] }[] = [];

  const sampleBackup: DatabaseBackup = {
    version: 1,
    exportedAt: '2026-10-31T10:00:00.000Z',
    appName: 'Finance Tracker',
    schemaVersion: 2,
    data: {
      institutions: [
        {
          id: 'inst-1',
          name: 'Maya',
          type: 'ewallet',
          code: 'maya',
          color: '#18342B',
          icon: 'maya',
          notes: 'Primary e-wallet',
          is_archived: 0,
          created_at: '2026-10-01T00:00:00.000Z',
          updated_at: '2026-10-01T00:00:00.000Z',
        },
      ],
      account_pockets: [
        {
          id: 'pocket-1',
          institution_id: 'inst-1',
          name: 'Main Wallet',
          pocket_type: 'wallet',
          currency: 'PHP',
          starting_balance: 1000,
          current_balance: 2500,
          interest_rate: null,
          savings_details: '',
          is_archived: 0,
          created_at: '2026-10-01T00:00:00.000Z',
          updated_at: '2026-10-01T00:00:00.000Z',
        },
      ],
      transactions: [
        {
          id: 'tx-1',
          title: 'Grocery Run',
          pocket_id: 'pocket-1',
          to_pocket_id: null,
          type: 'expense',
          amount: 500,
          category: 'Groceries',
          date: '2026-10-25',
          notes: '',
          created_at: '2026-10-25T12:00:00.000Z',
          updated_at: '2026-10-25T12:00:00.000Z',
        },
      ],
      loans: [
        {
          id: 'loan-1',
          institution_id: 'inst-1',
          title: 'Laptop Loan',
          total_amount: 15000,
          remaining_balance: 10000,
          monthly_payment: 2500,
          due_date: '2026-11-15',
          interest_rate: 3.5,
          attachment_path: '',
          attachment_name: '',
          status: 'active',
          notes: '',
          created_at: '2026-10-15T00:00:00.000Z',
          updated_at: '2026-10-15T00:00:00.000Z',
        },
      ],
      subscriptions: [
        {
          id: 'sub-1',
          service_name: 'Netflix',
          service_code: 'netflix',
          pocket_id: 'pocket-1',
          amount: 549,
          frequency: 'monthly',
          start_date: '2026-10-01',
          next_billing_date: '2026-11-01',
          category: 'Entertainment',
          status: 'active',
          reminder_days_before: 1,
          notification_id: '',
          notes: '',
          created_at: '2026-10-01T00:00:00.000Z',
          updated_at: '2026-10-01T00:00:00.000Z',
        },
      ],
      chat_messages: [
        {
          id: 'msg-1',
          sender: 'user',
          text: 'Can I afford ₱500?',
          status: 'info',
          source: 'offline',
          timestamp: '10:00 AM',
          created_at: '2026-10-31T10:00:00.000Z',
        },
      ],
      app_notifications: [],
    },
    summary: {
      institutionsCount: 1,
      pocketsCount: 1,
      transactionsCount: 1,
      loansCount: 1,
      subscriptionsCount: 1,
    },
  };

  beforeEach(() => {
    executedSql = [];
    mockDb = {
      getAllAsync: vi.fn(async (sql: string) => {
        executedSql.push({ sql });
        if (sql.includes('institutions')) return sampleBackup.data.institutions;
        if (sql.includes('account_pockets')) return sampleBackup.data.account_pockets;
        if (sql.includes('transactions')) return sampleBackup.data.transactions;
        if (sql.includes('loans')) return sampleBackup.data.loans;
        if (sql.includes('subscriptions')) return sampleBackup.data.subscriptions;
        if (sql.includes('chat_messages')) return sampleBackup.data.chat_messages;
        if (sql.includes('app_notifications')) return [];
        return [];
      }),
      execAsync: vi.fn(async (sql: string) => {
        executedSql.push({ sql });
      }),
      runAsync: vi.fn(async (sql: string, ...params: any[]) => {
        executedSql.push({ sql, params });
      }),
    };
  });

  describe('exportDatabaseBackup', () => {
    it('gathers all tables and writes backup JSON file', async () => {
      const result = await exportDatabaseBackup(mockDb);

      expect(result.summary.institutionsCount).toBe(1);
      expect(result.summary.transactionsCount).toBe(1);
      expect(result.summary.loansCount).toBe(1);
      expect(result.summary.subscriptionsCount).toBe(1);
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
      expect(Share.share).toHaveBeenCalled();
      expect(result.filePath).toContain('finance_tracker_backup_');
    });
  });

  describe('validateDatabaseBackup', () => {
    it('validates a correct backup structure', () => {
      const jsonStr = JSON.stringify(sampleBackup);
      const res = validateDatabaseBackup(jsonStr);

      expect(res.valid).toBe(true);
      expect(res.backup?.summary.institutionsCount).toBe(1);
    });

    it('rejects invalid JSON or missing data structure', () => {
      const res1 = validateDatabaseBackup('{ invalid json');
      expect(res1.valid).toBe(false);

      const res2 = validateDatabaseBackup(JSON.stringify({ version: 1 }));
      expect(res2.valid).toBe(false);
      expect(res2.error).toContain('Missing database tables');
    });
  });

  describe('importDatabaseBackup', () => {
    it('restores all tables inside a transaction', async () => {
      const result = await importDatabaseBackup(mockDb, sampleBackup);

      expect(result.success).toBe(true);
      expect(result.restoredCounts.institutions).toBe(1);
      expect(result.restoredCounts.transactions).toBe(1);
      expect(mockDb.execAsync).toHaveBeenCalledWith(expect.stringContaining('PRAGMA foreign_keys = OFF;'));
      expect(mockDb.execAsync).toHaveBeenCalledWith(expect.stringContaining('PRAGMA foreign_keys = ON;'));
    });
  });

  describe('pickAndValidateBackupFile', () => {
    it('throws error when file storage permission is denied', async () => {
      vi.mocked(ImagePicker.getMediaLibraryPermissionsAsync).mockResolvedValueOnce({
        status: 'denied' as any,
        expires: 'never',
        granted: false,
        canAskAgain: false,
      });
      vi.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValueOnce({
        status: 'denied' as any,
        expires: 'never',
        granted: false,
        canAskAgain: false,
      });

      await expect(pickAndValidateBackupFile()).rejects.toThrow(
        /File access permission was denied/
      );
    });

    it('proceeds with document picker when permission is granted', async () => {
      vi.mocked(ImagePicker.getMediaLibraryPermissionsAsync).mockResolvedValueOnce({
        status: 'granted' as any,
        expires: 'never',
        granted: true,
        canAskAgain: true,
      });
      vi.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: 'file:///data/backup.json',
            name: 'backup.json',
            mimeType: 'application/json',
            size: 100,
          },
        ],
      } as any);
      vi.mocked(FileSystem.readAsStringAsync).mockResolvedValueOnce(
        JSON.stringify(sampleBackup)
      );

      const backup = await pickAndValidateBackupFile();
      expect(backup).not.toBeNull();
      expect(backup?.appName).toBe('Finance Tracker');
      expect(backup?.summary.institutionsCount).toBe(1);
    });
  });
});

