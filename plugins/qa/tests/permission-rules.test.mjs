import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../skills/onboard/scripts/permission-rules.mjs', import.meta.url));
const QA = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PLUGINS = resolve(QA, '..');
const VITEST = join(PLUGINS, 'qa-web/skills/vitest');
const JEST = join(PLUGINS, 'qa-mobile/skills/jest-native');

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Claude Code matches a Bash rule against the command exactly as typed: `*` stands for any text, quotes included.
const allows = (rules, command) =>
  rules.some((rule) => new RegExp(`^${rule.slice('Bash('.length, -1).split('*').map(escapeRegExp).join('.*')}$`).test(command));

function rules(...skillDirs) {
  const result = spawnSync('node', [SCRIPT, ...skillDirs.flatMap((dir) => ['--skill-dir', dir])], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout).permissions.allow;
}

/** The script commands in a SKILL.md, with ${CLAUDE_SKILL_DIR} and ${CLAUDE_PLUGIN_ROOT} filled in as Claude Code does. */
const skillCommands = (skillDir, pluginRoot) =>
  readFileSync(join(skillDir, 'SKILL.md'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^(node|bash) "\$\{CLAUDE_(SKILL_DIR|PLUGIN_ROOT)\}/.test(line))
    .map((line) => line.replaceAll('${CLAUDE_SKILL_DIR}', skillDir).replaceAll('${CLAUDE_PLUGIN_ROOT}', pluginRoot));

test('each script the department runs is allowed exactly as its skill runs it', () => {
  const allow = rules(VITEST, JEST);
  const commands = [
    ...skillCommands(join(QA, 'skills/pipeline'), QA),
    ...skillCommands(join(QA, 'skills/traceability'), QA),
    ...skillCommands(join(QA, 'skills/test-reporting'), QA),
    ...skillCommands(VITEST, join(PLUGINS, 'qa-web')),
    ...skillCommands(JEST, join(PLUGINS, 'qa-mobile')),
  ];
  assert.ok(commands.length >= 10, `found ${commands.length} commands`);
  for (const command of commands) assert.ok(allows(allow, command), command);
});

test('no rule lets other code run beside a department script', () => {
  const allow = rules(VITEST);
  const pipeline = join(QA, 'skills/pipeline/scripts/pipeline.mjs');
  const run = join(VITEST, 'scripts/run.sh');
  for (const command of [
    `node -e "console.log(1)" "${pipeline}" next`,
    `node /tmp/other.mjs "${pipeline}" next`,
    `node --require /tmp/other.js "${pipeline}" next`,
    `node "/tmp${pipeline}" next`,
    `bash -c "id" "${run}" --app web`,
  ]) {
    assert.equal(allows(allow, command), false, command);
  }
  for (const rule of allow) assert.match(rule, /^Bash\((node|bash) "\/[^*"]+" \*\)$/, 'the only wildcard comes after the script path');
});

test('a tool skill directory that is relative or has no tool scripts is refused', () => {
  for (const dir of [join(QA, 'skills/pipeline'), 'plugins/qa-web/skills/vitest']) {
    const result = spawnSync('node', [SCRIPT, '--skill-dir', dir], { encoding: 'utf8' });
    assert.equal(result.status, 2, dir);
    assert.match(result.stderr, /--skill-dir/);
  }
});

test('onboarding offers the rules this script prints, never a hand-written pattern', () => {
  const skill = readFileSync(join(QA, 'skills/onboard/SKILL.md'), 'utf8');
  assert.match(skill, /scripts\/permission-rules\.mjs/);
  assert.doesNotMatch(skill, /Bash\([^)]*\*[^)]*\.(mjs|sh)/, 'no rule with a wildcard before a script name');
});
