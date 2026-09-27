const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');
const distDir = path.join(rootDir, 'dist');
const isWindows = process.platform === 'win32';
const gradlewCmd = isWindows ? 'gradlew.bat' : './gradlew';

const isDebug = process.argv.includes('--debug');
const task = isDebug ? 'assembleDebug' : 'assembleRelease';
const apkFlavor = isDebug ? 'debug' : 'release';

function parseVersion(vStr) {
  if (!vStr) return [1, 0, 0, 0];
  const match = vStr.match(/(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return [1, 0, 0, 0];
  return [
    parseInt(match[1], 10) || 0,
    parseInt(match[2], 10) || 0,
    parseInt(match[3], 10) || 0,
    parseInt(match[4] || '0', 10) || 0,
  ];
}

function compareVersions(a, b) {
  for (let i = 0; i < 4; i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

function getNextVersion(current) {
  let [major, minor, patch, build] = current;
  build += 1;
  if (build >= 10) {
    build = 0;
    patch += 1;
    if (patch >= 10) {
      patch = 0;
      minor += 1;
      if (minor >= 10) {
        minor = 0;
        major += 1;
      }
    }
  }
  return `${major}.${minor}.${patch}.${build}`;
}

// 1. Scan dist/ and package.json to find the highest existing version
let highestVersion = [1, 0, 0, 0];

if (fs.existsSync(distDir)) {
  const existingFiles = fs.readdirSync(distDir);
  for (const file of existingFiles) {
    const match = file.match(/^finance-tracker-v?(\d+\.\d+\.\d+(?:\.\d+)?)/i);
    if (match) {
      const v = parseVersion(match[1]);
      if (compareVersions(v, highestVersion) > 0) {
        highestVersion = v;
      }
    }
  }
}

const pkgPath = path.join(rootDir, 'package.json');
let pkgData = null;
try {
  pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkgData.version) {
    const v = parseVersion(pkgData.version);
    if (compareVersions(v, highestVersion) > 0) {
      highestVersion = v;
    }
  }
} catch {}

const currentVersionStr = highestVersion.join('.');
const nextVersionStr = getNextVersion(highestVersion);

console.log(`\n========================================`);
console.log(`📦 Finance Tracker Auto-Versioning`);
console.log(`   Current Version: v${currentVersionStr}`);
console.log(`   Next Version:    v${nextVersionStr}`);
console.log(`   Build Mode:      ${apkFlavor}`);
console.log(`   Timestamp:       ${new Date().toLocaleString()}`);
console.log(`========================================\n`);

// 2. Update package.json and app.json with new version and incremented versionCode
if (pkgData) {
  pkgData.version = nextVersionStr;
  fs.writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2) + '\n');
}

const appJsonPath = path.join(rootDir, 'app.json');
try {
  const appData = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  if (appData.expo) {
    appData.expo.version = nextVersionStr;
    if (appData.expo.android) {
      appData.expo.android.versionCode = (appData.expo.android.versionCode || 1) + 1;
    }
    fs.writeFileSync(appJsonPath, JSON.stringify(appData, null, 2) + '\n');
  }
} catch {}

// 3. Run Gradle Build
console.log(`🔨 Running Gradle (${task})...\n`);

const buildRes = spawnSync(gradlewCmd, [task], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: true,
});

if (buildRes.status !== 0) {
  console.error(`\n❌ Android build failed with exit code ${buildRes.status}`);
  process.exit(buildRes.status || 1);
}

// 4. Copy to dist with new versioned filename
const apkName = isDebug ? 'app-debug.apk' : 'app-release.apk';
const sourceApk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', apkFlavor, apkName);

if (fs.existsSync(sourceApk)) {
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const suffix = isDebug ? '-debug.apk' : '.apk';
  const targetApkName = `finance-tracker-v${nextVersionStr}${suffix}`;
  const targetApk = path.join(distDir, targetApkName);

  fs.copyFileSync(sourceApk, targetApk);

  const stats = fs.statSync(targetApk);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  const timestamp = new Date().toISOString();

  // Log to build-history.json with timestamp
  const historyPath = path.join(distDir, 'build-history.json');
  let history = [];
  try {
    if (fs.existsSync(historyPath)) {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
  } catch {}
  history.push({
    version: nextVersionStr,
    fileName: targetApkName,
    sizeMb: parseFloat(sizeMb),
    flavor: apkFlavor,
    timestamp,
  });
  try {
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2) + '\n');
  } catch {}

  console.log(`\n========================================`);
  console.log(`✅ Build Successful!`);
  console.log(`📱 Version:   v${nextVersionStr}`);
  console.log(`📦 New APK:   ${targetApk}`);
  console.log(`⚖️  Size:      ${sizeMb} MB`);
  console.log(`🕒 Timestamp: ${timestamp}`);
  console.log(`📁 All previous APKs in dist/ are preserved.`);
  console.log(`========================================\n`);
} else {
  console.warn(`\n⚠️ Build completed, but output APK was not found at: ${sourceApk}`);
}
