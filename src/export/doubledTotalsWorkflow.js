import contractSource from "./doubledTotalsContract.js?raw";
import { buildSampleJson } from "./nodeScript.js";

export const DOUBLED_TOTALS_RUN_FILE = "deduplicate.mjs";

export function buildDoubledTotalsWorkflow(exercise, solved) {
  return [
    { name: DOUBLED_TOTALS_RUN_FILE, type: "text/javascript", text: buildScript(solved.code) },
    { name: "jobs-cleaned.json", type: "application/json", text: buildSampleJson(exercise.rows) },
    { name: "README.md", type: "text/markdown", text: instructions },
  ];
}

function buildScript(code) {
  return `// Data Detective — The Doubled Totals
// Your last successfully checked code, with a standalone JSON file runner.
// Run only trusted code: Node has your normal filesystem permissions.
// Node 24: node deduplicate.mjs jobs-cleaned.json [report.json]

import { Console } from "node:console";
import * as fs from "node:fs/promises";
import { resolve } from "node:path";

// Both lexical and global console messages stay out of stdout JSON.
globalThis.console = new Console({ stdout: process.stderr, stderr: process.stderr });

${contractSource.replace(/^export /gm, "")}

async function runScript() {
  const args = process.argv.slice(2);
  if (args.length < 1 || args.length > 2 || args.some(arg => !arg || arg.startsWith("--"))) {
    throw new Error("Give an input JSON and optionally an output JSON path.\\nUsage: node deduplicate.mjs input.json [report.json]\\nExample: node deduplicate.mjs jobs-cleaned.json report.json");
  }
  const [inputPath, outputPath] = args;
  if (outputPath && resolve(inputPath) === resolve(outputPath)) {
    throw new Error("The output must be a different file from the input JSON. Choose a name such as report.json.");
  }
  let text, inputInfo;
  try {
    const input = await fs.open(inputPath, "r");
    try {
      inputInfo = await input.stat();
      if (!inputInfo.isFile()) throw new Error("expected a regular JSON file, not a folder or special device.");
      text = await input.readFile("utf8");
    } finally { await input.close(); }
  } catch (error) { throw new Error(fileProblem("read", inputPath, error)); }

  let rows;
  try {
    // An editor's optional UTF-8 byte-order mark is not record content.
    rows = JSON.parse(text.replace(/^\\uFEFF/, ""));
  } catch (error) {
    throw new Error("Input '" + inputPath + "' isn't valid JSON: " + error.message + "\\nCheck commas, quotes and square brackets. No report was produced.");
  }
  validateDoubledTotalsInput(rows);
  const before = JSON.stringify(rows);

  let json, report;
  try {
    // A separate strict function body matches the browser. Learner helper
    // names cannot collide with the runner or its validation functions.
    const transform = (function (console) {
      "use strict";
// ---- Your code, as checked in Data Detective ----
${code}\n// ---- End of your checked code ----
      ;return typeof transform === "function" ? transform : undefined;
    })(globalThis.console);
    if (typeof transform !== "function") throw new Error("Your code must define a transform(rows) function.");
    const result = transform(rows);
    if (JSON.stringify(rows) !== before) throw new Error("Your code changed the input. Preserve the original records and their order.");
    // Validate before AND after serialization: toJSON must not silently
    // change a report's fields, content or accounting.
    const originals = JSON.parse(before);
    validateDoubledTotalsReport(result, originals);
    json = JSON.stringify(result, null, 2) + "\\n";
    report = JSON.parse(json);
    validateDoubledTotalsReport(report, originals);
  } catch (error) {
    throw new Error("Your code could not produce a valid report: " + (error?.message ?? String(error)));
  }

  // Nothing opens or changes the output until the entire report is ready.
  if (outputPath) {
    let output;
    try {
      output = await fs.open(outputPath, "a");
      const info = await output.stat();
      if (info.dev === inputInfo.dev && info.ino === inputInfo.ino) {
        throw new Error("The output points to the input JSON. Choose a different output file.");
      }
      if (!info.isFile()) throw new Error("expected a regular output file.");
      await output.truncate(0);
      await output.writeFile(json, "utf8");
    } catch (error) { throw new Error(fileProblem("write", outputPath, error)); }
    finally { await output?.close(); }
    console.error("Wrote " + report.kept.length + " kept, " + report.duplicates.length + " duplicates and " + report.conflicts.length + " conflict groups to " + outputPath);
  } else { process.stdout.write(json); }
}

function fileProblem(action, path, error) {
  const prefix = "Couldn't " + (action === "read" ? "read input" : "write output") + " '" + path + "': ";
  if (error.code === "ENOENT") return prefix + "file or parent folder not found. Check the path and your terminal's current folder.";
  if (["EACCES", "EPERM", "EROFS"].includes(error.code)) return prefix + "permission denied or read-only location. Choose a file or folder you can " + action + ".";
  if (error.code === "EISDIR") return prefix + "it is a folder. Give a file path instead.";
  return prefix + error.message;
}

runScript().catch(error => {
  console.error("Error: " + (error?.message ?? String(error)));
  process.exitCode = 1;
});
`;
}

