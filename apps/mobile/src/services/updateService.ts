import * as Updates from 'expo-updates';

export interface UpdateInfo {
    isEnabled: boolean;
    updateId: string | null;
    shortUpdateId: string;
    channel: string;
    runtimeVersion: string | null;
    isEmbeddedLaunch: boolean;
    createdAt: Date | null;
}

export interface CheckUpdateResult {
    isAvailable: boolean;
    manifest?: any;
    error?: string;
}

/**
 * Returns diagnostic metadata about the current running update / binary.
 */
export function getUpdateInfo(): UpdateInfo {
    const isEnabled = Updates.isEnabled ?? false;
    const updateId = Updates.updateId ?? null;
    const shortUpdateId = updateId ? updateId.slice(0, 8) : 'Embedded';
    const channel = Updates.channel || (isEnabled ? 'production' : 'local-dev');
    const runtimeVersion = Updates.runtimeVersion ?? null;
    const isEmbeddedLaunch = Updates.isEmbeddedLaunch ?? true;
    const createdAt = Updates.createdAt ?? null;

    return {
        isEnabled,
        updateId,
        shortUpdateId,
        channel,
        runtimeVersion,
        isEmbeddedLaunch,
        createdAt
    };
}

/**
 * Checks Expo servers for an available OTA update.
 */
export async function checkForUpdate(): Promise<CheckUpdateResult> {
    if (__DEV__ || !Updates.isEnabled) {
        return { isAvailable: false };
    }

    try {
        const result = await Updates.checkForUpdateAsync();
        return {
            isAvailable: result.isAvailable,
            manifest: result.manifest
        };
    } catch (err: any) {
        return {
            isAvailable: false,
            error: err?.message || 'Failed to check for updates'
        };
    }
}

/**
 * Fetches the newly available update and reloads the application.
 */
export async function fetchAndApplyUpdate(): Promise<{ success: boolean; error?: string }> {
    if (__DEV__ || !Updates.isEnabled) {
        return { success: false, error: 'Updates not enabled in development' };
    }

    try {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
        return { success: true };
    } catch (err: any) {
        return {
            success: false,
            error: err?.message || 'Failed to download update'
        };
    }
}

/**
 * Silently checks for updates on cold start. If an update is available,
 * it downloads it in the background and presents a restart toast to the user.
 */
export async function autoCheckAndNotify(showToast: (options: any) => void): Promise<void> {
    if (__DEV__ || !Updates.isEnabled) {
        return;
    }

    try {
        const check = await checkForUpdate();
        if (check.isAvailable) {
            // Silently download the update
            await Updates.fetchUpdateAsync();

            // Notify user with action button to apply now
            showToast({
                message: 'New update downloaded! Restart to apply.',
                type: 'info',
                action: {
                    label: 'Restart',
                    onPress: () => {
                        Updates.reloadAsync().catch(() => {});
                    }
                },
                durationMs: 12000
            });
        }
    } catch (error) {
        // Silent failure in background - log for diagnostics
        console.warn('OTA background check error:', error);
    }
}
