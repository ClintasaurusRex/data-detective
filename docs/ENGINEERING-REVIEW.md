# Milestone 4 completion and engineering review

Reviewed 11 November 2026. Case 4 is feature-complete with its standalone Node
workflow; owner QA/approval remains pending. Cases 2–4 are queued for owner review
November 14–15, 2026 (include Case 4 if practical). Case 1 remains owner-approved;
Case 5 is not started. The historical Case 3 review follows this current review.

## Repository and scope

Started clean on `feature/milestone-4-two-exports` at `a653eed`, tracking
`origin/feature/milestone-4-two-exports` at the same commit. Verified the existing
browser implementation and read the mission contracts, docs, fixtures, checkers,
Workbench, Toolbox, runner, storage/navigation and prior exporters/tests.
Baseline `DATA_DETECTIVE_TEST_PORT=4287 npm run check` passed **611 unit tests**
and **121 Chromium tests**, lint and production build. The initial restricted
subprocess run failed 165 existing tests with empty process output; permitted
local execution passed. This was an environment boundary, not a product defect.

Implemented only the authorized Case 4 export and verification. No mission
matching rules, fixtures, earlier generators, progress IDs/schema, sandbox/CSP,
dependencies or lockfile changed. No commit, push, PR action, merge or deployment.

## Completed workflow and integrity review

The solved case and Toolbox download exactly `reconcile.mjs`, `orders.json`,
`field-reports.json`, `README.md`. The module calls the learner's actual saved
`reconcile(orders, fieldReports)` directly in a separate strict scope. It requires
only Node built-ins and has no browser adapter or automatic reference solution.
The two sample files reproduce only the displayed week. No hidden fixtures leak.
Copy to IDE continues to use the current draft and sample arrays.

```bash
node reconcile.mjs orders.json field-reports.json
node reconcile.mjs orders.json field-reports.json report.json
node reconcile.mjs another-orders.json another-fields.json weekly-report.json
```

Both sources validate before learner code loads: exact fields/types, increasing
positive safe-integer source lines, exact trimmed IDs, nonblank site, valid status
and finite nonnegative quarter hours within safe numeric range. Repeated IDs are
valid evidence; repeated source lines are invalid. Lines can overlap across files.
Empty sources are valid. No normalization/repair occurs; an optional initial BOM
is file metadata. The guide teaches Node 24 setup (select version 24.x on the
official download page), arguments, no npm dependency, both streams, exact IDs,
missingness, ambiguity, report accounting, source-team follow-up and failures.

The report validator checks every original's fields/values/source, exact pair
IDs, uniqueness/multiplicity, category eligibility, differences in site/status/hours
order, whole ambiguity groups, source/union order, exactly-once coverage and all
seven summary counts. It validates results against arbitrary input metadata,
without computing a replacement answer. Snapshots and post-serialization checks
catch mutation and misleading serialization. Bad reports are never emitted as
successful JSON. Both lexical and global console routes use stderr; stdout is
JSON only, or empty when saving/erroring. Operational failures are nonzero.

Both input files are protected using resolved paths and open-file dev/ino
identity, including aliases through symlinks and hard links. Output symlinks are
refused, including unrelated/dangling links. Input/code/result failures cannot
touch an existing output. Complete JSON is written exclusively to a private
sibling temporary directory, synced, closed, rechecked and renamed into place.
Existing output is never truncated. Handled errors clean staging files. Tests
include a real file-size-limit write failure and SIGTERM during preparation;
old output survives. This is an ordinary local-filesystem atomic rename strategy,
not a secure sandbox, external-path locking or a power-loss backup guarantee.
Replacement creates a new privately permissioned file; old metadata and other
hard links to an earlier report are not updated. Earlier runners keep their
previously documented non-atomic-write limitations.

## Verification and browser-to-Node parity

Executed on Node **v24.18.0**, npm **11.16.0**; .nvmrc's exact 24.22.1 patch
was not installed. `DATA_DETECTIVE_TEST_PORT=4287 npm run check` passed lint,
unit tests, production build and all Chromium tests on the final application code.
The final post-documentation check uses the same command. `git diff --check` passes.

| Check | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Vitest (15 files) | **802** | **0** | **0** |
| Chromium full production suite | **129** | **0** | **0** |
| WebKit 26.6 focused Case 4 suite | **39** | **0** | **0** |
| Firefox 159.0.1 native BiDi, dataset checks across Cases 1–4 | **57** | **0** | **0** |

