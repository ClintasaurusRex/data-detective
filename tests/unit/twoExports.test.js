import { describe, expect, it } from "vitest";
import { twoExportsCase } from "../../src/missions/twoExports.js";
import { evaluateTwoExportsCheck, runTwoExportsChecks } from "../../src/checking/evaluateTwoExports.js";
import { reconciliationCode } from "../../src/missions/twoExports.adapter.js";
import { independentSolution, expectedOutput, wrongSolutions } from "../support/twoExports.js";
import { allExercises, playableCases } from "../../src/missions/index.js";
import { sanitiseState } from "../../src/storage/progress.js";
import { buildChallengeFile } from "../../src/export/challengeFile.js";
const exercise=twoExportsCase.exercises[0], main=exercise.checks[0];
const reply=output=>({status:"ok",resultType:Array.isArray(output)?"array":typeof output,output,mutated:false});
function execute(code,rows) {
  const input=structuredClone(rows),before=JSON.stringify(input);
  try {
    const output=new Function("console",'"use strict";\n'+code+'\nreturn transform;')({log(){}})(input);
    return {...reply(output===undefined?undefined:JSON.parse(JSON.stringify(output))),mutated:before!==JSON.stringify(input)};
  } catch(e) {return {status:"error",error:{stage:"run",name:e.name,message:e.message}};}
}
describe("Two Exports independently reviewed fixture contract",()=>{
  it.each(exercise.checks)("$name has frozen valid evidence and an independent complete expected report",check=>{
    expect(Object.isFrozen(check.orders)).toBe(true);expect(Object.isFrozen(check.expected)).toBe(true);
    for(const rows of [check.orders,check.fieldReports]) {
      let last=0;
      for(const r of rows) {
        expect(Object.isFrozen(r)).toBe(true);expect(Object.keys(r).sort()).toEqual(["hours","id","line","site","status"]);
        expect(Number.isInteger(r.line)&&r.line>last).toBe(true);last=r.line;
        expect(typeof r.id).toBe("string");expect(r.id.trim()).toBe(r.id);expect(r.id.length).toBeGreaterThan(0);
        expect(typeof r.site).toBe("string");expect(r.site.trim().length).toBeGreaterThan(0);
        expect(["open","complete","on hold"]).toContain(r.status);expect(Number.isFinite(r.hours)&&r.hours>=0&&Number.isInteger(r.hours*4)).toBe(true);
      }
    }
    const out=expectedOutput(check);
    expect(execute(reconciliationCode(independentSolution),check.rows).output).toEqual(out);
    for(const [source,single,pair] of [["orders","onlyOrders","order"],["fieldReports","onlyFieldReports","fieldReport"]]) {
      const records=[...out[single],...out.agreed.map(p=>p[pair]),...out.differences.map(p=>p[pair]),...out.ambiguous.flatMap(g=>g[source])];
      expect(records.map(r=>r.line).sort((a,b)=>a-b)).toEqual(check[source].map(r=>r.line));
      expect(out.summary[source]).toBe(records.length);
    }
    expect(evaluateTwoExportsCheck(check,reply(out)).passed).toBe(true);
  });
  it("case file expectations are explicit rather than generated from a solver",()=>{
    expect(main.expected.agreed).toEqual([[2,3],[7,8]]);
    expect(main.expected.differences).toEqual([[4,5,["hours"]],[5,2,["status"]]]);
    expect(main.expected.summary).toEqual({orders:7,fieldReports:6,agreed:2,onlyOrders:1,onlyFieldReports:1,differences:2,ambiguous:1});
  });
});
describe("Two Exports behavioural checking",()=>{
  it.each([exercise.solution.code,independentSolution,exercise.solution.code.replace('const ids = new Set([...scheduled.keys(), ...reported.keys()]);','const ids = [...new Set(orders.concat(fieldReports).map(r=>r.id))];')])("accepts a correct algorithm on all 20 datasets",async code=>{
    const result=await runTwoExportsChecks(execute,exercise,code);
    expect(result.passed).toBe(true);expect(result.results).toHaveLength(20);
    for(const c of exercise.checks) expect(execute(reconciliationCode(code),c.rows).mutated).toBe(false);
  });
  it.each(Object.entries(wrongSolutions))("rejects %s",async (_name,code)=>{
    const result=await runTwoExportsChecks(execute,exercise,code);expect(result.passed).toBe(false);
    expect(result.results.some(r=>r.problems.length>0)).toBe(true);
  });
  it("rejects a hardcoded main report on unseen weeks",async()=>{
    const result=await runTwoExportsChecks(execute,exercise,`function reconcile(){return ${JSON.stringify(expectedOutput(main))};}`);
    expect(result.results[0].passed).toBe(true);expect(result.passed).toBe(false);expect(result.note).toContain("different week");
  });
  it.each([undefined,null,[],0,"report",{}, {agreed:[]}, {...expectedOutput(main),extra:1}, {...expectedOutput(main),agreed:null}])("rejects malformed output %j",out=>{
    expect(evaluateTwoExportsCheck(main,reply(out)).passed).toBe(false);
  });
  const changes={
    "missing original":o=>o.onlyOrders.pop(),
    "invented original":o=>o.onlyOrders.push({...o.onlyOrders[0],line:999}),
    "twice counted original":o=>o.onlyOrders.push(o.onlyOrders[0]),
    "wrong category":o=>o.onlyFieldReports.push(o.onlyOrders.pop()),
    "swapped source":o=>{[o.agreed[0].order,o.agreed[0].fieldReport]=[o.agreed[0].fieldReport,o.agreed[0].order];},
    "different pair ID":o=>{o.agreed[0].fieldReport=o.agreed[1].fieldReport;},
    "text line":o=>{o.agreed[0].order.line="2";},
    "lost field":o=>{delete o.agreed[0].order.site;},
    "unexpected original field":o=>{o.onlyOrders[0].extra=true;},
    "numeric ID":o=>{o.agreed[0].order.id=71;},
    "changed hours":o=>{o.differences[0].order.hours=3;},
    "changed status":o=>{o.agreed[0].order.status="open";},
    "changed site":o=>{o.agreed[0].order.site="Depot";},
    "missing field name":o=>{o.differences[0].fields=[];},
    "extra field name":o=>{o.differences[0].fields.push("line");},
    "duplicate field name":o=>{o.differences[0].fields.push("hours");},
    "wrong field type":o=>{o.differences[0].fields="hours";},
    "missing field array":o=>{delete o.differences[0].fields;},
    "extra pair field":o=>{o.agreed[0].id="0071";},
    "null pair":o=>{o.agreed[0]=null;},
    "null original":o=>{o.onlyOrders[0]=null;},
    "wrong pair order":o=>o.agreed.reverse(),
    "wrong differences order":o=>o.differences.reverse(),
    "lost ambiguous counterpart":o=>o.ambiguous[0].fieldReports.pop(),
    "lost ambiguous duplicate":o=>o.ambiguous[0].orders.pop(),
    "arbitrary duplicate winner":o=>o.agreed.push({order:o.ambiguous[0].orders.shift(),fieldReport:o.ambiguous[0].fieldReports.shift()}),
    "wrong ambiguous source order":o=>o.ambiguous[0].orders.reverse(),
    "split ambiguity":o=>o.ambiguous.push({...o.ambiguous[0],orders:o.ambiguous[0].orders.splice(1)}),
    "unknown ambiguous ID":o=>{o.ambiguous[0].id="UNKNOWN";},
    "nonstring ambiguous ID":o=>{o.ambiguous[0].id=75;},
    "null ambiguity":o=>{o.ambiguous[0]=null;},
    "null ambiguous source":o=>{o.ambiguous[0].orders=null;},
    "extra ambiguous field":o=>{o.ambiguous[0].extra=true;},
    "missing summary":o=>{delete o.summary;},
    "extra summary field":o=>{o.summary.total=13;},
    "null summary":o=>{o.summary=null;},
    "text count":o=>{o.summary.orders="7";},
    "NaN count":o=>{o.summary.orders=NaN;},
    "infinite count":o=>{o.summary.orders=Infinity;},
    "wrong count":o=>{o.summary.ambiguous=2;},
    "negative count":o=>{o.summary.agreed=-1;},
  };
  it.each(Object.entries(changes))("rejects %s with bounded educational feedback",(_name,change)=>{
    const out=structuredClone(expectedOutput(main));change(out);
    const result=evaluateTwoExportsCheck(main,reply(out));expect(result.passed).toBe(false);
    expect(result.problems.length).toBeLessThanOrEqual(20);expect(result.problems.every(p=>p.message.length>20)).toBe(true);
  });
  it.each(["onlyOrders","onlyFieldReports","ambiguous"])("checks ordering in %s",role=>{
    const c=exercise.checks.find(c=>c.expected[role].length>1),out=structuredClone(expectedOutput(c));out[role].reverse();
    expect(evaluateTwoExportsCheck(c,reply(out)).passed).toBe(false);
  });
  it("checks difference field order",()=>{
    const c=exercise.checks.find(c=>c.id==="manyDifferences"),out=structuredClone(expectedOutput(c));out.differences[3].fields.reverse();
    expect(evaluateTwoExportsCheck(c,reply(out)).problems.some(p=>p.kind==="fields")).toBe(true);
  });
  it.each([0,1])("detects mutation of source %s",async index=>{
    const code=exercise.solution.code+`\nconst original=reconcile; reconcile=function(a,b){const out=original(a,b); [a,b][${index}].reverse(); return out;};`;
    const result=await runTwoExportsChecks(execute,exercise,code);expect(result.passed).toBe(false);expect(result.results[0].problems.some(p=>p.kind==="mutated")).toBe(true);
  });
  it("isolates learner helpers named transform and preserves learner error lines",async()=>{
    const code='const transform = value => value;\nconst rows = 1;\n'+independentSolution;
    expect((await runTwoExportsChecks(execute,exercise,code)).passed).toBe(true);
    expect(reconciliationCode('function reconcile(){\nthrow Error("line two");\n}').split('\n')[1]).toBe('throw Error("line two");');
  });
  it("compares copied records and ignores object property order",()=>{
    const reverse=v=>Array.isArray(v)?v.map(reverse):v&&typeof v==="object"?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reverse(x)])):v;
    expect(evaluateTwoExportsCheck(main,reply(reverse(expectedOutput(main)))).passed).toBe(true);
  });
  it("reports source, identifier and category without revealing the full answer",()=>{
    const out=structuredClone(expectedOutput(main));out.onlyOrders[0].site="changed";
    expect(evaluateTwoExportsCheck(main,reply(out)).problems[0].message).toContain('orders, job "0072", line 3');
  });
  it("keeps original checked code and supports progress, cancellation and error lifecycle",async()=>{
    const progress=[];
    const result=await runTwoExportsChecks(execute,exercise,independentSolution,{onProgress:(n,total)=>progress.push([n,total])});
    expect(result.code).toBe(independentSolution);expect(progress).toEqual(exercise.checks.map((_,i)=>[i+1,20]));
    let n=0;const cancel=await runTwoExportsChecks((code,rows)=>++n===3?{status:"cancelled"}:execute(code,rows),exercise,independentSolution);
    expect(cancel.status).toBe("cancelled");expect(cancel.results).toHaveLength(2);expect(cancel.passed).toBe(false);
    for(const error of [{status:"timeout"},{status:"error",error:{name:"SyntaxError",stage:"load",message:"bad syntax"}}]) {
      const failed=await runTwoExportsChecks(()=>error,exercise,"code");expect(failed.stoppedEarly).toBe(true);expect(failed.results).toHaveLength(1);
    }
    const runtime=await runTwoExportsChecks(()=>({status:"error",error:{name:"Error",stage:"run",message:"bad job",line:3}}),exercise,"code");
    expect(runtime.results).toHaveLength(20);expect(runtime.results[0].problems[0].message).toContain("line 3");
  });
  it("rejects an empty suite or missing source before execution",async()=>{
    for(const checks of [[],[{orders:[]}],[{fieldReports:[]}]]) await expect(runTwoExportsChecks(()=>{throw Error("should not run");},{checks},"code")).rejects.toThrow("both source arrays");
  });
});
describe("Case 4 storage and challenge integration",()=>{
  const catalogue={cases:playableCases,exercises:allExercises};
  it("is independently registered without offering a Node file export",()=>{
    expect(playableCases.map(c=>c.id)).toContain("two-exports");expect(exercise.exportFileName).toBeUndefined();expect(exercise.keepCheckedCode).toBe(true);
  });
  it.each([{value:0},{value:2},{skipped:true}])("persists Case 4 and all earlier progress %j",prediction=>{
    const state=sanitiseState(null,catalogue);
    for(const id of ["missing-jobs","messy-export","doubled-totals","two-exports"]) state.exercises[id]={...state.exercises[id],draft:"new draft",checked:{code:"bad",passed:false},solved:{code:"passing code",solvedAt:"2026-11-11T00:00:00Z",hintsUsed:0,solutionRevealed:false}};
    state.cases[exercise.id].prediction=prediction;
    expect(sanitiseState(state,catalogue)).toEqual(state);
  });
  it.each([{value:0.25},{value:-1},{value:"2"},{value:Infinity},{value:1001}])("rejects invalid agreement prediction %j",prediction=>{
    expect(sanitiseState({version:1,cases:{[exercise.id]:{prediction}}},catalogue).cases[exercise.id].prediction).toBeNull();
  });
  it("Copy to IDE has exact sample arrays and only current code, runnable with no adapter",()=>{
    const text=buildChallengeFile({caseNumber:4,caseTitle:twoExportsCase.title,exerciseTitle:exercise.title,request:twoExportsCase.request,goal:exercise.goal,rules:exercise.rules,reconciliation:true,orders:exercise.orders,fieldReports:exercise.fieldReports},independentSolution);
    expect(text).not.toContain("DEC-92");expect(text).not.toContain(exercise.solution.code);
    const out=new Function("console",text+'\nreturn reconcile(caseSampleOrders,caseSampleFieldReports);')({log(){}});
    expect(out).toEqual(expectedOutput(main));
  });
});
