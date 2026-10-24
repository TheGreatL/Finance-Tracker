import { vi } from 'vitest';

(globalThis as any).__DEV__ = true;

vi.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: (obj: any) => obj.android ?? obj.default,
  },
}));

const mockFileSystem = {
  documentDirectory: 'file:///data/user/0/com.app/files/',
  getInfoAsync: vi.fn(async (uri: string) => ({ exists: true, uri })),
  makeDirectoryAsync: vi.fn(async () => {}),
  copyAsync: vi.fn(async () => {}),
  deleteAsync: vi.fn(async () => {}),
};

vi.mock('expo-file-system', () => mockFileSystem);
vi.mock('expo-file-system/legacy', () => mockFileSystem);

vi.mock('expo-notifications', () => ({
  setNotificationHandler: vi.fn(),
  getPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
  setNotificationChannelAsync: vi.fn(async () => {}),
  scheduleNotificationAsync: vi.fn(async () => 'notif_123'),
  cancelScheduledNotificationAsync: vi.fn(async () => {}),
  AndroidImportance: { HIGH: 4 },
  AndroidNotificationPriority: { HIGH: 'high' },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
