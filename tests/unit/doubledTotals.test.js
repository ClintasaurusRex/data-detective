import { describe, expect, it } from "vitest";
import { doubledTotalsDatasets } from "../../src/missions/doubledTotals.fixtures.js";
import { doubledTotalsCase } from "../../src/missions/doubledTotals.js";
import { evaluateDoubledTotalsCheck, runDoubledTotalsChecks } from "../../src/checking/evaluateDoubledTotals.js";
import { independentSolution, wrongSolutions } from "../support/doubledTotals.js";
import { allExercises, playableCases } from "../../src/missions/index.js";
import { sanitiseState } from "../../src/storage/progress.js";
import { buildChallengeFile } from "../../src/export/challengeFile.js";

const exercise = doubledTotalsCase.exercises[0];
const main = exercise.checks[0];
function execute(code, rows) {
  const input = structuredClone(rows);
  const before = JSON.stringify(input);
  try {
    const output = new Function("console", '"use strict";\n' + code + "\n;return transform;")({ log() {} })(input);
    return { status: "ok", resultType: Array.isArray(output) ? "array" : typeof output,
      output: output === undefined ? undefined : JSON.parse(JSON.stringify(output)), mutated: before !== JSON.stringify(input) };
  } catch (error) { return { status:"error",error:{stage:"run",name:error.name,message:error.message} }; }
}
function expectedOutput(check) {
  const original = line => check.rows.find(row => row.line === line);
  return { kept: check.expected.kept.map(original),
    duplicates: check.expected.duplicates.map(({line, keptLine}) => ({ record: original(line), keptLine })),
    conflicts: check.expected.conflicts.map(({id, lines}) => ({ id, records: lines.map(original) })), totalHours: check.expected.totalHours };
}
function runOutput(output) { return { status: "ok", resultType: "object", output, mutated: false }; }

describe("Doubled Totals data contract", () => {
  it.each(Object.entries(doubledTotalsDatasets))("%s has immutable valid evidence and an independently verified answer", (_id, dataset) => {
    expect(Object.isFrozen(dataset)).toBe(true);
    expect(Object.isFrozen(dataset.rows)).toBe(true);
    let previous = 0;
    for (const row of dataset.rows) {
      expect(Object.isFrozen(row)).toBe(true);
      expect(Object.keys(row).sort()).toEqual(["hours", "id", "line", "notes", "status"]);
      expect(typeof row.id).toBe("string"); expect(row.id.trim()).toBe(row.id); expect(row.id).not.toBe("");
      expect(Number.isInteger(row.line) && row.line > previous).toBe(true); previous = row.line;
      expect(["open", "complete", "on hold"]).toContain(row.status);
      expect(typeof row.notes).toBe("string");
      expect(Number.isFinite(row.hours) && row.hours >= 0 && Number.isInteger(row.hours * 4)).toBe(true);
    }
    const expected = expectedOutput(dataset);
    expect(execute(independentSolution, dataset.rows).output).toEqual(expected);
    const occurrences = [...expected.kept, ...expected.duplicates.map(d => d.record), ...expected.conflicts.flatMap(g => g.records)];
    expect(occurrences.map(row => row.line).sort((a,b) => a-b)).toEqual(dataset.rows.map(row => row.line));
    expect(expected.totalHours).toBe(expected.kept.reduce((sum, row) => sum + row.hours, 0));
    expect(occurrences.reduce((sum, row) => sum + row.hours, 0)).toBe(dataset.rows.reduce((sum, row) => sum + row.hours, 0));
  });

  it("documents the raw case total, duplicate hours and unresolved hours separately", () => {
    const result = expectedOutput(main);
    expect(main.rows.reduce((s, r) => s+r.hours, 0)).toBe(17);
    expect(result.totalHours).toBe(3.5);
    expect(result.duplicates.reduce((s,d) => s+d.record.hours,0)).toBe(3.5);
    expect(result.conflicts.flatMap(g => g.records).reduce((s,r) => s+r.hours,0)).toBe(10);
    expect(result.conflicts[0].records.map(row => row.line)).toEqual([3,6,9]);
  });
});