ESLint and Vite build pass without warnings. Chromium includes all 121 baseline
and 8 new workflow tests; units include 611 baseline and 191 new real-process tests.
WebKit includes both 20-dataset downloaded-Node parity tests and all 31 existing
Case 4 tests. This is focused WebKit coverage, not its full suite. Firefox's
Playwright build is unavailable; native BiDi exercised real production workers,
all 7 + 13 + 17 + 20 dataset checks, refresh/passing-code restoration, four Toolbox
entries/new download availability, timeout, Stop and recovery. Isolation probes
received **zero HTTP/WebSocket requests**; expected CSP diagnostics were observed.
Firefox did not run Playwright download/parity tests; no such result is inferred.

Production Chromium screenshots of expanded Toolbox help at **1920×1080**,
**1366×768**, **375×740** were captured and visually inspected in /tmp. Controls,
focus outlines, text and bounded code scrolling remain usable with no page-level
horizontal overflow. WebKit layout/console assertions pass without screenshot
injection; its historical CSP screenshot limitation was not worked around by
weakening CSP. No comprehensive screen-reader/native-device claim is made.

The **191 new unit tests** execute actual generated modules as real Node processes
outside the repository, with no network setup or dependency installation. Both
correct algorithms run all 20 fixtures against independent complete expectations.
Negative checks cover both inputs, malformed/overflow data, shapes/types,
provenance, duplicate IDs/lines, empty datasets, wrong algorithms/classifications,
source swaps, missing/repeated/changed originals, difference/group/order errors,
summary, console/global logs, helper collisions, mutation, promises, thrown values,
serialization, actual permissions, paths/aliases, write failure and interruption.

Production browser tests observe actual opaque iframe/worker responses during
Check, download all four actual artifacts, then execute downloaded reconcile.mjs
in Node on all 20 datasets. Complete reports match for **both Map and independent
per-key search algorithms**, in **Chromium and WebKit**: 40 complete comparisons
per engine, 80 total. This includes every pair/original/source line, one-sided
record, field name/order, ambiguous group/order, all counts and complete occurrence
accounting. Input file bytes remain unchanged; logs do not corrupt stdout.
Saved-file output is also compared with the browser sample report.

New browser tests cover no export after Run/failed sample-hardcoding, exact
checked artifacts after draft edits/failed checks/cancellation/refresh, edits
during checking, keyboard activation/focus outlines for all four downloads and
help, instruction text/labels, and 1920/1366/375 px contained layouts. Existing
Case 4 assertions expecting zero downloads after passing were updated to four;
unsolved download assertions remain zero. One new test initially expected Case 3's
phrase “another week” instead of Case 4's “a different week”; it was corrected
without changing application feedback or relaxing solve/download assertions.
A later preflight passed 802 unit tests and 128/129 Chromium tests; its remaining
new test read an older debounced snapshot with the same draft but a prior check.
It now waits for the failed-check save explicitly before testing cancellation.

## Cross-mission review and findings

Read through all final changed source and test files, including raw bundled
runner/guide/guard boundaries. No newly confirmed Critical or High defect was
found in the existing single-tab Cases 1–4 workflows. No core-system rewrite was
needed. The new guards and atomic write strategy are part of the new feature,
not claimed as repairs to previously implemented Case 4 file downloads.

The complete Chromium regression suite exercises navigation/Back/Forward/refresh,
saved drafts and checks, last passing code, stale results, Run/Check/Stop,
mid-check mission switching, sandbox isolation/timeouts/recovery, mutation,
Copy to IDE, earlier file workflows, accessible status/error notices and storage
warnings/backups. Case 1 input-path/link overwrite and global-console corruption
regressions, and failed progress-backup preservation, still pass. Case 2/3 actual
download parity and all existing generated Node programs still pass.

| Severity | Disposition |
| --- | --- |
| Critical / High | No new confirmed existing-app defect; historical F-01/F-02/F-03 remain covered and fixed |
| Medium | B-01 remains: concurrent editing tabs write whole stale snapshots; use one active tab, no persistence redesign in this task |
| Low | F-07 fixed: final screenshot review found old Case 4 “future slice” instructions on the mission/Toolbox/empty state. Updated all three; browser assertions cover current instructions before solve and in Toolbox. |
| Low | Historical WebKit source-line omissions and full-suite clipboard/constructor harness limits remain; no CSP weakening |

The historical backlog and original reproductions remain below. No security
policy or dependency changes were necessary. A fresh vulnerability audit was not
part of this task. Native devices, real screen readers and a comprehensive
contrast/accessibility audit remain unperformed.

## Changed files

