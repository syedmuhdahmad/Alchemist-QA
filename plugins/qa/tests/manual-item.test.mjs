import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { validateFile } from '../../../tools/validate-testware/validate-testware.mjs';
import { fromRequest, fromRisk, nextRequestId } from '../skills/intake-manual/scripts/manual-item.mjs';

const SCRIPT = fileURLToPath(new URL('../skills/intake-manual/scripts/manual-item.mjs', import.meta.url));
const NOW = '2026-10-04T10:00:00Z';

const ROW_1 = '| R-product-1 | Editor HTML reaches `dangerouslySetInnerHTML` unsanitised: a "script" runs in readers\' browsers. | medium | high | high | Partitions over tags and URL schemes. |';
const ROW_2 = '| R-product-2 | A search term with `a \\| b` breaks the filter. | low | medium | low | Partitions. |';

const REGISTER = `# Risk register

## Product: first pass

Draft from \`/qa:onboard\`.

| Id | Risk | Likelihood | Impact | Level | Response |
| --- | --- | --- | --- | --- | --- |
${ROW_1}
${ROW_2}
`;

const REQUEST = [
  'Please check the newsletter sign-up before the launch.',
  '',
  '## Acceptance criteria',
  '',
  '- A new address gets a confirmation email.',
  '- [ ] An address is added only after it is confirmed.',
  '',
  '## Notes',
  '',
  '- Marketing wants it by Friday.',
].join('\n');

const frontmatter = (text) => parse(text.match(/^---\n([\s\S]*?)\n---/)[1]);
const body = (text) => text.replace(/^---\n[\s\S]*?\n---\n/, '');

/** A temp project with the given files, as { path: content }. */
function project(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'manual-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const run = (root, ...args) => spawnSync('node', [SCRIPT, '--root', root, ...args], { encoding: 'utf8' });

test('a risk row becomes REQ-1 with source manual, origin, type task, no criteria, and the row quoted', () => {
  const text = fromRisk(REGISTER, 'R-product-1', { id: 'REQ-1', now: NOW });
  const front = frontmatter(text);
  assert.equal(front.id, 'REQ-1');
  assert.equal(front.source, 'manual');
  assert.equal(front.type, 'task');
  assert.equal(front.origin, 'qa/risk-register.md R-product-1');
  assert.deepEqual(front.acceptance_criteria, []);
  assert.equal(front.created_at, NOW);
  assert.match(front.title, /^Risk R-product-1: Editor HTML reaches `dangerouslySetInnerHTML` unsanitised/);
  assert.match(body(text), /There is no tracker item/);
  assert.ok(body(text).includes(ROW_1), 'the row is quoted word for word');
});

test('a risk that is missing, or listed twice, is refused', () => {
  assert.throws(() => fromRisk(REGISTER, 'R-product-9', { id: 'REQ-1', now: NOW }), /R-product-9 is not in the risk register/);
  const twice = `${REGISTER}\n## REQ-3: Something\n\n| Id | Risk | Likelihood | Impact | Level | Response |\n| --- | --- | --- | --- | --- | --- |\n${ROW_1}\n`;
  assert.throws(() => fromRisk(twice, 'R-product-1', { id: 'REQ-1', now: NOW }), /R-product-1 appears 2 times/);
});

test('the number follows the highest REQ id used anywhere in qa/, never reusing one', () => {
  const root = project({
    'qa/basis/REQ-1.md': 'x',
    'qa/basis/REQ-2.review.md': 'x',
    'qa/cases/REQ-10.md': 'x',
    'qa/state/REQ-4.md': 'x',
    'qa/charters/REQ-9-1.md': 'x',
    'qa/basis/REQUEST-notes.md': 'x',
    'qa/risk-register.md': `${REGISTER}\n## REQ-12: An item whose basis file was deleted\n`,
  });
  assert.equal(nextRequestId(root), 'REQ-13');
});

test('a project with no qa folder gets REQ-1, and the folders are created', () => {
  const root = project();
  assert.equal(nextRequestId(root), 'REQ-1');
  const result = spawnSync('node', [SCRIPT, '--root', root, '--title', 'Check the sign-up', '--request-file', '-'], {
    encoding: 'utf8',
    input: REQUEST,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(existsSync(join(root, 'qa/basis/REQ-1.md')));
});

test('an empty request, a row with no risk text, or an empty origin is refused', () => {
  const root = project();
  const empty = spawnSync('node', [SCRIPT, '--root', root, '--title', 'x', '--request-file', '-'], { encoding: 'utf8', input: '  \n' });
  assert.equal(empty.status, 2);
  assert.match(empty.stderr, /request is empty/);
  assert.equal(existsSync(join(root, 'qa/basis')), false);
  assert.throws(() => fromRisk('| Id | Risk |\n| --- | --- |\n| R-x-1 |\n', 'R-x-1', { id: 'REQ-1', now: NOW }), /R-x-1 has no risk text/);
  const origin = spawnSync('node', [SCRIPT, '--root', root, '--title', 'x', '--request-file', '-', '--origin', ''], { encoding: 'utf8', input: 'Check it.' });
  assert.equal(origin.status, 2);
});

test('the CLI brings in a risk and prints the path it wrote', () => {
  const root = project({ 'qa/risk-register.md': REGISTER, 'qa/basis/REQ-1.md': 'x' });
  const result = run(root, '--from-risk', 'R-product-2');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), join(root, 'qa/basis/REQ-2.md'));
  assert.equal(frontmatter(readFileSync(join(root, 'qa/basis/REQ-2.md'), 'utf8')).origin, 'qa/risk-register.md R-product-2');
});

test('an unknown risk id exits 2 and writes nothing', () => {
  const root = project({ 'qa/risk-register.md': REGISTER });
  const result = run(root, '--from-risk', 'R-product-9');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /R-product-9 is not in the risk register/);
  assert.equal(existsSync(join(root, 'qa/basis')), false);
});

