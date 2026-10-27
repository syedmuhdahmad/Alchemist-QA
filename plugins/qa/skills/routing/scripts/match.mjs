/**
 * Matches a prompt against the routing manifest in plain code: no model call.
 * The manifest is ../routing.json, generated from plugins/qa/routing.yaml.
 * No npm dependencies: plugins run on the user's machine as shipped.
 */
import { readFileSync } from 'node:fs';

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// A signal matches whole words only: "automate" does not match "automated".
const wholeWords = (signal) => new RegExp(`(?<![a-z0-9])${escape(signal)}(?![a-z0-9])`, 'i');

/** The generated manifest that ships with the skill. */
export function loadManifest() {
  return JSON.parse(readFileSync(new URL('../routing.json', import.meta.url), 'utf8'));
}

/**
 * @param {string} prompt what the person typed
 * @param {{items: object[], routes: object[]}} manifest
 * @returns {{routes: {id: string, agent: string, skill: string, matched: string[]}[],
 *            items: {kind: string, label: string, id: string}[], reason: 'signals' | 'item' | null}}
 */
export function matchRoute(prompt, manifest) {
  if (prompt.trimStart().startsWith('/')) return { routes: [], items: [], reason: null };

  const items = [];
  for (const { kind, label, pattern } of manifest.items ?? []) {
    for (const [id] of prompt.matchAll(new RegExp(pattern, 'g'))) {
      if (!items.some((item) => item.id === id)) items.push({ kind, label, id });
    }
  }

  const scored = manifest.routes
    .map((route) => ({ route, matched: route.signals.filter((signal) => wholeWords(signal).test(prompt)) }))
    .filter(({ matched }) => matched.length > 0)
    .map(({ route, matched }) => ({ route, matched, score: [matched.length, matched.join('').length] }));
  if (scored.length > 0) {
    const [count, length] = scored.reduce(
      (best, { score }) => (score[0] > best[0] || (score[0] === best[0] && score[1] > best[1]) ? score : best),
      [0, 0],
    );
    const tied = scored
      .filter(({ score }) => score[0] === count && score[1] === length)
      .map(({ route, matched }) => ({ id: route.id, agent: route.agent, skill: route.skill, matched }));
    // A tie between routes that a work-item id settles: "take R-1 up to the report" is the risk's route.
    const named = items.map((item) => manifest.items.find((entry) => entry.kind === item.kind)?.route);
    const settled = tied.filter((route) => named.includes(route.id));
    return { routes: tied.length > 1 && settled.length === 1 ? settled : tied, items, reason: 'signals' };
  }

  const routedItem = items.find((item) => manifest.items.find((entry) => entry.kind === item.kind)?.route);
  if (routedItem) {
    const routeId = manifest.items.find((entry) => entry.kind === routedItem.kind).route;
    const route = manifest.routes.find((candidate) => candidate.id === routeId);
    return { routes: [{ id: route.id, agent: route.agent, skill: route.skill, matched: [] }], items, reason: 'item' };
  }
  return { routes: [], items, reason: null };
}

/** The context the hook adds to the prompt, or '' when nothing matched. */
export function hintText({ routes, items, reason }) {
  if (routes.length === 0) return '';
  const describe = (route) => `${route.id} goes to agent qa:${route.agent} with skill ${route.skill}`;
  const parts = [
    'Alchemist-QA routing hint, from keyword matching: advice, not a decision.',
    `This looks like ${routes.map((route) => route.id).join(' or ')}: ${routes.map(describe).join('; ')}.`,
  ];
  if (reason === 'signals') {
    const words = [...new Set(routes.flatMap((route) => route.matched))].map((word) => `"${word}"`);
    parts.push(`Matched: ${words.join(', ')}.`);
  } else {
    parts.push(`No keywords matched; chosen from the work item ${items[0].id}.`);
  }
  if (items.length > 0) parts.push(`Work items: ${items.map((item) => `${item.id} (${item.label})`).join(', ')}.`);
  parts.push("Check it against the request and the routing skill's table before acting on it.");
  return parts.join(' ');
}
