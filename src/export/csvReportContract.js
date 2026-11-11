import { HOURS_PATTERN, STATUSES } from "../missions/messyExport.contract.js";

// Verify arbitrary parsed-file evidence. Do not create or repair a report.
const CSV_FIELDS = ["line", "id", "status", "hours", "notes"];
const csvFieldsAre = (value, fields) => value !== null && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).length === fields.length && fields.every(key => Object.hasOwn(value, key));

export function validateCsvReport(report, rows) {
  const fail = message => { throw new Error("Invalid report: " + message); };
  if (!csvFieldsAre(report, ["accepted", "rejected"]) || !Array.isArray(report.accepted) || !Array.isArray(report.rejected)) {
    fail("return exactly { accepted: [], rejected: [] }.");
  }
  const originals = new Map(rows.map(row => [row.line, row])), seen = new Set();
  for (const category of ["accepted", "rejected"]) {
    let previous = 0;
    for (const item of report[category]) {
      const record = category === "accepted" ? item : item?.record;
      const row = originals.get(record?.line);
      if (!csvFieldsAre(record, CSV_FIELDS) || !row || seen.has(row.line) || row.line <= previous) {
        fail(category + ": preserve one occurrence per source line in file order, with exactly the five record fields.");
      }
      seen.add(row.line); previous = row.line;
      const id = row.id.trim(), status = row.status.trim().toLowerCase(), text = row.hours.trim(), reasons = [];
      if (!id) reasons.push("missing-id");
      if (!status) reasons.push("missing-status");
      else if (!STATUSES.includes(status)) reasons.push("invalid-status");
      if (!text) reasons.push("missing-hours");
      else if (!HOURS_PATTERN.test(text) || !Number.isFinite(Number(text))) reasons.push("invalid-hours");
      if (category === "accepted") {
        if (reasons.length || record.id !== id || record.status !== status || record.hours !== Number(text) || record.notes !== row.notes) {
          fail("source line " + row.line + ": accepted values must satisfy cleaning, finite hours and validation rules. Blank is never zero.");
        }
      } else if (!reasons.length || !csvFieldsAre(item, ["record", "reasons"]) ||
          CSV_FIELDS.some(key => record[key] !== row[key]) || !Array.isArray(item.reasons) ||
          item.reasons.length !== reasons.length || reasons.some((reason, i) => item.reasons[i] !== reason)) {
        fail("source line " + row.line + ": keep the rejected original unchanged and every reason once in ID, status, hours order.");
      }
    }
  }
  if (seen.size !== rows.length) fail("account for every input record exactly once across accepted and rejected.");
}
