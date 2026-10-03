#!/usr/bin/env bash
# Runs Jest once and records the results where the trace and triage read them.
# Usage: run.sh [--app <dir>] [--coverage] [test files or name patterns...]
#   --app       the folder holding the app's package.json (default: the current folder)
#   --coverage  also write lcov and a summary to qa/runs/coverage/
# Writes qa/runs/<UTC time>-unit-mobile.json and a copy at qa/runs/latest/unit-mobile.json, relative to the
# folder it was started in, then prints one line per failed test. Exits with Jest's status.
set -uo pipefail
qa="$(pwd)/qa/runs"
app="."
coverage=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --app) app="${2:?--app needs a value}"; shift 2 ;;
    --coverage) coverage=(--coverage --coverageReporters=lcov --coverageReporters=json-summary "--coverageDirectory=$qa/coverage"); shift ;;
    *) break ;;
  esac
done
mkdir -p "$qa/latest"
out="$qa/$(date -u +%Y-%m-%dT%H-%M-%S)-unit-mobile.json"
cd "$app" || exit 2
npx --no-install jest --ci --json "--outputFile=$out" "${coverage[@]}" "$@"
status=$?
if [[ -f "$out" ]]; then
  cp "$out" "$qa/latest/unit-mobile.json"
  node -e '
    const run = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    console.log(`results: ${process.argv[1]}`);
    console.log(`passed ${run.numPassedTests}, failed ${run.numFailedTests}, not run ${run.numPendingTests + run.numTodoTests}`);
    for (const file of run.testResults) {
      if (file.assertionResults.length === 0 && file.message) console.log(`failed to load: ${file.name}: ${file.message.split("\n").find((l) => l.trim()) ?? ""}`);
      for (const test of file.assertionResults)
        if (test.status === "failed") console.log(`failed: ${test.fullName}: ${(test.failureMessages[0] ?? "").split("\n")[0]}`);
    }
  ' "$out"
else
  echo "no results written: Jest did not run (status $status). Run ensure-deps.sh."
fi
exit $status
