// Integrity guards, not a reconciliation implementation. These reject bad
// evidence/results and never supply or repair a learner's answer.
const RECORD_FIELDS = ["line", "id", "site", "status", "hours"];
const CATEGORIES = ["agreed", "onlyOrders", "onlyFieldReports", "differences", "ambiguous"];
const COUNTS = ["orders", "fieldReports", ...CATEGORIES];
const hasFields = (value, fields) => value !== null && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));

export function validateTwoExportsInput(rows, source) {
  if (!Array.isArray(rows)) throw new Error(source + " must be a JSON array of records.");
  let previous = 0;
  for (const [index, row] of rows.entries()) {
    const prefix = source + " record " + (index + 1) + ": ";
    if (!hasFields(row, RECORD_FIELDS)) throw new Error(prefix + "expected exactly line, id, site, status and hours.");
    if (!Number.isSafeInteger(row.line) || row.line <= previous) throw new Error(prefix + "line must be a positive safe integer, unique and increasing within this source. Gaps are allowed.");
    previous = row.line;
    if (typeof row.id !== "string" || !row.id || row.id.trim() !== row.id) throw new Error(prefix + "id must be a nonblank, already-trimmed string. Preserve leading zeros and capitalization.");
    if (typeof row.site !== "string" || !row.site.trim()) throw new Error(prefix + "site must be a nonblank string. Preserve its exact content.");
    if (!["open", "complete", "on hold"].includes(row.status)) throw new Error(prefix + "status must be open, complete or on hold.");
    if (typeof row.hours !== "number" || row.hours < 0 || !Number.isSafeInteger(row.hours * 4)) throw new Error(prefix + "hours must be a finite nonnegative number in exact quarter-hour steps within safe numeric range.");
  }
}

export function validateTwoExportsReport(report, orders, fieldReports) {
  const fail = message => { throw new Error("Invalid report: " + message); };
  if (!hasFields(report, [...CATEGORIES, "summary"]) || !CATEGORIES.every(key => Array.isArray(report[key]))) fail("return exactly agreed, onlyOrders, onlyFieldReports, differences, ambiguous arrays and summary.");
  const sources = { orders, fieldReports };
  const originals = {}, seen = {};
  const groups = new Map();
  for (const [source, rows] of Object.entries(sources)) {
    originals[source] = new Map(rows.map(row => [row.line, row]));
    seen[source] = new Set();
    for (const row of rows) {
      if (!groups.has(row.id)) groups.set(row.id, { index: groups.size, orders: [], fieldReports: [] });
      groups.get(row.id)[source].push(row);
    }
  }
  function original(record, source) {
    const row = originals[source].get(record?.line);
    if (!hasFields(record, RECORD_FIELDS) || !row || RECORD_FIELDS.some(key => record[key] !== row[key])) fail(source + ": preserve every original's five fields, values and source line.");
    if (seen[source].has(row.line)) fail(source + " line " + row.line + " appears more than once.");
    seen[source].add(row.line);
    return groups.get(row.id);
  }
  const repeated = group => group.orders.length > 1 || group.fieldReports.length > 1;
  for (const category of CATEGORIES) {
    let previous = -1;
    for (const entry of report[category]) {
      let group;
      if (category === "agreed" || category === "differences") {
        if (!hasFields(entry, category === "agreed" ? ["order", "fieldReport"] : ["order", "fieldReport", "fields"])) fail(category + ": incorrect pair fields.");
        group = original(entry.order, "orders");
        original(entry.fieldReport, "fieldReports");
        if (entry.order.id !== entry.fieldReport.id || repeated(group)) fail(category + ": pair only unique exact matching IDs; repeated keys belong wholly in ambiguous.");
        const fields = ["site", "status", "hours"].filter(key => entry.order[key] !== entry.fieldReport[key]);
        if (category === "agreed" && fields.length) fail("agreed pairs must have equal site, status and hours.");
        if (category === "differences" && (!fields.length || !Array.isArray(entry.fields) || entry.fields.length !== fields.length || fields.some((key, i) => entry.fields[i] !== key))) fail("differences.fields must list every differing name once in site, status, hours order.");
      } else if (category === "ambiguous") {
        if (!hasFields(entry, ["id", "orders", "fieldReports"]) || !Array.isArray(entry.orders) || !Array.isArray(entry.fieldReports)) fail("ambiguous needs exactly id, orders and fieldReports.");
        group = groups.get(entry.id);
        if (!group || !repeated(group)) fail("ambiguous requires a repeated exact ID in at least one source.");
        for (const source of Object.keys(sources)) {
          if (entry[source].length !== group[source].length) fail("ambiguous must preserve ALL occurrences from BOTH sources, including exact copies.");
          for (const [i, record] of entry[source].entries()) {
            original(record, source);
            if (record.id !== entry.id || record.line !== group[source][i].line) fail("ambiguous originals must retain their group's ID and source order.");
          }
        }
      } else {
        const source = category === "onlyOrders" ? "orders" : "fieldReports";
        group = original(entry, source);
        const other = source === "orders" ? "fieldReports" : "orders";
        if (repeated(group) || group[other].length) fail(category + ": only unique IDs with no counterpart belong here.");
      }
      if (group.index <= previous) fail(category + ": follow scheduling-first union key order, without repeated groups.");
      previous = group.index;
    }
  }
  for (const [source, rows] of Object.entries(sources)) if (seen[source].size !== rows.length) fail(source + ": account for every occurrence exactly once.");
  if (!hasFields(report.summary, COUNTS)) fail("summary needs exactly all seven counts.");
  for (const key of COUNTS) {
    const count = key in sources ? sources[key].length : report[key].length;
    if (!Number.isSafeInteger(report.summary[key]) || report.summary[key] !== count) fail("summary." + key + " must count " + (key in sources ? "original occurrences." : "category entries (ambiguous counts groups)."));
  }
}
