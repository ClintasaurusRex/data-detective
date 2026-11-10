# Architecture

Data Detective is a static React app (Vite, plain JavaScript). The parts are kept separate so later cases can be added without changing the runner:

| Part | Files | Job |
| --- | --- | --- |
| Missions | `src/missions/` | Case text, rules, datasets with expected IDs, hints, solutions |
| Runner | `src/runner/` | Runs learner code in isolation and returns a plain result |
| CSV | `src/csv/parseCsv.js` | Reads CSV text into string records with line numbers, using Papa Parse. Syntax only, no case rules (Milestone 2) |
| Checking | `src/checking/evaluate.js`, `src/checking/evaluateMessyExport.js`, `src/checking/evaluateDoubledTotals.js` | Case 1 compares ID lists; Case 2 compares accepted/rejected records; Case 3 checks occurrence classification, duplicate links, complete conflicts, order and totals against explicit fixture expectations |
| Storage | `src/storage/progress.js` | Saves and validates drafts and progress in `localStorage` |
| Export | `src/export/nodeScript.js`, `src/export/csvWorkflow.js`, `src/export/challengeFile.js` | Builds Case 1 JSON scripts, the standalone Case 2 CSV workflow, and the "Copy to IDE" `challenge.js` |
| UI | `src/components/`, `src/App.jsx` | React components |

## Running learner code

Learner code is run for real. There is no snippet matching or hardcoded output.

```
App page (strict CSP, no eval)
  └─ <iframe sandbox="allow-scripts" src="sandbox.html">   opaque origin, its own CSP
       └─ host script (inline, allowed by hash)
            └─ new Worker(blob:…) per run                     learner code runs here
```

