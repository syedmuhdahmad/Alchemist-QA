import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('./cli.mjs', import.meta.url));
const run = (dir) => spawnSync('node', [CLI, dir], { encoding: 'utf8' });

function dirWith(name, content) {
  const dir = mkdtempSync(join(tmpdir(), 'testware-cli-'));
  writeFileSync(join(dir, name), content);
  return dir;
}

test('the CLI exits 0 when every testware file in the folder is valid', () => {
  const result = run(dirWith('trace.json', '{"items": []}'));
  assert.equal(result.status, 0);
  assert.match(result.stdout, /1 file checked, 0 errors/);
});

test('the CLI exits 1 and names the file when one is invalid', () => {
  const result = run(dirWith('trace.json', '{}'));
  assert.equal(result.status, 1);
  assert.match(result.stdout, /trace\.json: .*items/);
});

test('the CLI skips files that are not testware instead of failing on them', () => {
  const dir = dirWith('trace.json', '{"items": []}');
  writeFileSync(join(dir, 'README.md'), '# notes\n');
  assert.equal(run(dir).status, 0);
});

test('the CLI exits 1 when it finds no testware, so a wrong path cannot pass', () => {
  const result = run(dirWith('README.md', '# notes\n'));
  assert.equal(result.status, 1);
  assert.match(result.stdout, /no testware found/);
});
