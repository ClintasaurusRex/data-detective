import { describe, expect, it } from 'vitest';
import { firstReportingToolCase } from '../../src/missions/firstReportingTool.js';
import { reportingCode } from '../../src/missions/firstReportingTool.adapter.js';
import { evaluateReportingCheck, runReportingChecks } from '../../src/checking/evaluateFirstReportingTool.js';
import { buildChallengeFile, solutionSection } from '../../src/export/challengeFile.js';
import { allExercises, playableCases } from '../../src/missions/index.js';
import { sanitiseState } from '../../src/storage/progress.js';
import { executeReporting, independentReportingSolution } from '../support/firstReportingTool.js';

const [main,variation]=firstReportingToolCase.exercises;
const sample=main.checks[0];
const reply=output=>({status:'ok',resultType:output===null?'null':Array.isArray(output)?'array':typeof output,output});
const solution=main.solution.code;
const run=code=>runReportingChecks(executeReporting,main,code);

describe('Handwritten reporting contract',()=>{
  it('has at least 20 datasets and independent variation IDs',()=>{
    expect(main.checks.length).toBeGreaterThanOrEqual(20);expect(main.id).not.toBe(variation.id);
    expect(variation.checks[0].id).toBe('transfer');expect(main.checks[0].id).toBe('caseFile');
  });
  for(const check of main.checks) {
    it(`${check.name}: frozen evidence, independent decisions and complete original accounting`,()=>{
      expect(Object.isFrozen(check.orders)).toBe(true);expect(Object.isFrozen(check.period)).toBe(true);
      expect(Object.isFrozen(check.expected ?? check.rows)).toBe(true);
      const outputs=[solution,independentReportingSolution].map(code=>executeReporting(reportingCode(code),check.rows));
      for(const result of outputs) {
        expect(result.mutated).toBe(false);
        if(check.expectedError) expect(result.error?.message).toBe(check.expectedError);
        else expect(result.output).toEqual(check.expected);
        expect(evaluateReportingCheck(check,result).passed).toBe(true);
      }
      if(check.expectedError)return;
      for(const source of ['orders','entries']) {
        const audit=check.expected.audit[source],counts=check.expected.counts[source];
        expect(audit.map(x=>x.record)).toEqual(check[source]);
        expect(counts.input).toBe(check[source].length);
        expect(counts.valid+counts.rejected).toBe(counts.input);
        const {input,valid,conflictGroups,...dispositions}=counts;
        expect(Object.values(dispositions).reduce((a,b)=>a+b,0)).toBe(input);
        expect(valid).toBe(audit.filter(x=>x.cleaned).length);
        expect(conflictGroups).toBe(new Set(audit.filter(x=>x.disposition==='conflict').map(x=>x.cleaned[source==='orders'?'jobId':'entryId'])).size);
      }
    });
  }
  it.each([solution,independentReportingSolution])('passes all datasets using behaviour only',async code=>{
    expect((await run(code)).passed).toBe(true);
    expect((await runReportingChecks(executeReporting,variation,code)).passed).toBe(true);
  });
});

