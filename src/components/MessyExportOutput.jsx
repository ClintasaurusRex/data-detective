import { REASONS } from "../missions/messyExport.contract.js";
import { RecordTable } from "./common.jsx";

// Output inspection is deliberately separate from checking. Render actual learner
// values, including incorrect ones; never replace them with fixture answers.
export function MessyExportOutput({ result, describeRun }) {
  const value = result.output;
  if (!value || typeof value !== "object" || Array.isArray(value) || !Array.isArray(value.accepted) || !Array.isArray(value.rejected)) {
    return <p className="feedback error" data-testid="run-error">Return an object with accepted and rejected arrays. Use Show as JSON to inspect your actual result, then Check solution for detailed feedback.</p>;
  }
  const extra = describeRun?.(result);
  return <>
    {extra && <p className="feedback info">{extra}</p>}
    {result.mutated && <p className="feedback warning">Your code changed the input. Build new accepted objects and keep rejected originals unchanged.</p>}
    <section className="report-group accepted" aria-label="Accepted records">
      <h5>Accepted records · {value.accepted.length}</h5>
      <p className="small">Cleaned values returned by your code. Check solution verifies them.</p>
      <RecordTable rows={value.accepted.slice(0, 200)} caption="Accepted output: cleaned values" />
      {value.accepted.length === 0 && <p className="muted">No accepted records returned.</p>}
    </section>
    <section className="report-group rejected" aria-label="Rejected records">
      <h5>Rejected records · {value.rejected.length}</h5>
      <p className="small">Original values and reasons returned by your code.</p>
      {value.rejected.slice(0, 200).map((entry, i) => <div className="rejected-entry" key={i}>
        {(!entry?.record || typeof entry.record !== "object" || Array.isArray(entry.record)) && <p className="feedback warning">This rejected entry needs an original record object. Inspect Show as JSON and check your return shape.</p>}
        <RecordTable rows={[entry?.record]} caption={`Rejected item ${i + 1}: original values`} />
        {Array.isArray(entry?.reasons) && entry.reasons.length > 0
          ? <ul>{entry.reasons.map((reason, index) => <li key={index}><code>{JSON.stringify(reason)}</code>: {typeof reason === "string" && Object.hasOwn(REASONS, reason) ? REASONS[reason].text : "Unknown reason code. Check the reporting contract."}</li>)}</ul>
          : <p className="feedback warning">No reason codes supplied. Every rejected record needs its reasons.</p>}
      </div>)}
      {value.rejected.length === 0 && <p className="muted">No rejected records returned.</p>}
    </section>
    {(value.accepted.length > 200 || value.rejected.length > 200) && <p className="note">Tables show the first 200 items per list. Show as JSON contains the complete returned result.</p>}
  </>;
}
