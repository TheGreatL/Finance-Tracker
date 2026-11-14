import * as fs from 'node:fs';
import * as path from 'node:path';
import { synthesizeSoundtrackWav } from '../src/audio/synth';
import { AVP_CONFIG } from '../src/constants/theme';

const outDir = path.resolve(__dirname, '../public/audio');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const outPath = path.join(outDir, 'soundtrack.wav');
console.log(`[AVP Audio] Synthesizing ${AVP_CONFIG.durationSeconds}.0s soundtrack + UI SFX cues...`);
const wavBuffer = synthesizeSoundtrackWav(AVP_CONFIG.durationSeconds, 44100);
fs.writeFileSync(outPath, wavBuffer);

console.log(`[AVP Audio] Successfully generated soundtrack at: ${outPath} (${wavBuffer.length} bytes)`);
