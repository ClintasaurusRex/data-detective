import contractSource from "./firstReportingToolContract.js?raw";
import fileSource from "./nodeFileIO.js?raw";
import runnerSource from "./firstReportingToolRunner.js?raw";
import instructions from "./firstReportingToolREADME.md?raw";
import { buildSampleJson } from "./nodeScript.js";

export const REPORTING_RUN_FILE = "weekly-report.mjs";

export function buildReportingWorkflow(exercise, solved) {
  return [
    {name: REPORTING_RUN_FILE, type: "text/javascript", text: buildScript(solved.code)},
    {name: "orders.json", type: "application/json", text: buildSampleJson(exercise.orders)},
    {name: "entries.json", type: "application/json", text: buildSampleJson(exercise.entries)},
    {name: "period.json", type: "application/json", text: buildSampleJson(exercise.period)},
    {name: "README.md", type: "text/markdown", text: instructions},
  ];
}

function buildScript(code) {
  return `// Data Detective — Your First Reporting Tool
// Your exact last successfully checked solution and a standalone Node 24 runner.
// Run only trusted code: normal filesystem permissions, no sandbox or timeout.
// node weekly-report.mjs orders.json entries.json period.json [report.json]
import { Console } from "node:console";
import * as fs from "node:fs/promises";
import { constants } from "node:fs";
import { resolve, dirname, join } from "node:path";

globalThis.console = new Console({ stdout: process.stderr, stderr: process.stderr });

${contractSource.replace(/^export /gm, "")}

function loadCheckedCode() {
  "use strict";
// ---- Your buildWeeklyReport function, as checked in Data Detective ----
${code}\n// ---- End of your checked code ----
  ;return typeof buildWeeklyReport === "function" ? buildWeeklyReport : undefined;
}

${fileSource.replace(/^export /gm, "")}
${runnerSource}
`;
}
