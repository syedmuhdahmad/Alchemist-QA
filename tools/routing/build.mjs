#!/usr/bin/env node
/**
 * Builds the routing layer from plugins/qa/routing.yaml, and the pipelines from plugins/qa/pipelines.yaml:
 *   plugins/qa/skills/routing/routing.json          what the UserPromptSubmit hook matches against
 *   plugins/qa/skills/pipeline/pipelines.json       what the pipeline engine and its hooks follow
 *   plugins/qa/skills/routing/SKILL.md              the route and depth tables, between generated markers
 *   plugins/qa/evals/routing/<case>/                a model eval case for each golden prompt marked `model: true`
 * Usage: node tools/routing/build.mjs [--check]
 *   --check writes nothing, and exits 1 when a generated file is out of step or the manifest has an error.
 */
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { matchRoute } from '../../plugins/qa/skills/routing/scripts/match.mjs';
import { validateFile } from '../validate-testware/validate-testware.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SOURCE = 'plugins/qa/routing.yaml';
const PIPELINES = 'plugins/qa/pipelines.yaml';
const PIPELINES_OUT = 'plugins/qa/skills/pipeline/pipelines.json';
const GOLDEN = 'tools/routing/golden.yaml';
const JSON_OUT = 'plugins/qa/skills/routing/routing.json';
const SKILL = 'plugins/qa/skills/routing/SKILL.md';
const EVALS = 'plugins/qa/evals/routing';

/** The agents of the qa plugin, and the plugin that holds each skill name (null when two plugins do). */
function knownFromRepo() {
  const agents = readdirSync(join(ROOT, 'plugins/qa/agents'))
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.slice(0, -3));
  const skills = {};
  for (const plugin of readdirSync(join(ROOT, 'plugins'))) {
    const dir = join(ROOT, 'plugins', plugin, 'skills');
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (existsSync(join(dir, name, 'SKILL.md'))) skills[name] = name in skills ? null : plugin;
    }
  }
  return { agents, skills };
}

/** Schema errors for a manifest's text, validated as the file it would be. */
function schemaErrors(name, text) {
  const scratch = mkdtempSync(join(tmpdir(), 'manifest-'));
  writeFileSync(join(scratch, name), text);
  const errors = validateFile(join(scratch, name)).map((error) => `${name} ${error.message}`);
  rmSync(scratch, { recursive: true, force: true });
  return errors;
}

/**
 * @param {string} yamlText routing.yaml
 * @param {{agents: string[], skills: Record<string, string | null>}} known
 * @returns {{manifest: object | null, errors: string[]}}
 */
export function buildManifest(yamlText, known) {
  const errors = schemaErrors('routing.yaml', yamlText);
  if (errors.length > 0) return { manifest: null, errors };

  const data = parse(yamlText);
  if (!data.depth) errors.push('routing.yaml has no depth section');
  const ids = new Set();
  const routes = [];
  for (const route of data.routes) {
    if (ids.has(route.id)) errors.push(`route ${route.id} appears twice`);
    ids.add(route.id);
    if (!known.agents.includes(route.agent)) errors.push(`route ${route.id} names agent ${route.agent}, which does not exist`);
    const plugin = known.skills[route.method];
    if (!plugin) errors.push(`route ${route.id} names skill ${route.method}, which no single plugin has`);
    routes.push({ id: route.id, agent: route.agent, skill: `${plugin}:${route.method}`, signals: route.signals });
  }
  const items = (data.items ?? []).map(({ kind, label, pattern, route }) => {
    try {
      new RegExp(pattern);
    } catch (error) {
      errors.push(`item ${kind} has a pattern that does not compile: ${error.message}`);
    }
    if (route !== undefined && !ids.has(route)) errors.push(`item ${kind} names route ${route}, which does not exist`);
    return { kind, label, pattern, ...(route !== undefined && { route }) };
  });
  return { manifest: { items, routes, depth: data.depth }, errors };
}

/**
 * @param {string} yamlText pipelines.yaml
 * @param {{agents: string[], skills: Record<string, string | null>}} known
 * @returns {{manifest: object | null, errors: string[]}}
 */
