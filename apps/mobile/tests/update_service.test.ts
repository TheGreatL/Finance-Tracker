import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Updates from 'expo-updates';
import { getUpdateInfo, checkForUpdate, fetchAndApplyUpdate, autoCheckAndNotify } from '../src/services/updateService';

describe('updateService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (Updates as any).isEnabled = false;
        (Updates as any).updateId = null;
        (Updates as any).channel = null;
        (globalThis as any).__DEV__ = true;
    });

    it('returns default metadata from getUpdateInfo', () => {
        const info = getUpdateInfo();
        expect(info.isEnabled).toBe(false);
        expect(info.shortUpdateId).toBe('Embedded');
        expect(info.channel).toBe('local-dev');
    });

    it('returns short update id when updateId exists', () => {
        (Updates as any).isEnabled = true;
        (Updates as any).updateId = 'abcdef1234567890';
        (Updates as any).channel = 'preview';

        const info = getUpdateInfo();
        expect(info.isEnabled).toBe(true);
        expect(info.shortUpdateId).toBe('abcdef12');
        expect(info.channel).toBe('preview');
    });

    it('does not check for update when in dev mode', async () => {
        const result = await checkForUpdate();
        expect(result.isAvailable).toBe(false);
        expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
    });

    it('checks for update when not in dev and updates enabled', async () => {
        (globalThis as any).__DEV__ = false;
        (Updates as any).isEnabled = true;
        (Updates.checkForUpdateAsync as any).mockResolvedValueOnce({
            isAvailable: true,
            manifest: { id: 'test-manifest' }
        });

        const result = await checkForUpdate();
        expect(result.isAvailable).toBe(true);
        expect(result.manifest).toEqual({ id: 'test-manifest' });
    });

    it('autoCheckAndNotify downloads and displays restart toast if update available', async () => {
        (globalThis as any).__DEV__ = false;
        (Updates as any).isEnabled = true;
        (Updates.checkForUpdateAsync as any).mockResolvedValueOnce({ isAvailable: true });
        (Updates.fetchUpdateAsync as any).mockResolvedValueOnce({ isNew: true });

        const showToast = vi.fn();
        await autoCheckAndNotify(showToast);

        expect(Updates.fetchUpdateAsync).toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'New update downloaded! Restart to apply.',
                type: 'info',
                action: expect.objectContaining({
                    label: 'Restart'
                })
            })
        );
    });

    it('fetchAndApplyUpdate triggers download and reload', async () => {
        (globalThis as any).__DEV__ = false;
        (Updates as any).isEnabled = true;

        const result = await fetchAndApplyUpdate();
        expect(result.success).toBe(true);
        expect(Updates.fetchUpdateAsync).toHaveBeenCalled();
        expect(Updates.reloadAsync).toHaveBeenCalled();
    });
});
