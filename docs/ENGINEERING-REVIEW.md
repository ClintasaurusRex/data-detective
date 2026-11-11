# Milestone 3 completion and engineering review

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
