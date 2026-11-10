// Independent small-data solution: classify each occurrence by examining all
// matching rows. This deliberately differs from the lesson's Map-first solver.
export const independentSolution = `function transform(rows) {
  const kept = [], duplicates = [], conflicts = [];
  const seenConflicts = new Set();
  for (const row of rows) {
    const group = rows.filter(other => other.id === row.id);
    const first = group[0];
    const conflict = group.some(other => other.status !== first.status ||
      other.hours !== first.hours || other.notes !== first.notes);
    if (conflict) {
      if (!seenConflicts.has(row.id)) conflicts.push({ id: row.id, records: group });
      seenConflicts.add(row.id);
    } else if (row.line === first.line) kept.push(row);
    else duplicates.push({ record: row, keptLine: first.line });
  }
  return { kept, duplicates, conflicts, totalHours: kept.reduce((sum, row) => sum + row.hours, 0) };
}`;

const naiveFirst = `function transform(rows) {
  const seen = new Map(), kept = [], duplicates = [];
  for (const row of rows) {
    if (!seen.has(row.id)) { kept.push(row); seen.set(row.id, row.line); }
    else duplicates.push({ record: row, keptLine: seen.get(row.id) });
  }
  return { kept, duplicates, conflicts: [], totalHours: kept.reduce((sum, row) => sum + row.hours, 0) };
}`;

export const wrongSolutions = {
  "first record wins": naiveFirst,
  "last record wins": `function transform(rows) {
    const kept = rows.filter((row, i) => !rows.slice(i + 1).some(other => other.id === row.id));
    return { kept, duplicates: rows.filter(row => !kept.includes(row)).map(record => ({record, keptLine: kept.find(row => row.id === record.id).line})), conflicts: [], totalHours: kept.reduce((s, r) => s + r.hours, 0) };
  }`,
  "count every repeated record": 'function transform(rows) { return {kept: rows, duplicates: [], conflicts: [], totalHours: rows.reduce((s,r) => s+r.hours,0)}; }',
  "deduplicate by status": naiveFirst.replaceAll("row.id", "row.status"),
  "convert IDs to numbers": independentSolution.replace("other.id === row.id", "Number(other.id) === Number(row.id)"),
  "conflicts treated as copies": naiveFirst,
  "lose originals": independentSolution.replace("return { kept,", "kept.pop(); return { kept,"),
  "wrong total": independentSolution.replace("sum + row.hours", "sum + row.hours + 1"),
  "compare line as business data": independentSolution.replace("other.hours !== first.hours", "other.line !== first.line || other.hours !== first.hours"),
  "ignore notes": independentSolution.replace("other.notes !== first.notes", "false"),
  "ignore status": independentSolution.replace("other.status !== first.status", "false"),
  "trim notes": independentSolution.replace("other.notes !== first.notes", "other.notes.trim() !== first.notes.trim()"),
};
