import { useEffect, useRef, useState } from "react";
import { buildReportingWorkflow, REPORTING_RUN_FILE } from "../export/firstReportingToolWorkflow.js";
import { downloadText } from "../export/nodeScript.js";
import { CodeBlock } from "./common.jsx";
import { formatDate, solvedLabel } from "./format.js";

export function ReportingToolboxEntry({ exercise, solved, headingLevel = 3 }) {
  const Heading = `h${headingLevel}`, files = buildReportingWorkflow(exercise, solved);
  const [failedFile, setFailedFile] = useState(null), [status, setStatus] = useState("");
  const fallback = useRef(null);
  useEffect(() => { if (failedFile) { fallback.current?.focus(); fallback.current?.select(); } }, [failedFile]);
  function download(file) {
    setFailedFile(null);
    try { downloadText(file.name, file.text, file.type); setStatus("Started download of " + file.name + ". Keep all five files together."); }
    catch { setStatus(""); setFailedFile(file); }
  }
  return <article className="toolbox-entry" data-testid={`toolbox-${exercise.id}`}>
    <Heading>Case 5: {exercise.title}</Heading>
    <p className="small muted">{solvedLabel(solved)}{solved.solvedAt && ` · checked ${formatDate(solved.solvedAt)}`}</p>
    <p>This weekly reporting tool uses this investigation&rsquo;s exact last successfully checked code. Download all five files into one folder with their exact names. Keep main and variation packages in separate folders. No dependencies or npm install are needed.</p>
    <CodeBlock code={solved.code} label={`Checked code for ${exercise.title}`} />
    <div className="actions">{files.map(file => <button type="button" key={file.name}
      className={file.name === REPORTING_RUN_FILE ? "primary" : undefined} onClick={() => download(file)}>Download {file.name}</button>)}</div>
    <p role="status" className="small">{status}</p>
    {failedFile && <div>
      <p role="alert">Your browser could not start the download. Try the button again, or copy the selected text into a plain text file named {failedFile.name}.</p>
      <label>Copy {failedFile.name} to save manually<textarea ref={fallback} readOnly value={failedFile.text} rows={8} /></label>
    </div>}
    <details className="export-help"><summary>How to run your weekly reporting tool</summary>
      <ol>
        <li>Install Node.js 24 LTS from nodejs.org. Check with <code>node --version</code>.</li>
        <li>Put <code>weekly-report.mjs</code>, <code>orders.json</code>, <code>entries.json</code>, <code>period.json</code> and <code>README.md</code> in a new folder. Open a terminal there.</li>
        <li>Print JSON: <code>node weekly-report.mjs orders.json entries.json period.json</code>.</li>
        <li>Save JSON: <code>node weekly-report.mjs orders.json entries.json period.json report.json</code>. The message gives the output location. Existing reports are replaced after successful preparation; choose a new name to keep one.</li>
        <li>Try <code>node weekly-report.mjs another-orders.json another-entries.json another-period.json weekly-report.json</code>. Quote paths with spaces.</li>
      </ol>
      <p>Node needs paths to find your files. It reads JSON text and passes raw arrays and the period to your function. Structural errors stop the file; blank or malformed business values remain your function&rsquo;s validation work. Read README.md for the exact fields.</p>
      <p>The period selects field-time entries, including both boundary days. Invalid or reversed dates must make your function throw <code>Error(&quot;Invalid reporting period&quot;)</code>. A bad report never becomes successful output.</p>
      <p>Inspect audit.orders and audit.entries to trace rejected/excluded records, original source lines, reasons and links. Separate entry IDs for one job can be real separate visits. Conflicting versions of one ID are held together for human review; choosing one silently could invent a result. Verify daily/site hours, distinct jobs and occurrence counts against the originals.</p>
      <p>stdout contains JSON only; stderr carries console messages, errors and save confirmation. A nonzero exit means failure. All three inputs and their file-link aliases are protected. Staging, sync and rename preserve existing reports on preparation failures. External concurrent file changes and power loss remain limits; never redirect stdout over an input.</p>
      <p><strong>Only run code you trust.</strong> Node has normal filesystem permissions, no browser sandbox timeout or memory cap. Copy to IDE uses your current draft; these downloads keep your earlier passing code after edits, failed/stopped checks, refresh and navigation.</p>
    </details>
  </article>;
}
