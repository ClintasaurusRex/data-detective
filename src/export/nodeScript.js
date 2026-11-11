import contractSource from "./missingJobsContract.js?raw";

// Builds the downloadable Node script and sample data for a checked exercise.
//
// The learner's code is placed in the file as code, between two comment
// lines. It is never put inside a string, template literal or HTML page, so
// quotes, backticks and "</script>" in it need no escaping. Only code that
// passed the checks is exported, so it is valid JavaScript.
//
// The code sits inside its own function, matching the browser runner: its
// declarations can't clash with the wrapper's (fs, runScript, fail...), and
// it receives a `console` that writes to standard error, so standard output
// stays valid JSON.

function commentSafe(text) {
  return String(text).replace(/[\r\n\u2028\u2029]+/g, " ");
}

export function buildNodeScript({ code, caseNumber, caseTitle, exerciseTitle, fileName, checkedAt, matchWord = "complete" }) {
  if (!["complete", "open"].includes(matchWord)) throw new Error("Unknown Case 1 status rule.");
  const learnerCode = code + "\n";
  const header = [
    `// Data Detective, Case ${caseNumber}: ${commentSafe(caseTitle)}`,
    `// ${commentSafe(exerciseTitle)}`,
    checkedAt ? `// Checked in Data Detective on ${commentSafe(checkedAt)}.` : null,
    "//",
    "// Run it with Node.js (version 24 LTS or newer):",
    `//   node ${fileName} sample.json               prints the result`,
    `//   node ${fileName} sample.json result.json   saves the result to a file`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return `${header}

import { Console } from "node:console";
import * as fs from "node:fs/promises";
import { resolve } from "node:path";

// Global console calls need the same separation as the supplied console.
globalThis.console = new Console({ stdout: process.stderr, stderr: process.stderr });

// Your code runs inside its own function, so its names can't clash with the
// rest of this file. Its console messages go to standard error: they still
// appear in the terminal, but never mix with the JSON result.
function loadYourCode(console) {
// ---- Your transform function, as checked in Data Detective ----
${learnerCode}// ---- End of your function ----
  return typeof transform === "function" ? transform : undefined;
}

${contractSource.replace(/^export /gm, "")}

// Reads a JSON file, runs transform on it, and prints or saves the result.
async function runScript() {
  const args = process.argv.slice(2);
  const [inputPath, outputPath] = args;
  if (!inputPath) {
    fail("Tell me which JSON file to read, for example:\\n  node ${fileName} sample.json");
  }
  if (args.length > 2 || args.some(arg => !arg || arg.startsWith("--"))) fail("Give an input JSON and optionally a separate output path.");
  if (outputPath && resolve(inputPath) === resolve(outputPath)) {
    fail("The output must be a different file from the input JSON. Choose a name such as result.json.");
  }

  let text, inputInfo;
  try {
    const input = await fs.open(inputPath, "r");
    try {
      inputInfo = await input.stat();
      if (inputInfo.isDirectory()) throw Object.assign(new Error("Is a directory"), { code: "EISDIR" });
      if (!inputInfo.isFile()) throw new Error("Expected a regular JSON file.");
      text = await input.readFile("utf8");
    } finally { await input.close(); }
  } catch (error) {
    if (error.code === "ENOENT") {
      fail(\`Couldn't find "\${inputPath}". Check the file name, and that you're running this command in the folder that contains it.\`);
    }
    if (error.code === "EISDIR") fail(\`"\${inputPath}" is a folder. Give the name of a JSON file instead.\`);
    fail(\`Couldn't read "\${inputPath}": \${error.message}\`);
  }

  let rows;
  try {
    // Some editors add an invisible "byte order mark" at the start; skip it.
    rows = JSON.parse(text.replace(/^\\uFEFF/, ""));
  } catch (error) {
    fail(\`"\${inputPath}" isn't valid JSON: \${error.message}\\nOpen it in a text editor and look for a missing comma, quote or bracket.\`);
  }
  if (!Array.isArray(rows)) {
    const found = rows === null ? "null" : typeof rows;
    fail(\`"\${inputPath}" should contain a JSON array (a list in [square brackets]) of records, but it contains \${found === "object" ? "an object" : found}.\`);
  }

  validateMissingJobsInput(rows);
  const before = JSON.stringify(rows), originals = JSON.parse(before);
  const transform = loadYourCode(globalThis.console);
  if (typeof transform !== "function") throw new Error("Define a transform(rows) function.");
  const result = transform(rows);
  if (JSON.stringify(rows) !== before) throw new Error("Your code changed the input. Preserve original records and order.");
  validateMissingJobsReport(result, originals, ${JSON.stringify(matchWord)});
  const json = JSON.stringify(result, null, 2) + "\\n";
  validateMissingJobsReport(JSON.parse(json), originals, ${JSON.stringify(matchWord)});
  if (JSON.stringify(rows) !== before) throw new Error("Your code changed the input while preparing the report.");
  if (outputPath) {
    let output;
    try {
      // Check file identity before truncating, including symlinks/hard links.
      output = await fs.open(outputPath, "a");
      const info = await output.stat();
      if (info.dev === inputInfo.dev && info.ino === inputInfo.ino) {
        throw new Error("The output points to the input JSON. Choose a different output file.");
      }
      if (!info.isFile()) throw new Error("Expected a regular output file.");
      await output.truncate(0);
      await output.writeFile(json, "utf8");
    } finally { await output?.close(); }
    const count = Array.isArray(result) ? \`\${result.length} record(s)\` : "the result";
    console.error(\`Wrote \${count} to \${outputPath}\`);
  } else {
    process.stdout.write(json);
  }
}

function fail(message) {
  console.error("Error: " + message);
  process.exit(1);
}

runScript().catch((error) => {
  console.error("transform stopped with an error:");
  console.error(error);
  process.exit(1);
});
`;
}

export function buildSampleJson(rows) {
  return JSON.stringify(rows, null, 2) + "\n";
}

// Start a download of text content in the browser.
export function downloadText(fileName, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
