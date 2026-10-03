import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findAgents, lintAgent } from './lint-agents.mjs';

const VALID = `---
name: test-analyst
description: Use when a work item needs its basis reviewed, its risks analysed, or its cases designed.
tools: Read, Glob, Grep, Write, Skill
skills:
  - risk-analysis
---

You are the test analyst.

## Inputs

The packet.

## Output

Files under qa/.

## Exit criteria

The checklist of each skill passes.

## Return

File paths and a five-line summary.
`;

/** A plugin folder with one agent and the named skills; returns the agent's path. */
function plugin(agent, { name = 'test-analyst', skills = ['risk-analysis'] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'lint-agents-'));
  mkdirSync(join(root, 'agents'));
  for (const skill of skills) {
    mkdirSync(join(root, 'skills', skill), { recursive: true });
    writeFileSync(join(root, 'skills', skill, 'SKILL.md'), '---\nname: x\n---\n');
  }
  writeFileSync(join(root, 'agents', `${name}.md`), agent);
  return join(root, 'agents', `${name}.md`);
}

const rules = (path) => lintAgent(path).map((finding) => finding.rule);

test('an agent that follows the standard has no findings', () => {
  assert.deepEqual(lintAgent(plugin(VALID)), []);
});

test('the name must match the file name', () => {
  assert.deepEqual(rules(plugin(VALID.replace('name: test-analyst', 'name: analyst'))), ['agent-name']);
});

test('a description is required', () => {
  assert.deepEqual(rules(plugin(VALID.replace(/^description: .*\n/m, ''))), ['agent-description']);
});

test('only the lead may delegate: a specialist with the Agent tool is rejected', () => {
  assert.deepEqual(rules(plugin(VALID.replace('tools: Read', 'tools: Agent, Read'))), ['agent-delegates']);
});

test('the lead may have the Agent tool', () => {
  const lead = VALID.replace('name: test-analyst', 'name: qa-lead').replace('tools: Read', 'tools: Agent(qa:test-analyst), Read');
  assert.deepEqual(rules(plugin(lead, { name: 'qa-lead' })), []);
});

test('an agent must list its tools, so it never inherits every tool', () => {
  assert.deepEqual(rules(plugin(VALID.replace(/^tools: .*\n/m, ''))), ['agent-tools']);
});

test('every preloaded skill must exist in the plugin', () => {
  assert.deepEqual(rules(plugin(VALID.replace('- risk-analysis', '- risk-analyses'))), ['agent-skills']);
});

test('fields that plugin agents ignore are rejected, so nobody relies on them', () => {
  for (const field of ['hooks: {}', 'mcpServers: {}', 'permissionMode: acceptEdits']) {
    assert.deepEqual(rules(plugin(VALID.replace('skills:', `${field}\nskills:`))), ['agent-ignored-field']);
  }
});

test('the body needs the inputs, output, exit criteria, and return sections', () => {
  assert.deepEqual(rules(plugin(VALID.replace('## Return', '## Reply'))), ['agent-sections']);
});

test('a long body is rejected: knowledge belongs in skills', () => {
  const long = VALID + Array.from({ length: 80 }, (_, i) => `Line ${i}.`).join('\n');
  assert.deepEqual(rules(plugin(long)), ['agent-length']);
});

test('agents are found in each plugin agents folder', () => {
  const path = plugin(VALID);
  assert.deepEqual(findAgents(join(path, '..', '..')), [path]);
});
