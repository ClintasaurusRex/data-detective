import { execFile, spawn } from "node:child_process";
import { access, chmod, link, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, expect, it } from "vitest";
import { buildTwoExportsWorkflow } from "../../src/export/twoExportsWorkflow.js";
import { twoExportsCase } from "../../src/missions/twoExports.js";
import { expectedOutput, independentSolution, wrongSolutions } from "../support/twoExports.js";

const exec = promisify(execFile), exercise = twoExportsCase.exercises[0];
const sample = ["orders.json", "field-reports.json"];
let dir;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), "two-exports-")); });
afterEach(async () => { await chmod(dir, 0o700); await rm(dir, { recursive: true, force: true }); });
async function generate(code = exercise.solution.code) {
  const files = buildTwoExportsWorkflow(exercise, { code });
  for (const file of files) await writeFile(join(dir, file.name), file.text);
  return files;
}
async function node(args) {
  try { return { ...await exec(process.execPath, ["reconcile.mjs", ...args], { cwd: dir, timeout: 10000,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1", NODE_PATH: "" } }), code: 0 }; }
  catch (error) { return { stdout: error.stdout, stderr: error.stderr, code: error.code }; }
}
async function failure(args, message) {
  const result = await node(args);
  expect(result.code, result.stderr).toBe(1); expect(result.stdout).toBe(""); expect(result.stderr).toMatch(message);
  expect(await readFile(join(dir, "old.json"), "utf8")).toBe("KEEP OLD REPORT");
  return result;
}
beforeEach(async () => { await writeFile(join(dir, "old.json"), "KEEP OLD REPORT"); });

it("exports exactly four files, exact checked code and only displayed sample evidence", async () => {
  const code = independentSolution + '\n// ` ${text} </script> */ "quotes"';
  const files = await generate(code);
  expect(files.map(f => f.name)).toEqual(["reconcile.mjs", ...sample, "README.md"]);
  expect(files[0].text).toContain(code); expect(files[0].text).not.toContain(exercise.solution.code);
  expect(JSON.parse(files[1].text)).toEqual(exercise.orders);
  expect(JSON.parse(files[2].text)).toEqual(exercise.fieldReports);
  for (const f of files) expect(f.text).not.toMatch(/DEC-99|twoExportsDatasets|farApart/);
  for (const text of ["Node.js 24", "no npm install", "normal filesystem permissions", "stdout", "stderr", "source-scoped", "weekly-report.json", "echo $?", "7", "6"]) expect(files[3].text.toLowerCase()).toContain(text.toLowerCase());
  expect((await node(sample)).code).toBe(0);
});
for (const [algorithm, code] of [["Map", exercise.solution.code], ["search", independentSolution]]) {
  it.each(exercise.checks)(algorithm + " executes complete $name report without changing either input", async dataset => {
    await generate(code);
    for (const [index, source] of [dataset.orders, dataset.fieldReports].entries()) await writeFile(join(dir, sample[index]), JSON.stringify(source));
    const result = await node(sample);
    expect(result.code, result.stderr).toBe(0); expect(JSON.parse(result.stdout)).toEqual(expectedOutput(dataset));
    for (const [index, source] of [dataset.orders, dataset.fieldReports].entries()) expect(await readFile(join(dir, sample[index]), "utf8")).toBe(JSON.stringify(source));
  });
}
const row = exercise.orders[0];
const badInputs = [
  ["malformed", "[{]", /isn't valid JSON/], ["overflow", '[{"line":2,"id":"x","site":"x","status":"open","hours":1e309}]', /hours must/],
  ...[null, {}, 4, "text"].map(value => ["nonarray " + JSON.stringify(value), JSON.stringify(value), /JSON array/]),
  ...[null, {}, [], { ...row, extra: 1 }, ...["line", "id", "site", "status", "hours"].map(key => { const r = { ...row }; delete r[key]; return r; })].map((value, i) => ["shape " + i, JSON.stringify([value]), /expected exactly/]),
  ...[
    ["line", "2"], ["line", 0], ["line", -1], ["line", 1.25], ["line", 2 ** 53],
    ["id", 71], ["id", ""], ["id", " "], ["id", " x"], ["id", "x "],
    ["site", null], ["site", "\t"], ["status", "Complete"], ["status", "closed"],
    ["hours", "2"], ["hours", null], ["hours", -0.25], ["hours", 0.1], ["hours", 2 ** 53],
  ].map(([key, value]) => [key + " " + value, JSON.stringify([{ ...row, [key]: value }]), new RegExp(key + " must")]),
  ["repeated line", JSON.stringify([row, row]), /line must/],
  ["reversed lines", JSON.stringify([...exercise.orders].reverse()), /line must/],
];
for (const index of [0, 1]) {
  it.each(badInputs)(`rejects source ${index} %s before loading learner code`, async (_label, text, message) => {
    await generate('console.log("LEARNER RAN"); function reconcile() { throw new Error("LEARNER RAN"); }');
    await writeFile(join(dir, sample[index]), text);
    expect((await failure([...sample, "old.json"], message)).stderr).not.toContain("LEARNER RAN");
    expect(await readFile(join(dir, sample[index]), "utf8")).toBe(text);
    expect((await node([...sample, "new.json"])).code).toBe(1);
    await expect(access(join(dir, "new.json"))).rejects.toThrow();
  });
}
it("accepts BOM, exact duplicates and same provenance in separate files without cleaning", async () => {
  await generate();
  const a = [{ ...row, line: 11, site: " X " }, { ...row, line: 14, site: " X " }];
  await writeFile(join(dir, sample[0]), "\uFEFF" + JSON.stringify(a));
  await writeFile(join(dir, sample[1]), JSON.stringify([a[0]]));
  const result = await node(sample); expect(result.code, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout).ambiguous).toEqual([{ id: row.id, orders: a, fieldReports: [a[0]] }]);
});
it("keeps lexical/global console routes separate and helper declarations isolated", async () => {
  await generate(`const fs=1, Console=2, constants=3, resolve=4, dirname=5, join=6;
function runScript() {} function readSource() {} function saveReport() {} function checkOutput() {}
function fileProblem() {} function validateTwoExportsInput() {} function validateTwoExportsReport() {}
const RECORD_FIELDS=[], CATEGORIES=[], COUNTS=[];
console.log("loading"); globalThis.console.info("global"); console.debug("debug"); console.table([{value:1}]); console.warn("warn"); console.error("error log");
${independentSolution}`);
  const result = await node(sample); expect(result.code, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual(expectedOutput(exercise.checks[0]));
  for (const text of ["loading", "global", "debug", "value", "warn", "error log"]) expect(result.stderr).toContain(text);
});
it("saves formatted JSON atomically, including paths with spaces", async () => {
  await generate(); await writeFile(join(dir, "weekly orders.json"), JSON.stringify(exercise.orders));
  const result = await node(["weekly orders.json", sample[1], "old.json"]);
  expect(result.code, result.stderr).toBe(0); expect(result.stdout).toBe(""); expect(result.stderr).toContain("Wrote");
  const text = await readFile(join(dir, "old.json"), "utf8"); expect(text).toBe(JSON.stringify(expectedOutput(exercise.checks[0]), null, 2) + "\n");
  expect((await readdir(dir)).filter(n => n.startsWith(".data-detective-"))).toEqual([]);
});
for (const [label, corrupt] of [
  ["extra field", "report.extra=1"], ["missing field", "delete report.agreed"], ["array type", "report.onlyOrders={}"],
  ["pair source roles", "[report.agreed[0].order,report.agreed[0].fieldReport]=[report.agreed[0].fieldReport,report.agreed[0].order]"],
  ["pair ID", "report.agreed[0].fieldReport.id='no'"], ["record content", "report.agreed[0].order.site='changed'"],
  ["record extra field", "report.agreed[0].order.extra=1"], ["pair extra field", "report.agreed[0].extra=1"],
  ["missing original", "report.onlyOrders=[]"], ["repeated original", "report.onlyOrders.push(report.onlyOrders[0])"],
  ["wrong classification", "report.onlyOrders.push(report.differences.pop().order)"],
  ["pair order", "report.agreed.reverse()"], ["differences order", "report.differences.reverse()"],
  ["wrong difference", "report.differences[0].fields=['site']"], ["duplicate field", "report.differences[0].fields.push('hours')"],
  ["ambiguous missing copy", "report.ambiguous[0].orders.pop()"], ["ambiguous order", "report.ambiguous[0].orders.reverse()"],
  ["ambiguous ID", "report.ambiguous[0].id='unknown'"], ["ambiguous shape", "report.ambiguous[0].extra=1"],
  ["summary", "report.summary.orders=0"], ["string count", "report.summary.agreed='2'"], ["extra summary", "report.summary.extra=1"],
]) it("rejects " + label + " without replacing existing report", async () => {
  await generate(independentSolution.replace("function reconcile(", "function classify(") + `
function reconcile(orders, fieldReports) { const report=structuredClone(classify(orders,fieldReports)); ${corrupt}; return report; }`);
  await failure([...sample, "old.json"], /Invalid report/);
});
it.each(Object.entries(wrongSolutions))("rejects misleading %s algorithm on arbitrary files", async (_name, code) => {
  await generate(code); let rejected = false;
  for (const dataset of exercise.checks) {
    await writeFile(join(dir, sample[0]), JSON.stringify(dataset.orders)); await writeFile(join(dir, sample[1]), JSON.stringify(dataset.fieldReports));
    const result = await node([...sample, "old.json"]);
    if (result.code === 1) { await failure([...sample, "old.json"], /valid report/); rejected = true; break; }
    // A valid earlier dataset can replace output; restore the sentinel.
    await writeFile(join(dir, "old.json"), "KEEP OLD REPORT");
  }
  expect(rejected, _name).toBe(true);
});
it.each([
  "throw 'loading failed'; function reconcile() {}", "function reconcile() { throw new Error('job failed'); }", "function other() {}",
  "function reconcile() { return null; }", "async function reconcile() { return {}; }",
  independentSolution.replace("const agreed=[]", "orders[0].site='changed'; const agreed=[]"),
  independentSolution.replace("const agreed=[]", "fieldReports.reverse(); const agreed=[]"),
  independentSolution.replace("return {agreed,", "const result={agreed,").replace("ambiguous:ambiguous.length}};", "ambiguous:ambiguous.length}}; Object.defineProperty(result,'toJSON',{value(){throw new Error('serialization failed')}}); return result;"),
  independentSolution.replace("return {agreed,", "const result={agreed,").replace("ambiguous:ambiguous.length}};", "ambiguous:ambiguous.length}}; Object.defineProperty(result,'toJSON',{value(){return {}}}); return result;"),
])("rejects code, mutation or serialization failures", async code => { await generate(code); await failure([...sample, "old.json"], /valid report/); });
it.each([[], [sample[0]], [...sample, "old.json", "extra"], ["", sample[1]], ["--help", sample[1]]])("explains invalid arguments %j", async (...args) => {
  await generate(); await failure(args, /Usage: node reconcile.mjs/);
});
it.each([
  [["missing.json", sample[1]], /read input.*not found/], [[sample[0], "missing.json"], /read input.*not found/],
  [[".", sample[1]], /regular JSON file/], [[sample[0], "."], /regular JSON file/],
  [[...sample, "missing/report.json"], /write output.*not found/], [[...sample, "."], /write output.*regular output file/],
])("explains filesystem errors %j", async (args, message) => { await generate(); await failure(args, message); });
for (const index of [0, 1]) for (const alias of ["same", "resolved", "symlink", "hardlink"]) {
  it(`protects source ${index} via ${alias}`, async () => {
    await generate(); const path = sample[index], before = await readFile(join(dir, path), "utf8");
    const output = alias === "same" ? path : alias === "resolved" ? "./" + path : "alias.json";
    if (alias === "symlink") await symlink(join(dir, path), join(dir, output));
    if (alias === "hardlink") await link(join(dir, path), join(dir, output));
    await failure([...sample, output], /different file|points to an input/);
    expect(await readFile(join(dir, path), "utf8")).toBe(before);
  });
}
it("protects input aliases even when inputs themselves are symlinks or hard links", async () => {
  await generate(); await symlink(join(dir, sample[0]), join(dir, "left-link.json")); await link(join(dir, sample[1]), join(dir, "right-link.json"));
  await failure(["left-link.json", "right-link.json", sample[0]], /points to an input/);
  await failure(["left-link.json", "right-link.json", sample[1]], /points to an input/);
});
it("refuses dangling/unrelated output symlinks without changing targets", async () => {
  await generate(); await symlink(join(dir, "absent.json"), join(dir, "dangling.json"));
  await failure([...sample, "dangling.json"], /Output symlinks/);
  await symlink(join(dir, "old.json"), join(dir, "linked.json")); await failure([...sample, "linked.json"], /Output symlinks/);
});
it("handles actual input and output permission failures", async () => {
  await generate();
  for (const path of sample) {
    await chmod(join(dir, path), 0); await failure([...sample, "old.json"], /permission denied/); await chmod(join(dir, path), 0o600);
  }
  await chmod(join(dir, "old.json"), 0o400); await failure([...sample, "old.json"], /permission denied/);
  await chmod(join(dir, "old.json"), 0o600);
  await mkdir(join(dir, "locked"), { mode: 0o500 });
  try { await failure([...sample, "locked/report.json"], /permission denied/); }
  finally { await chmod(join(dir, "locked"), 0o700); }
});
it("keeps old output when the learner process is interrupted during preparation", async () => {
  await generate('function reconcile() { console.error("READY"); while (true) {} }');
  const child = spawn(process.execPath, ["reconcile.mjs", ...sample, "old.json"], { cwd: dir });
  let stdout = ""; child.stdout.on("data", data => { stdout += data; });
  const closed = new Promise(resolve => child.on("close", (code, signal) => resolve({ code, signal })));
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("process did not prepare")); }, 5000);
    child.stderr.on("data", data => { if (data.toString().includes("READY")) { clearTimeout(timer); child.kill("SIGTERM"); resolve(); } });
    child.on("error", reject);
  });
  expect((await closed).signal).toBe("SIGTERM"); expect(stdout).toBe("");
  expect(await readFile(join(dir, "old.json"), "utf8")).toBe("KEEP OLD REPORT");
});

