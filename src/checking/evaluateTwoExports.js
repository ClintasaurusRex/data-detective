// Behaviour only: expected source-line classifications are handwritten fixtures.
import { describeRunProblem, quote } from "./evaluate.js";
import { reconciliationCode } from "../missions/twoExports.adapter.js";

const RECORD_FIELDS = ["line", "id", "site", "status", "hours"];
const LISTS = ["agreed", "onlyOrders", "onlyFieldReports", "differences", "ambiguous"];
const object = v => v !== null && typeof v === "object" && !Array.isArray(v);
const keys = (v, names) => object(v) && Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export function evaluateTwoExportsCheck(check, run, options) {
  const base = { id: check.id, name: check.name };
  const problem = describeRunProblem(run, options);
  if (problem) return { ...base, passed: false, fatal: problem.fatal, summary: "Your code didn't produce a report.", problems: [problem] };
  const out = run.output;
  if (run.resultType !== "object" || !keys(out, [...LISTS, "summary"]) || !LISTS.every(k => Array.isArray(out[k]))) {
    return { ...base, passed: false, fatal: false, summary: "Check the reconciliation return shape.", problems: [{kind:"type", message:"Return exactly `{ agreed, onlyOrders, onlyFieldReports, differences, ambiguous, summary }`: five arrays and a summary object. Keep both originals in every pair."}] };
  }
  const problems = [];
  // A malformed report should not overwhelm the learner or reveal a whole hidden answer.
  const add = (kind, message) => { if (problems.length < 20) problems.push({kind, message}); };
  if (run.mutated) add("mutated", "Your code changed an input export. Group originals without editing records or sorting either source array.");
  const expected = check.expected;
  const sources = { orders: check.orders, fieldReports: check.fieldReports };
  const originals = Object.fromEntries(Object.entries(sources).map(([s, rows]) => [s, new Map(rows.map(r => [r.line, r]))]));
  const roles = { orders: new Map(), fieldReports: new Map() };
  for (const role of ["agreed", "differences"]) for (const [a,b] of expected[role]) {
    roles.orders.set(a, role); roles.fieldReports.set(b, role);
  }
  for (const line of expected.onlyOrders) roles.orders.set(line, "onlyOrders");
  for (const line of expected.onlyFieldReports) roles.fieldReports.set(line, "onlyFieldReports");
  for (const g of expected.ambiguous) for (const source of Object.keys(sources)) {
    for (const line of g[source]) roles[source].set(line, `ambiguous ${quote(g.id)}`);
  }
  const counts = {orders:new Map(), fieldReports:new Map()};
  function record(value, source, role) {
    const original = object(value) && originals[source].get(value.line);
    if (!original) { add("original", `${source} in ${role}: retain a whole original with its numeric source line; line ${quote(value?.line)} is not an original occurrence.`); return; }
    const {line,id} = original;
    counts[source].set(line, (counts[source].get(line) ?? 0) + 1);
    if (!keys(value, RECORD_FIELDS) || RECORD_FIELDS.some(k => value[k] !== original[k])) add("changed", `${source}, job ${quote(id)}, line ${line}: information was lost or changed in ${role}. Preserve every original field, value and provenance.`);
    if (roles[source].get(line) !== role) add("classification", `${source}, job ${quote(id)}, line ${line}: ${role} is the wrong category. Trace its exact ID in both exports; repeated keys must remain wholly ambiguous.`);
  }
  function order(actual, wanted, source, label) {
    const i = wanted.findIndex((v,j) => actual[j] !== v);
    if (i !== -1 || actual.length !== wanted.length) {
      const original = originals[source].get(wanted[i === -1 ? 0 : i]);
      add("order", `${label}: missing, extra or out-of-order occurrences${original ? ` near job ${quote(original.id)}` : ""}. Follow scheduling first-seen IDs, then field-only IDs; preserve each group's source order.`);
    }
  }
  for (const role of ["agreed", "differences"]) {
    for (const pair of out[role]) {
      if (!keys(pair, role === "agreed" ? ["order","fieldReport"] : ["order","fieldReport","fields"])) add("pair-shape", `${role} entries need exactly ${role === "agreed" ? "`{ order, fieldReport }`" : "`{ order, fieldReport, fields }`"}.`);
      record(pair?.order,"orders",role); record(pair?.fieldReport,"fieldReports",role);
      if (pair?.order?.id !== pair?.fieldReport?.id) add("pair", `${role}: pair only exact matching string IDs. ${quote(pair?.order?.id)} and ${quote(pair?.fieldReport?.id)} do not identify the same job.`);
      if (role === "differences") {
        const wanted = expected.differences.find(([a,b]) => a === pair?.order?.line && b === pair?.fieldReport?.line);
        if (!Array.isArray(pair?.fields) || !wanted || !sameList(pair.fields, wanted[2])) add("fields", `Job ${quote(pair?.order?.id)} in differences: list every differing field exactly once in site, status, hours order. Compare values, excluding source line.`);
      }
    }
    order(out[role].map(p=>p?.order?.line), expected[role].map(p=>p[0]), "orders", role);
    order(out[role].map(p=>p?.fieldReport?.line), expected[role].map(p=>p[1]), "fieldReports", role);
  }
  for (const [role,source] of [["onlyOrders","orders"],["onlyFieldReports","fieldReports"]]) {
    for (const row of out[role]) record(row,source,role);
    order(out[role].map(r=>r?.line),expected[role],source,role);
  }
  for (const group of out.ambiguous) {
    if (!keys(group,["id","orders","fieldReports"]) || typeof group.id !== "string" || !Array.isArray(group.orders) || !Array.isArray(group.fieldReports)) {
      add("ambiguity-shape", "Each ambiguous group needs exactly `{ id, orders, fieldReports }`, with a string ID and both arrays, including an empty counterpart array."); continue;
    }
    const wanted = expected.ambiguous.find(g=>g.id === group.id);
    if (!wanted) add("ambiguity", `Job ${quote(group.id)} is not an ambiguous key here. A group needs repeated occurrences in at least one source.`);
    for (const source of Object.keys(sources)) {
      for (const row of group[source]) record(row,source,`ambiguous ${quote(group.id)}`);
      order(group[source].map(r=>r?.line),wanted?.[source] ?? [],source,`Ambiguous ${quote(group.id)} ${source}`);
    }
  }
  if (!sameList(out.ambiguous.map(g=>g?.id),expected.ambiguous.map(g=>g.id))) add("group-order", "Ambiguous IDs are missing, repeated, unexpected or out of order. Keep one whole group per repeated key in scheduling-first union order, including every counterpart.");
  for (const [source, rows] of Object.entries(sources)) for (const {line,id} of rows) {
    const count = counts[source].get(line) ?? 0;
    if (count !== 1) add("accounting", `${source}, job ${quote(id)}, line ${line} appears ${count} times. Account for every input occurrence exactly once, including those in ambiguous groups.`);
  }
  if (!keys(out.summary,Object.keys(expected.summary))) add("summary-shape", "summary needs exactly orders, fieldReports, agreed, onlyOrders, onlyFieldReports, differences and ambiguous counts.");
  for (const [key, value] of Object.entries(expected.summary)) if (!Number.isInteger(out.summary?.[key]) || out.summary[key] !== value) add("summary", `summary.${key} is incorrect. Count original occurrences for source totals and entries for categories; ambiguous counts groups. Verify the audit trail as well as totals.`);
  const passed = problems.length === 0;
  return {...base, passed, fatal:false, problems, summary:passed ? "Correct: every original is reconciled with its source and category." : "Trace the source, job and category below."};
}

export async function runTwoExportsChecks(runCode, exercise, code, {onProgress, timeoutSeconds} = {}) {
  if (!exercise.checks.length || exercise.checks.some(c=>!Array.isArray(c.orders) || !Array.isArray(c.fieldReports))) throw new TypeError("Case 4 requires at least one dataset with both source arrays.");
  const results = [];
  for (const check of exercise.checks) {
    const run = await runCode(reconciliationCode(code), [check.orders,check.fieldReports]);
    if (run.status === "cancelled") return {status:"cancelled",passed:false,results,code};
    const result = evaluateTwoExportsCheck(check,run,{timeoutSeconds});
    results.push(result); onProgress?.(results.length,exercise.checks.length);
    if (result.fatal) return {status:"done",passed:false,stoppedEarly:true,results,code};
  }
  const passed = results.every(r=>r.passed);
  return {status:"done",passed,stoppedEarly:false,results,code,note:!passed && results[0]?.passed ? "The case file passed, but a different week needs attention. Use exact IDs, inspect both complete sources and avoid sample-specific answers." : null};
}
