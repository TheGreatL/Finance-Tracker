import { test } from 'node:test';
import assert from 'node:assert';

function parseVersion(vStr: string): [number, number, number, number] {
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

function compareVersions(a: [number, number, number, number], b: [number, number, number, number]): number {
  for (let i = 0; i < 4; i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

function getNextVersion(current: [number, number, number, number]): string {
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

test('Auto-Versioning: Increments 4th digit from v1.0.0.0 to v1.0.0.1 and up to 9', () => {
  const v0 = parseVersion('v1.0.0.0');
  assert.deepStrictEqual(v0, [1, 0, 0, 0]);

  const v1 = getNextVersion(v0);
  assert.strictEqual(v1, '1.0.0.1');

  const v2 = getNextVersion(parseVersion(v1));
  assert.strictEqual(v2, '1.0.0.2');

  const v9 = getNextVersion(parseVersion('1.0.0.8'));
  assert.strictEqual(v9, '1.0.0.9');
});

test('Auto-Versioning: Rolls over to v1.0.1.0 when build reaches 10', () => {
  const v10 = getNextVersion(parseVersion('1.0.0.9'));
  assert.strictEqual(v10, '1.0.1.0');

  const v11 = getNextVersion(parseVersion(v10));
  assert.strictEqual(v11, '1.0.1.1');
});

test('Auto-Versioning: Rolls over minor and major versions properly', () => {
  const nextPatch = getNextVersion(parseVersion('1.0.1.9'));
  assert.strictEqual(nextPatch, '1.0.2.0');

  const nextMinor = getNextVersion(parseVersion('1.0.9.9'));
  assert.strictEqual(nextMinor, '1.1.0.0');
});

test('Auto-Versioning: Correctly parses legacy 3-part version v1.0.0 as 1.0.0.0', () => {
  const legacy = parseVersion('finance-tracker-v1.0.0.apk');
  assert.deepStrictEqual(legacy, [1, 0, 0, 0]);
  assert.strictEqual(getNextVersion(legacy), '1.0.0.1');
});
