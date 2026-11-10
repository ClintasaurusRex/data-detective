// ?raw includes the maintained sources as text in both Vite and Vitest.
// Only the contract import path changes; no second parser implementation.
import parserSource from "../csv/parseCsv.js?raw";
import contractSource from "../missions/messyExport.contract.js?raw";

export const CSV_RUN_FILE = "report.mjs";

export function buildCsvWorkflow(exercise, solved) {
  return [
    { name: CSV_RUN_FILE, type: "text/javascript", text: buildCsvScript(solved.code) },
    { name: "parseCsv.mjs", type: "text/javascript", text: parserSource },
    { name: "contract.mjs", type: "text/javascript", text: contractSource.replace('"../csv/parseCsv.js"', '"./parseCsv.mjs"') },
    { name: "package.json", type: "application/json", text: JSON.stringify({
      name: "data-detective-csv-report", private: true, type: "module",
      engines: { node: ">=24" }, dependencies: { papaparse: "5.7.0" },
    }, null, 2) + "\n" },
    { name: "jobs-export.csv", type: "text/csv;charset=utf-8", text: exercise.csv },
    { name: "README.md", type: "text/markdown", text: instructions },
  ];
}

function buildCsvScript(code) {
  return `// Data Detective — The Messy Export
// Your last successfully checked code, with a CSV file runner.
// Run only code you trust: Node has your normal filesystem permissions.
// Read README.md, put all six files together, then run npm install once.
// node report.mjs jobs-export.csv
// node report.mjs jobs-export.csv report.json

import { Console } from "node:console";
import * as fs from "node:fs/promises";
import { resolve } from "node:path";
import { rowsFromCsv } from "./contract.mjs";

// Both console.log and globalThis.console.log belong on stderr.
globalThis.console = new Console({ stdout: process.stderr, stderr: process.stderr });

async function runScript() {
  const args = process.argv.slice(2);
  if (args.length < 1 || args.length > 2 || args.some(arg => !arg || arg.startsWith("--"))) {
    throw new Error("Give an input CSV and optionally an output JSON path.\\nUsage: node report.mjs input.csv [report.json]\\nExample: node report.mjs jobs-export.csv report.json");
  }
  const [inputPath, outputPath] = args;
  if (outputPath && resolve(inputPath) === resolve(outputPath)) {
    throw new Error("The output must be a different file from the input CSV. Choose a name such as report.json.");
  }

  let text, inputInfo;
  try {
    const input = await fs.open(inputPath, "r");
    try {
      inputInfo = await input.stat();
      if (inputInfo.isDirectory()) throw Object.assign(new Error("Is a directory"), { code: "EISDIR" });
      text = await input.readFile("utf8");
    } finally {
      await input.close();
    }
  } catch (error) {
    throw new Error(fileProblem("read", inputPath, error));
  }

  const parsed = rowsFromCsv(text);
  if (!parsed.ok) {
    throw new Error("CSV structure is malformed. No report was produced; transform was not run.\\n" +
      parsed.errors.map(error => "File line " + error.line + " [" + error.code + "]: " + error.message).join("\\n"));
  }
  if (parsed.blankLines.length) console.error("Skipped blank file lines: " + parsed.blankLines.join(", "));

  // This function scope matches the browser's strict function body. Helper
  // names cannot collide with fs, parsed, runScript or other runner names.
  const transform = (function (console) {
    "use strict";
// ---- Your code, as checked in Data Detective ----
${code}\n// ---- End of your checked code ----
    ;return typeof transform === "function" ? transform : undefined;
  })(globalThis.console);
  if (typeof transform !== "function") throw new Error("Your code must define a transform(rows) function.");

  let result, json;
  try {
    result = transform(parsed.rows);
    if (!result || !Array.isArray(result.accepted) || !Array.isArray(result.rejected)) {
      throw new Error("Expected { accepted: [], rejected: [] } from transform(rows).");
    }
    json = JSON.stringify(result, null, 2) + "\\n";
  } catch (error) {
    throw new Error("transform stopped with an error: " + error.message);
  }

  if (outputPath) {
    let output;
    try {
      // Append mode opens without truncating. Check identity BEFORE clearing
      // it, including symlinks and hard links pointing to the input CSV.
      output = await fs.open(outputPath, "a");
      const info = await output.stat();
      if (info.dev === inputInfo.dev && info.ino === inputInfo.ino) {
        throw new Error("The output points to the input CSV. Choose a different output file.");
      }
      await output.truncate(0);
      await output.writeFile(json, "utf8");
    } catch (error) {
      throw new Error(fileProblem("write", outputPath, error));
    } finally {
      await output?.close();
    }
    console.error("Wrote " + result.accepted.length + " accepted and " + result.rejected.length + " rejected records to " + outputPath);
  } else {
    process.stdout.write(json);
  }
}

function fileProblem(action, path, error) {
  const label = action === "read" ? "read input" : "write output";
  const prefix = "Couldn't " + label + " '" + path + "': ";
  if (error.code === "ENOENT") return prefix + "file or parent folder not found. Check the path and your terminal's current folder.";
  if (["EACCES", "EPERM", "EROFS"].includes(error.code)) return prefix + "permission denied or read-only location. Choose a file or folder you can " + action + ".";
  if (error.code === "EISDIR") return prefix + "it is a folder. Give a file path instead.";
  return prefix + error.message;
}

runScript().catch(error => {
  console.error("Error: " + error.message);
  process.exitCode = 1;
});
`;
}

