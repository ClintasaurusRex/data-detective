import { useEffect, useRef, useState } from "react";
import { CodeBlock, RichText } from "./common.jsx";
import { SourceExports } from "./TwoExportsOutput.jsx";
import { Workbench } from "./Workbench.jsx";
import { ToolboxEntry } from "./ToolboxEntry.jsx";

export function TwoExportsView({ caseDef, caseState, updateCase, exerciseStates, updateExercise, runner }) {
  const exercise = caseDef.exercises[0], state = exerciseStates[exercise.id];
  const stale = state.solved && state.solved.code !== (state.draft ?? exercise.starterCode);
  const prediction = caseState.prediction;
  const inputRef = useRef(null);
  const [prompt,setPrompt] = useState(false);
  function beforeRun() {
    if (prediction) return true;
    setPrompt(true); inputRef.current?.focus(); return false;
  }
  function describeRun(result) {
    return !prediction || prediction.skipped ? null : `You predicted ${prediction.value} agreeing pairs. Your code returned ${Array.isArray(result.output?.agreed) ? result.output.agreed.length : "no agreement list"}. Matching counts do not prove the reconciliation is correct; trace the originals.`;
  }
  return <article className="case" aria-labelledby="case-title">
    <header className="case-header"><p className="eyebrow">Case 4</p><h2 id="case-title">The Two Exports</h2><p className={`badge ${state.solved && !stale ? "badge-solved" : ""}`} data-testid="case-status">{stale ? "Needs checking again" : state.solved ? "Solved" : "Open case"}</p></header>
    <section className="panel request" aria-labelledby="request-title"><h3 id="request-title">The request</h3><blockquote><p>&ldquo;{caseDef.request}&rdquo;</p><footer>{caseDef.colleague.name}, {caseDef.colleague.role}, Riverbend Water Services</footer></blockquote><p className="target"><strong>Your target: </strong>{caseDef.target}</p><p>Play this case independently. Both exports are already parsed and validated; your task is matching and reconciliation.</p></section>
    <section className="panel evidence" aria-labelledby="evidence-title"><h3 id="evidence-title">The evidence: two views of the same week</h3>
      <p>Scheduling records planned work; field operations records observed work. Compare exact job IDs across sources. A difference needs follow-up rather than automatically invalidating either record.</p>
      <SourceExports orders={exercise.orders} fieldReports={exercise.fieldReports} />
      <p className="small">Quoted strings expose exact text. Source line is original provenance within that export; line 2 in one source is unrelated to line 2 in the other. Each table scrolls inside its own region.</p>
      <details><summary>Detective&rsquo;s notebook: trace a counterpart</summary><p>Follow 0071 into the other export. Does its position matter? Now trace every occurrence of 0075. Can Sam safely choose one scheduling version? Try 0072: which system needs a follow-up?</p></details>
    </section>
    <section className="panel" aria-labelledby="rules-title"><h3 id="rules-title">Your reporting contract</h3><ul className="lesson-rules">{caseDef.rules.map(r=><li key={r}><RichText text={r} /></li>)}</ul>
      <details><summary>Return shape</summary><CodeBlock label="Reconciliation return shape" code={'{\n  agreed: [{ order, fieldReport }],\n  onlyOrders: [/* originals */],\n  onlyFieldReports: [/* originals */],\n  differences: [{ order, fieldReport, fields: ["hours"] }],\n  ambiguous: [{ id, orders: [], fieldReports: [] }],\n  summary: { orders: 0, fieldReports: 0, agreed: 0, onlyOrders: 0,\n    onlyFieldReports: 0, differences: 0, ambiguous: 0 }\n}'} /></details>
      <details className="glossary"><summary>JavaScript field guide: lookups and joins</summary><dl>
        <div><dt>Lookup and grouping</dt><dd>A Map connects a key to a value. <code>new Map()</code> starts one; <code>has(id)</code>, <code>set(id, value)</code> and <code>get(id)</code> check, store and retrieve. Holding an array per ID preserves duplicate occurrences instead of overwriting them.</dd></div>
        <div><dt>Nested loops</dt><dd>For each scheduling job, searching every field record can work correctly. A lookup lets you group once and retrieve by ID instead of repeating a full search. Either correct algorithm passes.</dd></div>
        <div><dt>Inner join</dt><dd>Keep IDs found on both sides. For example, 0071 has a counterpart; 0072 does not. A matched pair can still disagree on details.</dd></div>
        <div><dt>Left join</dt><dd>Keep all scheduling jobs and attach field counterparts when available. This would leave out field-only jobs such as 0077.</dd></div>
        <div><dt>Full outer join</dt><dd>Keep IDs from either source, including missing counterparts. Our reconciliation preserves all that evidence and separates ambiguous keys for human review.</dd></div>
        <div><dt>One-to-many</dt><dd>A repeated ID can connect one record to several candidates, or several to several. This report expects one-to-one work; keep the entire ambiguous group rather than manufacturing pairs.</dd></div>
        <div><dt>Value equality</dt><dd>Compare site, status and hours with strict equality. Separate objects need not be the same reference to agree. Compare no source lines and change no values.</dd></div>
      </dl></details>
    </section>
    <AgreementPrediction prediction={prediction} inputRef={inputRef} prompt={prompt} onChange={p=>{setPrompt(false);updateCase(s=>({...s,prediction:p}));}} />
    <section className="panel" aria-labelledby="investigate-title"><h3 id="investigate-title">Reconcile the two exports</h3><p>Run shows your actual report. Check solution tests all {exercise.checks.length} datasets before saving a solve. Use console.log to inspect a key or group.</p><p className="small">Copy to IDE provides both sample arrays and your current draft as runnable challenge.js. A standalone Node file-processing tool is a future slice.</p>
      <Workbench exercise={exercise} state={state} update={fn=>updateExercise(exercise.id,fn)} runner={runner} beforeRun={beforeRun} describeRun={describeRun} challenge={{caseNumber:4,caseTitle:caseDef.title,exerciseTitle:exercise.title,request:caseDef.request,requestFrom:`${caseDef.colleague.name}, ${caseDef.colleague.role}`,goal:exercise.goal,rules:caseDef.rules,orders:exercise.orders,fieldReports:exercise.fieldReports,reconciliation:true}} />
    </section>
    {state.solved && <section className="panel solved" data-testid="solved-panel" aria-labelledby="solved-title"><h3 id="solved-title">{stale ? "Your earlier reconciliation passed" : "Case solved"}</h3><p>Sam can trace every original and take missing jobs, differences and ambiguous keys back to the source teams. Explain why a matching ID alone does not prove agreement.</p><ToolboxEntry exercise={{...exercise,caseNumber:4}} solved={{...state.solved,solutionRevealed:state.solutionRevealed}} headingLevel={4} /></section>}
  </article>;
}

