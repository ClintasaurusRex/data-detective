# Case 2: The Messy Export

Status: **Milestone 2, Slice 3. Browser mission fully playable.** The contract, CSV parser, datasets, checker, investigation, prediction, editor, hints, explained solution and progress persistence are integrated. The full Node CSV export is a future slice (see [STATUS.md](../STATUS.md)).

Source: [src/missions/messyExport.contract.js](../../src/missions/messyExport.contract.js), [messyExport.fixtures.js](../../src/missions/messyExport.fixtures.js) and the parser in [src/csv/parseCsv.js](../../src/csv/parseCsv.js).

## The request

> "Every Friday I load the field-work app's export into the billing workbook. Last month two jobs went in with blank hours, the workbook counted them as zero, and a crew wasn't paid for six hours of overtime. Another job vanished because its number lost its leading zeros. Before I load this week's file, can you tell me which rows are safe to use, and for the others, exactly what's wrong so I can chase the crews?"
>
> Priya Natarajan, Billing Coordinator, Riverbend Water Services

The learner investigates `jobs-export.csv`, a weekly export of field jobs. Its problems are ones that turn up in real workplace exports:

- spaces and odd capitals in the status
- blank IDs, statuses and hours
- hours typed as words (`two`) or with units (`2h`)
- job numbers that start with zeros
- notes containing commas, quote marks and line breaks
- Windows line endings

The lesson: **cleaning** fixes harmless differences (spaces, capitals), **validation** decides whether a record can be trusted, and a record that can't be trusted is **rejected with a reason**, never quietly fixed or dropped.

The case-file export (Windows line endings; the note for 004106 spans lines 7 and 8):

```csv
id,status,hours,notes
004101,Complete,3.5,Replaced meter
004102, open ,,Waiting for parts
,Complete,2,Hydrant flushed
004104,COMPLETE,1.25,"Checked valve, no leak found"
004105,complete,two,Crew of 2
004106,On Hold,0,"Customer not home.
Card left at door"
004107,Closed,4,Pipe repaired
004108, Complete ,6,"Main break, Elm St"
```

Expected: 4 accepted (004101, 004104, 004106, 004108) and 4 rejected (lines 3, 4, 6 and 9).

## Two kinds of problem

| | CSV error (file problem) | Rejected record (data problem) |
| --- | --- | --- |
| Example | A note with an unquoted comma; a quote that never closes; no `hours` column | Blank hours; `two` as hours; status `Closed` |
| Who finds it | The CSV parser (`parseCsv`), before any rules run | The learner's `transform`, applying the case rules |
| What happens | The whole file stops. No records are accepted or rejected, because we can't be sure which value belongs to which column. | That one record goes to `rejected` with its reasons. Every other record is still processed. |
| How it's reported | `{ kind: "csv", code, line, message }` | `{ record, reasons: ["missing-hours"] }` |

The learner writes validation, not CSV parsing. The app (and later the Node script) parses the file with a maintained library and hands `transform` an array of rows.

## Input format