const instructions = `# The Messy Export: your CSV reporting tool

Run only code you trust. Unlike the browser exercise's isolated worker, this
Node script runs with your normal filesystem permissions. It has no sandbox
timeout or memory limit. It reads the whole file, so start with small exports.

## Set up once

1. Install Node.js 24 LTS or newer from https://nodejs.org (npm comes with it).
   Check the installation in a terminal with: node --version
2. Make a folder, such as messy-export. Put ALL SIX downloads in it:
   report.mjs, parseCsv.mjs, contract.mjs, package.json, jobs-export.csv, README.md.
   Keep their names exactly as downloaded; remove any browser-added (1) suffix.
3. Open a terminal in that folder and run:

   npm install

This installs Papa Parse 5.7.0 locally into node_modules. npm reads package.json
to find the required dependency (a library our script uses). This first install
needs internet access. No global package or Data Detective repository is needed.
Keep node_modules beside the downloads; later runs work offline.

## Run the report

Print JSON in the terminal:

   node report.mjs jobs-export.csv

Save JSON to a file instead:

   node report.mjs jobs-export.csv report.json

Open report.json in your editor. It is in your terminal's current folder.
An existing output file is replaced; choose a new name if you need to keep it.
The runner refuses to overwrite the input CSV, including links to that file.

Try another CSV with the same id,status,hours,notes columns:

   node report.mjs another-export.csv another-report.json

The first argument after report.mjs selects the input. The optional second
selects the output. Paths are relative to your terminal's current folder;
quote paths containing spaces, for example:

   node report.mjs "weekly exports/jobs.csv" "weekly report.json"

## What the files do

- report.mjs contains your last successfully checked transform(rows), plus the
  file-reading and reporting steps. A changed browser draft is not exported.
- parseCsv.mjs is Data Detective's maintained Papa Parse wrapper.
- contract.mjs maps parsed fields into the Case 2 rows, with original file lines.
- package.json tells npm which parser version to install.
- jobs-export.csv is the fictional mission sample, not the hidden checking files.
- README.md is this guide. No reference solution is added to your code.

## The new concepts

Node.js runs JavaScript outside the browser and can read and write disk files.
The browser exercise supplies rows; this runner uses fs.open and the file
handle's readFile("utf8") to read CSV text from disk. It then parses the text,
runs your transform, and either writes JSON to disk or prints it.

Parsing checks CSV structure (columns, quotes, commas and multiline fields).
Validation checks record values (blank hours, unknown status, missing ID).
The same parser and contract as the browser preserve string IDs, raw values
and physical file line numbers. Blank lines are skipped with a diagnostic.
Malformed structure stops the whole file BEFORE your code runs: no partial
report is printed, and an existing output report is left alone. Fix the CSV
or ask for a corrected export, then run again. Invalid record values instead
belong in rejected with your reason codes; other records can be accepted.

stdout (standard output) carries only the JSON report when no output path is
given. stderr (standard error) carries console.log messages, errors and save
confirmations. Both usually appear in the terminal, but they are separate
streams, so redirecting stdout to a file also keeps logs out of the JSON.

## Verify the result

The sample should have 4 accepted and 4 rejected records. Inspect both arrays:
accepted IDs keep leading zeros; hours 0 is valid; blank hours are rejected.
Rejected entries keep original strings and their starting CSV file line.
The note starting on line 7 spans two physical lines. Check every input record
appears exactly once and review all rejection reasons before using a report.

An Error: message and a nonzero exit code mean the command failed. No output
is printed for malformed CSV. A successful command exits with code 0. To see
the last exit code use echo $? in bash/zsh, or $LASTEXITCODE in PowerShell.
For a saved report, look for the Wrote confirmation. A failed run does not
make an old report current: rerun successfully before trusting that file.
Missing files, permission problems or unwritable output paths name the path
to fix. Keep the parser files together; if Node cannot find papaparse, run
npm install in this folder. Keep Copy to IDE's challenge.js separate: it is
the parsed-record coding exercise and does not read CSV files.
`;
