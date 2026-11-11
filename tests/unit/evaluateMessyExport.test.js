import { describe, expect, it, vi } from "vitest";
import { evaluateMessyExportCheck, runMessyExportChecks } from "../../src/checking/evaluateMessyExport.js";
import { rowsFromCsv } from "../../src/missions/messyExport.contract.js";
import { datasets } from "../../src/missions/messyExport.fixtures.js";

// Only valid CSV fixtures are adapted to checks. Malformed files stay in csv.test.js.
const checks = Object.entries(datasets).map(([id, dataset]) => {
  const parsed = rowsFromCsv(dataset.csv);
  if (!parsed.ok) throw new Error(`Unexpected CSV error in ${id}`);
  return { id, name: dataset.name, rows: parsed.rows, expected: dataset.expected };
});
const exercise = { checks };
const find = (id) => checks.find((check) => check.id === id);
function expectedOutput(check) {
  return structuredClone({
    accepted: check.expected.accepted,
    rejected: check.expected.rejected.map(({ line, reasons }) => ({ record: check.rows.find((row) => row.line === line), reasons })),
  });
}
const ok = (output) => ({ status: "ok", resultType: output === null ? "null" : Array.isArray(output) ? "array" : typeof output, output });
function evaluate(id, change) {
  const check = find(id);
  const output = expectedOutput(check);
  change(output);
  return evaluateMessyExportCheck(check, ok(output));
}
function hasProblem(result, kind, line) {
  expect(result.passed).toBe(false);
  expect(result.problems).toEqual(expect.arrayContaining([expect.objectContaining({ kind, ...(line === undefined ? {} : { line }) })]));
}

// Test-only learner code. The production checker never imports a solution.
const learnerCode = `function clean(row) {
  return { line: row.line, id: row.id.trim(), status: row.status.trim().toLowerCase(), hours: Number(row.hours.trim()), notes: row.notes };
}
function reasonsFor(row) {
  const reasons = [];
  if (!row.id.trim()) reasons.push("missing-id");
  const status = row.status.trim().toLowerCase();
  if (!status) reasons.push("missing-status");
  else if (!["open", "complete", "on hold"].includes(status)) reasons.push("invalid-status");
  const hours = row.hours.trim();
  if (!hours) reasons.push("missing-hours");
  else if (!/^\\d+(\\.\\d+)?$/.test(hours) || !Number.isFinite(Number(hours))) reasons.push("invalid-hours");
  return reasons;
}
`;
const loopSolution = learnerCode + `function transform(rows) {
  const accepted = [], rejected = [];
  for (const row of rows) {
    const reasons = reasonsFor(row);
    if (reasons.length) rejected.push({ record: row, reasons });
    else accepted.push(clean(row));
  }
  return { accepted, rejected };
}`;
const reduceSolution = learnerCode + `function transform(rows) {
  return rows.reduce((result, row) => {
    const reasons = reasonsFor(row);
    if (reasons.length) result.rejected.push({ reasons, record: { ...row } });
    else result.accepted.push(clean(row));
    return result;
  }, { rejected: [], accepted: [] });
}`;
function simulate(code, rows) {
  const input = structuredClone(rows);
  const before = JSON.stringify(input);
  try {
    const transform = new Function('"use strict";\n' + code + '\nreturn transform;')();
    const output = transform(input);
    const run = ok(output);
    // Mirror the runner's JSON transport, including non-finite numbers -> null.
    return { ...run, output: output === undefined ? undefined : JSON.parse(JSON.stringify(output)), mutated: JSON.stringify(input) !== before };
  } catch (error) {
    return { status: "error", error: { stage: "run", name: error.name, message: error.message } };
  }
}
const runAll = (code) => runMessyExportChecks(async (source, rows) => simulate(source, rows), exercise, code);

describe("Case 2 checker: valid fixture answers", () => {
  it.each(checks)("$id: accepts the hand-written expected output", (check) => {
    expect(evaluateMessyExportCheck(check, ok(expectedOutput(check))).passed).toBe(true);
  });
  it.each([loopSolution, reduceSolution])("accepts different actual implementations across all 13 datasets", async (code) => {
    const result = await runAll(code);
    expect(result.results).toHaveLength(13);
    expect(result.results.filter((r) => !r.passed)).toEqual([]);
    expect(result.passed).toBe(true);
  });
  it("accepts empty arrays only when all input records are accounted for", () => {
    expect(evaluateMessyExportCheck(find("headerOnly"), ok({ accepted: [], rejected: [] })).passed).toBe(true);
    hasProblem(evaluateMessyExportCheck(find("caseFile"), ok({ accepted: [], rejected: [] })), "missing", 2);
  });
  it("uses file lines when IDs are blank or repeated", () => {
    const check = { id: "repeated", name: "Repeated IDs", rows: [
      { line: 4, id: "", status: "open", hours: "1", notes: "" },
      { line: 7, id: "", status: "open", hours: "2", notes: "" },
    ], expected: { accepted: [], rejected: [{ line: 4, reasons: ["missing-id"] }, { line: 7, reasons: ["missing-id"] }] } };
    expect(evaluateMessyExportCheck(check, ok(expectedOutput(check))).passed).toBe(true);
  });
});

