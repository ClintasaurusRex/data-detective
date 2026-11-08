import { describe, expect, it } from "vitest";
import {
  COLUMNS,
  HOURS_PATTERN,
  REASON_ORDER,
  REASONS,
  STATUSES,
  rowsFromCsv,
} from "../../src/missions/messyExport.contract.js";
import { datasets, malformedDatasets } from "../../src/missions/messyExport.fixtures.js";

// An independent implementation of the rules in docs/cases/02-messy-export.md.
// It lives only in the tests and is used to confirm that every hand-written
// expected answer follows the contract. It deliberately doesn't reuse
// HOURS_PATTERN, so a mistake in that pattern can't hide here.
function isDigits(text) {
  return text.length > 0 && [...text].every((c) => c >= "0" && c <= "9");
}

function validHours(text) {
  const parts = text.split(".");
  return parts.length <= 2 && parts.every(isDigits) && Number.isFinite(Number(text));
}

function referenceTransform(rows) {
  const accepted = [];
  const rejected = [];
  for (const row of rows) {
    const id = row.id.trim();
    const status = row.status.trim().toLowerCase();
    const hours = row.hours.trim();
    const reasons = [];
    if (id === "") reasons.push("missing-id");
    if (status === "") reasons.push("missing-status");
    else if (!["open", "complete", "on hold"].includes(status)) reasons.push("invalid-status");
    if (hours === "") reasons.push("missing-hours");
    else if (!validHours(hours)) reasons.push("invalid-hours");
    if (reasons.length) rejected.push({ record: row, reasons });
    else accepted.push({ line: row.line, id, status, hours: Number(hours), notes: row.notes });
  }
  return { accepted, rejected };
}

// The full expected result: rejected entries carry the original row.
function expectedOutput(dataset, rows) {
  const byLine = new Map(rows.map((row) => [row.line, row]));
  return {
    accepted: dataset.expected.accepted,
    rejected: dataset.expected.rejected.map(({ line, reasons }) => ({ record: byLine.get(line), reasons })),
  };
}

function parseRows(dataset) {
  const parsed = rowsFromCsv(dataset.csv);
  expect(parsed.errors, dataset.name).toEqual([]);
  expect(parsed.ok, dataset.name).toBe(true);
  return parsed.rows;
}

const validEntries = Object.entries(datasets);
const malformedEntries = Object.entries(malformedDatasets);

describe("Case 2 contract", () => {
  it("defines the columns, statuses and reasons in a fixed order", () => {
    expect(COLUMNS).toEqual(["id", "status", "hours", "notes"]);
    expect(STATUSES).toEqual(["open", "complete", "on hold"]);
    expect(REASON_ORDER).toEqual(["missing-id", "missing-status", "invalid-status", "missing-hours", "invalid-hours"]);
    for (const code of REASON_ORDER) {
      expect(COLUMNS).toContain(REASONS[code].field);
      expect(REASONS[code].text).toMatch(/\S/);
    }
  });

  it("accepts hours written as digits with an optional decimal part, including zero", () => {
    for (const ok of ["0", "0.0", "00", "2", "3.5", "07.50", "12.25", "100"]) {
      expect(HOURS_PATTERN.test(ok), ok).toBe(true);
      expect(validHours(ok), ok).toBe(true);
    }
    for (const bad of ["", " ", "abc", "2h", "-1", "+1", "1,5", "1e3", "0x10", "Infinity", "NaN", ".5", "5.", "1.2.3", "1 000", "２"]) {
      expect(HOURS_PATTERN.test(bad), bad).toBe(false);
      expect(validHours(bad), bad).toBe(false);
    }
  });

  it("rejects hours whose digits convert to a non-finite number", () => {
    const row = { line: 2, id: "01", status: "open", hours: "9".repeat(400), notes: "" };
    expect(HOURS_PATTERN.test(row.hours)).toBe(true); // syntax alone is insufficient
    expect(referenceTransform([row])).toEqual({ accepted: [], rejected: [{ record: row, reasons: ["invalid-hours"] }] });
  });

  it("turns a parsed export into rows of raw strings with their file line", () => {
    const { rows, blankLines } = rowsFromCsv("id,status,hours,notes,extra\r\n 007 , Open ,,a,b\r\n");
    expect(rows).toEqual([{ line: 2, id: " 007 ", status: " Open ", hours: "", notes: "a" }]);
    expect(blankLines).toEqual([]);
  });

  it("keeps rows free of anything except line, id, status, hours and notes", () => {
    for (const [, dataset] of validEntries) {
      for (const row of parseRows(dataset)) {
        expect(Object.keys(row)).toEqual(["line", "id", "status", "hours", "notes"]);
        expect(Number.isInteger(row.line)).toBe(true);
        for (const key of COLUMNS) expect(typeof row[key]).toBe("string");
      }
    }
  });
});

