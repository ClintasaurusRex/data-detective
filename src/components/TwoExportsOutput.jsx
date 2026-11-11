import { CodeBlock, RecordTable } from "./common.jsx";

export function SourceExports({ orders, fieldReports, prefix = "Source" }) {
  return <div className="source-exports">
    <section><h4>Scheduling export</h4><RecordTable rows={orders} caption={`${prefix}: scheduling records`} headings={{line:"Source line",id:"Job ID",site:"Planned site",status:"Scheduled status",hours:"Planned hours"}} />{!orders.length && <p>No scheduling records.</p>}</section>
    <section><h4>Field operations export</h4><RecordTable rows={fieldReports} caption={`${prefix}: field records`} headings={{line:"Source line",id:"Job ID",site:"Reported site",status:"Observed status",hours:"Actual hours"}} />{!fieldReports.length && <p>No field records.</p>}</section>
  </div>;
}

// Inspect returned values only. Unexpected shapes remain available in raw JSON.
export function TwoExportsOutput({ result, describeRun }) {
  const out = result.output;
  const categories = [["agreed","Agreements"],["onlyOrders","Missing field records (scheduling only)"],["onlyFieldReports","Missing scheduling records (field only)"],["differences","Differences requiring follow-up"],["ambiguous","Ambiguous IDs"]];
  if (!out || !categories.every(([key])=>Array.isArray(out[key]))) return <p className="feedback error" data-testid="run-error">Return the five reconciliation arrays and summary. Show as JSON preserves your actual result; Check solution explains contract problems.</p>;
  return <>
    {describeRun?.(result) && <p className="feedback info">{describeRun(result)}</p>}
    {result.mutated && <p className="feedback warning">Your code changed an input export. Preserve both sources without sorting or editing originals.</p>}
    <section aria-label="Reconciliation summary"><h5>Reconciliation summary</h5><CodeBlock code={JSON.stringify(out.summary,null,2) ?? "No summary returned"} label="Returned reconciliation summary" /><p className="small">Source totals count occurrences; ambiguous counts groups. Trace both sources inside each group to audit the totals. Run shows your output; Check solution verifies it.</p></section>
    {categories.map(([key,title])=><section key={key} className="report-group" aria-label={title}>
      <h5>{title} · {out[key].length}</h5>
      {!out[key].length && <p className="muted">No entries returned.</p>}
      {key === "onlyOrders" || key === "onlyFieldReports" ? <RecordTable rows={out[key].slice(0,200)} caption={`Returned originals: ${title}`} /> : out[key].slice(0,200).map((entry,i)=><div className="rejected-entry" key={i}>
        {key === "ambiguous" ? <>
          <p>Ambiguous job <code>{JSON.stringify(entry?.id) ?? "missing"}</code>. Keep every version for review.</p>
          {Array.isArray(entry?.orders) && Array.isArray(entry?.fieldReports) ? <SourceExports orders={entry.orders.slice(0,200)} fieldReports={entry.fieldReports.slice(0,200)} prefix={`Ambiguous item ${i+1}`} /> : <p className="feedback warning">Both source arrays are required.</p>}
        </> : <>
          {key === "differences" && <p>Differing fields: <code>{JSON.stringify(entry?.fields) ?? "missing"}</code>. Planned versus actual differences need a conversation.</p>}
          <RecordTable rows={[entry?.order]} caption={`${title} item ${i+1}: scheduling original`} />
          <RecordTable rows={[entry?.fieldReport]} caption={`${title} item ${i+1}: field original`} />
        </>}
      </div>)}
    </section>)}
    <p className="small muted">Up to 200 entries per list or group are displayed. Show as JSON contains the complete returned report.</p>
  </>;
}
