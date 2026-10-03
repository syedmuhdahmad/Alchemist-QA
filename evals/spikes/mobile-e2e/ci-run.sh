#!/usr/bin/env bash
# Runs inside the CI emulator step: start the API, install the APK, run the Maestro flows.
set -euo pipefail
root="$(cd "$(dirname "$0")/../../.." && pwd)"

node "$root/evals/apps/api/server.mjs" &
api=$!
trap 'kill $api' EXIT

adb install -r "$root/evals/apps/mobile/android/app/build/outputs/apk/release/app-release.apk"
MAESTRO_CLI_NO_ANALYTICS=1 maestro test "$root/evals/spikes/mobile-e2e/maestro/"
