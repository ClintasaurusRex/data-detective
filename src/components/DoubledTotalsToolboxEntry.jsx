import { buildDoubledTotalsWorkflow, DOUBLED_TOTALS_RUN_FILE } from "../export/doubledTotalsWorkflow.js";
import { downloadText } from "../export/nodeScript.js";
import { CodeBlock } from "./common.jsx";
import { formatDate, solvedLabel } from "./format.js";

export function DoubledTotalsToolboxEntry({ exercise, solved, headingLevel = 3 }) {
  const Heading = `h${headingLevel}`;
  const files = buildDoubledTotalsWorkflow(exercise, solved);
  return <article className="toolbox-entry" data-testid={`toolbox-${exercise.id}`}>
    <Heading>Case 3: {exercise.title}</Heading>
    <p className="small muted">{solvedLabel(solved)}{solved.solvedAt && ` · checked ${formatDate(solved.solvedAt)}`}</p>
    <p>This JSON-file tool uses your last successfully checked code, even if your draft has changed. Download all three files into one folder, keeping their exact names. No dependencies or npm install are needed.</p>
    <CodeBlock code={solved.code} label={`Checked code for ${exercise.title}`} />
    <div className="actions">
      {files.map(file => <button type="button" key={file.name} className={file.name === DOUBLED_TOTALS_RUN_FILE ? "primary" : undefined}
        onClick={() => downloadText(file.name, file.text, file.type)}>Download {file.name}</button>)}
    </div>
    <details className="export-help">
      <summary>How to run your JSON audit on your computer</summary>
      <ol>
        <li>Install Node.js 24 LTS or newer from nodejs.org. Check with <code>node --version</code>.</li>
        <li>Put <code>deduplicate.mjs</code>, <code>jobs-cleaned.json</code> and <code>README.md</code> together. Open a terminal in that folder.</li>
        <li>Print the report with <code>node deduplicate.mjs jobs-cleaned.json</code>.</li>
        <li>Save with <code>node deduplicate.mjs jobs-cleaned.json report.json</code>. Existing reports are replaced; choose a new filename to keep one. The input is protected, including links to it.</li>
        <li>Try <code>node deduplicate.mjs another-week.json another-report.json</code>. Use an array of already-cleaned records with the same five fields. Quote paths containing spaces.</li>
      </ol>
      <p>The numeric line stays source provenance; it is not a physical line in the JSON file. IDs keep exact string values and leading zeros. Invalid input stops with an error instead of being silently cleaned.</p>
      <p>The report contains kept originals, linked duplicate occurrences, whole conflict groups and totalHours. Only safe kept records contribute to the subtotal. Investigate every conflicting version with the crews; excluding it does not mean no work happened.</p>
      <p>Verify the sample has 3 kept, 2 duplicates and one conflict containing 3 originals, with 3.5 reliable hours. Check every original, link and group as well as the total. Read <code>README.md</code> for the full reconciliation.</p>
      <p>stdout carries JSON; stderr carries console messages and diagnostics. Errors exit unsuccessfully. Input or code failures leave an existing report unchanged; require a successful run before trusting it.</p>
      <p><strong>Only run code you trust.</strong> The downloaded script has normal filesystem permissions and no sandbox timeout. Copy to IDE remains a separate sample-data exercise.</p>
    </details>
  </article>;
}
