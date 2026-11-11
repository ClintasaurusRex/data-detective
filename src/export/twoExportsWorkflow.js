import contractSource from "./twoExportsContract.js?raw";
import fileSource from "./nodeFileIO.js?raw";
import runnerSource from "./twoExportsRunner.js?raw";
import instructions from "./twoExportsREADME.md?raw";
import { buildSampleJson } from "./nodeScript.js";

export const TWO_EXPORTS_RUN_FILE = "reconcile.mjs";

export function buildTwoExportsWorkflow(exercise, solved) {
  return [
    { name: TWO_EXPORTS_RUN_FILE, type: "text/javascript", text: buildScript(solved.code) },
    { name: "orders.json", type: "application/json", text: buildSampleJson(exercise.orders) },
    { name: "field-reports.json", type: "application/json", text: buildSampleJson(exercise.fieldReports) },
    { name: "README.md", type: "text/markdown", text: instructions },
  ];
}

function buildScript(code) {
  return `// Data Detective — The Two Exports
// Your exact last successfully checked solution with a standalone file runner.
// Run only trusted code. Node has normal filesystem permissions, no timeout.
// Node 24: node reconcile.mjs orders.json field-reports.json [report.json]
import { Console } from "node:console";
import * as fs from "node:fs/promises";
import { constants } from "node:fs";
import { resolve, dirname, join } from "node:path";

globalThis.console = new Console({ stdout: process.stderr, stderr: process.stderr });

${contractSource.replace(/^export /gm, "")}

function loadCheckedCode(console) {
  "use strict";
// ---- Your reconcile function, as checked in Data Detective ----
${code}\n// ---- End of your checked code ----
  ;return typeof reconcile === "function" ? reconcile : undefined;
}

${fileSource.replace(/^export /gm, "")}
${runnerSource}
`;
}
