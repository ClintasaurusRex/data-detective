// Independent per-key searches, deliberately no Map or grouping helper.
export const independentSolution = `function reconcile(orders, fieldReports) {
  const agreed=[], onlyOrders=[], onlyFieldReports=[], differences=[], ambiguous=[];
  const visited=[];
  for (const record of orders.concat(fieldReports)) {
    const id=record.id;
    if (visited.includes(id)) continue;
    visited.push(id);
    const left=orders.filter(r=>r.id===id);
    const right=fieldReports.filter(r=>r.id===id);
    if (left.length>1 || right.length>1) ambiguous.push({id,orders:left,fieldReports:right});
    else if (left.length===0) onlyFieldReports.push(right[0]);
    else if (right.length===0) onlyOrders.push(left[0]);
    else {
      const order=left[0],fieldReport=right[0],fields=[];
      if (order.site!==fieldReport.site) fields.push("site");
      if (order.status!==fieldReport.status) fields.push("status");
      if (order.hours!==fieldReport.hours) fields.push("hours");
      if (fields.length===0) agreed.push({order,fieldReport});
      else differences.push({order,fieldReport,fields});
    }
  }
  return {agreed,onlyOrders,onlyFieldReports,differences,ambiguous,
    summary:{orders:orders.length,fieldReports:fieldReports.length,agreed:agreed.length,
      onlyOrders:onlyOrders.length,onlyFieldReports:onlyFieldReports.length,
      differences:differences.length,ambiguous:ambiguous.length}};
}`;
export function expectedOutput(check) {
  const a=line=>check.orders.find(r=>r.line===line), b=line=>check.fieldReports.find(r=>r.line===line);
  const e=check.expected;
  return {agreed:e.agreed.map(([x,y])=>({order:a(x),fieldReport:b(y)})),onlyOrders:e.onlyOrders.map(a),onlyFieldReports:e.onlyFieldReports.map(b),
    differences:e.differences.map(([x,y,fields])=>({order:a(x),fieldReport:b(y),fields})),
    ambiguous:e.ambiguous.map(g=>({id:g.id,orders:g.orders.map(a),fieldReports:g.fieldReports.map(b)})),summary:e.summary};
}
export const wrongSolutions = {
  "numeric IDs":independentSolution.replaceAll('r.id===id','Number(r.id)===Number(id)'),
  "case folded IDs":independentSolution.replaceAll('r.id===id','r.id.toLowerCase()===id.toLowerCase()'),
  "match by status":independentSolution.replaceAll('r.id===id','r.status===record.status'),
  "match by index":independentSolution.replace('fieldReports.filter(r=>r.id===id)','[fieldReports[orders.indexOf(record)]].filter(Boolean)'),
  "first occurrence wins":independentSolution.replace('left.length>1 || right.length>1','false'),
  "same reference means agreement":independentSolution.replace('order.site!==fieldReport.site','order!==fieldReport'),
  "ignore hours":independentSolution.replace('order.hours!==fieldReport.hours','false'),
  "ignore status":independentSolution.replace('order.status!==fieldReport.status','false'),
  "ignore site":independentSolution.replace('order.site!==fieldReport.site','false'),
  "trim site":independentSolution.replace('order.site!==fieldReport.site','order.site.trim().toLowerCase()!==fieldReport.site.trim().toLowerCase()'),
  "all missing":independentSolution.replace('left.length>1 || right.length>1','false').replace('right.length===0','true'),
  "first key only":independentSolution.replace('orders.concat(fieldReports)','orders.concat(fieldReports).slice(0,1)'),
  "stop after first pair":independentSolution.replace('agreed.push({order,fieldReport});','{ agreed.push({order,fieldReport}); break; }'),
  "assume sorted":independentSolution.replace('fieldReports.filter(r=>r.id===id)','fieldReports.slice(0, orders.indexOf(record)+1).filter(r=>r.id===id)'),
  "last occurrence wins":independentSolution.replace('const left=orders.filter(r=>r.id===id);','const left=orders.filter(r=>r.id===id).slice(-1);').replace('const right=fieldReports.filter(r=>r.id===id);','const right=fieldReports.filter(r=>r.id===id).slice(-1);'),
};
