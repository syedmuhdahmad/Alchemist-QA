import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findSkills } from './lint-skills.mjs';

const CLI = fileURLToPath(new URL('./cli.mjs', import.meta.url));

const skillText = (description) => `---
name: demo
description: ${description}
metadata:
  kind: method
  freedom: high
---

## Procedure

1. Do it.
`;

/** A plugin tree with one skill at plugins/p/skills/demo. */
function tree(description) {
  const root = mkdtempSync(join(tmpdir(), 'lint-cli-'));
  const dir = join(root, 'plugins/p/skills/demo');
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(root, 'plugins/p/node_modules/x/skills/ignored'), { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), skillText(description));
  return root;
}

test('findSkills returns each child of a skills folder and skips node_modules', () => {
  const root = tree('Use when needed. Not for anything else.');
  assert.deepEqual(findSkills(root), [join(root, 'plugins/p/skills/demo')]);
});

test('the CLI exits 0 and reports the count when every skill is clean', () => {
  const run = spawnSync('node', [CLI, tree('Use when needed. Not for anything else.')], { encoding: 'utf8' });
  assert.equal(run.status, 0);
  assert.match(run.stdout, /1 skill checked, 0 errors, 0 warnings/);
});

test('the CLI exits 1 and names the file and rule when a skill has an error', () => {
  const run = spawnSync('node', [CLI, tree('Helps with things.')], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stdout, /plugins\/p\/skills\/demo\/SKILL\.md.*\[description\]/);
  assert.match(run.stdout, /1 skill checked, 1 error, 0 warnings/);
});

test('the CLI exits 1 when no skills are found, so a wrong path cannot pass', () => {
  const run = spawnSync('node', [CLI, mkdtempSync(join(tmpdir(), 'lint-empty-'))], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stdout, /no skills found/);
});
