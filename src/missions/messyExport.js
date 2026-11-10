import { datasets } from "./messyExport.fixtures.js";
import { rowsFromCsv } from "./messyExport.contract.js";

// Parse every checking file through the same adapter as the evidence view.
// Broken CSV never reaches transform or produces a partial report.
const checks = Object.entries(datasets).map(([id, dataset]) => {
  const parsed = rowsFromCsv(dataset.csv);
  if (!parsed.ok) throw new Error(`Invalid bundled CSV: ${id}`);
  return { id, ...dataset, rows: parsed.rows };
});

const rules = [
  "Input rows have `line`, `id`, `status`, `hours`, `notes`. All values except the numeric file `line` are original strings. CSV parsing is already done for you.",
  "Trim the ID; reject it if blank (`missing-id`). Keep it as text, including leading zeros and capitals. Do not convert IDs to numbers.",
  "Trim and lower-case the status. Accept only `open`, `complete`, `on hold` (one middle space). Blank uses `missing-status`; any other status uses `invalid-status`.",
  "Trim hours. Blank uses `missing-hours`: unknown is not zero. Otherwise require digits, optionally a dot followed by more digits, and a finite converted number. Invalid format or overflow uses `invalid-hours`. Zero is valid; there is no workplace maximum.",
  "Valid hours include `0`, `07.50`, `2.25`. Invalid: `two`, `2h`, `-1`, `+1`, `1,5`, `1 000`, `.5`, `5.`, `1e3`, `0x10`, `Infinity`, `NaN`.",
  "Return exactly `{ accepted, rejected }`. Accepted records are new objects with exactly `line`, trimmed string `id`, cleaned `status`, numeric `hours`, and unchanged `notes`.",
  "Rejected entries are `{ record, reasons }`: the entire original row unchanged, and every applicable reason code once in ID, status, hours order. Notes are always valid and never cleaned.",
  "Every input row must appear exactly once in one list. Both lists keep file order. Never change the input. An empty input returns two empty lists. Duplicate job IDs are a later case; use the original file `line` to trace records here.",
];

const solutionCode = `function transform(rows) {
  const accepted = [];
  const rejected = [];

  for (const row of rows) {
    const id = row.id.trim();
    const status = row.status.trim().toLowerCase();
    const hoursText = row.hours.trim();
    const reasons = [];

    if (id === "") reasons.push("missing-id");

    if (status === "") reasons.push("missing-status");
    else if (!["open", "complete", "on hold"].includes(status)) {
      reasons.push("invalid-status");
    }

    if (hoursText === "") reasons.push("missing-hours");
    else if (!/^\\d+(\\.\\d+)?$/.test(hoursText) ||
             !Number.isFinite(Number(hoursText))) {
      reasons.push("invalid-hours");
    }

    if (reasons.length > 0) {
      rejected.push({ record: row, reasons });
    } else {
      accepted.push({
        line: row.line, id, status,
        hours: Number(hoursText), notes: row.notes
      });
    }
  }

  return { accepted, rejected };
}
`;

export const messyExportCase = {
  id: "messy-export",
  number: 2,
  title: "The Messy Export",
  playable: true,
  colleague: { name: "Priya Natarajan", role: "Billing Coordinator" },
  request: "Every Friday I load the field-work app's export into the billing workbook. Last month two jobs went in with blank hours, the workbook counted them as zero, and a crew wasn't paid for six hours of overtime. Another job vanished because its number lost its leading zeros. Before I load this week's file, can you tell me which rows are safe to use, and for the others, exactly what's wrong so I can chase the crews?",
  target: "Clean the safe records for Priya, and return every unsafe original with all its rejection reasons.",
  rules,
  exercises: [{
    id: "messy-export",
    title: "Clean and validate the field-work export",
    outputKind: "accepted-rejected",
    exportFileName: "report.mjs",
    goal: "Return { accepted, rejected }: cleaned valid records and unchanged invalid originals with reason codes, in file order.",
    rules,
    rows: checks[0].rows,
    csv: datasets.caseFile.csv,
    checks,
    starterCode: `function transform(rows) {
  const accepted = [];
  const rejected = [];

  for (const row of rows) {
    // Investigate one record at a time.
    // Which values can be cleaned? Which need a rejection reason?
    console.log(row.line, row.id, row.hours);
  }

  return { accepted, rejected };
}
`,
    hints: [
      "Trace one valid and one invalid record by file line. Decide what each output should look like on paper first. Parsing has already preserved the strings; your job is cleaning and validation. Nothing should disappear.",
      "Use local copies: `const id = row.id.trim()` and `const status = row.status.trim().toLowerCase()`. Collect reason codes in an empty array for each row. Check ID, status and hours independently so you find every problem.",
      "Check `hoursText === \"\"` before converting. `Number(\"\")` is 0! For nonblank text, `/^\\d+(\\.\\d+)?$/.test(hoursText)` requires digits and an optional decimal part. Then `Number.isFinite(Number(hoursText))` checks that conversion didn't overflow.",
      "After all field checks, put `{ record: row, reasons }` in rejected if there are reasons. Otherwise build a new accepted object with line, cleaned ID/status, numeric hours and original notes. Pushing as you loop keeps file order. Return both lists.",
    ],
    solution: {
      code: solutionCode,
      explanation: [
        "The loop makes one decision per input record. Separate `if` statements collect every field problem in ID, status, hours order; an early return after the first error would hide other problems.",
        "`trim()` returns a copy without surrounding whitespace. `toLowerCase()` makes a copy with lower-case letters. Neither changes the original row; spaces inside `on  hold` remain and make that status invalid.",
        "`hoursText === \"\"` finds missing information before `Number()` can turn it into zero. An explicit `\"0\"` is known zero hours; a blank is unknown.",
        "The regular expression `/^\\d+(\\.\\d+)?$/` describes the whole text: `^` starts it, `\\d+` means one or more digits, `(\\.\\d+)?` is an optional dot and more digits, and `$` ends it. It rejects units, exponents, signs and incomplete decimals before conversion.",
        "`Number(hoursText)` converts validated text to a number. `Number.isFinite(...)` returns true only for a finite number; very long digit strings can overflow to Infinity even though they match the format.",
        "IDs identify jobs; they aren't amounts. `Number(\"000017\")` loses the zeros, confusing it with `\"17\"`. Only hours become numbers.",
        "New accepted objects keep notes and file line unchanged. Rejected entries keep the original record, including blanks and spaces, so Priya can trace what needs fixing. Both lists preserve input order; empty input naturally gives two empty lists.",
      ],
    },
  }],
};
