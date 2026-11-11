// Bundled after Node imports, guards, file helpers and loadCheckedCode.
async function runScript() {
  const args = process.argv.slice(2);
  if (args.length < 3 || args.length > 4 || args.some(arg => !arg || arg.startsWith("--"))) {
    throw new Error("Usage: node weekly-report.mjs orders.json entries.json period.json [report.json]\nGive THREE input paths and optionally a separate output path. Quote paths with spaces.");
  }
  const inputs = [];
  for (const [index, source] of ["orders", "entries", "period"].entries()) {
    inputs.push(await readJsonInput(args[index], value => validateReportingInput(value, source)));
  }
  const values = inputs.map(input => input.rows), before = JSON.stringify(values);
  const [originalOrders, originalEntries, originalPeriod] = JSON.parse(before);
  const validPeriod = validReportingPeriod(originalPeriod);
  function unchanged() {
    if (JSON.stringify(values) !== before) throw new Error("Your code changed an input. Preserve both sources, their order and the period.");
  }
  let json;
  try {
    const buildWeeklyReport = loadCheckedCode();
    if (typeof buildWeeklyReport !== "function") throw new Error("Define buildWeeklyReport(rawOrders, rawEntries, period).");
    let report;
    try { report = buildWeeklyReport(...values); }
    catch (error) {
      unchanged();
      if (!validPeriod && (!(error instanceof Error) || error.message !== "Invalid reporting period")) {
        throw new Error("Invalid periods require your function to throw Error(\"Invalid reporting period\"); it threw: " + (error?.message ?? String(error)), {cause: error});
      }
      throw error;
    }
    unchanged();
    if (!validPeriod) throw new Error("Your function returned for an invalid period. It must throw Error(\"Invalid reporting period\"). No report was saved.");
    validateWeeklyReport(report, originalOrders, originalEntries, originalPeriod);
    json = JSON.stringify(report, null, 2) + "\n";
    validateWeeklyReport(JSON.parse(json), originalOrders, originalEntries, originalPeriod);
    unchanged();
  } catch (error) { throw new Error("Your code could not produce a valid report: " + (error?.message ?? String(error)), {cause: error}); }
  if (args[3]) {
    await saveReport(args[3], json, inputs);
    console.error("Wrote weekly report to " + resolve(args[3]));
  } else { process.stdout.write(json); }
}

runScript().catch(error => {
  console.error("Error: " + (error?.message ?? String(error)));
  process.exitCode = 1;
});