describe("Doubled Totals behavioural checker", () => {
  it.each([exercise.solution.code, independentSolution])("accepts a correct algorithm on every dataset without mutation", async code => {
    const result = await runDoubledTotalsChecks(execute, exercise, code);
    expect(result.passed).toBe(true);
    expect(result.results).toHaveLength(17);
    for (const dataset of exercise.checks) expect(execute(code, dataset.rows).mutated).toBe(false);
  });
  it("accepts equal copied originals and any object key order", () => {
    const reverseKeys = value => Array.isArray(value) ? value.map(reverseKeys) : value && typeof value === "object"
      ? Object.fromEntries(Object.entries(value).reverse().map(([key, v]) => [key, reverseKeys(v)])) : value;
    expect(evaluateDoubledTotalsCheck(main, runOutput(reverseKeys(expectedOutput(main)))).passed).toBe(true);
  });
  it.each(Object.entries(wrongSolutions))("rejects the wrong approach: %s", async (_name, code) => {
    const result = await runDoubledTotalsChecks(execute, exercise, code);
    expect(result.passed).toBe(false);
    expect(result.results.some(r => !r.passed && r.problems.length)).toBe(true);
  });
  it("rejects hardcoded case answers on next week's export", async () => {
    const result = await runDoubledTotalsChecks(execute, exercise, `function transform() { return ${JSON.stringify(expectedOutput(main))}; }`);
    expect(result.results[0].passed).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.note).toContain("fixed lines");
  });
  it.each([undefined, null, [], 1, "report", {}, {kept: [], duplicates: [], conflicts: []}, {kept: null, duplicates: [], conflicts: [], totalHours: 0}])("explains wrong return shape %j", output => {
    const result = evaluateDoubledTotalsCheck(main, runOutput(output));
    expect(result.passed).toBe(false); expect(result.problems[0].kind).toBe("type");
  });
  const changes = {
    "extra top-level field": o => { o.extra = true; },
    "lost record": o => { o.kept.pop(); },
    "fabricated line": o => { o.kept[0].line = 1000; },
    "numeric line as text": o => { o.kept[0].line = "2"; },
    "changed ID": o => { o.kept[0].id = "110"; },
    "extra original field": o => { o.kept[0].extra = true; },
    "changed notes in conflict": o => { o.conflicts[0].records[0].notes = "changed"; },
    "conflict record lost": o => { o.conflicts[0].records.pop(); },
    "duplicate occurrence counted twice": o => { o.duplicates.push(o.duplicates[0]); },
    "kept record counted twice": o => { o.kept.push(o.kept[0]); },
    "duplicate link to later copy": o => { o.duplicates[0].keptLine = 4; },
    "text duplicate link": o => { o.duplicates[0].keptLine = "2"; },
    "duplicate wrong shape": o => { o.duplicates[0].extra = true; },
    "null duplicate": o => { o.duplicates[0] = null; },
    "null kept": o => { o.kept[0] = null; },
    "kept order reversed": o => { o.kept.reverse(); },
    "duplicates order reversed": o => { o.duplicates.reverse(); },
    "conflict record order reversed": o => { o.conflicts[0].records.reverse(); },
    "split conflict group": o => { o.conflicts.push({id:o.conflicts[0].id,records:o.conflicts[0].records.splice(1)}); },
    "unknown conflict ID": o => { o.conflicts[0].id = "UNKNOWN"; },
    "numeric conflict ID": o => { o.conflicts[0].id = 111; },
    "conflict wrong shape": o => { o.conflicts[0].extra = true; },
    "null conflict": o => { o.conflicts[0] = null; },
    "null conflict records": o => { o.conflicts[0].records = null; },
    "text total": o => { o.totalHours = "3.5"; },
    "infinite total": o => { o.totalHours = Infinity; },
    "wrong total": o => { o.totalHours = 17; },
    "rounded total": o => { o.totalHours = 4; },
    "zero conflicts counted but kept correct": o => { o.totalHours = 0; },
  };
  it.each(Object.entries(changes))("rejects %s with understandable feedback", (_name, change) => {
    const output = structuredClone(expectedOutput(main)); change(output);
    const result = evaluateDoubledTotalsCheck(main, runOutput(output));
    expect(result.passed).toBe(false);
    expect(result.problems.every(p => typeof p.message === "string" && p.message.length > 15)).toBe(true);
  });
  it("checks conflict group order independently from record order", () => {
    const check = exercise.checks.find(c => c.id === "manyGroups");
    const output = structuredClone(expectedOutput(check)); output.conflicts.reverse();
    expect(evaluateDoubledTotalsCheck(check, runOutput(output)).problems.some(p => p.kind === "group-order")).toBe(true);
  });
  it("rejects input mutation even when the output is correct", () => {
    const result = evaluateDoubledTotalsCheck(main, {...runOutput(expectedOutput(main)), mutated:true});
    expect(result.problems[0].kind).toBe("mutated");
    const code = independentSolution.replace("const kept =", 'rows[0].notes = "changed"; const kept =');
    expect(execute(code, main.rows).mutated).toBe(true);
  });
  it("points to the original job and line when conflict versions are kept", async () => {
    const result = await runDoubledTotalsChecks(execute, exercise, wrongSolutions["first record wins"]);
    expect(result.results[0].problems.map(p => p.message).join(" ")).toContain('Job "00111", file line 3 belongs in conflict');
  });
  it("reports progress, cancellation, fatal errors and dataset-specific errors", async () => {
    const progress = [];
    await runDoubledTotalsChecks(execute, exercise, independentSolution, {onProgress:(done,total) => progress.push([done,total])});
    expect(progress).toEqual(exercise.checks.map((_,i) => [i+1,17]));
    const cancelled = await runDoubledTotalsChecks(() => ({status:"cancelled"}), exercise, "code");
    expect(cancelled.status).toBe("cancelled"); expect(cancelled.results).toEqual([]);
    const timeout = await runDoubledTotalsChecks(() => ({status:"timeout"}), exercise, "code");
    expect(timeout.stoppedEarly).toBe(true); expect(timeout.results).toHaveLength(1);
    const runtime = await runDoubledTotalsChecks(() => ({status:"error",error:{stage:"run",name:"TypeError",message:"bad row",line:3}}), exercise, "code");
    expect(runtime.results).toHaveLength(17);
    expect(runtime.results[0].problems[0].message).toContain("line 3");
  });
  it("refuses an empty checking suite", async () => {
    await expect(runDoubledTotalsChecks(execute, {checks:[]}, "code")).rejects.toThrow("at least one");
  });
});

