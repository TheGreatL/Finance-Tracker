import { vi } from 'vitest';

(globalThis as any).__DEV__ = true;

vi.mock('react-native', () => ({
    Platform: {
        OS: 'android',
        select: (obj: any) => obj.android ?? obj.default
    },
    Share: {
        share: vi.fn(async () => ({ action: 'sharedAction' }))
    },
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    Modal: 'Modal',
    TextInput: 'TextInput',
    ScrollView: 'ScrollView',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    Dimensions: {
        get: vi.fn(() => ({ width: 375, height: 812 }))
    },
    Animated: {
        Value: class {
            setValue = vi.fn();
            interpolate = vi.fn(() => 0);
        },
        timing: vi.fn(() => ({
            start: (cb?: (result: { finished: boolean }) => void) => cb && cb({ finished: true })
        }))
    }
}));

vi.mock('lucide-react-native', () => ({
    Search: () => null,
    X: () => null,
    Check: () => null,
    ChevronDown: () => null,
    CheckCircle2: () => null,
    Info: () => null,
    AlertCircle: () => null
}));

vi.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: ({ children }: any) => children,
    SafeAreaInsetsContext: {
        Consumer: ({ children }: any) => children({ top: 0, bottom: 0, left: 0, right: 0 })
    }
}));

const mockFileSystem = {
    documentDirectory: 'file:///data/user/0/com.app/files/',
    getInfoAsync: vi.fn(async (uri: string) => ({ exists: true, uri })),
    makeDirectoryAsync: vi.fn(async () => {}),
    copyAsync: vi.fn(async () => {}),
    deleteAsync: vi.fn(async () => {}),
    writeAsStringAsync: vi.fn(async () => {}),
    readAsStringAsync: vi.fn(async () => '{}')
};

vi.mock('expo-file-system', () => mockFileSystem);
vi.mock('expo-file-system/legacy', () => mockFileSystem);

vi.mock('expo-document-picker', () => ({
    getDocumentAsync: vi.fn(async () => ({ canceled: true, assets: [] }))
}));

vi.mock('expo-notifications', () => ({
    setNotificationHandler: vi.fn(),
    getPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
    requestPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
    setNotificationChannelAsync: vi.fn(async () => {}),
    scheduleNotificationAsync: vi.fn(async () => 'notif_123'),
    cancelScheduledNotificationAsync: vi.fn(async () => {}),
    AndroidImportance: { HIGH: 4 },
    AndroidNotificationPriority: { HIGH: 'high' },
    SchedulableTriggerInputTypes: { DATE: 'date' }
}));

vi.mock('expo-image-picker', () => ({
    getMediaLibraryPermissionsAsync: vi.fn(async () => ({ status: 'undetermined' })),
    requestMediaLibraryPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
    getCameraPermissionsAsync: vi.fn(async () => ({ status: 'undetermined' })),
    requestCameraPermissionsAsync: vi.fn(async () => ({ status: 'granted' }))
}));