**The file**: UTF-8 CSV, comma-separated, with a header row. A byte-order mark is allowed and removed. Windows (`\r\n`), Unix (`\n`) and old Mac (`\r`) line endings are all accepted, even mixed in one file. A value containing a comma, quote mark or line break must be in double quotes, and a quote mark inside quotes is written twice (`""`). The CSV rules are in [CSV parsing](#csv-parsing) below.

**The header**: must include the columns `id`, `status`, `hours` and `notes`, in any order. Spaces around a column name are ignored; names are otherwise case-sensitive. Extra columns are allowed and not passed to `transform`.

**What `transform(rows)` receives**: an array of rows, one per record, in file order:

```js
{ line: 7, id: "004106", status: "On Hold", hours: "0", notes: "Customer not home.\nCard left at door" }
```

- `line` (number) is the file line where the record starts. The header is line 1. It differs from the record's position when an earlier note spans several lines, or blank lines are skipped. It matches what you'd see in a text editor.
- `id`, `status`, `hours` and `notes` are **always strings**, exactly as in the file: untrimmed, with leading zeros, and `""` when blank. The parser never converts types.
- A line break inside a quoted note is always `"\n"`, whatever the file's line endings.

## Validation rules

Apply these to each row. "Trimmed" means surrounding whitespace removed with `String.prototype.trim()`: spaces, tabs, line breaks and non-breaking spaces. Whitespace in the middle is kept.

| Field | Valid when | Accepted value | Rejection reasons |
| --- | --- | --- | --- |
| `id` | Not blank after trimming. Any other text is a valid ID. | The trimmed text, still a **string**: `" 000500 "` → `"000500"`. Leading zeros and capitals are kept. Never converted to a number. | `missing-id` |
| `status` | After trimming and lower-casing, exactly `open`, `complete` or `on hold` (one space). | That lower-case word: `" On Hold "` → `"on hold"` | `missing-status` if blank after trimming; otherwise `invalid-status` (for example `Closed`, `Completed`, `Incomplete`, `on  hold` with two spaces) |
| `hours` | After trimming, one or more digits, optionally followed by `.` and one or more digits. **Zero is valid** (`0`, `0.0`). The converted number must be finite; there is no additional workplace maximum. | A JavaScript **number**: `"07.50"` → `7.5`, `"0"` → `0` | `missing-hours` if blank after trimming (blank means unknown, **never zero**); otherwise `invalid-hours` |
| `notes` | Always valid, including blank. | Unchanged: not trimmed, commas, quote marks and line breaks kept | none |

Invalid hours include `two`, `2h`, `-1`, `+1`, `1,5` (decimal comma), `1 000`, `.5`, `5.`, `1e3`, `0x10`, `Infinity` and `NaN`. Several of these are accepted by `Number()` or `parseFloat()`, which is part of the lesson. `Number("")` and `Number("   ")` are both `0`, which is exactly how blank hours became zero in Priya's workbook.

A blank ID is the only ID problem checked. Duplicate IDs are Case 3's subject and aren't checked here.

### Several problems in one record

Check **every** field and list **every** reason, at most one per field, in column order: ID, then status, then hours. For example, `,Closed,abc,` gives `["missing-id", "invalid-status", "invalid-hours"]`, and `,,,` gives `["missing-id", "missing-status", "missing-hours"]`.

### Reason codes

| Code | Meaning shown to the learner |
| --- | --- |
| `missing-id` | The job ID is blank. |
| `missing-status` | The status is blank. |
| `invalid-status` | The status isn't one of: open, complete, on hold. |
| `missing-hours` | The hours are blank. Blank means unknown, not zero. |
| `invalid-hours` | The hours aren't a number written with digits (like 0, 2 or 3.5). |

The learner returns the codes; the app turns them into sentences. Codes are easy to compare and count ("how many rows are missing hours?"), and the wording can improve without breaking anyone's solution.

## Output contract

`transform(rows)` returns one object with two arrays:

```js
{
  accepted: [
    { line: 2, id: "004101", status: "complete", hours: 3.5, notes: "Replaced meter" },
    // ...
  ],
  rejected: [
    {
      record: { line: 3, id: "004102", status: " open ", hours: "", notes: "Waiting for parts" },
      reasons: ["missing-hours"],
    },
    // ...
  ],
}
```

- **Accepted** records are new objects with exactly the keys `line`, `id`, `status`, `hours`, `notes`, holding the cleaned values from the table above.
- **Rejected** entries hold the **original row object, unchanged**, as `record`, plus `reasons`. Nothing is cleaned, so Priya sees exactly what the file said, and `record.line` tells her where to look.
- **Every row appears exactly once**, in `accepted` or in `rejected`. Nothing is dropped.
- **Both arrays keep file order.** Since rows arrive in file order, their `line` numbers increase.
- **Don't change the input rows.** Build new objects for accepted records.
- An export with no records gives `{ accepted: [], rejected: [] }`.

The line number and the original record are how originals are traced: a rejected record may have no ID at all, so the line is the only reliable way to point at it.

## CSV parsing

`src/csv/parseCsv.js` wraps [Papa Parse](https://www.papaparse.com/) 5.7.0. It knows nothing about this case's rules. Its result:

```js
{ ok: true,  columns: ["id", ...], records: [{ line, values: { id: "...", ... } }], blankLines: [3, 5], errors: [] }
{ ok: false, columns: [...],       records: null,                                 blankLines: [...],  errors: [{ kind: "csv", code, line, message }] }
```

Decisions:

- **Delimiter**: always a comma. It's never guessed, so a semicolon file reads as one column rather than being silently reinterpreted.
- **Line endings**: normalised to `\n` before parsing. Papa Parse picks one line ending per file; on a file mixing `\r\n` and `\n`, it would merge rows without reporting an error. A test checks this.
- **Byte-order mark**: removed from the start.
- **Values**: always strings, never trimmed or converted. Only column *names* are trimmed.
- **Blank lines** (empty, or only whitespace) aren't records. They're skipped and their line numbers are returned in `blankLines`, so nothing disappears unseen. A line of commas (`,,,`) is **not** blank: it's a record with every value blank, and Case 2 rejects it.
- **Any CSV error fails the whole file** and returns `records: null`, never a partial list. Errors are all collected (every short or long line is listed), except that after a quote error, field counts are meaningless, so only quote errors are reported.

| Code | When | Line reported |
| --- | --- | --- |
| `not-text` | The input isn't a string | 1 |
| `empty-file` | No header row (empty, or only blank lines) | 1 |
| `blank-column-name` | A header cell is empty | header line |
| `duplicate-column` | Two columns with the same (trimmed) name | header line |
| `missing-column` | A required column is absent (Case 2 requires all four) | header line |
| `unterminated-quote` | A quoted value never closes | where the quote opens |
| `invalid-quote` | Text follows a closing quote, as in `"Valve" replaced` | where the quote opens |
| `too-many-fields` | A line has more values than columns, usually an unquoted comma | that record's first line |
| `too-few-fields` | A line has fewer values than columns | that record's first line |

CSV error codes and rejection reason codes never overlap, and the tests check it.

## Datasets

All fictional. Each is CSV text with hand-written expected results. The tests confirm each expected answer against an independent implementation of the rules above, which lives only in the test file.

| Dataset | What it's for | Accepted (line: ID) | Rejected (line: reasons) |
| --- | --- | --- | --- |
| The case file | The export above. Windows line endings, multi-line note | 2: 004101, 5: 004104, 7: 004106, 10: 004108 | 3: missing-hours; 4: missing-id; 6: invalid-hours; 9: invalid-status |
| Different job numbers | New IDs, Unix line endings; catches typed-in answers | 2: 010233, 4: 010235, 6: 010237 | 3: missing-hours; 5: missing-status |
| Same jobs, new order | The case file reordered, so line numbers change too | 2: 004108, 4: 004106, 8: 004104, 10: 004101 | 3: invalid-status; 6: missing-id; 7: invalid-hours; 9: missing-hours |
| Leading zeros | `000017`, `0042`, a quoted `"00981"`, `" 000500 "`, and `17`, a different job from `000017` | all 5 | none |
| Blank and invalid hours | `0`, `0.0`, `07.50`, `" 2.25 "` accepted; blank, spaces, `""`, and 11 invalid forms | 2, 3, 4, 18 | 5–7: missing-hours; 8–17 and 19: invalid-hours |
| Capitals and spaces | Every mix of capitals, tabs, a leading non-breaking space; near-miss statuses; notes keep their spaces | 2, 3, 4, 5, 6, 7, 12 | 8–10: invalid-status (`on  hold`, `Completed`, `Incomplete`); 11: missing-status |
| Quotes, commas and line breaks | Byte-order mark, Windows line endings, a three-line note, `""` escapes, every value quoted, no final line break | 2, 3, 6, 8, 9, 10 | 7: missing-hours |
| Missing job IDs | Blank, spaces, quoted blank, and `,,,` | 2, 7 | 3–5: missing-id; 6: missing-id, missing-status, missing-hours |
| Several problems in one record | Two or three reasons per record, in column order | 6 | 2: missing-id, invalid-status, invalid-hours; 3: missing-status, missing-hours; 4: missing-id, missing-hours; 5: invalid-status, invalid-hours |
| Blank lines | Empty and spaces-only lines are skipped and reported (3, 5, 7); line numbers still match the file | 2, 4, 6 | none |
| Mixed line endings | `\r\n` and `\n` in one file | 2, 3, 4 | none |
| Nothing usable | The right answer accepts nothing | none | 2: missing-id; 3: missing-hours; 4: invalid-status |
| Header only | No jobs this week | none | none |

### Files that stop at the CSV stage

| Dataset | Problem | Expected errors |
| --- | --- | --- |
| Empty file | Zero bytes | `empty-file` (line 1) |
| Only blank lines | A byte-order mark and blank lines | `empty-file` (line 1) |
| Missing closing quote | `"Valve replaced` never closes | `unterminated-quote` (line 2) |
| Text after a closing quote | `"Valve" replaced` | `invalid-quote` (line 3) |
| Unquoted comma | `Replaced valve, tested` without quotes | `too-many-fields` (line 2) |
| Short line | Two short lines after a two-line note | `too-few-fields` (lines 4 and 5) |
| Missing column | No `hours` column | `missing-column` (line 1) |
| Repeated column | Two `hours` columns | `duplicate-column` (line 1) |
| Unnamed column | An empty header cell | `blank-column-name` (line 1) |

### Why these datasets catch wrong answers

`tests/unit/messyExport.test.js` runs deliberately wrong solutions against the datasets and confirms that each one fails at least one of them. The integrated checker uses these same datasets to distinguish them:

| Wrong approach | Fails on |
| --- | --- |
| Returning the case file's answer typed in by hand | Different job numbers, Same jobs new order, and others |
| `Number(hours)` without a blank check (blank becomes `0`) | The case file, Different job numbers, Blank and invalid hours |
| `Number()` with a blank check but no digit check | Blank and invalid hours (`1e3`, `0x10`, `.5`, `5.`) |
| `parseFloat(hours)` | Blank and invalid hours (`2h`, `1e3`) |
| Not trimming, or not lower-casing, the status | The case file, Capitals and spaces |
| Converting IDs to numbers | The case file, Leading zeros |
| Listing only the first reason | Several problems, Missing job IDs |
| Dropping rejected records instead of reporting them | Most datasets |

## Approved decisions (8 November 2026)

- **Hours:** zero and ordinary non-negative decimals are valid after trimming. Blank hours use `missing-hours`; negative, incorrectly formatted or non-finite hours use `invalid-hours`. Keep the strict digits-and-optional-decimal format, including rejecting `.5`, `5.` and `1e3`. Check for blank before conversion; format validation alone is insufficient if a very long digit string converts to `Infinity`.
- **Malformed CSV:** stop the whole file, with line-specific CSV errors and no partial records. Structurally valid files are processed record by record. Quoted commas and multiline notes are valid CSV, not errors.

## Validation checker (Slice 2)

`src/checking/evaluateMessyExport.js` exports `evaluateMessyExportCheck(check, run, options)` and `runMessyExportChecks(runCode, exercise, code, options)`. A check has `{ id, name, rows, expected }`, where `rows` comes from successful `rowsFromCsv` parsing and `expected` is the fixture's hand-written `{ accepted, rejected: [{ line, reasons }] }` answer. The caller supplies an exercise with a non-empty `checks` array; malformed CSV never becomes a validation check.

The checker matches returned records by their original numeric file `line`, not job ID. It checks exactly-once coverage across both lists, classification, exact fields and primitive values/types, finite accepted hours, unchanged rejected content, complete ordered reasons, and original order in each list. Object key order is irrelevant. Rejected records are compared by content, not JavaScript reference identity, because worker results travel as JSON. Input mutation fails the check.

It compares actual output against expectations without a production reference transformation. The supplied runner executes learner code once per dataset using the existing sandbox. Shared Case 1 run-error feedback is reused; cancellation stops checking, fatal errors stop early, and dataset-specific errors allow remaining checks to run. `onProgress(done, total)` and the returned outcome follow the Case 1 conventions. File-line feedback refers to CSV input; shared syntax/runtime feedback refers to learner code lines.

Tests in `tests/unit/evaluateMessyExport.test.js` cover all 13 valid fixtures, loop and reduce implementations, deliberately wrong answers, wrong shapes, file order, mutation, finite conversion (including JSON's conversion of Infinity to null), and runner lifecycle. Existing parser tests retain malformed-file coverage. Slice 3 connects this checker through the shared workbench; only all 13 required checks passing records a solve. An ordinary Run only shows actual output.


## Playable investigation (Slice 3)

Open `#/case/messy-export` or select Case 2 in the sidebar. Inspect Priya’s request, numbered CSV with visible spaces and line endings, and expandable parsed rows/JSON. File line 7 starts the multiline record; file line 8 is its continuation. Read the reporting contract and optional JavaScript field guide before writing validation. Parsing is provided, never a learner requirement.

Predict accepted/rejected counts totalling the eight input records, or skip without penalty. Run and Check both invite a first prediction/skip. A prediction is compared with actual counts after Run without claiming that matching counts prove correctness. The starter deliberately returns empty lists and logs the evidence, leaving classification and cleaning to the learner.

Output shows accepted values and rejected originals with returned reason codes translated to sentences. Run never solves the case. Check runs the existing checker across all 13 fixtures and reports missing/duplicate/out-of-order records, incorrect values or classification, incomplete reasons, changed originals and input mutation. Dataset inspection shows the parsed input and optional expected values/reasons for debugging.

Four hints progress from tracing individual records to numeric checks and output construction. The optional reference solution is behind confirmation and explains string methods, blank versus zero, strict numeric syntax, conversion/finite checks, text identifiers and unchanged originals. Viewing it is recorded honestly. Draft restoration and reference insertion retain the earlier draft.

Case 2 saves its draft, prediction/skip, hints, reference reveal, completed check summary and solve with exact passing code independently of Case 1. Editing a passing solution changes the badge to “Needs checking again” and retains the earlier passing code. The Copy to IDE exercise runs the displayed parsed records with Node; it explicitly does not read CSV files. Case 2 adds no Toolbox download in this slice.

The final panel lets learners select bundled malformed-file examples and inspect actual parser errors, with file lines. The whole malformed file stops; it never becomes accepted/rejected business records or a partial report. There is no CSV editor or upload workflow.
