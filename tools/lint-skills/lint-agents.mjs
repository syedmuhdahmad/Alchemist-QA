/** Lints plugin agent files against the agent rules in docs/authoring.md. */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { parse } from 'yaml';

const LEAD = 'qa-lead';
const MAX_BODY_LINES = 60;
const SECTIONS = ['Inputs', 'Output', 'Exit criteria', 'Return'];
// Claude Code ignores these on plugin agents (docs/claude-code-verification.md).
const IGNORED_FIELDS = ['hooks', 'mcpServers', 'permissionMode'];

/**
 * @param {string} agentFile <plugin>/agents/<name>.md
 * @returns {{rule: string, level: 'error', message: string, file: string}[]}
 */
export function lintAgent(agentFile) {
  const findings = [];
  const add = (rule, message) => findings.push({ rule, level: 'error', message, file: agentFile });
  const match = readFileSync(agentFile, 'utf8').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    add('agent-frontmatter', 'an agent file must start with YAML frontmatter');
    return findings;
  }
  const front = parse(match[1]) ?? {};
  const body = match[2];
  const name = basename(agentFile, '.md');

  if (front.name !== name) add('agent-name', `name must match the file name "${name}"`);
  if (!String(front.description ?? '').trim()) add('agent-description', 'a description saying when to delegate is required');

  const tools = String(front.tools ?? '').trim();
  if (!tools) {
    add('agent-tools', 'list the tools the agent needs; without a list it inherits every tool');
  } else if (/(^|,)\s*(Agent|Task)\b/.test(tools) && name !== LEAD) {
    add('agent-delegates', `only ${LEAD} may have the Agent tool`);
  }

  const pluginDir = dirname(dirname(agentFile));
  for (const skill of [].concat(front.skills ?? [])) {
    const local = String(skill).replace(/^[\w-]+:/, '');
    const namespaced = String(skill).includes(':');
    if (!namespaced && !existsSync(join(pluginDir, 'skills', local, 'SKILL.md'))) {
      add('agent-skills', `preloaded skill "${skill}" does not exist in this plugin`);
    }
  }

  for (const field of IGNORED_FIELDS.filter((key) => key in front)) {
    add('agent-ignored-field', `"${field}" is ignored on plugin agents; put hooks in hooks/hooks.json`);
  }

  const missing = SECTIONS.filter((section) => !new RegExp(`^## ${section}\\s*$`, 'm').test(body));
  if (missing.length > 0) add('agent-sections', `missing sections: ${missing.map((s) => `## ${s}`).join(', ')}`);

  const bodyLines = body.trim().split('\n').length;
  if (bodyLines > MAX_BODY_LINES) {
    add('agent-length', `the body is ${bodyLines} lines; keep it to ${MAX_BODY_LINES} and move knowledge into skills`);
  }
  return findings;
}

/** Every agent file in an `agents/` folder directly inside a plugin under root. */
export function findAgents(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && basename(entry.parentPath) === 'agents')
    .filter((entry) => !entry.parentPath.split('/').includes('node_modules'))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}
