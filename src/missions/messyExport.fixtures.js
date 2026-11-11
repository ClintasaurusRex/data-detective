// Datasets for Case 2, "The Messy Export".
//
// All records are fictional. Each dataset is CSV text, as the field-work app
// would export it, plus the exact expected result:
//
// - `expected.accepted`: the cleaned records, in file order.
// - `expected.rejected`: `{ line, reasons }` for each rejected record, in file
//   order. The full rejected entry the learner returns is
//   `{ record, reasons }`, where `record` is the original row unchanged.
// - `csvErrors` (instead of `expected`) for files whose CSV syntax is broken:
//   these never reach validation at all.
//
// Most files are written as an array of physical lines, so a line's position
// in the array (plus one) is its line number in the file. Quoted values that
// span lines continue on the next array item. docs/cases/02-messy-export.md
// explains what each dataset is for.

function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const HEADER = "id,status,hours,notes";

// Joins physical lines into file text.
function csvFile(lines, { eol = "\n", bom = false, finalNewline = true } = {}) {
  return (bom ? "﻿" : "") + lines.join(eol) + (finalNewline ? eol : "");
}

function accepted(line, id, status, hours, notes) {
  return { line, id, status, hours, notes };
}

function rejected(line, ...reasons) {
  return { line, reasons };
}

function csvError(code, line) {
  return { code, line };
}