const instructions = `# The Doubled Totals: your JSON reporting tool

This tool reads already-cleaned jobs, runs your last successfully checked
transform(rows), and reports safe originals, exact copies, conflicting versions
and a reliable hours subtotal. It does not parse CSV or clean invalid records.

Only run code you trust. This Node script runs with your normal filesystem
permissions, outside the browser sandbox. It has no timeout or memory limit
and reads the whole file into memory. Start with small exports. Validation
guards help catch mistakes; they do not sandbox learner code.

## Set up

Install Node.js 24 LTS or newer from https://nodejs.org. In a terminal, check:

    node --version

Put these THREE downloads in a new folder: deduplicate.mjs, jobs-cleaned.json,
README.md. Keep their exact names (remove any browser-added (1) suffix).
No npm install, extra dependencies, internet connection or Data Detective
repository is needed to run them. Open a terminal in that folder.

## Run your report

Print the JSON report in the terminal:

    node deduplicate.mjs jobs-cleaned.json

Save it to a separate file instead:

    node deduplicate.mjs jobs-cleaned.json report.json

Open report.json in that folder. Existing output reports are replaced; choose
a new name to keep one. The runner refuses to overwrite the input, including
through symlinks or hard links. Use the output argument to save safely.
Avoid redirecting stdout onto your input: the terminal can erase it before
Node starts, outside the runner's protection.

Try your own cleaned file:

    node deduplicate.mjs another-week.json another-report.json
    node deduplicate.mjs "weekly exports/jobs.json" "weekly report.json"

The first argument selects input; the optional second selects output. Paths
are relative to your terminal's current folder. Quote paths with spaces.
stdout carries only JSON. console.log and other console messages go to stderr
(standard error), along with errors and save confirmations. These separate
streams may both appear in the terminal, without mixing logs into JSON.

## Prepare input without changing evidence

The input file must contain a JSON array, for example:

    [
      { "line": 2, "id": "00110", "status": "complete", "hours": 2, "notes": "Meter swap" }
    ]

Each record has exactly those five fields. line is source provenance: a unique
positive safe integer carried from the staging file; it is NOT the physical line in
this JSON file. Keep source order with increasing line values; gaps are fine.
Do not renumber after formatting JSON. id must be a nonblank, already-trimmed
string: "0007" and "7" differ, as do "Job-A" and "job-a". status is already
open, complete or on hold. hours is a finite nonnegative number in quarter-hour
(0.25) steps; zero is valid. Values and combined quarters must stay within
JavaScript's safe integer range. notes is a string whose spaces, capitals and
line breaks remain exact. An empty array is valid. An optional initial UTF-8
byte-order mark is accepted; record content is never silently cleaned.

## Understand and verify all four report fields

- kept: the first original occurrence of each job whose versions ALL agree.
  Equality compares exact id, status, numeric hours and notes, ignoring line.
- duplicates: every later identical occurrence, with record unchanged and
  keptLine linking to the first retained occurrence. Copies add no extra hours.
- conflicts: one group per conflicting exact string ID, containing ALL its
  original versions, including repeated identical versions. Never pick a
  first or last winner. No version from these groups goes in the other lists.
- totalHours: sum hours in kept, starting at numeric zero. Safely kept jobs
  of every status count. Conflicting jobs are intentionally excluded until
  investigated; this is a reliable subtotal, not a claim that no work happened.

Check every input occurrence appears exactly once across kept, duplicate
records and conflict records. A keptLine is a link, not another occurrence.
Check original fields and string IDs, duplicate links, input order within
each list/group and conflict groups ordered by first occurrence. Add kept
hours yourself to verify totalHours. Matching counts or totals alone is not
enough. The runner validates these rules and refuses misleading reports; it
does not add a reference solution or repair your output for you.

For the sample: raw hours are 17; kept lines 2, 5, 8 sum to 3.5 reliable hours.
Duplicate links are 4 -> 2 and 7 -> 5. Conflict 00111 contains lines 3, 6, 9:
ask the crews why the hours differ (3, 4, 3), which version is authoritative,
and whether any other business fields need correction. Preserve this evidence
and record the reviewed decision in your source process before making a new
cleaned input. Do not silently delete or overwrite competing versions.
Accounting: 3 kept + 2 duplicates + 3 conflict occurrences = 8 originals.
Raw hours reconcile as 3.5 kept + 3.5 copied + 10 unverified = 17. The 10
unverified imported hours are not a verified amount of work.

## Recognise errors and keep your work

Success exits with code 0. Error: and a nonzero exit code mean the run failed.
In bash/zsh inspect the last code with echo $?; in PowerShell use $LASTEXITCODE.
Missing files, malformed JSON, wrong shapes, invalid cleaned values, changed
originals, incorrect reports and code errors stop before any output is opened.
An existing report stays unchanged in these cases; it is still an OLD report,
so do not trust it as the result of a failed run. No partial JSON is printed.
Missing paths and permission errors identify what to fix. A write failure can
leave an incomplete output; require a successful exit and Wrote confirmation
before using a saved report. Keep an extra copy of important data.

deduplicate.mjs contains your checked code exactly, even if the browser draft
later changed or failed a check. It also includes file reading, validation and
reporting helpers. jobs-cleaned.json is only the displayed fictional sample.
No hidden checking fixtures or automatic reference solution are bundled.
Copy to IDE's challenge.js is a separate sample-data exercise: edit there and
paste back into Data Detective to check; it does not read local data files.
`;
