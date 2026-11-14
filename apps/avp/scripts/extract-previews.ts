import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const outDir = path.resolve('apps/avp/out/previews');
fs.mkdirSync(outDir, { recursive: true });

const scenes = [
    { name: 'scene-1-dashboard', t: 1.7 },
    { name: 'scene-2-sidebar-privacy', t: 5.2 },
    { name: 'scene-3-accounts-grid', t: 8.7 },
    { name: 'scene-4-pockets-yield', t: 12.2 },
    { name: 'scene-5-salary-streams', t: 15.7 },
    { name: 'scene-6-statutory-deductions', t: 19.2 },
    { name: 'scene-7-loans-cashback', t: 22.7 },
    { name: 'scene-8-subscriptions', t: 26.2 },
    { name: 'scene-9-ledger-transfer', t: 29.7 },
    { name: 'scene-10-advisor-outro', t: 33.2 }
];

const videoPath = path.resolve('apps/avp/out/finance-tracker-tiktok-avp.mp4');

for (const s of scenes) {
    const outFile = path.join(outDir, `${s.name}.png`);
    execSync(`ffmpeg -y -ss ${s.t} -i "${videoPath}" -vframes 1 "${outFile}" -loglevel error`);
    console.log(`Extracted ${s.name}.png at ${s.t}s`);
}
