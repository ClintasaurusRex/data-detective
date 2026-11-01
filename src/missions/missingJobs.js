// Case 1: The Missing Jobs.
//
// Text fields use a tiny markup: `backticks` become inline code. A content
// list item can also be { code: "..." } for a code block.
import { caseFileRows, datasets } from "./missingJobs.fixtures.js";

function check(datasetKey, expectedIds) {
  const { name, description, rows } = datasets[datasetKey];
  return { id: datasetKey, name, description, rows, expectedIds };
}

const starterCode = `function transform(rows) {
  return rows.filter(row => row.status === "complete");
}
`;

const solutionCode = `function transform(rows) {
  return rows.filter(row =>
    row.status.trim().toLowerCase() === "complete"
  );
}
`;

const completedJobs = {
  id: "missing-jobs",
  title: "Find the completed jobs",
  goal: "Return every job whose status means complete, in the original order.",
  rows: caseFileRows,
  starterCode,
  matchWord: "complete",
  checks: [
    check("caseFile", ["J-101", "J-102", "J-104"]),
    check("newIds", ["J-2051", "J-2053", "J-2055"]),
    check("reordered", ["J-104", "J-101", "J-102"]),
    check("moreOpen", ["J-312", "J-316"]),
    check("mixedCase", ["J-420", "J-421", "J-422"]),
    check("whitespace", ["J-530", "J-531", "J-532", "J-534"]),
    check("noneComplete", []),
  ],
  hints: [
    "Compare the Status column with the exact text the code looks for: `\"complete\"`. The quotes in the table show every character, including spaces. `===` only matches when every character is identical. Which completed jobs fail that test?",
    "Two differences hide the jobs: capital letters (`\"Complete\"`) and spaces around the text (`\" COMPLETE \"`). JavaScript strings have methods that give you a cleaned-up copy to compare: `toLowerCase()` and `trim()`.",
    "Clean the status before comparing it. Inside the filter, replace `row.status === \"complete\"` with `row.status.trim().toLowerCase() === \"complete\"`. Then run the code and check the output.",
  ],
  solution: {
    code: solutionCode,
    explanation: [
      "`rows.filter(...)` builds a new array. It calls the arrow function once for each row and keeps the rows where the function returns `true`. It doesn't change `rows`, and the rows it keeps are the original records.",
      "`row.status.trim()` returns a new string with whitespace (spaces, tabs and line breaks) removed from both ends. `\" COMPLETE \"` becomes `\"COMPLETE\"`. Spaces in the middle stay.",
      "`.toLowerCase()` returns a new string with every capital letter in lower case. `\"COMPLETE\"` becomes `\"complete\"`.",
      "The two methods are chained: `trim()` runs first, and `toLowerCase()` runs on its result. The cleaned-up copy is compared with `\"complete\"` using `===`.",
      "String methods never change the original string. JavaScript strings can't be changed at all (they are *immutable*), so `row.status` is still `\" COMPLETE \"` afterwards. That's why the report can return the original records untouched.",
    ],
  },
  exportFileName: "solve.mjs",
};

const openJobs = {
  id: "missing-jobs-open",
  title: "Variation: the open jobs",
  goal: "Return every job that is still open, in the original order.",
  brief:
    "Marisol is planning next week. She wants the same export filtered to the jobs that are still open. The statuses have the same mess of capitals and spaces. This time you start from an empty function.",
  rows: caseFileRows,
  starterCode: `function transform(rows) {
  // Return the jobs that are still open.
  return [];
}
`,
  matchWord: "open",
  rules: [
    "Each row is a job record with a unique string `id` and a string `status`.",
    "A job is open when its status is `open` after removing surrounding whitespace, ignoring capital letters.",
    "Return the matching original records, in their original order.",
    "Don't change the input rows.",
  ],
  checks: [
    check("caseFile", ["J-103"]),
    check("newIds", ["J-2052", "J-2054"]),
    check("reordered", ["J-103"]),
    check("moreOpen", ["J-310", "J-311", "J-315"]),
    check("mixedCase", ["J-423"]),
    check("whitespace", ["J-533"]),
    check("noneComplete", ["J-640", "J-642"]),
    check("noneOpen", []),
  ],
  hints: [
    "This is the same pattern as the completed jobs. Which single word does each cleaned-up status need to equal now?",
  ],
  solution: {
    code: `function transform(rows) {
  return rows.filter(row =>
    row.status.trim().toLowerCase() === "open"
  );
}
`,
    explanation: [
      "Only the word changes. The cleanup (`trim()` then `toLowerCase()`) works the same for any status, which is what makes it a reusable tool.",
      "\"On hold\" isn't open, so it's left out. If the team decided on-hold jobs should count, that would be a new rule to agree with Marisol, not something the code should guess.",
    ],
  },
  exportFileName: "solve-open-jobs.mjs",
};

export const missingJobsCase = {
  id: "missing-jobs",
  number: 1,
  title: "The Missing Jobs",
  playable: true,
  colleague: { name: "Marisol Reyes", role: "Operations Coordinator" },
  request:
    "The weekly report says only one job is complete. I can see three completed jobs in the export. Find out why the report is missing them.",
  target: "Fix `transform` so the report includes every completed job.",
  rules: [
    "Each row is a job record with a unique string `id` and a string `status`.",
    "A job is complete when its status is `complete` after removing surrounding whitespace, ignoring capital letters.",
    "Return the matching original records, in their original order.",
    "Don't change the input rows.",
  ],
  prediction: {
    question: "How many job records should the weekly report include?",
    answer: 3,
    answerIds: ["J-101", "J-102", "J-104"],
  },
  exercises: [completedJobs, openJobs],
};
