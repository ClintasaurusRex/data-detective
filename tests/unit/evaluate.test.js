import { describe, expect, it } from "vitest";
import { describeRunProblem, evaluateCheck, runChecks } from "../../src/checking/evaluate.js";
import { missingJobsCase } from "../../src/missions/missingJobs.js";

const [completed, open] = missingJobsCase.exercises;

// Runs a transform in Node and returns the same shape as the sandbox runner,
// so the checker can be tested quickly. Real browser execution is covered by
// the Playwright tests.
function simulate(transform, rows) {
  const copy = structuredClone(rows);
  const before = JSON.stringify(copy);
  let result;
  try {
    result = transform(copy);
  } catch (error) {
    return { status: "error", logs: [], droppedLogs: 0, error: { stage: "run", name: error.name, message: error.message } };
  }
  const resultType = result === null ? "null" : Array.isArray(result) ? "array" : typeof result;
  const json = resultType === "undefined" || resultType === "function" ? null : JSON.stringify(result);
  return {
    status: "ok",
    resultType,
    mutated: JSON.stringify(copy) !== before,
    logs: [],
    droppedLogs: 0,
    hasOutput: json !== null,
    output: json === null ? undefined : JSON.parse(json),
  };
}

async function checkAll(transform, exercise = completed) {
  return runChecks(async (_code, rows) => simulate(transform, rows), exercise, "(simulated)");
}

function problemsFor(outcome, checkId) {
  return outcome.results.find((r) => r.id === checkId).problems.map((p) => p.message).join("\n");
}

const reference = (rows) => rows.filter((row) => row.status.trim().toLowerCase() === "complete");

describe("Case 1 datasets", () => {
  it("expected IDs match the case rules for every dataset", () => {
    for (const check of completed.checks) {
      expect(reference(check.rows).map((r) => r.id), check.name).toEqual(check.expectedIds);
    }
    for (const check of open.checks) {
      const ids = check.rows.filter((r) => r.status.trim().toLowerCase() === "open").map((r) => r.id);
      expect(ids, check.name).toEqual(check.expectedIds);
    }
  });

  it("covers the required variations", () => {
    const ids = completed.checks.map((c) => c.id);
    expect(ids).toEqual(["caseFile", "newIds", "reordered", "moreOpen", "mixedCase", "whitespace", "noneComplete"]);
    expect(completed.checks.find((c) => c.id === "noneComplete").expectedIds).toEqual([]);
  });

  it("keeps job IDs as strings and fixtures frozen", () => {
    for (const check of completed.checks) {
      for (const row of check.rows) expect(typeof row.id).toBe("string");
      expect(Object.isFrozen(check.rows)).toBe(true);
      expect(Object.isFrozen(check.rows[0])).toBe(true);
    }
  });
});

describe("acceptance check 2: record counts on the case file", () => {
  const caseFile = completed.checks[0].rows;
  it("starter finds 1, ignoring case finds 2, ignoring case and spaces finds 3", () => {
    expect(simulate((rows) => rows.filter((row) => row.status === "complete"), caseFile).output).toHaveLength(1);
    expect(simulate((rows) => rows.filter((row) => row.status.toLowerCase() === "complete"), caseFile).output).toHaveLength(2);
    expect(simulate(reference, caseFile).output.map((r) => r.id)).toEqual(["J-101", "J-102", "J-104"]);
  });
});

describe("correct alternative implementations pass", () => {
  const alternatives = {
    reference,
    "for...of loop": (rows) => {
      const out = [];
      for (const row of rows) if (row.status.trim().toLowerCase() === "complete") out.push(row);
      return out;
    },
    "regular expression": (rows) => rows.filter((row) => /^\s*complete\s*$/i.test(row.status)),
    "toUpperCase": (rows) => rows.filter((row) => row.status.trim().toUpperCase() === "COMPLETE"),
    "reduce": (rows) => rows.reduce((acc, row) => (row.status.trim().toLowerCase() === "complete" ? [...acc, row] : acc), []),
    "copies with the same content": (rows) => rows.filter((row) => row.status.trim().toLowerCase() === "complete").map((row) => ({ ...row })),
    "localeCompare": (rows) => rows.filter((row) => row.status.trim().localeCompare("complete", "en", { sensitivity: "accent" }) === 0),
  };
  for (const [name, transform] of Object.entries(alternatives)) {
    it(name, async () => {
      const outcome = await checkAll(transform);
      expect(outcome.results.filter((r) => !r.passed).map((r) => [r.name, r.problems])).toEqual([]);
      expect(outcome.passed).toBe(true);
    });
  }
});

