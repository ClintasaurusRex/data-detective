# Milestone 5 Slice 3 — final independent engineering audit

Reviewed **11 November 2026**. **Technically ready for owner-led QA within the
operating boundaries below.** Five confirmed defects were corrected. No unresolved
Critical/High application defect was found after remediation. This is not owner
acceptance or a claim of full native-browser/accessibility certification.
Case 1 remains owner-approved; **Cases 2–5 remain unapproved**. Start owner QA on
November 14–15, initially Cases 2–4, then Case 5 as practical. Use
[OWNER-QA.md](OWNER-QA.md) for the practical checklist and four separate decisions.
No further development begins automatically.

## Repository, environment and baseline

- Branch: `feature/milestone-5-reporting-tool`.
- Starting HEAD: `6009d91968ecc77d6a316665b59353cd060b3b0a` (`6009d91`).
- Upstream: `origin/feature/milestone-5-reporting-tool`; local refs were equal,
  working tree clean. No remote fetch or Git mutation was needed.
- Linux x86_64; **Node v24.18.0, npm 11.16.0**. `.nvmrc` specifies **24.22.1**;
  that exact patch was unavailable and remains an owner-environment check.
- Chromium **153.0.8010.12**, installed Playwright WebKit **26.6**, native Firefox
  **159.0.1** through WebDriver BiDi. Playwright's patched Firefox is absent.
- Baseline: lint, **1,213/1,213 units in 17 files**, production build and
  **156/156 Chromium tests** passed on isolated port **4287**.
- The first restricted baseline had 664 child-process-related unit failures with
  empty stdout/stderr. Repeating the unchanged command with normal local process
  and loopback access passed. This was an execution boundary, not a product fix.

## Risk-led investigation and independent methods

Read README, PRODUCT, ARCHITECTURE, STATUS, prior engineering evidence and all
five contracts before implementation. Inspected actual mission definitions,
starters/hints/explanations, frozen fixtures, expected answers, checkers/adapters,
all export generators and runtime guards, progress validation/recovery, shared
Workbench/Toolbox/download/copy code, navigation, ErrorBoundary, worker/host,
app-side runner, CSP build plugin and existing unit/browser coverage.

Priority order was saved-work loss; sandbox/lifecycle boundaries; correctness on
new inputs and standalone report/file integrity; rendered accessibility/layout;
then performance, maintainability and educational consistency. Historical results
were independently rerun. Separate adversarial probes used real same-origin tabs,
actual passing browser checks, genuine downloaded artifacts and normal Node
processes outside the repository. New unit and production-browser regressions
cover the confirmed gaps. No approved business rule was changed.

Additional handwritten Case 3–5 probes combined cases rather than deriving an
oracle from a production solver: interleaved duplicates and late conflicts with
exact notes/IDs; two-source ambiguity plus unique/missing/differing pairs; and a
year-0001 weekly report with nonnumeric source order, cleaned copies, exact hundredths
of an hour, ordered multi-field rejections and a cross-period conflict. Five full
reports matched handwritten evidence across the lesson/independent algorithms
and runtime guards. No defect was found in these Case 3–5 probes.

## Confirmed and fixed defects

### A-01 / existing B-01 — High: concurrent tabs erase checked progress

**Reproduction:** open Tab A on Case 2 and Tab B on Case 5 at the same origin.
Pass/save Case 2 in A, then edit/save Case 5 in B. A's persisted draft and
`solved.code` became null. Closing A then flushed its old snapshot, restored
Case 2 and erased B's Case 5 draft. Separate simultaneous same-exercise edits
retained only the last writer; refresh loaded that winner without a warning.

**Expected:** another tab must not silently replace saved progress or checked
code. **Root cause:** every mounted app loaded its own whole snapshot and wrote
it after debounce and on pagehide, including otherwise stale tabs. The previous
Medium backlog classification is raised to High here because loss includes
verified downloadable solutions and work across unrelated cases.

**Fix:** `ProgressSession` acquires an exclusive, document-lifetime Web Lock
before App mounts or recovery can write. A secondary tab has an explanatory
warning and Retry, with no editor, initial save, backup or pagehide writer. Retry
reloads the latest snapshot after ownership is available. Closing/unloading the
owner releases the browser-managed lock; its pagehide flush runs while ownership
is held. A restored history document reloads before writes resume. Error reset
also requires ownership. Missing/rejected lock access allows reading saved work
and memory-only learning, with a persistent warning and no storage/backup/reset
writes. No schema, stable ID, timestamp lease, check-and-set race or merge.

**Regression:** real browser tabs cover different-case checked-code retention,
blocked retry/refresh/close, simultaneous startup on one exercise, immediate
close before debounce, handoff, history navigation, unavailable/rejected locks,
unreadable originals/previous backups, and existing quota/read/backup recovery.
Chromium and WebKit pass; targeted native Firefox verifies exclusion and close
handoff with checked-code retention.

**Limits:** this coordinates participating documents in one browser storage
partition, not old loaded builds, arbitrary same-origin scripts, other profiles
or browsers. **Close all old Data Detective tabs before adopting this build.**
Localhost/HTTPS is needed for Web Locks. Failed writes and browser termination
remain best effort; copy unsaved work when warned. Shared simultaneous editing
is deliberately unavailable rather than merged.

