import { useEffect, useRef, useState } from "react";
import { REASONS, rowsFromCsv } from "../missions/messyExport.contract.js";
import { malformedDatasets } from "../missions/messyExport.fixtures.js";
import { CodeBlock, RecordTable, RichText } from "./common.jsx";
import { solvedLabel } from "./format.js";
import { Workbench } from "./Workbench.jsx";
import { ToolboxEntry } from "./ToolboxEntry.jsx";

export function MessyExportView({ caseDef, caseState, updateCase, exerciseStates, updateExercise, runner }) {
  const exercise = caseDef.exercises[0];
  const state = exerciseStates[exercise.id];
  const predictionRef = useRef(null);
  const [prompt, setPrompt] = useState(false);
  const draft = state.draft ?? exercise.starterCode;
  const stale = state.solved && state.solved.code !== draft;
  const prediction = caseState.prediction;

  function beforeRun() {
    if (prediction) return true;
    setPrompt(true);
    predictionRef.current?.focus();
    return false;
  }

  function describeRun(result) {
    if (!prediction || prediction.skipped) return null;
    const { accepted, rejected } = result.output;
    const counts = `${accepted.length} accepted and ${rejected.length} rejected`;
    const matches = accepted.length === prediction.accepted && rejected.length === prediction.rejected;
    return `Your code returned ${counts}. You predicted ${prediction.accepted} accepted and ${prediction.rejected} rejected. ${matches ? "The counts match, but counts alone don't prove the records are correct." : "Trace the file lines in each list to investigate the difference."} Use Check solution to test the values and every dataset.`;
  }

  return (
    <article className="case" aria-labelledby="case-title">
      <header className="case-header">
        <p className="eyebrow">Case {caseDef.number}</p>
        <h2 id="case-title">{caseDef.title}</h2>
        <p className={`badge ${state.solved && !stale ? "badge-solved" : ""}`} data-testid="case-status">
          {stale ? "Needs checking again" : state.solved ? "Solved" : "Open case"}
        </p>
      </header>
      <section className="panel request" aria-labelledby="request-title">
        <h3 id="request-title">The request</h3>
        <blockquote>
          <p>&ldquo;{caseDef.request}&rdquo;</p>
          <footer>{caseDef.colleague.name}, {caseDef.colleague.role}, Riverbend Water Services</footer>
        </blockquote>
        <p className="target"><strong>Your target: </strong>{caseDef.target}</p>
        <p>First inspect the file, then trace the parsed records. Cleaning fixes harmless differences; validation decides which records can be trusted. Reject unknown values with reasons so Priya can ask the crews.</p>
      </section>

      <section className="panel" aria-labelledby="csv-title">
        <h3 id="csv-title">Investigate jobs-export.csv</h3>
        <p>Look for blank hours, a missing ID, a word used as hours and an unfamiliar status. Which differences can you safely clean? Which information would you need to ask someone for?</p>
        <CsvSource csv={exercise.csv} />
        <p className="small">Spaces appear as ·, tabs as ⇥ and physical line endings as ↵. This is a view of the original CSV; these markers are not part of its values. The original file uses Windows line endings.</p>
        <ul>
          <li>A comma inside double quotes belongs to one value: line 5 has a note with a comma.</li>
          <li>A quoted value can span physical lines: lines 7–8 are one job. Two quote marks inside a quoted field represent one literal quote.</li>
          <li><code>004101</code> is a job identifier. Keep the leading zeros: it must stay a string.</li>
        </ul>
        <details>
          <summary>Inspect the parsed records supplied to transform</summary>
          <p>The app uses a CSV library to parse file structure. You write cleaning and validation, not a CSV parser. Splitting on commas or line breaks would break quoted notes.</p>
          <p className="small">The # column counts records; <code>line</code> is the starting file line. Strings are quoted, blanks show as <code>""</code>, and embedded line breaks show as <code>\n</code>. Nothing has been trimmed or converted.</p>
          <RecordTable rows={exercise.rows} caption="Parsed input records" />
          <CodeBlock code={JSON.stringify(exercise.rows, null, 2)} label="Parsed input as JSON" />
        </details>
      </section>

      <section className="panel" aria-labelledby="rules-title">
        <h3 id="rules-title">Your reporting contract</h3>
        <ul className="lesson-rules">{caseDef.rules.map((rule) => <li key={rule}><RichText text={rule} /></li>)}</ul>
        <details className="glossary">
          <summary>JavaScript field guide</summary>
          <dl>
            <div><dt><code>trim()</code> and <code>toLowerCase()</code></dt><dd>Make cleaned copies of strings. <code>" Open ".trim().toLowerCase()</code> becomes <code>"open"</code>. Middle spaces stay; the original record stays untouched.</dd></div>
            <div><dt>Blank is not zero</dt><dd><code>Number("")</code> and <code>Number("   ")</code> are both 0. A blank hour means nobody supplied the value. Check blank text before converting; a recorded <code>"0"</code> is valid.</dd></div>
            <div><dt>Format, conversion, then finite number</dt><dd><code>Number()</code> converts text, but also accepts formats this report forbids, such as <code>"1e3"</code>. Validate the written format first: digits with an optional dot and more digits. <code>Number.isFinite()</code> checks the converted number is neither Infinity nor NaN; even all-digit text can overflow.</dd></div>
            <div><dt>Identifiers stay strings</dt><dd><code>"000017"</code> and <code>"17"</code> identify different jobs. Converting the first to a number loses information. Trim IDs, but never convert them.</dd></div>
          </dl>
        </details>
        <details>
          <summary>Return shape and reason-code meanings</summary>
          <CodeBlock label="Return shape example" code={'{\n  accepted: [\n    { line: 2, id: "004101", status: "complete", hours: 3.5, notes: "Replaced meter" }\n  ],\n  rejected: [\n    { record: /* original row */, reasons: ["missing-hours"] }\n  ]\n}'} />
          <ul>{Object.entries(REASONS).map(([code, reason]) => <li key={code}><code>{code}</code>: {reason.text}</li>)}</ul>
        </details>
      </section>

      <MessyPrediction prediction={prediction} prompt={prompt} inputRef={predictionRef} rowCount={exercise.rows.length}
        onChange={(value) => { setPrompt(false); updateCase((s) => ({ ...s, prediction: value })); }} />

      <section className="panel" aria-labelledby="investigate-title">
        <h3 id="investigate-title">Build the report</h3>
        <p>Start with one record and experiment. Use <code>console.log</code> to inspect your decisions. Run shows your actual output; only Check solution can solve the case by passing all {exercise.checks.length} datasets.</p>
        <p className="small">Copy to IDE gives you a runnable parsed-record challenge. After your solution passes the checks, the Toolbox offers a separate Node tool that reads real CSV files.</p>
        <Workbench exercise={exercise} state={state} update={(fn) => updateExercise(exercise.id, fn)} runner={runner}
          beforeRun={beforeRun} describeRun={describeRun}
          challenge={{ caseNumber: caseDef.number, caseTitle: caseDef.title, exerciseTitle: exercise.title,
            request: caseDef.request, requestFrom: `${caseDef.colleague.name}, ${caseDef.colleague.role}`,
            goal: exercise.goal, rules: caseDef.rules, rows: exercise.rows, parsedRecords: true }} />
      </section>

      {state.solved && <section className="panel solved" aria-labelledby="solved-title" data-testid="solved-panel">
        <h3 id="solved-title">{stale ? "Your earlier solution passed" : "Case solved"}</h3>
        <p>{solvedLabel({ ...state.solved, solutionRevealed: state.solutionRevealed })}. Your checked code passed all {exercise.checks.length} datasets: cleaned records, traceable originals, all reasons and no missing jobs.</p>
        <p>{stale ? "The current draft needs checking again. Your earlier passing code is kept below." : "Priya can now distinguish safe records from those needing follow-up. Explain why blank hours differ from zero before moving on."}</p>
        <details><summary>Inspect the code that passed</summary><CodeBlock code={state.solved.code} label="Last passing Case 2 code" /></details>
        <ToolboxEntry exercise={exercise} solved={state.solved} headingLevel={4} />
      </section>}
      <CsvErrors />
    </article>
  );
}

