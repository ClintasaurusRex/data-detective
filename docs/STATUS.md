# Status

Last updated: 6 November 2026 (Milestone 2, Slice 1: the Case 2 contract, CSV parser, datasets and tests).

## Milestones

| # | Case | Status |
| --- | --- | --- |
| 1 | The Missing Jobs | **Complete** (on branch `claude/sharp-goldberg-u42b65`, not merged) |
| 2 | The Messy Export | **In progress.** Slice 1 is done on branch `claude/milestone-2-messy-export` (branched from the Milestone 1 tip, not merged). Not playable yet. |
| 3 | The Doubled Totals | Planned |
| 4 | The Two Exports | Planned |
| 5 | Your First Reporting Tool | Planned |

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

### Not done (later slices)

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
- Case list: Case 1 is playable; Cases 2–5 are shown as planned and aren't links.
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

## Known issues and limits

- Browser checks ran in **Chromium only**. Firefox and Safari are **unverified**, and sandboxed blob workers may behave differently there.
- No memory cap for learner code (browsers don't provide one). Untested: a very fast allocation loop might exhaust the tab before the 2 s timeout.
- The CSP is delivered by `<meta>`, so there's no `frame-ancestors`. The dev server omits the app page CSP; the sandbox CSP applies in development too.
- There was no automated screen-reader or contrast audit (for example, axe). Labels, roles, live regions and focus order were reviewed by hand and through role-based test selectors.
- `npm audit` reports 6 moderate advisories in ESLint's `minimatch` dependency (development only, not shipped, no fix available yet).

## Next task

**Milestone 2, Slice 2.** Wait for the owner to review Slice 1 and settle the open questions at the end of [cases/02-messy-export.md](cases/02-messy-export.md) (strict hours, and whole-file CSV failure). Then build the checker for `{ accepted, rejected }` results and the playable browser exercise, reusing the runner unchanged. After that, Slice 3 adds Copy to IDE and the Node CSV export.