function AgreementPrediction({prediction,inputRef,prompt,onChange}) {
  const [editing,setEditing] = useState(false), [value,setValue] = useState(""), [error,setError] = useState(null);
  const interacted = useRef(false);
  useEffect(()=>{if(interacted.current) inputRef.current?.focus();},[prediction,editing,inputRef]);
  function submit(e) {
    e.preventDefault(); const n=Number(value);
    if (!value.trim() || !Number.isInteger(n) || n<0 || n>1000) {setError("Predict a whole number from 0 to 1000.");return;}
    interacted.current=true;setEditing(false);setError(null);onChange({value:n});
  }
  return <section className="panel prediction" aria-labelledby="prediction-title" data-testid="prediction"><h3 id="prediction-title">Your prediction</h3><p>How many unique pairs agree on all three business fields? Predict before running, or skip without penalty. Counts alone do not prove the report is correct.</p>
    {!prediction || prediction.skipped || editing ? <form onSubmit={submit}>
      {prompt && <p className="notice" role="alert">Before running or checking, make a prediction or skip for now.</p>}
      <div className="inline-fields"><label>Agreeing pairs<input ref={inputRef} type="number" min="0" max="1000" step="1" className="number-input" value={value} onChange={e=>setValue(e.target.value)} /></label><button type="submit" className="primary">Save prediction</button><button type="button" className="link-button" onClick={()=>{interacted.current=true;setEditing(false);setError(null);onChange({skipped:true});}}>Skip for now</button></div>
      {error && <p className="feedback error" role="alert">{error}</p>}{prediction?.skipped && <p className="small muted">Prediction skipped. You can still make one.</p>}
    </form> : <div><p data-testid="prediction-value">You predicted {prediction.value} agreeing pairs. Trace the evidence before checking.</p><button ref={inputRef} type="button" className="link-button" onClick={()=>{interacted.current=true;setValue(String(prediction.value));setEditing(true);}}>Change my prediction</button></div>}
  </section>;
}
