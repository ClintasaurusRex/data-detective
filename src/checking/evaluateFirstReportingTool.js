import { describeRunProblem } from './evaluate.js';
import { reportingCode } from '../missions/firstReportingTool.adapter.js';

// Deep structural comparison against handwritten fixture evidence. Object key
// order is immaterial; array order, field sets, primitive types and values matter.
// Never run a reference solver, inspect source text, or dump expected reports.
export function evaluateReportingCheck(check, run, options) {
  const base = {id:check.id,name:check.name,fatal:false};
  if (check.expectedError) {
    const passed = run.status === 'error' && run.error?.stage === 'run' &&
      run.error?.message === check.expectedError && !run.mutated;
    return {...base,passed,summary:passed ? 'Invalid period safely refused.' : 'Validate the reporting period before reporting.',
      problems:passed ? [] : [{kind:'period',message:'Invalid calendar dates or reversed start/end require Error("Invalid reporting period"), even for empty exports. No partial report.'}]};
  }
  const problem = describeRunProblem(run,options);
  if (problem) return {...base,passed:false,fatal:problem.fatal,summary:"Your code didn't produce a weekly report.",problems:[problem]};
  const problems=[];
  const add=(kind,message)=>{if(problems.length<16) problems.push({kind,message});};
  if (run.mutated) add('mutation','Your code changed an input source or period. Build cleaned copies and preserve both original arrays.');
  function compare(actual, expected, path) {
    if (problems.length >= 16) return;
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) {add('shape',`${path}: return an array in contract order.`);return;}
      if (actual.length !== expected.length) add('accounting',`${path}: missing or extra items. Reconcile every source occurrence and group once.`);
      expected.forEach((item,i)=>{
        const provenance = item?.record ? ` (source line ${item.record.line})` : '';
        compare(actual[i],item,`${path}[${i}]${provenance}`);
      });
    } else if (expected !== null && typeof expected === 'object') {
      if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {add('shape',`${path}: return the object described in the contract.`);return;}
      const keys=Object.keys(expected);
      if (Object.keys(actual).length !== keys.length || keys.some(key=>!Object.hasOwn(actual,key))) add('shape',`${path}: fields must match the contract exactly; check missing and extra fields.`);
      keys.forEach(key=>compare(actual[key],expected[key],`${path}.${key}`));
    } else if (actual !== expected) {
      const guide = path.includes('.record.') ? 'Preserve the complete original value and its type.' :
        path.includes('.cleaned') ? 'Review trimming, exact IDs, calendar validity and integer hundredths.' :
        path.includes('disposition') ? 'Review validation, whole-ID conflicts, duplicates, period and matching precedence.' :
        path.includes('reasons') ? 'List every validation reason once in field order.' :
        path.includes('duplicateOf') || path.includes('orderLine') ? 'Trace the first safe occurrence in the correct source; use null when no link applies.' :
        'Review types, fixed two-decimal hours, deterministic ordering and reconciled counts.';
      add('value',`${path}: value or type does not meet the contract. ${guide}`);
    }
  }
  if (run.resultType !== 'object') add('type','Return the eight-field weekly report object, including counts and both audit arrays.');
  else compare(run.output,check.expected,'report');
  const passed=problems.length===0;
  return {...base,passed,problems,summary:passed ? 'Every original, exclusion, group and total reconciles.' : 'Trace the report paths and source lines below.'};
}

export async function runReportingChecks(runCode, exercise, code, {onProgress,timeoutSeconds} = {}) {
  if (!exercise.checks?.length) throw new TypeError('Case 5 requires checking datasets.');
  const results=[];
  for (const check of exercise.checks) {
    const run=await runCode(reportingCode(code),check.rows);
    if (run.status==='cancelled') return {status:'cancelled',passed:false,results,code};
    const result=evaluateReportingCheck(check,run,{timeoutSeconds});
    results.push(result);onProgress?.(results.length,exercise.checks.length);
    if (result.fatal) return {status:'done',passed:false,stoppedEarly:true,results,code};
  }
  const passed=results.every(r=>r.passed);
  return {status:'done',passed,results,code,stoppedEarly:false,
    note:!passed && results[0]?.passed ? 'The displayed week passed, but another scenario needs attention. A reliable pipeline must explain every occurrence on other weeks too.' : null};
}