export const datasets = deepFreeze({
  caseFile: {
    name: "The case file",
    description:
      "This week's export from the field-work app, with Windows line endings. Shows a missing ID, blank hours, hours written as a word, an unknown status, a quoted comma and a note over two lines.",
    csv: csvFile(
      [
        HEADER,
        "004101,Complete,3.5,Replaced meter",
        "004102, open ,,Waiting for parts",
        ",Complete,2,Hydrant flushed",
        '004104,COMPLETE,1.25,"Checked valve, no leak found"',
        "004105,complete,two,Crew of 2",
        '004106,On Hold,0,"Customer not home.',
        'Card left at door"',
        "004107,Closed,4,Pipe repaired",
        '004108, Complete ,6,"Main break, Elm St"',
      ],
      { eol: "\r\n" },
    ),
    expected: {
      accepted: [
        accepted(2, "004101", "complete", 3.5, "Replaced meter"),
        accepted(5, "004104", "complete", 1.25, "Checked valve, no leak found"),
        accepted(7, "004106", "on hold", 0, "Customer not home.\nCard left at door"),
        accepted(10, "004108", "complete", 6, "Main break, Elm St"),
      ],
      rejected: [
        rejected(3, "missing-hours"),
        rejected(4, "missing-id"),
        rejected(6, "invalid-hours"),
        rejected(9, "invalid-status"),
      ],
    },
  },

  newIds: {
    name: "Different job numbers",
    description: "A later export with new job IDs and Unix line endings. Catches answers that list sample IDs or lines by hand.",
    csv: csvFile([
      HEADER,
      "010233,open,1,Survey",
      "010234,Complete,,",
      "010235,complete,2.75,",
      "010236,,3,No status recorded",
      "010237,ON HOLD,0.5,Awaiting permit",
    ]),
    expected: {
      accepted: [
        accepted(2, "010233", "open", 1, "Survey"),
        accepted(4, "010235", "complete", 2.75, ""),
        accepted(6, "010237", "on hold", 0.5, "Awaiting permit"),
      ],
      rejected: [rejected(3, "missing-hours"), rejected(5, "missing-status")],
    },
  },

  reordered: {
    name: "Same jobs, new order",
    description: "The case file's records in a different order. Results must follow the file order, and the line numbers change with it.",
    csv: csvFile([
      HEADER,
      '004108, Complete ,6,"Main break, Elm St"',
      "004107,Closed,4,Pipe repaired",
      '004106,On Hold,0,"Customer not home.',
      'Card left at door"',
      ",Complete,2,Hydrant flushed",
      "004105,complete,two,Crew of 2",
      '004104,COMPLETE,1.25,"Checked valve, no leak found"',
      "004102, open ,,Waiting for parts",
      "004101,Complete,3.5,Replaced meter",
    ]),
    expected: {
      accepted: [
        accepted(2, "004108", "complete", 6, "Main break, Elm St"),
        accepted(4, "004106", "on hold", 0, "Customer not home.\nCard left at door"),
        accepted(8, "004104", "complete", 1.25, "Checked valve, no leak found"),
        accepted(10, "004101", "complete", 3.5, "Replaced meter"),
      ],
      rejected: [
        rejected(3, "invalid-status"),
        rejected(6, "missing-id"),
        rejected(7, "invalid-hours"),
        rejected(9, "missing-hours"),
      ],
    },
  },

  leadingZeros: {
    name: "Leading zeros",
    description:
      'Job IDs that start with zeros, one in quotes and one with spaces around it. "000017" and "17" are different jobs, so IDs must stay text.',
    csv: csvFile([
      HEADER,
      "000017,complete,1,",
      "0042,open,2,",
      '"00981",complete,3,Quoted ID',
      " 000500 ,open,1.5,Spaces around the ID",
      "17,complete,1,Not the same job as 000017",
    ]),
    expected: {
      accepted: [
        accepted(2, "000017", "complete", 1, ""),
        accepted(3, "0042", "open", 2, ""),
        accepted(4, "00981", "complete", 3, "Quoted ID"),
        accepted(5, "000500", "open", 1.5, "Spaces around the ID"),
        accepted(6, "17", "complete", 1, "Not the same job as 000017"),
      ],
      rejected: [],
    },
  },

  numbers: {
    name: "Blank and invalid hours",
    description:
      "Zero, blank, spaces only and quoted blank hours, plus text that `Number()` would wrongly accept (`1e3`, `0x10`, `Infinity`) or turn into 0.",
    csv: csvFile([
      HEADER,
      "020301,complete,0,Zero is a real value",
      "020302,complete,0.0,",
      "020303,complete,07.50,Leading zero in hours",
      "020304,complete,,Blank",
      "020305,complete,   ,Spaces only",
      '020306,complete,"",Quoted blank',
      "020307,complete,abc,",
      "020308,complete,2h,",
      "020309,complete,-1,",
      '020310,complete,"1,5",Decimal comma',
      "020311,complete,1e3,",
      "020312,complete,0x10,",
      "020313,complete,Infinity,",
      "020314,complete,NaN,",
      "020315,complete,.5,",
      "020316,complete,5.,",
      "020317,complete, 2.25 ,Spaces around the number",
      "020318,complete,1 000,",
      "020319,complete," + "9".repeat(400) + ",Digit syntax can still overflow",
    ]),
    expected: {
      accepted: [
        accepted(2, "020301", "complete", 0, "Zero is a real value"),
        accepted(3, "020302", "complete", 0, ""),
        accepted(4, "020303", "complete", 7.5, "Leading zero in hours"),
        accepted(18, "020317", "complete", 2.25, "Spaces around the number"),
      ],
      rejected: [
        rejected(5, "missing-hours"),
        rejected(6, "missing-hours"),
        rejected(7, "missing-hours"),
        rejected(8, "invalid-hours"),
        rejected(9, "invalid-hours"),
        rejected(10, "invalid-hours"),
        rejected(11, "invalid-hours"),
        rejected(12, "invalid-hours"),
        rejected(13, "invalid-hours"),
        rejected(14, "invalid-hours"),
        rejected(15, "invalid-hours"),
        rejected(16, "invalid-hours"),
        rejected(17, "invalid-hours"),
        rejected(19, "invalid-hours"),
        rejected(20, "invalid-hours"),
      ],
    },
  },

  messyText: {
    name: "Capitals and spaces",
    description:
      "Statuses with every mix of capitals, tabs and a non-breaking space around them, and near-misses such as `Completed`, `Incomplete` and `on  hold` (two spaces).",
    csv: csvFile([
      HEADER,
      "030401,COMPLETE,1,",
      "030402,cOmPlEtE,1,",
      "030403,\tOpen\t,1,Tabs around the status",
      "030404,on hold,1,",
      "030405,ON HOLD ,1,",
      "030406, Complete,1,Non-breaking space before the status",
      "030407,on  hold,1,Two spaces in the middle",
      "030408,Completed,1,",
      "030409,Incomplete,1,",
      "030410,   ,1,Spaces only",
      '030411,open,1,"  Notes keep their spaces  "',
    ]),
    expected: {
      accepted: [
        accepted(2, "030401", "complete", 1, ""),
        accepted(3, "030402", "complete", 1, ""),
        accepted(4, "030403", "open", 1, "Tabs around the status"),
        accepted(5, "030404", "on hold", 1, ""),
        accepted(6, "030405", "on hold", 1, ""),
        accepted(7, "030406", "complete", 1, "Non-breaking space before the status"),
        accepted(12, "030411", "open", 1, "  Notes keep their spaces  "),
      ],
      rejected: [
        rejected(8, "invalid-status"),
        rejected(9, "invalid-status"),
        rejected(10, "invalid-status"),
        rejected(11, "missing-status"),
      ],
    },
  },

  quotedFields: {
    name: "Quotes, commas and line breaks",
    description:
      "A file that starts with a byte-order mark and uses Windows line endings, with commas, quote marks and line breaks inside quoted values, every value quoted, and no final line break.",
    csv: csvFile(
      [
        HEADER,
        '040501,complete,2,"Replaced valve, tested, signed off"',
        '040502,open,1,"Line one',
        "Line two",
        'Line three"',
        '040503,complete,1.5,"Customer said ""thanks"""',
        '040504,complete,,"Hours left blank, see ""crew sheet"""',
        '"040505","Complete","3","Quoted everything"',
        '040506,open,1,""',
        '040507,complete,"2","Note with a comma, and',
        'a new line"',
      ],
      { eol: "\r\n", bom: true, finalNewline: false },
    ),
    expected: {
      accepted: [
        accepted(2, "040501", "complete", 2, "Replaced valve, tested, signed off"),
        accepted(3, "040502", "open", 1, "Line one\nLine two\nLine three"),
        accepted(6, "040503", "complete", 1.5, 'Customer said "thanks"'),
        accepted(8, "040505", "complete", 3, "Quoted everything"),
        accepted(9, "040506", "open", 1, ""),
        accepted(10, "040507", "complete", 2, "Note with a comma, and\na new line"),
      ],
      rejected: [rejected(7, "missing-hours")],
    },
  },

  missingIds: {
    name: "Missing job IDs",
    description: "Blank IDs written four ways, including a row where every value is blank (`,,,`), which spreadsheets often leave at the end.",
    csv: csvFile([
      HEADER,
      "050601,complete,1,",
      ",complete,1,No ID",
      "   ,open,2,Spaces only ID",
      '"",complete,1,Quoted blank ID',
      ",,,",
      "050606,open,1,",
    ]),
    expected: {
      accepted: [accepted(2, "050601", "complete", 1, ""), accepted(7, "050606", "open", 1, "")],
      rejected: [
        rejected(3, "missing-id"),
        rejected(4, "missing-id"),
        rejected(5, "missing-id"),
        rejected(6, "missing-id", "missing-status", "missing-hours"),
      ],
    },
  },

  multipleProblems: {
    name: "Several problems in one record",
    description: "Records with two or three problems. Every reason is listed, in column order: ID, status, hours.",
    csv: csvFile([
      HEADER,
      ",Closed,abc,",
      "060702,,,",
      ",open,,",
      "060704,Done,-2,",
      "060705,open,4,",
    ]),
    expected: {
      accepted: [accepted(6, "060705", "open", 4, "")],
      rejected: [
        rejected(2, "missing-id", "invalid-status", "invalid-hours"),
        rejected(3, "missing-status", "missing-hours"),
        rejected(4, "missing-id", "missing-hours"),
        rejected(5, "invalid-status", "invalid-hours"),
      ],
    },
  },

  blankLines: {
    name: "Blank lines",
    description:
      "Empty and spaces-only lines between records and at the end. They aren't records, so they're skipped (and reported), and line numbers still match the file.",
    csv: csvFile([HEADER, "070801,complete,1,", "", "070802,open,2,", "   ", "070803,complete,1,", ""]),
    blankLines: [3, 5, 7],
    expected: {
      accepted: [
        accepted(2, "070801", "complete", 1, ""),
        accepted(4, "070802", "open", 2, ""),
        accepted(6, "070803", "complete", 1, ""),
      ],
      rejected: [],
    },
  },

  mixedLineEndings: {
    name: "Mixed line endings",
    description:
      "A file edited in two programs, so some lines end with Windows line endings and others with Unix ones.",
    csv: "id,status,hours,notes\r\n080901,open,1,First\n080902,complete,2,Second\r\n080903,on hold,0,Third\n",
    expected: {
      accepted: [
        accepted(2, "080901", "open", 1, "First"),
        accepted(3, "080902", "complete", 2, "Second"),
        accepted(4, "080903", "on hold", 0, "Third"),
      ],
      rejected: [],
    },
  },

  noneAccepted: {
    name: "Nothing usable",
    description: "Every record has a problem. The right answer accepts nothing.",
    csv: csvFile([HEADER, ",open,1,", "090902,complete,,", "090903,finished,2,"]),
    expected: {
      accepted: [],
      rejected: [rejected(2, "missing-id"), rejected(3, "missing-hours"), rejected(4, "invalid-status")],
    },
  },

  headerOnly: {
    name: "Header only",
    description: "A week with no jobs: the header row and nothing else. Both lists are empty.",
    csv: csvFile([HEADER], { eol: "\r\n" }),
    expected: { accepted: [], rejected: [] },
  },
});

