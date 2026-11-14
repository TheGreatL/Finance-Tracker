import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { SCREEN_FILES, verifyPngBuffer } from '../src/screens/screenRegistry';

describe('Captured AVD screen assets', () => {
    it('verifies all 10 required screen PNGs exist with valid PNG headers and mobile dimensions', () => {
        expect(SCREEN_FILES).toHaveLength(10);
        const screensDir = path.resolve(__dirname, '../public/screens');
        for (const file of SCREEN_FILES) {
            const fullPath = path.join(screensDir, file);
            expect(fs.existsSync(fullPath)).toBe(true);
            const buf = fs.readFileSync(fullPath);
            const info = verifyPngBuffer(buf);
            expect(info.valid).toBe(true);
            expect(info.width).toBeGreaterThanOrEqual(720);
            expect(info.height).toBeGreaterThanOrEqual(1280);
        }
    });

    it('guarantees captured screen files are unique and not duplicate frozen frames', () => {
        const screensDir = path.resolve(__dirname, '../public/screens');
        const hashes = new Set<string>();
        for (const file of SCREEN_FILES) {
            const fullPath = path.join(screensDir, file);
            const buf = fs.readFileSync(fullPath);
            const hash = crypto.createHash('sha256').update(buf).digest('hex');
            hashes.add(hash);
        }
        // All 10 screens must be distinct captures
        expect(hashes.size).toBe(10);
    });
});
