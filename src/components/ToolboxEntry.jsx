import { buildNodeScript, buildSampleJson, downloadText } from "../export/nodeScript.js";
import { CodeBlock } from "./common.jsx";
import { formatDate, solvedLabel } from "./format.js";
import { CsvToolboxEntry } from "./CsvToolboxEntry.jsx";
import { TwoExportsToolboxEntry } from "./TwoExportsToolboxEntry.jsx";
import { DoubledTotalsToolboxEntry } from "./DoubledTotalsToolboxEntry.jsx";

// One checked script in the Toolbox, with downloads and instructions.
export function ToolboxEntry({ exercise, solved, headingLevel = 3 }) {
  if (exercise.outputKind === "accepted-rejected") return <CsvToolboxEntry exercise={exercise} solved={solved} headingLevel={headingLevel} />;
  if (exercise.outputKind === "deduplication") return <DoubledTotalsToolboxEntry exercise={exercise} solved={solved} headingLevel={headingLevel} />;
  if (exercise.outputKind === "reconciliation") return <TwoExportsToolboxEntry exercise={exercise} solved={solved} headingLevel={headingLevel} />;
  if (exercise.outputKind === "weekly-report") {
    const Heading = `h${headingLevel}`;
    return <article className="toolbox-entry" data-testid={`toolbox-${exercise.id}`}>
      <Heading>Case 5: {exercise.title}</Heading>
      <p className="small muted">{solvedLabel(solved)}{solved.solvedAt && ` · checked ${formatDate(solved.solvedAt)}`}</p>
      <CodeBlock code={solved.code} label={`Checked code for ${exercise.title}`} />
      <p>Your exact last passing browser code is kept here. Production Node file downloads await Slice 2.</p>
    </article>;
  }
  const Heading = `h${headingLevel}`;
  const fileName = exercise.exportFileName;

  function downloadScript() {
    const script = buildNodeScript({
      code: solved.code,
      caseNumber: exercise.caseNumber,
      caseTitle: exercise.caseTitle,
      exerciseTitle: exercise.title,
      fileName,
      checkedAt: solved.solvedAt ? new Date(solved.solvedAt).toISOString().slice(0, 10) : null,
    });
    downloadText(fileName, script, "text/javascript");
  }

  function downloadSample() {
    downloadText("sample.json", buildSampleJson(exercise.rows), "application/json");
  }

  return (
    <article className="toolbox-entry" data-testid={`toolbox-${exercise.id}`}>
      <Heading>
        Case {exercise.caseNumber}: {exercise.title}
      </Heading>
      <p className="small muted">
        {solvedLabel(solved)}
        {solved.solvedAt && ` · checked ${formatDate(solved.solvedAt)}`}
      </p>
      <CodeBlock code={solved.code} label={`Checked code for ${exercise.title}`} />
      <div className="actions">
        <button type="button" className="primary" onClick={downloadScript}>
          Download {fileName}
        </button>
        <button type="button" onClick={downloadSample}>
          Download sample.json
        </button>
      </div>
      <details className="export-help">
        <summary>How to run it on your computer</summary>
        <ol>
          <li>
            Install Node.js 24 LTS or newer from nodejs.org if you don&rsquo;t have it. Check with{" "}
            <code>node --version</code>.
          </li>
          <li>Put both downloaded files in the same folder.</li>
          <li>
            Open a terminal in that folder and run <code>node {fileName} sample.json</code>. The result is printed as JSON.
          </li>
          <li>
            To save the result instead, run <code>node {fileName} sample.json result.json</code>.
            {" "}Choose a separate output file; the runner protects the input, including links to it.
          </li>
          <li>Try it on your own JSON file, as long as it&rsquo;s an array of records with the same fields.</li>
          <li>
            Anything your code logs with <code>console.log</code> still shows in the terminal, but it&rsquo;s kept out of
            the JSON result, so a saved <code>result.json</code> stays valid.
          </li>
        </ol>
        <p>
          <strong>Why a separate script?</strong> In the browser, your function only receives the data the app hands
          it: browser code can&rsquo;t open files on your computer. The Node script adds the missing part. It reads a
          JSON file from your disk, runs your function, and prints or saves the result.
        </p>
        <p><strong>Only run code you trust.</strong> The downloaded script has normal filesystem permissions and no sandbox timeout.</p>
      </details>
    </article>
  );
}
