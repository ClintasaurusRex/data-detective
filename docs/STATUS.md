# Status

Last updated: 11 November 2026 (Milestone 4 standalone workflow complete; owner QA pending).

## Milestones

| # | Case | Status |
| --- | --- | --- |
| 1 | The Missing Jobs | **Complete and owner-approved** |
| 2 | The Messy Export | **Feature-complete; owner QA and final approval pending.** QA deferred to November 14–15, 2026. Checkpointed before Milestone 3. |
| 3 | The Doubled Totals | **Feature-complete**, including the standalone Node JSON tool. Ready for owner QA, queued for November 14–15, 2026 if practical; approval pending. |
| 4 | The Two Exports | **Feature-complete**, including standalone two-file Node reconciliation; owner QA/approval pending, November 14–15 if practical. |
| 5 | Your First Reporting Tool | Planned, unstarted |

## Milestone 4 standalone workflow and review (11 November 2026)

Started clean at `a653eed` on `feature/milestone-4-two-exports`, tracking the same
origin branch. Baseline passed 611 unit tests and 121 Chromium tests, lint/build.
Implemented four dependency-free downloads using the last successfully checked
solution: `reconcile.mjs`, `orders.json`, `field-reports.json`, `README.md`.

```bash
node reconcile.mjs orders.json field-reports.json
node reconcile.mjs orders.json field-reports.json report.json
node reconcile.mjs another-orders.json another-fields.json weekly-report.json
```

The direct two-array learner call is isolated from runner helper names. Both
sources validate before code loads. Exact record/data/provenance guards accept
duplicate job IDs and empty sources without cleaning. Report guards verify all
classification, original content/source roles, difference fields, whole ambiguous
groups, ordering, coverage, summary and mutation, before/after serialization.
No reference solver replaces learner results. Stdout is JSON; console/errors use
stderr. Both inputs and file-link aliases are protected. Sibling staging, sync
and rename preserve earlier output on preparation/write failures. Trust/resource,
filesystem/concurrency and power-loss limits are explicitly documented.

191 new genuine-process unit tests cover normal/error/safety behavior. Actual
browser downloads run as Node processes with complete browser-worker report
parity on all 20 datasets for each of two correct algorithms, in Chromium and
WebKit. New browser coverage checks four filenames/contents, checked-code retention
through edits/failures/cancellation/refresh, stale checks, keyboard/help/labels and
1920/1366/375 px overflow. Final application-code verification passed lint/build, **802 unit tests** in 15
files, **129 Chromium tests**, **39 focused WebKit tests** and **57 targeted
Firefox dataset checks**. Each has **0 failed / 0 skipped**. Firefox is native
BiDi rather than the full Playwright suite; timeout/Stop/recovery, refresh,
Toolbox availability and zero isolation-probe requests were verified. Expanded
production Toolbox screenshots were visually inspected at all three widths.
Final post-documentation verification repeats `DATA_DETECTIVE_TEST_PORT=4287 npm
run check`, `git diff --check`, `git status -sb`. Full evidence and the 18-file
change inventory are in ENGINEERING-REVIEW.md.

Cross-mission regression checks retain Case 1 overwrite/global-console and backup
fixes, prior exports/parity, navigation/history/refresh, storage warnings/recovery,
Run/Check/Stop/timeouts, cancellation, sandbox isolation and Copy to IDE. No new
confirmed Critical/High existing-app defect or broad refactor. Existing Medium
concurrent-tab overwrite and Low engine/harness limitations remain documented.
No mission contracts, fixtures, stable IDs/storage schema, sandbox/CSP or
dependencies changed. No commit, push, PR action, merge or deployment.

### Owner QA — Cases 2–4, November 14–15, 2026

Cases 2 and 3 remain feature-complete but unapproved. Include Case 4 if practical;
its standalone workflow is now feature-complete, with owner QA still pending.

- [ ] Review Case 4 lesson pacing, paired source tables, prediction, hints, joins and explanation.
- [ ] Trace exact IDs/source lines, every difference and whole ambiguous group; independently account for 7 orders and 6 field records.
- [ ] Test owner laptop/phone, keyboard/focus/help and assistive technology as available.
- [ ] Download four files into a fresh folder and run Node 24 print/save/new-pair commands without npm install.
- [ ] Investigate invalid data, both input overwrite aliases, old-report preservation and nonzero failures.
- [ ] Confirm checked-code persistence through draft edits, failed/cancelled checks, navigation and refresh.
- [ ] Complete the existing Case 2/3 checklists below before final approval.

Milestone 1 remains owner-approved. Milestone 5 remains unstarted. Stop after this
completion/review; owner and ChatGPT authorize the next task separately.

## Milestone 4 browser implementation (11 November 2026; historical checkpoint)

- Started clean on `feature/milestone-4-two-exports` at `f7ad801`, with no
  configured upstream. Read README, docs, all existing mission contracts,
  engineering review/backlog and the shared editor, registry, storage, exports,
  runner and checker architecture before implementation.
- Baseline verified: lint, **500 unit tests**, production build, **90 Chromium
  tests**. Restricted child processes initially failed 165 existing tests;
  permitted execution passed. The original browser harness reused Minty Notes
  on port 4173. An isolated preview passed; the harness now accepts
  `DATA_DETECTIVE_TEST_PORT` and refuses unknown-server reuse.
- Defined [the Case 4 contract](cases/04-two-exports.md) before its checker.
  `reconcile(orders, fieldReports)` receives already-parsed validated originals
  `{ line, id, site, status, hours }`. Exact string IDs match independently of
  array positions. Unique pairs agree or report exact site/status/hours
  differences; one-sided originals stay visible. A repeated key on either side
  preserves every occurrence from both sources in one ambiguous group, including
  one-sided repeats. No arbitrary matching or silent cleaning.
- Output is exactly `{ agreed, onlyOrders, onlyFieldReports, differences,
  ambiguous, summary }`; deterministic scheduling-first union order, exact field
  lists, source-scoped provenance and exactly-once accounting are enforced.
  Summary distinguishes occurrence counts from ambiguity-group counts.