describe('Reporting checker rejects misleading reports',()=>{
  const changes={
    'total alone':o=>{o.audit.entries=[];},
    'correct total but changed original':o=>{o.audit.entries[0].record.hours='2.5';},
    'correct total but dropped zero':o=>{o.audit.entries.splice(12,1);},
    'fabricated source line':o=>{o.audit.orders[0].record.line=999;},
    'source order swapped':o=>o.audit.entries.reverse(),
    'lost order field':o=>{delete o.audit.orders[0].record.site;},
    'changed clean ID':o=>{o.audit.entries[0].cleaned.jobId=110;},
    'case folded site':o=>{o.audit.orders[0].cleaned.site='north reservoir';},
    'wrong cleaned hours':o=>{o.audit.entries[0].cleaned.hundredths=2.5;},
    'missing rejection reason':o=>o.audit.entries[11].reasons.pop(),
    'extra rejection reason':o=>o.audit.entries[11].reasons.push('missing-job-id'),
    'wrong reason order':o=>o.audit.entries[11].reasons.reverse(),
    'cleaned rejected record':o=>{o.audit.entries[11].cleaned={};},
    'first conflict winner':o=>{o.audit.entries[4].disposition='included';},
    'duplicate counted as work':o=>{o.audit.entries[3].disposition='included';},
    'duplicate wrong first link':o=>{o.audit.entries[3].duplicateOf=5;},
    'missing job invented':o=>{o.audit.entries[6].orderLine=2;},
    'ambiguous job included':o=>{o.audit.entries[9].disposition='included';},
    'open order counted':o=>{o.audit.entries[7].disposition='included';},
    'outside entry rejected':o=>{o.audit.entries[10].disposition='rejected';},
    'wrong source reference':o=>{o.audit.entries[2].orderLine=2;},
    'conflict groups counted as occurrences':o=>{o.counts.entries.conflictGroups=2;},
    'valid excludes duplicate':o=>{o.counts.entries.valid--;},
    'incorrect numeric precision':o=>{o.totalHours=4;},
    'unformatted hours':o=>{o.totalHours='4';},
    'group order incorrect':o=>o.daily.reverse(),
    'site order incorrect':o=>o.sites.reverse(),
    'group count wrong':o=>{o.daily[0].jobCount=1;},
    'extra group':o=>o.daily.push(o.daily[0]),
    'grand job count wrong':o=>{o.jobCount=5;},
    'extra top field':o=>{o.extra=1;},
    'extra audit field':o=>{o.audit.entries[0].site='North';},
    'wrong period':o=>{o.period.end='2026-11-16';},
    'null audit item':o=>{o.audit.entries[0]=null;},
    'string count':o=>{o.counts.orders.input='8';},
    'null counts':o=>{o.counts=null;},
    'NaN count':o=>{o.jobCount=NaN;},
  };
  it.each(Object.entries(changes))('rejects %s even with correct-looking hours',(_name,change)=>{
    const out=structuredClone(sample.expected);change(out);
    const result=evaluateReportingCheck(sample,reply(out));
    expect(result.passed).toBe(false);expect(result.problems.length).toBeLessThanOrEqual(16);
    expect(result.problems.every(p=>!p.message.includes('North Reservoir'))).toBe(true);
  });
  it.each([null,undefined,[],1,'report',{}, {...sample.expected,audit:[]}])('rejects malformed %j',out=>{
    expect(evaluateReportingCheck(sample,reply(out)).passed).toBe(false);
  });
  it('ignores object property order and reference identity',()=>{
    function reorder(x) {return Array.isArray(x)?x.map(reorder):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).reverse().map(([k,v])=>[k,reorder(v)])):x;}
    expect(evaluateReportingCheck(sample,reply(reorder(sample.expected))).passed).toBe(true);
  });
  it('rejects input mutation even with a perfect report',()=>{
    expect(evaluateReportingCheck(sample,{...reply(sample.expected),mutated:true}).passed).toBe(false);
  });
  it('rejects sample hardcoding on other weeks',async()=>{
    const result=await run(`function buildWeeklyReport(){return ${JSON.stringify(sample.expected)};}`);
    expect(result.results[0].passed).toBe(true);expect(result.passed).toBe(false);expect(result.note).toContain('another scenario');
  });
  const mutants={
    'numeric job keys':solution.replace('jobs.get(value.jobId)', 'jobs.get(String(Number(value.jobId)))'),
    'entry dedup by job':solution.replace('deduplicate(entries, "entryId"','deduplicate(entries, "jobId"'),
    'first version wins':solution.replace('if (conflict) {','if (false && conflict) {'),
    'exclusive period':solution.replace('value.date < period.start || value.date > period.end','value.date <= period.start || value.date >= period.end'),
    'blank hours become zero':solution.replace('if (!text) reasons.push("missing-hours");','if (!text) {}'),
    'parseFloat hours':solution.replace('!/^\\d+(\\.\\d{1,2})?$/.test(text)', '!Number.isFinite(parseFloat(text))'),
    'ignore order status':solution.replace('order.cleaned.status === "complete"','true'),
    'ignore entry date conflict':solution.replace('["entryId", "jobId", "date", "hundredths"]','["entryId", "jobId", "hundredths"]'),
    'sort source':solution.replace('const orders = rawOrders.map', 'rawOrders.reverse(); const orders = rawOrders.map'),
    'local loose calendar':solution.replace('day <= days[month - 1]','day <= 31'),
    'wrong leap century':solution.replace('(year % 100 !== 0 || year % 400 === 0)','true'),
    'all complete orders counted':solution.replace('jobCount: totals.jobCount','jobCount: orders.filter(x => x.cleaned?.status === "complete").length'),
  };
  it.each(Object.entries(mutants))('rejects strategy %s',async(_name,code)=>expect((await run(code)).passed).toBe(false));
});