describe("Case 2 checker: incorrect behaviour", () => {
  it("rejects hardcoded results across datasets even when the sample passes", async () => {
    const result = await runAll(`function transform() { return ${JSON.stringify(expectedOutput(find("caseFile")))}; }`);
    expect(result.results[0].passed).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.note).toMatch(/fixed job IDs, file lines/);
  });
  it("detects dropped rejected rows", () => hasProblem(evaluate("caseFile", (out) => { out.rejected = []; }), "missing", 3));
  it("rejects blank hours becoming zero through an actual incorrect transform", async () => {
    const code = loopSolution.replace('if (!hours) reasons.push("missing-hours");', 'if (!hours) { /* incorrectly accept blanks */ }');
    const result = await runAll(code);
    hasProblem(result.results[0], "classification", 3);
    expect(result.results[0].problems.find((p) => p.line === 3).message).toMatch(/unknown, never zero/);
  });
  it.each(["Number(hours)", "parseFloat(hours)"])("rejects overly permissive conversion: %s", async (conversion) => {
    const code = loopSolution.replace('!/^\\d+(\\.\\d+)?$/.test(hours) || !Number.isFinite(Number(hours))', `!Number.isFinite(${conversion}) || ${conversion} < 0`);
    const result = await runAll(code);
    hasProblem(result.results.find((r) => r.id === "numbers"), "classification");
  });
  it("detects lost leading zeros", () => hasProblem(evaluate("leadingZeros", (out) => { out.accepted[0].id = String(Number(out.accepted[0].id)); }), "changed", 2));
  it("the actual checking datasets reject syntax-only conversion overflow", async () => {
    const result = await runAll(loopSolution.replace(' || !Number.isFinite(Number(hours))', ''));
    hasProblem(result.results.find(r => r.id === "numbers"), "classification", 20);
    expect(result.passed).toBe(false);
  });
  it.each([
    ["missing", (reasons) => reasons.slice(1)],
    ["reordered", (reasons) => [...reasons].reverse()],
    ["extra", (reasons) => [...reasons, "unknown-reason"]],
    ["duplicate", (reasons) => [...reasons, reasons[0]]],
    ["wrong", () => ["missing-hours"]],
    ["not an array", () => "missing-id"],
  ])("detects %s reasons", (_name, change) => {
    hasProblem(evaluate("multipleProblems", (out) => { out.rejected[0].reasons = change(out.rejected[0].reasons); }), "reasons", 2);
  });
  it("detects an accepted record incorrectly rejected", () => {
    hasProblem(evaluate("caseFile", (out) => { const record = out.accepted.shift(); out.rejected.unshift({ record, reasons: ["invalid-hours"] }); }), "classification", 2);
  });
  it("detects duplicates within a list", () => hasProblem(evaluate("caseFile", (out) => { out.accepted.push(out.accepted[0]); }), "duplicate", 2));
  it("detects the same line in both lists", () => hasProblem(evaluate("caseFile", (out) => { out.rejected.push({ record: find("caseFile").rows[0], reasons: [] }); }), "duplicate", 2));
  it("detects missing accepted records", () => hasProblem(evaluate("caseFile", (out) => { out.accepted.shift(); }), "missing", 2));
  it("detects unexpected file lines", () => hasProblem(evaluate("caseFile", (out) => { out.accepted[0].line = 999; }), "unexpected"));
  it.each(["accepted", "rejected"])("detects wrong %s order", (group) => hasProblem(evaluate("caseFile", (out) => { out[group].reverse(); }), "order"));
  it("detects cleaned rejected content", () => hasProblem(evaluate("caseFile", (out) => { out.rejected[0].record.status = "open"; }), "changed-rejected", 3));
  it("rejects input mutation even when the output is otherwise correct", async () => {
    const code = loopSolution + '\nconst original = transform; transform = rows => { const result = original(rows); rows[0].notes = "changed"; return result; };';
    hasProblem((await runAll(code)).results[0], "mutated");
    expect(find("caseFile").rows[0].notes).toBe("Replaced meter");
  });
  it.each(["id", "status", "hours", "notes", "line"])("checks accepted %s values and types", (field) => {
    const result = evaluate("caseFile", (out) => { out.accepted[0][field] = field === "line" ? "2" : null; });
    expect(result.passed).toBe(false);
    expect(result.problems.some((p) => p.kind === "changed" || p.kind === "unexpected")).toBe(true);
  });
  it.each([NaN, Infinity, -Infinity, null, "3.5"])("rejects invalid accepted hours %s", (hours) => hasProblem(evaluate("caseFile", (out) => { out.accepted[0].hours = hours; }), "hours", 2));
  it("rejects digit strings whose conversion overflows, without altering fixtures", async () => {
    const row = { line: 2, id: "01", status: "open", hours: "9".repeat(400), notes: "" };
    const check = { id: "overflow", name: "Overflow", rows: [row], expected: { accepted: [], rejected: [{ line: 2, reasons: ["invalid-hours"] }] } };
    expect(evaluateMessyExportCheck(check, simulate(loopSolution, check.rows)).passed).toBe(true);
    const noFiniteCheck = loopSolution.replace(' || !Number.isFinite(Number(hours))', '');
    hasProblem(evaluateMessyExportCheck(check, simulate(noFiniteCheck, check.rows)), "classification", 2);
    hasProblem(evaluateMessyExportCheck(check, simulate(noFiniteCheck, check.rows)), "hours", 2);
  });
});