// Files whose CSV syntax or header is broken. They stop before validation:
// no records are accepted or rejected, and the error explains the problem.
export const malformedDatasets = deepFreeze({
  emptyFile: {
    name: "Empty file",
    description: "A zero-byte export.",
    csv: "",
    csvErrors: [csvError("empty-file", 1)],
  },
  blankFile: {
    name: "Only blank lines",
    description: "A byte-order mark and blank lines, but no header row.",
    csv: "﻿\r\n\r\n",
    csvErrors: [csvError("empty-file", 1)],
  },
  unterminatedQuote: {
    name: "Missing closing quote",
    description: "A note opens a quote and never closes it, so the rest of the file would be swallowed into one value.",
    csv: csvFile([HEADER, '100001,complete,1,"Valve replaced', "100002,open,2,Survey"]),
    csvErrors: [csvError("unterminated-quote", 2)],
  },
  invalidQuote: {
    name: "Text after a closing quote",
    description: "A quoted note with more text after its closing quote.",
    csv: csvFile([HEADER, "100101,open,1,Survey", '100102,complete,1,"Valve" replaced']),
    csvErrors: [csvError("invalid-quote", 3)],
  },
  unquotedComma: {
    name: "Unquoted comma",
    description: "A note with a comma but no quotes, so its line has one value too many.",
    csv: csvFile([HEADER, "100201,complete,1,Replaced valve, tested", "100202,open,2,Survey"]),
    csvErrors: [csvError("too-many-fields", 2)],
  },
  missingValue: {
    name: "Short line",
    description: "Two lines with fewer values than columns, after a multi-line note. Both are reported, with file line numbers.",
    csv: csvFile([HEADER, '100301,open,1,"Two', 'lines"', "100302,complete,1", "100303,open"]),
    csvErrors: [csvError("too-few-fields", 4), csvError("too-few-fields", 5)],
  },
  missingColumn: {
    name: "Missing column",
    description: "The export has no hours column.",
    csv: csvFile(["id,status,notes", "100401,complete,Survey"]),
    csvErrors: [csvError("missing-column", 1)],
  },
  duplicateColumn: {
    name: "Repeated column",
    description: "Two columns called hours. Which one is right? The file can't say.",
    csv: csvFile(["id,status,hours,hours,notes", "100501,complete,1,2,Survey"]),
    csvErrors: [csvError("duplicate-column", 1)],
  },
  blankColumnName: {
    name: "Unnamed column",
    description: "A header row with an empty column name.",
    csv: csvFile(["id,status,hours,,notes", "100601,complete,1,x,Survey"]),
    csvErrors: [csvError("blank-column-name", 1)],
  },
});