export function CsvSource({ csv }) {
  const text = csv.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = text.replace(/\n$/, "").split("\n");
  return <pre className="code-block csv-source" tabIndex={0} aria-label="CSV with file line numbers and visible whitespace"><code>
    {text === "" ? "(empty file)" : lines.map((line, i) => <span className="csv-line" key={i}><span className="csv-line-number">{i + 1}</span>{line.replace(/ /g, "·").replace(/\t/g, "⇥")}{i < lines.length - 1 || text.endsWith("\n") ? "↵" : ""}{"\n"}</span>)}
  </code></pre>;
}

function MessyPrediction({ prediction, prompt, inputRef, rowCount, onChange }) {
  const [editing, setEditing] = useState(false);
  const [accepted, setAccepted] = useState("");
  const [rejected, setRejected] = useState("");
  const [error, setError] = useState(null);
  const showForm = !prediction || prediction.skipped || editing;
  const interacted = useRef(false);
  useEffect(() => {
    if (interacted.current) inputRef.current?.focus();
  }, [editing, prediction, inputRef]);
  function submit(event) {
    event.preventDefault();
    const a = Number(accepted), r = Number(rejected);
    if (accepted === "" || rejected === "" || !Number.isInteger(a) || !Number.isInteger(r) || a < 0 || r < 0 || a + r !== rowCount) {
      setError(`Account for all ${rowCount} records once: accepted plus rejected must equal ${rowCount}.`);
      return;
    }
    interacted.current = true;
    setError(null);
    setEditing(false);
    onChange({ accepted: a, rejected: r });
    inputRef.current?.focus();
  }
  return <section className="panel prediction" aria-labelledby="prediction-title" data-testid="prediction">
    <h3 id="prediction-title">Your prediction</h3>
    <p>There are {rowCount} records. Before running, predict how many are safe and how many need follow-up. This is a thinking step, with no score or penalty. Compare your prediction with your code after a run.</p>
    {showForm ? <form onSubmit={submit}>
      {prompt && <p className="notice" role="alert">Before your first run or check, make a prediction or skip for now.</p>}
      <div className="inline-fields">
        <label>Accepted records<input className="number-input" ref={inputRef} type="number" min="0" max={rowCount} step="1" value={accepted} onChange={(e) => setAccepted(e.target.value)} /></label>
        <label>Rejected records<input className="number-input" type="number" min="0" max={rowCount} step="1" value={rejected} onChange={(e) => setRejected(e.target.value)} /></label>
        <button className="primary" type="submit">Save prediction</button>
        <button type="button" className="link-button" onClick={() => { interacted.current = true; setEditing(false); setError(null); onChange({ skipped: true }); }}>Skip for now</button>
      </div>
      {error && <p className="feedback error" role="alert">{error}</p>}
      {prediction?.skipped && <p className="small muted">Prediction skipped. You can still make one.</p>}
    </form> : <div>
      <p data-testid="prediction-value">You predicted {prediction.accepted} accepted and {prediction.rejected} rejected.</p>
      <button type="button" className="link-button" ref={inputRef} onClick={() => { interacted.current = true; setAccepted(String(prediction.accepted)); setRejected(String(prediction.rejected)); setEditing(true); }}>Change my prediction</button>
    </div>}
  </section>;
}

