export const SCREEN_FILES = [
    '01-dashboard.png',
    '02-sidebar.png',
    '03-accounts.png',
    '04-institution-detail.png',
    '05-obligations-salary.png',
    '06-obligations-loans.png',
    '07-obligations-subscriptions.png',
    '08-ledger.png',
    '09-analytics.png',
    '10-advisor.png'
] as const;

export function verifyPngBuffer(buf: Buffer): { valid: boolean; width: number; height: number } {
    if (buf.length < 24) {
        return { valid: false, width: 0, height: 0 };
    }

    // Check PNG signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    const isPng =
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47 &&
        buf[4] === 0x0d &&
        buf[5] === 0x0a &&
        buf[6] === 0x1a &&
        buf[7] === 0x0a;

    if (!isPng) {
        return { valid: false, width: 0, height: 0 };
    }

    // IHDR chunk: width at byte 16, height at byte 20 (big-endian 32-bit uint)
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);

    return {
        valid: width > 0 && height > 0,
        width,
        height
    };
}
