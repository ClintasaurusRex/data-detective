// Shares the first learner source line; keeps helper names in their own scope.
// The shared worker reports mutation on successful returns. Preserve its
// established error behavior while also detecting mutation before a period
// rejection, which is an expected outcome for this mission's invalid periods.
export function reportingCode(code) {
  return 'function transform(rows) { const snapshot = JSON.stringify(rows); try { return (function() {' + code + '\n;return buildWeeklyReport;\n})()(rows[0], rows[1], rows[2]); } catch (error) { if (JSON.stringify(rows) !== snapshot) throw Error("Your code changed an input before failing."); throw error; } }\n';
}
