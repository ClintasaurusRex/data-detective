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

export function buildNodeScript({ code, caseNumber, caseTitle, exerciseTitle, fileName, checkedAt }) {
  const learnerCode = code.replace(/\r\n?/g, "\n").replace(/\s*$/, "\n");
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

// Your code runs inside its own function, so its names can't clash with the
// rest of this file. Its console messages go to standard error: they still
// appear in the terminal, but never mix with the JSON result.
const transform = (function loadYourCode(console) {
// ---- Your transform function, as checked in Data Detective ----
${learnerCode}// ---- End of your function ----
  return transform;
})(new Console({ stdout: process.stderr, stderr: process.stderr }));

// Reads a JSON file, runs transform on it, and prints or saves the result.
async function runScript() {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath) {
    fail("Tell me which JSON file to read, for example:\\n  node ${fileName} sample.json");
  }

  let text;
  try {
    text = await fs.readFile(inputPath, "utf8");
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

  const result = transform(rows);
  const json = JSON.stringify(result, null, 2) + "\\n";
  if (outputPath) {
    await fs.writeFile(outputPath, json, "utf8");
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
