import { describe, expect, it } from "vitest";
import { parseCsv } from "../../src/csv/parseCsv.js";

function values(result) {
  expect(result.errors).toEqual([]);
  expect(result.ok).toBe(true);
  return result.records.map((r) => r.values);
}

function lines(result) {
  return result.records.map((r) => r.line);
}

function codes(result) {
  return result.errors.map((e) => [e.code, e.line]);
}

describe("parseCsv: valid CSV", () => {
  it("reads the header and keeps every value as the exact string in the file", () => {
    const result = parseCsv("id,hours,flag,notes\n007,1e3,true, padded \n");
    expect(result.columns).toEqual(["id", "hours", "flag", "notes"]);
    expect(values(result)).toEqual([{ id: "007", hours: "1e3", flag: "true", notes: " padded " }]);
    expect(lines(result)).toEqual([2]);
    expect(result.blankLines).toEqual([]);
  });

  it("keeps commas inside quoted values", () => {
    const result = parseCsv('id,notes\n1,"Checked valve, no leak, signed off"\n');
    expect(values(result)).toEqual([{ id: "1", notes: "Checked valve, no leak, signed off" }]);
  });

  it("keeps line breaks inside quoted values and numbers later records by file line", () => {
    const result = parseCsv('id,notes\n1,"Line one\nLine two\nLine three"\n2,After\n');
    expect(values(result)).toEqual([
      { id: "1", notes: "Line one\nLine two\nLine three" },
      { id: "2", notes: "After" },
    ]);
    expect(lines(result)).toEqual([2, 5]);
  });

  it("turns doubled quote marks inside quotes into one quote mark", () => {
    const result = parseCsv('id,notes\n1,"Customer said ""thanks"""\n2,""""\n');
    expect(values(result)).toEqual([
      { id: "1", notes: 'Customer said "thanks"' },
      { id: "2", notes: '"' },
    ]);
  });

  it("gives the same result for Windows, Unix, old Mac and mixed line endings", () => {
    const unix = parseCsv('id,notes\n1,"a\nb"\n2,c\n');
    for (const text of [
      'id,notes\r\n1,"a\r\nb"\r\n2,c\r\n',
      'id,notes\r1,"a\rb"\r2,c\r',
      'id,notes\r\n1,"a\nb"\n2,c\r\n',
    ]) {
      const result = parseCsv(text);
      expect(values(result)).toEqual(values(unix));
      expect(lines(result)).toEqual([2, 4]);
    }
  });

  it("doesn't merge rows when line endings are mixed (Papa Parse alone would)", () => {
    const result = parseCsv("id,notes\r\n1,x\n2,y\r\n");
    expect(values(result)).toEqual([
      { id: "1", notes: "x" },
      { id: "2", notes: "y" },
    ]);
  });

  it("removes a UTF-8 byte-order mark so the first column name is clean", () => {
    const result = parseCsv("﻿id,notes\r\n1,a\r\n");
    expect(result.columns).toEqual(["id", "notes"]);
    expect(values(result)).toEqual([{ id: "1", notes: "a" }]);
  });

  it("keeps blank values as empty strings, quoted or not", () => {
    const result = parseCsv('id,status,hours\n,,\n"","",""\n1,, \n');
    expect(values(result)).toEqual([
      { id: "", status: "", hours: "" },
      { id: "", status: "", hours: "" },
      { id: "1", status: "", hours: " " },
    ]);
  });

  it("skips blank lines but reports where they were", () => {
    const result = parseCsv("\nid,notes\n1,a\n\n   \n2,b\n\n");
    expect(values(result)).toEqual([
      { id: "1", notes: "a" },
      { id: "2", notes: "b" },
    ]);
    expect(lines(result)).toEqual([3, 6]);
    expect(result.blankLines).toEqual([1, 4, 5, 7]);
  });

  it("reads the last record without a final line break", () => {
    const result = parseCsv('id,notes\n1,"ends\nhere"');
    expect(values(result)).toEqual([{ id: "1", notes: "ends\nhere" }]);
  });

  it("accepts a header with no records", () => {
    const result = parseCsv("id,notes\r\n");
    expect(result).toEqual({ ok: true, columns: ["id", "notes"], records: [], blankLines: [], errors: [] });
  });

  it("trims spaces around column names but not around values", () => {
    const result = parseCsv(" id , notes \n 1 , a \n");
    expect(result.columns).toEqual(["id", "notes"]);
    expect(values(result)).toEqual([{ id: " 1 ", notes: " a " }]);
  });

  it("keeps non-English text and symbols intact", () => {
    const result = parseCsv("id,notes\n1,Café façade — 50 m² ✔\n");
    expect(values(result)).toEqual([{ id: "1", notes: "Café façade — 50 m² ✔" }]);
  });

  it("only splits on commas; it never guesses another delimiter", () => {
    const result = parseCsv("id;notes\n1;a\n");
    expect(result.columns).toEqual(["id;notes"]);
    expect(values(result)).toEqual([{ "id;notes": "1;a" }]);
  });

  it("stores a column called __proto__ as an ordinary value", () => {
    const [record] = values(parseCsv("id,__proto__\n1,x\n"));
    expect(Object.getPrototypeOf(record)).toBe(Object.prototype);
    expect(Object.hasOwn(record, "__proto__")).toBe(true);
    expect(record.__proto__).toBe("x");
  });

  it("accepts the header when every required column is present, in any order", () => {
    const result = parseCsv("notes,id\nx,1\n", { requiredColumns: ["id", "notes"] });
    expect(values(result)).toEqual([{ notes: "x", id: "1" }]);
  });
});