- Application: `src/App.jsx`, `src/components/ToolboxEntry.jsx`,
  `src/components/TwoExportsToolboxEntry.jsx`, `src/components/TwoExportsView.jsx`.
- Export: `src/export/twoExportsWorkflow.js`, `twoExportsContract.js`,
  `twoExportsRunner.js`, `twoExportsREADME.md` (all under src/export).
- Tests/config: `tests/unit/twoExportsWorkflow.test.js`,
  `tests/e2e/twoExportsWorkflow.spec.js`, `tests/e2e/twoExports.spec.js`,
  `eslint.config.js` (explicit globals for the bundled Node source).
- Documentation: `README.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`,
  `docs/STATUS.md`, `docs/cases/04-two-exports.md`, `docs/ENGINEERING-REVIEW.md`.

## Owner QA and remaining limits

- [ ] Cases 2/3 retain their November 14–15 owner QA checklists in STATUS.md.
- [ ] Include Case 4 if practical: lesson/prediction/hints/joins and paired-source reading.
- [ ] Trace every sample original, both totals, planned/actual differences and whole duplicate-key groups.
- [ ] Review keyboard, readable tables/help and focus on owner laptop/phone and assistive technology as available.
- [ ] Download all four files into a fresh folder, install/verify Node 24 and run print/save commands.
- [ ] Try a new valid pair, invalid inputs, output aliases, preserved old reports and error recognition.
- [ ] Confirm newer drafts and failed/cancelled checks preserve checked code through navigation/refresh.

Node runs trusted code with normal filesystem permissions, no browser timeout or
memory cap and whole-file reads. Start small. Shell redirection, malicious code,
concurrent external filesystem changes and power-loss durability are outside
runner protection. Abrupt termination can leave staging folders. Windows/network
filesystem semantics were not tested. Browser workers retain their existing lack
of a memory cap. Chromium is fully tested; focused WebKit/system Firefox evidence
is not full Safari/iOS/Firefox certification. Use one active editing tab.
Automated feature completion does not grant owner approval. Stop before Case 5.

---

# Historical Milestone 3 completion and engineering review

Reviewed 10 November 2026. Milestone 3 is feature-complete and ready for owner
QA, with approval pending. Milestone 2's owner QA remains November 14–15, 2026;
Case 3 is queued for that same period if practical. Cases 4 and 5 are unstarted.

## Scope and repository evidence

Started with a clean working tree on `feature/milestone-3-doubled-totals`, HEAD
`691f9a6a9aa156aaf36760ad13084a7a6e32d17b`, tracking
`origin/feature/milestone-3-doubled-totals`. Read the README, case contracts,
architecture, status, mission implementations, fixtures, checkers, editor,
Toolbox, exporters, storage and sandbox. The baseline suite actually passed
376 unit tests and 77 Chromium tests, lint and production build.

Completed the Case 3 file workflow without changing lesson rules, fixtures,
checkers, storage format, stable IDs, sandbox permissions or dependencies.
No commits, pushes, pull-request changes, merges or deployments were made.

## Completed Node workflow

The solved mission and Toolbox download `deduplicate.mjs`, `jobs-cleaned.json`
and `README.md`. The module contains the exact last passing learner code and
only Node built-in dependencies. Node 24 commands:

```bash
node deduplicate.mjs jobs-cleaned.json
node deduplicate.mjs jobs-cleaned.json report.json
node deduplicate.mjs another-week.json another-report.json
```

The input is a cleaned-record JSON array. Source `line` provenance, exact string
IDs, original values and ordering are preserved. Input guards reject bad data
instead of cleaning it. Report guards verify all four fields, every original
exactly once, duplicate links, whole unresolved conflicts and the reliable sum,
including after serialization. No guard produces an alternative answer.
Stdout carries JSON; both console paths and operational messages use stderr.
Missing files, malformed JSON, bad shapes/values, code errors and invalid reports
exit unsuccessfully before output is opened. The input cannot be overwritten
through the runner's output argument, including symlinks and hard links. Real
permission and output-path failures are tested. Write failures may leave an
incomplete output; users must require success before trusting it.

The guide teaches Node setup, paths, stdin-independent file reading, stdout and
stderr, trusted code, all report sections, tracing conflicts back to crews and
independently reconciling the 3.5-hour sample. Node runs with normal filesystem
permissions, without sandbox timeouts or a memory cap. No hidden fixture or
automatically supplied solution is included. Copy to IDE remains the draft's
sample-data exercise, separate from the checked file tool.

## Verification

