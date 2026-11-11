import { doubledTotalsDatasets } from "./doubledTotals.fixtures.js";

const rules = [
  "Input is already cleaned: `{ line, id, status, hours, notes }`. No CSV parsing or Case 2 completion is needed. Never mutate the input array or records.",
  "Use the exact string `id` as the job key. Leading zeros and capitalization matter: `0007` differs from `7`; `Job-A` differs from `job-a`.",
  "Compare `id`, `status`, numeric `hours` and `notes` with strict equality. Ignore `line` for business equality, but preserve it as evidence of each occurrence. Notes, including spaces and newlines, must match exactly.",
  "If every record for an ID agrees, put its first occurrence in `kept`. Each later occurrence goes into `duplicates` as `{ record, keptLine }`, linking to the first retained line.",
  "If any business field disagrees within an ID group, put ALL its occurrences into one `conflicts` entry `{ id, records }`. This includes identical copies within the conflicting group. None goes in kept or duplicates; never choose a winner.",
  "Return exactly `{ kept, duplicates, conflicts, totalHours }`. Every original occurrence appears once across those three lists. All records retain exactly their original fields and values. Copies with identical content are fine.",
  "Keep input order within kept and duplicates. Order conflict groups by their first occurrence and their records by input order. Each line is unique and increasing in the combined staging file; gaps are allowed.",
  "Sum only kept hours for numeric `totalHours`, including safe jobs of every status. Zero is valid. Conflicting hours are excluded pending investigation, not declared zero work. Empty input returns three empty lists and totalHours 0.",
  "All supplied hours are small nonnegative multiples of 0.25, exactly representable in JavaScript. Use exact equality and no rounding or tolerance. Detailed rounding is a later lesson.",
];

const solutionCode = `function transform(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.id)) groups.set(row.id, []);
    groups.get(row.id).push(row);
  }

  const kept = [];
  const duplicates = [];
  const conflicts = [];

  for (const [id, records] of groups) {
    const first = records[0];
    const identical = records.every(row =>
      row.id === first.id && row.status === first.status &&
      row.hours === first.hours && row.notes === first.notes
    );
    if (!identical) {
      conflicts.push({ id, records });
    } else {
      kept.push(first);
      for (const record of records.slice(1)) {
        duplicates.push({ record, keptLine: first.line });
      }
    }
  }

  // Groups can interleave in the file. Sort this NEW list of duplicate
  // entries, never the input array, to restore occurrence order.
  duplicates.sort((a, b) => a.record.line - b.record.line);
  const totalHours = kept.reduce((sum, row) => sum + row.hours, 0);
  return { kept, duplicates, conflicts, totalHours };
}`;

export const doubledTotalsCase = {
  id: "doubled-totals", number: 3, title: "The Doubled Totals", playable: true,
  colleague: { name: "Sam Okafor", role: "Operations Planner" },
  request: "I combined the crews' exports for Friday's report. After importing a second batch, the hours jumped, but nobody reported extra work. Some jobs look copied; others have two different versions. Can you give me a subtotal I can trust, and show exactly which records need a conversation with the crews?",
  target: "Keep safe jobs once, link exact copies to their originals, and set aside every version of a conflicting job for review.",
  rules,
  exercises: [{
    id: "doubled-totals", title: "Reconcile the combined weekly export", outputKind: "deduplication", exportFileName: "deduplicate.mjs",
    goal: "Return kept originals, linked duplicate occurrences, complete conflict groups and a reliable hours subtotal.",
    rules, rows: doubledTotalsDatasets.caseFile.rows,
    checks: Object.entries(doubledTotalsDatasets).map(([id, dataset]) => ({ id, ...dataset })),
    starterCode: `function transform(rows) {
  // Inspect the evidence before deciding what is safe to count.
  for (const row of rows) {
    console.log(row.line, row.id, row.hours);
  }

  // Build your audit trail here. No records have been classified yet.
  return { kept: [], duplicates: [], conflicts: [], totalHours: 0 };
}`,
    hints: [
      "Choose the job key first: exact string id. Trace every occurrence of one ID, including those far apart. A later disagreement can change what the whole group needs.",
      "A Map can hold id → array of originals. Start an empty array when an ID is first seen, then push that row. Grouping first lets you inspect all versions before retaining anything.",
      "For each group, compare status, hours and notes against its first record (id already matches). every(...) asks whether all records pass. Ignore line for equality. A single disagreement sends the whole group to conflicts.",
      "For an identical group, retain its first record and link each later record to first.line. Groups can interleave, so put duplicate occurrences back in file-line order. Sum kept hours with reduce, starting from 0. Never sort or change the input.",
    ],
    solution: { code: solutionCode, explanation: [
      "Map keys are exact strings. has, set and get build groups without changing originals. A Map also handles IDs such as __proto__ safely and visits keys in first-seen order.",
      "A Set answers whether a key has appeared, but cannot hold all competing versions by itself. Seeing an ID twice does not tell you whether its information agrees. A Map of arrays keeps the evidence needed for that decision.",
      "every compares business fields with strict equality. Objects at different file lines are different occurrences; comparing whole objects or their JSON including line would mistake identical job information for a conflict.",
      "The group decision happens after all rows are collected. Even two identical early copies must go to conflicts if a later version disagrees. No first or last version is silently trusted.",
      "slice(1) makes a list of later occurrences. Each duplicate holds the unchanged record and keptLine, so a reviewer can trace the decision back to the retained first occurrence.",
      "Map iteration orders kept records and conflicts by first occurrence. Duplicate occurrences from interleaved groups need their own order; sorting the newly created duplicates array by line preserves it without mutating rows.",
      "reduce starts at numeric 0 and adds only safe retained hours. The result is a reliable subtotal, not a conclusion about how much work occurred in unresolved groups. Reconcile all three audit lists before trusting the number.",
    ] },
  }],
};