describe("Case 2 checker: output structure and run lifecycle", () => {
  it.each([undefined, null, [], "result", 3, true, {}, { accepted: [] }, { accepted: {}, rejected: [] }, { accepted: [], rejected: null }, { accepted: [], rejected: [], extra: true }])("rejects wrong output structure: %j", (output) => {
    hasProblem(evaluateMessyExportCheck(find("caseFile"), ok(output)), "type");
  });
  it.each([
    ["accepted", null, "record-type"], ["rejected", null, "record-type"],
    ["rejected", { record: 3, reasons: [] }, "record-type"],
    ["accepted", { ...find("caseFile").expected.accepted[0], extra: true }, "fields"],
    ["rejected", { record: find("caseFile").rows[1], reasons: ["missing-hours"], extra: true }, "fields"],
    ["rejected", { record: { ...find("caseFile").rows[1], extra: true }, reasons: ["missing-hours"] }, "changed-rejected"],
  ])("rejects malformed %s entries", (group, entry, kind) => hasProblem(evaluate("caseFile", (out) => { out[group][0] = entry; }), kind));
  it("rejects missing accepted fields", () => hasProblem(evaluate("caseFile", (out) => { delete out.accepted[0].notes; }), "fields", 2));
  it("runs every dataset with the exact code and reports progress", async () => {
    const runner = vi.fn(async (code, rows) => simulate(code, rows));
    const progress = vi.fn();
    const result = await runMessyExportChecks(runner, exercise, reduceSolution, { onProgress: progress });
    expect(result.passed).toBe(true);
    expect(result.code).toBe(reduceSolution);
    expect(runner).toHaveBeenCalledTimes(13);
    checks.forEach((check, i) => expect(runner).toHaveBeenNthCalledWith(i + 1, reduceSolution, check.rows));
    expect(progress).toHaveBeenLastCalledWith(13, 13);
  });
  it.each([
    { status: "timeout" },
    { status: "error", error: { stage: "load", name: "SyntaxError", message: "bad syntax", line: 2 } },
    { status: "error", error: { stage: "load", name: "Missing function" } },
    { status: "error", error: { stage: "runner", message: "Unavailable" } },
  ])("reuses fatal run feedback and stops early: %j", async (run) => {
    const runner = vi.fn(async () => run);
    const result = await runMessyExportChecks(runner, exercise, "code", { timeoutSeconds: 3 });
    expect(result.stoppedEarly).toBe(true);
    expect(result.passed).toBe(false);
    expect(runner).toHaveBeenCalledTimes(1);
    expect(result.results[0].problems[0].message.length).toBeGreaterThan(10);
  });
  it("continues after dataset-specific errors", async () => {
    const runner = vi.fn(async (code, rows) => simulate(code, rows));
    runner.mockResolvedValueOnce({ status: "error", error: { stage: "run", name: "Error", message: "oops", line: 4 } });
    const result = await runMessyExportChecks(runner, exercise, loopSolution);
    expect(result.stoppedEarly).toBe(false);
    expect(result.results).toHaveLength(13);
    expect(result.passed).toBe(false);
  });
  it("stops on cancellation", async () => {
    const runner = vi.fn(async () => ({ status: "cancelled" }));
    expect(await runMessyExportChecks(runner, exercise, "code")).toMatchObject({ status: "cancelled", passed: false, results: [] });
    expect(runner).toHaveBeenCalledTimes(1);
  });
  it("does not invoke learner code when a check lacks parsed rows", async () => {
    const runner = vi.fn();
    await expect(runMessyExportChecks(runner, { checks: [checks[0], { rows: null }] }, "code")).rejects.toThrow(/CSV errors must stop/);
    expect(runner).not.toHaveBeenCalled();
    await expect(runMessyExportChecks(runner, { checks: [] }, "code")).rejects.toThrow(/at least one dataset/);
  });
});