describe("incorrect implementations fail with useful feedback", () => {
  it("the starter code lists the missing jobs", async () => {
    const outcome = await checkAll((rows) => rows.filter((row) => row.status === "complete"));
    expect(outcome.passed).toBe(false);
    expect(problemsFor(outcome, "caseFile")).toContain('Missing 2 jobs that should be included: J-101 (status "Complete"), J-104 (status " COMPLETE ")');
  });

  it("ignoring case but not spaces misses the padded status", async () => {
    const outcome = await checkAll((rows) => rows.filter((row) => row.status.toLowerCase() === "complete"));
    expect(problemsFor(outcome, "caseFile")).toContain('J-104 (status " COMPLETE ")');
    expect(problemsFor(outcome, "whitespace")).toContain("\\t");
  });

  it("hardcoded sample IDs fail on new data", async () => {
    const outcome = await checkAll((rows) => rows.filter((row) => ["J-101", "J-102", "J-104"].includes(row.id)));
    expect(outcome.results[0].passed).toBe(true);
    expect(outcome.passed).toBe(false);
    expect(problemsFor(outcome, "newIds")).toMatch(/Missing 3 jobs/);
    expect(outcome.note).toMatch(/not particular IDs or positions/);
  });

  it("a typed-in answer is called out as not coming from the input", async () => {
    const outcome = await checkAll(() => [
      { id: "J-101", status: "Complete" },
      { id: "J-102", status: "complete" },
      { id: "J-104", status: " COMPLETE " },
    ]);
    expect(outcome.results[0].passed).toBe(true);
    expect(problemsFor(outcome, "newIds")).toMatch(/"J-101", "J-102", "J-104", which aren't in this dataset/);
  });

  it("picking rows by position fails when the order changes", async () => {
    const outcome = await checkAll((rows) => [rows[0], rows[1], rows[3]]);
    expect(outcome.results.find((r) => r.id === "reordered").passed).toBe(false);
  });

  it('includes("complete") wrongly accepts "Incomplete"', async () => {
    const outcome = await checkAll((rows) => rows.filter((row) => row.status.toLowerCase().includes("complete")));
    expect(problemsFor(outcome, "moreOpen")).toContain('Included 2 jobs that should be left out: J-313 (status "Incomplete"), J-317 (status "Completed")');
  });

  it("prefix matching does not count Completed as complete", async () => {
    const outcome = await checkAll(rows => rows.filter(row => row.status.trim().toLowerCase().startsWith("complete")));
    expect(outcome.passed).toBe(false);
    expect(problemsFor(outcome, "moreOpen")).toContain('J-317 (status "Completed")');
  });

  it("changing the input rows is reported", async () => {
    const outcome = await checkAll((rows) =>
      rows.filter((row) => {
        row.status = row.status.trim().toLowerCase();
        return row.status === "complete";
      }),
    );
    expect(problemsFor(outcome, "caseFile")).toMatch(/changed the input rows/);
  });

  it("returning cleaned-up copies instead of the original records is reported", async () => {
    const outcome = await checkAll((rows) =>
      rows.map((row) => ({ ...row, status: row.status.trim().toLowerCase() })).filter((row) => row.status === "complete"),
    );
    expect(problemsFor(outcome, "caseFile")).toMatch(/J-101 was returned with different content/);
  });

  it("returning IDs instead of records is reported", async () => {
    const outcome = await checkAll((rows) => rows.filter((row) => row.status.trim().toLowerCase() === "complete").map((row) => row.id));
    expect(problemsFor(outcome, "caseFile")).toMatch(/item 1 is the text "J-101"/);
  });

  it("forgetting to return is reported", async () => {
    const outcome = await checkAll((rows) => {
      rows.filter((row) => row.status === "complete");
    });
    expect(problemsFor(outcome, "caseFile")).toMatch(/Did you forget the word `return`/);
  });

  it("wrong order is reported", async () => {
    const outcome = await checkAll((rows) => reference(rows).reverse());
    expect(problemsFor(outcome, "caseFile")).toMatch(/right records, but in a different order/);
  });

  it("duplicates are reported", async () => {
    const outcome = await checkAll((rows) => [...reference(rows), ...reference(rows)]);
    expect(problemsFor(outcome, "caseFile")).toMatch(/J-101 \(2 times\)/);
  });

  it("an empty answer passes only the empty dataset", async () => {
    const outcome = await checkAll(() => []);
    expect(outcome.results.filter((r) => r.passed).map((r) => r.id)).toEqual(["noneComplete"]);
  });
});

describe("run problems", () => {
  it("stops the check early on fatal problems", async () => {
    const outcome = await runChecks(
      async () => ({ status: "error", logs: [], error: { stage: "load", name: "SyntaxError", message: "Unexpected token ')'", line: 2 } }),
      completed,
      "x",
    );
    expect(outcome.stoppedEarly).toBe(true);
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0].problems[0].message).toMatch(/^Syntax error on line 2: Unexpected token '\)'/);
  });

  it("describes timeouts, thrown errors and missing functions", () => {
    expect(describeRunProblem({ status: "timeout" }).message).toMatch(/still running after 2 seconds/);
    const thrown = describeRunProblem({
      status: "error",
      error: { stage: "run", name: "TypeError", message: "Cannot read properties of undefined (reading 'trim')", line: 3 },
    });
    expect(thrown.fatal).toBe(false);
    expect(thrown.message).toMatch(/^TypeError on line 3: Cannot read properties/);
    expect(describeRunProblem({ status: "error", error: { stage: "load", name: "Missing function" } }).message).toMatch(/function named `transform`/);
  });

  it("a cancelled check is reported as cancelled", async () => {
    const outcome = await runChecks(async () => ({ status: "cancelled" }), completed, "x");
    expect(outcome.status).toBe("cancelled");
  });

  it("evaluateCheck explains a non-array result", () => {
    const result = evaluateCheck(completed.checks[0], { status: "ok", resultType: "number", output: 3, logs: [] });
    expect(result.problems[0].message).toMatch(/returned a number, but the report needs an array/);
  });
});
