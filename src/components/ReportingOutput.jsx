import { CodeBlock, RecordTable } from './common.jsx';

export function ReportingSources({ orders, entries, period, prefix='Source' }) {
  return <>
    <p><strong>Reporting period (inclusive): </strong><code>{JSON.stringify(period)}</code></p>
    <div className="source-exports">
      <section><h4>Work-order export</h4><RecordTable rows={orders} caption={`${prefix}: work orders`} />{!orders.length && <p>No work orders.</p>}</section>
      <section><h4>Field-time export</h4><RecordTable rows={entries} caption={`${prefix}: field time`} />{!entries.length && <p>No field entries.</p>}</section>
    </div>
  </>;
}
const explanations = {
  retained:'Safe first work-order occurrence; may have no reportable time.',
  included:'Valid unique/first time entry in the period, matched to a safe complete order.',
  rejected:'Malformed or missing information; follow up using all reasons below.',
  duplicate:'Repeated cleaned business information; adds no independent work.',
  conflict:'Competing valid versions of this ID; all occurrences held for review.',
  'out-of-period':'Valid safe entry outside the inclusive reporting dates.',
  'ambiguous-order':'Entry references a job with conflicting valid work orders.',
  unmatched:'No unambiguous valid work order for this exact job ID.',
  'incomplete-order':'Matched work order is open or on hold; excluded from completed-work totals.'
};
export function ReportingOutput({ result, describeRun }) {
  const out=result.output;
  if (!out || !Array.isArray(out.daily) || !Array.isArray(out.sites) || !Array.isArray(out.audit?.orders) || !Array.isArray(out.audit?.entries)) return <p className="feedback error" data-testid="run-error">Return the weekly report with daily, sites, counts and both audit arrays. Your actual result remains in Show as JSON; Check solution explains contract problems.</p>;
  return <>
    {describeRun?.(result) && <p className="feedback info">{describeRun(result)}</p>}
    {result.mutated && <p className="feedback warning">Your code changed an input source or period. Preserve originals and build cleaned copies.</p>}
    <section aria-label="Reliable weekly totals"><h5>Reliable weekly totals returned by your code</h5><CodeBlock label="Returned grand totals" code={JSON.stringify({period:out.period,totalHours:out.totalHours,jobCount:out.jobCount,entryCount:out.entryCount},null,2)} /><p className="small">Run displays your values; Check solution verifies reliability and audit evidence.</p></section>
    {[['daily','Daily breakdown'],['sites','Site breakdown']].map(([key,title])=><section key={key} aria-label={title}><h5>{title}</h5><RecordTable rows={out[key].slice(0,200)} caption={`Returned ${title.toLowerCase()}`} />{!out[key].length && <p>No groups returned.</p>}</section>)}
    <section aria-label="Audit accounting"><h5>Audit accounting</h5><CodeBlock label="Returned counts" code={JSON.stringify(out.counts,null,2) ?? 'No counts returned'} /><p className="small">valid overlaps the disposition counts. conflicts counts occurrences; conflictGroups counts unique IDs. Sum each source&rsquo;s dispositions back to input.</p></section>
    {['orders','entries'].map(source=><section key={source} aria-label={`${source} audit`}><h5>{source === 'orders' ? 'Work-order' : 'Field-time'} audit · {out.audit[source].length}</h5>
      {out.audit[source].slice(0,200).map((item,i)=><details className="rejected-entry" key={i}>
        <summary>Source line {JSON.stringify(item?.record?.line) ?? '?'} · {JSON.stringify(item?.cleaned?.entryId ?? item?.cleaned?.jobId ?? item?.record?.entryId ?? item?.record?.jobId) ?? '?'} · {JSON.stringify(item?.disposition) ?? 'missing disposition'}</summary>
        <p>{typeof item?.disposition === 'string' && Object.hasOwn(explanations,item.disposition) ? explanations[item.disposition] : 'Unknown disposition; inspect the actual item below.'}</p>
        <CodeBlock code={JSON.stringify(item,null,2)} label={`Returned ${source} audit item ${i+1}`} />
      </details>)}
    </section>)}
    <p className="small">Up to 200 groups/items shown per list. Show as JSON contains the complete returned report, including every original, cleaned value, exclusion reason and link.</p>
  </>;
}