function CsvErrors() {
  const [selected, setSelected] = useState("unquotedComma");
  const dataset = malformedDatasets[selected];
  const parsed = rowsFromCsv(dataset.csv);
  return <section className="panel" aria-labelledby="csv-errors-title">
    <h3 id="csv-errors-title">When the file itself is broken</h3>
    <p>A file-structure problem stops the entire file before your function runs. These are CSV errors, not rejected business records. A quoted comma or a multiline note is valid; an unquoted comma can shift the columns.</p>
    <details>
      <summary>Explore malformed CSV examples</summary>
      <label className="example-picker">Example file <select value={selected} onChange={(e) => setSelected(e.target.value)}>
        {Object.entries(malformedDatasets).map(([key, d]) => <option key={key} value={key}>{d.name}</option>)}
      </select></label>
      <p>{dataset.description}</p>
      <CsvSource csv={dataset.csv} />
      <div className="feedback error" role="status" data-testid="csv-errors">
        <p><strong>File stopped. No partial report; no records passed to transform.</strong></p>
        <ul>{parsed.errors.map((error, i) => <li key={i}>File line {error.line} · <code>{error.code}</code>: {error.message}</li>)}</ul>
      </div>
      <p className="small">Ask for a corrected export, then parse the complete file again. Guessing at shifted columns could put the wrong hours against a job.</p>
    </details>
  </section>;
}