An additional isolated Chromium probe exhausted real localStorage quota
(5,111,808 filler characters before QuotaExceededError). Reload retained readable
progress; a subsequent larger draft failed visibly without replacing the old
save. Removing the filler and editing again restored saving and cleared the
warning. The development server also passed Run, StrictMode ownership and close
handoff. These are independent probes, outside the framework-test counts below.

### A-02 — High: Case 1 can approve and export incorrect status filtering

**Reproduction:** `startsWith("complete")` passed every original checking dataset.
Its genuine downloaded script accepted `{id:"NEW",status:"Completed"}` on a new
valid file and exited 0. The contract requires exact normalized `complete`.
**Root cause:** the near-match fixtures lacked a prefix extension, while the Node
wrapper accepted any returned value without report verification.

**Fix:** add `Completed`/`Opening` to an existing checking dataset, keeping all
check IDs/counts and expected matching IDs. Both exports embed maintained guards
for unique string IDs/string statuses, exact complete/open selection, original
content, order, result type and net mutation. Validate before and after JSON
serialization, before emitting output; load code only after input validation.
The exercise supplies its explicit matchWord and checked code remains verbatim.

**Regression:** browser prefix rejection/download gating; real-process wrong
status, malformed sources, missing/extra/changed/repeated output, Promise/undefined,
mutation and custom serialization refusals. Earlier output survives validation
failure. Both exercises retain correct Node output, console separation and input
path/symlink/hard-link protection. Case 1's approval history is unchanged; these
were previously uncovered correctness gaps, now fixed.

### A-03 — High: Case 2 can save overflowed hours as successful null values

**Reproduction:** remove only the finite-number check from an otherwise correct
solution. It passed the original 13 browser datasets. On a new CSV with 400-digit
hours, its actual download exited 0, emitted `accepted.hours: null` (Infinity's
JSON representation), and replaced an existing report with that invalid result.
**Root cause:** overflow existed only in supplemental tests, outside the actual
mission datasets; the Node wrapper checked only two array fields.

**Fix:** add overflow at file line 20 to the existing hours dataset, still 13
checks. Embed runtime report guards for exact fields, cleaning, finite hours,
classification, ordered reasons, original preservation, order and exactly-once
accounting. Snapshot input and validate before/after serialization. Refuse a
wrong answer without supplying or repairing one; no numeric business rule changes.

**Regression:** browser overflow rejection/download gating; actual generated
processes reject overflow, dropped/repeated/reordered originals, bad cleaned
values/reasons, mutation and misleading serialization before opening output.
Existing parser, nine malformed-file fixtures, complete parity, console and file
alias/permission checks still pass. Six download files and pinned dependency stay
unchanged in shape.

### A-04 — Medium: a successfully saved long draft disappears on refresh

**Reproduction:** paste/save a 50,026-character draft; localStorage contained it.
Refresh silently restored the 85-character starter, with no warning. **Root
cause:** the editor/writer accepted arbitrary draft text but the loader discarded
all code strings above its 50,000-character execution cap.

**Fix:** preserve draft/previousDraft strings independently of the checked-code
cap. Warn in the editor when the draft exceeds the execution limit without
truncating it. Quota failures still produce the existing save warning. No storage
shape or runner limit changes. **Regression:** real save/refresh, starter restore,
refresh and bring-back are lossless; a unit checks long drafts and rejects
oversized purported checked code.

### A-05 — Medium: serialized result-type mismatch breaks Run feedback

**Reproduction:** return an array with `toJSON() { return null; }`. The worker
reported array, transport decoded null, and Workbench accessed `.length`, causing
an unhandled page error and stale “Running your code…” feedback. **Root cause:**
normalization trusted the pre-serialization result type.

**Fix:** compare decoded JSON type with the reported type; show an inspectable
result error when they differ. Preserve actual JSON for debugging. **Regression:**
unit array/object/number conversions and a production-browser null-array run,
zero page errors and successful next Run. No CSP or isolation permission changed.

## Sandbox/security and lifecycle conclusions

The opaque-origin iframe still has only `allow-scripts`, no same-origin,
top-navigation or popup permission. App CSP disallows inline/eval execution and
app workers; sandbox CSP confines workers to blob URLs and blocks network APIs.
Actual Chromium controls confirm zero HTTP/WebSocket probe hits, inaccessible
DOM/storage, no popup/navigation, and independent app/sandbox CSP enforcement.
The host accepts requests only from its parent and validates shapes/code/time
limits; worker replies need both run ID and random nonce. A new test injects the
correct ID with a wrong nonce into a real host worker event and confirms rejection.
The app checks frame window, null origin and current run ID. Cancellation, late
replies, timeout/Stop, syntax/runtime recovery, mission/exercise switching and
stale-check protection pass. Invalid results remain inspectable, not substituted.

Console and returned-JSON limits remain in force. No code ran on the app thread;
no sandbox security policy was weakened. Workers still have **no hard memory
cap**; rapid allocation/OOM was not stress-tested. Meta CSP lacks response-header
capabilities such as frame-ancestors. Dev app CSP intentionally differs for Vite
hot reload; sandbox CSP still applies. This is a local learning tool, not anti-cheat
or a service for running hostile third-party code.

