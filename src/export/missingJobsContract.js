// Runtime guards for external files. Verify the learner's result without
// supplying a filtered answer. Extra original fields are preserved as evidence.
export function validateMissingJobsInput(rows) {
  const ids = new Set();
  for (const [index, row] of rows.entries()) {
    if (!row || typeof row !== "object" || Array.isArray(row) ||
        !Object.hasOwn(row, "id") || typeof row.id !== "string" ||
        !Object.hasOwn(row, "status") || typeof row.status !== "string" || ids.has(row.id)) {
      throw new Error("Input record " + (index + 1) + ": expected a unique string id and a string status. Preserve the original fields.");
    }
    ids.add(row.id);
  }
}

function sameContent(actual, original) {
  if (original === null || typeof original !== "object") return actual === original;
  if (actual === null || typeof actual !== "object" || Array.isArray(actual) !== Array.isArray(original)) return false;
  const keys = Object.keys(original);
  return Object.keys(actual).length === keys.length && keys.every(key => Object.hasOwn(actual, key) && sameContent(actual[key], original[key]));
}

export function validateMissingJobsReport(report, rows, matchWord) {
  if (!Array.isArray(report)) throw new Error("Invalid report: return an array of original job records, not a Promise or another value.");
  let index = 0;
  for (const row of rows) {
    if (row.status.trim().toLowerCase() !== matchWord) continue;
    if (!sameContent(report[index], row)) throw new Error("Invalid report: preserve every matching original, in input order, with every field unchanged.");
    index++;
  }
  if (index !== report.length) throw new Error("Invalid report: include only jobs whose cleaned status is exactly " + matchWord + ", once each.");
}
