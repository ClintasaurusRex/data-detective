import { missingJobsCase } from "./missingJobs.js";

// All five cases share one fictional workplace: Riverbend Water Services.
// Only Case 1 is playable in Milestone 1; the rest are planned.
export const cases = [
  missingJobsCase,
  { id: "messy-export", number: 2, title: "The Messy Export", playable: false },
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