## All five mission and Node workflow conclusions

| Case | Independent conclusion and actual execution |
| --- | --- |
| 1 | Exact normalized status/original preservation checked; prefix gap fixed. Main seven and variation eight generated-Node datasets pass; genuine downloaded sample reports match browser output, including helper/logging variants. |
| 2 | CSV syntax remains separate from field validation. BOM, quotes, multiline/blank lines and physical provenance preserved; blank differs from zero; overflow gap fixed. All 13 full downloaded-Node/browser reports agree in Chromium and WebKit; nine malformed files refuse partial output. |
| 3 | Exact IDs/all business fields, whole late conflicts, first-occurrence links, every original and reliable quarter-hour totals agree. Two algorithms × 17 complete downloaded-Node/browser reports pass per tested Playwright engine. |
| 4 | Exact two-source joins, missingness, all differences, whole-key ambiguity, source provenance, union ordering and accounting agree. Two algorithms × 20 complete downloaded-Node/browser reports pass per tested Playwright engine. |
| 5 | Ordered cleaning/rejections, whole-ID conflicts, entry/job identity, inclusive Gregorian dates, safe hundredths, exclusions, groups/distinct jobs and full audits agree. Both algorithms for both independently saved exercises compare 28 valid full reports per combination per engine; invalid periods are refused separately. |

Across Chromium, WebKit and native Firefox, Case 5 again has **336 complete
valid-report comparisons** and **48 separate invalid-period refusals**. Native
Firefox additionally passes the other 65 exercise-check scenarios, for **193
scenario executions total**. These are not 193 Playwright tests or full Firefox
certification. Native Firefox's new run did not repeat the network-probe server
suite; current full network-isolation evidence is Chromium.

All five standalone workflows execute actual generated/downloaded artifacts in
fresh directories as normal Node processes. Checked code survives newer drafts,
failed/stopped checks, edits during checking, refresh/navigation and Case 5
main/variation switching. Copy to IDE retains current-draft/sample semantics.
No hidden fixture or automatic reference solution leaks in downloads. Logs use
stderr; stdout contains only validated JSON on success. Cases 1/2 now have report
integrity checks as well as Cases 3–5. Runtime guards refuse bad results, not
replace them with expected output. Source files remain byte-for-byte unchanged.

Resolved-path and open-file identity checks still protect inputs through symlinks
and hard links. Invalid input/code/reports and pre-write failures preserve earlier
reports; actual permission/file-size/interruption tests retain their guarantees.
**Cases 1–3 output writes remain non-atomic** and can leave incomplete output after
mid-write failure. Cases 4–5 stage, sync, recheck and rename; power loss, externally
concurrent path changes, parent-directory durability and platform/network-filesystem
behavior are not guaranteed. Abrupt termination can leave temporary staging folders.

The freshly downloaded Case 2 six-file package also completed its own
`npm install --ignore-scripts --no-fund --no-audit` outside the repository, then
print/save commands with byte-identical complete reports. npm may use its cache;
this proves ordinary independent installation, not a forced uncached-network test.
Only Papa Parse 5.7.0 is required. No project dependency/lockfile was changed.

**Separate threat models:** file guards prevent accidental runner output onto an
input. Arbitrary downloaded learner code has normal filesystem/network/process
permissions and can bypass them by writing directly. Node has no browser sandbox,
timeout or memory cap and reads whole files. Instructions explicitly require
trusted code, small files and successful exit status; no stronger security claim.

## Accessibility, usability and educational review

All five rendered production missions were exercised at **1920, 1366 and 375 px**:
no page-level horizontal overflow, essential controls within horizontal bounds,
unique IDs and captioned/scoped tables. Tables/code retain their own scrolling.
Viewport screenshots of desktop/phone requests, paired tables, laptop/phone
editor/focus and long audit output were visually inspected. One immediate-scroll
screenshot omitted a sticky header during painting; a stable follow-up displayed
all headings at their measured positions. No reproducible table-header defect.

Full Chromium and focused WebKit retain keyboard activation, skip/content focus,
Back/Forward, editor expansion/wrapping, Copy to IDE fallback/selection, hint
confirmation/return focus, download/help controls, status/error feedback and
reduced motion. New storage warnings explain ownership and memory-only operation.
Normal-use independent probes logged **zero page or console errors**. Semantic
checks and headless keyboard tests do not establish native screen-reader behavior.
No axe package was available; no major accessibility dependency was added. Actual
screen readers, full contrast/forced-colors review and native phone/Safari/iOS
remain owner QA.

The progression filtering → CSV validation → duplicates/conflicts → two-source
matching → end-to-end reporting is coherent in source and actual behavior.
Starters intentionally expose less scaffolding over time; hints and solutions
remain optional/attributed. Feedback retains wrong output for debugging. Additional
near-match/overflow data now test transferable rules rather than accidental fixture
coverage. The capstone's variation changes dates/sites/exclusions and requires a
full independent audit despite a coincidentally equal grand total. No lesson rewrite.
Owner review should judge Case 5's substantial contract length, hint usefulness,
long audit navigation and the phone case-list footprint rather than infer enjoyment
or difficulty from automated success.

