import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';
import { validateFile } from '../../../tools/validate-testware/validate-testware.mjs';
import { detect, toYaml } from '../skills/onboard/scripts/detect-stack.mjs';

const SCRIPT = new URL('../skills/onboard/scripts/detect-stack.mjs', import.meta.url).pathname;
const REPO = new URL('../../../', import.meta.url).pathname;

function project(files) {
  const root = mkdtempSync(join(tmpdir(), 'onboard-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), typeof content === 'string' ? content : JSON.stringify(content));
  }
  return root;
}

const WEB = { name: 'shop', scripts: { dev: 'vite --port 3000' }, dependencies: { react: '19', 'react-dom': '19' } };
const NATIVE = { name: 'shop-app', dependencies: { react: '19', 'react-native': '0.87.1' } };

/** Writes the detected profile to qa/profile.yaml in a temp folder and validates it. */
function validates(profile) {
  const path = join(mkdtempSync(join(tmpdir(), 'profile-')), 'profile.yaml');
  writeFileSync(path, toYaml(profile));
  return validateFile(path).map((error) => error.message);
}

test('a React web app gets the web platform, the unit-web capability, and its dev server as an environment', () => {
  const profile = detect(project({ 'package.json': WEB }));
  assert.deepEqual(profile.stack.platforms, ['web']);
  assert.deepEqual(profile.capabilities, { 'unit-web': 'qa-web:vitest' });
  assert.equal(profile.environments.local.url, 'http://localhost:3000');
  assert.deepEqual(validates(profile), []);
});

test('a bare React Native app gets Android and iOS from its native folders, and a phone and a tablet', () => {
  const root = project({ 'package.json': NATIVE, 'android/build.gradle': '', 'ios/Podfile': '' });
  const profile = detect(root);
  assert.deepEqual(profile.stack.platforms, ['android', 'ios']);
  assert.deepEqual(profile.capabilities, { 'unit-mobile': 'qa-mobile:jest-native' });
  assert.deepEqual(
    profile.devices.map((device) => [device.platform, device.form]),
    [
      ['android', 'phone'],
      ['android', 'tablet'],
      ['ios', 'phone'],
      ['ios', 'tablet'],
    ],
  );
  assert.deepEqual(validates(profile), []);
});

test('apps in sub-folders are found, and node_modules is ignored', () => {
  const root = project({
    'web/package.json': WEB,
    'mobile/package.json': NATIVE,
    'mobile/android/build.gradle': '',
    'web/node_modules/x/package.json': NATIVE,
  });
  const profile = detect(root);
  assert.deepEqual(profile.stack.platforms, ['web', 'android']);
  assert.deepEqual(profile.stack.source, ['mobile/', 'web/']);
});

test('a GitHub remote sets the tracker to GitHub Issues with the repository name', () => {
  const root = project({ 'package.json': WEB, '.git/config': '[remote "origin"]\n\turl = git@github.com:acme/shop.git\n' });
  assert.deepEqual(detect(root).tracker, { type: 'github-issues', project: 'acme/shop' });
});

test('an Azure DevOps remote sets the tracker to Azure DevOps', () => {
  const root = project({
    'package.json': WEB,
    '.git/config': '[remote "origin"]\n\turl = https://dev.azure.com/acme/shop/_git/shop\n',
  });
  assert.deepEqual(detect(root).tracker, { type: 'azure-devops', project: 'acme/shop' });
});

test('autonomy starts at L0, because a person reviews everything for now', () => {
  assert.equal(detect(project({ 'package.json': WEB })).autonomy, 'L0');
});

test('the benchmark apps produce a profile that validates', () => {
  const profile = detect(join(REPO, 'evals/apps'));
  assert.deepEqual(profile.stack.platforms, ['web', 'android', 'ios']);
  assert.deepEqual(validates(profile), []);
});

test('the CLI writes qa/profile.yaml, and never overwrites one that exists', () => {
  const root = project({ 'package.json': WEB });
  const first = spawnSync('node', [SCRIPT, '--write'], { cwd: root, encoding: 'utf8' });
  assert.equal(first.status, 0, first.stderr);
  assert.equal(parse(readFileSync(join(root, 'qa/profile.yaml'), 'utf8')).autonomy, 'L0');
  const second = spawnSync('node', [SCRIPT, '--write'], { cwd: root, encoding: 'utf8' });
  assert.equal(second.status, 1);
  assert.match(second.stderr, /already exists/);
});

test('without --write the CLI only prints the profile', () => {
  const root = project({ 'package.json': WEB });
  const result = spawnSync('node', [SCRIPT], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^stack:/m);
  assert.ok(!existsSync(join(root, 'qa/profile.yaml')));
});