- **20 frozen datasets** have explicit handwritten line/pair/field/group
  expectations and an independently implemented search-based review. Tests cover
  leading zeros, capitalization, arbitrary string keys, identical copies,
  one-/many-sided ambiguity, full empty inputs, remote counterparts, all fields,
  source order and substantially different future jobs. No hidden fixtures enter
  Copy to IDE or any learner download.
- The dedicated checker validates exact shapes/types, pairs, missingness,
  differences, ambiguity, unchanged originals, source lines, order, full coverage,
  summary and mutation. It accepts Map and nested searches. Tests reject 15
  incorrect strategies, hardcoded answers, malformed data and reports, wrong
  ordering, extra/missing fields, source swaps, lost/fabricated/doubled originals,
  input mutation and invalid summaries. Feedback names source/job/category and
  is capped rather than dumping complete hidden expected answers.
- Independently playable `#/case/two-exports` includes Sam's request, paired
  source tables, exact IDs/lines, prediction or skip, joins/Map field guide,
  progressive hints, confirmed explained solution, actual report categories,
  Run/Check/Stop, console, keyboard and existing editor controls.
- Reused runner/security policies unchanged via a scoped adapter. Review caught
  and fixed potential collisions with learner helpers named transform; tests
  verify isolation and preserved source lines. No sandbox permissions, storage
  version, earlier mission contracts or dependencies changed.
- Progress retains exact checked code through newer drafts, incorrect runs,
  failed/cancelled checks, navigation and refresh. Four-case mid-check navigation
  cannot save stale solves. Earlier saves and Toolbox downloads remain intact.
  Case 4 Toolbox retains browser code with an honest future-work note; there is
  no Node file-processing download. Copy to IDE's actual current-draft challenge
  runs both displayed arrays in a real Node process.
- Review corrected duplicate accessible region names and guarded custom table
  headings against inherited-property names in malformed learner originals. Source tables have clear
  headings, captions, scoped headers, sticky headings and bounded scrolling;
  controls remain in view at 1920, 1366 and 375 px, with no page-level overflow.
  Keyboard, reduced motion, focus, table semantics and console checks are covered.
  Focused production evidence screenshots were visually inspected at desktop,
  laptop and mobile sizes; full-page screenshots are captured in Chromium. WebKit screenshot
  capture itself injects a stylesheet blocked by CSP, reproduced independently.
  Its tests keep layout/console assertions and omit that capture step; product
  security policy was not relaxed.

### Final verification

Node **v24.18.0**, npm **11.16.0** (the .nvmrc patch 24.22.1 is not installed).
`DATA_DETECTIVE_TEST_PORT=4290 npm run check`, `git diff --check` and
`git status -sb` are the final verification commands. The port override isolates
this suite from another project's preview. Results below record the final completed verification.

| Check | Result |
| --- | --- |
| ESLint | Pass, no warnings |
| Vitest | **611 passed**, 14 files |
| Production build | Pass |
| Chromium | **121 passed**, including 31 Case 4 tests and all 90 baseline tests |
| WebKit 26.6 | **31 passed**, complete focused Case 4 suite; no full-suite WebKit claim |
| Firefox 159.0.1 via native BiDi | **57 datasets passed** (7 + 13 + 17 + 20), Case 4 refresh retained passing code, four Toolbox entries, timeout/Stop/recovery and zero isolation-probe network requests; targeted checks, not the full Playwright suite |

The first integrated run passed 610 unit tests and 113/119 Chromium tests. Five
new tests read before the debounced save completed and one used a duplicated
region label; these were corrected, without weakening save/coverage assertions.
Review added the helper-scope regression: the next full run passed **611 / 120**.
The final full run includes screenshot-harness, heading-safety and table-spacing
changes.
The initial WebKit run passed 27/30; only screenshot-induced CSP console messages
failed its three responsive tests. Native clipboard permissions, engine-specific
source positions and the URL-worker constructor limitations from the previous
engineering review remain separate historical harness/browser issues.

No regression was found in Cases 1–3, including the Case 2 six-file and Case 3
three-file workflows and browser/Node report parity. Existing backup-failure,
quota/read errors, late save warnings, recovery and sandbox isolation tests pass.
Known limits remain: concurrent tabs can overwrite whole snapshots; workers have
no memory cap; full screen-reader/native-device/contrast audits and owner QA are
not performed. No dependency audit was added; no dependencies changed. WebKit
and Firefox coverage here is not certification of native Safari/iOS or the full
Firefox Playwright suite.

### Changed files

- Missions/runner adapter: `src/missions/index.js`, `twoExports.js`,
  `twoExports.fixtures.js`, `twoExports.adapter.js` (all under `src/missions`).
- Checker: `src/checking/evaluateTwoExports.js`.
- UI: `src/App.jsx`, `src/styles.css`, `src/components/TwoExportsView.jsx`,
  `TwoExportsOutput.jsx`, `Workbench.jsx`, `ToolboxEntry.jsx`, `common.jsx`.
- Copy to IDE: `src/export/challengeFile.js`.
- Tests/config: `playwright.config.js`, `tests/support/twoExports.js`,
  `tests/unit/twoExports.test.js`, `tests/unit/doubledTotals.test.js`,
  `tests/e2e/twoExports.spec.js`, `tests/e2e/progress.spec.js`,
  `tests/e2e/journey.spec.js`, `tests/e2e/messyExport.spec.js`.
- Documentation: `README.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`,
  `docs/STATUS.md`, `docs/cases/04-two-exports.md`.

### Remaining owner work

- Milestone 2: feature-complete, QA/final approval pending for November 14–15.
- Milestone 3: feature-complete, QA/final approval pending in that review period.
- Milestone 4: browser implementation ready for owner QA after development;
  review lesson pacing, source-table reading and scrolling, prediction/hints,
  exact keys, joins, ambiguity, audit accounting, keyboard/device usability and
  saved passing code. Automated results do not imply approval.
- Milestone 4 standalone Node-file workflow: separately authorized future slice.
- Milestone 5: not started.

No commit, push, pull request, merge or deployment. Stop at this implementation.

