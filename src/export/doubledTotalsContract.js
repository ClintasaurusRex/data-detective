// Guards for the standalone file workflow. These validate evidence and reports;
// they never transform records, clean values or produce a replacement answer.
const RECORD_FIELDS = ["line", "id", "status", "hours", "notes"];
const hasFields = (value, fields) => value !== null && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));
const sameJob = (a, b) => a.id === b.id && a.status === b.status && a.hours === b.hours && a.notes === b.notes;

export function validateDoubledTotalsInput(rows) {
  if (!Array.isArray(rows)) throw new Error("Input must be a JSON array of cleaned job records, in [square brackets].");
  let previousLine = 0;
  let quarters = 0;
  for (const [index, row] of rows.entries()) {
    const prefix = "Input record " + (index + 1) + ": ";
    if (!hasFields(row, RECORD_FIELDS)) throw new Error(prefix + "expected exactly line, id, status, hours and notes.");
    if (!Number.isSafeInteger(row.line) || row.line <= previousLine) {
      throw new Error(prefix + "line must be a positive safe integer, unique and increasing in input order. Preserve source provenance; do not use JSON file line numbers.");
    }
    previousLine = row.line;
    if (typeof row.id !== "string" || !row.id || row.id.trim() !== row.id) {
      throw new Error(prefix + "id must be a nonblank, already-trimmed string. Keep leading zeros and capitalization.");
    }
    if (!["open", "complete", "on hold"].includes(row.status)) {
      throw new Error(prefix + "status must already be open, complete or on hold.");
    }
    if (typeof row.hours !== "number" || row.hours < 0 || !Number.isSafeInteger(row.hours * 4)) {
      throw new Error(prefix + "hours must be a finite nonnegative number in exact quarter-hour (0.25) steps within safe numeric range.");
    }
    quarters += row.hours * 4;
    if (!Number.isSafeInteger(quarters)) throw new Error(prefix + "combined hours exceed the safe range for exact quarter-hour totals. Use a smaller file.");
    if (typeof row.notes !== "string") throw new Error(prefix + "notes must be a string; preserve its exact spaces and line breaks.");
  }
}

export function validateDoubledTotalsReport(report, rows) {
  const fail = message => { throw new Error("Invalid report: " + message); };
  if (!hasFields(report, ["kept", "duplicates", "conflicts", "totalHours"]) ||
      ![report.kept, report.duplicates, report.conflicts].every(Array.isArray)) {
    fail("return exactly { kept: [], duplicates: [], conflicts: [], totalHours: 0 } with three arrays and a numeric total.");
  }
  const originals = new Map(rows.map(row => [row.line, row]));
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.id)) groups.set(row.id, { first: row, count: 0, differs: false });
    const group = groups.get(row.id);
    group.count++;
    if (!sameJob(row, group.first)) group.differs = true;
  }
  const seen = new Set();
  function original(record) {
    const source = originals.get(record?.line);
    if (!hasFields(record, RECORD_FIELDS) || !source || RECORD_FIELDS.some(field => record[field] !== source[field])) {
      fail("every returned record must preserve all five original fields, values and source lines.");
    }
    if (seen.has(source.line)) fail("source line " + source.line + " appears more than once.");
    seen.add(source.line);
    return groups.get(source.id);
  }
  let previous = 0;
  let total = 0;
  const keptLines = new Set();
  for (const record of report.kept) {
    const group = original(record);
    if (group.differs || record.line !== group.first.line) fail("kept must contain only the first occurrence of jobs whose versions all agree. Never choose a conflicting winner.");
    if (record.line <= previous) fail("kept records must preserve input order.");
    previous = record.line;
    keptLines.add(record.line);
    total += record.hours;
  }
  previous = 0;
  for (const entry of report.duplicates) {
    if (!hasFields(entry, ["record", "keptLine"])) fail("each duplicate needs exactly { record, keptLine }.");
    const group = original(entry.record);
    if (group.differs || entry.record.line === group.first.line || entry.keptLine !== group.first.line || !keptLines.has(entry.keptLine)) {
      fail("duplicates must link exact later copies to their first retained source line; conflicting versions belong together in conflicts.");
    }
    if (entry.record.line <= previous) fail("duplicate occurrences must preserve input order.");
    previous = entry.record.line;
  }
  previous = 0;
  const conflictIds = new Set();
  for (const entry of report.conflicts) {
    if (!hasFields(entry, ["id", "records"]) || typeof entry.id !== "string" || !Array.isArray(entry.records)) fail("each conflict needs exactly { id, records }.");
    const group = groups.get(entry.id);
    if (!group?.differs || conflictIds.has(entry.id) || entry.records.length !== group.count) {
      fail("each conflicting ID needs one complete group containing ALL its versions, including identical copies.");
    }
    conflictIds.add(entry.id);
    if (group.first.line <= previous) fail("conflict groups must follow their first input occurrence.");
    previous = group.first.line;
    let previousRecord = 0;
    for (const record of entry.records) {
      original(record);
      if (record.id !== entry.id || record.line <= previousRecord) fail("conflict records must have the group's exact ID and preserve input order.");
      previousRecord = record.line;
    }
  }
  if (seen.size !== rows.length) fail("account for every input occurrence exactly once across the three lists.");
  if (!Number.isFinite(report.totalHours) || report.totalHours !== total) fail("totalHours must be the numeric sum of kept hours only, including every safely kept status.");
}
