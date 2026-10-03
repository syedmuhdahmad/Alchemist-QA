#!/usr/bin/env bash
# Starts the Appium server from ./appium so it discovers the locally installed UiAutomator2 driver.
# Do not set APPIUM_HOME: with it set, Appium ignores drivers listed in package.json.
set -euo pipefail
cd "$(dirname "$0")/appium"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
exec npx appium --log-level error