## Milestone 3 completion and engineering review (10 November 2026)

- Verified clean `feature/milestone-3-doubled-totals` at
  `691f9a6a9aa156aaf36760ad13084a7a6e32d17b`, tracking the same origin branch.
  Baseline actually passed 376 unit and 77 Chromium tests, lint and production build.
- Completed the checked JSON-file Toolbox workflow: `deduplicate.mjs`,
  `jobs-cleaned.json`, `README.md`. No installation, external dependency or
  repository is needed to run it with Node 24. It uses exact `solved.code`,
  rejects invalid cleaned inputs and misleading reports, preserves source
  provenance and all originals, protects input paths/links, separates logs from
  JSON and leaves old output untouched on validation/execution failure.
- Both correct algorithms passed complete browser-worker-to-downloaded-Node
  report comparisons on **all 17 datasets**, in Chromium and WebKit. Real-process
  tests cover content, links, whole conflicts, ordering, coverage, exact string
  IDs, totals, input preservation, console/helper collisions and errors.
- Fixed verified Case 1 input-overwrite and global-console JSON-corruption
  defects. Five regressions first failed against the old generator and now pass.
  Both Case 1 exercises retain their download names and use the protected runner.
- Fixed invisible later storage write failures, inaccessible-read handling,
  startup quota hiding readable progress and false backup-success claims.
  Failed backups preserve the only original and keep the session in memory.
  Accessible warnings and retry recovery are covered by unit/browser regressions.
- Confirmed navigation, cancellation, stale-result/checked-code protection,
  storage version 1, editor features, Copy to IDE, Case 1/2 downloads and sandbox
  isolation. No lesson, fixture, checker, sandbox-security or dependency changes.
- Reviewed production screenshots, keyboard/focus, responsive/reduced-motion
  behavior, table semantics and sampled light/dark Toolbox contrast. Full manual
  accessibility and owner/device approval remain pending.
- New [engineering review and backlog](ENGINEERING-REVIEW.md) records severity,
  reproduction, fixes, browser evidence and limitations. Verified remaining
  **Medium** issue: concurrent tabs can overwrite saved snapshots; use one active
  editing tab pending separate persistence ownership/conflict work. **Low**:
  WebKit error-line omissions and cross-engine test-harness portability.
- No commits, pushes, PR changes, merges or deployments. Cases 4/5 unstarted.

### Completion verification

Executed on Node **v24.18.0**, npm **11.16.0**; `.nvmrc`'s exact 24.22.1 patch
was not installed. Full `npm run check` passed:

| Check | Actual result |
| --- | --- |
| ESLint | Pass, no warnings |
| Vitest | **500 passed**, 13 files |
| Production build | Pass; JavaScript 409.66 kB / 125.79 kB gzip |
| Playwright Chromium | **90 passed** |
| Extra WebKit 26.6 run | **83 passed, 7 failed**: 4 unsupported clipboard permission setups, 2 missing error-line details, 1 synchronous worker-constructor expectation |
| System Firefox 159.0.1 | All 7 + 13 + 17 mission datasets and targeted persistence, timeout, Stop, recovery and isolation probes passed via native BiDi; full Playwright Firefox unavailable |

A separate WebKit HTTP/WebSocket control probe received zero requests despite
its asynchronous URL-worker constructor behavior. Firefox network probes also
received zero requests. No browser installation or large dependency was added.
WebKit results are not claimed as a completely passing suite or native Safari
coverage. The full review explains clipboard, diagnostic, assistive-technology,
memory, write-atomicity and concurrent-tab limitations. Restricted subprocess
and server checks were rerun with permitted local access; failures were not
counted as successful checks.

Current changed files:

- Application: `src/App.jsx`, `src/storage/progress.js`,
  `src/missions/doubledTotals.js`, `src/components/DoubledTotalsView.jsx`,
  `src/components/ToolboxEntry.jsx`, `src/components/DoubledTotalsToolboxEntry.jsx`,
  `src/export/nodeScript.js`, `src/export/doubledTotalsWorkflow.js`,
  `src/export/doubledTotalsContract.js`.
- Tests: `tests/unit/doubledTotals.test.js`,
  `tests/unit/doubledTotalsWorkflow.test.js`, `tests/unit/exportScript.test.js`,
  `tests/unit/progress.test.js`, `tests/e2e/doubledTotals.spec.js`,
  `tests/e2e/doubledTotalsWorkflow.spec.js`, `tests/e2e/progress.spec.js`.
- Documentation: `README.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`,
  `docs/STATUS.md`, `docs/ENGINEERING-REVIEW.md`,
  `docs/cases/01-missing-jobs.md`, `docs/cases/03-doubled-totals.md`.

## Milestone 3 browser mission (9 November 2026; historical record)

- Initial inspection: expected branch `feature/milestone-3-doubled-totals`, clean
  working tree, HEAD `e2ed1d791d47023a01afc619d12be8e328b764c7`. Recent checkpoints
  `e2ed1d7` (Node CSV workflow pending QA) and `5c3896b` (playable Messy Export)
  contain Milestone 2's work. No checkpoint commits or branch changes were made
  by this implementation. Baseline `npm run check` passed: 289 unit tests and
  53 Chromium tests (46.5 s), lint and production build.
- Added [the explicit contract](cases/03-doubled-totals.md), 17 immutable datasets
  with handwritten answers, a dedicated behavioural checker, and Sam Okafor's
  independently playable investigation at `#/case/doubled-totals`.
- Exact string ID groups; equality compares all business fields, excluding
  provenance line. Retain the first occurrence only if all versions agree and
  link later copies. Any disagreement sends every occurrence to one conflict
  group. No arbitrary winner. Every input appears exactly once; only kept jobs
  contribute to reliable hours. Quarter-hour values need no rounding/tolerance.
- Browser mission includes evidence, raw-versus-reliable totals, optional
  prediction without answer reveal, real Run output, all-dataset checks, Stop,
  error recovery, input-mutation feedback, four hints, confirmed explained
  solution and attribution, Copy to IDE, existing editor controls and navigation.
