import { describe, expect, it } from "vitest";
import { messyExportCase } from "../../src/missions/messyExport.js";
import { allExercises, playableCases } from "../../src/missions/index.js";
import { runMessyExportChecks } from "../../src/checking/evaluateMessyExport.js";
import { buildChallengeFile } from "../../src/export/challengeFile.js";
import { sanitiseState } from "../../src/storage/progress.js";

const exercise = messyExportCase.exercises[0];
const catalogue = { cases: playableCases, exercises: allExercises };
const execute = (code, rows) => {
  const input = structuredClone(rows);
  const before = JSON.stringify(input);
  const output = new Function(`${code}; return transform;`)()(input);
  return { status: "ok", resultType: typeof output, output: JSON.parse(JSON.stringify(output)), mutated: before !== JSON.stringify(input) };
};

describe("playable Messy Export integration", () => {
  it("wires the explained solution to all 13 actual parsed checking datasets", async () => {
    expect(exercise.checks).toHaveLength(13);
    const result = await runMessyExportChecks(execute, exercise, exercise.solution.code);
    expect(result.passed).toBe(true);
    expect(result.results.every((r) => r.passed)).toBe(true);
  });

  it("the lesson solution rejects overflow even when hours use only digits", () => {
    const row = { line: 2, id: "000001", status: "open", hours: "9".repeat(400), notes: "" };
    const result = execute(exercise.solution.code, [row]);
    expect(result.output).toEqual({ accepted: [], rejected: [{ record: row, reasons: ["invalid-hours"] }] });
    expect(result.mutated).toBe(false);
  });

  it("keeps the exploratory starter incomplete", async () => {
    const result = await runMessyExportChecks(execute, exercise, exercise.starterCode.replace('console.log(row.line, row.id, row.hours);', ''));
    expect(result.passed).toBe(false);
    expect(exercise.exportFileName).toBe("report.mjs");
  });

  it("copies exact parsed rows, runnable starter and honest exercise scope", () => {
    const challenge = { caseNumber: 2, caseTitle: messyExportCase.title, exerciseTitle: exercise.title,
      request: messyExportCase.request, goal: exercise.goal, rules: exercise.rules, rows: exercise.rows, parsedRecords: true };
    const text = buildChallengeFile(challenge, exercise.starterCode);
    expect(text).toContain("It does not read a CSV file");
    expect(text).not.toContain(exercise.solution.code);
    const rows = new Function("console", `${text}\nreturn caseSampleRows;`)({ log() {} });
    expect(rows).toEqual(exercise.rows);
    expect(rows.find((r) => r.line === 7).notes).toContain("\n");
    expect(rows[0].id).toBe("004101");
  });

  it("adds Case 2 without altering a complete legacy Case 1 save", () => {
    const legacy = { draft: "my draft", previousDraft: "older", hintsShown: 2, solutionRevealed: true,
      solved: { code: "passing code", solvedAt: "2026-11-01T00:00:00.000Z", hintsUsed: 1, solutionRevealed: false } };
    const state = sanitiseState({ version: 1, cases: { "missing-jobs": { prediction: { value: 3 } } }, exercises: { "missing-jobs": legacy } }, catalogue);
    expect(state.exercises["missing-jobs"]).toEqual(legacy);
    expect(state.cases["missing-jobs"].prediction).toEqual({ value: 3 });
    expect(state.exercises["messy-export"].solved).toBeNull();
  });

  it.each([{ accepted: 4, rejected: 4 }, { skipped: true }])("restores Case 2 progress and prediction %j independently", (prediction) => {
    const state = sanitiseState(null, catalogue);
    const saved = { draft: "current", previousDraft: "earlier", hintsShown: 3, solutionRevealed: true,
      checked: { code: "current", passed: false },
      solved: { code: "passed earlier", solvedAt: "2026-11-08T00:00:00.000Z", hintsUsed: 2, solutionRevealed: true } };
    state.exercises[exercise.id] = saved;
    state.cases["messy-export"].prediction = prediction;
    expect(sanitiseState(state, catalogue)).toEqual(state);
  });

  it.each([{ accepted: "4", rejected: 4 }, { accepted: -1, rejected: 9 }, { value: 4 }])("discards invalid Case 2 prediction %j", (prediction) => {
    const state = sanitiseState({ version: 1, cases: { "messy-export": { prediction } } }, catalogue);
    expect(state.cases["messy-export"].prediction).toBeNull();
  });
});
