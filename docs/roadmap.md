# Alchemist-QA roadmap: an open-source QA company for Claude Code

## Context

The goal is a new, separate open-source project: a set of Claude Code plugins that behaves like a QA company. It takes a work item, decides what to test and how deeply, designs and automates the tests, runs them, reports defects, and says whether exit criteria are met. ISTQB syllabi are the method backbone, the roadmap.sh QA roadmap defines the breadth, and Anthropic's skill-authoring guidance defines how every skill and agent is built.

**Status:** phase 0 is complete. Phases 1 to 9 are planned. Some details changed after the Claude Code features were checked; see [claude-code-verification.md](claude-code-verification.md).

| Topic | Decision |
| --- | --- |
| Platform | Claude Code only |
| Repo | New open-source repo, `Alchemist-QA`, licensed Apache-2.0. Everything written fresh. |
| First stack | React web, and bare React Native on iOS and Android, phones and tablets |
| iOS | Android first on local emulators. iOS runs only on macOS CI runners. |
| Test basis | Work items from Azure DevOps, Jira Cloud, or GitHub Issues |
| Tools | Open source only. Nothing that needs a paid account, licence, or API key. |
| Hooks | Orchestrate the agents. Not a restriction layer. |
| Authoring | Every skill and agent follows the standard in section 9 |
| Autonomy | End state is a fully autonomous QA department, reached in measured levels. For now a human reviews everything before it is posted. |

Sources read: contents and spot sections of CTFL v4.0.1, CTAL-TAE v2.0, CT-PT 2018, CTEL-TM 2011, CT-AI v2.0; the roadmap.sh QA page; and CT-MAT 2019 (pages 1 to 41, all five chapters).

## 1. Three kinds of knowledge, kept apart

| Layer | Answers | Source | Examples |
| --- | --- | --- | --- |
| Method | How does a tester think? | ISTQB, ISO 25010, ISO 29119 | risk analysis, boundary values, exit criteria |
| Tool | How do I do it in this stack? | Tool docs | Playwright, Maestro, Jest, k6 |
| Domain | What matters in this business? | Regulation, industry practice | fintech, healthcare, e-commerce |

- A method skill never names a tool. A tool skill never teaches a technique.
- One job loads at most one method skill, one tool skill, one domain pack, and the project profile.
- `qa/profile.yaml` maps each capability (`unit-web`, `unit-mobile`, `e2e-web`, `e2e-mobile`, `load`) to a tool skill.

## 2. The company: few agents, many skills

| Agent | ISTQB role | Does | Writes |
| --- | --- | --- | --- |
| `qa-lead` | Test lead | Intake, routing, sequencing. Main thread. | Engagement state only |
| `test-analyst` | Test analyst | Reviews the test basis, analyses risk, designs conditions and cases | `qa/` documents |
| `automation-engineer` | Test automation engineer | Turns cases into unit, component, API, and e2e tests, web and mobile | Test directories |
| `failure-triager` | Tester | Runs tests, classes each failure, heals test defects, writes defect reports | Tests, `qa/defects/` |
| `test-reviewer` | Independent reviewer | Reviews testware it did not write (CTFL 1.5.3) | Nothing |
| `test-manager` | Test manager | Plans, estimates, checks exit criteria, reports | `qa/plans/`, `qa/reports/` |

Specialists, one per optional pack: `mobile-tester`, `performance-tester`, `security-tester`, `accessibility-tester`, `ai-tester`.

## 3. Routing

| Tier | Mechanism |
| --- | --- |
| 0 | Explicit commands: `/qa:onboard`, `/qa:feature`, `/qa:risk`, `/qa:design`, `/qa:automate`, `/qa:run`, `/qa:heal`, `/qa:report` |
| 1 | `UserPromptSubmit` hook, plain code. Matches keywords, paths, and work-item ids (`#67`, `AB#123`, `PROJ-45`) against `routing.yaml`. |
| 2 | `qa-lead` confirms or picks. Ambiguous: asks once when interactive, takes the lower-risk route and logs why when headless. |
| 3 | Specialist subagent with preloaded skills and a short tool list |
| 4 | Profile resolves the capability to a tool skill and the platform (web, Android, iOS, tablet) |

`routing.yaml` is the single source. The lead's table, the intake matcher, and the routing tests are generated from it.

**Risk sets depth** (CTFL 5.2):

