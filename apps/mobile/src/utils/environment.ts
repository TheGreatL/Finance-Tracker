import { Platform } from 'react-native';

/**
 * Returns true if running in development mode (Metro bundler / expo start / npm run android).
 * React Native replaces `__DEV__` with `false` in production release builds (e.g. EAS build / release APK),
 * which enables bundlers to dead-code eliminate dev-only features.
 */
export const isDevelopment: boolean = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : process.env.NODE_ENV !== 'production';

/**
 * Detects if the current environment is an Android emulator or iOS simulator.
 */
export function isRunningOnEmulator(): boolean {
    if (Platform.OS === 'android') {
        const constants: any = Platform.constants || {};
        const model = String(constants.Model || '').toLowerCase();
        const fingerprint = String(constants.Fingerprint || '').toLowerCase();
        const brand = String(constants.Brand || '').toLowerCase();
        const manufacturer = String(constants.Manufacturer || '').toLowerCase();

        return (
            fingerprint.startsWith('generic') ||
            fingerprint.includes('sdk_gphone') ||
            model.includes('google_sdk') ||
            model.includes('emulator') ||
            model.includes('sdk_gphone') ||
            model.includes('android sdk built for') ||
            manufacturer.includes('genymotion') ||
            brand.startsWith('generic')
        );
    }

    if (Platform.OS === 'ios') {
        const constants: any = Platform.constants || {};
        return Boolean(constants.isTesting || (constants.systemName && String(constants.systemName).toLowerCase().includes('simulator')));
    }

    return false;
}

/**
 * Option 1: Demo seed data action is visible during development mode (__DEV__),
 * and strictly hidden on production builds installed on real mobile devices.
 */
export const isDemoDataAvailable: boolean = isDevelopment;