describe("Case 2 datasets: expected answers", () => {
  it.each(validEntries)("%s: the expected answer follows the contract", (_key, dataset) => {
    const rows = parseRows(dataset);
    expect(referenceTransform(rows)).toEqual(expectedOutput(dataset, rows));
  });

  it.each(validEntries)("%s: every record is accepted or rejected exactly once, in file order", (_key, dataset) => {
    const rows = parseRows(dataset);
    const { accepted, rejected } = dataset.expected;
    const fileLines = rows.map((r) => r.line);
    const acceptedLines = accepted.map((r) => r.line);
    const rejectedLines = rejected.map((r) => r.line);
    expect([...acceptedLines, ...rejectedLines].sort((a, b) => a - b)).toEqual(fileLines);
    expect(acceptedLines).toEqual([...acceptedLines].sort((a, b) => a - b));
    expect(rejectedLines).toEqual([...rejectedLines].sort((a, b) => a - b));
  });

  it.each(validEntries)("%s: accepted records keep text IDs and real numbers", (_key, dataset) => {
    const rows = new Map(parseRows(dataset).map((row) => [row.line, row]));
    for (const record of dataset.expected.accepted) {
      const original = rows.get(record.line);
      expect(typeof record.id).toBe("string");
      expect(record.id).toBe(original.id.trim());
      expect(STATUSES).toContain(record.status);
      expect(Number.isFinite(record.hours)).toBe(true);
      expect(record.hours).toBeGreaterThanOrEqual(0);
      // Blank hours never become 0: an accepted 0 was written in the file.
      expect(original.hours.trim()).not.toBe("");
      expect(record.notes).toBe(original.notes);
    }
  });

  it.each(validEntries)("%s: reasons are known codes, listed once each in column order", (_key, dataset) => {
    for (const { reasons } of dataset.expected.rejected) {
      expect(reasons.length).toBeGreaterThan(0);
      const order = reasons.map((code) => REASON_ORDER.indexOf(code));
      expect(order.every((i) => i >= 0)).toBe(true);
      expect(order).toEqual([...order].sort((a, b) => a - b));
      const fields = reasons.map((code) => REASONS[code].field);
      expect(new Set(fields).size).toBe(fields.length);
    }
  });

  it("reports blank lines where a dataset says so", () => {
    for (const [, dataset] of validEntries) {
      expect(rowsFromCsv(dataset.csv).blankLines, dataset.name).toEqual(dataset.blankLines ?? []);
    }
  });

  it("keeps leading zeros, so 000017 and 17 stay different jobs", () => {
    const ids = datasets.leadingZeros.expected.accepted.map((r) => r.id);
    expect(ids).toEqual(["000017", "0042", "00981", "000500", "17"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every reason, zero hours, quoted blanks, a byte-order mark and every line ending", () => {
    const all = validEntries.map(([, d]) => d);
    const reasonsSeen = new Set(all.flatMap((d) => d.expected.rejected.flatMap((r) => r.reasons)));
    expect([...reasonsSeen].sort()).toEqual([...REASON_ORDER].sort());
    expect(all.some((d) => d.expected.accepted.some((r) => r.hours === 0))).toBe(true);
    expect(all.some((d) => d.csv.startsWith("﻿"))).toBe(true);
    expect(all.some((d) => d.csv.includes("\r\n"))).toBe(true);
    expect(all.some((d) => /[^\r]\n/.test(d.csv))).toBe(true);
    expect(all.some((d) => d.expected.accepted.some((r) => r.notes.includes("\n")))).toBe(true);
    expect(all.some((d) => d.expected.accepted.some((r) => r.notes.includes('"')))).toBe(true);
    expect(datasets.headerOnly.expected).toEqual({ accepted: [], rejected: [] });
    expect(datasets.noneAccepted.expected.accepted).toEqual([]);
  });

  it("keeps fixtures frozen", () => {
    expect(Object.isFrozen(datasets)).toBe(true);
    expect(Object.isFrozen(datasets.caseFile.expected.accepted[0])).toBe(true);
    expect(Object.isFrozen(malformedDatasets.emptyFile.csvErrors)).toBe(true);
  });
});

describe("Case 2 datasets: wrong approaches fail", () => {
  // Each wrong approach must disagree with at least one dataset, so a future
  // checker using these datasets can tell it apart from a correct answer.
  function failsSomewhere(transform) {
    return validEntries.filter(([, dataset]) => {
      const rows = parseRows(dataset);
      let output;
      try {
        output = transform(structuredClone(rows));
      } catch {
        return true;
      }
      return JSON.stringify(output) !== JSON.stringify(expectedOutput(dataset, rows));
    }).map(([key]) => key);
  }

  // A transform that follows the contract except for how it cleans the
  // status or reads the hours (NaN means "invalid").
  function variant({ cleanStatus = (s) => s.trim().toLowerCase(), parseHours }) {
    return (rows) => {
      const accepted = [];
      const rejected = [];
      for (const row of rows) {
        const id = row.id.trim();
        const status = cleanStatus(row.status);
        const hours = parseHours(row.hours);
        const reasons = [];
        if (id === "") reasons.push("missing-id");
        if (status === "") reasons.push("missing-status");
        else if (!STATUSES.includes(status)) reasons.push("invalid-status");
        if (Number.isNaN(hours)) reasons.push(row.hours.trim() === "" ? "missing-hours" : "invalid-hours");
        if (reasons.length) rejected.push({ record: row, reasons });
        else accepted.push({ line: row.line, id, status, hours, notes: row.notes });
      }
      return { accepted, rejected };
    };
  }

  it("the reference passes every dataset", () => {
    expect(failsSomewhere(referenceTransform)).toEqual([]);
  });

  it("hardcoding the case file's answer fails on other datasets", () => {
    const answer = expectedOutput(datasets.caseFile, parseRows(datasets.caseFile));
    const failed = failsSomewhere(() => structuredClone(answer));
    expect(failed).not.toContain("caseFile");
    expect(failed).toEqual(expect.arrayContaining(["newIds", "reordered", "numbers", "headerOnly"]));
  });

  const strictHours = (text) => (validHours(text.trim()) ? Number(text) : NaN);

  it("the variant helper is correct when nothing is changed", () => {
    expect(failsSomewhere(variant({ parseHours: strictHours }))).toEqual([]);
  });

  it("treating blank hours as 0 with Number() fails", () => {
    const failed = failsSomewhere(variant({ parseHours: (text) => Number(text) }));
    expect(failed).toEqual(expect.arrayContaining(["caseFile", "numbers", "newIds"]));
  });

  it("Number() with a blank check still fails on 1e3, 0x10 and Infinity", () => {
    const parseHours = (text) => {
      const n = text.trim() === "" ? NaN : Number(text);
      return Number.isFinite(n) && n >= 0 ? n : NaN;
    };
    const failed = failsSomewhere(variant({ parseHours }));
    expect(failed).toEqual(["numbers"]);
  });

  it("using parseFloat (accepts 2h and 1e3) fails", () => {
    expect(failsSomewhere(variant({ parseHours: (text) => parseFloat(text) }))).toContain("numbers");
  });

  it("not trimming, or not lower-casing, the status fails", () => {
    const noTrim = failsSomewhere(variant({ cleanStatus: (s) => s.toLowerCase(), parseHours: strictHours }));
    expect(noTrim).toEqual(expect.arrayContaining(["caseFile", "messyText"]));
    const noLower = failsSomewhere(variant({ cleanStatus: (s) => s.trim(), parseHours: strictHours }));
    expect(noLower).toEqual(expect.arrayContaining(["caseFile", "messyText", "newIds"]));
  });

  it("converting IDs to numbers fails", () => {
    const numericIds = (rows) => {
      const out = referenceTransform(rows);
      return { ...out, accepted: out.accepted.map((r) => ({ ...r, id: String(Number(r.id)) })) };
    };
    expect(failsSomewhere(numericIds)).toEqual(expect.arrayContaining(["caseFile", "leadingZeros"]));
  });

  it("listing only the first reason fails", () => {
    const firstOnly = (rows) => {
      const out = referenceTransform(rows);
      return { ...out, rejected: out.rejected.map((r) => ({ ...r, reasons: r.reasons.slice(0, 1) })) };
    };
    expect(failsSomewhere(firstOnly)).toEqual(expect.arrayContaining(["multipleProblems", "missingIds"]));
  });

  it("dropping rejected records instead of reporting them fails", () => {
    const dropRejected = (rows) => ({ ...referenceTransform(rows), rejected: [] });
    expect(failsSomewhere(dropRejected).length).toBeGreaterThan(5);
  });
});

describe("Case 2: CSV errors are not validation errors", () => {
  it.each(malformedEntries)("%s: stops before validation with the expected CSV error", (_key, dataset) => {
    const parsed = rowsFromCsv(dataset.csv);
    expect(parsed.ok).toBe(false);
    expect(parsed.rows).toBeNull();
    expect(parsed.errors.map(({ code, line }) => ({ code, line }))).toEqual(dataset.csvErrors);
    for (const error of parsed.errors) {
      expect(error.kind).toBe("csv");
      expect(REASON_ORDER).not.toContain(error.code);
      expect(error.message).toMatch(/\S/);
    }
  });

  it("a decimal comma in quotes is a rejected record; an unquoted comma breaks the file", () => {
    const header = "id,status,hours,notes\n";
    const quoted = rowsFromCsv(`${header}1,open,"1,5",note\n`);
    expect(quoted.ok).toBe(true);
    expect(referenceTransform(quoted.rows).rejected).toEqual([{ record: quoted.rows[0], reasons: ["invalid-hours"] }]);

    const unquoted = rowsFromCsv(`${header}1,open,1,5,note\n`);
    expect(unquoted.ok).toBe(false);
    expect(unquoted.errors.map((e) => e.code)).toEqual(["too-many-fields"]);
  });

  it("CSV error codes and rejection reason codes never overlap", () => {
    const csvCodes = new Set(malformedEntries.flatMap(([, d]) => d.csvErrors.map((e) => e.code)));
    for (const code of REASON_ORDER) expect(csvCodes.has(code)).toBe(false);
  });
});