## Performance, dependencies and maintainability

Baseline JS: **541.49 kB / 162.54 kB gzip**. Final JS:
**550.93 kB / 165.07 kB gzip**; CSS **12.89 / 3.65 kB**. Vite's >500 kB advisory
remains visible. The roughly 9.44 kB increase supplies the scoped ownership and
integrity protections; no warning threshold was raised.

An instrumented temporary build confirmed one eager registry imports all cases,
fixtures, optional solution material, checkers, guides and export-source strings.
They could be loaded per case/Toolbox, but no unexpected duplicate React/Papa Parse
runtime or new dependency was found. Raw maintained-source strings for independent
exports are intentional. Module rendered lengths are pre-minification diagnostics,
not an exact attribution of compressed network cost.

Three independent cache-disabled localhost Chromium loads reached the editor in
**108–121 ms**. With **150 ms latency, 1.6 Mbit/s download and 4× CPU throttling**,
three loads reached it in **1,427–1,450 ms**. These are synthetic editor-ready timings,
not real-device or runner-ready certification. A 700-item preview rendered only
200 audit disclosures in **61 ms**, with no observed >50 ms main-thread long task
in that sample. Actual results remain bounded by 200,000 transport characters.
No measured blocking/loading problem justified a lazy-loading refactor. Future
chunking could reduce first-case payload but needs a separate measured change;
saved progress must still be validated against the complete catalogue.

A fresh npm audit reports **four moderate development-only package findings**,
all from **minimatch 10.2.6**, via ESLint/config-array and its dependents
([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)).
`npm ls`/`npm explain` confirm the path. `npm audit --omit=dev` reports **zero**.
The current major-10 ranges cannot take the advisory's 11.0.1 fix; npm suggests
major tooling changes. Leave this as a bounded tooling risk for a separate
compatible dependency review; no force upgrade, override or dependency churn.

## Executed integration verification and remaining limits

Final required commands: `DATA_DETECTIVE_TEST_PORT=4295 npm run check`,
`git diff --check`, `git status -sb`. Production tests refuse unknown-server reuse.
Independent preview used **4293**; targeted Chromium used **4294**. No test used
another application's port 4173.

| Check | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| ESLint | pass | 0 | 0 |
| Vitest, 17 files | **1240** | 0 | 0 |
| Production build | pass, existing size advisory | 0 | 0 |
| Full Chromium suite | **167** | 0 | 0 |
| Focused WebKit | **71** | 0 | 0 |
| Native Firefox targeted exercise scenarios | **193** | 0 | 0 |

1240 = 1213 baseline + 27 focused regressions. 167 = 156 baseline + 11 browser
regressions. WebKit explicitly selects all workflow files, Case 5, progress,
ownership, contract regressions and supported runner cases; it excludes clipboard
permission success, Chromium-specific source-line assertions and the synchronous
URL-worker constructor assumption at selection time. Nothing excluded is reported
passed. Its frame/app CSP tests, timeout/Stop/recovery, wrong-nonce test and new
serialization recovery run. The full native Firefox suite remains unavailable.

Failing-first evidence includes the genuine downloaded Case 1/2 probes and two
new multi-tab browser regressions against the old app. Focused unit corrections
fixed an `it.each` array-argument fixture shape; the final assertion checks the
intended malformed array. Native Firefox harness corrections scoped the Check
button to its own exercise and awaited Retry navigation before closing the owner;
initial harness failures are not counted as passing product evidence. An optional
screenshot montage failed because Pillow is absent; individual images were
inspected directly. No assertions, sandbox policies or business rules were relaxed.

Remaining limits: development-only advisory, bundle advisory, unavailable exact
Node patch, old-build tabs outside the lock protocol, best-effort shutdown/quota,
no worker memory cap, trusted/whole-file Node execution, earlier non-atomic output,
platform/filesystem durability, focused cross-browser coverage and unperformed
native assistive-technology/device/contrast QA. These do not block owner-led QA
for this local fictional-data learning application. Broader release approval is
**pending owner decisions for each of Cases 2–5**.

## Change inventory and approval boundary

Application/storage: App, main, ErrorBoundary, new ProgressSession, Workbench,
ToolboxEntry and progress validation. Integrity: new missingJobsContract and
csvReportContract, older Node/CSV generators and runner result normalization.
Fixtures: two existing datasets extended without changing contracts or check IDs.
Tests: new concurrentProgress/auditContracts browser files; focused progress,
runner, export, CSV and evaluator regressions. Documentation: README, PRODUCT,
ARCHITECTURE, STATUS, this review, Cases 1/2/5 and new OWNER-QA checklist.

Exact changed/new files (33):