| Risk | Techniques | Review | Devices and runs |
| --- | --- | --- | --- |
| Low | Equivalence partitions, happy path | None | Smoke, one browser, one Android phone |
| Medium | Plus boundary values, decision tables, negatives | Sampled | Regression, phone and tablet |
| High | Plus state transitions, exploratory charter, domain invariants | All, with mutation score | Full portfolio: browsers, Android, iOS, tablets, non-functional packs |

**Routes are tested.** Golden prompts with expected routes run in CI on every change to a description or to `routing.yaml`.

## 4. Hooks: orchestration

Agents do the work, skills hold the knowledge, hooks move the work between agents.

`pipelines.yaml` lists ordered stages, each with an agent, a method skill, and exit criteria checked on disk (CTFL 5.1.3). First pipeline, `feature`: intake, basis review, risk, design, automate (web and mobile in parallel), run and triage, review testware (medium risk and up), report. Others: `onboard`, `pr-review`, `regression`, `exploratory-session`, `release-readiness`.

| Hook event | Orchestration job |
| --- | --- |
| `SessionStart` | Load profile and open engagement. Tell the lead its current stage, so sessions resume. |
| `UserPromptSubmit` | Intake and routing hint. Recognise a work-item id and start a pipeline. |
| `SubagentStart` | Handoff packet: paths of the basis file, risk entry, cases, and the capability to use |
| `SubagentStop` | Run the stage's exit-criteria script. Not met: send the specialist back with what is missing. Met: advance the state. |
| `PostToolUse` | Bookkeeping: update `trace.json`, parse a finished run into `qa/runs/`, queue triage on failures |
| `Stop` | Driver: if stages remain and the autonomy level allows, continue with the next stage |
| `PreCompact` | Checkpoint the engagement |
| `SessionEnd` | Write the ledger entry, post status to the work item |

Restriction is declarative, not in hooks: agent tool lists and exit criteria. A plugin cannot ship permission rules, so `/qa:onboard` offers to add them to the project's own settings.

## 5. Intake

One work-item shape, three adapters. Each reads an item into `qa/basis/<id>.md` and writes results back.

| Source | Through | Write-back |
| --- | --- | --- |
| GitHub Issues | `gh` CLI | Comment, linked test PR, defect issues |
| Azure DevOps | `az boards` CLI or the Azure DevOps MCP server | Comment, linked PR, Bug work items |
| Jira Cloud | Cloud REST API or the Atlassian MCP server | Comment, linked PR, Bug issues |

Defects are deduplicated against open ones before filing. A work item with no acceptance criteria is flagged in the basis review, and the analyst states the assumptions it tested against. GitHub Issues comes first because the benchmark can run on it.

## 6. Tools: open source only

Rule: every default tool is open source, runs locally or on a free CI runner, and needs no paid account. The only cost of using the plugin is Claude usage. Paid services (device farms, hosted test management, hosted monitoring) are out of scope and left to community tool skills.

| Capability | Default tool |
| --- | --- |
| Unit and component, web | Vitest, React Testing Library |
| Unit and component, mobile | Jest, React Native Testing Library |
| E2E web, headless, cross-browser, tablet viewports | Playwright |
| E2E mobile | Maestro (see below) |
| API | Playwright request context, OpenAPI contract checks; Newman for teams with Postman collections |
| Load | k6 |
| Web performance | Lighthouse CI |
| Mobile performance and stress | Android SDK tools: start time, frame and memory stats, Monkey |
| Accessibility | axe-core on web; accessibility-tree checks on the emulator for mobile |
| Security | OWASP ZAP baseline, Semgrep, OSV-Scanner, Gitleaks, MobSF |
| Visual | Playwright snapshots; Maestro screenshots with a pixel diff |
| Mutation | Stryker |
| Email | Mailpit |
| Reporting | JUnit XML as the common format, Allure Report for display |
| CI | GitHub Actions first, Azure Pipelines second |

### Mobile e2e: which tool

Your criteria: fast, easy to configure in CI, no cost. CT-MAT 5.3 adds technical fit.

| | Maestro | WebdriverIO with Appium | Detox |
| --- | --- | --- | --- |
| Setup in CI | One install command, runs against a built app | Appium server plus one driver per platform | Native build and instrumentation changes inside the app |
| Changes to the app under test | None | None | Yes |
| Test format | Short YAML flows | TypeScript | JavaScript |
| Speed and stability | Fast, waits built in | Slower start, needs explicit waits | Fastest, least flaky once set up |
| Real devices | Android yes, iOS simulators only | Both | Limited |
| Cost | Free CLI | Free | Free |

