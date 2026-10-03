import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { grade, loadCase } from './eval-headless.mjs';

function folder(files) {
  const root = mkdtempSync(join(tmpdir(), 'eval-headless-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

test('a case is read from prompt.md, case.yaml, and its graders', () => {
  const dir = folder({
    'case.yaml': 'schema_version: "1.1"\nname: demo-case\nplugins: ["../other"]\ncontext:\n  scaffold_script: fixture.sh\n',
    'prompt.md': '---\nmax_turns: 5\nallowed_tools: [Read, Bash]\n---\n\nDo the thing.\n',
    'fixture.sh': 'true\n',
    'graders/report.md': '---\ntype: file_exists\npath: "qa/x.md"\n---\n',
    'graders/says.md': '---\ntype: llm\n---\n\nPASS if it says hello.\n',
  });
  const testCase = loadCase(dir);
  assert.equal(testCase.name, 'demo-case');
  assert.equal(testCase.prompt, 'Do the thing.');
  assert.deepEqual(testCase.allowedTools, ['Read', 'Bash']);
  assert.deepEqual(testCase.plugins, [join(dir, '..', 'other')]);
  assert.equal(testCase.fixture, join(dir, 'fixture.sh'));
  assert.deepEqual(testCase.graders.map((g) => [g.name, g.type]), [['report', 'file_exists'], ['says', 'llm']]);
  assert.equal(testCase.graders[1].criteria, 'PASS if it says hello.');
});

const run = (workspace, uses = [], lastMessage = '') => ({ workspace, uses, lastMessage, judge: async () => ({ passed: true, why: 'judged' }) });

test('file_exists passes when the file is there, and exists: false inverts it', async () => {
  const ws = folder({ 'qa/a.md': 'x' });
  assert.equal((await grade({ type: 'file_exists', path: 'qa/a.md' }, run(ws))).passed, true);
  assert.equal((await grade({ type: 'file_exists', path: 'qa/b.md', exists: false }, run(ws))).passed, true);
  assert.equal((await grade({ type: 'file_exists', path: 'qa/a.md', exists: false }, run(ws))).passed, false);
});

test('regex reads a file or the last message, with flags and not_contains', async () => {
  const ws = folder({ 'qa/a.md': 'line one\n| R-1 | high |\n' });
  const onFile = { type: 'regex', target: { source: 'file', path: 'qa/a.md' }, pattern: '^\\| R-1', flags: 'm' };
  assert.equal((await grade(onFile, run(ws))).passed, true);
  assert.equal((await grade({ ...onFile, match: 'not_contains' }, run(ws))).passed, false);
  assert.equal((await grade({ type: 'regex', pattern: 'hello' }, run(ws, [], 'hello there'))).passed, true);
});

test('regex on a missing file fails a contains check and passes a not_contains check', async () => {
  const ws = folder({});
  const grader = { type: 'regex', target: { source: 'file', path: 'qa/none.md' }, pattern: 'x' };
  assert.equal((await grade(grader, run(ws))).passed, false);
  assert.equal((await grade({ ...grader, match: 'not_contains' }, run(ws))).passed, true);
});

test('tool_used counts matching calls against min and max, where min defaults to 1', async () => {
  const uses = [
    { name: 'Bash', input: { command: 'node "/x/trace.mjs" update' } },
    { name: 'Bash', input: { command: 'ls' } },
  ];
  const ws = folder({});
  const grader = { type: 'tool_used', tool: 'Bash', input_match: 'trace\\.mjs' };
  assert.equal((await grade(grader, run(ws, uses))).passed, true);
  assert.equal((await grade({ ...grader, min: 0, max: 0 }, run(ws, uses))).passed, false);
  assert.equal((await grade({ ...grader, input_match: 'gh issue', min: 0, max: 0 }, run(ws, uses))).passed, true);
  assert.equal((await grade({ ...grader, input_match: 'gh issue', max: 0 }, run(ws, uses))).passed, false, 'min defaults to 1');
});

test('llm passes the criteria and the focused text to the judge', async () => {
  const ws = folder({ 'qa/r.md': 'the report' });
  let seen;
  const judge = async (criteria, text) => {
    seen = [criteria, text];
    return { passed: false, why: 'no' };
  };
  const result = await grade({ type: 'llm', criteria: 'PASS if good.', focus: { source: 'file', path: 'qa/r.md' } }, { workspace: ws, uses: [], lastMessage: 'reply', judge });
  assert.deepEqual(seen, ['PASS if good.', 'the report']);
  assert.equal(result.passed, false);
});
