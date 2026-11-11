import { execFile } from "node:child_process";
import { access, chmod, link, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildDoubledTotalsWorkflow } from "../../src/export/doubledTotalsWorkflow.js";
import { doubledTotalsCase } from "../../src/missions/doubledTotals.js";
import { independentSolution, wrongSolutions } from "../support/doubledTotals.js";

const exec = promisify(execFile);
const exercise = doubledTotalsCase.exercises[0];
const sample = "jobs-cleaned.json";
let dir;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), "doubled-workflow-")); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

async function generate(code = exercise.solution.code) {
  const files = buildDoubledTotalsWorkflow(exercise, { code });
  for (const file of files) await writeFile(join(dir, file.name), file.text);
  return files;
}
async function node(args) {
  try {
    return { ...await exec(process.execPath, ["deduplicate.mjs", ...args], { cwd: dir, timeout: 10000,
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1", NODE_PATH: "" } }), code: 0 };
  } catch (error) { return { stdout: error.stdout, stderr: error.stderr, code: error.code }; }
}
function expectedReport(dataset) {
  const original = line => dataset.rows.find(row => row.line === line);
  return {
    kept: dataset.expected.kept.map(original),
    duplicates: dataset.expected.duplicates.map(({ line, keptLine }) => ({ record: original(line), keptLine })),
    conflicts: dataset.expected.conflicts.map(({ id, lines }) => ({ id, records: lines.map(original) })),
    totalHours: dataset.expected.totalHours,
  };
}
async function expectFailure(args, message) {
  await writeFile(join(dir, "old.json"), "KEEP OLD REPORT");
  const result = await node(args);
  expect(result.code, result.stderr).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toMatch(message);
  expect(await readFile(join(dir, "old.json"), "utf8")).toBe("KEEP OLD REPORT");
  return result;
}

describe("standalone Case 3 JSON workflow in real Node processes", () => {
  it("includes three independent files, exact checked code, and only the displayed sample", async () => {
    const code = independentSolution + '\n// ` ${text} </script> */ "quotes"';
    const files = await generate(code);
    expect(files.map(file => file.name)).toEqual(["deduplicate.mjs", sample, "README.md"]);
    expect(files[0].text).toContain(code);
    expect(files[0].text).not.toContain(exercise.solution.code);
    expect(JSON.parse(files[1].text)).toEqual(exercise.rows);
    for (const file of files) expect(file.text).not.toMatch(/NEW-9[012]|sameJobsNewOrder|doubledTotalsDatasets/);
    for (const concept of ["Node.js 24", "normal filesystem", "stdout", "stderr", "provenance", "conflicts", "3.5", "echo $?", "another-week.json"]) {
      expect(files[2].text).toContain(concept);
    }
    expect((await node([sample])).code).toBe(0);
  });

  for (const [algorithm, code] of [["Map", exercise.solution.code], ["per-occurrence", independentSolution]]) {
    it.each(exercise.checks)(`${algorithm} solution preserves the complete report for $name`, async dataset => {
      await generate(code);
      const text = JSON.stringify(dataset.rows, null, 2) + "\n";
      await writeFile(join(dir, "input.json"), text);
      const result = await node(["input.json"]);
      expect(result.code, result.stderr).toBe(0);
      const report = JSON.parse(result.stdout);
      expect(report).toEqual(expectedReport(dataset));
      const records = [...report.kept, ...report.duplicates.map(entry => entry.record), ...report.conflicts.flatMap(group => group.records)];
      expect(records.sort((a, b) => a.line - b.line)).toEqual(dataset.rows);
      expect(records.every(record => typeof record.id === "string")).toBe(true);
      expect(await readFile(join(dir, "input.json"), "utf8")).toBe(text);
    });
  }

  it("accepts BOM and carries provenance independently of JSON formatting", async () => {
    await generate();
    const rows = exercise.rows.map(row => ({ ...row, line: row.line * 17 }));
    await writeFile(join(dir, "input.json"), "\uFEFF" + JSON.stringify(rows));
    const result = await node(["input.json"]);
    expect(result.code, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.kept.map(row => row.line)).toEqual([34, 85, 136]);
    expect(report.duplicates.map(entry => entry.keptLine)).toEqual([34, 85]);
    expect(report.conflicts[0].records.map(row => row.line)).toEqual([51, 102, 153]);
  });

  it("separates all console messages from stdout and fully replaces a saved report", async () => {
    await generate(`console.log("loading"); globalThis.console.info("global");
${exercise.solution.code.replace("const groups =", 'console.debug("debug"); console.table([{value:1}]); console.warn("warn"); console.error("diagnostic"); const groups =')}`);
    const printed = await node([sample]);
    expect(printed.code, printed.stderr).toBe(0);
    expect(JSON.parse(printed.stdout)).toEqual(expectedReport(exercise.checks[0]));
    for (const message of ["loading", "global", "debug", "value", "warn", "diagnostic"]) expect(printed.stderr).toContain(message);
    await writeFile(join(dir, "report.json"), "long old report".repeat(1000));
    const saved = await node([sample, "report.json"]);
    expect(saved.code, saved.stderr).toBe(0);
    expect(saved.stdout).toBe("");
    expect(saved.stderr).toContain("Wrote 3 kept, 2 duplicates and 1 conflict groups");
    expect(JSON.parse(await readFile(join(dir, "report.json"), "utf8"))).toEqual(JSON.parse(printed.stdout));
  });

  it("protects every runner declaration from learner helper collisions", async () => {
    await generate(`const fs = 1, Console = 2, resolve = 3, rows = 4, report = 5, json = 6, args = 7, inputInfo = 8;
function runScript() {} function fileProblem() {} function validateDoubledTotalsInput() {} function validateDoubledTotalsReport() {}
const RECORD_FIELDS = [], hasFields = 1, sameJob = 2;
${exercise.solution.code}`);
    const result = await node([sample]);
    expect(result.code, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(expectedReport(exercise.checks[0]));
    expect((await node(["missing.json"])).stderr).toContain("file or parent folder not found");
  });

  it("reads and saves quoted paths containing spaces", async () => {
    await generate();
    await writeFile(join(dir, "weekly jobs.json"), JSON.stringify(exercise.rows));
    const result = await node(["weekly jobs.json", "weekly report.json"]);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toBe("");
    expect(JSON.parse(await readFile(join(dir, "weekly report.json"), "utf8"))).toEqual(expectedReport(exercise.checks[0]));
  });

  const invalidInputs = [
    ["malformed JSON", "[{]", /isn't valid JSON/],
    ...["null", "{}", '"text"', "42"].map(text => ["not an array: " + text, text, /JSON array/]),
    ...[
      [null, /exactly line/], [[], /exactly line/], [{}, /exactly line/],
      [{ ...exercise.rows[0], extra: 1 }, /exactly line/],
      [{ ...exercise.rows[0], line: "2" }, /line must/],
      [{ ...exercise.rows[0], line: 0 }, /line must/],
      [{ ...exercise.rows[0], line: 2.5 }, /line must/],
      [{ ...exercise.rows[0], line: 9007199254740992 }, /line must/],
      [{ ...exercise.rows[0], id: 110 }, /id must/],
      [{ ...exercise.rows[0], id: "" }, /id must/],
      [{ ...exercise.rows[0], id: " 00110" }, /id must/],
      [{ ...exercise.rows[0], status: "COMPLETE" }, /status must/],
      [{ ...exercise.rows[0], hours: "2" }, /hours must/],
      [{ ...exercise.rows[0], hours: null }, /hours must/],
      [{ ...exercise.rows[0], hours: -1 }, /hours must/],
      [{ ...exercise.rows[0], hours: 0.1 }, /hours must/],
      [{ ...exercise.rows[0], hours: 9007199254740992 }, /hours must/],
      [{ ...exercise.rows[0], notes: null }, /notes must/],
    ].map(([record, error], i) => ["invalid record " + i, JSON.stringify([record]), error]),
    ["nonfinite JSON number", '[{"line":2,"id":"a","status":"open","hours":1e309,"notes":""}]', /hours must/],
    ["duplicate provenance", JSON.stringify([exercise.rows[0], exercise.rows[0]]), /line must/],
    ["reversed provenance", JSON.stringify([...exercise.rows].reverse()), /line must/],
    ["unsafe combined hours", JSON.stringify([1, 2].map(line => ({ ...exercise.rows[0], line, hours: 2 ** 50 }))), /combined hours/],
  ];
  it.each(invalidInputs)("rejects %s without running learner code or touching output", async (_label, text, message) => {
    await generate('console.log("LEARNER RAN"); function transform() { throw new Error("LEARNER RAN"); }');
    await writeFile(join(dir, "bad.json"), text);
    const result = await expectFailure(["bad.json", "old.json"], message);
    expect(result.stderr).not.toContain("LEARNER RAN");
    expect(await readFile(join(dir, "bad.json"), "utf8")).toBe(text);
    expect((await node(["bad.json", "new.json"])).code).toBe(1);
    await expect(access(join(dir, "new.json"))).rejects.toThrow();
  });

  it.each(Object.entries(wrongSolutions))("refuses misleading %s reports without replacing old output", async (_name, code) => {
    await generate(code);
    // Some wrong algorithms happen to pass the sample. A checking fixture
    // that exposes that mistake must also fail in the real exported runner.
    let failed = false;
    for (const dataset of exercise.checks) {
      await writeFile(join(dir, "input.json"), JSON.stringify(dataset.rows));
      const result = await node(["input.json"]);
      if (result.code === 1) {
        await expectFailure(["input.json", "old.json"], /could not produce a valid report/);
        failed = true;
        break;
      }
    }
    expect(failed, _name).toBe(true);
  });

  const corruptReports = [
    ["extra report field", "report.extra = true;"],
    ["missing report total", "delete report.totalHours;"],
    ["duplicate link to later copy", "report.duplicates[0].keptLine = 4;"],
    ["string duplicate link", "report.duplicates[0].keptLine = '2';"],
    ["extra duplicate field", "report.duplicates[0].extra = true;"],
    ["changed original ID", "report.kept[0].id = '110';"],
    ["extra original field", "report.kept[0].extra = true;"],
    ["changed conflict evidence", "report.conflicts[0].records[0].notes = 'changed';"],
    ["missing conflict original", "report.conflicts[0].records.pop();"],
    ["repeated occurrence", "report.duplicates.push(report.duplicates[0]);"],
    ["split conflict", "report.conflicts.push({id:report.conflicts[0].id,records:report.conflicts[0].records.splice(1)});"],
    ["numeric conflict ID", "report.conflicts[0].id = 111;"],
    ["extra conflict field", "report.conflicts[0].extra = true;"],
    ["kept order", "report.kept.reverse();"],
    ["duplicate order", "report.duplicates.reverse();"],
    ["conflict record order", "report.conflicts[0].records.reverse();"],
    ["string total", "report.totalHours = '3.5';"],
    ["nonfinite total", "report.totalHours = Infinity;"],
  ];
  it.each(corruptReports)("rejects %s in the actual file runner", async (_label, corrupt) => {
    await generate(independentSolution.replace("function transform(rows)", "function classify(rows)") + `
function transform(rows) {
  const report = structuredClone(classify(rows));
  ${corrupt}
  return report;
}`);
    await expectFailure([sample, "old.json"], /Invalid report/);
    expect(JSON.parse(await readFile(join(dir, sample), "utf8"))).toEqual(exercise.rows);
  });

  it("rejects reversed conflict group order independently of occurrence order", async () => {
    await generate(independentSolution.replace("return { kept,", "conflicts.reverse(); return { kept,"));
    await writeFile(join(dir, "groups.json"), JSON.stringify(exercise.checks.find(dataset => dataset.id === "manyGroups").rows));
    await expectFailure(["groups.json", "old.json"], /conflict groups must follow/);
  });

  it.each([
    "function transform() { throw new Error('check this job'); }",
    "throw 'loading failed'; function transform() {}",
    "function other() {}",
    "function transform() { return null; }",
    "async function transform() { return {}; }",
    exercise.solution.code.replace("const groups =", 'rows[0].notes = "altered"; const groups ='),
    exercise.solution.code.replace("return { kept, duplicates, conflicts, totalHours };", "const r = { kept, duplicates, conflicts, totalHours }; Object.defineProperty(r, 'toJSON', { value() { throw new Error('serialization failed'); } }); return r;"),
    exercise.solution.code.replace("return { kept, duplicates, conflicts, totalHours };", "const r = { kept, duplicates, conflicts, totalHours }; Object.defineProperty(r, 'toJSON', { value() { return { kept: [], duplicates: [], conflicts: [], totalHours: 0 }; } }); return r;"),
  ])("leaves output unchanged on code, mutation and serialization failures", async code => {
    await generate(code);
    await expectFailure([sample, "old.json"], /Error:/);
    expect(JSON.parse(await readFile(join(dir, sample), "utf8"))).toEqual(exercise.rows);
  });

  it.each([[], ["--help"], [sample, "old.json", "extra"], [""]])("explains invalid arguments %j", async (...args) => {
    await generate();
    await expectFailure(args, /Usage: node deduplicate.mjs/);
  });
  it.each([
    [["absent.json"], /read input.*file or parent folder not found/],
    [["."], /read input.*regular JSON file/],
    [[sample, "absent/report.json"], /write output.*file or parent folder not found/],
    [[sample, "."], /write output.*it is a folder/],
  ])("explains filesystem failures %j", async (args, message) => {
    await generate(); await expectFailure(args, message);
  });

  it("handles real read and output permission failures", async () => {
    await generate();
    await chmod(join(dir, sample), 0o000);
    await expectFailure([sample, "old.json"], /permission denied or read-only/);
    await chmod(join(dir, sample), 0o600);
    await writeFile(join(dir, "locked.json"), "KEEP");
    await chmod(join(dir, "locked.json"), 0o400);
    await expectFailure([sample, "locked.json"], /write output.*permission denied or read-only/);
    expect(await readFile(join(dir, "locked.json"), "utf8")).toBe("KEEP");
  });
  it.each([sample, "./" + sample, "symlink.json", "hardlink.json"])("protects input reached through %s", async output => {
    await generate();
    const before = await readFile(join(dir, sample), "utf8");
    await symlink(join(dir, sample), join(dir, "symlink.json"));
    await link(join(dir, sample), join(dir, "hardlink.json"));
    await expectFailure([sample, output], /different file|points to the input/);
    expect(await readFile(join(dir, sample), "utf8")).toBe(before);
  });
});
