# Data Detective

A friendly learning app for writing useful workplace data scripts in JavaScript.

You play a data detective at a fictional water utility, Riverbend Water Services. Each case starts with a request from a colleague and a small dataset. You inspect the data, predict the answer, fix a real JavaScript function, run it, check it against more data, and retain the code that passed. Cases 1 and 3 provide standalone Node JSON tools; Case 2 provides a complete Node CSV reporting tool.

The app fills the browser window, with the case list as a compact sidebar on desktop. The editor can be expanded to full width, with optional word wrap. **Copy to IDE** copies the exercise as a runnable `challenge.js`, so learners can work in VS Code, VSCodium or another IDE and paste their solution back. For Case 2 this is explicitly a parsed-record exercise, using the displayed records; it does not read CSV files.

Milestone 1 (Case 1, **The Missing Jobs**) is complete and owner-approved. Milestone 2, **The Messy Export**, is feature-complete; its owner QA and final approval remain pending, deferred to November 14–15, 2026. Milestone 3, **The Doubled Totals**, is feature-complete with a browser mission and standalone JSON-file reporting tool: investigate copied and conflicting jobs, retain safe originals, produce an audit trail and verify a reliable hours subtotal. Its owner QA is also queued for November 14–15; approval remains pending. Cases 4–5 remain planned and unstarted; see [docs/PRODUCT.md](docs/PRODUCT.md) and [docs/STATUS.md](docs/STATUS.md).

![Case 1 on a wide screen](docs/screenshots/1920-wide.png)

## Run it locally

You need **Node.js 24 LTS**. This project was built and tested with **Node.js v24.22.1** (see [.nvmrc](.nvmrc)) and npm 11.

```bash
npm install
```

```bash
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173/).

To try the production build, which has the full Content Security Policy:

```bash
npm run build
```

```bash
npm run preview
```

The app is static. After `npm run build`, the `dist/` folder can be served from any static web host, including from a sub-folder. It needs no backend, login, API key or paid service, and works offline once loaded.

## Checks

| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest): all three mission contracts/checkers, saved progress, exported tools run in real Node processes, the sandbox CSP and runner messaging, and CSV parsing |
| `npm run build` | Production build into `dist/` |
| `npm run test:e2e` | Browser tests (Playwright, Chromium) against the production build: the learner journey, keyboard use, a phone-sized screen, runner errors and recovery, and the isolation boundaries |
| `npm run check` | All of the above, in that order |

The browser tests expect Playwright's Chromium. In this repository `@playwright/test` is pinned to 1.63.0 to match the browser installed in the cloud environment; elsewhere, run `npx playwright install chromium` once.

## How it's organised

```
src/
  missions/       case content: requests, rules, datasets, hints, solutions
  csv/            CSV parsing (Papa Parse wrapper), shared by browser and Node
  checking/       turns run results into plain-language feedback
  runner/         the sandboxed code runner (app side + sandbox page scripts)
  storage/        saved progress in localStorage, with validation
  export/         builds the downloadable Node script and sample file
  components/     React UI
build/sandboxPage.js   builds sandbox.html and the app's CSP (Vite plugin)
tests/unit/       Vitest
tests/e2e/        Playwright
docs/             product scope, architecture, case notes, status
```

Each layer is separate, so later cases add mission content, datasets and the appropriate checker/output presentation without changing the sandbox runner. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how learner code is run and isolated, and its known limits.

## Adding a case (later milestones)

1. Add a mission file in `src/missions/` with its request, rules, rows, datasets with explicit expected IDs, hints and explained solution. Copy the shape of `missingJobs.js`.
2. Add it to `src/missions/index.js`, mark it `playable: true`, and connect its investigation view and output/checker type.
3. Document its datasets in `docs/cases/`.
4. Add unit tests that the expected results follow the case rules, and extend the browser journey.

Case 2 introduces CSV. The contract, parser and datasets (Slice 1), `{ accepted, rejected }` checker (Slice 2), playable browser investigation (Slice 3), and standalone Node CSV workflow (Slice 4) are implemented. Use the sidebar to switch cases; hash URLs preserve location through Back, Forward and refresh. Each mission saves its own progress without resetting Case 1. Broken CSV examples stop the whole file before validation. See [docs/cases/02-messy-export.md](docs/cases/02-messy-export.md) and [docs/STATUS.md](docs/STATUS.md).

Case 3 is independently playable at `#/case/doubled-totals`; no Case 2 completion is needed. Use the exact string job ID as a key, compare business fields, and separate safe originals, linked exact duplicates and whole conflict groups. Only safely retained records contribute to the reliable subtotal. The lesson teaches Map, Set, grouping, equality, provenance and verification through 17 checking datasets. Prediction, hints, explained solution, editor controls and saved progress follow the earlier cases. Copy to IDE provides the current draft as a sample-data challenge; the Toolbox exports the last passing code with a real JSON-file runner. See [the Case 3 contract](docs/cases/03-doubled-totals.md).