**Recommendation: Maestro as the default.** It is the quickest to get green in CI, needs no change to the app (which matters, because the department never edits product code), and YAML flows are cheap for an agent to write and for a human to review. WebdriverIO with Appium is the second tool skill, for logic YAML cannot express and for real devices later. Detox is supported only where a team already has it. Phase 0 confirms this with a spike that measures setup time, run time, and flake rate on a free Linux runner.

Cost note: on GitHub Actions, Linux runners with an Android emulator and macOS runners for iOS are free for public repos. Users with private repos pay for macOS minutes, so iOS runs are opt-in in the profile.

## 7. Mobile testing from CT-MAT 2019

CT-MAT becomes the `qa-mobile` pack. Most of chapter 2 can be automated at no cost by driving the Android emulator with SDK commands (and the iOS simulator on macOS CI). Those commands ship as scripts, not as instructions.

| CT-MAT | Becomes | Free on an emulator? |
| --- | --- | --- |
| 1.1, 1.6 to 1.8 analytics, strategy, challenges, risks | `device-portfolio` skill: pick devices from market data by risk; use the multi-platform approach, never maximum coverage | Analysis only |
| 1.4, 1.5, 2.2.4 app types and architecture | Reference on React Native as a native app with a JavaScript layer; connected, partly connected, store-and-forward | Analysis only |
| 2.1.2, 2.2.5 displays, OS versions | Portfolio of emulator profiles: sizes, densities, tablets, API levels | Yes |
| 2.1.5, 2.1.6 input methods, orientation | Gesture and keyboard cases; repeated rotation with state and data kept | Yes |
| 2.1.7 interrupts | Call, SMS, standby, app switch, low memory during a flow | Yes |
| 2.1.8 permissions | Deny at install, revoke later, reduced permissions | Yes |
| 2.1.9 power | Low and dead battery states simulated; real drain is not measurable | Partly |
| 2.1.3, 2.1.4 temperature, sensors | Location yes; heat, motion, light need a real device | Mostly no: checklist for a human |
| 2.2.1 to 2.2.3 notifications, quick-access and deep links, OS preferences | Foreground and background notifications, deep links, locale, time zone, font size, dark mode, mute | Yes |
| 2.2.6 co-existence | Share and open-with flows with other apps | Partly |
| 2.3 connectivity | Offline, flight mode, slow network, switching mid-flow, clear user message | Yes; real carriers no |
| 3.1.1 installability | Install, upgrade keeping data, uninstall, reinstall, interrupted install | Yes |
| 3.1.2 stress | Monkey, low disk, low memory, poor bandwidth | Yes |
| 3.1.3 security | OWASP mobile top 10, storage and transfer encryption, into `qa-security` | Static yes |
| 3.1.4 performance | Start time and timing of key workflows, compared across builds | Yes |
| 3.1.5 usability | Heuristic and tour sessions; results are findings, not defects | Agent exploratory |
| 3.1.6 database | Local storage, sync, upload conflicts | Yes |
| 3.1.7 globalization, localization | Pseudo-strings, long translations, date and number formats | Yes |
| 3.1.8 accessibility | Platform guidelines with device accessibility settings on | Partly |
| 3.2.1 field testing | Field-test plan and checklist | No: human only |
| 3.2.2 store approval, post-release | Pre-submission checklist; install from store after release | Checklist |
| 3.3 personas, mnemonics, tours, session-based | Mobile references for `exploratory-testing`: SFiDPOT, I SLICED UP FUN, Landmark, Sabotage, Connectivity and other tours, session sheet | Agent exploratory |
| 3.4 process and approaches | Mobile additions to each pipeline stage; the test pyramid may flip | n/a |
| 4.2, 4.3 SDK tools, emulators and simulators | `scripts/device/` for both platforms; skill states what an emulator cannot prove | n/a |
| 4.4, 5.4 test labs | On-premise only: emulators plus the team's own devices over USB. Remote labs are paid, so out of scope. | n/a |
| 5.1, 5.2 automation approaches and methods | Device-based testing with object identification by `testID`; image comparison only for visual checks | n/a |

The honest limit: with no paid lab, heat, real sensors, real networks, battery drain, and field use are not tested by the department. It writes the checklist and says so in every report.

## 8. Coverage of the roadmap.sh QA roadmap

