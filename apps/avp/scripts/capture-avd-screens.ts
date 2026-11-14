import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { SCREEN_FILES, verifyPngBuffer } from '../src/screens/screenRegistry';

const outDir = path.resolve(__dirname, '../public/screens');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

function getAdbPath(): string {
    const localAppData = process.env.LOCALAPPDATA || '';
    const sdkAdb = path.join(localAppData, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
    if (fs.existsSync(sdkAdb)) {
        return sdkAdb;
    }
    return 'adb';
}

const ADB = getAdbPath();
const DEVICE = 'emulator-5554';

function adbCommand(args: string[]): Buffer {
    const res = spawnSync(ADB, ['-s', DEVICE, ...args], {
        windowsHide: true,
        maxBuffer: 25 * 1024 * 1024
    });
    return res.stdout || Buffer.alloc(0);
}

function captureScreen(filename: string): boolean {
    const buf = adbCommand(['exec-out', 'screencap', '-p']);
    const info = verifyPngBuffer(buf);
    if (info.valid) {
        fs.writeFileSync(path.join(outDir, filename), buf);
        const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);
        console.log(`[AVP Screens] Saved ${filename.padEnd(35)} (${info.width}x${info.height}, ${buf.length} bytes, sha256:${hash})`);
        return true;
    }
    console.warn(`[AVP Screens] Warning: Invalid capture for ${filename}`);
    return false;
}

function sleep(ms: number) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

async function main() {
    console.log(`[AVP Screens] Bringing Finance Tracker to foreground on Pixel_7a (${DEVICE})...`);
    adbCommand(['shell', 'am', 'start', '-n', 'com.kenth3great.financetrackermonorepo/.MainActivity']);
    sleep(2000);
    // Dismiss any modal
    adbCommand(['shell', 'input', 'keyevent', '4']);
    sleep(800);

    // 01-dashboard.png
    console.log('[AVP Screens] Capturing 01-dashboard.png...');
    adbCommand(['shell', 'input', 'tap', '108', '2273']); // Dashboard tab
    sleep(1200);
    captureScreen('01-dashboard.png');

    // 02-sidebar.png
    console.log('[AVP Screens] Capturing 02-sidebar.png...');
    adbCommand(['shell', 'input', 'tap', '106', '216']); // Hamburger menu on dashboard
    sleep(1500);
    captureScreen('02-sidebar.png');
    // Close sidebar
    adbCommand(['shell', 'input', 'keyevent', '4']);
    sleep(1000);

    // 03-accounts.png
    console.log('[AVP Screens] Capturing 03-accounts.png...');
    adbCommand(['shell', 'input', 'tap', '324', '2273']); // Accounts tab
    sleep(1500);
    captureScreen('03-accounts.png');

    // 04-institution-detail.png (Scrolled down to pockets view)
    console.log('[AVP Screens] Capturing 04-institution-detail.png...');
    adbCommand(['shell', 'input', 'swipe', '540', '1800', '540', '900', '350']);
    sleep(1200);
    captureScreen('04-institution-detail.png');
    adbCommand(['shell', 'input', 'swipe', '540', '900', '540', '1800', '350']);
    sleep(800);

    // 05-obligations-salary.png
    console.log('[AVP Screens] Capturing 05-obligations-salary.png...');
    adbCommand(['shell', 'input', 'tap', '972', '2273']); // Obligations tab
    sleep(1200);
    adbCommand(['shell', 'input', 'tap', '859', '360']); // Income / salary segment
    sleep(1200);
    captureScreen('05-obligations-salary.png');

    // 06-obligations-loans.png
    console.log('[AVP Screens] Capturing 06-obligations-loans.png...');
    adbCommand(['shell', 'input', 'tap', '223', '360']); // Loans segment
    sleep(1200);
    captureScreen('06-obligations-loans.png');

    // 07-obligations-subscriptions.png
    console.log('[AVP Screens] Capturing 07-obligations-subscriptions.png...');
    adbCommand(['shell', 'input', 'tap', '541', '360']); // Subscriptions segment
    sleep(1200);
    captureScreen('07-obligations-subscriptions.png');

    // 08-ledger.png
    console.log('[AVP Screens] Capturing 08-ledger.png...');
    adbCommand(['shell', 'input', 'tap', '756', '2273']); // Ledger tab
    sleep(1200);
    adbCommand(['shell', 'input', 'tap', '200', '533']); // All Movements filter
    sleep(1000);
    captureScreen('08-ledger.png');

    // 09-analytics.png (Transfer detail sheet)
    console.log('[AVP Screens] Capturing 09-analytics.png...');
    adbCommand(['shell', 'input', 'tap', '890', '533']); // Transfer filter
    sleep(1000);
    adbCommand(['shell', 'input', 'tap', '541', '725']); // Tap transfer transaction
    sleep(1200);
    captureScreen('09-analytics.png');
    adbCommand(['shell', 'input', 'keyevent', '4']); // Close detail sheet
    sleep(800);

    // 10-advisor.png
    console.log('[AVP Screens] Capturing 10-advisor.png...');
    adbCommand(['shell', 'input', 'tap', '540', '2273']); // Advisor tab
    sleep(1500);
    captureScreen('10-advisor.png');

    // Verification of unique hashes
    console.log('\n[AVP Screens] Verifying all captures...');
    const hashes = new Map<string, string>();
    let duplicates = 0;
    for (const file of SCREEN_FILES) {
        const fullPath = path.join(outDir, file);
        if (!fs.existsSync(fullPath)) {
            console.error(`[AVP Screens] Missing file: ${file}`);
            duplicates++;
            continue;
        }
        const buf = fs.readFileSync(fullPath);
        const hash = crypto.createHash('sha256').update(buf).digest('hex');
        if (hashes.has(hash)) {
            console.error(`[AVP Screens] Duplicate found: ${file} matches ${hashes.get(hash)}!`);
            duplicates++;
        } else {
            hashes.set(hash, file);
        }
    }

    console.log(`[AVP Screens] Complete: ${hashes.size} unique screens out of ${SCREEN_FILES.length}. Duplicates: ${duplicates}`);
    if (duplicates > 0) {
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
