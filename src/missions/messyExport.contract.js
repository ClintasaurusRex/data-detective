// Case 2: The Messy Export. The data contract, shared by the fixtures, the
// tests and (in later slices) the checker and the Node export.
//
// The full contract, with examples, is in docs/cases/02-messy-export.md.
// This file deliberately has no validation function: deciding which rows to
// accept or reject is the learner's job in this case. The tests check the
// expected answers against an independent implementation of these rules.

import { parseCsv } from "../csv/parseCsv.js";

// The export's header row, in order. All four are required.
export const COLUMNS = Object.freeze(["id", "status", "hours", "notes"]);

// Valid statuses after trimming surrounding whitespace and lower-casing.
// The accepted record uses exactly this spelling.
export const STATUSES = Object.freeze(["open", "complete", "on hold"]);

// Valid hours: digits, optionally followed by one decimal point and more
// digits, after trimming surrounding whitespace. "0" is valid. Blank is not.
export const HOURS_PATTERN = /^\d+(\.\d+)?$/;

// Rejection reasons, in the order they must be listed for a record
// (id, then status, then hours). A record gets at most one reason per field.
export const REASONS = Object.freeze({
  "missing-id": Object.freeze({ field: "id", text: "The job ID is blank." }),
  "missing-status": Object.freeze({ field: "status", text: "The status is blank." }),
  "invalid-status": Object.freeze({
    field: "status",
    text: `The status isn't one of: ${STATUSES.join(", ")}.`,
  }),
  "missing-hours": Object.freeze({
    field: "hours",
    text: "The hours are blank. Blank means unknown, not zero.",
  }),
  "invalid-hours": Object.freeze({
    field: "hours",
    text: "The hours aren't a number written with digits (like 0, 2 or 3.5).",
  }),
});

export const REASON_ORDER = Object.freeze(Object.keys(REASONS));

/**
 * Turn a Case 2 CSV export into the rows `transform` receives.
 *
 * Each row is `{ line, id, status, hours, notes }`: `line` is the file line
 * where the record starts (a number), and the other four are the raw strings
 * from the file, untrimmed. Extra columns, if any, are not included.
 *
 * When the CSV itself is broken, `ok` is false, `rows` is null and `errors`
 * explains why. Those are file problems, not rejected records.
 */
export function rowsFromCsv(text) {
  const parsed = parseCsv(text, { requiredColumns: COLUMNS });
  if (!parsed.ok) return { ok: false, rows: null, blankLines: parsed.blankLines, errors: parsed.errors };
  const rows = parsed.records.map(({ line, values }) => ({
    line,
    id: values.id,
    status: values.status,
    hours: values.hours,
    notes: values.notes,
  }));
  return { ok: true, rows, blankLines: parsed.blankLines, errors: [] };
}
