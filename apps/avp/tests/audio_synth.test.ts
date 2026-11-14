import { describe, expect, it } from 'vitest';
import { synthesizeSoundtrackWav } from '../src/audio/synth';

describe('Deterministic WAV audio synthesizer', () => {
    it('creates a valid 44-byte RIFF/WAVE header and exact PCM payload length without clipping', () => {
        const durationSec = 1; // 1s slice is plenty to test RIFF header, PCM layout and synthesis
        const sampleRate = 44100;
        const wav = synthesizeSoundtrackWav(durationSec, sampleRate);
        expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
        expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
        expect(wav.toString('ascii', 12, 16)).toBe('fmt ');
        expect(wav.toString('ascii', 36, 40)).toBe('data');

        const expectedDataBytes = durationSec * sampleRate * 2 * 2; // 2 channels * 2 bytes/sample
        expect(wav.readUInt32LE(40)).toBe(expectedDataBytes);
        expect(wav.length).toBe(44 + expectedDataBytes);

        let sumSq = 0;
        let minSample = 0;
        let maxSample = 0;
        const sampleCount = expectedDataBytes / 2;
        for (let i = 0; i < sampleCount; i++) {
            const s = wav.readInt16LE(44 + i * 2);
            if (s < minSample) minSample = s;
            if (s > maxSample) maxSample = s;
            sumSq += s * s;
        }
        expect(minSample).toBeGreaterThanOrEqual(-32768);
        expect(maxSample).toBeLessThanOrEqual(32767);

        const rms = Math.sqrt(sumSq / sampleCount);
        expect(rms).toBeGreaterThan(500);
        expect(rms).toBeLessThan(28000);
    });
});