| Roadmap area | Where it lands |
| --- | --- |
| QA mindset, test oracles, prioritisation, verification and validation | `qa` method skills and the lead's principles |
| White, gray, black box | `test-design-blackbox`, `test-design-whitebox` |
| SDLC models: V, waterfall, agile, Kanban, Scrum, XP, SAFe, TDD | `lifecycle-fit` skill |
| Test cases and scenarios, test planning, manual testing | `test-design-*`, `test-planning`, `exploratory-testing` |
| Unit, integration, smoke, sanity, regression, UAT, exploratory | Run profiles in `pipelines.yaml`, `regression-selection`, `acceptance-criteria` |
| Compatibility | `device-portfolio`, `qa-visual` |
| Project management tools | Intake adapters |
| Test management tools | Testware in the repo is the test management; JUnit and Allure export. Paid tools left to the community. |
| Frontend basics: dev tools, caching, PWA, CSR and SSR, responsive | `web-platform` reference |
| Frontend automation, headless | Playwright |
| Browser add-ons such as Bug Magnet | Edge-case data lists in `exploratory-testing` |
| Backend automation | `qa-api` |
| Mobile automation | `qa-mobile` |
| Accessibility, load and performance, security | `qa-a11y`, `qa-perf`, `qa-security` |
| Email testing | `email-testing` with Mailpit |
| Reporting | `test-reporting`, `automation-reporting` |
| Monitoring and logs | `shift-right` skill reading open-source stacks (Grafana, OpenSearch); later phase |
| Version control, repo hosting, CI/CD | Git; GitHub and Azure first; a generic headless recipe for others |

## 9. Authoring standard: how every skill and agent is built

This is Anthropic's guidance applied to this project. It lives in the repo as `docs/authoring.md` and is enforced by a linter in CI.

### Progressive disclosure

| Level | Anthropic rule | Our use |
| --- | --- | --- |
| 1. Frontmatter, always loaded | The description is the trigger, not documentation | Written as "Use when ... Not for ...". No two descriptions overlap. It is the routing surface, so routing tests cover it. A skill that is preloaded into a specialist cannot be hidden from the listing, so descriptions are kept short: the linter caps them at 500 characters. |
| 2. `SKILL.md`, loaded on match | Under 500 lines; table of contents and primary directive | Target under 200. Fixed shape: purpose, inputs, procedure, checklist, gotchas, pointers to references and scripts. |
| 3. References, loaded on demand | Read only when `SKILL.md` points to them | One technique or one platform per file: `boundary-values.md`, `android.md`, `ios.md`, `tablet.md`. |

### Degrees of freedom

Every skill declares its level. The level decides how it is written.

| Freedom | Written as | Our skills |
| --- | --- | --- |
| High | Goals and boundaries in plain text | Basis review, risk analysis, failure triage, exploratory sessions, refactoring page and screen objects |
| Medium | A template with allowed variations | Test cases, test plans, defect reports, completion reports, scaffolding a spec or a flow |
| Low | Exact scripts, parameters fixed | Running suites, booting emulators, building the app, simulating interrupts and network, parsing results, updating `trace.json`, checking exit criteria, writing back to trackers |

### Folder rules

```text
skills/<name>/
  SKILL.md
  references/   one level deep, every file linked directly from SKILL.md
  scripts/      executed, never read into context; only output costs tokens
  templates/    output shapes for medium-freedom skills
  evals/        cases for this skill
```

- No reference links to another reference.
- Any reference over 100 lines starts with a contents list.
- Hooks and skills call the same scripts, so orchestration and instructions cannot drift apart.

### Instruction rules

- **Gotchas section in every tool skill.** It records mistakes Claude actually makes in this stack. Each confirmed mistake from evals or triage adds one entry and one eval case. Teams add their own in `qa/gotchas.md`.
- **Self-verifying checklist in every stage skill.** It mirrors the stage's exit criteria. The agent ticks it and runs the check script; on failure it loops back. The `SubagentStop` hook runs the same script.
- **Do not state the obvious.** Skills hold only our conventions and deviations. No syllabus summaries.
- **Dependencies are explicit.** Each tool skill has an `ensure-deps` script. `/qa:onboard` runs them all and reports what is missing. Nothing assumes Java, the Android SDK, or an emulator exists.

### Priority hierarchy

Claude resolves skills as enterprise, then personal, then project, with plugin skills last. For an open-source plugin this is useful:

- Our skills never override a team's own.
- A team customises by writing a project skill in `.claude/skills` and pointing a profile capability at it. No fork needed.
- An organisation can enforce a compliance domain pack through managed settings.

### Agent rules

