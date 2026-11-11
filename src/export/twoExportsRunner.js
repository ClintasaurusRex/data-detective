async function runScript() {
  const args = process.argv.slice(2);
  if (args.length < 2 || args.length > 3 || args.some(arg => !arg || arg.startsWith("--"))) throw new Error("Usage: node reconcile.mjs orders.json field-reports.json [report.json]\nGive TWO input paths and optionally a separate output path.");
  const [ordersPath, fieldsPath, outputPath] = args;
  const left = await readJsonInput(ordersPath, rows => validateTwoExportsInput(rows, "Scheduling orders"));
  const right = await readJsonInput(fieldsPath, rows => validateTwoExportsInput(rows, "Field reports"));
  const before = JSON.stringify([left.rows, right.rows]);
  const [orders, fieldReports] = JSON.parse(before);
  let json;
  try {
    const reconcile = loadCheckedCode(globalThis.console);
    if (typeof reconcile !== "function") throw new Error("Define a reconcile(orders, fieldReports) function.");
    const report = reconcile(left.rows, right.rows);
    if (JSON.stringify([left.rows, right.rows]) !== before) throw new Error("Your code changed an input. Preserve both source arrays and originals.");
    validateTwoExportsReport(report, orders, fieldReports);
    json = JSON.stringify(report, null, 2) + "\n";
    validateTwoExportsReport(JSON.parse(json), orders, fieldReports);
    if (JSON.stringify([left.rows, right.rows]) !== before) throw new Error("Your code changed an input while preparing the report.");
  } catch (error) { throw new Error("Your code could not produce a valid report: " + (error?.message ?? String(error)), { cause: error }); }
  if (outputPath) {
    await saveReport(outputPath, json, [left, right]);
    console.error("Wrote reconciliation report to " + outputPath);
  } else { process.stdout.write(json); }
}

runScript().catch(error => {
  console.error("Error: " + (error?.message ?? String(error)));
  process.exitCode = 1;
});