```text
README.md
docs/ARCHITECTURE.md
docs/ENGINEERING-REVIEW.md
docs/OWNER-QA.md
docs/PRODUCT.md
docs/STATUS.md
docs/cases/01-missing-jobs.md
docs/cases/02-messy-export.md
docs/cases/05-first-reporting-tool.md
src/App.jsx
src/ErrorBoundary.jsx
src/components/ProgressSession.jsx
src/components/ToolboxEntry.jsx
src/components/Workbench.jsx
src/export/csvReportContract.js
src/export/csvWorkflow.js
src/export/missingJobsContract.js
src/export/nodeScript.js
src/main.jsx
src/missions/messyExport.fixtures.js
src/missions/missingJobs.fixtures.js
src/runner/sandboxRunner.js
src/storage/progress.js
tests/e2e/auditContracts.spec.js
tests/e2e/concurrentProgress.spec.js
tests/e2e/progress.spec.js
tests/e2e/runner.spec.js
tests/unit/csvWorkflow.test.js
tests/unit/evaluate.test.js
tests/unit/evaluateMessyExport.test.js
tests/unit/exportScript.test.js
tests/unit/progress.test.js
tests/unit/sandboxRunner.test.js
```

Historical reviews follow unchanged as historical evidence. No existing work was
discarded. **No commit, push, merge, deployment or pull-request creation/modification
occurred.** No sixth mission, backend, authentication, runtime AI, redesign, new
runtime dependency or pending-case owner approval was introduced. Stop after this
audit and owner handoff.

---

# Historical Milestone 5 Slice 2 implementation and focused engineering review

Reviewed 11 November 2026. Case 5 is feature-complete through Slice 2, including
both independent exercises and their complete standalone Node workflow. Owner
QA/approval is pending. Case 1 remains owner-approved; Cases 2–4 remain
feature-complete but unapproved, with November 14–15, 2026 owner QA retained.
Final Slice 3 application-wide audit has not begun. Earlier reviews below are
historical checkpoints, including their then-current authorization limits.

## Scope, repository and baseline

Started clean at 6dc9d3c55073bde42c20d5ec545c9a5c41b1e76b on
feature/milestone-5-reporting-tool, tracking the same origin branch. Inspected
README/docs and the full Case 5 contract, both exercises/progress records,
fixtures, independent algorithms/checker/adapter, previous Node generators and
tests, Toolbox/file utilities, sandbox, storage and engineering backlog. Baseline
passed lint, 904 unit tests, production build and 145 Chromium tests. The initial
restricted subprocess run failed 355 existing tests; permitted execution passed.
This execution boundary is not represented as a product defect or a passing run.

No lesson business rules, fixture expectations, shared browser runner, sandbox
CSP, progress schema, stable exercise IDs, dependencies or lockfile changed.
No commits, pushes, merges, deployments or pull-request actions occurred.

## Implementation and review

Both first-reporting-tool and first-reporting-tool-transfer export exactly:
weekly-report.mjs, orders.json, entries.json, period.json, README.md. The samples
and period are their own displayed values; only the exact saved solved.code is
embedded. The script invokes buildWeeklyReport(rawOrders, rawEntries, period)
directly in a strict scope, independent of helper-name collisions and the browser
adapter. Both lexical/global console routes use stderr. There are no npm/runtime
external dependencies, hidden fixture datasets or automatic reference solution.
A fresh folder with Node 24 is sufficient:

```bash
node weekly-report.mjs orders.json entries.json period.json
node weekly-report.mjs orders.json entries.json period.json report.json
node weekly-report.mjs another-orders.json another-entries.json another-period.json weekly-report.json
```

Structural guards check valid JSON, exact source fields/types, unique positive
safe-integer source lines and exact period start/end string fields. Order is
preserved without requiring increasing lines; provenance is source-scoped. Empty
arrays and repeated business IDs are valid. Blank/malformed business values are
passed unchanged to the learner. Invalid period values also invoke the learner:
the required Error is checked, never substituted for a wrong return or throw.
Snapshots catch net input mutation, including before an expected period error.

Report guards validate every nested field/type and original audit item in source
order, recomputing cleaning/reason facts with UTC calendar round-trips and BigInt
hundredths. This independent recomputation is necessary for arbitrary local data,
not a preprocessing step that takes over the learner's validation. Metadata over
verified cleaned audit items checks whole-ID conflicts, complete occurrence
membership, first-copy links and matching/date disposition precedence. Verified
included audit evidence supplies group memberships, exact sums and distinct-job
sets. Count vectors, all totals, order references, period consistency and UTF-16
group ordering reconcile completely. Unsafe reportable sums are refused. No
validator assembles a replacement report, repairs output or uses fixture answers.
Checks before/after serialization reject misleading toJSON results; mutation is
also checked after preparation. Incorrect output produces only a diagnostic and
nonzero status, with no successful report.

nodeFileIO.js extracts the existing Case 4 reader/diagnostics/staged writer for
both workflows. Read validation is a callback; otherwise the protection pattern
is retained. Resolved paths and open-file dev/ino protect ALL three Case 5 inputs,
including symlink/hard-link aliases. Output symlinks/nonregular destinations are
refused. A private sibling folder holds complete JSON, exclusively written,
synced/closed, destination-checked again and renamed. Existing output survives
preparation failures; handled errors remove staging. Real permission, file-size
limit mid-write failure and SIGTERM during preparation tests preserve old reports
and original inputs. Case 4's complete process tests and downloaded parity pass.

