// Small text helpers shared by components.

export function solvedLabel(solved) {
  if (!solved) return "";
  if (solved.solutionRevealed) return "Solved after viewing the explained solution";
  if (solved.hintsUsed > 0) return `Solved with ${solved.hintsUsed} hint${solved.hintsUsed === 1 ? "" : "s"}`;
  return "Solved without hints";
}

export function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}