`npm run check` passed on Node **v24.18.0**, npm **11.16.0**. `.nvmrc` names
24.22.1; that exact patch was not available or tested in this environment.

| Check | Result |
| --- | --- |
| ESLint | Pass, no warnings |
| Vitest | **500 passed**, 13 files (376 baseline + 118 new workflow + 5 Case 1 export + 1 backup regression) |
| Vite production build | Pass; JS 409.66 kB / 125.79 kB gzip |
| Playwright Chromium | **90 passed** (77 baseline + 8 workflow + 5 persistence/lifecycle) |
| Generated Case 3 Node | Both correct algorithms execute all 17 datasets; complete expected reports and original files agree |
| Actual browser-to-Node parity | **17/17 datasets for each of two correct algorithms**, field for field, in Chromium and WebKit |

Parity observes real production sandbox messages during Check solution, then
downloads the actual files and runs them in independent temporary directories
as real Node processes. It compares full reports, including originals, string
IDs, first occurrences, duplicate links, entire conflict groups, all ordering
and totals. Empty, reordered, interleaved, late-conflict, multiline-note,
leading-zero and prototype-like string key fixtures are included. No synthetic
browser evaluator replaces the worker in these parity tests.

The 118 workflow tests also cover wrong shapes/values, provenance and numeric
safety, console streams, helper-name collisions, extra/missing fields, invented,
lost and repeated originals, bad links, split conflicts, wrong ordering/totals,
mutation, promises, thrown values, serialization failures, BOM, paths with
spaces, filesystem permissions and input aliases. Old reports stay unchanged
on input, code, validation and serialization failures; invalid inputs do not
create new reports or load learner code. The two algorithms differ structurally.

Browser regressions prove Run cannot qualify an export, typed-in sample answers
fail alternative data, edits during checks do not substitute code, and failed
or cancelled checks preserve the earlier passing code. Refresh, three-mission
navigation, stale output/check notices, Stop, timeout, recovery, editor controls,
Copy to IDE and existing Case 1/2 downloads pass. Persistent state remains under
version 1. No existing assertion was weakened to hide an application failure;
old Case 3 no-download assertions were updated for the new authorized feature.

Restricted subprocess checks initially returned empty child stdout/stderr and
blocked the preview server. The same commands were rerun successfully with
permitted local-process/server access. New test corrections addressed a wrapped
README phrase and a wrong algorithm that throws before report validation. The
five Case 1 regressions failed against the previous exporter, then passed after
the fixes. No failing result is counted as a pass.

## Confirmed defects fixed

| ID | Severity | Verified failure and correction | Regression evidence |
| --- | --- | --- | --- |
| F-01 | Critical | Case 1 output could truncate its own input, including linked paths. Check resolved paths and open-file identity before clearing output. | Four real-process path/symlink/hard-link tests first failed, then passed; shared main/variation generator |
| F-02 | High | Case 1 `globalThis.console.log` polluted stdout JSON. Route global and supplied consoles to stderr. | Real generated-script regression first failed, then passed |
| F-03 | High | Failed malformed-save backup was reported as successful, and normal saving could overwrite the only unreadable original. Preserve it, disable session writes and report the backup failure honestly. | Unit and production browser backup-failure regressions |
| F-04 | Medium | Later save failures were silent. Show an accessible alert with copy/recovery guidance; clear it after a successful retry on a later edit. | Browser quota failure, mission switching, checked Toolbox preservation and recovered persistence |
| F-05 | Medium | Startup probe writes could hide readable saved work when quota was full. Read first and report actual write failures. | Browser restores saved code and Toolbox while writes throw |
| F-06 | Medium | A storage read exception was treated as an empty save. Keep the session in memory and leave existing storage alone with a notice. | Throwing-storage unit regression |

## Security review

No sandbox code or CSP was changed. Chromium's complete isolation suite still
blocks page/DOM/storage access, network probes, popups and navigation; stale
run IDs and foreign messages are ignored. Timeouts and Stop still terminate
workers, and leaving a mission invalidates pending results. A new browser test
switches through all three cases while checks run and confirms no stale solve.
Case 3 never exports an unchecked draft, and lexical helper names cannot collide
with wrapper declarations. The Node guards are integrity checks, not a sandbox
or a guarantee against malicious learner code.

Existing limits remain: workers have no browser-provided memory cap; CSP is
delivered through meta tags; the development app CSP differs for Vite hot reload.
The sandbox's CSP remains in force in development. Dependency files were not
changed; a fresh dependency vulnerability audit was outside this review.

## Additional browsers and accessibility