it("preserves an existing report on an actual mid-write filesystem failure", async () => {
  await generate();
  // Limit only the child process's output file size. The genuine runner must
  // fail while writing its staged file, never truncate the destination.
  const result = await exec("bash", ["-c", 'ulimit -f 1\nexec "$@"', "limited-node", process.execPath, "reconcile.mjs", ...sample, "old.json"], { cwd: dir }).then(
    value => ({ ...value, failed: false }), error => ({ ...error, failed: true }));
  expect(result.failed).toBe(true); expect(result.stdout).toBe("");
  expect(result.signal === "SIGXFSZ" || /EFBIG|file too large/i.test(result.stderr)).toBe(true);
  expect(await readFile(join(dir, "old.json"), "utf8")).toBe("KEEP OLD REPORT");
});

it.each([
  ["Several differences", "report.differences.at(-1).fields.reverse()"],
  ["Repeats in both exports", "report.ambiguous.reverse()"],
  ["Field only", "report.onlyFieldReports.reverse()"],
  ["Scheduling only", "report.onlyOrders.reverse()"],
])("rejects ordering corruption in %s", async (name, corrupt) => {
  await generate(independentSolution.replace("function reconcile(", "function classify(") + `
function reconcile(orders, fieldReports) { const report=classify(orders,fieldReports); ${corrupt}; return report; }`);
  const dataset = exercise.checks.find(c => c.name === name);
  await writeFile(join(dir, sample[0]), JSON.stringify(dataset.orders));
  await writeFile(join(dir, sample[1]), JSON.stringify(dataset.fieldReports));
  await failure([...sample, "old.json"], /Invalid report/);
});

it("rejects a report that mutates input during serialization", async () => {
  await generate(independentSolution.replace("function reconcile(", "function classify(") + `
function reconcile(orders, fieldReports) {
  const result=structuredClone(classify(orders,fieldReports));
  Object.defineProperty(result,'toJSON',{value(){orders[0].site='changed'; return {...result};}});
  return result;
}`);
  await failure([...sample, "old.json"], /changed an input while preparing/);
});