Toolbox uses existing styling and download conventions. Both exercise titles are
clear, with own checked source, five labelled keyboard buttons, operating/audit
instructions and download status. Preparation errors offer focused, fully selected
manual-save text and retry. Main and variation remain independent through drafts,
failed/cancelled checks, edits during checking, refresh and navigation. Run alone
and sample-hardcoding never qualify downloads. Copy to IDE remains the current
draft/sample challenge. The beginner guide explains files/paths/JSON, period
rules, cleaning versus validation, entry IDs versus jobs, conflicts for human
review, integer units, overlapping job counts, rejected/excluded investigation,
count reconciliation, stdout/stderr, new weeks, errors and trusted Node code.

Focused source/test/documentation review found no confirmed Critical/High
existing-app regression or missing contract invariant. All incorrect-evidence
and file-safety probes refuse output. No unrelated infrastructure redesign was
needed. Slice 2 replaces the prior future-work placeholders consistently. Test
corrections fixed aliased corruption fixtures (now separate from mutation) and a
Firefox refresh expectation left pointing at the earlier algorithm; no failing
product behavior was hidden by changing an assertion or security policy.

## Executed verification

Node v24.18.0, npm 11.16.0; .nvmrc's exact v24.22.1 was unavailable and untested.
Final commands after implementation and documentation:
DATA_DETECTIVE_TEST_PORT=4291 npm run check; git diff --check; git status -sb.

| Check | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| ESLint | pass | 0 | 0 |
| Vitest, 17 files | 1213 | 0 | 0 |
| Production build | pass, chunk-size advisory | 0 | 0 |
| Full Chromium production suite | 156 | 0 | 0 |
| Focused WebKit: Case 5 plus Case 4 workflow regressions | 34 | 0 | 0 |
| Firefox 159.0.1 native BiDi scenario executions | 128 | 0 | 0 |

1213 units = 904 baseline + 309 new real-process workflow tests. 156 Chromium
checks = 145 baseline + 11 new workflow tests. WebKit explicitly selects 15
existing Case 5 tests, all 11 new workflow tests and eight Case 4 workflow tests;
the unsupported clipboard-success test is excluded by selection, not reported
passed or silently skipped. No CSP weakening. Full-suite historical WebKit
clipboard/diagnostic/constructor limits remain below.

Genuine downloaded files run as real Node processes outside the repository.
For EACH engine (Chromium, WebKit, native Firefox):

| Exercise / algorithm | Complete valid-report comparisons | Invalid-period refusals |
| --- | ---: | ---: |
| Main / lesson Map | 28 | 4 |
| Main / independent searches | 28 | 4 |
| Variation / lesson Map | 28 | 4 |
| Variation / independent searches | 28 | 4 |
| Per-engine total | 112 | 16 |

That is 336 complete valid comparisons and 48 separate error scenarios across
three engines. Comparisons include every original, audit item, cleaned value,
ordered reason, conflict/duplicate/link decision, date/matching exclusion,
summary group/order, count and fixed decimal value. They compare to actual opaque
production-worker replies and independent handwritten expectations, not just totals
or a simulated worker. Every input file remains byte-for-byte unchanged. Invalid
periods return nonzero, no stdout report and leave an existing report untouched;
they are not valid-report parity. Native Firefox uses actual browser downloads
saved to an isolated folder and also checks refresh, two Toolbox entries,
timeout, Stop and valid-run recovery, with zero page errors. Its Playwright build
is not installed, so this is targeted BiDi coverage, not its full suite.

New adversarial tests cover malformed envelopes/missing/extra fields, wrong types,
duplicate source lines versus legitimate IDs, blank/malformed business values,
explicit zero, decimal precision/range, Gregorian/century dates, empty sources,
other weeks, sample hardcoding, helper/console collisions, mutation, thrown values,
promises, serialization, missing/fabricated/reordered audit evidence, cleaning and
reason errors, wrong duplicate/order links, conflict precedence/counting, incorrect
groups/totals/distinct jobs, three-input direct/resolved/symlink/hard-link overwrite
attempts, symlinked inputs, dangling output links, actual permissions, interrupted
preparation and mid-write filesystem failure. Existing output survives failures.

The full Chromium suite retains prior navigation/history/refresh, per-exercise
progress, storage failure/backup/recovery, Workbench Run/Check/Stop, timeout,
cancellation, mid-check mission switching, sandbox isolation, mutation, Copy to
IDE, checked-code preservation, Cases 1–4 actual downloads/parity and earlier
input-overwrite/global-console fixes. New keyboard/fallback/help/status and layout
checks pass at 1920, 1366 and 375 px without page-level overflow or unintended
console errors. Production Toolbox screenshots at these widths were reviewed.
Focused browser logs, screenshots and Firefox probe/results remain temporary
review artifacts in /tmp; repeatable Chromium/WebKit tests are in the repository.

## Risks, remaining work and owner checkpoint

- Critical/High: none newly confirmed in this focused review.
- Medium, existing B-01: concurrent tabs can overwrite whole progress snapshots;
  use one active editing tab. Persistence redesign stays outside Slice 2.
- Low: the production main bundle remains above Vite's 500 kB advisory threshold
  (541.49 kB before gzip). No advisory suppression or unrelated chunking work.
- Low: existing browser-specific source diagnostics and full-suite harness limits
  remain. Full screen-reader, native-device and comprehensive contrast review
  are unperformed; automated keyboard/layout checks do not grant owner approval.
