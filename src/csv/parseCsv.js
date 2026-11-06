// Reads CSV text into records of plain strings.
//
// This module only understands CSV *syntax*: quotes, commas, line breaks and
// the header row. It never decides whether a value is valid for a case (that
// is business-rule validation, which belongs to each mission). Every value
// stays a string exactly as written in the file, so IDs keep leading zeros
// and blank cells stay "" (never 0).
//
// Papa Parse does the character-level work. This wrapper adds the parts a
// beginner-friendly tool needs:
// - Line endings are normalised to "\n" first. Papa Parse guesses one line
//   ending per file, and on a file that mixes "\r\n" and "\n" it would
//   silently merge rows. After normalising, a line break inside a quoted
//   value is always "\n".
// - Every record and error carries the line number where it starts in the
//   file, which differs from the record number when a quoted value spans
//   several lines.
// - Each row must have exactly as many values as the header has columns.
// - Any syntax error fails the whole file. When the structure is broken we
//   can't trust which value belongs to which column, so no records are
//   returned at all (`records` is null) rather than a partial list.
// - Blank lines are skipped, but their line numbers are reported.
//
// It works the same in the browser and in Node.

import Papa from "papaparse";

const BYTE_ORDER_MARK = "﻿";

function csvError(code, line, message) {
  return { kind: "csv", code, line, message };
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// Line number (1-based) of each character offset, computed incrementally.
function lineCounter(text) {
  let offset = 0;
  let line = 1;
  return (target) => {
    if (target < offset) {
      offset = 0;
      line = 1;
    }
    for (; offset < target && offset < text.length; offset += 1) {
      if (text[offset] === "\n") line += 1;
    }
    return line;
  };
}

function isBlankRow(fields) {
  return fields.length === 1 && fields[0].trim() === "";
}

function quoteError(papaError, line) {
  if (papaError.code === "MissingQuotes") {
    return csvError(
      "unterminated-quote",
      line,
      `Line ${line}: a quoted value starts here but never ends. Look for a missing closing quote (").`,
    );
  }
  if (papaError.code === "InvalidQuotes") {
    return csvError(
      "invalid-quote",
      line,
      `Line ${line}: a quoted value has extra characters after its closing quote. To put a quote mark inside a quoted value, write it twice ("").`,
    );
  }
  return csvError("csv-syntax", line, `Line ${line}: the CSV couldn't be read (${papaError.message}).`);
}

function headerErrors(columns, requiredColumns) {
  const errors = [];
  const seen = new Set();
  columns.forEach((name, index) => {
    if (name === "") {
      errors.push(csvError("blank-column-name", 1, `Column ${index + 1} in the header row has no name.`));
    } else if (seen.has(name)) {
      errors.push(csvError("duplicate-column", 1, `The header row has more than one column named "${name}".`));
    }
    seen.add(name);
  });
  for (const name of requiredColumns) {
    if (!seen.has(name)) {
      errors.push(
        csvError(
          "missing-column",
          1,
          `The header row has no "${name}" column. Expected columns: ${requiredColumns.join(", ")}.`,
        ),
      );
    }
  }
  return errors;
}

/**
 * Parse CSV text whose first non-blank line is a header row.
 *
 * @param {string} text  The file contents.
 * @param {{ requiredColumns?: string[] }} [options]
 * @returns {{
 *   ok: boolean,
 *   columns: string[],
 *   records: { line: number, values: Record<string, string> }[] | null,
 *   blankLines: number[],
 *   errors: { kind: "csv", code: string, line: number, message: string }[],
 * }}
 */
export function parseCsv(text, { requiredColumns = [] } = {}) {
  if (typeof text !== "string") {
    return fail([], [], [csvError("not-text", 1, "The CSV must be text.")]);
  }

  const normalised = (text.startsWith(BYTE_ORDER_MARK) ? text.slice(1) : text).replace(/\r\n?/g, "\n");
  const lineAt = lineCounter(normalised);

  const rows = [];
  const quoteErrors = [];
  let rowStart = 0;
  Papa.parse(normalised, {
    delimiter: ",",
    newline: "\n",
    quoteChar: '"',
    escapeChar: '"',
    header: false,
    dynamicTyping: false,
    skipEmptyLines: false,
    step(result) {
      const start = rowStart;
      rowStart = result.meta.cursor;
      for (const error of result.errors) {
        // `index` is an offset into the whole text, not into this row.
        quoteErrors.push({ error, offset: Number.isInteger(error.index) ? error.index : start });
      }
      // The empty "row" after a final line break is not a line of the file.
      if (start >= normalised.length && isBlankRow(result.data)) return;
      rows.push({ line: lineAt(start), fields: result.data });
    },
  });

  if (quoteErrors.length) {
    // Papa Parse can report a malformed quote and an unterminated one at the
    // same place; one message per place is clearer.
    const errors = [];
    const places = new Set();
    for (const { error, offset } of quoteErrors) {
      const line = lineAt(offset);
      if (places.has(offset)) continue;
      places.add(offset);
      errors.push(quoteError(error, line));
    }
    return fail([], [], errors);
  }

  const blankLines = [];
  const contentRows = [];
  for (const row of rows) {
    if (isBlankRow(row.fields)) blankLines.push(row.line);
    else contentRows.push(row);
  }

  if (!contentRows.length) {
    return fail([], blankLines, [csvError("empty-file", 1, "The file is empty: there is no header row.")]);
  }

  const [headerRow, ...dataRows] = contentRows;
  // Spaces around column names are a common export quirk and carry no data.
  const columns = headerRow.fields.map((name) => name.trim());
  const problems = headerErrors(columns, requiredColumns).map((error) => ({ ...error, line: headerRow.line }));
  if (problems.length) return fail(columns, blankLines, problems);

  const errors = [];
  const records = [];
  for (const { line, fields } of dataRows) {
    if (fields.length !== columns.length) {
      const tooMany = fields.length > columns.length;
      const tip = tooMany ? " A comma inside a value needs the whole value in quotes." : "";
      errors.push(
        csvError(
          tooMany ? "too-many-fields" : "too-few-fields",
          line,
          `Line ${line} has ${plural(fields.length, "value")}, but the header row has ${plural(columns.length, "column")}.${tip}`,
        ),
      );
      continue;
    }
    // Object.fromEntries defines plain own properties, so a column called
    // "__proto__" can't change the record's prototype.
    records.push({ line, values: Object.fromEntries(columns.map((name, i) => [name, fields[i]])) });
  }
  if (errors.length) return fail(columns, blankLines, errors);

  return { ok: true, columns, records, blankLines, errors: [] };
}

function fail(columns, blankLines, errors) {
  return { ok: false, columns, records: null, blankLines, errors };
}
