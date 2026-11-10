// Compare behaviour with handwritten fixture expectations. No reference solver.
import { describeRunProblem, quote } from "./evaluate.js";

const FIELDS = ["line", "id", "status", "hours", "notes"];
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const keys = (value, names) => object(value) && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));

export function evaluateDoubledTotalsCheck(check, run, options) {
  const base = { id: check.id, name: check.name };
  const problem = describeRunProblem(run, options);
  if (problem) return { ...base, passed: false, fatal: problem.fatal, summary: "Your code didn't produce a result.", problems: [problem] };
  const output = run.output;
  if (run.resultType !== "object" || !keys(output, ["kept", "duplicates", "conflicts", "totalHours"]) ||
      ![output.kept, output.duplicates, output.conflicts].every(Array.isArray)) {
    return { ...base, passed: false, fatal: false, summary: "Return the three audit lists and a total.", problems: [{ kind: "type",
      message: "Return exactly `{ kept, duplicates, conflicts, totalHours }`: three arrays and a numeric total. If nothing was returned, check your return statement." }] };
  }
  const problems = [];
  const add = (kind, message) => problems.push({ kind, message });
  if (run.mutated) add("mutated", "Your code changed the input. Group the originals without editing records or sorting the input array.");
  const originals = new Map(check.rows.map(row => [row.line, row]));
  const expected = check.expected;
  const roles = new Map(expected.kept.map(line => [line, "kept"]));
  const links = new Map(expected.duplicates.map(entry => [entry.line, entry.keptLine]));
  for (const { line } of expected.duplicates) roles.set(line, "duplicates");
  for (const group of expected.conflicts) for (const line of group.lines) roles.set(line, `conflict ${quote(group.id)}`);
  const counts = new Map();

  function record(value, role) {
    if (!object(value)) { add("record-type", `An item in ${role} needs a whole original record, including its numeric file line.`); return; }
    const original = originals.get(value.line);
    if (!Number.isInteger(value.line) || !original) {
      add("unexpected", `File line ${quote(value.line)} in ${role} isn't an input occurrence. Preserve original numeric lines; don't invent records.`);
      return;
    }
    const { line, id } = original;
    counts.set(line, (counts.get(line) ?? 0) + 1);
    if (!keys(value, FIELDS) || FIELDS.some(field => value[field] !== original[field])) {
      add("changed", `Job ${quote(id)}, file line ${line}: preserve every original field and value. IDs are exact strings; notes and provenance must stay unchanged.`);
    }
    if (roles.get(line) !== role) {
      add("classification", `Job ${quote(id)}, file line ${line} belongs in ${roles.get(line)}, not ${role}. A disagreement anywhere makes the entire ID group conflicting; otherwise retain its first occurrence.`);
    }
  }
  function order(lines, wanted, label) {
    if (lines.length !== wanted.length || lines.some((line, i) => line !== wanted[i])) {
      add("order", `${label}: expected file lines ${wanted.join(", ") || "(none)"} in that order; got ${lines.map(quote).join(", ") || "(none)"}. Preserve input order and the first occurrence.`);
    }
  }
  for (const row of output.kept) record(row, "kept");
  order(output.kept.map(row => row?.line), expected.kept, "Kept records");
  for (const entry of output.duplicates) {
    if (!keys(entry, ["record", "keptLine"])) add("duplicate-shape", "Each duplicate needs exactly `{ record, keptLine }`, linking its original occurrence to the first retained line.");
    record(entry?.record, "duplicates");
    const line = entry?.record?.line;
    if (!Number.isInteger(entry?.keptLine) || !links.has(line) || entry.keptLine !== links.get(line)) {
      add("link", `Duplicate file line ${quote(line)}: keptLine must point to the retained first occurrence${links.has(line) ? ` at file line ${links.get(line)}` : "; this occurrence is not a safe exact duplicate"}.`);
    }
  }
  order(output.duplicates.map(entry => entry?.record?.line), expected.duplicates.map(entry => entry.line), "Duplicate occurrences");
  const seenGroups = new Set();
  for (const group of output.conflicts) {
    if (!keys(group, ["id", "records"]) || typeof group.id !== "string" || !Array.isArray(group.records)) {
      add("conflict-shape", "Each conflict needs exactly `{ id, records }`: an exact string ID and an array of ALL its original occurrences.");
      continue;
    }
    if (seenGroups.has(group.id)) add("group-repeat", `Conflict ${quote(group.id)} appears in more than one group. Return one complete group per conflicting ID.`);
    seenGroups.add(group.id);
    const wanted = expected.conflicts.find(item => item.id === group.id);
    if (!wanted) add("conflict-id", `Job ${quote(group.id)} isn't a conflicting ID in this dataset. Compare every business field and keep string IDs distinct.`);
    for (const row of group.records) record(row, `conflict ${quote(group.id)}`);
    order(group.records.map(row => row?.line), wanted?.lines ?? [], `Conflict ${quote(group.id)}`);
  }
  const groupIds = output.conflicts.map(group => group?.id);
  const wantedIds = expected.conflicts.map(group => group.id);
  if (groupIds.length !== wantedIds.length || groupIds.some((id, i) => id !== wantedIds[i])) {
    add("group-order", `Conflict groups must be ${wantedIds.map(quote).join(", ") || "(none)"}, ordered by their first input occurrence. Do not choose a winning version.`);
  }
  for (const { line, id } of check.rows) {
    const count = counts.get(line) ?? 0;
    if (count !== 1) add("accounting", `Job ${quote(id)}, file line ${line} appears ${count} times. Account for every original occurrence exactly once across the three lists.`);
  }
  if (!Number.isFinite(output.totalHours) || output.totalHours !== expected.totalHours) {
    add("total", `Reliable totalHours should be the number ${expected.totalHours}, but got ${quote(output.totalHours)}. Sum hours in kept only; conflicting versions await review. No rounding is needed for these quarter-hour values.`);
  }
  const passed = problems.length === 0;
  return { ...base, passed, fatal: false, problems, summary: passed
    ? `Correct: ${output.kept.length} kept, ${output.duplicates.length} duplicates, ${output.conflicts.length} conflict groups; ${output.totalHours} reliable hours.`
    : "Trace the job IDs and file lines below." };
}

export async function runDoubledTotalsChecks(runCode, exercise, code, { onProgress, timeoutSeconds } = {}) {
  if (!exercise.checks.length || exercise.checks.some(check => !Array.isArray(check.rows))) throw new TypeError("Case 3 requires at least one dataset of cleaned rows.");
  const results = [];
  for (const check of exercise.checks) {
    const run = await runCode(code, check.rows);
    if (run.status === "cancelled") return { status: "cancelled", passed: false, results, code };
    const result = evaluateDoubledTotalsCheck(check, run, { timeoutSeconds });
    results.push(result);
    onProgress?.(results.length, exercise.checks.length);
    if (result.fatal) return { status: "done", passed: false, stoppedEarly: true, results, code };
  }
  const passed = results.every(result => result.passed);
  return { status: "done", passed, stoppedEarly: false, results, code, note: !passed && results[0]?.passed
    ? "The case file passed, but another week needs attention. Group by exact IDs and compare every business field; avoid fixed lines or typed-in answers."
    : null };
}
