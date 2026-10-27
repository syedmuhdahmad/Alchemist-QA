import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = fileURLToPath(new URL('../skills/routing/scripts/route-hint.mjs', import.meta.url));
const HOOKS_JSON = fileURLToPath(new URL('../hooks/hooks.json', import.meta.url));

function project({ profile = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'route-hint-'));
  if (profile) {
    mkdirSync(join(root, 'qa'));
    writeFileSync(join(root, 'qa/profile.yaml'), 'stack:\n  platforms: [web]\n');
  }
  return root;
}

const hook = (input) => spawnSync('node', [HOOK], { encoding: 'utf8', input: typeof input === 'string' ? input : JSON.stringify(input) });

test('in a QA project, a matching prompt gets the route as added context', () => {
  const result = hook({ hook_event_name: 'UserPromptSubmit', prompt: 'write test cases for #12', cwd: project() });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(output.hookSpecificOutput.additionalContext, /design\.blackbox.*qa:test-analyst.*qa:test-design-blackbox/);
  assert.match(output.hookSpecificOutput.additionalContext, /#12/);
});

test('outside a QA project, or when nothing matches, the hook says nothing', () => {
  for (const input of [
    { prompt: 'write test cases for #12', cwd: project({ profile: false }) },
    { prompt: 'fix the typo in the README', cwd: project() },
  ]) {
    const result = hook(input);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
  }
});

test('input it cannot read never blocks the prompt', () => {
  for (const input of ['not json', '{}', JSON.stringify({ prompt: 42, cwd: project() })]) {
    const result = hook(input);
    assert.equal(result.status, 0, `${input}: ${result.stderr}`);
    assert.equal(result.stdout, '');
  }
});

test('the plugin registers the hook on UserPromptSubmit', () => {
  const hooks = JSON.parse(readFileSync(HOOKS_JSON, 'utf8')).hooks.UserPromptSubmit;
  assert.match(hooks[0].hooks[0].command, /\$\{CLAUDE_PLUGIN_ROOT\}\/skills\/routing\/scripts\/route-hint\.mjs/);
});
