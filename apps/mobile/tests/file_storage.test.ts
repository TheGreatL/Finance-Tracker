import { describe, it, expect, vi } from 'vitest';
import { sanitizeAttachmentFilename, getAttachmentStoragePath } from '../src/utils/fileStorage';

describe('fileStorage utility', () => {
  it('sanitizeAttachmentFilename cleans special characters and spaces', () => {
    const raw = 'My Loan Contract (BDO) - Final #1.pdf';
    const cleaned = sanitizeAttachmentFilename(raw);
    expect(cleaned).toBe('My_Loan_Contract_BDO_-_Final_1.pdf');
    expect(cleaned.endsWith('.pdf')).toBe(true);
  });

  it('sanitizeAttachmentFilename generates timestamp fallback when empty', () => {
    const cleaned = sanitizeAttachmentFilename('');
    expect(cleaned.startsWith('loan_attachment_')).toBe(true);
    expect(cleaned.endsWith('.jpg')).toBe(true);
  });

  it('getAttachmentStoragePath combines documentDirectory and unique filename', () => {
    const baseDir = 'file:///data/user/0/com.app/files/';
    const path = getAttachmentStoragePath(baseDir, 'contract.pdf', 1234567890);
    expect(path).toBe('file:///data/user/0/com.app/files/attachments/loan_1234567890_contract.pdf');
  });
});
