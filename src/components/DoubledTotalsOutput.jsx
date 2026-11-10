import { RecordTable } from "./common.jsx";

// Display only the returned audit trail, including incorrect learner values.
export function DoubledTotalsOutput({ result, rawTotal, describeRun }) {
  const value = result.output;
  if (!value || typeof value !== "object" || ![value.kept, value.duplicates, value.conflicts].every(Array.isArray)) {
    return <p className="feedback error" data-testid="run-error">Return kept, duplicates and conflicts arrays plus numeric totalHours. Use Show as JSON to inspect the actual result, then Check solution for detailed feedback.</p>;
  }
  const extra = describeRun?.(result);
  return <>
    <p className="feedback info" data-testid="hours-comparison">Raw imported total: {rawTotal} hours. Your reported reliable total: <strong>{JSON.stringify(value.totalHours) ?? "missing"}</strong> hours. Check solution verifies the audit trail and the sum.</p>
    <p className="small">A reliable subtotal counts safe retained jobs once. Conflicting versions need human review; excluding them does not mean zero work happened.</p>
    {extra && <p className="feedback info">{extra}</p>}
    {result.mutated && <p className="feedback warning">Your code changed the input. Preserve the originals and sort only new output lists.</p>}
    <section className="report-group" aria-label="Kept records">
      <h5>Kept records · {value.kept.length}</h5>
      <RecordTable rows={value.kept.slice(0, 200)} caption="Kept output: original records" />
      {!value.kept.length && <p className="muted">No kept records returned.</p>}
    </section>
    <section className="report-group" aria-label="Exact duplicate occurrences">
      <h5>Exact duplicate occurrences · {value.duplicates.length}</h5>
      {value.duplicates.slice(0, 200).map((entry, i) => <div className="rejected-entry" key={i}>
        <p>Duplicate item {i + 1} links to retained file line <code>{JSON.stringify(entry?.keptLine) ?? "missing"}</code>.</p>
        <RecordTable rows={[entry?.record]} caption={`Duplicate item ${i + 1}: original occurrence`} />
      </div>)}
      {!value.duplicates.length && <p className="muted">No duplicate occurrences returned.</p>}
    </section>
    <section className="report-group" aria-label="Conflicting job groups">
      <h5>Conflicting job groups · {value.conflicts.length}</h5>
      <p className="small">Every version of a conflicting ID belongs together. Ask the crews which information is correct.</p>
      {value.conflicts.slice(0, 200).map((group, i) => <div className="rejected-entry" key={i}>
        <p>Conflict item {i + 1}: job <code>{JSON.stringify(group?.id) ?? "missing"}</code></p>
        {Array.isArray(group?.records)
          ? <RecordTable rows={group.records.slice(0, 200)} caption={`Conflict item ${i + 1}: original occurrences`} />
          : <p className="feedback warning">This group needs a records array. Inspect Show as JSON and check the return shape.</p>}
      </div>)}
      {!value.conflicts.length && <p className="muted">No conflict groups returned.</p>}
    </section>
    <p className="small muted">Tables show up to 200 items per list or group. Show as JSON contains the complete returned result.</p>
  </>;
}
