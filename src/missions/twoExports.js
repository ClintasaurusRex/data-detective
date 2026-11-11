import { twoExportsDatasets } from "./twoExports.fixtures.js";
const rules = [
  "Write `reconcile(orders, fieldReports)`. Both arrays are already parsed and validated. Each original has exactly `{ line, id, site, status, hours }`. Preserve every field and both input arrays without mutation.",
  "Match exact string IDs: `0071` differs from `71`, and `Job-A` differs from `job-a`. Input position, status and source line are not matching keys. Line identifies an occurrence within its own source only.",
  "The expected relationship is one scheduling record to one field record. If either source repeats an ID, put ALL occurrences from BOTH sources into one `ambiguous` entry `{ id, orders, fieldReports }`. Even identical copies are ambiguous; never pick a winner.",
  "Otherwise, one record in each source forms `{ order, fieldReport }`. Compare site, status and numeric hours exactly. All three equal: `agreed`. Differences: `{ order, fieldReport, fields }`, listing only differing names in site, status, hours order.",
  "A unique scheduling record without a counterpart goes to `onlyOrders` (missing field record). A unique field record without a counterpart goes to `onlyFieldReports` (missing scheduling record). Ambiguity takes priority over missingness.",
  "Return exactly `{ agreed, onlyOrders, onlyFieldReports, differences, ambiguous, summary }`. Every input occurrence appears exactly once across the five lists, including originals inside pairs and groups. Equal copies are fine; invented or changed records are not.",
  "Visit IDs first seen in orders, then IDs seen only in fieldReports. Each category follows that order. Each ambiguous source array keeps its own file order. Lines increase within a source with gaps allowed; the same line can exist in both sources.",
  "summary has exactly `orders, fieldReports, agreed, onlyOrders, onlyFieldReports, differences, ambiguous`: numeric counts of input occurrences and category entries. Ambiguous counts groups. Empty sources are valid; both empty means five empty lists and all seven counts 0.",
  "Scheduling hours are planned, field hours actual. A difference needs follow-up, not automatic rejection. Site text is exact evidence. Hours are small nonnegative quarter-hour numbers, including 0; no conversion, rounding or tolerance is needed.",
];
const solutionCode = `function reconcile(orders, fieldReports) {
  function groupById(records) {
    const groups = new Map();
    for (const record of records) {
      if (!groups.has(record.id)) groups.set(record.id, []);
      groups.get(record.id).push(record);
    }
    return groups;
  }
  const scheduled = groupById(orders);
  const reported = groupById(fieldReports);
  // Set keeps each ID once, in first-seen order across both sources.
  const ids = new Set([...scheduled.keys(), ...reported.keys()]);
  const agreed = [], onlyOrders = [], onlyFieldReports = [];
  const differences = [], ambiguous = [];
  for (const id of ids) {
    const left = scheduled.get(id) ?? [];
    const right = reported.get(id) ?? [];
    if (left.length > 1 || right.length > 1) {
      ambiguous.push({ id, orders: left, fieldReports: right });
    } else if (!right.length) {
      onlyOrders.push(left[0]);
    } else if (!left.length) {
      onlyFieldReports.push(right[0]);
    } else {
      const order = left[0], fieldReport = right[0];
      const fields = ["site", "status", "hours"].filter(
        field => order[field] !== fieldReport[field]
      );
      if (fields.length) differences.push({ order, fieldReport, fields });
      else agreed.push({ order, fieldReport });
    }
  }
  const summary = {
    orders: orders.length, fieldReports: fieldReports.length,
    agreed: agreed.length, onlyOrders: onlyOrders.length,
    onlyFieldReports: onlyFieldReports.length,
    differences: differences.length, ambiguous: ambiguous.length
  };
  return { agreed, onlyOrders, onlyFieldReports, differences, ambiguous, summary };
}`;
export const twoExportsCase = {
  id:"two-exports", number:4, title:"The Two Exports", playable:true,
  colleague:{name:"Sam Okafor",role:"Operations Planner"},
  request:"Scheduling and field operations sent me reports for the same week. The job IDs should connect them, but the lists don't agree. Before I trust Friday's report, can you show me what agrees, what's missing from either system, and which details need a conversation with the crews? Please keep the original evidence so I can follow up.",
  target:"Reconcile both exports by exact job ID, preserving every original and showing what needs review.", rules,
  exercises:[{
    id:"two-exports",title:"Reconcile scheduling and field operations",outputKind:"reconciliation",keepCheckedCode:true,
    goal:"Return agreements, one-sided originals, meaningful differences, complete ambiguous groups and a reconciliation summary.",rules,
    orders:twoExportsDatasets.caseFile.orders,fieldReports:twoExportsDatasets.caseFile.fieldReports,rows:twoExportsDatasets.caseFile.rows,
    checks:Object.entries(twoExportsDatasets).map(([id,d])=>({id,...d})),
    starterCode:`function reconcile(orders, fieldReports) {
  console.log("Scheduling records:", orders.length);
  console.log("Field records:", fieldReports.length);
  // Trace exact IDs across both exports. No records are classified yet.
  return {
    agreed: [], onlyOrders: [], onlyFieldReports: [],
    differences: [], ambiguous: [],
    summary: { orders: orders.length, fieldReports: fieldReports.length,
      agreed: 0, onlyOrders: 0, onlyFieldReports: 0,
      differences: 0, ambiguous: 0 }
  };
}`,
    hints:[
      "Pick one job in scheduling and trace its exact ID through the whole field export. Write down both source lines. Is it absent, unique, or repeated? Try a second job that needs follow-up.",
      "A Map can hold id → array of originals for each source. Group before matching so a late duplicate cannot turn an early pair into an arbitrary winner. Keep IDs as exact strings.",
      "Visit unique IDs from scheduling first, then unseen field IDs. Inspect both groups' lengths: any repeated key is ambiguous; an empty side means missing; one record on each side can be compared.",
      "For a unique pair, compare site, status and hours, in that order, with strict equality. Keep both originals. Build summary counts from your lists, then reconcile each input count including every occurrence inside ambiguity groups.",
    ],
    solution:{code:solutionCode,explanation:[
      "Two Map lookups keep sources separate. Each value is an array, so no duplicate occurrence is overwritten by set. Map accepts arbitrary exact string keys, including __proto__. Nothing changes an original.",
      "Nested loops or filter searches can produce the same correct result. They repeatedly search the opposite array; indexed Map lookups avoid that repeated work as exports grow. Correctness comes from the matching rules, not a required keyword.",
      "Set combines Map keys in scheduling-first union order. ?? [] supplies an empty list when a source lacks that ID. We visit every key once, so neither source's unmatched records disappear.",
      "Check ambiguity first. Even identical repeated originals violate the expected one-to-one relationship. One-to-many or many-to-many joins could multiply pairs, but Sam needs all original evidence for human review.",
      "A unique pair is an inner join match, including those with different details. A left join would keep scheduling records and available counterparts but omit field-only jobs. This full outer reconciliation keeps both sides, including unmatched records.",
      "Compare primitive field values with !==; separate objects are different references even when they describe the same work. Source line is provenance, not business equality. Planned versus actual differences are questions rather than invalid data.",
      "Summary counts entries, with ambiguity counted as groups. To audit, add agreed + differences + onlyOrders + every ambiguous orders length; that must equal orders.length. Do the parallel sum for fieldReports. Counts alone cannot verify IDs or details.",
    ]},
  }],
};