- Reuses version-1 progress fields and stable IDs; Case 3 adds fractional-hour
  prediction validation only. Earlier missions' saves and Toolbox remain intact.
  Case 3 retains checked code on its solved panel and intentionally offers no
  file-processing download. Its Copy to IDE challenge is sample-data only.
- No dependency, CSV rule, sandbox-security, backend, Milestone 4 or Milestone 5
  changes. No commit, push, PR creation, merge or deployment.

### Milestone 3 verification

Final `npm run check` passed on Node.js v24.18.0 and npm 11.16.0 (the installed
Node differs from `.nvmrc`'s 24.22.1), with normal subprocess/local-server access:

| Check | Actual final result |
| --- | --- |
| ESLint | Pass, no warnings |
| Vitest | 12 files, **376 tests passed** (289 prior + 87 Case 3) |
| Production build | Pass; JavaScript 387.77 kB / 120.70 kB gzip |
| Playwright, Chromium | **77 tests passed**, reported duration 1.1 m (53 prior + 24 Case 3) |
| `git diff --check` | Pass |

Unit tests independently verify all 17 handwritten dataset answers, recursively
frozen evidence, exact provenance/content, ordering, classification, coverage and
quarter-hour sums. Both the lesson Map solution and an independent per-occurrence
solution pass. Deliberately wrong first/last-wins, repeated counting, status keys,
numeric IDs, conflict-as-copy, missing originals, wrong totals, line-based
equality, ignored/trimmed notes and hardcoded answers fail. Additional malformed
output tests cover duplicate accounting, links, split/unknown conflict groups,
extra/missing/changed fields, finite numeric totals and input mutation. Lifecycle
tests cover progress, cancellation, fatal and per-dataset errors.

Browser tests use the unchanged production sandbox: independent play, prediction
and skip, all 17 checks with both correct algorithms, wrong algorithms, actual
incorrect output, syntax/runtime/shape recovery, Stop on Run and Check, leaving
an active check, hints/reference confirmation and attribution, saved and stale
code, navigation/Back/Forward/refresh across all three cases, unchanged earlier
saves/Toolbox, and real Node execution of the copied sample-data challenge.
Keyboard, reduced-motion and editor-control checks passed at 1920×1080,
1366×768 and 375×740, with no page-level overflow or unintended console errors.
Local production evidence/output screenshots at 1366 and 375 px were visually
inspected; no page errors or overflow were observed. Screenshots are temporary
`/tmp` review artifacts, not repository changes.

Initial development failures were test issues: the unit execution adapter needed
to report thrown learner errors as runner results, the JSON disclosure selector
needed an exact match, and cancelled-check assertions needed the existing region
and wording. The first full integrated run passed 376 unit tests and 76/77
browser tests; the remaining old Case 1 assertion expected two playable links.
Updated it to three and reran the entire check successfully. No unresolved test
failures remain. No dependencies were installed or audited in this task.

Limits: Chromium only; Firefox/Safari, native mobile browsers, screen-reader and
contrast audits, and owner-led QA remain unperformed. Existing sandbox memory
and CSP-delivery limits are unchanged. The full Case 3 Node-file tool is deferred
by scope, not advertised as implemented.

Changed files: `src/missions/doubledTotals.js`,
`src/missions/doubledTotals.fixtures.js`, `src/missions/index.js`,
`src/checking/evaluateDoubledTotals.js`, `src/components/DoubledTotalsView.jsx`,
`src/components/DoubledTotalsOutput.jsx`, `src/components/Workbench.jsx`,
`src/App.jsx`, `src/storage/progress.js`; `tests/unit/doubledTotals.test.js`,
`tests/support/doubledTotals.js`, `tests/e2e/doubledTotals.spec.js`,
`tests/e2e/helpers.js`, `tests/e2e/journey.spec.js`, `tests/e2e/messyExport.spec.js`;
`README.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/STATUS.md`, and
`docs/cases/03-doubled-totals.md`.

## Owner QA backlog — Milestone 2, November 14–15, 2026

**Deferred; not owner-approved.** The owner postponed this review until the
weekend of November 14–15. Automated results do not substitute for manual review.

- [ ] Review Case 2's learning sequence, prediction, terminology, hints and explained solution.
- [ ] Inspect accepted/rejected feedback, unchanged originals, all reasons and file lines.
- [ ] Navigate among cases, refresh and verify saved drafts, predictions and passing code.
- [ ] Review responsive layouts and keyboard-only usability on owner devices.
- [ ] Copy to IDE, edit/run the challenge and paste the solution back for checking.
- [ ] Download all six Node CSV files into a fresh separate directory and run `npm install`.
- [ ] Run sample and another CSV, print/save JSON, inspect records/line numbers/totals, and exercise error paths.
- [ ] Perform final regression checks of Case 1, Case 2 and their Toolbox downloads before approval.

## Owner QA backlog — Milestone 3, November 14–15, 2026 if practical

**Ready for review; not owner-approved.** Automated checks do not substitute for
owner approval. Use one active editing tab while reviewing saved progress.

- [ ] Review the investigation, predictions, hints, explanation and conflict terminology.
- [ ] Inspect exact originals, leading zeros, notes, links, full conflicts and the reliable subtotal.
- [ ] Switch all three missions, refresh and confirm stale drafts preserve the earlier passing Toolbox code.
- [ ] Review keyboard/focus, audit tables, reduced motion and responsive layouts on owner devices.
- [ ] Copy to IDE, edit/run the sample challenge and paste code back for checking.
- [ ] Download the three Case 3 files to a fresh folder; run Node 24 print/save commands without npm install.
- [ ] Reconcile all eight originals and 3.5 kept hours, try another cleaned JSON file, investigate conflicts and test errors.
- [ ] Verify storage warnings and Case 1/2 download regressions before final approval.

## Milestone 2, Slice 4: Complete Node CSV workflow (9 November 2026; historical record)

- Initial inspection verified branch `claude/milestone-2-messy-export`, HEAD `30fffa06ff9e6d96356f0e13c4601f7bda2e850e`, and 19 staged files containing Slice 3. That work was preserved; no index changes, commit, push, PR, merge or deployment was performed. Slice 3's existence is confirmed; its final owner approval is not assumed.
- Added a Case 2 Toolbox entry on the mission and Toolbox pages using the last passing `solved.code`, including after failed checks, changed drafts and refresh. No storage changes. Case 1's JSON generator and both exercises remain functional; Copy to IDE remains the standalone parsed-record exercise.
- Six individual downloads: `report.mjs`, `parseCsv.mjs`, `contract.mjs`, `package.json`, `jobs-export.csv`, `README.md`. No ZIP library or new project dependencies. The parser and contract are packaged directly from maintained source with only the contract import path adjusted. The manifest pins Papa Parse 5.7.0; the learner runs `npm install` once, independently of this repository or any global packages.
- The runner reads UTF-8 CSV from its first argument, parses the entire file before executing the exact checked code, then prints accepted/rejected JSON or saves to the optional second argument. Structural errors stop with line-specific diagnostics and exit code 1, no stdout report, and no changes to an existing report. Invalid values remain the learner's rejected records. Blank-line notices, code-loading logs, function logs, global console calls and operational messages go to stderr.
- Added readable argument, missing-file, directory, permission, transform/serialization and output-failure errors. Identical resolved paths, symlinks and hard links cannot overwrite the input CSV. Existing output reports may be replaced; write failures must not be treated as successful reports.
- Instructions teach Node versus browser execution, file handles/readFile, parsing versus validation, local npm dependencies, path arguments, stdout/stderr, errors/exit codes and report verification. They explain normal filesystem permissions and trusted code, whole-file memory usage, no sandbox timeout, and offline use after installation.
- No changes to CSV rules, fixtures, parser, contract, checker, sandbox security or progress format. Case 2 has one exercise and no separate variation; no new variation or Milestone 3 work was added.

### Slice 4 validation

Full `npm run check` passed using Node.js v24.18.0 and npm 11.16.0 (the installed Node differs from `.nvmrc`'s 24.22.1):

| Check | Actual result |
| --- | --- |
| ESLint | Pass, no warnings |
| Vitest | 11 files, 289 tests passed (258 prior + 30 CSV workflow + 1 Case 1 variation export) |
| Production build | Pass; JavaScript 358.13 kB / 112.52 kB gzip |
| Playwright, Chromium | 53 tests passed in 46.3 s (48 prior + 5 CSV workflow) |
| Generated Node artifacts | Real processes passed; both print and save paths verified |
| `git diff --check` and staged diff check | Pass; original 19-file staged Slice 3 diff preserved |

Parity: the actual browser download was run against all 13 valid datasets, comparing every complete report to actual production sandbox-worker replies observed during Check solution. All agree, including original rejected values/lines, blank versus zero, string identifiers, BOM, quoted commas, escaped quotes, multiline fields and line endings. Unit tests additionally run two correct solutions through every dataset and compare fixture expectations and unchanged rejection content. Every one of the nine malformed fixtures fails before learner code runs, with no partial stdout report and an existing output report preserved. Filesystem tests exercise real read/write permission failures and input aliases. Both Case 1 main and open-jobs variation exports run as Node processes.

Browser coverage includes six filenames/contents, locked passing code after failed checks/draft edits/reload, readable instructions, keyboard activation of all downloads and the help disclosure, navigation, and no page-level horizontal overflow at 1920×1080, 1366×768 and 375×740. Existing browser journey, Copy to IDE and sandbox isolation tests pass.

Local production screenshots of expanded Toolbox instructions at 1366 and 375 px were captured and visually inspected. No page errors or page-level overflow were observed. Screenshots are temporary `/tmp` artifacts, not repository changes.

Slice 4 files: `src/export/csvWorkflow.js`, `src/components/CsvToolboxEntry.jsx`, `src/components/ToolboxEntry.jsx`, `src/components/MessyExportView.jsx`, `src/App.jsx`, `src/missions/messyExport.js`; `tests/unit/csvWorkflow.test.js`, `tests/unit/exportScript.test.js`, `tests/unit/messyExportMission.test.js`, `tests/e2e/csvWorkflow.spec.js`, `tests/e2e/messyExport.spec.js`, `tests/support/csvWorkflow.js`; `README.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/STATUS.md`, `docs/cases/02-messy-export.md`.

Environment: the initial restricted focused run suppressed child-process stdout/stderr (29 failures), matching the known environment limitation. The same generated-script suite passed all 30 tests with normal process access; the full check then passed with normal process/local-server access. Tests copy only the already-installed Papa Parse package into temporary export folders; no network install is required by tests. A fresh network `npm install` of the downloaded manifest was not performed.

Firefox, Safari, screen-reader/contrast auditing and owner-led manual QA remain unperformed. Node exports read whole files and use normal filesystem permissions without sandbox timeouts. These limits are explained to learners; no claim of final owner approval is made.

## Milestone 2, Slice 3: Playable browser mission (9 November 2026; historical record)

- Inspection found a clean working tree on the requested branch. Slice 2 was already committed as `30fffa0` (`Add milstone 2 csv validation checker`), following Slice 1 `df0e58d`. Its implementation and tests were preserved.
- Added Case 2 mission content with Priya’s request, numbered CSV/visible whitespace, parsed records, strict reporting rules, beginner JavaScript field guide, dual-count prediction or skip, four hints, explained reference solution and honest reveal attribution.
- Added static-host-friendly mission hash navigation with Back/Forward, refresh, active sidebar state and content focus. Case 1’s work and variation retain their identifiers and storage format. Cases 3–5 remain planned.
- Extended the existing workbench by output type: Case 2 uses the existing checker on all 13 valid datasets, presents actual accepted/rejected output, originals and understandable reasons, and retains JSON and console inspection. Ordinary Run cannot solve a case. Invalid shapes, syntax/runtime errors and Stop remain recoverable. Leaving a mission cancels active work.
- Case 2 persists its own draft, previous draft, prediction/skip, hint use, reveal, last completed check summary and exact passing code. Changed drafts require another check. Detailed output/check feedback remains visit-local.
- Preserved all approved editor controls. Copy to IDE exports a runnable parsed-record challenge using the displayed records, explicitly stating that it does not read CSV files. No Case 2 Toolbox download is offered; its passing code remains inspectable on the mission page.
- Malformed CSV examples run the real parser and show file-line errors with whole-file failure, distinct from rejected business records. No CSV editing/upload application was added.
- No new dependencies. CSV contract, fixture files, parser, checker, runner and sandbox boundary tests were not modified. No commit, push, PR, merge or deployment performed for Slice 3.

### Slice 3 validation

Node.js v24.18.0; npm 11.16.0 (the installed Node differs from `.nvmrc`’s 24.22.1). Final `npm run check` passed with normal child-process/local-server access:

| Check | Actual final result |
| --- | --- |
| ESLint | Pass, no warnings |
| Vitest | 10 files, 258 tests passed (248 original + 10 integration tests) |
| Production build | Pass; JavaScript 335.00 kB / 104.90 kB gzip |
| Playwright, Chromium | 48 tests passed in 39.3 s (25 existing + 23 Case 2) |
| `git diff --check` | Pass |

The new tests cover navigation/Back/Forward/refresh, preserved Case 1 progress, prediction/skip, all 13 required checking datasets, ten wrong approaches and hardcoded answers, actual wrong output, syntax/runtime/type recovery, Run and Check cancellation, hints/reference confirmation and attribution, refresh/stale code, Node execution of Copy to IDE, keyboard focus, and layouts at 1920×1080, 1366×768 and 375×740. Existing sandbox/isolation, JSON script exports and Case 1 journey tests pass unchanged in behaviour.

- The initial restricted unit run encountered the known child-process output restriction in 14 existing Node export tests; the same 248 tests passed with normal process access.
- First integrated full run: ESLint, 257 unit tests and production build passed; browser tests were 41 passed / 6 failed. All 25 original browser tests passed. New test failures were an ambiguous region selector (four), early storage read (one), and an incorrect deliberately-wrong fixture (one). Corrected these tests; all 22 focused Case 2 browser tests then passed.
- Added further coverage for all-digit numeric overflow, actual incorrect output presentation and stopping checks after that focused run; these all pass in the final full check above.
- Captured and visually inspected local production screenshots at 1366 and 375 px; no page errors or page-level horizontal overflow. Screenshots were temporary review artifacts in `/tmp`, not repository changes. Automated responsive tests also cover 1920 px, editor expansion/wrapping, contained data scrolling and control bounds.
- Chromium only. Firefox, Safari and a screen-reader/contrast audit remain unverified; the existing sandbox memory-cap and CSP delivery limits remain unchanged. Dependency audit results below are historical; no new dependency audit was performed for this integration slice.

## Milestone 2, Slice 2: Validation checker (8 November 2026; historical record)

- Added `src/checking/evaluateMessyExport.js`: compares actual `{ accepted, rejected }` output with fixture expectations, keyed by input file line. Checks structure, exact fields/types, cleaned values, finite hours, classification, reasons, record preservation, order, coverage and mutation. No production reference solution.
- Reuses Case 1 execution-error feedback. The new orchestration function accepts the existing runner callback and supports progress, cancellation and fatal-error stopping. It refuses datasets without parsed rows before invoking learner code.
- Added checker tests using all 13 valid CSV fixtures, two actual correct implementations and deliberately incorrect results/implementations. Malformed CSV remains parser-level coverage.
- Approved the existing strict hours syntax and whole-file CSV failure. Clarified that numeric conversion must be finite; a syntax-only check can accept a digit string that overflows. Existing fixtures are unchanged; supplemental tests cover overflow.
- UI, navigation, exports, sandbox and Milestone 1 checker are unchanged. No commits or pushes for Slice 2.

### Validation evidence (Slice 2)

Executed on 8 November 2026 with Node.js v24.18.0 and npm 11.16.0. Final `npm run check` passed:

| Check | Result |
| --- | --- |
| ESLint | Pass |
| Vitest | 9 files, 248 tests passed (172 existing + 76 added) |
| Production build | Pass; app bundle remains `index-CnmnYcOR.js`, 273.97 kB |
| Playwright, Chromium | All 25 existing browser tests passed |
| `git diff --check` | Pass |

The initial restricted unit run hit the known child-Node-process restriction: 14 existing export/Copy to IDE tests failed with empty output. The full suite passed when run with approved permissions outside that restriction. No dependencies were installed. The new checker is tested through simulated runner results and actual test-only learner code in Node; the existing browser suite covers the unchanged sandbox and Milestone 1, not a Case 2 UI. Firefox/Safari and hosted checks were not run.

## Milestone 2, Slice 1: The Messy Export foundation (6 November 2026)

Branch `claude/milestone-2-messy-export`, created from `claude/sharp-goldberg-u42b65` at `4789663`. PR #1 is unchanged.

### Done

- **The learning challenge and data contract**: [cases/02-messy-export.md](cases/02-messy-export.md). It covers:
  - the scenario (Priya Natarajan, Billing Coordinator, and the weekly field-work export)
  - the input format, and the `{ line, id, status, hours, notes }` rows that `transform` receives (all strings except `line`)
  - the validation rules, and the reason codes (`missing-id`, `missing-status`, `invalid-status`, `missing-hours`, `invalid-hours`), with all reasons listed in column order
  - the `{ accepted, rejected }` output contract
  - the difference between CSV errors and rejected records
  - two open questions for review
- **CSV parser**: `src/csv/parseCsv.js`, a small wrapper around **Papa Parse 5.7.0** (exact pin, MIT, no dependencies). It does syntax only and has no case rules. It:
  - uses a comma as the only delimiter
  - normalises line endings and removes a byte-order mark
  - keeps values as untouched strings
  - checks field counts and the header (blank, duplicate and required columns)
  - reports file line numbers
  - skips and reports blank lines
  - fails the whole file, with `records: null`, on any syntax error

  It isn't imported by the UI yet, so the app bundle is unchanged.
- **Contract module**: `src/missions/messyExport.contract.js`. It holds the columns, statuses, hours pattern and reason codes, plus `rowsFromCsv`, which turns a parsed export into `transform` input. It deliberately has **no validator**, because that's the learner's job.
- **Fixtures**: `src/missions/messyExport.fixtures.js`. There are 13 valid datasets, with hand-written accepted and rejected results, and 9 malformed files with their expected CSV errors. All are deep-frozen and fictional.
- **Tests** (106 new unit tests):
  - `tests/unit/csv.test.js` (25) covers the parser.
  - `tests/unit/messyExport.test.js` (81) checks every expected answer against an independent reference implementation, which exists only in the test file. It also checks invariants: each record appears exactly once, file order, text IDs, and blank hours never becoming 0.
  - It confirms that eight wrong approaches each fail at least one dataset: typed-in answers, `Number()` with and without a blank check, `parseFloat`, not trimming or not lower-casing, numeric IDs, first reason only, and dropping rejected records.
  - It confirms that malformed files stop at the CSV stage, with codes that never overlap with rejection reasons.

### Not done at Slice 1 (historical; checker completed in Slice 2)

- The Case 2 mission (request, prediction, starter code, hints, explained solution), marked playable.
- A checker for `{ accepted, rejected }` results. The current `evaluate.js` compares a list of records by ID, and it needs a sibling that compares by `line` and checks reasons, record identity and order.
- UI: showing the raw CSV and the parsed rows (with visible whitespace and line numbers), CSV error display, and reason-code wording in feedback.
- Copy to IDE and the Node CSV export (a script that reads a `.csv` file). How the exported script gets Papa Parse is still to decide: download a small folder with a `package.json` (the learner runs `npm install` once), or inline the parser into the `.mjs` file.
- Browser (Playwright) tests for Case 2.

### Validation evidence (Slice 1)

Run locally on 6 November 2026 with Node.js v24.18.0 and npm 11.16.0 (`.nvmrc` says 24.22.1; this machine has 24.18.0). `npm run check` passed:

| Check | Result |
| --- | --- |
| `npm run lint` | Pass, no warnings |
| `npm test` | 8 files, 172 tests passed (66 existing + 106 new) |
| `npm run build` | Pass. The app bundle is byte-for-byte the same as before (`index-CnmnYcOR.js`, 273.97 kB) |
| `npm run test:e2e` (Playwright 1.63, Chromium) | 25 tests passed (all Milestone 1 browser tests, unchanged) |

`npm audit --omit=dev` finds 0 vulnerabilities. Papa Parse adds no advisories. `npm audit` still reports moderate advisories in development-only ESLint dependencies (now 4).

## Milestone 1 changes

- **Full-viewport layout.** The app shell now uses the whole browser width, with modest outer padding (`clamp(0.75rem, 2vw, 2rem)`), and at least the viewport's height. On desktop (900 px and up), the case list is a compact 220 px left sidebar and the workspace fills the rest. At 1400 px and up, the request and the evidence sit side by side. Running text is capped at about 80 characters per line, so it stays readable without narrowing the workspace. Editor, results and tables use the full width. Phones keep the single-column layout. Tests: `tests/e2e/layout.spec.js`.

- **Expand editor.** Each workbench (main case and variation) has an "Expand editor" button. It gives the editor the full workbench width and a taller area (at least 28rem or 60% of the screen), with results underneath. "Restore editor size" switches back. The draft, saved progress and current results are untouched, and Run, Check solution and Stop stay available. The editor stays vertically resizable. A "Wrap long lines" checkbox changes only the display (`wrap="soft"`); the code is never changed. Tests: `tests/e2e/editor.spec.js`.
- **Copy to IDE.** Available before solving, in both workbenches. It copies a standalone `challenge.js`, built by `src/export/challengeFile.js`, containing:
  - the case and exercise title
  - the request, goal and rules as comments (the variation uses its own open-jobs content)
  - the exact sample rows
  - the current draft, or the starter code, inside a clearly marked YOUR SOLUTION section with room for helpers
  - a preview call
  - instructions to save it as `challenge.js`, run `node challenge.js`, and paste the solution section back without the sample data or preview

  It never includes the reference solution, hints or the extra check datasets. Copying runs no code and doesn't change the draft or progress. If the clipboard is blocked, the file appears in a selected, read-only text box with instructions. Tests: `tests/unit/challengeFile.test.js` and `tests/e2e/editor.spec.js`.

- Export: learner code is now isolated from the wrapper's declarations, and its console messages go to standard error so the printed result is always valid JSON. Regression tests: `tests/unit/exportScript.test.js` and `tests/e2e/export.spec.js`.

## What works (Milestone 1)

- Case 1 screen: colleague request, target, case rules, glossary, and an input table with statuses in quotes so whitespace is visible.
- Prediction before the first run. Run asks for a prediction, or a skip, first. A wrong answer gets inspection feedback, never a lockout. After a run, the result is compared with the prediction.
- A real editable code field (labelled textarea) with **Run** (also <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Enter</kbd>), **Check solution** and **Stop**. Output appears as a table plus JSON, with a bounded console and readable errors that include line numbers.
- Check solution runs the learner's actual code on 7 datasets and gives per-dataset feedback (missing, unexpected, changed, reordered, duplicated, not-records, hardcoded IDs, input mutation). Only a full pass solves the case. Changing the code afterwards shows it needs checking again.
- Three progressive hints (no penalty) and an explained solution behind a confirmation, explaining `filter`, `trim`, `toLowerCase` and immutable strings. Solving after viewing it is labelled honestly.
- Restore starter code keeps the previous draft ("Bring back my draft"), and so does putting the solution in the editor.
- A solved state with a brief "Case closed" stamp (no animation with reduced motion), and a Toolbox with the checked script as `solve.mjs`, plus `sample.json` and instructions explaining why the Node script exists.
- An "open jobs" variation with less guidance (empty starter, one hint) and its own checks and export.
- Case list at Milestone 1: Case 1 was playable; Cases 2–5 were planned. Slice 3 now makes Case 2 playable too.
- Saved locally: draft, previous draft, prediction, hint count, solution reveal and solves. Malformed or unexpected saved data is backed up and the app starts fresh with a notice.
- Sandboxed runner: an opaque-origin iframe with its own CSP, plus a fresh worker per run with a 2 s timeout, bounded output and stale-run protection. Details and limits: [ARCHITECTURE.md](ARCHITECTURE.md).

## Validation evidence

Run in the cloud session on 1 November 2026 with Node.js v24.22.1 and npm 11.19.1. `npm run check` passed: lint, then unit tests, then build, then browser tests.

| Check | Result |
| --- | --- |
| `npm run lint` (ESLint 10) | Pass, no warnings |
| `npm test` (Vitest 5) | 6 files, 66 tests passed |
| `npm run build` (Vite 8) | Pass |
| `npm run test:e2e` (Playwright 1.63, headless Chromium build 1243, production build via `vite preview`) | 25 tests passed |

What the tests cover:

- **Acceptance 1, journey:** predict, run, hints, hardcoded attempt fails, correct check passes, solved, Toolbox, download both files, run `node solve.mjs sample.json` and compare with the browser output, refresh restores everything, stale check notice, restore starter and bring back the draft.
- **Acceptance 2:** the starter returns 1 record, ignoring case returns 2, and ignoring case and spaces returns 3. Checked in the browser and in unit tests.
- **Acceptance 3:** seven alternative correct implementations pass. Hardcoded IDs, typed-in answers, picking rows by position, `includes`, mutation, changed records, IDs only, a missing return, wrong order and duplicates fail with specific feedback.
- **Acceptance 4:** syntax error (with line), thrown error (with line), wrong return type, missing function, 100,000 console lines (capped at 100), 100,000-item result, infinite loop (times out in about 2 s) and **Stop**. A valid run succeeds afterwards without reloading.
- **Acceptance 5:** fixtures unchanged after mutating code; a stopped slow run never overwrites the next result (plus unit tests for run-ID correlation and stale, foreign-origin and foreign-window replies). Learner code can't reach `document`, `window`, `parent`, `top`, `localStorage` or IndexedDB, can't navigate, and has no `window.open`. A local test server received **zero** requests from fetch, sync XHR, WebSocket, EventSource, `importScripts` or URL workers. The sandbox frame itself can't reach the parent DOM, storage or cookies, open windows or navigate the top page. The app page blocks inline scripts and string eval.
- **Acceptance 6:** reload restores draft, prediction, hints and solve. An edited draft is flagged as needing a new check, even after reload. Malformed JSON and wrong field types don't break startup. Unit tests cover storage that throws or is unavailable.
- **Acceptance 7:** generated scripts run in Node 24.22.1 (unit and browser tests). They give the same output as the transformation on all 7 datasets, save to a file, accept a byte-order mark, keep learner code with quotes, backticks and `</script>` intact, and give clear errors for a missing argument, missing file, invalid JSON, a non-array and a thrown error. Learner code is isolated in its own function: helpers named `fs`, `runScript` or `fail` work, and `console` output (top level or inside `transform`) goes to standard error, so standard output and saved files stay valid JSON. Both cases are covered by unit tests (which fail on the earlier wrapper) and by browser tests: the solutions pass all 7 checks, and their downloaded scripts print the same records as the browser. Also run once by hand with Node 22.23.4: correct output and the missing-file message.
- **Editor and Copy to IDE:** expanding keeps the draft, results and saved progress, puts results under the editor and keeps Run, Check and Stop working. Wrap doesn't change the code. The keyboard works (Space for the checkbox, Enter for buttons, focus stays on the toggle). At 375 px the controls fit with no sideways scroll. The copied file runs in Node, preserves the draft and the exact rows, and leaves runs, checks and saved data unchanged. The variation copies open-jobs content without the solution. When the clipboard is blocked, the fallback text is focused and fully selected.
- **Layout:** checked at 1920×1080, 1366×768 and 375×740. In each case:
  - the app spans the viewport width and at least its height
  - the sidebar is narrow on desktop and stacks on the phone
  - there is no page-level horizontal overflow before or after expanding the editor, wrapping lines or copying
  - Expand, Wrap, Copy to IDE, Run, Check and the download buttons fit inside the viewport
  - the expanded editor fills the workbench, with results underneath
  - vertical scrolling works, and the draft and progress survive a reload

  Screenshots: `docs/screenshots/1920-wide.png` and `1366-wide.png`.
- **Acceptance 8:** keyboard-only flow (Tab to fields, Enter to submit, Ctrl+Enter to run, Tab and Enter to check) with a 3 px solid focus outline. At 375 px wide: no horizontal scroll, Run, Check and the download buttons fit on screen, and the reduced-motion stamp has no animation. Desktop (1280 px) and phone screenshots are in [screenshots/](screenshots/).
- The development server (`npm run dev`) was also checked once: the runner works there, with no page errors.

## Known issues and limits (historical Milestone 1 review)

The current browser evidence and severity backlog are in
[ENGINEERING-REVIEW.md](ENGINEERING-REVIEW.md). The following records what had
and had not been checked at the original Milestone 1 checkpoint.

- Browser checks ran in **Chromium only**. Firefox and Safari are **unverified**, and sandboxed blob workers may behave differently there.
- No memory cap for learner code (browsers don't provide one). Untested: a very fast allocation loop might exhaust the tab before the 2 s timeout.
- The CSP is delivered by `<meta>`, so there's no `frame-ancestors`. The dev server omits the app page CSP; the sandbox CSP applies in development too.
- There was no automated screen-reader or contrast audit (for example, axe). Labels, roles, live regions and focus order were reviewed by hand and through role-based test selectors.
- `npm audit` reports 6 moderate advisories in ESLint's `minimatch` dependency (development only, not shipped, no fix available yet).

## Owner review checkpoint

Milestones 2–4 are feature-complete with their standalone Node workflows; all
three await owner QA and final approval, planned November 14–15, 2026 (Case 4 if
practical). Milestone 1 remains owner-approved. Automated checks are separate from
owner approval. Milestone 5 is not started; stop after this task.
