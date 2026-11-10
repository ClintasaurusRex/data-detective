// Fictional cleaned records and handwritten answers. No reference algorithm.
function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
const r = (line, id, hours, notes = "", status = "complete") => ({ line, id, status, hours, notes });
function d(name, description, rows, kept, duplicates, conflicts, totalHours) {
  return { name, description, rows, expected: {
    kept, duplicates: duplicates.map(([line, keptLine]) => ({ line, keptLine })),
    conflicts: conflicts.map(([id, lines]) => ({ id, lines })), totalHours,
  } };
}

export const doubledTotalsDatasets = deepFreeze({
  caseFile: d("The case file", "A repeat import and competing valve-repair hours. Follow all three versions of 00111 before deciding.", [
    r(2, "00110", 2, "Meter swap"), r(3, "00111", 3, "Valve repair"),
    r(4, "00110", 2, "Meter swap"), r(5, "00112", 1.5, "Access visit", "on hold"),
    r(6, "00111", 4, "Valve repair"), r(7, "00112", 1.5, "Access visit", "on hold"),
    r(8, "00113", 0, "Awaiting parts", "open"), r(9, "00111", 3, "Valve repair"),
  ], [2, 5, 8], [[4, 2], [7, 5]], [["00111", [3, 6, 9]]], 3.5),
  noDuplicates: d("No repeated jobs", "All statuses count when safely kept; zero is a real value.", [
    r(2, "R-31", 2, "Inspection", "open"), r(4, "R-32", 4.75, "Pump service", "on hold"), r(7, "R-33", 0),
  ], [2, 4, 7], [], [], 6.75),
  oneDuplicate: d("One exact duplicate", "Different file lines do not make different job information.", [
    r(2, "E-21", 1.25, "Flush"), r(3, "E-21", 1.25, "Flush"), r(4, "E-22", 2),
  ], [2, 4], [[3, 2]], [], 3.25),
  manyCopies: d("Three copies of one job", "Both later copies must link to the first, not to each other.", [
    r(3, "M-8", 2.5), r(5, "M-8", 2.5), r(9, "M-8", 2.5),
  ], [3], [[5, 3], [9, 3]], [], 2.5),
  hoursConflict: d("Competing hours", "A repeated ID with different hours is entirely unresolved.", [
    r(2, "H-1", 1), r(3, "H-1", 2), r(4, "H-2", 0.25),
  ], [4], [], [["H-1", [2, 3]]], 0.25),
  fieldConflicts: d("Status and notes disagree", "Same hours alone do not prove equality. Compare every business field.", [
    r(2, "S-1", 1, "Valve", "open"), r(3, "N-1", 2, "North"),
    r(4, "S-1", 1, "Valve"), r(5, "N-1", 2, "South"),
  ], [], [], [["S-1", [2, 4]], ["N-1", [3, 5]]], 0),
  lateConflict: d("A late conflicting version", "Two identical copies become part of a conflict when a later version disagrees.", [
    r(2, "L-6", 3), r(3, "L-6", 3), r(4, "L-7", 1), r(8, "L-6", 4),
  ], [4], [], [["L-6", [2, 3, 8]]], 1),
  manyGroups: d("Several groups interleaved", "Order groups by their first occurrence, not alphabetically or by when disagreement is discovered.", [
    r(2, "Z", 2), r(3, "A", 1), r(4, "K", 0.5), r(5, "A", 2),
    r(6, "K", 0.5), r(7, "Z", 3), r(8, "Q", 4),
  ], [4, 8], [[6, 4]], [["Z", [2, 7]], ["A", [3, 5]]], 4.5),
  textKeys: d("Text keys and leading zeros", "0007 and 7 differ, as do Job-A and job-a. No numeric conversion or case folding.", [
    r(2, "0007", 1), r(3, "7", 2), r(4, "Job-A", 3), r(5, "job-a", 4), r(6, "0007", 1),
  ], [2, 3, 4, 5], [[6, 2]], [], 10),
  reordered: d("Same jobs, different order", "First occurrences and duplicate links change with file order, even when the safe subtotal stays the same.", [
    r(2, "00111", 3, "Valve repair"), r(3, "00112", 1.5, "Access visit", "on hold"),
    r(4, "00113", 0, "Awaiting parts", "open"), r(5, "00110", 2, "Meter swap"),
    r(6, "00111", 4, "Valve repair"), r(7, "00112", 1.5, "Access visit", "on hold"),
    r(8, "00110", 2, "Meter swap"), r(9, "00111", 3, "Valve repair"),
  ], [3, 4, 5], [[7, 3], [8, 5]], [["00111", [2, 6, 9]]], 3.5),
  farApart: d("Copies far apart", "Compare with the whole ID group, not just the previous row. Duplicate list order follows occurrence order.", [
    r(2, "B", 1), r(3, "A", 2), r(4, "X", 3), r(5, "Y", 0), r(6, "A", 2), r(10, "B", 1),
  ], [2, 3, 4, 5], [[6, 3], [10, 2]], [], 6),
  empty: d("An empty week", "Empty input is valid, and its total is numeric zero.", [], [], [], [], 0),
  allDuplicated: d("Every job copied", "Retain one original for each identical group, not zero originals or every copy.", [
    r(2, "D-1", 0.75), r(3, "D-2", 1.5), r(4, "D-1", 0.75), r(5, "D-2", 1.5),
  ], [2, 3], [[4, 2], [5, 3]], [], 2.25),
  allConflicted: d("Nothing reliable yet", "Every occurrence requires review, including identical versions inside a conflict.", [
    r(2, "C-1", 2), r(3, "C-2", 3), r(4, "C-1", 4), r(5, "C-2", 3, "Changed note"), r(6, "C-1", 2),
  ], [], [], [["C-1", [2, 4, 6]], ["C-2", [3, 5]]], 0),
  newJobs: d("Next week's jobs", "Different IDs, lines, counts and total expose answers typed in by hand.", [
    r(11, "NEW-90", 6), r(15, "NEW-91", 0.25), r(16, "NEW-90", 6),
    r(20, "NEW-92", 1), r(21, "NEW-92", 1.5),
  ], [11, 15], [[16, 11]], [["NEW-92", [20, 21]]], 6.25),
  noteDetails: d("Notes are exact evidence", "Do not trim or lower-case notes; multiline notes still compare as text.", [
    r(2, "SPACE", 1, "Valve"), r(3, "SPACE", 1, "Valve "),
    r(4, "CASE", 1, "north"), r(5, "CASE", 1, "North"),
    r(6, "MULTI", 0.5, 'Crew said "done"\nRechecked, dry'), r(8, "MULTI", 0.5, 'Crew said "done"\nRechecked, dry'),
  ], [6], [[8, 6]], [["SPACE", [2, 3]], ["CASE", [4, 5]]], 0.5),
  specialKeys: d("IDs are data, not object properties", "Map supports arbitrary string keys, including names inherited by plain objects.", [
    r(2, "__proto__", 1), r(3, "constructor", 2), r(4, "__proto__", 1), r(5, "toString", 0),
  ], [2, 3, 5], [[4, 2]], [], 3),
});