WebKit **26.6**, already installed, ran the same 90-test suite against the
production build: **83 passed, 7 failed**. All Case 3 file-workflow tests passed,
including both complete 17-dataset parity runs. The failures are:

- Four clipboard tests cannot grant the driver's unsupported `clipboard-write`
  permission. The selected-text clipboard fallback test passes. Native clipboard
  success on Safari still needs owner/device review.
- Two diagnostic assertions require Chromium-style source line details that
  WebKit omits. Errors are still shown, and separate error/recovery tests pass.
- One isolation assertion expects a network-worker constructor to throw
  synchronously. WebKit constructs an object; a separate local HTTP/WebSocket
  control probe confirms **zero requests**, with app storage unchanged. Other
  network APIs are blocked by CSP. This is not evidence of a network escape.

System Firefox **159.0.1** was exercised using its native WebDriver BiDi
connection because Playwright's patched Firefox executable is not installed.
All **7 + 13 + 17** mission datasets passed in the real opaque iframe/worker.
Refresh retained passing code; all three Toolbox entries appeared. Two-second
timeout, Stop and valid-run recovery passed. Network/DOM/storage probes received
zero HTTP/WebSocket requests, with expected CSP diagnostics. This was a targeted
probe, not the full Playwright suite or a claim of complete Firefox coverage.
No browsers or large dependencies were installed.

Production screenshots of Case 3 and the Toolbox in light/dark themes and at
1366/375/320 px were inspected. No unintended page/browser errors were observed
in normal use. Keyboard downloads, focus outlines, disclosure controls and
reduced-motion checks passed at 1920×1080, 1366×768 and 375×740. Additional
Toolbox measurements passed at 320 px and 32 px root text on a laptop viewport,
with no clipped download controls or page-level horizontal overflow. Code and
data keep their own horizontal scrolling.

Targeted automated semantics found no duplicate IDs, unnamed data-table regions,
missing captions or missing header scopes across the three missions. Editors
have visible labels and statuses have live regions. Sampled Case 3 Toolbox text
and controls met 4.5:1 (or large-text 3:1) thresholds in light and dark themes;
minimum sampled ratios were 6.18:1 and 6.98:1. This is a computed-style sample,
not a full contrast, axe, WCAG or screen-reader audit. No axe package was present;
none was added. Native mobile browsers and real assistive technology remain
owner QA work. Temporary screenshots and browser probe evidence are in `/tmp`.

## Outstanding backlog and limits

| ID | Severity | Finding and next review |
| --- | --- | --- |
| B-01 | Medium | Two active tabs save whole stale snapshots. Reproduced: tab A's saved Case 1 draft became null after tab B edited Case 3; A's draft remained in its open editor. Use one active editing tab and copy work before closing. A reliable ownership/conflict design needs separate persistence work; no ad hoc merge or format redesign was made here. |
| B-02 | Low | WebKit omits source-line details in syntax/runtime feedback. Review engine-specific diagnostics without relaxing isolation or inventing line numbers. |
| B-03 | Low | The optional WebKit suite has four unsupported clipboard-permission setups and one Chromium-specific synchronous-constructor expectation. Make cross-engine harnesses portable while retaining actual network-hit and storage assertions. |

No outstanding critical/high defect was found in the single-tab Case 3 workflow.
Output writes are not atomic; a mid-write failure may leave an incomplete report.
This is disclosed, and successful completion is required. Whole-file memory use
and trusted Node permissions are deliberate workflow limits, not production
sandbox guarantees. Concurrent-tab persistence and native-browser/manual
accessibility verification remain explicit review limits.

## Owner QA, November 14–15, 2026

Milestone 2 remains unapproved with its existing checklist in [STATUS.md](STATUS.md).
Add Case 3 to the same review period if practical:

- [ ] Review the lesson sequence, predictions, hints and explanation in one active tab.
- [ ] Trace late conflicts, exact notes/IDs and all original occurrences; explain why excluded conflicting jobs are not zero work.
- [ ] Navigate all three missions, refresh, edit checked code and confirm the Toolbox keeps the passing version.
- [ ] Exercise keyboard/focus, readable audit tables and owner phone/laptop layouts, including assistive technology as available.
- [ ] Download all three files to a fresh folder and run the print/save commands with Node 24.
- [ ] Reconcile the sample's eight originals and 3.5 reliable hours; try a new cleaned JSON file, investigate conflicts and exercise errors.
- [ ] Recheck Case 1/2 downloads and the new storage warnings before final approval.

Automated success is not owner approval. Stop at this milestone; do not begin
Cases 4 or 5 automatically.
