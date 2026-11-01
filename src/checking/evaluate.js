// Turns runner results into plain-language feedback.
//
// Checking compares *behaviour*: the records the learner's code actually
// returned for each dataset, against that dataset's expected IDs. It never
// compares code text with a reference solution, so any correct approach passes.

const MAX_LISTED = 4;

export function quote(value) {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function listIds(records) {
  const shown = records.slice(0, MAX_LISTED).map((r) => `${r.id} (status ${quote(r.status)})`);
  const more = records.length - shown.length;
  return shown.join(", ") + (more > 0 ? `, and ${more} more` : "");
}

function where(error) {
  if (!error || !error.line) return "";
  return error.atEnd ? " near the end of your code" : ` on line ${error.line}`;
}

function runtimeTip(error) {
  const message = error.message || "";
  if (/Cannot read properties of (undefined|null)/.test(message)) {
    return " Something your code used was missing. Check the spelling of names such as `rows`, `row` and `status`.";
  }
  if (/is not a function/.test(message)) {
    return " Check the method name and its capital letters, for example `toLowerCase`, and that you're calling it on a string.";
  }
  if (/is not defined/.test(message)) {
    return " Check the spelling, and that the name is declared (for example with `const`) before it's used.";
  }
  if (/Maximum call stack/.test(message)) {
    return " A function seems to call itself without stopping.";
  }
  return "";
}

// Feedback for a run that didn't produce a result. Returns null if it did.
// `fatal` means the same problem will happen for every dataset.
export function describeRunProblem(run, { timeoutSeconds = 2 } = {}) {
  if (run.status === "timeout") {
    return {
      kind: "timeout",
      fatal: true,
      message: `Your code was still running after ${timeoutSeconds} seconds, so it was stopped. Look for a loop that never ends.`,
    };
  }
  if (run.status === "cancelled") {
    return { kind: "cancelled", fatal: true, message: "The run was stopped before it finished." };
  }
  if (run.status !== "error") return null;
  const error = run.error || {};
  if (error.stage === "runner") {
    return { kind: "runner", fatal: true, message: error.message || "The code runner had a problem. Try again." };
  }
  if (error.stage === "result") {
    return { kind: "result", fatal: false, message: error.message };
  }
  if (error.name === "Missing function") {
    return {
      kind: "missing-function",
      fatal: true,
      message: "Couldn't find a function named `transform`. Keep that name so the report (and the checker) can call it.",
    };
  }
  if (error.name === "SyntaxError") {
    const atEnd = error.atEnd ? " Something may be missing at the end, such as `}` or `)`." : "";
    return {
      kind: "syntax",
      fatal: true,
      line: error.line,
      message: `Syntax error${where(error)}: ${error.message}. JavaScript couldn't read the code, so nothing ran. Look for a missing bracket, quote or comma.${atEnd}`,
    };
  }
  if (error.stage === "load") {
    return {
      kind: "load",
      fatal: true,
      line: error.line,
      message: `${error.name}${where(error)} while loading your code: ${error.message}.${runtimeTip(error)}`,
    };
  }
  return {
    kind: "thrown",
    fatal: false,
    line: error.line,
    message: `${error.name}${where(error)}: ${error.message}.${runtimeTip(error)}`,
  };
}

export function describeResultType(type) {
  switch (type) {
    case "array":
      return null;
    case "undefined":
      return "`transform` returned nothing (`undefined`). Did you forget the word `return`?";
    case "promise":
      return "`transform` returned a Promise. This case doesn't need `async` or `await`.";
    case "function":
      return "`transform` returned a function. Return the array that `filter` gives you instead.";
    default:
      return `\`transform\` returned ${type === "object" || type === "array" ? "an" : "a"} ${type}, but the report needs an array (a list) of job records.`;
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function describeItem(value) {
  if (value === null) return "`null`";
  if (Array.isArray(value)) return "an array";
  if (typeof value === "string") return `the text ${quote(value)}`;
  return `a ${typeof value} (${quote(value)})`;
}

// Same keys and same values, in any key order.
export function sameRecord(a, b) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => Object.hasOwn(b, key) && JSON.stringify(a[key]) === JSON.stringify(b[key]));
}

// Evaluate one dataset's run. `check` is { id, name, rows, expectedIds }.
export function evaluateCheck(check, run, options) {
  const base = { id: check.id, name: check.name, expectedIds: check.expectedIds };
  const expectedCount = check.expectedIds.length;
  const runProblem = describeRunProblem(run, options);
  if (runProblem) {
    return { ...base, passed: false, fatal: runProblem.fatal, summary: "Your code didn't produce a result.", problems: [runProblem] };
  }
  const typeProblem = describeResultType(run.resultType);
  if (typeProblem) {
    return { ...base, passed: false, fatal: false, summary: "The result isn't a list of records.", problems: [{ kind: "type", message: typeProblem }] };
  }

  const output = Array.isArray(run.output) ? run.output : [];
  const problems = [];
  if (run.mutated) {
    problems.push({
      kind: "mutated",
      message:
        "Your code changed the input rows. For example, `row.status = row.status.trim()` changes the record itself. Compare a cleaned-up copy instead, and leave the records as they are.",
    });
  }

  const inputById = new Map(check.rows.map((row) => [row.id, row]));
  const expected = new Set(check.expectedIds);
  const notRecords = [];
  const unknown = [];
  const changed = [];
  const counts = new Map();
  for (const [index, item] of output.entries()) {
    if (!isRecord(item)) {
      notRecords.push(`item ${index + 1} is ${describeItem(item)}`);
      continue;
    }
    const original = inputById.get(item.id);
    if (!original) {
      unknown.push(item.id === undefined ? `item ${index + 1} (no id)` : quote(item.id));
      continue;
    }
    counts.set(item.id, (counts.get(item.id) || 0) + 1);
    if (!sameRecord(item, original)) changed.push({ item, original });
  }

  if (notRecords.length) {
    problems.push({
      kind: "not-records",
      message: `The result should contain whole job records (objects like \`{ id, status }\`), but ${notRecords.slice(0, MAX_LISTED).join("; ")}.`,
    });
  }
  if (unknown.length) {
    problems.push({
      kind: "unknown",
      message: `The result includes ${unknown.slice(0, MAX_LISTED).join(", ")}, which ${unknown.length === 1 ? "isn't" : "aren't"} in this dataset. Results have to come from the rows passed in; a list typed in by hand won't work on next week's export.`,
    });
  }
  for (const { item, original } of changed.slice(0, 2)) {
    problems.push({
      kind: "changed",
      message: `${original.id} was returned with different content: ${JSON.stringify(item)} instead of the original ${JSON.stringify(original)}. Return the original records unchanged.`,
    });
  }
  const duplicates = [...counts].filter(([, count]) => count > 1);
  if (duplicates.length) {
    problems.push({
      kind: "duplicates",
      message: `Some jobs appear more than once: ${duplicates.map(([id, count]) => `${id} (${count} times)`).join(", ")}.`,
    });
  }
  const missing = check.rows.filter((row) => expected.has(row.id) && !counts.has(row.id));
  if (missing.length) {
    problems.push({ kind: "missing", message: `Missing ${plural(missing.length, "job")} that should be included: ${listIds(missing)}.` });
  }
  const unexpected = check.rows.filter((row) => !expected.has(row.id) && counts.has(row.id));
  if (unexpected.length) {
    problems.push({ kind: "unexpected", message: `Included ${plural(unexpected.length, "job")} that should be left out: ${listIds(unexpected)}.` });
  }
  if (!problems.length) {
    const actualOrder = output.map((item) => item.id);
    if (actualOrder.join("\u0000") !== check.expectedIds.join("\u0000")) {
      problems.push({
        kind: "order",
        message: `These are the right records, but in a different order (${actualOrder.join(", ")}). Keep them in the same order as the input: ${check.expectedIds.join(", ")}.`,
      });
    }
  }

  const passed = problems.length === 0;
  let summary;
  if (passed) summary = expectedCount === 0 ? "Correct: no records, as expected." : `Correct: all ${plural(expectedCount, "record")}.`;
  else summary = `Expected ${plural(expectedCount, "record")}, got ${output.length}.`;
  return { ...base, passed, fatal: false, summary, problems, actualCount: output.length };
}

// Run every dataset for an exercise through `runCode(code, rows)` and
// evaluate each one. Stops early when a problem would repeat for every
// dataset (syntax error, timeout, missing function).
export async function runChecks(runCode, exercise, code, { onProgress, timeoutSeconds } = {}) {
  const results = [];
  for (const check of exercise.checks) {
    const run = await runCode(code, check.rows);
    if (run.status === "cancelled") return { status: "cancelled", passed: false, results, code };
    const result = evaluateCheck(check, run, { timeoutSeconds });
    results.push(result);
    onProgress?.(results.length, exercise.checks.length);
    if (result.fatal) return { status: "done", passed: false, stoppedEarly: true, results, code };
  }
  const passed = results.every((r) => r.passed);
  let note = null;
  if (!passed && results[0]?.passed) {
    note =
      "Your code works on the case file but not on every variation. Make sure it decides using each row's status, not particular IDs or positions in the list.";
  }
  return { status: "done", passed, stoppedEarly: false, results, code, note };
}
