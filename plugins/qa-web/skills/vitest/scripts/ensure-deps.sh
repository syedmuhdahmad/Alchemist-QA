#!/usr/bin/env bash
# Checks that a React web project can run Vitest unit and component tests.
# Usage: ensure-deps.sh [app dir]. Prints what is missing and the command that installs it. Installs nothing.
# Exit 0 when everything is present, 1 when something is missing.
set -uo pipefail
app="${1:-.}"
cd "$app" || { echo "missing: directory $app"; exit 1; }

missing=()
if ! command -v node >/dev/null; then
  echo "missing: node (install Node.js 20 or later)"
  exit 1
fi
major=$(node -p 'process.versions.node.split(".")[0]')
if (( major < 20 )); then echo "missing: Node.js 20 or later (found $(node -v))"; exit 1; fi
if [[ ! -f package.json ]]; then echo "missing: package.json in $(pwd)"; exit 1; fi

for package in vitest @vitest/coverage-v8 @testing-library/react @testing-library/dom jsdom; do
  node -e "require.resolve('$package/package.json', { paths: [process.cwd()] })" 2>/dev/null || missing+=("$package")
done

if (( ${#missing[@]} == 0 )); then
  echo "ok: vitest $(node -p "require(require.resolve('vitest/package.json', { paths: [process.cwd()] })).version") and Testing Library are installed in $(pwd)"
  exit 0
fi

if [[ -f pnpm-lock.yaml ]]; then install="pnpm add -D"
elif [[ -f yarn.lock ]]; then install="yarn add -D"
else install="npm install --save-dev"; fi
echo "missing: ${missing[*]}"
echo "install with: (cd $(pwd) && $install ${missing[*]})"
exit 1