describe("Case 3 integration contracts", () => {
  const catalogue = {cases:playableCases, exercises:allExercises};
  it("is playable without earlier solves and requires passing checks before a file Toolbox export", async () => {
    expect(playableCases.map(c => c.id)).toEqual(["missing-jobs","messy-export","doubled-totals"]);
    expect(exercise.exportFileName).toBe("deduplicate.mjs");
    expect((await runDoubledTotalsChecks(execute,exercise,exercise.starterCode)).passed).toBe(false);
    expect(sanitiseState(null,catalogue).exercises[exercise.id].solved).toBeNull();
  });
  it.each([{value:3.5},{value:0},{skipped:true}])("preserves fractional Case 3 predictions and both previous missions %j", prediction => {
    const old = sanitiseState(null,catalogue);
    for (const id of ["missing-jobs","missing-jobs-open","messy-export"]) {
      old.exercises[id] = {...old.exercises[id], draft:`draft ${id}`, hintsShown:1, solved:{code:`checked ${id}`,solvedAt:"2026-11-09T00:00:00Z",hintsUsed:1,solutionRevealed:false}};
    }
    old.cases["missing-jobs"].prediction={value:3}; old.cases["messy-export"].prediction={accepted:4,rejected:4};
    old.cases[exercise.id].prediction=prediction;
    old.exercises[exercise.id] = {...old.exercises[exercise.id],draft:"changed", previousDraft:"earlier",hintsShown:2,solutionRevealed:true,checked:{code:"failed",passed:false},solved:{code:"passed",solvedAt:"2026-11-09T00:00:00Z",hintsUsed:1,solutionRevealed:true}};
    expect(sanitiseState(old,catalogue)).toEqual(old);
  });
  it.each([{value:"3.5"},{value:-1},{value:0.1},{value:Infinity},{value:1001},{accepted:3,rejected:5}])("rejects invalid prediction %j", prediction => {
    expect(sanitiseState({version:1,cases:{[exercise.id]:{prediction}}},catalogue).cases[exercise.id].prediction).toBeNull();
  });
  it("Copy to IDE contains exact displayed evidence and draft without reference or hidden inputs", () => {
    const text = buildChallengeFile({caseNumber:3,caseTitle:doubledTotalsCase.title,exerciseTitle:exercise.title,
      request:doubledTotalsCase.request,goal:exercise.goal,rules:exercise.rules,rows:exercise.rows}, exercise.starterCode);
    expect(text).toContain(exercise.starterCode); expect(text).not.toContain(exercise.solution.code);
    expect(text).not.toContain("NEW-90");
    const rows = new Function("console", text + "\nreturn caseSampleRows;")({log(){}});
    expect(rows).toEqual(exercise.rows);
  });
});
