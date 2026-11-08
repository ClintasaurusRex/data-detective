// Case 2 checks fixture expectations, not a reference transformation or code text.
// A check is { id, name, rows, expected: { accepted, rejected: [{ line, reasons }] } }.
// Only successfully parsed CSV belongs here. File errors stay with the parser.
import { describeRunProblem, quote } from "./evaluate.js";

const FIELDS = ["line", "id", "status", "hours", "notes"];
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const hasKeys = (value, keys) => isObject(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

// These records contain primitive fields only. Strict comparison preserves types
// and distinguishes a missing field from an empty string. Key order is irrelevant.
function changedFields(actual, expected) {
  return FIELDS.filter((key) => !Object.hasOwn(actual, key) || actual[key] !== expected[key]);
}

export function evaluateMessyExportCheck(check, run, options) {
  const base = { id: check.id, name: check.name };
  const runProblem = describeRunProblem(run, options);
  if (runProblem) {
    return { ...base, passed: false, fatal: runProblem.fatal, summary: "Your code didn't produce a result.", problems: [runProblem] };
  }
  const output = run.output;
  if (run.resultType !== "object" || !hasKeys(output, ["accepted", "rejected"]) || !Array.isArray(output.accepted) || !Array.isArray(output.rejected)) {
    return {
      ...base, passed: false, fatal: false, summary: "The result needs two lists.",
      problems: [{ kind: "type", message: run.resultType === "undefined"
        ? "`transform` returned nothing. Did you forget `return { accepted, rejected }`?"
        : "Return an object with exactly two fields: `accepted` and `rejected`. Both must be arrays (lists)." }],
    };
  }

  const problems = [];
  const add = (kind, message, line) => problems.push({ kind, message, ...(line === undefined ? {} : { line }) });
  if (run.mutated) add("mutated", "Your code changed the input rows. Build new accepted records and keep rejected records unchanged.");
  const originals = new Map(check.rows.map((row) => [row.line, row]));
  const accepted = new Map(check.expected.accepted.map((row) => [row.line, row]));
  const rejected = new Map(check.expected.rejected.map((entry) => [entry.line, entry.reasons]));
  const counts = new Map();
  const positions = new Map(check.rows.map((row, index) => [row.line, index]));

  for (const group of ["accepted", "rejected"]) {
    let previousPosition = -1;
    for (const [index, entry] of output[group].entries()) {
      const record = group === "accepted" ? entry : entry?.record;
      if (!isObject(record)) {
        add("record-type", `Item ${index + 1} in \`${group}\` needs ${group === "accepted" ? "a record object" : "a `record` object and a `reasons` array"}.`);
        continue;
      }
      const line = record.line;
      if (!Number.isInteger(line) || !originals.has(line)) {
        add("unexpected", `Item ${index + 1} in \`${group}\` has file line ${quote(line)}, which isn't an input record. Keep the original numeric \`line\` value.`);
        continue;
      }
      counts.set(line, (counts.get(line) ?? 0) + 1);
      const position = positions.get(line);
      if (position < previousPosition) add("order", `File line ${line} is out of order in \`${group}\`. Keep records in their original file order.`, line);
      previousPosition = position;

      if (group === "accepted") {
        if (!hasKeys(record, FIELDS)) add("fields", `File line ${line}: accepted records need exactly these fields: ${FIELDS.join(", ")}.`, line);
        if (!Number.isFinite(record.hours)) add("hours", `File line ${line}: accepted hours must be a finite number, such as 0 or 3.5, not text, null, NaN or Infinity.`, line);
        const expected = accepted.get(line);
        if (!expected) {
          add("classification", `File line ${line} belongs in \`rejected\`, with reasons: ${rejected.get(line).join(", ")}.${rejected.get(line).includes("missing-hours") ? " Blank hours mean unknown, never zero." : ""}`, line);
        } else {
          for (const field of changedFields(record, expected)) {
            add("changed", `File line ${line}: \`${field}\` should be ${quote(expected[field])}, but got ${quote(record[field])}. Keep IDs as text and use the required cleaned values.`, line);
          }
        }
      } else {
        if (!hasKeys(entry, ["record", "reasons"])) add("fields", `File line ${line}: a rejected entry needs exactly \`record\` and \`reasons\`.`, line);
        if (!hasKeys(record, FIELDS) || changedFields(record, originals.get(line)).length) {
          add("changed-rejected", `File line ${line}: the rejected \`record\` was changed. Keep every original field and value, including spaces, blanks and text IDs.`, line);
        }
        const expectedReasons = rejected.get(line);
        if (!expectedReasons) add("classification", `File line ${line} belongs in \`accepted\`. Its values meet the case rules.`, line);
        if (!Array.isArray(entry.reasons)) {
          add("reasons", `File line ${line}: \`reasons\` must be an array of reason codes.`, line);
        } else if (expectedReasons && (entry.reasons.length !== expectedReasons.length || expectedReasons.some((reason, i) => entry.reasons[i] !== reason))) {
          add("reasons", `File line ${line}: expected reasons ${JSON.stringify(expectedReasons)}, but got ${JSON.stringify(entry.reasons)}. Include every reason once, in ID, status, hours order.`, line);
        }
      }
    }
  }
  for (const { line } of check.rows) {
    const count = counts.get(line) ?? 0;
    if (!count) add("missing", `File line ${line} is missing. Every input record must appear once in either list.`, line);
    if (count > 1) add("duplicate", `File line ${line} appears ${count} times. Put each input record in exactly one list, exactly once.`, line);
  }
  const passed = problems.length === 0;
  return {
    ...base, passed, fatal: false, problems,
    summary: passed
      ? `Correct: ${output.accepted.length} accepted and ${output.rejected.length} rejected.`
      : "Some records need attention. See the file lines below.",
    actualAcceptedCount: output.accepted.length,
    actualRejectedCount: output.rejected.length,
  };
}

// Same runner callback and lifecycle as Case 1, with Case 2's evaluator and note.
// Each call uses a fresh worker through the existing runner; no learner code is
// evaluated in this module. Validate all inputs before invoking learner code.
export async function runMessyExportChecks(runCode, exercise, code, { onProgress, timeoutSeconds } = {}) {
  if (!exercise.checks.length || exercise.checks.some((check) => !Array.isArray(check.rows))) {
    throw new TypeError("Case 2 checks require successfully parsed rows and at least one dataset. CSV errors must stop before validation.");
  }
  const results = [];
  for (const check of exercise.checks) {
    const run = await runCode(code, check.rows);
    if (run.status === "cancelled") return { status: "cancelled", passed: false, results, code };
    const result = evaluateMessyExportCheck(check, run, { timeoutSeconds });
    results.push(result);
    onProgress?.(results.length, exercise.checks.length);
    if (result.fatal) return { status: "done", passed: false, stoppedEarly: true, results, code };
  }
  const passed = results.every((result) => result.passed);
  const note = !passed && results[0]?.passed
    ? "Your code works on the case file but not every variation. Decide from each input record, rather than fixed job IDs, file lines or a typed-in answer."
    : null;
  return { status: "done", passed, stoppedEarly: false, results, code, note };
}
