#!/usr/bin/env node
/**
 * UserPromptSubmit hook: adds a routing hint to a prompt that matches a route in routing.json.
 * Reads the hook input as JSON on stdin. Speaks only in a project with qa/profile.yaml, and never blocks
 * a prompt: on any problem it exits 0 and prints nothing.
 * No npm dependencies: plugins run on the user's machine as shipped.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hintText, loadManifest, matchRoute } from './match.mjs';

try {
  const { prompt, cwd } = JSON.parse(readFileSync(0, 'utf8'));
  if (typeof prompt === 'string' && typeof cwd === 'string' && existsSync(join(cwd, 'qa', 'profile.yaml'))) {
    const hint = hintText(matchRoute(prompt, loadManifest()));
    if (hint) {
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: hint } }));
    }
  }
} catch {
  // A routing hint is optional: a prompt must never fail because of it.
}
process.exit(0);
