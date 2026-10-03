#!/usr/bin/env bash
# Usage: ./measure.sh <maestro|appium> <runs>
# Runs the three flows <runs> times and appends one CSV row per run to results/<tool>.csv:
#   run,flows_passed,flows_failed,seconds
# Needs: the emulator booted, the benchmark APK installed, the API on port 3001,
# and for appium, ./run-appium-server.sh running.
set -uo pipefail
cd "$(dirname "$0")"
tool="$1"
runs="$2"
mkdir -p results
out="results/$tool.csv"
echo "run,flows_passed,flows_failed,seconds" > "$out"

for run in $(seq 1 "$runs"); do
  start=$(date +%s)
  if [ "$tool" = maestro ]; then
    log=$(MAESTRO_CLI_NO_ANALYTICS=1 maestro test maestro/ 2>&1)
    passed=$(grep -c '^\[Passed\]' <<<"$log")
    failed=$(grep -c '^\[Failed\]' <<<"$log")
  else
    log=$(cd appium && node --test --test-concurrency=1 flows.test.mjs 2>&1)
    passed=$(grep -E '^ℹ pass ' <<<"$log" | awk '{print $3}')
    failed=$(grep -E '^ℹ fail ' <<<"$log" | awk '{print $3}')
  fi
  echo "$run,$passed,$failed,$(( $(date +%s) - start ))" >> "$out"
done
cat "$out"
