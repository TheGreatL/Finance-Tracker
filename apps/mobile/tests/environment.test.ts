import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Platform } from 'react-native';
import { isRunningOnEmulator, isDevelopment, isDemoDataAvailable } from '../src/utils/environment';

describe('environment utils', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('identifies development environment correctly', () => {
        expect(typeof isDevelopment).toBe('boolean');
        expect(isDemoDataAvailable).toBe(isDevelopment);
    });

    it('detects Android emulator from fingerprint or model signatures', () => {
        const originalOS = Platform.OS;
        const originalConstants = Platform.constants;

        Platform.OS = 'android';
        (Platform as any).constants = {
            Model: 'sdk_gphone64_x86_64',
            Fingerprint: 'google/sdk_gphone64_x86_64/emu64x:14',
            Brand: 'google',
            Manufacturer: 'Google'
        };

        expect(isRunningOnEmulator()).toBe(true);

        // Real device
        (Platform as any).constants = {
            Model: 'SM-S918B',
            Fingerprint: 'samsung/dm3qxxx/dm3q:14/UP1A.231005.007',
            Brand: 'samsung',
            Manufacturer: 'samsung'
        };

        expect(isRunningOnEmulator()).toBe(false);

        // Restore
        Platform.OS = originalOS;
        (Platform as any).constants = originalConstants;
    });

    it('detects iOS simulator from systemName', () => {
        const originalOS = Platform.OS;
        const originalConstants = Platform.constants;

        Platform.OS = 'ios';
        (Platform as any).constants = {
            systemName: 'iOS Simulator',
            isTesting: false
        };

        expect(isRunningOnEmulator()).toBe(true);

        // Real iOS device
        (Platform as any).constants = {
            systemName: 'iOS',
            isTesting: false
        };

        expect(isRunningOnEmulator()).toBe(false);

        // Restore
        Platform.OS = originalOS;
        (Platform as any).constants = originalConstants;
    });
});
