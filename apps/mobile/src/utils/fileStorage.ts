import * as FileSystem from 'expo-file-system/legacy';

export function sanitizeAttachmentFilename(name: string): string {
  if (!name || !name.trim()) {
    return `loan_attachment_${Date.now()}.jpg`;
  }
  // Replace spaces and special symbols with underscores, keep extension
  const clean = name.trim().replace(/[\s()[\]{}<>:"/\\|?*#]+/g, '_').replace(/_+/g, '_');
  return clean || `loan_attachment_${Date.now()}.jpg`;
}

export function getAttachmentStoragePath(
  baseDir: string,
  filename: string,
  timestamp: number = Date.now()
): string {
  const normalizedBase = baseDir.endsWith('/') ? baseDir : `${baseDir}/`;
  const sanitized = sanitizeAttachmentFilename(filename);
  return `${normalizedBase}attachments/loan_${timestamp}_${sanitized}`;
}

/**
 * Copies a selected file or captured photo into the app's persistent document directory.
 * Returns the persistent local file URI to save in SQLite.
 */
export async function saveAttachment(sourceUri: string, originalName: string): Promise<string> {
  const docDir = FileSystem.documentDirectory;
  if (!docDir) {
    throw new Error('FileSystem document directory is unavailable on this device.');
  }

  const attachmentsDir = `${docDir}attachments/`;
  const dirInfo = await FileSystem.getInfoAsync(attachmentsDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(attachmentsDir, { intermediates: true });
  }

  const destPath = getAttachmentStoragePath(docDir, originalName);
  await FileSystem.copyAsync({
    from: sourceUri,
    to: destPath,
  });

  return destPath;
}

/**
 * Deletes a local attachment file from disk when a loan is removed.
 */
export async function deleteAttachment(fileUri: string): Promise<void> {
  if (!fileUri) return;
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch (err) {
    console.warn('Could not delete attachment file:', fileUri, err);
  }
}
