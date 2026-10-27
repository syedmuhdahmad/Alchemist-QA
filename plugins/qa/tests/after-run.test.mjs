import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = fileURLToPath(new URL('../skills/traceability/scripts/after-run.mjs', import.meta.url));
const HOOKS_JSON = fileURLToPath(new URL('../hooks/hooks.json', import.meta.url));

const report = (tests) => ({
  testResults: [{ assertionResults: tests.map(([fullName, status]) => ({ fullName, status, failureMessages: status === 'failed' ? ['expected 10, got 11'] : [] })) }],
});

function project(files, { profile = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'after-run-'));
  const all = { ...(profile && { 'qa/profile.yaml': 'stack:\n  platforms: [web]\n' }), ...files };
  for (const [path, content] of Object.entries(all)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), typeof content === 'string' ? content : JSON.stringify(content));
  }
  return root;
}

const RUN = 'qa/runs/2026-10-27T10-00-00-unit-web.json';
const hook = (cwd) =>
  spawnSync('node', [HOOK], { encoding: 'utf8', input: JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'run.sh' }, cwd }) });

test('a new run is slimmed, the trace is updated, and its failures are queued for triage', () => {
  const root = project({ [RUN]: report([['TC-12-01 caps a line at 10', 'failed'], ['TC-12-02 b', 'passed']]) });
  const result = hook(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(readFileSync(join(root, RUN), 'utf8')).format, 'alchemist-run/1');
  assert.ok(existsSync(join(root, 'qa/trace.json')));
  const context = JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
  assert.match(context, /1 failed test/);
  assert.match(context, /TC-12-01 caps a line at 10/);
  assert.match(context, /qa:failure-triager/);
});

test('a run with no failures, or one already triaged, adds no context', () => {
  const passed = project({ [RUN]: report([['TC-12-02 b', 'passed']]) });
  assert.equal(hook(passed).stdout, '');
  assert.equal(JSON.parse(readFileSync(join(passed, RUN), 'utf8')).format, 'alchemist-run/1');
  const triaged = project({ [RUN]: report([['TC-12-01 a', 'failed']]), 'qa/runs/2026-10-27T10-00-00-unit-web.triage.md': '| x |' });
  assert.equal(hook(triaged).stdout, '');
});

test('with no new run, or outside a QA project, the hook does nothing', () => {
  const quiet = project({});
  assert.equal(hook(quiet).stdout, '');
  assert.equal(existsSync(join(quiet, 'qa/trace.json')), false);
  const other = project({ [RUN]: report([['TC-12-01 a', 'failed']]) }, { profile: false });
  assert.equal(hook(other).stdout, '');
  assert.match(readFileSync(join(other, RUN), 'utf8'), /testResults/);
  assert.equal(spawnSync('node', [HOOK], { encoding: 'utf8', input: 'not json' }).status, 0);
});

test('the plugin registers the hook on PostToolUse for Bash', () => {
  const entries = JSON.parse(readFileSync(HOOKS_JSON, 'utf8')).hooks.PostToolUse;
  const bash = entries.find((entry) => entry.matcher === 'Bash');
  assert.match(bash.hooks[0].command, /\$\{CLAUDE_PLUGIN_ROOT\}\/skills\/traceability\/scripts\/after-run\.mjs/);
});
