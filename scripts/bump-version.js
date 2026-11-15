const fs = require('fs');
const path = require('path');

const type = process.argv[2] || 'patch';

const appJsonPath = path.join(__dirname, '..', 'apps', 'mobile', 'app.json');
const mobilePkgPath = path.join(__dirname, '..', 'apps', 'mobile', 'package.json');

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const mobilePkg = JSON.parse(fs.readFileSync(mobilePkgPath, 'utf8'));

const currentVersion = appJson.expo.version || '1.0.0';
const parts = currentVersion.split('.').map(Number);

if (parts.length !== 3 || parts.some(isNaN)) {
    console.error(`Invalid version format: ${currentVersion}`);
    process.exit(1);
}

if (type === 'major') {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
} else if (type === 'minor') {
    parts[1] += 1;
    parts[2] = 0;
} else {
    // patch
    parts[2] += 1;
}

const newVersion = parts.join('.');

appJson.expo.version = newVersion;
mobilePkg.version = newVersion;

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
fs.writeFileSync(mobilePkgPath, JSON.stringify(mobilePkg, null, 2) + '\n');

console.log(`Version bumped from ${currentVersion} to ${newVersion} in app.json and mobile package.json`);
