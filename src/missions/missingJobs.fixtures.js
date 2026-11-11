// Datasets for Case 1, "The Missing Jobs".
//
// All records are fictional. IDs are strings. Each dataset is used by the
// checker with an explicit list of expected IDs (see missingJobs.js), so the
// checker never needs a reference solution. docs/cases/01-missing-jobs.md
// describes what each variation is for.

function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

// Frozen, so app code can never change a fixture by accident. (The runner
// receives copies, so learner code can't change them either.)
export const caseFileRows = deepFreeze([
  { id: "J-101", status: "Complete" },
  { id: "J-102", status: "complete" },
  { id: "J-103", status: "Open" },
  { id: "J-104", status: " COMPLETE " },
]);

export const datasets = deepFreeze({
  caseFile: {
    name: "The case file",
    description: "The four rows from the weekly export.",
    rows: caseFileRows,
  },
  newIds: {
    name: "Different job numbers",
    description: "A later export with new job IDs. Catches answers that list the sample IDs by hand.",
    rows: [
      { id: "J-2051", status: " complete" },
      { id: "J-2052", status: "Open" },
      { id: "J-2053", status: "Complete" },
      { id: "J-2054", status: "open " },
      { id: "J-2055", status: "COMPLETE" },
    ],
  },
  reordered: {
    name: "Same jobs, new order",
    description: "The case file rows in a different order. Results must follow the input order.",
    rows: [
      { id: "J-104", status: " COMPLETE " },
      { id: "J-103", status: "Open" },
      { id: "J-101", status: "Complete" },
      { id: "J-102", status: "complete" },
    ],
  },
  moreOpen: {
    name: "More open jobs",
    description: 'Extra open and on-hold jobs, plus "Incomplete", which contains the letters "complete" but is not complete.',
    rows: [
      { id: "J-310", status: "Open" },
      { id: "J-311", status: "open" },
      { id: "J-312", status: "Complete" },
      { id: "J-313", status: "Incomplete" },
      { id: "J-314", status: "On hold" },
      { id: "J-315", status: "  OPEN" },
      { id: "J-316", status: "complete" },
      { id: "J-317", status: "Completed" },
      { id: "J-318", status: "Opening" },
    ],
  },
  mixedCase: {
    name: "Mixed capitals",
    description: "Completed statuses typed with every mix of capital letters.",
    rows: [
      { id: "J-420", status: "COMPLETE" },
      { id: "J-421", status: "cOmPlEtE" },
      { id: "J-422", status: "Complete" },
      { id: "J-423", status: "OPEN" },
    ],
  },
  whitespace: {
    name: "Extra whitespace",
    description: "Spaces, a tab (\\t) and a line break (\\n) around the status text.",
    rows: [
      { id: "J-530", status: "   complete" },
      { id: "J-531", status: "complete   " },
      { id: "J-532", status: "\tComplete\t" },
      { id: "J-533", status: " open " },
      { id: "J-534", status: "Complete\n" },
    ],
  },
  noneComplete: {
    name: "No completed jobs",
    description: "A week where nothing was finished. The right answer is an empty list.",
    rows: [
      { id: "J-640", status: "Open" },
      { id: "J-641", status: "On hold" },
      { id: "J-642", status: " open" },
    ],
  },
  noneOpen: {
    name: "No open jobs",
    description: "Everything is complete or on hold. The right answer is an empty list.",
    rows: [
      { id: "J-750", status: "Complete" },
      { id: "J-751", status: "On hold" },
      { id: "J-752", status: " complete " },
    ],
  },
});