export function buildPipelines(yamlText, known) {
  const errors = schemaErrors('pipelines.yaml', yamlText);
  if (errors.length > 0) return { manifest: null, errors };
  const data = parse(yamlText);
  for (const [name, { stages }] of Object.entries(data.pipelines)) {
    const ids = stages.map((stage) => stage.id);
    // A repeated id would send the engine back to an earlier stage, round and round.
    for (const id of new Set(ids.filter((id, index) => ids.indexOf(id) !== index))) errors.push(`stage ${id} appears twice in pipeline ${name}`);
    for (const stage of stages) {
      if (!known.agents.includes(stage.agent)) errors.push(`stage ${stage.id} names agent ${stage.agent}, which does not exist`);
      if (stage.method && !known.skills[stage.method]) errors.push(`stage ${stage.id} names skill ${stage.method}, which no single plugin has`);
    }
  }
  return { manifest: data, errors };
}

/** The manifest and golden set from the repo, with every error in either. */
buildManifest.fromRepo = () => {
  const { manifest, errors } = buildManifest(readFileSync(join(ROOT, SOURCE), 'utf8'), knownFromRepo());
  const golden = parse(readFileSync(join(ROOT, GOLDEN), 'utf8'));
  const ids = new Set((manifest?.routes ?? []).map((route) => route.id));
  for (const { prompt, expect, model } of golden) {
    for (const id of [expect ?? []].flat()) {
      if (!ids.has(id)) errors.push(`golden prompt "${prompt}" expects route ${id}, which does not exist`);
    }
    if (model && typeof expect !== 'string') errors.push(`golden prompt "${prompt}" is a model case, so it needs one expected route`);
  }
  return { manifest, golden, errors };
};

export function renderRoutes(manifest) {
  const rows = manifest.routes.map((route) => {
    const byItem = manifest.items
      .filter((item) => item.route === route.id)
      .map((item) => `; or a ${item.label} id with no other match`)
      .join('');
    return `| \`${route.id}\` | ${route.signals.join('; ')}${byItem} | \`qa:${route.agent}\` | \`${route.skill}\` |`;
  });
  return ['| Route | Requests like | Agent | Skill |', '| --- | --- | --- | --- |', ...rows].join('\n');
}

export function renderDepth(depth) {
  const rows = ['low', 'medium', 'high'].map((level) => {
    const { techniques, review, devices } = depth[level];
    return `| ${level} | ${techniques.join(', ')} | ${review} | ${devices} |`;
  });
  return ['| Risk | Techniques | Testware review | Devices and runs |', '| --- | --- | --- | --- |', ...rows].join('\n');
}

/** Replaces the text between `<!-- generated:<name>:start -->` and its end marker. */
export function replaceBetween(text, name, content) {
  const pattern = new RegExp(`(<!-- generated:${name}:start -->\\n)(?:[\\s\\S]*?\\n)?(<!-- generated:${name}:end -->)`);
  if (!pattern.test(text)) throw new Error(`no ${name} markers found`);
  return text.replace(pattern, (_, start, end) => `${start}${content}\n${end}`);
}

/** How many golden prompts the matcher routes exactly as expected. `expect: null` means no route at all. */
export function accuracy(golden, manifest) {
  const misses = [];
  for (const { prompt, expect } of golden) {
    const got = matchRoute(prompt, manifest).routes.map((route) => route.id);
    const wanted = [expect ?? []].flat();
    const same = got.length === wanted.length && wanted.every((id) => got.includes(id));
    if (!same) misses.push({ prompt, expect: expect ?? null, got });
  }
  return { total: golden.length, correct: golden.length - misses.length, misses };
}

const FIXTURE = `#!/usr/bin/env bash
# A project that has run /qa:onboard, so the routing hook is on.
set -euo pipefail
mkdir -p qa
cat > qa/profile.yaml <<'PROFILE'
stack:
  platforms: [web]
capabilities:
  unit-web: qa-web:vitest
tracker:
  type: github-issues
autonomy: L0
PROFILE
`;

// The routing decision, not the work: the eval project holds no app or testware to do the work on.
const ROUTING_CHECK = '(Routing check: do not start the work. Reply with the department agent and skill that should handle this request.)';

