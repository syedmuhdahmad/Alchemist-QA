#!/usr/bin/env bash
# Runs inside the CI emulator step: start the API, install the APK, run the Maestro flows.
set -uo pipefail
root="$(cd "$(dirname "$0")/../../.." && pwd)"

node "$root/evals/apps/api/server.mjs" &
api=$!
trap 'kill $api' EXIT

adb install -r "$root/evals/apps/mobile/android/app/build/outputs/apk/release/app-release.apk" || exit 1

# A freshly booted emulator can take a while before it can reach the host at 10.0.2.2.
# The app has no retry (that is seeded defect M5), so wait here instead.
for attempt in $(seq 1 30); do
  if adb shell "toybox nc -z -w 2 10.0.2.2 3001" 2>/dev/null; then
    echo "emulator can reach the API (attempt $attempt)"
    break
  fi
  sleep 2
done

MAESTRO_CLI_NO_ANALYTICS=1 maestro test "$root/evals/spikes/mobile-e2e/maestro/"
status=$?
if [ "$status" -ne 0 ]; then
  echo "--- app log ---"
  adb logcat -d -t 400 | grep -E 'ReactNativeJS|AndroidRuntime|FATAL|com\.alchemyshop|cleartext|Cleartext' | tail -60
  echo "--- reachability ---"
  adb shell "toybox nc -z -w 2 10.0.2.2 3001; echo nc-exit=\$?"
fi
exit "$status"