- One role per agent. Its description says when the lead should delegate to it.
- The shortest tool list that lets it do its job, and a model tier chosen per role.
- A short body: role, inputs (the handoff packet), output files, exit criteria, what to return.
- Returns file paths and a five-line summary, never file contents, so the lead's context stays small.
- No knowledge in agent files. Knowledge goes in skills.
- Stateless: everything it needs is in the packet and on disk.
- No agent starts another agent. Only the lead delegates. Claude Code allows nesting, so specialists leave `Agent` out of their tool list.
- Every agent has eval cases.

## 10. Skill catalogue from the syllabi

**CTFL v4.0.1 (`qa`):** `test-basis-review` (3, 4.5), `risk-analysis` (5.2), `test-design-blackbox` (4.2), `test-design-whitebox` (4.3), `exploratory-testing` (4.4), `acceptance-criteria` (4.5), `test-planning` (5.1), `regression-selection` (2.2.3, 2.3), `failure-triage` (1.2.3), `defect-reporting` (5.5), `test-reporting` (5.3), `traceability` (1.4.4).

**CTAL-TAE v2.0:** `automation-assessment` (2), `automation-architecture` (3), `ci-pipeline-testing` (5), `automation-reporting` (6), `automation-verification` (7), `automation-maintenance` (4.3, 8).

**CT-MAT 2019 (`qa-mobile`):** see section 7.

**CT-PT (`qa-perf`):** `perf-objectives` (3.2, 4.1), `load-profile-design` (4.2.3 to 4.2.5), `perf-scripting` (4.2.6, 4.2.7), `perf-analysis` (2, 4.4).

**CT-AI v2.0 (`qa-ai`):** `ai-acceptance-criteria` (2), `llm-testing` (4.1.3, 4.2.1), `red-teaming` (4.2.2), `input-data-testing` (5), `model-testing` (6).

**CTEL-TM:** `test-strategy` (2), `estimation` (6.2), `stakeholder-reporting` (7), `process-metrics` (9), `retrospective` (9.4). Chapters 3 and 5 (managing human teams) do not become skills.

**Domain packs:** risk catalogue, invariants, checklist, test data rules, regulation notes. First: SaaS, e-commerce, fintech, healthcare.

## 11. Testware

```text
qa/
  profile.yaml      stack, capabilities, device portfolio, environments, tracker, autonomy level
  gotchas.md        this team's own gotchas
  strategy.md       risk-register.md
  basis/  plans/  conditions/  cases/  charters/
  runs/  defects/  reports/
  trace.json        work item -> risk -> condition -> case -> test -> result
  state/            engagement ledger
```

## 12. Autonomy ladder

| Level | What runs without a human | Unlocked by |
| --- | --- | --- |
| L0 Assist | One job per prompt | Phase 1 |
| L1 Workflow | `feature` pipeline in one session | Full trace on the benchmark with no human edits |
| L2 PR reviewer | Per pull request: select, run, triage, comment, open a test PR | False-defect and flake rates under threshold |
| L3 Scheduled | Nightly regression, weekly exploratory, defect filing, weekly report | Detection over threshold for 4 weeks |
| L4 Ticket-driven | Picks up labelled work items, evaluates release exit criteria | L3 stable, budgets and audit log in place |

Human at every level: the release decision, authorising security and load targets, changing policy and budgets. The department never edits product code.

**For now: human review first.** The department runs at L1 at most. It prepares tests, defect reports, and comments, and a person reviews them before anything is posted to a pull request or a tracker. L2 and above are built behind that gate and stay switched off until you decide otherwise. A cost ceiling for autonomous pull-request review is set at that point, not before.

## 13. QA for the QA company

Seeded-defect detection on benchmark apps, false defect rate, mutation score, routing accuracy, flake rate, cost per pipeline, and unit tests on every hook and script. Run in CI on every change and across model versions. Published as a scorecard.

## 14. Repo layout

```text
.claude-plugin/marketplace.json
plugins/
  qa/           agents, method skills, hooks, routing.yaml, pipelines.yaml
  qa-intake/    GitHub Issues, Azure DevOps, Jira
  qa-web/       Vitest, Playwright
  qa-mobile/    Jest and RNTL, Maestro, WebdriverIO with Appium, device scripts
  qa-api/  qa-perf/  qa-security/  qa-a11y/  qa-visual/  qa-ai/
  qa-domain-*/
evals/          benchmark web app, React Native app, shared API; routing set; scorecard
docs/           authoring.md, roadmap
tools/          lint-skills
```

