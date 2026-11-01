# Status

Last updated: 1 November 2026 (export fixes added after the first Milestone 1 commit).

## Milestones

| # | Case | Status |
| --- | --- | --- |
| 1 | The Missing Jobs | **Complete** (on branch `claude/sharp-goldberg-u42b65`, not merged) |
| 2 | The Messy Export | Planned: backlog in [PRODUCT.md](PRODUCT.md) |
| 3 | The Doubled Totals | Planned |
| 4 | The Two Exports | Planned |
| 5 | Your First Reporting Tool | Planned |

## Recent fixes

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
| `npm test` (Vitest 5) | 5 files, 58 tests passed |
| `npm run build` (Vite 8) | Pass |
| `npm run test:e2e` (Playwright 1.63, headless Chromium build 1243, production build via `vite preview`) | 16 tests passed |

What the tests cover:

- **Acceptance 1, journey:** predict, run, hints, hardcoded attempt fails, correct check passes, solved, Toolbox, download both files, run `node solve.mjs sample.json` and compare with the browser output, refresh restores everything, stale check notice, restore starter and bring back the draft.
- **Acceptance 2:** the starter returns 1 record, ignoring case returns 2, and ignoring case and spaces returns 3. Checked in the browser and in unit tests.
- **Acceptance 3:** seven alternative correct implementations pass. Hardcoded IDs, typed-in answers, picking rows by position, `includes`, mutation, changed records, IDs only, a missing return, wrong order and duplicates fail with specific feedback.
- **Acceptance 4:** syntax error (with line), thrown error (with line), wrong return type, missing function, 100,000 console lines (capped at 100), 100,000-item result, infinite loop (times out in about 2 s) and **Stop**. A valid run succeeds afterwards without reloading.
- **Acceptance 5:** fixtures unchanged after mutating code; a stopped slow run never overwrites the next result (plus unit tests for run-ID correlation and stale, foreign-origin and foreign-window replies). Learner code can't reach `document`, `window`, `parent`, `top`, `localStorage` or IndexedDB, can't navigate, and has no `window.open`. A local test server received **zero** requests from fetch, sync XHR, WebSocket, EventSource, `importScripts` or URL workers. The sandbox frame itself can't reach the parent DOM, storage or cookies, open windows or navigate the top page. The app page blocks inline scripts and string eval.
- **Acceptance 6:** reload restores draft, prediction, hints and solve. An edited draft is flagged as needing a new check, even after reload. Malformed JSON and wrong field types don't break startup. Unit tests cover storage that throws or is unavailable.
- **Acceptance 7:** generated scripts run in Node 24.22.1 (unit and browser tests). They give the same output as the transformation on all 7 datasets, save to a file, accept a byte-order mark, keep learner code with quotes, backticks and `</script>` intact, and give clear errors for a missing argument, missing file, invalid JSON, a non-array and a thrown error. Learner code is isolated in its own function: helpers named `fs`, `runScript` or `fail` work, and `console` output (top level or inside `transform`) goes to standard error, so standard output and saved files stay valid JSON. Both cases are covered by unit tests (which fail on the earlier wrapper) and by browser tests: the solutions pass all 7 checks, and their downloaded scripts print the same records as the browser. Also run once by hand with Node 22.23.4: correct output and the missing-file message.
- **Acceptance 8:** keyboard-only flow (Tab to fields, Enter to submit, Ctrl+Enter to run, Tab and Enter to check) with a 3 px solid focus outline. At 375 px wide: no horizontal scroll, Run, Check and the download buttons fit on screen, and the reduced-motion stamp has no animation. Desktop (1280 px) and phone screenshots are in [screenshots/](screenshots/).
- The development server (`npm run dev`) was also checked once: the runner works there, with no page errors.

## Known issues and limits

- Browser checks ran in **Chromium only**. Firefox and Safari are **unverified**, and sandboxed blob workers may behave differently there.
- No memory cap for learner code (browsers don't provide one). Untested: a very fast allocation loop might exhaust the tab before the 2 s timeout.
- The CSP is delivered by `<meta>`, so there's no `frame-ancestors`. The dev server omits the app page CSP; the sandbox CSP applies in development too.
- There was no automated screen-reader or contrast audit (for example, axe). Labels, roles, live regions and focus order were reviewed by hand and through role-based test selectors.
- `npm audit` reports 6 moderate advisories in ESLint's `minimatch` dependency (development only, not shipped, no fix available yet).

## Next task

**Start Milestone 2, The Messy Export.** Do it in this order:

1. Choose and add a maintained CSV parser (for example PapaParse). Write parser checks for quoted commas, newlines inside quoted fields and a byte-order mark.
2. Write the case contract: fields, which blanks are rejected, numeric conversion without blank becoming `0`, and IDs kept as strings. Write the datasets with expected accepted and rejected rows, each with a reason, in `docs/cases/02-messy-export.md`.
3. Extend the checker to compare `{ accepted, rejected }` results, reusing the runner unchanged.
4. Add the Node CSV runner export.