describe("parseCsv: malformed CSV", () => {
  function expectFailure(result) {
    expect(result.ok).toBe(false);
    expect(result.records).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
    for (const error of result.errors) {
      expect(error.kind).toBe("csv");
      expect(typeof error.code).toBe("string");
      expect(Number.isInteger(error.line)).toBe(true);
      expect(error.message).toMatch(/\S/);
    }
  }

  it("reports an empty file", () => {
    for (const text of ["", "﻿", "\n\n", "  \r\n \r\n"]) {
      const result = parseCsv(text);
      expectFailure(result);
      expect(codes(result)).toEqual([["empty-file", 1]]);
    }
  });

  it("rejects input that isn't text", () => {
    for (const input of [undefined, null, 42, ["id"], { id: 1 }]) {
      const result = parseCsv(input);
      expectFailure(result);
      expect(codes(result)).toEqual([["not-text", 1]]);
    }
  });

  it("reports a missing closing quote on the line where the quote opens, with no records", () => {
    const result = parseCsv('id,notes\n1,a\n2,"b\nc"\n3,"oops\n4,d\n');
    expectFailure(result);
    expect(codes(result)).toEqual([["unterminated-quote", 5]]);
    expect(result.errors[0].message).toMatch(/^Line 5: .*closing quote/);
  });

  it("reports text after a closing quote once, not twice", () => {
    const result = parseCsv('id,notes\n1,"Valve" replaced\n');
    expectFailure(result);
    expect(codes(result)).toEqual([["invalid-quote", 2]]);
  });

  it("reports every line with too many or too few values", () => {
    const result = parseCsv('id,status,notes\n1,open,Replaced valve, tested\n2,open,"ok"\n3,open\n4\n');
    expectFailure(result);
    expect(codes(result)).toEqual([
      ["too-many-fields", 2],
      ["too-few-fields", 4],
      ["too-few-fields", 5],
    ]);
    expect(result.errors[0].message).toBe(
      "Line 2 has 4 values, but the header row has 3 columns. A comma inside a value needs the whole value in quotes.",
    );
  });

  it("doesn't count a row of empty values as a blank line", () => {
    const result = parseCsv("id,status,notes\n,,\n,\n");
    expectFailure(result);
    expect(codes(result)).toEqual([["too-few-fields", 3]]);
  });

  it("reports blank, repeated and missing column names", () => {
    expect(codes(parseCsv("id,,notes\n1,2,3\n"))).toEqual([["blank-column-name", 1]]);
    expect(codes(parseCsv("id,hours,hours\n1,2,3\n"))).toEqual([["duplicate-column", 1]]);
    expect(codes(parseCsv("id, hours ,hours\n1,2,3\n"))).toEqual([["duplicate-column", 1]]);
    const missing = parseCsv("id,notes\n1,a\n", { requiredColumns: ["id", "hours", "notes"] });
    expectFailure(missing);
    expect(codes(missing)).toEqual([["missing-column", 1]]);
    expect(missing.errors[0].message).toBe('The header row has no "hours" column. Expected columns: id, hours, notes.');
  });

  it("gives the header's real line number when blank lines come first", () => {
    expect(codes(parseCsv("\n\nid,id\n"))).toEqual([["duplicate-column", 3]]);
  });

  it("never returns partial records alongside errors", () => {
    const result = parseCsv("id,notes\n1,a\n2,b,c\n3,d\n");
    expectFailure(result);
    expect(result.columns).toEqual(["id", "notes"]);
  });
});