/** One model eval case per golden prompt marked `model: true`: does Claude name the expected agent or skill? */
function evalCases(golden, manifest) {
  const files = {};
  const used = new Set();
  for (const { prompt, expect } of golden.filter((entry) => entry.model)) {
    const route = manifest.routes.find((candidate) => candidate.id === expect);
    const base = route.id.replace(/\./g, '-');
    let slug = base;
    for (let n = 2; used.has(slug); n += 1) slug = `${base}-${n}`;
    used.add(slug);
    const skill = route.skill.split(':')[1];
    const dir = `${EVALS}/${slug}`;
    files[`${dir}/case.yaml`] = `schema_version: "1.1"\nname: routing-${slug}\ncontext:\n  scaffold_script: fixture.sh\n`;
    files[`${dir}/fixture.sh`] = FIXTURE;
    files[`${dir}/prompt.md`] = [
      '---',
      'max_turns: 3',
      'timeout_seconds: 300',
      'allowed_tools: [Read, Glob, Grep, Skill]',
      'tags: [routing]',
      '---',
      '',
      prompt,
      '',
      ROUTING_CHECK,
      '',
    ].join('\n');
    files[`${dir}/graders/route.md`] = [
      '---',
      '# Generated by tools/routing/build.mjs from tools/routing/golden.yaml.',
      '# The reply names the expected agent or skill.',
      'type: regex',
      `pattern: "\\\\b(?:${route.agent}|${skill})\\\\b"`,
      '---',
      '',
    ].join('\n');
  }
  return files;
}

/** Every generated file, by repo-relative path. */
function generated() {
  const { manifest, golden, errors } = buildManifest.fromRepo();
  if (errors.length > 0) throw new Error(errors.join('\n'));
  let skill = readFileSync(join(ROOT, SKILL), 'utf8');
  skill = replaceBetween(skill, 'routes', renderRoutes(manifest));
  skill = replaceBetween(skill, 'depth', renderDepth(manifest.depth));
  const pipelines = buildPipelines(readFileSync(join(ROOT, PIPELINES), 'utf8'), knownFromRepo());
  if (pipelines.errors.length > 0) throw new Error(pipelines.errors.join('\n'));
  return {
    [JSON_OUT]: `${JSON.stringify(manifest, null, 2)}\n`,
    [SKILL]: skill,
    [PIPELINES_OUT]: `${JSON.stringify(pipelines.manifest, null, 2)}\n`,
    ...evalCases(golden, manifest),
  };
}

/** Generated files missing or different on disk, and files under the routing evals that nothing generates. */
export function staleFiles() {
  const files = generated();
  const stale = Object.entries(files)
    .filter(([path, text]) => !existsSync(join(ROOT, path)) || readFileSync(join(ROOT, path), 'utf8') !== text)
    .map(([path]) => path);
  const evalDir = join(ROOT, EVALS);
  if (existsSync(evalDir)) {
    for (const entry of readdirSync(evalDir, { recursive: true })) {
      const path = `${EVALS}/${entry}`;
      if (statSync(join(ROOT, path)).isFile() && !(path in files) && !path.includes('/results/')) stale.push(path);
    }
  }
  return stale;
}

function write() {
  const files = generated();
  rmSync(join(ROOT, EVALS), { recursive: true, force: true });
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(ROOT, path, '..'), { recursive: true });
    writeFileSync(join(ROOT, path), text);
    if (path.endsWith('.sh')) chmodSync(join(ROOT, path), 0o755);
  }
  const { manifest, golden } = buildManifest.fromRepo();
  const result = accuracy(golden, manifest);
  console.log(`wrote ${Object.keys(files).length} files; golden set ${result.correct}/${result.total} routed as expected`);
  for (const miss of result.misses) console.log(`  miss: "${miss.prompt}" expected ${miss.expect}, got ${miss.got.join(', ') || 'nothing'}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    try {
      const stale = staleFiles();
      for (const path of stale) console.error(`out of step with ${SOURCE}: ${relative('.', join(ROOT, path))}`);
      if (stale.length > 0) console.error('run: node tools/routing/build.mjs');
      process.exit(stale.length > 0 ? 1 : 0);
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  }
  write();
}
