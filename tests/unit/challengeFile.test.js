import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildChallengeFile, solutionSection } from "../../src/export/challengeFile.js";
import { datasets } from "../../src/missions/missingJobs.fixtures.js";
import { missingJobsCase } from "../../src/missions/missingJobs.js";

const run = promisify(execFile);
const [main, variation] = missingJobsCase.exercises;
let dir;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "data-detective-challenge-"));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

// Same shape CaseView builds.
function challengeFor(exercise, request) {
  return {
    caseNumber: missingJobsCase.number,
    caseTitle: missingJobsCase.title,
    exerciseTitle: exercise.title,
    request,
    requestFrom: "Marisol Reyes, Operations Coordinator",
    goal: exercise.goal,
    rules: exercise.rules ?? missingJobsCase.rules,
    rows: exercise.rows,
  };
}
const mainChallenge = challengeFor(main, missingJobsCase.request);
const variationChallenge = challengeFor(variation, variation.brief);

async function runFile(text) {
  const file = join(dir, `challenge-${Math.random().toString(36).slice(2)}.js`);
  await writeFile(file, text);
  const { stdout } = await run(process.execPath, [file], { env: { ...process.env, FORCE_COLOR: "0" } });
  const [heading, ...json] = stdout.split("\n");
  expect(heading).toBe("transform(caseSampleRows) returned:");
  return JSON.parse(json.join("\n"));
}

// The comments are wrapped; join them back up to search phrases.
function flat(text) {
  return text.replace(/\n\/\/\s+/g, " ");
}

function sampleRowsIn(text) {
  return new Function("console", `${text}\nreturn caseSampleRows;`)({ log() {} });
}

describe("Copy to IDE file", () => {
  it("preserves the displayed dataset exactly", () => {
    const rows = sampleRowsIn(buildChallengeFile(mainChallenge, main.starterCode));
    expect(rows).toEqual(main.rows);
    expect(rows[3].status).toBe(" COMPLETE ");
    for (const row of rows) expect(typeof row.id).toBe("string");
  });

  it("keeps tabs, line breaks and quotes in values exactly", () => {
    const rows = [...datasets.whitespace.rows, { id: "J-9", status: 'say "done" `now`' }];
    const text = buildChallengeFile({ ...mainChallenge, rows }, main.starterCode);
    expect(sampleRowsIn(text)).toEqual(rows);
  });

  it("runs in Node and previews the starter code's output", async () => {
    const output = await runFile(buildChallengeFile(mainChallenge, main.starterCode));
    expect(output).toEqual([{ id: "J-102", status: "complete" }]);
  });

  it("contains the current draft, helpers included, as the paste-back section", async () => {
    const draft = `// my helper
function isComplete(row) {
  return row.status.trim().toLowerCase() === \`complete\`;
}

function transform(rows) {
  return rows.filter(isComplete);
}`;
    const text = buildChallengeFile(mainChallenge, draft);
    expect(text).toContain(draft);
    expect(solutionSection(text)).toContain(draft);
    expect(solutionSection(text)).not.toContain("caseSampleRows");
    expect(await runFile(text)).toHaveLength(3);
  });

  it("explains how to save, run and paste back", () => {
    const text = buildChallengeFile(mainChallenge, main.starterCode);
    expect(text).toContain("Save it as challenge.js");
    expect(text).toContain("node challenge.js");
    expect(text).toMatch(/VS Code or VSCodium/);
    expect(text).toMatch(/Leave out the sample data and the preview/);
    expect(text).toContain("YOUR SOLUTION: start copying here");
    expect(text).toContain("YOUR SOLUTION: stop copying here");
    expect(text).toMatch(/helper functions/);
  });

  it("uses the main exercise's request, goal and rules", () => {
    const text = flat(buildChallengeFile(mainChallenge, main.starterCode));
    expect(text).toContain("Case 1: The Missing Jobs");
    expect(text).toContain("Exercise: Find the completed jobs");
    expect(text).toContain("The weekly report says only one job is complete.");
    expect(text).toContain("Return every job whose status means complete");
    expect(text).toContain("A job is complete when its status is complete after removing");
  });

  it("uses the variation's own content and asks for open jobs", () => {
    const text = flat(buildChallengeFile(variationChallenge, variation.starterCode));
    expect(text).toContain("Exercise: Variation: the open jobs");
    expect(text).toContain("Return every job that is still open");
    expect(text).toContain("A job is open when its status is open");
    expect(text).toContain("filtered to the jobs that are still open");
    expect(text).not.toContain("A job is complete when");
    expect(text).toContain("// Return the jobs that are still open.");
  });

  it("never includes the reference solution, hints or extra datasets", () => {
    for (const [exercise, challenge] of [
      [main, mainChallenge],
      [variation, variationChallenge],
    ]) {
      const text = buildChallengeFile(challenge, exercise.starterCode);
      expect(text).not.toContain(exercise.solution.code.trim());
      expect(text).not.toMatch(/trim\(\)\.toLowerCase\(\)/);
      for (const hint of exercise.hints) expect(text).not.toContain(hint.slice(0, 40));
      for (const check of exercise.checks.slice(1)) {
        for (const row of check.rows) {
          if (!exercise.rows.some((r) => r.id === row.id)) expect(text).not.toContain(row.id);
        }
      }
    }
  });
});
