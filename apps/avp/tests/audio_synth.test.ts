import { describe, expect, it } from 'vitest';
import { synthesizeSoundtrackWav } from '../src/audio/synth';

describe('Deterministic WAV audio synthesizer', () => {
    it('creates a valid 44-byte RIFF/WAVE header and exact PCM payload length without clipping', () => {
        const wav = synthesizeSoundtrackWav(2, 44100); // 2s slice for fast unit test
        expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
        expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
        expect(wav.toString('ascii', 12, 16)).toBe('fmt ');
        expect(wav.toString('ascii', 36, 40)).toBe('data');

        const expectedDataBytes = 2 * 44100 * 2 * 2; // 2 channels * 2 bytes/sample
        expect(wav.readUInt32LE(40)).toBe(expectedDataBytes);
        expect(wav.length).toBe(44 + expectedDataBytes);

        let sumSq = 0;
        const sampleCount = expectedDataBytes / 2;
        for (let i = 0; i < sampleCount; i++) {
            const s = wav.readInt16LE(44 + i * 2);
            expect(s).toBeGreaterThanOrEqual(-32768);
            expect(s).toBeLessThanOrEqual(32767);
            sumSq += s * s;
        }
        const rms = Math.sqrt(sumSq / sampleCount);
        expect(rms).toBeGreaterThan(500);
        expect(rms).toBeLessThan(28000);
    });
});