## Use your Case 2 CSV tool

After all checks pass, download all six Toolbox files into one folder: `report.mjs`, `parseCsv.mjs`, `contract.mjs`, `package.json`, `jobs-export.csv`, and `README.md`. Open a terminal there:

```bash
npm install
node report.mjs jobs-export.csv
node report.mjs jobs-export.csv report.json
node report.mjs another-export.csv another-report.json
```

`npm install` installs Papa Parse 5.7.0 locally and needs internet access once. Later runs use those installed files offline; the Data Detective source repository and global packages are not required. Without an output argument, stdout contains JSON. With one, the report is saved to that path. Console logs, diagnostics and errors go to stderr. Malformed CSV produces no partial report and exits unsuccessfully. The input CSV cannot be overwritten, including through file links.

The script contains the last passing solution, even after the browser draft changes. Only run code you trust: Node has normal filesystem permissions. The downloaded README explains filesystem access, dependencies, arguments, parsing versus validation, errors and report verification. Copy to IDE stays a separate parsed-record exercise.

## Use your Case 3 JSON tool

Pass all 17 checks, then download `deduplicate.mjs`, `jobs-cleaned.json`, and `README.md` into a new folder. With Node 24 installed, open a terminal there:

```bash
node deduplicate.mjs jobs-cleaned.json
node deduplicate.mjs jobs-cleaned.json report.json
node deduplicate.mjs another-week.json another-report.json
```

No npm install or additional dependency is needed. The first argument supplies input; the optional second saves JSON instead of printing it. Console messages and errors go to stderr, keeping stdout valid JSON. Quote paths with spaces. The script contains the exact last passing code; editing or failing a subsequent check does not replace it.

Supply a JSON array of already-cleaned `{ line, id, status, hours, notes }` records. `line` is carried source provenance, never a fabricated physical JSON line. IDs stay exact strings, hours are numeric nonnegative quarter-hour values, and notes remain unchanged. Invalid input is rejected instead of cleaned. The runner validates all four report fields, complete original accounting, ordering, duplicate links, conflicts and the reliable total before opening output. Input paths and file links are protected against accidental overwrite. Validation or execution failure leaves an existing report unchanged; an output write failure can leave an incomplete file, so require a successful exit before using it.

`kept` contains safe first occurrences; `duplicates` links later exact copies to them; `conflicts` preserves every version of each disputed job. `totalHours` sums only kept hours across all statuses. Check every original and link, then add kept hours independently. For the sample, 3 kept + 2 duplicates + 3 conflicting occurrences account for 8 records; kept hours total **3.5**. Ask the crews which version of conflict `00111` is authoritative. Unresolved conflicting jobs are excluded intentionally; that does not mean no work happened. The downloaded README explains the full reconciliation and error recovery.

Only run trusted learner code. Node has normal filesystem permissions, with no browser sandbox, timeout or memory cap. Start with small files. The tool includes the displayed sample and validation helpers, with no hidden fixtures or automatically supplied reference solution.

## Privacy

Everything stays in your browser. Drafts and progress are saved in `localStorage` for this site only. All people, places and records are fictional.

If saving fails, the app shows a warning and keeps the current session working in memory; copy your code before refreshing. Use one active editing tab: concurrent tabs can overwrite each other's saved snapshots. See the [engineering review and backlog](docs/ENGINEERING-REVIEW.md) for verified limits, browser coverage and remaining owner QA.
