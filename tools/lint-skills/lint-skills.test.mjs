import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { lintSkill } from './lint-skills.mjs';

const VALID = `---
name: sample
description: Use when a sample is needed. Not for anything else.
metadata:
  kind: method
  freedom: high
---

# Sample

## Procedure

1. Do the thing.
`;

/** Builds a skill folder named `sample` from a map of relative path -> content. */
function skill(files, { name = 'sample' } = {}) {
  const dir = join(mkdtempSync(join(tmpdir(), 'lint-skills-')), name);
  for (const [path, content] of Object.entries({ 'SKILL.md': VALID, ...files })) {
    if (content === null) continue;
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  mkdirSync(dir, { recursive: true });
  return dir;
}

const rules = (dir, level = 'error') =>
  lintSkill(dir).filter((f) => f.level === level).map((f) => f.rule);

const withFrontmatter = (replace) => VALID.replace(...replace);

test('a skill that follows the standard has no findings', () => {
  assert.deepEqual(lintSkill(skill({})), []);
});

test('a folder without SKILL.md is reported', () => {
  assert.deepEqual(rules(skill({ 'SKILL.md': null })), ['skill-file']);
});

test('SKILL.md without frontmatter is reported', () => {
  assert.deepEqual(rules(skill({ 'SKILL.md': '# Sample\n\n## Procedure\n' })), ['frontmatter']);
});

test('the name must match the folder name', () => {
  const dir = skill({ 'SKILL.md': withFrontmatter(['name: sample', 'name: other']) });
  assert.deepEqual(rules(dir), ['name']);
});

test('the name must be kebab-case', () => {
  const dir = skill(
    { 'SKILL.md': withFrontmatter(['name: sample', 'name: Sample_Skill']) },
    { name: 'Sample_Skill' },
  );
  assert.deepEqual(rules(dir), ['name']);
});

test('the description must say when to use the skill and what it is not for', () => {
  const dir = skill({
    'SKILL.md': withFrontmatter([
      'Use when a sample is needed. Not for anything else.',
      'Helps with samples.',
    ]),
  });
  assert.deepEqual(rules(dir), ['description']);
});

test('a description over 500 characters is reported', () => {
  const long = `Use when ${'x'.repeat(500)}. Not for anything else.`;
  const dir = skill({
    'SKILL.md': withFrontmatter(['Use when a sample is needed. Not for anything else.', long]),
  });
  assert.deepEqual(rules(dir), ['description']);
});

test('metadata.kind must be one of the known kinds', () => {
  const dir = skill({ 'SKILL.md': withFrontmatter(['kind: method', 'kind: misc']) });
  assert.deepEqual(rules(dir), ['kind']);
});

test('metadata.freedom must be high, medium, or low', () => {
  const dir = skill({ 'SKILL.md': withFrontmatter(['freedom: high', 'freedom: total']) });
  assert.deepEqual(rules(dir), ['freedom']);
});

test('a skill without a Procedure section is reported', () => {
  const dir = skill({ 'SKILL.md': VALID.replace('## Procedure', '## Steps') });
  assert.deepEqual(rules(dir), ['section-procedure']);
});

test('a tool skill needs a Gotchas section', () => {
  const dir = skill({ 'SKILL.md': withFrontmatter(['kind: method', 'kind: tool']) });
  assert.deepEqual(rules(dir), ['section-gotchas']);
});

test('a stage skill needs a Checklist section', () => {
  const dir = skill({ 'SKILL.md': withFrontmatter(['kind: method', 'kind: method\n  stage: design']) });
  assert.deepEqual(rules(dir), ['section-checklist']);
});

test('a method skill may not name a tool', () => {
  const dir = skill({ 'SKILL.md': `${VALID}2. Run it with Playwright.\n` });
  assert.deepEqual(rules(dir), ['method-names-tool']);
});

test('a tool skill may name a tool', () => {
  const body = withFrontmatter(['kind: method', 'kind: tool']);
  const dir = skill({ 'SKILL.md': `${body}2. Run it with Playwright.\n\n## Gotchas\n\n- None yet.\n` });
  assert.deepEqual(rules(dir), []);
});

test('SKILL.md over 500 lines is an error', () => {
  const dir = skill({ 'SKILL.md': VALID + 'line\n'.repeat(500) });
  assert.deepEqual(rules(dir), ['length']);
});

test('SKILL.md over 200 lines is a warning, not an error', () => {
  const dir = skill({ 'SKILL.md': VALID + 'line\n'.repeat(200) });
  assert.deepEqual(rules(dir), []);
  assert.deepEqual(rules(dir, 'warning'), ['length']);
});

test('a low-freedom skill must ship a script', () => {
  const dir = skill({ 'SKILL.md': withFrontmatter(['freedom: high', 'freedom: low']) });
  assert.deepEqual(rules(dir), ['scripts']);
});

test('a script that is not executable is reported', () => {
  const dir = skill({
    'SKILL.md': withFrontmatter(['freedom: high', 'freedom: low']),
    'scripts/run.sh': '#!/bin/sh\n',
  });
  assert.deepEqual(rules(dir), ['scripts']);
});

test('a low-freedom skill with an executable script passes', () => {
  const dir = skill({
    'SKILL.md': withFrontmatter(['freedom: high', 'freedom: low']),
    'scripts/run.sh': '#!/bin/sh\n',
  });
  chmodSync(join(dir, 'scripts/run.sh'), 0o755);
  assert.deepEqual(rules(dir), []);
});

test('a medium-freedom skill must ship a template', () => {
  const dir = skill({ 'SKILL.md': withFrontmatter(['freedom: high', 'freedom: medium']) });
  assert.deepEqual(rules(dir), ['templates']);
});

test('a reference that SKILL.md does not link is reported', () => {
  const dir = skill({ 'references/extra.md': '# Extra\n' });
  assert.deepEqual(rules(dir), ['reference-unlinked']);
});

test('a linked reference passes', () => {
  const dir = skill({
    'SKILL.md': `${VALID}2. See [extra](references/extra.md).\n`,
    'references/extra.md': '# Extra\n',
  });
  assert.deepEqual(rules(dir), []);
});

test('references may not be nested in subfolders', () => {
  const dir = skill({
    'SKILL.md': `${VALID}2. See [deep](references/more/deep.md).\n`,
    'references/more/deep.md': '# Deep\n',
  });
  assert.deepEqual(rules(dir), ['reference-nested']);
});

test('a reference may not link to another reference', () => {
  const dir = skill({
    'SKILL.md': `${VALID}2. See [a](references/a.md) and [b](references/b.md).\n`,
    'references/a.md': '# A\n\nSee [b](b.md).\n',
    'references/b.md': '# B\n',
  });
  assert.deepEqual(rules(dir), ['reference-chain']);
});

test('a reference over 100 lines needs a contents list near the top', () => {
  const dir = skill({
    'SKILL.md': `${VALID}2. See [long](references/long.md).\n`,
    'references/long.md': `# Long\n\n${'text\n'.repeat(101)}`,
  });
  assert.deepEqual(rules(dir), ['reference-contents']);
});

test('a long reference with a contents list passes', () => {
  const dir = skill({
    'SKILL.md': `${VALID}2. See [long](references/long.md).\n`,
    'references/long.md': `# Long\n\n## Contents\n\n- Part one\n\n${'text\n'.repeat(101)}`,
  });
  assert.deepEqual(rules(dir), []);
});

test('a link to a file that does not exist is reported', () => {
  const dir = skill({ 'SKILL.md': `${VALID}2. See [gone](references/gone.md).\n` });
  assert.deepEqual(rules(dir), ['broken-link']);
});

/** A plugin tree: plugin/skills/sample with VALID, plus `cases` eval case folders for it. */
function pluginWithEvals(cases, { skillText = VALID } = {}) {
  const plugin = mkdtempSync(join(tmpdir(), 'lint-evals-'));
  const dir = join(plugin, 'skills', 'sample');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), skillText);
  for (const name of cases) {
    mkdirSync(join(plugin, 'evals', 'sample', name), { recursive: true });
    writeFileSync(join(plugin, 'evals', 'sample', name, 'prompt.md'), 'Do it.\n');
  }
  return dir;
}

test('a method skill inside a plugin needs at least three eval cases', () => {
  assert.deepEqual(rules(pluginWithEvals(['a', 'b'])), ['evals']);
});

test('a method skill with three eval cases passes', () => {
  assert.deepEqual(rules(pluginWithEvals(['a', 'b', 'c'])), []);
});

test('a folder without prompt.md or case.yaml does not count as an eval case', () => {
  const dir = pluginWithEvals(['a', 'b']);
  mkdirSync(join(dir, '..', '..', 'evals', 'sample', 'notes'), { recursive: true });
  assert.deepEqual(rules(dir), ['evals']);
});

test('a command skill does not need eval cases', () => {
  const dir = pluginWithEvals([], { skillText: withFrontmatter(['kind: method', 'kind: command']) });
  assert.deepEqual(rules(dir), []);
});
