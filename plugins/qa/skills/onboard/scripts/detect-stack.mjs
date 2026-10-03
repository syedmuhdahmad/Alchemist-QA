#!/usr/bin/env node
/**
 * Detects a project's stack and drafts qa/profile.yaml (plugins/qa/schemas/profile.schema.json).
 * Usage: node detect-stack.mjs [--root <dir>] [--write]
 *   without --write  prints the draft profile
 *   --write          writes qa/profile.yaml under the root; refuses to overwrite one that exists (exit 1)
 * Finds apps in the root and up to two folders down, outside node_modules. No npm dependencies.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'Pods', 'qa', 'android', 'ios']);

/** package.json files at the root and up to `depth` folders below it. */
function packageFiles(root, dir = root, depth = 2) {
  const found = existsSync(join(dir, 'package.json')) ? [join(dir, 'package.json')] : [];
  if (depth === 0) return found;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !SKIP.has(entry.name) && !entry.name.startsWith('.')) {
      found.push(...packageFiles(root, join(dir, entry.name), depth - 1));
    }
  }
  return found;
}

/** The first git remote URL, from the nearest .git/config at or above root. */
function gitRemote(root) {
  for (let dir = resolve(root); ; dir = dirname(dir)) {
    const config = join(dir, '.git', 'config');
    if (existsSync(config)) return readFileSync(config, 'utf8').match(/^\s*url\s*=\s*(\S+)/m)?.[1];
    if (dirname(dir) === dir) return undefined;
  }
}

function tracker(remote) {
  const github = remote?.match(/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/);
  if (github) return { type: 'github-issues', project: github[1] };
  const azure = remote?.match(/dev\.azure\.com\/([^/]+\/[^/]+)\//) ?? remote?.match(/ssh\.dev\.azure\.com:v3\/([^/]+\/[^/]+)\//);
  if (azure) return { type: 'azure-devops', project: azure[1] };
  return { type: 'github-issues' };
}

const DEVICES = {
  android: [
    { name: 'Pixel_7', platform: 'android', form: 'phone', os: '16' },
    { name: 'Pixel_Tablet', platform: 'android', form: 'tablet', os: '16' },
  ],
  ios: [
    { name: 'iPhone 16', platform: 'ios', form: 'phone', os: '18' },
    { name: 'iPad (10th generation)', platform: 'ios', form: 'tablet', os: '18' },
  ],
};

/** A draft profile for the project at root. */
export function detect(root) {
  const platforms = new Set();
  const capabilities = {};
  const source = [];
  const environments = {};
  for (const file of packageFiles(root)) {
    const dir = dirname(file);
    const pkg = JSON.parse(readFileSync(file, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const folder = relative(root, dir) ? `${relative(root, dir)}/` : './';
    if (deps['react-native']) {
      source.push(folder);
      capabilities['unit-mobile'] = 'qa-mobile:jest-native';
      if (existsSync(join(dir, 'android'))) platforms.add('android');
      if (existsSync(join(dir, 'ios'))) platforms.add('ios');
    } else if (deps['react-dom']) {
      source.push(folder);
      platforms.add('web');
      capabilities['unit-web'] = 'qa-web:vitest';
      const port = Object.values(pkg.scripts ?? {}).join(' ').match(/--port[= ](\d+)/)?.[1] ?? (deps.vite ? '5173' : '3000');
      environments.local ??= { url: `http://localhost:${port}`, allow: ['functional', 'accessibility'] };
    }
  }
  const order = ['web', 'android', 'ios'].filter((platform) => platforms.has(platform));
  const devices = order.flatMap((platform) => DEVICES[platform] ?? []);
  const profile = { stack: { platforms: order, source: source.sort() }, capabilities, tracker: tracker(gitRemote(root)), autonomy: 'L0' };
  if (devices.length > 0) profile.devices = devices;
  profile.environments = Object.keys(environments).length > 0 ? environments : { local: { url: 'http://localhost', allow: ['functional'] } };
  return profile;
}

/** YAML for a profile: plain values only, so no YAML library is needed. */
export function toYaml(profile) {
  const value = (v) => (/^[\w./:@-]+$/.test(String(v)) ? String(v) : JSON.stringify(v));
  const list = (items) => `[${items.map(value).join(', ')}]`;
  const lines = [
    '# Drafted by /qa:onboard. Check every line; the department reads it at the start of each session.',
    'stack:',
    `  platforms: ${list(profile.stack.platforms)}`,
    `  source: ${list(profile.stack.source)}`,
    'capabilities:',
    ...Object.entries(profile.capabilities).map(([key, skill]) => `  ${key}: ${value(skill)}`),
  ];
  if (Object.keys(profile.capabilities).length === 0) lines[lines.length - 1] = 'capabilities: {}';
  if (profile.devices) {
    lines.push('devices:');
    for (const device of profile.devices) {
      lines.push(`  - { name: ${value(device.name)}, platform: ${device.platform}, form: ${device.form}, os: "${device.os}" }`);
    }
  }
  lines.push('tracker:', `  type: ${profile.tracker.type}`);
  if (profile.tracker.project) lines.push(`  project: ${value(profile.tracker.project)}`);
  lines.push('# L0: one job per request, and a person reviews everything before it is posted.');
  lines.push(`autonomy: ${profile.autonomy}`, 'environments:');
  for (const [name, environment] of Object.entries(profile.environments)) {
    lines.push(`  ${name}:`, `    url: ${value(environment.url)}`, `    allow: ${list(environment.allow)}`);
  }
  return `${lines.join('\n')}\n`;
}

function main(args) {
  const index = args.indexOf('--root');
  const root = resolve(index === -1 ? '.' : args[index + 1]);
  const yaml = toYaml(detect(root));
  if (!args.includes('--write')) {
    process.stdout.write(yaml);
    return 0;
  }
  const path = join(root, 'qa', 'profile.yaml');
  if (existsSync(path)) {
    console.error(`${relative(process.cwd(), path) || path} already exists; not overwriting it. Without --write this prints the draft.`);
    return 1;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, yaml);
  console.log(`wrote ${relative(process.cwd(), path)}`);
  process.stdout.write(yaml);
  return 0;
}

if (argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url)) exit(main(argv.slice(2)));