test('a request with no register, a missing title, or both modes at once is a usage error', () => {
  const root = project();
  assert.equal(run(root, '--from-risk', 'R-product-1').status, 2);
  assert.equal(run(root, '--request-file', '-').status, 2);
  assert.equal(run(root, '--from-risk', 'R-product-1', '--title', 'x', '--request-file', '-').status, 2);
  assert.equal(run(root).status, 2);
  assert.equal(run(root, '--title', '--request-file', '-').status, 2);
});

test('a request keeps its text, and only its Acceptance criteria list becomes criteria', () => {
  const text = fromRequest(REQUEST, { id: 'REQ-1', title: 'Check the newsletter sign-up', now: NOW });
  const front = frontmatter(text);
  assert.equal(front.origin, 'request in chat');
  assert.equal(front.type, 'task');
  assert.deepEqual(front.acceptance_criteria, [
    'A new address gets a confirmation email.',
    'An address is added only after it is confirmed.',
  ]);
  assert.ok(body(text).includes(REQUEST), 'the request is kept word for word');
});

test('quotes, colons, backticks, an escaped pipe, and a --- line survive', () => {
  const title = 'Check "promo" codes: `SAVE10` only';
  const request = 'First line.\n---\nA line after a rule, with `code` and "quotes": still the body.';
  const text = fromRequest(request, { id: 'REQ-2', title, now: NOW });
  assert.equal(frontmatter(text).title, title);
  assert.ok(body(text).includes(request));
  const risk = fromRisk(REGISTER, 'R-product-2', { id: 'REQ-3', now: NOW });
  assert.match(frontmatter(risk).title, /`a \| b` breaks the filter/, 'the title unescapes the table pipe');
  assert.ok(body(risk).includes(ROW_2));
});

test('--origin and --type override the defaults', () => {
  const text = fromRequest(REQUEST, { id: 'REQ-1', title: 'Sign-up', origin: 'email from the owner', type: 'story', now: NOW });
  assert.equal(frontmatter(text).origin, 'email from the owner');
  assert.equal(frontmatter(text).type, 'story');
  const root = project();
  const result = spawnSync('node', [SCRIPT, '--root', root, '--title', 'Sign-up', '--request-file', '-', '--origin', 'email', '--type', 'bug'], {
    encoding: 'utf8',
    input: REQUEST,
  });
  assert.equal(result.status, 0, result.stderr);
  const written = frontmatter(readFileSync(join(root, 'qa/basis/REQ-1.md'), 'utf8'));
  assert.deepEqual([written.origin, written.type], ['email', 'bug']);
  assert.equal(run(root, '--title', 'x', '--request-file', '-', '--type', 'wish').status, 2);
});

test('the result validates against the basis schema', () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'manual-')), 'basis');
  mkdirSync(dir);
  writeFileSync(join(dir, 'REQ-1.md'), fromRisk(REGISTER, 'R-product-1', { id: 'REQ-1', now: NOW }));
  writeFileSync(join(dir, 'REQ-2.md'), fromRequest(REQUEST, { id: 'REQ-2', title: 'Sign-up', now: NOW }));
  assert.deepEqual(validateFile(join(dir, 'REQ-1.md')), []);
  assert.deepEqual(validateFile(join(dir, 'REQ-2.md')), []);
});

test('in a typed request, a plain "Acceptance criteria:" line starts the criteria too', () => {
  const typed = ['Check the sign-up.', '', 'Acceptance criteria:', '- A new address gets an email.', '- Only confirmed addresses are added.'].join('\n');
  assert.deepEqual(frontmatter(fromRequest(typed, { id: 'REQ-1', title: 'Sign-up', now: NOW })).acceptance_criteria, [
    'A new address gets an email.',
    'Only confirmed addresses are added.',
  ]);
  assert.ok(body(fromRequest(typed, { id: 'REQ-1', title: 'Sign-up', now: NOW })).includes('Acceptance criteria:\n- A new'));
});
