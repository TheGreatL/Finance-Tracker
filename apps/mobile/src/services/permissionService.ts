import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { requestNotificationPermissions } from './notificationService';

export interface AppPermissionsStatus {
  notifications: boolean;
  mediaLibrary: boolean;
  camera: boolean;
}

let inFlightPermissionRequest: Promise<AppPermissionsStatus> | null = null;
let hasRequestedThisSession = false;
let cachedPermissionStatus: AppPermissionsStatus = {
  notifications: false,
  mediaLibrary: false,
  camera: false,
};

export function resetPermissionRequestLockForTests(): void {
  inFlightPermissionRequest = null;
  hasRequestedThisSession = false;
  cachedPermissionStatus = {
    notifications: false,
    mediaLibrary: false,
    camera: false,
  };
}

/**
 * Sequentially requests required device service permissions on app startup:
 * 1. Local Notifications (for subscription billing alerts, payment confirmations, and loan reminders)
 * 2. Media Library / Photos (for attaching loan contracts, statements, and receipts)
 * 3. Camera (for photographing receipts and loan documents)
 */
export async function requestInitialAppPermissions(): Promise<AppPermissionsStatus> {
  if (Platform.OS === 'web') {
    return { notifications: false, mediaLibrary: false, camera: false };
  }

  if (hasRequestedThisSession) {
    return cachedPermissionStatus;
  }

  if (inFlightPermissionRequest) {
    return inFlightPermissionRequest;
  }

  inFlightPermissionRequest = (async (): Promise<AppPermissionsStatus> => {
    let notifications = false;
    let mediaLibrary = false;
    let camera = false;

    // 1. Notifications
    try {
      notifications = await requestNotificationPermissions();
    } catch (err) {
      console.warn('Notification permission check failed:', err);
    }

    // 2. Media Library (Photos / Videos for receipt & contract attachments)
    try {
      const existingMedia = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (existingMedia.status === 'granted') {
        mediaLibrary = true;
      } else {
        const requestedMedia = await ImagePicker.requestMediaLibraryPermissionsAsync();
        mediaLibrary = requestedMedia.status === 'granted';
      }
    } catch (err) {
      console.warn('Media library permission check failed:', err);
    }

    // 3. Camera
    try {
      const existingCamera = await ImagePicker.getCameraPermissionsAsync();
      if (existingCamera.status === 'granted') {
        camera = true;
      } else {
        const requestedCamera = await ImagePicker.requestCameraPermissionsAsync();
        camera = requestedCamera.status === 'granted';
      }
    } catch (err) {
      console.warn('Camera permission check failed:', err);
    }

    cachedPermissionStatus = { notifications, mediaLibrary, camera };
    hasRequestedThisSession = true;
    return cachedPermissionStatus;
  })();

  try {
    return await inFlightPermissionRequest;
  } finally {
    inFlightPermissionRequest = null;
  }
}

/**
 * Specifically verifies and requests file/media storage permission before opening file pickers
 * (such as importing a database backup).
 */
export async function requestFileStoragePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  try {
    const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (existing.status === 'granted') {
      return true;
    }
    const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return requested.status === 'granted';
  } catch (err) {
    console.warn('File storage permission check failed:', err);
    return false;
  }
}


