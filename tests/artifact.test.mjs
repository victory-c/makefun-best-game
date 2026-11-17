import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, lstatSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { buildDossier } from '../vendor/makefun-game.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
function manifest(directory, prefix = '') {
  return readdirSync(join(directory, prefix)).sort().flatMap((name) => {
    const path = join(prefix, name), info = lstatSync(join(directory, path));
    assert.ok(!info.isSymbolicLink(), `no symlink: ${path}`);
    return info.isDirectory() ? manifest(directory, path) : [{ path, bytes: info.size, sha256: createHash('sha256').update(readFileSync(join(directory, path))).digest('hex') }];
  });
}
function jpegDimensions(data) {
  assert.equal(data.readUInt16BE(0), 0xffd8);
  let cursor = 2;
  while (cursor < data.length) {
    assert.equal(data[cursor++], 0xff);
    while (data[cursor] === 0xff) cursor++;
    const marker = data[cursor++];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = data.readUInt16BE(cursor);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) return [data.readUInt16BE(cursor + 5), data.readUInt16BE(cursor + 3)];
    cursor += length;
  }
  throw new Error('no JPEG dimensions');
}

test('main.ts runs twice to byte-identical outputs, within the real game caps', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'wick-artifact-'));
  try {
    const outputs = ['first', 'second'].map((name) => join(scratch, name));
    for (const output of outputs) {
      const run = spawnSync(process.execPath, [join(root, 'main.ts')], { cwd: root, env: { ...process.env, MAKEFUN_OUTPUT_DIR: output }, encoding: 'utf8', timeout: 15000 });
      assert.equal(run.status, 0, run.stderr);
    }
    const a = manifest(outputs[0]), b = manifest(outputs[1]);
    assert.deepEqual(a, b);
    assert.ok(a.length < 1000);
    assert.ok(a.reduce((n, f) => n + f.bytes, 0) < 64 * 1024 * 1024);
    const dossier = readFileSync(join(outputs[0], 'dossier.json'));
    assert.ok(dossier.length <= 1.5 * 1024 * 1024);
    assert.ok(dossier.equals(Buffer.from(buildDossier(outputs[0], { text_max_bytes: 163840 }))));
    const game = a.filter((f) => f.path.startsWith('game/'));
    assert.ok(game.length <= 993);
    assert.ok(game.reduce((n, f) => n + f.bytes, 0) <= 48 * 1024 * 1024);
    for (const f of game) assert.ok(Buffer.byteLength(f.path) <= 1000);
    console.log('ARTIFACT', JSON.stringify({ files: a.length, gameBytes: game.reduce((n, f) => n + f.bytes, 0), dossierBytes: dossier.length, dossierSha256: createHash('sha256').update(dossier).digest('hex') }));
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});

test('four screenshots are real whole JPEG files inside the competition image limits', () => {
  const shots = readdirSync(join(root, 'screenshots')).filter((name) => !name.startsWith('.')).sort();
  assert.equal(shots.length, 4);
  for (const name of shots) {
    assert.match(name, /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/);
    const data = readFileSync(join(root, 'screenshots', name));
    assert.ok(data.length <= 262144);
    const [w, h] = jpegDimensions(data);
    assert.ok(Math.max(w, h) <= 1280 && Math.min(w, h) >= 480);
    assert.equal(data.readUInt16BE(data.length - 2), 0xffd9);
    console.log('SCREENSHOT', name, w, h, data.length);
  }
});
