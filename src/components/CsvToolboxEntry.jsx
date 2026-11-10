import { buildCsvWorkflow } from "../export/csvWorkflow.js";
import { downloadText } from "../export/nodeScript.js";
import { CodeBlock } from "./common.jsx";
import { formatDate, solvedLabel } from "./format.js";

export function CsvToolboxEntry({ exercise, solved, headingLevel = 3 }) {
  const Heading = `h${headingLevel}`;
  const files = buildCsvWorkflow(exercise, solved);
  return <article className="toolbox-entry" data-testid={`toolbox-${exercise.id}`}>
    <Heading>Case 2: {exercise.title}</Heading>
    <p className="small muted">{solvedLabel(solved)}{solved.solvedAt && ` · checked ${formatDate(solved.solvedAt)}`}</p>
    <p>This CSV-file tool uses your last successfully checked code, even if your editor draft has changed. Download all six files below into one folder, keeping their exact names.</p>
    <CodeBlock code={solved.code} label={`Checked code for ${exercise.title}`} />
    <div className="actions">
      {files.map((file) => <button type="button" key={file.name} className={file.name === "report.mjs" ? "primary" : undefined}
        onClick={() => downloadText(file.name, file.text, file.type)}>Download {file.name}</button>)}
    </div>
    <details className="export-help">
      <summary>How to run your CSV report on your computer</summary>
      <ol>
        <li>Install Node.js 24 LTS or newer from nodejs.org. Check with <code>node --version</code>.</li>
        <li>Put <code>report.mjs</code>, <code>parseCsv.mjs</code>, <code>contract.mjs</code>, <code>package.json</code>, <code>jobs-export.csv</code> and <code>README.md</code> together. Open a terminal in that folder.</li>
        <li>Run <code>npm install</code> once to install the Papa Parse dependency locally. This step needs internet access; later runs work offline with the installed files.</li>
        <li>Print the JSON report with <code>node report.mjs jobs-export.csv</code>.</li>
        <li>Save it with <code>node report.mjs jobs-export.csv report.json</code>. Open <code>report.json</code> in that folder. An existing output report is replaced; choose a new name to keep it.</li>
        <li>Try a different CSV with the same columns: <code>node report.mjs another-export.csv another-report.json</code>. Quote file paths that contain spaces.</li>
      </ol>
      <p>Node runs JavaScript outside the browser. The runner reads disk files, parses CSV structure, then runs your validation. Broken CSV stops the whole file; invalid record values belong in your rejected list. Your input CSV is protected from being overwritten.</p>
      <p>The first argument selects the input file; the optional second selects the output file. stdout carries JSON; stderr carries console messages and diagnostics, so logs never mix with the JSON stream.</p>
      <p>Verify the sample gives 4 accepted and 4 rejected records, including original rejected values and file lines. An <code>Error:</code> message and nonzero exit code mean it failed. Read <code>README.md</code> for explanations and troubleshooting.</p>
      <p><strong>Only run code you trust.</strong> The downloaded script has normal filesystem permissions. Copy to IDE remains a separate parsed-record exercise.</p>
    </details>
  </article>;
}