- Explicit operating limits: trusted code has normal filesystem/network/process
  permissions, no sandbox timeout/memory cap and whole-file reads. Direct learner
  writes, shell redirection, external concurrent filesystem modification and
  power loss are outside runner protection. Parent directories are not synced.
  Abrupt interruption may leave staging directories. Output replacement changes
  permissions/metadata; Windows/network filesystem semantics were not tested.

Final Slice 3 remains separate: authorize the application-wide final audit,
reconcile all milestone evidence/backlog, perform owner/device/accessibility QA
and decide any broader remediation in its own scope. This session stops after
Slice 2. Case 5 is feature-complete and ready for owner QA; it is not owner-approved.
Cases 2–4 retain their November 14–15, 2026 QA schedule and pending approvals.

## Changed files (21)

- Application: src/App.jsx; src/components/ReportingView.jsx, ToolboxEntry.jsx,
  ReportingToolboxEntry.jsx.
- Export: src/export/firstReportingToolWorkflow.js, firstReportingToolContract.js,
  firstReportingToolRunner.js, firstReportingToolREADME.md, nodeFileIO.js,
  twoExportsRunner.js, twoExportsWorkflow.js.
- Tests/config: tests/unit/firstReportingToolWorkflow.test.js;
  tests/e2e/firstReportingToolWorkflow.spec.js, firstReportingTool.spec.js;
  eslint.config.js.
- Documentation: README.md; docs/PRODUCT.md, ARCHITECTURE.md, STATUS.md,
  ENGINEERING-REVIEW.md; docs/cases/05-first-reporting-tool.md.

---

# Milestone 5 Slice 1 implementation and engineering review

Reviewed 11 November 2026. Case 5's browser capstone and independent variation
are implemented, with owner QA/approval pending. Production Node file reading,
file guards/downloads and later slices were not implemented. Cases 2–4 remain
unapproved with owner QA planned November 14–15; Case 1 remains approved.
The Milestone 4 and earlier reviews below are historical checkpoints.

## Repository and baseline

Started clean on `feature/milestone-5-reporting-tool`, HEAD
`d2b29cc37e3a4c0e8eaeefa85459f5b06bc68067`, matching the requested base, with
no configured upstream. Read the README, docs, all four prior mission contracts,
roadmap, last engineering review and known limitations; inspected mission
registration, adapters, checkers, Workbench, outputs, runner/security, progress,
Toolbox and Copy to IDE. Baseline actually passed lint, **802 unit tests**,
production build and **129 Chromium tests**. Restricted subprocess execution
initially returned empty child output and could not start the preview; permitted
local execution passed. No baseline failure is represented as a passing check.

## Contract and implementation

Defined [the complete contract](cases/05-first-reporting-tool.md) before the
checker. `buildWeeklyReport(rawOrders, rawEntries, period)` receives parsed
string records and creates a weekly report with daily/site groups, fixed decimal
hours, distinct jobs/entries, explicit count vectors and two occurrence audits.

The contract specifies trimming without losing IDs or meaningful site text,
all validation reasons in field order, real Gregorian dates (including century
leaps), strict/inclusive valid periods, exact decimal syntax, integer hundredths,
validation before grouping, whole-export conflict detection before period
filtering, first-copy provenance, exact job matching and completed-work rules.
Each original remains unchanged in one audit item, with separate cleaned content,
reasons, disposition and applicable links. Dispositions are mutually exclusive;
valid overlaps them and conflictGroups counts unique IDs rather than occurrences.
Group ordering uses exact JavaScript string order. Work orders have no date.

32 recursively frozen datasets record handwritten cleaned values, decisions,
reasons, links, group rows/totals and count vectors: **28 complete reports and
four invalid-period errors**. Factories attach source records and field names,
without solving the pipeline. The behavioural checker compares exact structure,
types, content, order and evidence; it runs no reference solver and checks no
source patterns. Numerical totals alone cannot pass. Feedback names report
paths/source lines/categories without dumping hidden expected reports.

Two independently structured algorithms verify every handwritten expectation:
the optional lesson solution uses Map grouping and arithmetic Gregorian dates;
the test-only alternative uses per-occurrence searches, UTC date round-trips and
BigInt decimal parsing. Both run in genuine production browser workers, not a
simulated browser evaluator. Unit tests reject 12 wrong strategies, hardcoded
sample output and 37 report corruptions (including apparently correct totals
with incorrect audit evidence), malformed results, mutation, and lifecycle errors.

`ReportingView` provides Sam's request, two source tables, period, notebook,
contract, field guide, prediction or skip, shared Workbench, progressive hints
and confirmed explained solution. Output renders actual returned values only:
daily/site groups, grand totals, audit counts and expandable original/cleaned
records, reasons, dispositions and links. Malformed outputs remain inspectable
without crashing, including object-valued disposition fields.

The independent future-week handover starts with less scaffolding, changed
sites/dates/exclusions and a conflict straddling its period. Its numerical total
coincidentally equals the main week's total while all the underlying evidence
differs. It has a stable separate exercise ID, draft, hints, reveal attribution,
checks and last passing code. Both challenges are accessible independently.