describe('Runner lifecycle and additive progress',()=>{
  it('stops fatal failures and reports progress without saving a partial pass',async()=>{
    const progress=[];const result=await runReportingChecks(async()=>({status:'timeout',timeoutMs:2000}),main,solution,{onProgress:(...args)=>progress.push(args),timeoutSeconds:2});
    expect(result.stoppedEarly).toBe(true);expect(result.results).toHaveLength(1);expect(result.passed).toBe(false);expect(progress).toEqual([[1,main.checks.length]]);
  });
  it('cancels a partial check and retains exact submitted code',async()=>{
    let n=0;const result=await runReportingChecks(async(c,rows)=>++n===2?{status:'cancelled'}:executeReporting(c,rows),main,solution);
    expect(result.status).toBe('cancelled');expect(result.passed).toBe(false);expect(result.results).toHaveLength(1);expect(result.code).toBe(solution);
  });
  it('detects input mutation before an expected invalid-period exception',async()=>{
    const result=await run(solution.replace('throw Error("Invalid reporting period");','period.start="changed"; throw Error("Invalid reporting period");'));
    expect(result.passed).toBe(false);expect(result.results.filter(r=>!r.passed)).toHaveLength(4);
  });
  it('rejects no-dataset configuration',async()=>expect(runReportingChecks(()=>{}, {checks:[]},'')).rejects.toThrow(TypeError));
  it.each(['function buildWeeklyReport(){throw Error("investigate");}','function other(){}'])('handles runtime or missing function',async code=>expect((await run(code)).passed).toBe(false));
  it('keeps main/variation and older mission state independently',()=>{
    const old={version:1,cases:{'first-reporting-tool':{prediction:{value:5}}},exercises:{
      [main.id]:{draft:'main draft',hintsShown:4,solutionRevealed:true,solved:{code:'checked main'}},
      [variation.id]:{draft:'variation draft',hintsShown:1,solved:{code:'checked variation'}},
      'missing-jobs':{draft:'old draft',solved:{code:'old checked'}}}};
    const clean=sanitiseState(old,{cases:playableCases,exercises:allExercises});
    expect(clean.exercises[main.id].solved.code).toBe('checked main');expect(clean.exercises[variation.id].solved.code).toBe('checked variation');expect(clean.exercises['missing-jobs'].solved.code).toBe('old checked');expect(clean.cases[main.id].prediction.value).toBe(5);
  });
  it('Copy to IDE contains active raw sample, period and exact draft, no hidden data',()=>{
    for(const exercise of [main,variation]) {
      const challenge={caseNumber:5,caseTitle:firstReportingToolCase.title,exerciseTitle:exercise.title,request:firstReportingToolCase.request,goal:exercise.goal,rules:exercise.rules,weeklyReport:true,...exercise};
      const file=buildChallengeFile(challenge,solution);
      expect(solutionSection(file)).toContain(solution);expect(file).toContain(JSON.stringify(exercise.period,null,2));expect(file).not.toContain('reportingDatasets');
      const logs=[];new Function('console',file)({log:x=>logs.push(x)});
      expect(JSON.parse(logs[1])).toEqual(exercise.checks[0].expected);
    }
  });
});
