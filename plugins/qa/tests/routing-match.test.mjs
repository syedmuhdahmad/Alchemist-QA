import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hintText, matchRoute } from '../skills/routing/scripts/match.mjs';

const MANIFEST = {
  items: [
    { kind: 'github', label: 'GitHub issue', pattern: '(?<![\\w&/])#\\d+\\b', route: 'lead.github' },
    { kind: 'azure', label: 'Azure DevOps work item', pattern: '\\bAB#\\d+\\b' },
    { kind: 'risk', label: 'risk', pattern: '\\bR-[A-Za-z0-9-]*\\d\\b', route: 'lead.manual' },
  ],
  routes: [
    { id: 'lead.github', agent: 'qa-lead', skill: 'qa:intake-github', signals: ['github issue'] },
    { id: 'lead.manual', agent: 'qa-lead', skill: 'qa:intake-manual', signals: ['test risk', 'no ticket'] },
    { id: 'design.blackbox', agent: 'test-analyst', skill: 'qa:test-design-blackbox', signals: ['test cases for', 'boundary values', 'edge cases'] },
    { id: 'implementation.unit-web', agent: 'automation-engineer', skill: 'qa-web:vitest', signals: ['automate', 'web app'] },
    { id: 'implementation.unit-mobile', agent: 'automation-engineer', skill: 'qa-mobile:jest-native', signals: ['automate', 'mobile app'] },
  ],
};

const ids = (result) => result.routes.map((route) => route.id);

test('the route with the most matched signals wins, and the matched words are kept', () => {
  const result = matchRoute('Write test cases for the coupon field, with boundary values', MANIFEST);
  assert.deepEqual(ids(result), ['design.blackbox']);
  assert.deepEqual(result.routes[0].matched, ['test cases for', 'boundary values']);
  assert.equal(result.reason, 'signals');
});

test('signals match whole words, in any case', () => {
  assert.deepEqual(ids(matchRoute('EDGE CASES please', MANIFEST)), ['design.blackbox']);
  assert.deepEqual(ids(matchRoute('the hedge cases are fine', MANIFEST)), []);
  assert.deepEqual(ids(matchRoute('automated everything', MANIFEST)), []);
});

test('work-item ids are listed, and an id picks its route only when no signal matched', () => {
  const byId = matchRoute('take #12 through testing', MANIFEST);
  assert.deepEqual(ids(byId), ['lead.github']);
  assert.equal(byId.reason, 'item');
  assert.deepEqual(byId.items, [{ kind: 'github', label: 'GitHub issue', id: '#12' }]);
  const bySignal = matchRoute('write test cases for #12', MANIFEST);
  assert.deepEqual(ids(bySignal), ['design.blackbox']);
  assert.deepEqual(bySignal.items.map((item) => item.id), ['#12']);
});

test('when routes tie, the one a work-item id names wins', () => {
  const tied = {
    ...MANIFEST,
    routes: MANIFEST.routes.map((route) => (route.id.startsWith('lead.') ? { ...route, signals: [...route.signals, 'up to the report'] } : route)),
  };
  assert.deepEqual(ids(matchRoute('take R-product-2 up to the report', tied)), ['lead.manual']);
  assert.deepEqual(ids(matchRoute('take #4 up to the report', tied)), ['lead.github']);
  assert.deepEqual(ids(matchRoute('take it up to the report', tied)), ['lead.github', 'lead.manual']);
});

test('AB#123 is an Azure DevOps item, not GitHub issue #123, and has no route of its own', () => {
  const result = matchRoute('look at AB#123', MANIFEST);
  assert.deepEqual(result.items.map((item) => item.kind), ['azure']);
  assert.deepEqual(ids(result), []);
});

test('a tie keeps every tied route, so the hint can offer both', () => {
  assert.deepEqual(ids(matchRoute('automate the cases', MANIFEST)), ['implementation.unit-web', 'implementation.unit-mobile']);
  assert.deepEqual(ids(matchRoute('automate the cases for the mobile app', MANIFEST)), ['implementation.unit-mobile']);
});

test('a prompt with no signal and no routed id matches nothing, and a slash command is left alone', () => {
  assert.deepEqual(matchRoute('fix the typo in the README', MANIFEST), { routes: [], items: [], reason: null });
  assert.deepEqual(ids(matchRoute('/qa:onboard edge cases', MANIFEST)), []);
});

test('the hint names the route, agent, skill, and why, and says it is advice', () => {
  const hint = hintText(matchRoute('write test cases for #12', MANIFEST));
  assert.match(hint, /design\.blackbox/);
  assert.match(hint, /qa:test-analyst/);
  assert.match(hint, /qa:test-design-blackbox/);
  assert.match(hint, /"test cases for"/);
  assert.match(hint, /#12/);
  assert.match(hint, /advice/i);
  assert.match(hintText(matchRoute('automate the cases', MANIFEST)), /implementation\.unit-web or implementation\.unit-mobile/);
  assert.match(hintText(matchRoute('take #12 through testing', MANIFEST)), /from the work item #12/);
  assert.equal(hintText(matchRoute('fix the typo', MANIFEST)), '');
});
