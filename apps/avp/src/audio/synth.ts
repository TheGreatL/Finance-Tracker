import { SCENES } from '../constants/timeline';

export function synthesizeSoundtrackWav(durationSeconds: number = 35, sampleRate: number = 44100): Buffer {
    const numChannels = 2;
    const bitsPerSample = 16;
    const totalSamples = Math.floor(durationSeconds * sampleRate);
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = totalSamples * blockAlign;
    const headerSize = 44;
    const buffer = Buffer.alloc(headerSize + dataSize);

    // RIFF identifier
    buffer.write('RIFF', 0, 'ascii');
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8, 'ascii');

    // fmt subchunk
    buffer.write('fmt ', 12, 'ascii');
    buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);

    // data subchunk
    buffer.write('data', 36, 'ascii');
    buffer.writeUInt32LE(dataSize, 40);

    // Audio Synthesis (120 BPM, Chords: Fmaj7 -> G6 -> Em7 -> Am7)
    const bpm = 120;
    const beatSec = 60 / bpm;
    const barSec = beatSec * 4;

    const chords = [
        [174.61, 220.0, 261.63, 329.63], // Fmaj7 (F3, A3, C4, E4)
        [196.0, 246.94, 293.66, 329.63], // G6 (G3, B3, D4, E4)
        [164.81, 196.0, 246.94, 293.66], // Em7 (E3, G3, B3, D4)
        [220.0, 261.63, 329.63, 392.0] // Am7 (A3, C4, E4, G4)
    ];

    // SFX triggers from SCENES (start frames / 30fps)
    const sceneStartTimes = SCENES.map((s) => s.startFrame / 30);
    // Card pop offset triggers for 3.5s scenes
    const cardPopTimes: number[] = [];
    for (const st of sceneStartTimes) {
        cardPopTimes.push(st + 0.8, st + 2.0);
    }

    let writeOffset = headerSize;

    for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;

        // 1. Chords & Pad
        const chordIndex = Math.floor(t / barSec) % chords.length;
        const currentChord = chords[chordIndex];
        const barPos = (t % barSec) / barSec;
        const padEnvelope = Math.sin(barPos * Math.PI) * 0.18;

        let pad = 0;
        for (const freq of currentChord) {
            pad += Math.sin(2 * Math.PI * freq * t) * padEnvelope;
        }

        // 2. Arpeggio / Pluck (16th notes)
        const sixteenthSec = beatSec / 4;
        const noteIndexInBar = Math.floor((t % barSec) / sixteenthSec);
        const arpNoteFreq = currentChord[noteIndexInBar % currentChord.length] * 2; // octave up
        const arpT = (t % sixteenthSec) / sixteenthSec;
        const arpEnvelope = Math.exp(-arpT * 8) * 0.16;
        const arp = Math.sin(2 * Math.PI * arpNoteFreq * t) * arpEnvelope;

        // 3. Soft Sub-Bass
        const bassFreq = currentChord[0] / 2; // sub octave
        const bassBeat = (t % beatSec) / beatSec;
        const bassEnv = Math.exp(-bassBeat * 4) * 0.22;
        const bass = Math.sin(2 * Math.PI * bassFreq * t) * bassEnv;

        // 4. Soft Percussion (Kick on beat 0 & 2, Hat on 8th notes)
        const beatPos = (t % beatSec) / beatSec;
        const isKickBeat = Math.floor(t / beatSec) % 2 === 0;
        const kickEnv = isKickBeat ? Math.exp(-beatPos * 20) * 0.25 : 0;
        const kickFreq = Math.max(45, 120 * Math.exp(-beatPos * 18));
        const kick = Math.sin(2 * Math.PI * kickFreq * beatPos * beatSec) * kickEnv;

        const eighthSec = beatSec / 2;
        const eighthPos = (t % eighthSec) / eighthSec;
        const hatEnv = Math.exp(-eighthPos * 25) * 0.04;
        const noise = (Math.random() * 2 - 1) * hatEnv;

        // 5. SFX: Scene Transition Whoosh
        let whoosh = 0;
        for (const st of sceneStartTimes) {
            const dt = t - st;
            if (dt >= -0.25 && dt <= 0.35) {
                const wEnv = Math.sin(((dt + 0.25) / 0.6) * Math.PI) * 0.14;
                whoosh += (Math.random() * 2 - 1) * wEnv;
            }
        }

        // 6. SFX: Card Pop & Chimes
        let sfx = 0;
        for (const pt of cardPopTimes) {
            const dt = t - pt;
            if (dt >= 0 && dt <= 0.25) {
                const popFreq = 880 + Math.sin(dt * 40) * 200;
                const popEnv = Math.exp(-dt * 24) * 0.18;
                sfx += Math.sin(2 * Math.PI * popFreq * dt) * popEnv;
            }
        }

        // Payday / Cashback Chimes at ~15.0s, ~22.0s, ~29.0s
        for (const chimeTime of [15.0, 22.0, 29.0]) {
            const dt = t - chimeTime;
            if (dt >= 0 && dt <= 0.6) {
                const chimeFreq = 1318.51; // E6
                const chimeEnv = Math.exp(-dt * 6) * 0.22;
                sfx += Math.sin(2 * Math.PI * chimeFreq * dt) * chimeEnv;
            }
        }

        // Master Mix (Left & Right with subtle stereo spread)
        const masterLeft = (pad + arp * 0.85 + bass + kick + noise * 0.7 + whoosh * 0.9 + sfx) * 0.95;
        const masterRight = (pad + arp * 1.15 + bass + kick + noise * 1.3 + whoosh * 1.1 + sfx) * 0.95;

        // Soft limit using tanh to guarantee no 16-bit PCM wrap-around
        const clampedLeft = Math.floor(Math.tanh(masterLeft) * 32000);
        const clampedRight = Math.floor(Math.tanh(masterRight) * 32000);

        buffer.writeInt16LE(clampedLeft, writeOffset);
        buffer.writeInt16LE(clampedRight, writeOffset + 2);
        writeOffset += 4;
    }

    return buffer;
}
