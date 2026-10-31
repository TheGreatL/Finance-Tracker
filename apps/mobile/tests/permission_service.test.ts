import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import {
  requestInitialAppPermissions,
  resetPermissionRequestLockForTests,
} from '../src/services/permissionService';

describe('permissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPermissionRequestLockForTests();
  });

  it('requests notification, media library, and camera permissions on startup', async () => {
    vi.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({
      status: 'undetermined' as any,
      expires: 'never',
      granted: false,
      canAskAgain: true,
    });
    vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({
      status: 'granted' as any,
      expires: 'never',
      granted: true,
      canAskAgain: true,
    });

    const result = await requestInitialAppPermissions();

    expect(result).toEqual({
      notifications: true,
      mediaLibrary: true,
      camera: true,
    });
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('skips requesting media library or camera if already granted', async () => {
    vi.mocked(ImagePicker.getMediaLibraryPermissionsAsync).mockResolvedValueOnce({
      status: 'granted' as any,
      expires: 'never',
      granted: true,
      canAskAgain: true,
    });
    vi.mocked(ImagePicker.getCameraPermissionsAsync).mockResolvedValueOnce({
      status: 'granted' as any,
      expires: 'never',
      granted: true,
      canAskAgain: true,
    });

    const result = await requestInitialAppPermissions();

    expect(result.mediaLibrary).toBe(true);
    expect(result.camera).toBe(true);
    expect(ImagePicker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
    expect(ImagePicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent startup permission calls', async () => {
    const [r1, r2] = await Promise.all([
      requestInitialAppPermissions(),
      requestInitialAppPermissions(),
    ]);

    expect(r1).toEqual(r2);
    expect(ImagePicker.getMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});

