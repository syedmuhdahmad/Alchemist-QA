# Spike: which tool for mobile end-to-end tests

**Question.** Maestro, WebdriverIO with Appium, or Detox: which is fast, easy to set up in CI, and free?

**Answer.** Maestro stays the default because it was the easiest to set up and its flows are the shortest to write and review. It was not the fastest: WebdriverIO with Appium ran the same flows in about half the time. Both were free and neither failed once in 30 flow runs. Appium moves up from "later" to a first-class second tool in phase 3.

Measured on 2026-10-03.

## What was run

Three flows against the benchmark app's release APK (`evals/apps/mobile`), written once for each tool:

1. Add a product twice, open the cart, check quantity, subtotal, and shipping.
2. Add a product, enter promo code `SAVE10`, check the discount.
3. Add two products, check out with name, email, and postcode, check the order is placed.

The flows avoid the seeded defects, so a failure would be flakiness, not a finding. Flows are in `evals/spikes/mobile-e2e/`, and `measure.sh` repeats them.

| | Version |
| --- | --- |
| Maestro | 2.10.0 |
| Appium, UiAutomator2 driver, WebdriverIO | 3.8.0, 5.0.7, 9.32.0 |
| React Native | 0.87.1 |
| Local emulator | Pixel 7, Android API 37, x86_64, headless, KVM |
| Hosted runner | GitHub Actions `ubuntu-latest`, emulator API 34 |

## Results

| | Maestro | WebdriverIO with Appium |
| --- | --- | --- |
| Runs of the three flows, local | 10 | 10 |
| Flow results | 30 passed, 0 failed | 30 passed, 0 failed |
| Time per run, local | 73 to 75 s | 34 to 39 s |
| First run, local, including driver install on the device | 99 s | 63 s |
| Install | One command; 6 s on the hosted runner | `npm install`, 61 s locally, 205 MB of `node_modules` |
| Extra process to manage | None | An Appium server |
| Size of the three flows | 63 lines of YAML | 79 lines of JavaScript |
| Changes to the app under test | None | None |
| Setup problems hit | None | One: with `APPIUM_HOME` set, the server did not find the driver installed by `npm`. Fixed by leaving it unset. |
| Cost | Free | Free |

Raw numbers: `evals/spikes/mobile-e2e/results/maestro.csv` and `appium.csv`.

Most of Maestro's extra time is typing: the checkout flow, which fills three fields, took about a minute on its first run.

## On a hosted runner

The manual workflow `.github/workflows/mobile-e2e-spike.yml` builds the APK and runs the Maestro flows on a GitHub-hosted Linux runner. It is free for a public repository.

| Step | Time |
| --- | --- |
| Install JavaScript dependencies | 16 s |
| Build the release APK | 126 s |
| Install Maestro | 6 s |
| Boot the emulator | 40 s |
| Run the three flows | 71 s |
| Whole job | 7 min 31 s |

The first attempt failed: all three flows reported that the product list never appeared. The second attempt passed after the script waited before starting the flows. The likely cause is that a freshly booted emulator cannot reach the host at `10.0.2.2` straight away, and the benchmark app never retries a failed load (that is seeded defect M5). This cause is inferred, not proven: the reachability check added to the script never reported success, so it acted as a delay of a minute or two. A proper readiness check is a phase 3 task.

## Not measured

- **Detox.** It needs build and instrumentation changes inside the app under test. The department never edits product code, so Detox is only an option for a team that already has it. It was not installed or run.
- **iOS.** No macOS machine was used. Both tools support the iOS simulator; neither was tried.
- **Appium on the hosted runner.** Only Maestro was run in CI.
- **Larger suites, tablets, and real devices.** Three flows on one phone emulator is a small sample. Speed may differ with sharding and with longer flows.

## Decision

| | Decision |
| --- | --- |
| Default for `e2e-mobile` | Maestro |
| Second tool skill, phase 3 | WebdriverIO with Appium, for suites where run time matters, logic YAML cannot express, and real devices |
| Detox | Supported only where a team already uses it |
| Revisit when | The benchmark has 20 or more mobile flows, or a suite's run time becomes the bottleneck |
