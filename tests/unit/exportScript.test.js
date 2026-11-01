import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildNodeScript, buildSampleJson } from "../../src/export/nodeScript.js";
import { missingJobsCase } from "../../src/missions/missingJobs.js";

const run = promisify(execFile);
const [completed] = missingJobsCase.exercises;
let dir;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "data-detective-export-"));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

function script(code) {
  return buildNodeScript({
    code,
    caseNumber: 1,
    caseTitle: "The Missing Jobs",
    exerciseTitle: completed.title,
    fileName: "solve.mjs",
    checkedAt: "2026-11-01",
  });
}

async function node(args) {
  try {
    const { stdout, stderr } = await run(process.execPath, args, { cwd: dir });
    return { code: 0, stdout, stderr };
  } catch (error) {
    return { code: error.code, stdout: error.stdout, stderr: error.stderr };
  }
}

describe("exported Node script", () => {
  beforeAll(async () => {
    await writeFile(join(dir, "solve.mjs"), script(completed.solution.code));
    await writeFile(join(dir, "sample.json"), buildSampleJson(completed.rows));
  });

  it("reads sample.json and prints the expected records", async () => {
    const result = await node(["solve.mjs", "sample.json"]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([
      { id: "J-101", status: "Complete" },
      { id: "J-102", status: "complete" },
      { id: "J-104", status: " COMPLETE " },
    ]);
  });

  it("gives the same answer as the transformation on every dataset", async () => {
    const transform = new Function(`${completed.solution.code}; return transform;`)();
    for (const check of completed.checks) {
      await writeFile(join(dir, "data.json"), JSON.stringify(check.rows));
      const result = await node(["solve.mjs", "data.json"]);
      expect(JSON.parse(result.stdout), check.name).toEqual(transform(structuredClone(check.rows)));
    }
  });

  it("saves to a file when given an output path", async () => {
    const result = await node(["solve.mjs", "sample.json", "result.json"]);
    expect(result.stdout).toMatch(/Wrote 3 record\(s\) to result.json/);
    expect(JSON.parse(await readFile(join(dir, "result.json"), "utf8"))).toHaveLength(3);
  });

  it("explains a missing argument", async () => {
    const result = await node(["solve.mjs"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/Tell me which JSON file to read/);
  });

  it("explains a missing file", async () => {
    const result = await node(["solve.mjs", "nope.json"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/Couldn't find "nope.json"/);
  });

  it("explains invalid JSON", async () => {
    await writeFile(join(dir, "broken.json"), '[{"id": "J-1", "status": "Open"},]');
    const result = await node(["solve.mjs", "broken.json"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/"broken.json" isn't valid JSON/);
  });

  it("explains input that isn't an array", async () => {
    await writeFile(join(dir, "object.json"), '{"id": "J-1", "status": "Open"}');
    const result = await node(["solve.mjs", "object.json"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/should contain a JSON array .* but it contains an object/);
  });

  it("accepts a file that starts with a byte order mark", async () => {
    await writeFile(join(dir, "bom.json"), "﻿" + buildSampleJson(completed.rows));
    const result = await node(["solve.mjs", "bom.json"]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toHaveLength(3);
  });

  it("keeps learner code with quotes, backticks and script tags intact", async () => {
    const tricky = `// Notes: "double", 'single', \`backtick \${not.a.template}\`, </script><script>alert(1)</script> */
function transform(rows) {
  const label = \`done: \${"</script>"}\`;
  const word = 'complete';
  /* a block comment with "quotes" */
  return rows.filter(row => row.status.trim().toLowerCase() === word && label.length > 0);
}`;
    const source = script(tricky);
    expect(source).toContain(tricky);
    await writeFile(join(dir, "tricky.mjs"), source);
    const result = await node(["tricky.mjs", "sample.json"]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).map((r) => r.id)).toEqual(["J-101", "J-102", "J-104"]);
  });

  it("reports an error thrown by transform", async () => {
    await writeFile(join(dir, "throws.mjs"), script("function transform(rows) { return rows.map(r => r.missing.value); }"));
    const result = await node(["throws.mjs", "sample.json"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/stopped with an error/);
  });
});
