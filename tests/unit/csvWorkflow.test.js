import { execFile } from "node:child_process";
import { chmod, link, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildCsvWorkflow } from "../../src/export/csvWorkflow.js";
import { messyExportCase } from "../../src/missions/messyExport.js";
import { datasets, malformedDatasets } from "../../src/missions/messyExport.fixtures.js";
import { rowsFromCsv } from "../../src/missions/messyExport.contract.js";
import { runMessyExportChecks } from "../../src/checking/evaluateMessyExport.js";
import { writeWorkflow } from "../support/csvWorkflow.js";

const exec = promisify(execFile);
const exercise = messyExportCase.exercises[0];
let dir;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), "csv-workflow-")); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

async function generate(code = exercise.solution.code) {
  const files = buildCsvWorkflow(exercise, { code });
  await writeWorkflow(dir, files);
  return files;
}
async function node(args) {
  try {
    const result = await exec(process.execPath, ["report.mjs", ...args], { cwd: dir, timeout: 10000,
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1", NODE_PATH: "" } });
    return { ...result, code: 0 };
  } catch (error) { return { stdout: error.stdout, stderr: error.stderr, code: error.code }; }
}
function execute(code, rows) {
  const output = new Function("console", '"use strict";\n' + code + "\n;return transform;")({ log() {} })(structuredClone(rows));
  return { status: "ok", resultType: "object", output: JSON.parse(JSON.stringify(output)), mutated: false };
}

describe("generated standalone CSV workflow", () => {
  it("contains six independent artifacts, exact checked code, shared source and only the displayed sample", async () => {
    const code = exercise.solution.code + '\n// ` ${text} </script> */ "quotes"';
    const files = await generate(code);
    expect(files.map(f => f.name)).toEqual(["report.mjs", "parseCsv.mjs", "contract.mjs", "package.json", "jobs-export.csv", "README.md"]);
    expect(files[0].text).toContain(code);
    expect(files[1].text).toBe(await readFile(new URL("../../src/csv/parseCsv.js", import.meta.url), "utf8"));
    expect(files[2].text).toBe((await readFile(new URL("../../src/missions/messyExport.contract.js", import.meta.url), "utf8")).replace('"../csv/parseCsv.js"', '"./parseCsv.mjs"'));
    expect(JSON.parse(files[3].text).dependencies).toEqual({ papaparse: "5.7.0" });
    const project = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
    expect(JSON.parse(files[3].text).dependencies.papaparse).toBe(project.dependencies.papaparse);
    expect(files[4].text).toBe(datasets.caseFile.csv);
    for (const file of files) expect(file.text).not.toMatch(/010233|sameJobsNewOrder|reference solutionCode/);
    expect(files[5].text).toContain("npm install");
    const result = await node(["jobs-export.csv"]);
    expect(result.code).toBe(0);
  });

  it("matches all 13 browser-contract datasets and the existing checker with two correct implementations", async () => {
    const reduceCode = exercise.solution.code.replace("function transform(rows)", "function classify(rows)") + `
function transform(rows) {
  return rows.reduce((report, row) => {
    const result = classify([row]);
    report.accepted.push(...result.accepted);
    report.rejected.push(...result.rejected);
    return report;
  }, { accepted: [], rejected: [] });
}`;
    for (const code of [exercise.solution.code, reduceCode]) {
      expect((await runMessyExportChecks(execute, exercise, code)).passed).toBe(true);
      await generate(code);
      for (const dataset of Object.values(datasets)) {
        await writeFile(join(dir, "input.csv"), dataset.csv);
        const result = await node(["input.csv"]);
        expect(result.code, result.stderr).toBe(0);
        const report = JSON.parse(result.stdout);
        const rows = rowsFromCsv(dataset.csv).rows;
        expect(report, dataset.name).toEqual(execute(code, rows).output);
        expect(report.accepted).toEqual(dataset.expected.accepted);
        expect(report.rejected).toEqual(dataset.expected.rejected.map(({ line, reasons }) => ({
          record: rows.find(row => row.line === line), reasons,
        })));
      }
    }
  });

  it.each(Object.entries(malformedDatasets))("stops the entire malformed file %s before running code or touching an existing report", async (_id, dataset) => {
    await generate('console.log("LEARNER RAN"); function transform() { throw new Error("LEARNER RAN"); }');
    await writeFile(join(dir, "bad.csv"), dataset.csv);
    await writeFile(join(dir, "old.json"), "keep old report");
    const result = await node(["bad.csv", "old.json"]);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("CSV structure is malformed");
    expect(result.stderr).not.toContain("LEARNER RAN");
    for (const error of rowsFromCsv(dataset.csv).errors) {
      expect(result.stderr).toContain(`File line ${error.line} [${error.code}]`);
    }
    expect(await readFile(join(dir, "old.json"), "utf8")).toBe("keep old report");
  });

  it("keeps every console stream out of printed and saved JSON, including code-loading logs and global console", async () => {
    await generate(`console.log("loading"); globalThis.console.info("global");
${exercise.solution.code.replace("const accepted = [];", 'console.warn("validating"); console.error("diagnostic"); const accepted = [];')}`);
    const printed = await node(["jobs-export.csv"]);
    expect(printed.code).toBe(0);
    expect(JSON.parse(printed.stdout).accepted).toHaveLength(4);
    for (const text of ["loading", "global", "validating", "diagnostic"]) expect(printed.stderr).toContain(text);
    await writeFile(join(dir, "report.json"), "old file with content that must be fully replaced".repeat(1000));
    const saved = await node(["jobs-export.csv", "report.json"]);
    expect(saved.code).toBe(0);
    expect(saved.stdout).toBe("");
    expect(saved.stderr).toContain("Wrote 4 accepted and 4 rejected");
    expect(JSON.parse(await readFile(join(dir, "report.json"), "utf8"))).toEqual(JSON.parse(printed.stdout));
  });

  it("isolates learner helpers from all runner declarations", async () => {
    await generate('const fs = 1, parsed = 2, result = 3, json = 4, args = 5, inputPath = 6;\n' +
      'function runScript() {} function fileProblem() {}\n' + exercise.solution.code);
    const result = await node(["jobs-export.csv"]);
    expect(result.code, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).accepted).toHaveLength(4);
    expect((await node(["missing.csv"])).stderr).toContain("file or parent folder not found");
  });

  it.each([[], ["--help"], ["jobs-export.csv", "report.json", "extra"], [""]])("explains invalid arguments %j", async (...args) => {
    await generate();
    const result = await node(args);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Usage: node report.mjs");
  });

  it.each([
    [["absent.csv"], /read input.*file or parent folder not found/],
    [["."], /read input.*it is a folder/],
    [["jobs-export.csv", "absent/report.json"], /write output.*file or parent folder not found/],
    [["jobs-export.csv", "."], /write output.*it is a folder/],
  ])("explains filesystem failures %j", async (args, message) => {
    await generate();
    const result = await node(args);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(message);
  });

  it("explains actual read and write permission failures", async () => {
    await generate();
    await chmod(join(dir, "jobs-export.csv"), 0o000);
    const deniedRead = await node(["jobs-export.csv"]);
    expect(deniedRead.code).toBe(1);
    expect(deniedRead.stderr).toContain("permission denied or read-only");
    await chmod(join(dir, "jobs-export.csv"), 0o600);
    await writeFile(join(dir, "locked.json"), "keep");
    await chmod(join(dir, "locked.json"), 0o400);
    const deniedWrite = await node(["jobs-export.csv", "locked.json"]);
    expect(deniedWrite.code).toBe(1);
    expect(deniedWrite.stdout).toBe("");
    expect(deniedWrite.stderr).toContain("permission denied or read-only");
    expect(await readFile(join(dir, "locked.json"), "utf8")).toBe("keep");
  });

  it.each(["jobs-export.csv", "./jobs-export.csv", "symlink.csv", "hardlink.csv"])("never overwrites input through %s", async (output) => {
    await generate();
    await symlink(join(dir, "jobs-export.csv"), join(dir, "symlink.csv"));
    await link(join(dir, "jobs-export.csv"), join(dir, "hardlink.csv"));
    const result = await node(["jobs-export.csv", output]);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/different file|points to the input/);
    expect(await readFile(join(dir, "jobs-export.csv"), "utf8")).toBe(exercise.csv);
  });

  it.each([
    'function transform() { throw new Error("inspect this record"); }',
    'throw new Error("loading failed"); function transform() {}',
    'function transform() { return []; }',
    'function transform() { const r = { accepted: [], rejected: [] }; r.circular = r; return r; }',
  ])("fails without JSON on learner execution/serialization errors", async (code) => {
    await generate(code);
    const result = await node(["jobs-export.csv"]);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Error:");
  });
});
