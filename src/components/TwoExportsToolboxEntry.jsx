import { buildTwoExportsWorkflow, TWO_EXPORTS_RUN_FILE } from "../export/twoExportsWorkflow.js";
import { downloadText } from "../export/nodeScript.js";
import { CodeBlock } from "./common.jsx";
import { formatDate, solvedLabel } from "./format.js";

export function TwoExportsToolboxEntry({ exercise, solved, headingLevel = 3 }) {
  const Heading = `h${headingLevel}`;
  const files = buildTwoExportsWorkflow(exercise, solved);
  return <article className="toolbox-entry" data-testid={`toolbox-${exercise.id}`}>
    <Heading>Case 4: {exercise.title}</Heading>
    <p className="small muted">{solvedLabel(solved)}{solved.solvedAt && ` · checked ${formatDate(solved.solvedAt)}`}</p>
    <p>This two-file reconciliation tool uses your last successfully checked code, even after draft changes. Download all four files into one folder, keeping their exact names. No dependencies or npm install are needed.</p>
    <CodeBlock code={solved.code} label={`Checked code for ${exercise.title}`} />
    <div className="actions">
      {files.map(file => <button type="button" key={file.name} className={file.name === TWO_EXPORTS_RUN_FILE ? "primary" : undefined}
        onClick={() => downloadText(file.name, file.text, file.type)}>Download {file.name}</button>)}
    </div>
    <details className="export-help">
      <summary>How to reconcile two JSON files on your computer</summary>
      <ol>
        <li>Install Node.js 24 LTS from nodejs.org. Verify with <code>node --version</code>.</li>
        <li>Put <code>reconcile.mjs</code>, <code>orders.json</code>, <code>field-reports.json</code> and <code>README.md</code> together. Open a terminal in that folder.</li>
        <li>Print JSON with <code>node reconcile.mjs orders.json field-reports.json</code>.</li>
        <li>Save with <code>node reconcile.mjs orders.json field-reports.json report.json</code>. Existing reports are replaced after validation; choose a new name to keep one. Both inputs are protected, including links to them.</li>
        <li>Try <code>node reconcile.mjs another-orders.json another-fields.json weekly-report.json</code>. Quote paths with spaces.</li>
      </ol>
      <p>Each input is an array of validated records with exactly line, id, site, status and hours. Lines are source-scoped provenance; IDs remain exact strings with leading zeros. Invalid input stops instead of being silently cleaned.</p>
      <p>Trace agreements, one-sided records, every difference and whole ambiguous groups. A repeated ID in either source makes the entire key ambiguous. Preserve every occurrence once. The sample has 7 orders and 6 field reports: 2 agreements, 1 scheduling-only, 1 field-only, 2 differences and 1 ambiguous group. Read README.md to reconcile both source totals.</p>
      <p>stdout carries JSON; stderr carries console messages and errors. Errors exit unsuccessfully. Preparation failures leave an existing report unchanged; require a successful run before trusting it.</p>
      <p><strong>Only run code you trust.</strong> Node has normal filesystem permissions, no browser sandbox timeout and reads whole files into memory. Start small. Copy to IDE remains a separate current-draft sample exercise.</p>
    </details>
  </article>;
}