The three-input adapter reuses the existing array-only sandbox and protects
learner helper names and source-line diagnostics. Review found that the shared
worker only reports mutation after successful returns. The Case 5 adapter also
snapshots data around thrown exceptions so mutation before an expected
invalid-period error fails checking. No sandbox/worker/CSP, storage schema,
dependency, earlier mission contract or prior standalone generator changes.

Copy to IDE copies only the active sample, period, contract and current draft,
with a direct buildWeeklyReport preview. Genuine copied files run in real Node
processes, but do not read production files. Toolbox retains each exact last
passing browser solution without downloads. Only all-scenario success updates
that exercise's solved.code; failed/cancelled checks, drafts, refresh, challenge
switching and navigation cannot substitute a different code version.

## Verification

Executed with Node **v24.18.0**, npm **11.16.0**. `.nvmrc`'s exact 24.22.1
patch is not installed and was not tested. Final full command:
`DATA_DETECTIVE_TEST_PORT=4287 npm run check`.

| Check | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| ESLint | pass | 0 | 0 |
| Vitest, 16 files | **904** | **0** | **0** |
| Production Vite build | pass, advisory below | 0 | 0 |
| Full Chromium production suite | **145** | **0** | **0** |
| Focused Case 5 WebKit | **15** | **0** | **0** |
| Firefox 159.0.1 native BiDi scenario executions | **96** | **0** | **0** |

Chromium includes the 129 baseline checks and 16 capstone checks. Units include
802 baseline + 102 new tests. The existing planned-case/registry assertions in
three tests were updated for five playable cases; earlier contract assertions
were not weakened. Full Chromium retains all prior actual-download Node parity,
input-file protection, progress storage warnings/backups, navigation, keyboard,
CSP/network isolation, timeout/Stop and error-recovery checks.

Focused Chromium/WebKit tests compare both algorithms' complete 32-scenario
worker results to handwritten expectations; invalid periods require an error,
not a report. They also exercise prediction without answer reveal, inspectable
audit records, multiple malformed shapes, source/period mutation, error source
lines where supplied by the engine, timeout/Stop/check cancellation, switching
challenges during a check, stale checked-code retention, edits during checking,
separate main/variation storage, restore/reveal attribution, Toolbox boundaries,
Copy to IDE and responsive editor controls. Calendar scenarios pass in both
America/Vancouver and Asia/Tokyo timezones. WebKit's unsupported clipboard
permission-grant test is explicitly excluded; its fallback-copy tests execute
both active samples as real Node processes. Chromium also tests clipboard
success without running code or creating a solve. WebKit is focused coverage,
not full-suite Safari/iOS certification.

Firefox native BiDi matched complete outputs on main/Map, main/independent and
variation/Map: 32 scenarios each, including 28 complete reports and four period
errors per run. Refresh preserved separate passing tools; timeout, Stop and
valid-run recovery passed, with zero page errors logged. This is targeted
system Firefox coverage, not the unavailable Playwright Firefox suite or a new
Firefox network-isolation audit. Current full isolation evidence is Chromium's
regression suite; earlier Firefox evidence remains historical.

Production screenshots at 1920, 1366 and 375 px were captured. Phone/laptop
viewport screenshots were visually inspected; controls, tables, audit disclosures
and editor fit their containers. Keyboard/editor/reduced-motion and no-page-
overflow assertions pass at all three widths. Full screen-reader/native-device,
contrast and comprehensive accessibility audits remain unperformed.

Two test-harness corrections were made without relaxing product checks: progress
polls now wait for the debounced save even when no snapshot exists yet; separate
engine runs use isolated artifact directories. An initial simultaneous run
collided in Playwright's test-results directory, causing ENOENT trace failures
in four Chromium tests; the final full Chromium rerun passes all 145. The first
WebKit run exposed three null-snapshot polling errors; its final focused rerun
passes. No failed run is counted as success. A mutation-regression assertion
initially assigned blank to an already-blank period, which was not a change;
the test now assigns a distinct value and correctly verifies all four errors.

## Remaining limits and owner checkpoint

- **Low:** bundled case/check content takes the main JS to **512.71 kB**, **153.95
  kB gzip**, triggering Vite's >500 kB advisory. Build succeeds; no warning was
  suppressed. Mission chunking can be considered separately if load size matters.
- **Medium, pre-existing B-01:** concurrent editing tabs can overwrite saved
  snapshots. Use one active editing tab; no persistence redesign in Slice 1.
- Browser workers still have no memory cap. Existing engine-specific diagnostics,
  meta CSP and full-suite WebKit harness limits remain below.
- Owner review is needed for capstone pacing, contract complexity, independent
  transfer, actual device/accessibility use and confidence explaining audit
  decisions. Automated success is separate from owner approval.
- Slice 2 remains unauthorized: no production Node file workflow/downloads.

Changed files comprise the new mission/fixtures/solution/adapter, checker,
ReportingView/ReportingOutput, unit/browser/support tests and Case 5 contract;
additive registry/App/Workbench/Toolbox/Copy-to-IDE integration; three existing
registry assertions; README, PRODUCT, ARCHITECTURE, STATUS and this report, plus
a current Case 5 cross-reference in the Case 4 contract.
`git diff --check` passes. Branch/HEAD remain unchanged. No commits, pushes,
PR changes, merges or deployments were performed.

---

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
