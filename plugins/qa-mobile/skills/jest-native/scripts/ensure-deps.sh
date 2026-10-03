#!/usr/bin/env bash
# Checks that a React Native project can run Jest unit and component tests.
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

for package in jest @testing-library/react-native react-test-renderer; do
  node -e "require.resolve('$package/package.json', { paths: [process.cwd()] })" 2>/dev/null || missing+=("$package")
done

# Jest must load React Native through its preset, or every component import fails to parse.
if ! node -e '
  const fs = require("fs");
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const files = ["jest.config.js", "jest.config.cjs", "jest.config.ts", "jest.config.mjs"].filter((f) => fs.existsSync(f));
  const text = files.map((f) => fs.readFileSync(f, "utf8")).join("\n") + JSON.stringify(pkg.jest ?? {});
  process.exit(/react-native(\/jest-preset)?["\x27]/.test(text) || text.includes("@react-native/jest-preset") ? 0 : 1);
' 2>/dev/null; then
  missing_preset=1
fi

if (( ${#missing[@]} == 0 )) && [[ -z "${missing_preset:-}" ]]; then
  echo "ok: jest $(node -p "require(require.resolve('jest/package.json', { paths: [process.cwd()] })).version") and React Native Testing Library are installed in $(pwd)"
  exit 0
fi

if [[ -f pnpm-lock.yaml ]]; then install="pnpm add -D"
elif [[ -f yarn.lock ]]; then install="yarn add -D"
else install="npm install --save-dev"; fi
if [[ -n "${missing_preset:-}" ]]; then
  echo "missing: a Jest config with preset '@react-native/jest-preset' (or 'react-native' before 0.76)"
fi
if (( ${#missing[@]} > 0 )); then
  echo "missing: ${missing[*]}"
  echo "install with: (cd $(pwd) && $install ${missing[*]})"
fi
exit 1