## 15. Phases

| Phase | Size | Contents | Done when |
| --- | --- | --- | --- |
| 0 Foundations | S | New `Alchemist-QA` repo with the Apache-2.0 licence and a NOTICE file carrying the ISTQB acknowledgement. `docs/authoring.md` and the skill linter. Verify Claude Code features against current docs. Schemas for routing, pipelines, profile, basis, trace. Benchmark apps with 10 seeded defects each. Mobile tool spike on Android. | A lint-clean empty plugin installs from the marketplace; benchmark apps run on Linux; the spike has numbers |
| 1 Method and staff | L | Twelve CTFL skills, six agents, testware contract, `/qa:onboard`, unit and component tool skills for web and mobile, GitHub Issues intake | One issue goes to a report with a full trace at unit level |
| 2 Orchestration and scorecard | M | Hooks, pipeline engine, exit-criteria scripts, routing manifest and tests, seeded-defect and mutation scoring | `feature` pipeline finishes unattended (L1); routing at 95%; scorecard published |
| 3 Automation engineering | L | CTAL-TAE skills, Playwright, Maestro on Android, device scripts, device portfolio with tablets, `qa-api`, flaky handling, regression selection | E2E tests on web and Android find their seeded defects |
| 4 Mobile depth | M | Rest of CT-MAT: interrupts, permissions, connectivity, installability, stress, localization, mobile exploratory tours, store and field checklists | Each automatable CT-MAT row in section 7 finds a seeded defect |
| 5 Intake and CI | M | Azure DevOps and Jira adapters, GitHub Actions and Azure Pipelines recipes, iOS on macOS runners, `pr-review` pipeline with a human approval step before posting | A pull request is reviewed headless on web, Android, and iOS in each tracker, and the results are posted once a person approves them |
| 6 Non-functional | L | `qa-perf`, `qa-a11y`, `qa-security`, `qa-visual` | Each pack finds its seeded defects |
| 7 Management and L3 | M | Management skills, reports, email testing, scheduled runs, learning loop into gotchas and the risk register, `shift-right` | L3 for four weeks with no false release verdict |
| 8 AI testing | M | `qa-ai`, applied to our own routing and hooks | A model upgrade is accepted or rejected from the scorecard |
| 9 Domains and L4 | L | Domain pack template and four packs, WebdriverIO with Appium for real devices, ticket-driven autonomy, contribution guide | An outside contributor ships a pack from the template alone |

## 16. What is missing

**Knowledge.** CTAL-TA and CTAL-TTA first (deeper design techniques), then CTAL-TM v3.0, CT-SEC, CT-TAS, CT-GenAI, CT-UT. Outside ISTQB: ISO 25010, ISO 29119, OWASP WSTG, ASVS and MASVS, WCAG 2.2, and the Android and iOS platform guidelines CT-MAT points to.

**Product.**

- Real devices. Section 7 lists what emulators cannot prove.
- iOS feedback is slow because it is CI only, and React Native builds need caching.
- Test environments, test accounts, and seeded data for the apps under test.
- Tracker credentials for headless runs, and a safe way for users to supply them.
- The backend. Only the front ends are named, so API testing is black-box for now.
- CT-MAT is from 2019. Foldables, newer permission models, and current store rules need to be added from platform docs.

**Governance.**

- Copyright. CT-MAT, CT-PT, and CTEL-TM allow extracts and derivative writings with acknowledgement. CTFL, CTAL-TAE, and CT-AI allow extracts for non-commercial use only. Skills are written in our own words with section citations and an acknowledgement, and no PDFs go in the repo. Worth confirming with ISTQB.
- Trademark. "Aligned with the ISTQB syllabi", never "ISTQB certified".
- Cost controls for autonomous runs, needed before L2 is switched on.

**Verified in phase 0.** The Claude Code behaviour this design relies on was checked against current documentation; see [claude-code-verification.md](claude-code-verification.md). The mobile tool comparison in section 6 was measured; see [spikes/mobile-e2e.md](spikes/mobile-e2e.md).

## 17. Settled questions

| Question | Answer |
| --- | --- |
| Project and repo name | Alchemist-QA |
| Licence | Apache-2.0 |
| Jira | Jira Cloud for now. Data Center is left to a community adapter. |
| Cost ceiling for autonomous pull-request review | Not needed yet. Human review only for now; see section 12. |

## Next step

Phase 1: the CTFL method skills, the six core agents, the testware contract, and `/qa:onboard`.
