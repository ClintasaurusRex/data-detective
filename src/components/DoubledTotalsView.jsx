import { useEffect, useRef, useState } from "react";
import { CodeBlock, RecordTable, RichText } from "./common.jsx";
import { solvedLabel } from "./format.js";
import { Workbench } from "./Workbench.jsx";

export function DoubledTotalsView({ caseDef, caseState, updateCase, exerciseStates, updateExercise, runner }) {
  const exercise = caseDef.exercises[0];
  const state = exerciseStates[exercise.id];
  const draft = state.draft ?? exercise.starterCode;
  const stale = state.solved && state.solved.code !== draft;
  const prediction = caseState.prediction;
  const inputRef = useRef(null);
  const [prompt, setPrompt] = useState(false);
  function beforeRun() {
    if (prediction) return true;
    setPrompt(true);
    inputRef.current?.focus();
    return false;
  }
  function describeRun(result) {
    if (!prediction || prediction.skipped) return null;
    return `You predicted ${prediction.value} reliable hours. Your code returned ${JSON.stringify(result.output.totalHours) ?? "no total"}. Compare your audit trail with the evidence; matching a prediction does not prove the code is correct.`;
  }
  const rawTotal = exercise.rows.reduce((sum, row) => sum + row.hours, 0);
  return <article className="case" aria-labelledby="case-title">
    <header className="case-header">
      <p className="eyebrow">Case {caseDef.number}</p><h2 id="case-title">{caseDef.title}</h2>
      <p className={`badge ${state.solved && !stale ? "badge-solved" : ""}`} data-testid="case-status">{stale ? "Needs checking again" : state.solved ? "Solved" : "Open case"}</p>
    </header>
    <section className="panel request" aria-labelledby="request-title">
      <h3 id="request-title">The request</h3>
      <blockquote><p>&ldquo;{caseDef.request}&rdquo;</p><footer>{caseDef.colleague.name}, {caseDef.colleague.role}, Riverbend Water Services</footer></blockquote>
      <p className="target"><strong>Your target: </strong>{caseDef.target}</p>
      <p>This case starts with cleaned records. You can play it before Case 2. Your investigation is about repeated jobs, not CSV parsing or fixing invalid values.</p>
    </section>
    <section className="panel evidence" aria-labelledby="evidence-title">
      <h3 id="evidence-title">The evidence: Sam&rsquo;s combined staging file</h3>
      <p>The raw import adds up to <strong>{rawTotal} hours</strong>. That includes every copy and every competing version; it is not yet a reliable work total.</p>
      <RecordTable rows={exercise.rows} caption="Combined weekly export: original records" />
      <p className="small">The # column counts displayed records. The numeric line is the starting physical line in the combined file, including gaps after multiline notes. It traces an occurrence; id identifies a job. Quoted strings expose exact spaces and line breaks.</p>
      <details><summary>Detective&rsquo;s notebook: trace one job</summary>
        <p>Find every occurrence of 00111. Compare hours, then status and notes. Does a later disagreement change what you can safely do with an earlier identical pair? Make three paper lists: retain, exact copy, needs review.</p>
        <p>Next follow 00110. Which occurrence came first? If you exclude a copy, how could Sam find the retained original? Keep the link as evidence.</p>
      </details>
    </section>
    <section className="panel" aria-labelledby="rules-title">
      <h3 id="rules-title">Your reporting contract</h3>
      <ul className="lesson-rules">{caseDef.rules.map(rule => <li key={rule}><RichText text={rule} /></li>)}</ul>
      <details><summary>Return shape</summary><CodeBlock label="Audit return shape" code={'{\n  kept: [/* safe originals */],\n  duplicates: [{ record: /* later original */, keptLine: /* first line */ }],\n  conflicts: [{ id: /* exact ID */, records: [/* every version */] }],\n  totalHours: /* sum of kept hours */\n}'} /></details>
      <details className="glossary"><summary>JavaScript field guide: keys and groups</summary><dl>
        <div><dt>Unique key</dt><dd>The field that identifies one job: here the exact string id. Line identifies an occurrence, so it is evidence rather than the grouping key.</dd></div>
        <div><dt>Map</dt><dd><code>new Map()</code> holds key → value pairs. <code>has(key)</code> checks for a key, <code>set(key, value)</code> stores one, and <code>get(key)</code> retrieves it. An array as the value can hold all versions of a job.</dd></div>
        <div><dt>Set</dt><dd><code>new Set()</code> keeps distinct values. It can track IDs already seen, but seeing an ID twice does not prove its records agree. You still need the versions to compare.</dd></div>
        <div><dt>Grouping and equality</dt><dd>Collect related rows first, then compare their business fields. <code>every(test)</code> checks all array entries; <code>===</code> compares primitive values exactly. Two separate objects are not equal by reference just because their fields match.</dd></div>
        <div><dt>Summing and order</dt><dd><code>reduce((sum, row) =&gt; sum + row.hours, 0)</code> adds hours from a chosen list. A Map visits keys in insertion order. Interleaved groups may need a separate pass or ordering of a new output list. Do not sort the input array.</dd></div>
      </dl></details>
    </section>
    <HoursPrediction prediction={prediction} inputRef={inputRef} prompt={prompt} onChange={value => { setPrompt(false); updateCase(s => ({ ...s, prediction: value })); }} />
    <section className="panel" aria-labelledby="investigate-title">
      <h3 id="investigate-title">Reconcile the report</h3>
      <p>Experiment with one ID at a time and log what you find. Run shows your actual audit trail. Check solution tests all {exercise.checks.length} datasets before recording a solve.</p>
      <p className="small">Copy to IDE gives you this sample and your current draft as challenge.js. It does not read files; a full Case 3 Node-file workflow is not available yet.</p>
      <Workbench exercise={exercise} state={state} update={fn => updateExercise(exercise.id, fn)} runner={runner} beforeRun={beforeRun} describeRun={describeRun}
        challenge={{ caseNumber: 3, caseTitle: caseDef.title, exerciseTitle: exercise.title, request: caseDef.request,
          requestFrom: `${caseDef.colleague.name}, ${caseDef.colleague.role}`, goal: exercise.goal, rules: caseDef.rules, rows: exercise.rows }} />
    </section>
    {state.solved && <section className="panel solved" aria-labelledby="solved-title" data-testid="solved-panel">
      <h3 id="solved-title">{stale ? "Your earlier audit passed" : "Case solved"}</h3>
      <p>{solvedLabel({ ...state.solved, solutionRevealed: state.solutionRevealed })}. Your checked code accounts for every occurrence and only totals safely retained jobs. Sam has a traceable list of questions for the crews.</p>
      <p>{stale ? "Your draft has changed and needs checking again. Your last passing code is preserved below." : "Explain why excluding conflicting versions is different from saying no work happened. Reconcile the lists as well as the subtotal."}</p>
      <details><summary>Inspect the code that passed</summary><CodeBlock code={state.solved.code} label="Last passing Case 3 code" /></details>
      <p className="small">Checked code is saved here. The Toolbox continues to offer Case 1 and 2 tools; Case 3 has no full file-processing download yet.</p>
    </section>}
  </article>;
}

