import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accuracy, buildManifest, replaceBetween, renderDepth, renderRoutes, staleFiles } from './build.mjs';

const KNOWN = {
  agents: ['qa-lead', 'test-analyst', 'automation-engineer'],
  skills: { 'intake-github': 'qa', 'test-design-blackbox': 'qa', vitest: 'qa-web' },
};

const YAML = `items:
  - kind: github
    label: GitHub issue
    pattern: '(?<![\\w&/])#\\d+\\b'
    route: lead.github
routes:
  - id: lead.github
    activity: analysis
    signals: ["github issue"]
    agent: qa-lead
    method: intake-github
  - id: design.blackbox
    activity: design
    signals: ["test cases for", "edge cases"]
    agent: test-analyst
    method: test-design-blackbox
  - id: implementation.unit-web
    activity: implementation
    signals: ["automate"]
    agent: automation-engineer
    method: vitest
    capability: unit-web
depth:
  low: { techniques: [equivalence-partitioning], review: none, devices: one browser }
  medium: { techniques: [equivalence-partitioning, boundary-value], review: sampled, devices: phone and tablet }
  high: { techniques: [equivalence-partitioning, boundary-value, state-transition], review: all, devices: full portfolio }
`;

test('the manifest resolves each method to its plugin skill and keeps what the hook needs', () => {
  const { manifest, errors } = buildManifest(YAML, KNOWN);
  assert.deepEqual(errors, []);
  assert.deepEqual(manifest.routes[0], { id: 'lead.github', agent: 'qa-lead', skill: 'qa:intake-github', signals: ['github issue'] });
  assert.equal(manifest.routes[2].skill, 'qa-web:vitest');
  assert.equal(manifest.items[0].route, 'lead.github');
  assert.equal(manifest.depth.medium.review, 'sampled');
});

test('an unknown agent, method, or item route, or a manifest that breaks the schema, is an error', () => {
  const bad = YAML.replace('agent: test-analyst', 'agent: test-analist')
    .replace('method: vitest', 'method: vitestt')
    .replace('route: lead.github', 'route: lead.gitlab');
  const { errors } = buildManifest(bad, KNOWN);
  assert.ok(errors.some((e) => /design\.blackbox.*agent test-analist/.test(e)), errors.join('\n'));
  assert.ok(errors.some((e) => /implementation\.unit-web.*skill vitestt/.test(e)), errors.join('\n'));
  assert.ok(errors.some((e) => /github.*route lead\.gitlab/.test(e)), errors.join('\n'));
  assert.ok(buildManifest(YAML.replace('activity: design', 'activity: vibes'), KNOWN).errors.length > 0);
  assert.ok(buildManifest(`${YAML.split('depth:')[0]}`, KNOWN).errors.some((e) => /depth/.test(e)));
});

test('the tables name every route and every risk level', () => {
  const { manifest } = buildManifest(YAML, KNOWN);
  const routes = renderRoutes(manifest);
  assert.match(routes, /^\| Route \| Requests like \| Agent \| Skill \|/);
  assert.match(routes, /\| `design\.blackbox` \| test cases for; edge cases \| `qa:test-analyst` \| `qa:test-design-blackbox` \|/);
  assert.match(routes, /\| `lead\.github` \| github issue; or a GitHub issue id with no other match \|/);
  const depth = renderDepth(manifest.depth);
  assert.match(depth, /\| high \| equivalence-partitioning, boundary-value, state-transition \| all \| full portfolio \|/);
});

test('generated text replaces only what is between its markers', () => {
  const text = 'a\n<!-- generated:routes:start -->\nold\n<!-- generated:routes:end -->\nb\n';
  assert.equal(replaceBetween(text, 'routes', 'new'), 'a\n<!-- generated:routes:start -->\nnew\n<!-- generated:routes:end -->\nb\n');
  assert.throws(() => replaceBetween('no markers', 'routes', 'new'), /routes markers/);
});

test('accuracy counts a prompt right only when the matcher picks exactly what was expected', () => {
  const { manifest } = buildManifest(YAML, KNOWN);
  const golden = [
    { prompt: 'write test cases for the cart', expect: 'design.blackbox' },
    { prompt: 'take #12 through testing', expect: 'lead.github' },
    { prompt: 'fix the README typo', expect: null },
    { prompt: 'automate the test cases for the cart', expect: 'implementation.unit-web' },
  ];
  const result = accuracy(golden, manifest);
  assert.equal(result.total, 4);
  assert.equal(result.correct, 3);
  assert.deepEqual(result.misses, [{ prompt: 'automate the test cases for the cart', expect: 'implementation.unit-web', got: ['design.blackbox'] }]);
});

test('the repo is in step with routing.yaml, and the golden set routes at least 95% right', () => {
  assert.deepEqual(staleFiles(), [], 'run: node tools/routing/build.mjs');
  const { manifest, golden, errors } = buildManifest.fromRepo();
  assert.deepEqual(errors, []);
  const result = accuracy(golden, manifest);
  assert.ok(result.total >= 50, `the golden set has ${result.total} prompts`);
  assert.ok(result.correct / result.total >= 0.95, `accuracy ${result.correct}/${result.total}; misses:\n${JSON.stringify(result.misses, null, 2)}`);
});
