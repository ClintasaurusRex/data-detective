// Independent per-occurrence search implementation. No Map, no shared lesson
// helpers, calendar validated by UTC round-trip, hours parsed with BigInt.
export const independentReportingSolution = `function buildWeeklyReport(rawOrders, rawEntries, period) {
  function dateOK(s) {
    if (typeof s !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(s) || s.slice(0,4)==='0000') return false;
    const [y,m,d]=s.split('-').map(Number), date=new Date(0);
    date.setUTCFullYear(y,m-1,d); date.setUTCHours(0,0,0,0);
    return date.getUTCFullYear()===y && date.getUTCMonth()===m-1 && date.getUTCDate()===d;
  }
  if (!period || Object.keys(period).length!==2 || !dateOK(period.start) || !dateOK(period.end) || period.start>period.end) throw Error('Invalid reporting period');
  const orders=rawOrders.map(record=>{
    const jobId=record.jobId.trim(),site=record.site.trim(),status=record.status.trim().toLowerCase(),reasons=[];
    if (!jobId) reasons.push('missing-job-id');
    if (!site) reasons.push('missing-site');
    if (!status) reasons.push('missing-status');
    else if (!['open','complete','on hold'].includes(status)) reasons.push('invalid-status');
    return {record,cleaned:reasons.length ? null : {jobId,site,status},reasons,disposition:reasons.length ? 'rejected' : 'retained',duplicateOf:null};
  });
  const entries=rawEntries.map(record=>{
    const entryId=record.entryId.trim(),jobId=record.jobId.trim(),date=record.date.trim(),h=record.hours.trim(),reasons=[];
    let units=null;
    if (/^\\d+(\\.\\d{1,2})?$/.test(h)) {
      const [w,f='']=h.split('.');const n=BigInt(w)*100n+BigInt((f+'00').slice(0,2));
      if (n<=BigInt(Number.MAX_SAFE_INTEGER)) units=Number(n);
    }
    if (!entryId) reasons.push('missing-entry-id');
    if (!jobId) reasons.push('missing-job-id');
    if (!date) reasons.push('missing-date');else if (!dateOK(date)) reasons.push('invalid-date');
    if (!h) reasons.push('missing-hours');else if (units===null) reasons.push('invalid-hours');
    return {record,cleaned:reasons.length ? null : {entryId,jobId,date,hundredths:units},reasons,disposition:reasons.length ? 'rejected' : 'candidate',duplicateOf:null,orderLine:null};
  });
  function decide(items,key) {
    for (let i=0;i<items.length;i++) {
      const item=items[i];if (!item.cleaned) continue;
      const group=items.filter(other=>other.cleaned?.[key]===item.cleaned[key]);
      const unequal=group.some(other=>Object.keys(item.cleaned).some(k=>other.cleaned[k]!==item.cleaned[k]));
      if (unequal) item.disposition='conflict';
      else if (group[0]!==item) {item.disposition='duplicate';item.duplicateOf=group[0].record.line;}
    }
  }
  decide(orders,'jobId');decide(entries,'entryId');
  for (const item of entries) {
    if (item.disposition!=='candidate') continue;
    if (item.cleaned.date<period.start || item.cleaned.date>period.end) {item.disposition='out-of-period';continue;}
    const matches=orders.filter(o=>o.cleaned?.jobId===item.cleaned.jobId);
    if (matches.some(o=>o.disposition==='conflict')) item.disposition='ambiguous-order';
    else {
      const safe=matches.find(o=>o.disposition==='retained');
      if (!safe) item.disposition='unmatched';
      else {item.orderLine=safe.record.line;item.disposition=safe.cleaned.status==='complete' ? 'included' : 'incomplete-order';}
    }
  }
  const safe=entries.filter(x=>x.disposition==='included');
  function unique(values) {return values.filter((v,i)=>values.indexOf(v)===i);}
  function hours(list) {let n=0;for(const x of list)n+=x.cleaned.hundredths;return String(Math.trunc(n/100))+'.'+('0'+n%100).slice(-2);}
  function jobs(list) {return unique(list.map(x=>x.cleaned.jobId)).length;}
  function groups(key,lookup) {
    return unique(safe.map(lookup)).sort((a,b)=>a<b?-1:a>b?1:0).map(value=>{
      const items=safe.filter(x=>lookup(x)===value);
      return {[key]:value,hours:hours(items),jobCount:jobs(items),entryCount:items.length};
    });
  }
  function counts(items,key,categories) {
    const result={input:items.length,valid:items.filter(x=>x.cleaned!==null).length,rejected:0,duplicates:0,conflicts:0,
      conflictGroups:unique(items.filter(x=>x.disposition==='conflict').map(x=>x.cleaned[key])).length};
    for(const [name,category] of [['rejected','rejected'],['duplicates','duplicate'],['conflicts','conflict'],...categories]) {
      result[name]=0;for(const x of items)if(x.disposition===category)result[name]++;
    }
    return result;
  }
  return {period:{start:period.start,end:period.end},daily:groups('date',x=>x.cleaned.date),
    sites:groups('site',x=>orders.find(o=>o.disposition==='retained'&&o.cleaned.jobId===x.cleaned.jobId).cleaned.site),
    totalHours:hours(safe),jobCount:jobs(safe),entryCount:safe.length,
    counts:{orders:counts(orders,'jobId',[['retained','retained']]),entries:counts(entries,'entryId',[
      ['outOfPeriod','out-of-period'],['ambiguousOrder','ambiguous-order'],['unmatched','unmatched'],['incompleteOrder','incomplete-order'],['included','included']])},audit:{orders,entries}};
}`;

export function executeReporting(code, rows) {
  const copy=structuredClone(rows), before=JSON.stringify(copy);
  try {
    const output=new Function('console','"use strict";\n'+code+'\nreturn transform;')({log(){}})(copy);
    return {status:'ok',resultType:output===null?'null':Array.isArray(output)?'array':typeof output,
      output:output===undefined?undefined:JSON.parse(JSON.stringify(output)),mutated:JSON.stringify(copy)!==before};
  } catch(error) {return {status:'error',error:{stage:'run',message:error.message,name:error.name},mutated:JSON.stringify(copy)!==before};}
}
