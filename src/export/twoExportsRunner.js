// This source is bundled verbatim into the downloadable module after its
// imports, contract guards and loadCheckedCode function. It uses Node built-ins.
async function readSource(path, source) {
  let input;
  try {
    input = await fs.open(path, "r");
    const info = await input.stat();
    if (!info.isFile()) throw new Error("expected a regular JSON file, not a folder or special device.");
    const text = await input.readFile("utf8");
    let rows;
    try { rows = JSON.parse(text.replace(/^\uFEFF/, "")); }
    catch (error) { throw new Error("isn't valid JSON: " + error.message + ". Check commas, quotes and brackets.", { cause: error }); }
    validateTwoExportsInput(rows, source);
    return { rows, info, path };
  } catch (error) { throw new Error(fileProblem("read input", path, error), { cause: error }); }
  finally { await input?.close(); }
}

function fileProblem(action, path, error) {
  const prefix = "Couldn't " + action + " '" + path + "': ";
  if (error.code === "ENOENT") return prefix + "file or parent folder not found. Check the path and your terminal's current folder.";
  if (["EACCES", "EPERM", "EROFS"].includes(error.code)) return prefix + "permission denied or read-only location. Choose a readable input or writable output folder.";
  if (error.code === "EISDIR") return prefix + "it is a folder. Give a file path instead.";
  return prefix + error.message;
}

async function checkOutput(path, inputs) {
  if (inputs.some(input => resolve(input.path) === resolve(path))) throw new Error("The output must be a different file from BOTH inputs.");
  let info;
  try { info = await fs.lstat(path); }
  catch (error) { if (error.code === "ENOENT") return; throw error; }
  // stat follows links for identity checks; dangling output links are rejected.
  if (info.isSymbolicLink()) {
    let target;
    try { target = await fs.stat(path); } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (target && inputs.some(input => input.info.dev === target.dev && input.info.ino === target.ino)) throw new Error("The output points to an input JSON. Choose a different output file.");
    throw new Error("Output symlinks are not supported. Choose a separate regular report file.");
  }
  if (inputs.some(input => input.info.dev === info.dev && input.info.ino === info.ino)) throw new Error("The output points to an input JSON. Choose a different output file.");
  if (!info.isFile()) throw new Error("expected a regular output file, not a folder or special device.");
  await fs.access(path, constants.W_OK);
}

async function saveReport(path, json, inputs) {
  let temporary;
  try {
    await checkOutput(path, inputs);
    // Prepare a complete sibling file, then rename it into place. No existing
    // report is truncated. A failure before rename leaves it unchanged.
    temporary = await fs.mkdtemp(join(dirname(resolve(path)), ".data-detective-"));
    const staged = join(temporary, "report.json");
    const output = await fs.open(staged, "wx", 0o600);
    try { await output.writeFile(json, "utf8"); await output.sync(); }
    finally { await output.close(); }
    await checkOutput(path, inputs);
    await fs.rename(staged, path);
  } catch (error) { throw new Error(fileProblem("write output", path, error), { cause: error }); }
  finally { if (temporary) await fs.rm(temporary, { recursive: true, force: true }); }
}

async function runScript() {
  const args = process.argv.slice(2);
  if (args.length < 2 || args.length > 3 || args.some(arg => !arg || arg.startsWith("--"))) throw new Error("Usage: node reconcile.mjs orders.json field-reports.json [report.json]\nGive TWO input paths and optionally a separate output path.");
  const [ordersPath, fieldsPath, outputPath] = args;
  const left = await readSource(ordersPath, "Scheduling orders");
  const right = await readSource(fieldsPath, "Field reports");
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