function HoursPrediction({ prediction, inputRef, prompt, onChange }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(null);
  const interacted = useRef(false);
  useEffect(() => { if (interacted.current) inputRef.current?.focus(); }, [prediction, editing, inputRef]);
  function submit(event) {
    event.preventDefault();
    const n = Number(value);
    if (value.trim() === "" || !Number.isFinite(n) || n < 0 || n > 1000 || !Number.isInteger(n * 4)) {
      setError("Predict a nonnegative number of hours in quarter-hour steps (0.25), up to 1000."); return;
    }
    interacted.current = true;
    setEditing(false); setError(null); onChange({ value: n });
  }
  return <section className="panel prediction" aria-labelledby="prediction-title" data-testid="prediction">
    <h3 id="prediction-title">Your prediction</h3>
    <p>How many hours can Sam reliably count after resolving only the safe copies? Predict a subtotal before running; no score or penalty. Counts and totals alone do not prove an audit trail is correct.</p>
    {!prediction || prediction.skipped || editing ? <form onSubmit={submit}>
      {prompt && <p className="notice" role="alert">Before running or checking, make a prediction or skip for now.</p>}
      <div className="inline-fields"><label>Reliable hours<input ref={inputRef} type="number" min="0" max="1000" step="0.25" className="number-input" value={value} onChange={e => setValue(e.target.value)} /></label>
        <button type="submit" className="primary">Save prediction</button>
        <button type="button" className="link-button" onClick={() => { interacted.current = true; setEditing(false); setError(null); onChange({ skipped: true }); }}>Skip for now</button></div>
      {error && <p className="feedback error" role="alert">{error}</p>}
      {prediction?.skipped && <p className="small muted">Prediction skipped. You can still make one.</p>}
    </form> : <div><p data-testid="prediction-value">You predicted {prediction.value} reliable hours. Trace the records, then compare with your code.</p>
      <button ref={inputRef} type="button" className="link-button" onClick={() => { interacted.current = true; setValue(String(prediction.value)); setEditing(true); }}>Change my prediction</button></div>}
  </section>;
}
