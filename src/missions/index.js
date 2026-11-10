import { messyExportCase } from "./messyExport.js";
import { missingJobsCase } from "./missingJobs.js";

// All five cases share one fictional workplace: Riverbend Water Services.
// Cases 1 and 2 are playable; later missions remain planned.
export const cases = [
  missingJobsCase,
  messyExportCase,
  { id: "doubled-totals", number: 3, title: "The Doubled Totals", playable: false },
  { id: "two-exports", number: 4, title: "The Two Exports", playable: false },
  { id: "first-reporting-tool", number: 5, title: "Your First Reporting Tool", playable: false },
];

export const playableCases = cases.filter((c) => c.playable);

export const allExercises = playableCases.flatMap((c) =>
  c.exercises.map((exercise) => ({ ...exercise, caseId: c.id, caseTitle: c.title, caseNumber: c.number })),
);

export function findExercise(exerciseId) {
  return allExercises.find((e) => e.id === exerciseId);
}