1. **App side** (`src/runner/sandboxRunner.js`) keeps one hidden sandboxed iframe. Each run gets a unique run ID. Starting a new run cancels the previous one, and only a reply with the current run ID, from that iframe's window, with origin `"null"`, is accepted. Late replies from older runs are ignored. If the sandbox doesn't start, or stops answering (2 s after the run's own timeout), the iframe is replaced and the learner sees a message.
2. **Sandbox host** (`src/runner/sandbox/host.js`) validates each request (types, code length, timeout range), creates a **fresh worker for every run**, and terminates it when the run finishes, is cancelled, or passes the **2-second timeout**. Worker replies must carry a random per-run nonce. Fields are type-checked and size-capped again before being sent to the app.
3. **Worker harness** (`src/runner/sandbox/worker.js`) keeps references to built-ins before learner code runs, then compiles the code with `new Function` in strict mode and calls `transform(rows)`. It:
   - captures `console` output, capped at 100 messages, 500 characters each, 20,000 in total, and counts what was dropped
   - detects whether the input rows were changed
   - limits results to 5,000 items and 200,000 characters of JSON
   - reports errors with the learner's line number. For syntax errors, browsers don't give a position for `new Function`, so the code is parsed once more in a nested worker, which does report one.
4. The **checker** runs each dataset as a separate run, so every dataset starts from a clean global scope, and stops early when a problem would repeat for every dataset (syntax error, timeout, missing function).

`build/sandboxPage.js` (a Vite plugin) inlines the host and worker scripts into `sandbox.html`, computes the CSP hash, serves the page in development, and emits it in the build. It also adds the app page's CSP to the production `index.html`.

### Isolation boundaries

| Boundary | Mechanism |
| --- | --- |
| No access to the app's DOM | Code runs in a worker (no DOM) inside a sandboxed iframe without `allow-same-origin`, so it has an opaque origin. Cross-origin access to `parent` is blocked by the browser. |
| No access to saved progress | The opaque origin has no access to the app's `localStorage` or IndexedDB (storage access throws `SecurityError`). |
| No network requests | The sandbox CSP sets `default-src 'none'` and `connect-src 'none'`, which workers created from `blob:` URLs inherit. `fetch`, XHR, WebSocket, EventSource, `importScripts` and loading workers from URLs are all blocked. |
| No top-level navigation or new windows | The iframe sandbox omits `allow-top-navigation` and `allow-popups`. Workers have no `window` or `open`. |
| Eval only inside the sandbox | Only the sandbox CSP has `'unsafe-eval'`. The app page CSP (`script-src 'self'`) allows neither eval nor inline scripts. |
| Responsiveness and recovery | Code never runs on the app's main thread. Infinite loops are ended by terminating the worker after 2 s, or straight away with **Stop**. |
| Fixtures can't be changed | Rows are copied into the worker by `postMessage`, and the fixture objects are deep-frozen. |

`tests/e2e/runner.spec.js` checks these in Chromium against the production build. It uses a local HTTP/WebSocket server to confirm that no request from learner code arrives, that the page URL and `localStorage` are unchanged, and that no popup opens. It also probes the iframe itself (parent DOM, storage, cookies, `window.open`, top navigation) and confirms the app page blocks inline scripts and string eval while the sandbox allows eval.

### Known limitations

- **Tested only in Chromium** (Playwright 1.63, Chromium build 1243). Firefox and Safari are unverified. Blob workers inside opaque-origin iframes have historically differed between browsers. If a worker can't be created, the learner sees "Runner unavailable" rather than code running unsandboxed.
- **No memory limit.** Browsers don't offer one for workers. Code that allocates memory very quickly could exhaust the worker, or possibly the tab, before the 2-second timeout. This wasn't tested.
- **CSP is set with `<meta>` tags**, so `frame-ancestors` and reporting can't be set. A host that supports response headers could add them. The development server (`npm run dev`) omits the app page CSP because Vite's hot reload needs inline scripts; the sandbox CSP applies in development too.
- **The iframe posts results to the app with target origin `"*"`**, because an opaque origin can't name its parent's origin. Messages only contain run results. The app checks the sender's window and origin.
- **This is a local learning tool, not anti-cheat.** Learners can only affect their own checks, for example by writing code that recognises the datasets. It is not meant for running untrusted code from other people.
- **Small differences from the exported module.** Both the browser and the export run learner code as a strict-mode function body, but the export is an ES module, so `import` statements in learner code wouldn't work there. They don't work in the browser either, so such code can't pass the checks.
- **Syntax-error positions are approximate** when the problem is at the very end of the code (for example, a missing `}`). The app then says "near the end of your code".

## CSV parsing (Milestone 2)

`parseCsv` wraps Papa Parse 5.7.0 (pinned exactly, MIT, no dependencies). It runs in the app or in Node, never in the sandbox: the learner's `transform` receives already-parsed rows, so the runner and its CSP are unchanged. Case 2 uses it to prepare every valid checking dataset and to show actual parser errors for malformed-file examples; Papa Parse is included in the app bundle.

It separates **CSV errors** (broken file structure: the whole file stops, `records` is `null`) from **business rules**, which belong to each mission. It fixes the delimiter to a comma, normalises line endings first (Papa Parse would merge rows in a file mixing `\r\n` and `\n`), removes a byte-order mark, keeps every value as an untouched string, checks field counts against the header, reports file line numbers, and lists skipped blank lines. The full contract is in [cases/02-messy-export.md](cases/02-messy-export.md#csv-parsing).

Case 2’s checker is connected through the shared workbench using the exercise’s `outputKind: "accepted-rejected"`. It accepts already-parsed datasets and runner results, reuses execution-error feedback, and verifies exact fields, types, finite hours, classification, reasons, content preservation, order and exactly-once coverage by file line. It contains no reference transformation. See [the checker contract](cases/02-messy-export.md#validation-checker-slice-2).

## Saved progress

One `localStorage` key, `data-detective:v1`, holds `{ version, cases, exercises }`. Writes are debounced and also flushed on `pagehide`. When loading, every field is validated and clamped, and unknown exercises are dropped. Text that can't be parsed is copied to `data-detective:v1:unreadable` before the app starts fresh with a visible notice. If storage is unavailable, the app runs in memory and says so. A React error boundary offers a reset (with the same backup) as a last resort.

Case 1’s identifiers and save shape are preserved. Case 2 adds `cases["messy-export"].prediction` as `{ accepted, rejected }` or `{ skipped: true }`, and an exercise with the same stable ID. Its optional `checked: { code, passed }` retains the last completed check across refreshes. Draft, previous draft, hints, reference reveal and the exact passing code reuse the existing exercise fields. Detailed run output/check feedback is visit-local; after refresh a saved check summary invites checking again for full feedback.

A solve stores the exact code that passed. When the draft differs from it, the app says the code needs checking again. Both cases' Toolbox exports use `solved.code`, never the editor draft or the latest failed check. Case 2 uses the same saved fields and storage version; no migration is needed.

## Export

`buildNodeScript` places the checked code in the `.mjs` file **as code**, between two comment lines. It is never inside a string, template literal or HTML page, so quotes, backticks, `${`, `*/` and `</script>` are harmless. Files are offered as `Blob` downloads.

The learner's code sits inside its own function (`loadYourCode`), as it does in the browser runner:

- **Its names are isolated.** Helpers named `fs`, `runScript`, `fail` or anything else can't clash with the wrapper's declarations.
- **Standard output stays valid JSON.** The function receives a `console` that writes to standard error, so logging at the top level or inside `transform` still shows in the terminal but never mixes with the printed result. The wrapper's own messages ("Wrote 3 record(s)…", errors) also go to standard error. Unit tests run generated scripts in a real Node process, including scripts with all those characters, with clashing helper names, and with logging. Browser tests check that such solutions pass the checker, then download `solve.mjs` and `sample.json` and checks that Node's output equals the browser's output.

### Case 2 CSV workflow (Slice 4)

`buildCsvWorkflow(exercise, solved)` returns six `{ name, type, text }` artifacts: `report.mjs`, `parseCsv.mjs`, `contract.mjs`, `package.json`, `jobs-export.csv`, and `README.md`. `CsvToolboxEntry` offers individual Blob downloads on both the solved mission and Toolbox. No archive library, new dependency or backend is involved. Case 1's generator remains unchanged.

Vite/Vitest `?raw` imports package the actual maintained parser and contract sources as text. The contract's parser import is rewritten to `./parseCsv.mjs`; its mapping and all parsing rules stay identical. The manifest pins Papa Parse 5.7.0, matching the application dependency. Learners run `npm install` once in the download folder; subsequent runs need only those files and the locally installed dependency. The sample is exactly `exercise.csv`. No hidden fixtures or automatic reference solution are exported.

`report.mjs` accepts one CSV input path and an optional JSON output path. It opens the input with `node:fs/promises`, reads UTF-8, and calls the shared `rowsFromCsv`. Any structural error stops before loading learner code or opening an output file, with file lines/codes, empty stdout and exit code 1. Invalid record values instead reach the learner's unchanged validation function. Blank-line diagnostics go to stderr. The checked code is embedded as code in its own strict function body, matching the browser's declaration scope and protecting runner names from learner helpers. The global console and supplied console both write to stderr, including code-loading logs. The returned accepted/rejected object is serialized before any output is opened; basic shape and serialization errors fail clearly. No second business validator or reference transformation is added.

The runner prints JSON alone on stdout, or writes it to the second path and confirms on stderr. Resolved identical paths are refused. Output is opened without truncating, then its file identity (`dev`, `ino`) is compared with the input before clearing/writing; this also protects input reached through symlinks and hard links. Missing files/folders, directory arguments, permission errors and output failures have path-specific diagnostics and exit code 1. Existing output reports may be replaced; a malformed input never touches them. Write errors can leave an incomplete output file, so instructions require a successful exit/save confirmation before trusting a report. This is a trusted local script, with no browser sandbox, timeout or memory cap; it reads whole files rather than streaming.

Tests write the actual generated artifacts into isolated temporary directories outside the source repository, copying only the installed Papa Parse package as an offline equivalent of `npm install`. Unit tests execute real Node processes on all 13 valid datasets with two correct solutions and all nine malformed fixtures, plus real permission failures, output errors, file aliases, console separation and helper names. Playwright downloads all six real browser artifacts, observes the production checker's actual sandbox-worker results on all 13 datasets, and compares every result to execution of the downloaded Node script. Tests also retain stale passing code through failed checks/refresh, verify keyboard downloads and contained layouts, and cover both Case 1 main and variation JSON exports. These checks do not install from the network or rely on globally installed packages.

## Copy to IDE

`buildChallengeFile` builds `challenge.js` from the active exercise. `CaseView` passes each workbench its own request, goal and rules. It contains the exercise text as comments and the displayed rows as `JSON.stringify` output, so strings, whitespace and IDs are exact. The draft sits between `YOUR SOLUTION` start and stop markers, followed by a preview call that prints `transform(caseSampleRows)`. The file is plain text: building and copying it runs no code and doesn't touch saved state. It never includes reference solutions, hints or checker datasets. Copying uses `navigator.clipboard.writeText`. If that's unavailable or refused, the text is shown in a focused, pre-selected read-only text box.

## Editor display

"Expand editor" and "Wrap long lines" are local display state in `Workbench`, and aren't saved. Expanding switches the workbench grid to one column and sets a larger `min-height` on the textarea. Results stay mounted, so they're kept. Wrapping toggles the textarea's `wrap` attribute and CSS `white-space`. It never changes the value.


## Mission navigation and UI (Slice 3)

Hash URLs `#/case/missing-jobs`, `#/case/messy-export`, `#/case/doubled-totals` and `#/toolbox` work on static hosts without rewrite rules or a routing dependency. The old `#/case` and empty hash still open Case 1. Unknown/planned case URLs fall back to Case 1; planned sidebar entries remain text. A location change focuses `main`; the skip link focuses content without changing the mission hash.

`MessyExportView` handles CSV investigation, dual-count prediction, the reporting contract and malformed-file examples. `CaseView` keeps the Case 1 investigation and variation. Both use the same `Workbench` for editing, Run, Check, Stop, hints, reference solution and Copy to IDE. Mission views are keyed by stable ID; leaving one cancels active work and invalidates pending completions so late results cannot save a solve. Each valid check runs in a fresh worker using the unchanged sandbox.

`MessyExportOutput` displays actual learner output in labelled accepted/rejected sections. It translates only known returned reason codes, preserves returned values and exposes the raw JSON. Invalid shapes stay inspectable and receive checker feedback; no expected results replace learner output. Tables and CSV/code blocks scroll inside their containers. The editor keeps expansion, vertical resizing and display-only wrapping. Confirmation, prediction and navigation have explicit focus management.

The Case 2 Copy to IDE file states that its sample JSON contains already-parsed records, and is runnable with Node. It includes no CSV file-reading code, hidden checking datasets or automatic reference answer. The separate checked Toolbox export adds CSV file reading and Node workflow teaching; Copy to IDE still uses the current draft.

## Case 3: cleaned-record reconciliation

`doubledTotals.fixtures.js` defines 17 recursively frozen datasets. Each expected
answer is handwritten as retained file lines, duplicate `{ line, keptLine }`
links, conflict `{ id, lines }` groups and numeric `totalHours`. There is no
production reference algorithm in `evaluateDoubledTotals.js`: it resolves original
records by line and compares returned roles/content with those expectations.
It validates exact output fields, group IDs, first occurrences, links, record and
group order, exactly-once accounting, original field types/values, mutation and a
finite exact quarter-hour total. Feedback names job IDs and input file lines;
shared runner-error feedback still refers to learner code lines. Orchestration
keeps the existing per-dataset worker, cancellation, fatal-error and progress
callback conventions.

`DoubledTotalsView` supplies the independently playable investigation, raw import
total, quarter-hour prediction (or skip), rules and field guide. `Workbench`
dispatches the `deduplication` output kind to the new checker and
`DoubledTotalsOutput`. Run displays actual returned values, never expected
answers; invalid shapes remain inspectable through JSON and checker feedback.
The output view shows kept originals, duplicate provenance links and every
version of conflicts, capped at 200 displayed items per list/group, with full
returned JSON available. The raw imported total is labelled separately from the
learner's reported reliable subtotal. Prediction feedback does not reveal the
answer or claim matching totals prove correctness.

Stable case/exercise ID `doubled-totals` adds progress under storage version 1.
Only its prediction validation differs: `{ value }` accepts finite nonnegative
quarter-hour numbers up to 1000, or `{ skipped: true }`. Previous mission IDs,
prediction shapes and exercise fields stay unchanged. Drafts, previous draft,
hints, reveal attribution, last check summary and exact passing code use existing
fields. A stale draft cannot replace the passing code. No new runner or sandbox
permissions, CSV rules or dependencies were introduced.

Case 3 intentionally has no `exportFileName`, so it cannot create a misleading
Toolbox file tool. Its solved panel retains the checked code; the existing Copy
to IDE generator copies its displayed records, contract and current draft as a
runnable sample-data challenge. It adds no hidden fixture, reference answer or
file reader. The full Case 3 Node-file workflow is deferred.
