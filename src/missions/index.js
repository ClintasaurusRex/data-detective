import { firstReportingToolCase } from "./firstReportingTool.js";
import { messyExportCase } from "./messyExport.js";
import { missingJobsCase } from "./missingJobs.js";
import { twoExportsCase } from "./twoExports.js";
import { doubledTotalsCase } from "./doubledTotals.js";

// All five cases share one fictional workplace: Riverbend Water Services.
// All five missions are independently playable.
export const cases = [
  missingJobsCase,
  messyExportCase,
  doubledTotalsCase,
  twoExportsCase,
  firstReportingToolCase,
];

export const playableCases = cases.filter((c) => c.playable);

export const allExercises = playableCases.flatMap((c) =>
  c.exercises.map((exercise) => ({ ...exercise, caseId: c.id, caseTitle: c.title, caseNumber: c.number })),
);

export function findExercise(exerciseId) {
  return allExercises.find((e) => e.id === exerciseId);
}
