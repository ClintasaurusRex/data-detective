// Builds "challenge.js": a standalone copy of the active exercise for
// working in an IDE such as VS Code or VSCodium.
//
// It contains the exercise text as comments, the displayed sample rows,
// the learner's current draft (or the starter), and a small preview call.
// It never includes the reference solution, hints or the checker's extra
// datasets. Building it doesn't run any code.

export const CHALLENGE_FILE_NAME = "challenge.js";
export const SOLUTION_START = "// ===== YOUR SOLUTION: start copying here =====";
export const SOLUTION_END = "// ===== YOUR SOLUTION: stop copying here =====";

// Plain text for a comment: drop the `code` and *emphasis* markup, and keep
// everything on comment lines.
function plain(text) {
  return String(text)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/[\r\n\u2028\u2029]+/g, " ");
}

function wrap(text, width = 74) {
  const lines = [];
  let line = "";
  for (const word of plain(text).split(/\s+/).filter(Boolean)) {
    if (line && line.length + word.length + 1 > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function comment(lines, indent = "") {
  return lines.map((l) => (l ? `// ${indent}${l}` : "//")).join("\n");
}

// `challenge` = { caseNumber, caseTitle, exerciseTitle, request, requestFrom,
// goal, rules, rows }; `code` = the draft shown in the editor.
export function buildChallengeFile(challenge, code) {
  const { caseNumber, caseTitle, exerciseTitle, request, requestFrom, goal, rules, rows } = challenge;
  const draft = code.replace(/\r\n?/g, "\n").replace(/\s*$/, "\n");
  const header = [
    comment([`Data Detective, Case ${caseNumber}: ${plain(caseTitle)}`, `Exercise: ${plain(exerciseTitle)}`]),
    "//",
    comment([
      "HOW TO USE THIS FILE",
      "1. Save it as challenge.js.",
      "2. Open it in your IDE (for example VS Code or VSCodium) and edit the",
      "   YOUR SOLUTION section below. Add helper functions there if you like.",
      "3. Run it in a terminal, in the same folder:  node challenge.js",
      "   The preview at the bottom prints what your function returns.",
      "4. When you're happy, copy everything between the two YOUR SOLUTION",
      "   markers and paste it into the app's editor, replacing what's there.",
      "   Leave out the sample data and the preview: the app supplies its own.",
      "5. In the app, use Check solution. It also tests datasets this file",
      "   doesn't include.",
    ]),
    "//",
    comment(["THE REQUEST"]),
    comment(wrap(`"${request}"`), "  "),
    requestFrom ? comment([`  ${plain(requestFrom)}`]) : null,
    "//",
    ...(challenge.parsedRecords ? [comment([
      "PARSED-RECORD EXERCISE",
      "This file uses the displayed, already-parsed records below.",
      "It does not read a CSV file or implement the complete CSV workflow.",
    ]), "//"] : []),
    comment(["GOAL"]),
    comment(wrap(goal), "  "),
    "//",
    comment(["RULES"]),
    ...rules.map((rule) => comment(wrap(rule).map((l, i) => (i === 0 ? `- ${l}` : `  ${l}`)), "  ")),
  ]
    .filter((part) => part !== null)
    .join("\n");

  return `${header}

"use strict";

// ===== SAMPLE DATA: the rows shown in the app (don't paste this back) =====
// Strings are exact, including spaces, tabs (\\t) and line breaks (\\n).
const caseSampleRows = ${JSON.stringify(rows, null, 2)};

${SOLUTION_START}
// Your transform function goes here, plus any helper functions it uses.

${draft}${SOLUTION_END}

// ===== PREVIEW: runs your function on the sample data (don't paste this back) =====
console.log("transform(caseSampleRows) returned:");
console.log(JSON.stringify(transform(caseSampleRows), null, 2));
`;
}

// Text between the solution markers: what the learner pastes back.
export function solutionSection(fileText) {
  const start = fileText.indexOf(SOLUTION_START);
  const end = fileText.indexOf(SOLUTION_END);
  if (start === -1 || end === -1) return null;
  return fileText.slice(start + SOLUTION_START.length, end);
}
