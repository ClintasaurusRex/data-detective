// Runtime evidence checks for arbitrary files, never a report generator.
// Cleaning/calendar/decimal facts must be recomputed to verify audit claims.
// Classification is checked against whole-group evidence; totals are reconciled
// from verified included audit items. Nothing supplies or repairs learner output.
const ORDER_FIELDS = ["line", "jobId", "site", "status"];
const ENTRY_FIELDS = ["line", "entryId", "jobId", "date", "hours"];
const ORDER_CLEAN = ["jobId", "site", "status"];
const ENTRY_CLEAN = ["entryId", "jobId", "date", "hundredths"];
const DISPOSITIONS = {
  rejected: "rejected", duplicates: "duplicate", conflicts: "conflict",
  retained: "retained", outOfPeriod: "out-of-period", ambiguousOrder: "ambiguous-order",
  unmatched: "unmatched", incompleteOrder: "incomplete-order", included: "included",
};
const fieldsAre = (value, fields) => value !== null && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).length === fields.length && fields.every(key => Object.hasOwn(value, key));

export function validateReportingInput(value, source) {
  if (source === "period") {
    if (!fieldsAre(value, ["start", "end"]) || typeof value.start !== "string" || typeof value.end !== "string") {
      throw new Error("Period must be an object with exactly start and end strings. Calendar values are checked by your function.");
    }
    return;
  }
  if (!Array.isArray(value)) throw new Error(source + " must be a JSON array of raw records.");
  const fields = source === "orders" ? ORDER_FIELDS : ENTRY_FIELDS, lines = new Set();
  for (const [index, record] of value.entries()) {
    const prefix = source + " record " + (index + 1) + ": ";
    if (!fieldsAre(record, fields)) throw new Error(prefix + "expected exactly " + fields.join(", ") + ".");
    if (!Number.isSafeInteger(record.line) || record.line <= 0 || lines.has(record.line)) {
      throw new Error(prefix + "line must be a unique positive safe integer within this source; source order need not be numeric.");
    }
    lines.add(record.line);
    for (const field of fields.slice(1)) if (typeof record[field] !== "string") throw new Error(prefix + field + " must be a raw string (including blanks or malformed business values).");
  }
}

// UTC round-trip avoids locale/timezone parsing and automatic rollover. Setting
// the full year explicitly also handles years 0001–0099 correctly.
function calendarDate(text) {
  if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text) || text.startsWith("0000")) return false;
  const [year, month, day] = text.split("-").map(Number), date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
export function validReportingPeriod(period) {
  return fieldsAre(period, ["start", "end"]) && calendarDate(period.start) && calendarDate(period.end) && period.start <= period.end;
}

export function validateWeeklyReport(report, rawOrders, rawEntries, period) {
  const fail = (path, message) => { throw new Error("Invalid report: " + path + ": " + message); };
  function equal(actual, expected, path) {
    if (expected !== null && typeof expected === "object") {
      const keys = Object.keys(expected);
      if (Array.isArray(expected) ? !Array.isArray(actual) || actual.length !== expected.length : !fieldsAre(actual, keys)) fail(path, "fields, type or length differ from the contract evidence.");
      for (const key of keys) equal(actual[key], expected[key], path + "." + key);
    } else if (actual !== expected) fail(path, "value or type differs from the source evidence.");
  }
  if (!validReportingPeriod(period)) fail("period", "invalid periods require Error(\"Invalid reporting period\"), never a report.");
  if (!fieldsAre(report, ["period", "daily", "sites", "totalHours", "jobCount", "entryCount", "counts", "audit"])) fail("report", "return exactly the eight documented fields.");
  equal(report.period, period, "period");
  if (!fieldsAre(report.audit, ["orders", "entries"])) fail("audit", "needs exactly orders and entries.");
  if (!fieldsAre(report.counts, ["orders", "entries"])) fail("counts", "needs exactly orders and entries.");
  const groups = {orders: new Map(), entries: new Map()};
  for (const [source, rows] of [["orders", rawOrders], ["entries", rawEntries]]) {
    const items = report.audit[source], isOrder = source === "orders";
    if (!Array.isArray(items) || items.length !== rows.length) fail("audit." + source, "preserve one occurrence per input in source order.");
    for (const [index, record] of rows.entries()) {
      const item = items[index], path = "audit." + source + "[" + index + "] (source line " + record.line + ")";
      if (!fieldsAre(item, ["record", "cleaned", "reasons", "disposition", "duplicateOf", ...isOrder ? [] : ["orderLine"]])) fail(path, "incorrect audit fields.");
      equal(item.record, record, path + ".record");
      const reasons = [], jobId = record.jobId.trim();
      let cleaned;
      if (isOrder) {
        const site = record.site.trim(), status = record.status.trim().toLowerCase();
        if (!jobId) reasons.push("missing-job-id");
        if (!site) reasons.push("missing-site");
        if (!status) reasons.push("missing-status");
        else if (!["open", "complete", "on hold"].includes(status)) reasons.push("invalid-status");
        cleaned = {jobId, site, status};
      } else {
        const entryId = record.entryId.trim(), date = record.date.trim(), text = record.hours.trim();
        let hundredths = null;
        if (/^\d+(\.\d{1,2})?$/.test(text)) {
          const [whole, fraction = ""] = text.split(".");
          const units = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
          if (units <= BigInt(Number.MAX_SAFE_INTEGER)) hundredths = Number(units);
        }
        if (!entryId) reasons.push("missing-entry-id");
        if (!jobId) reasons.push("missing-job-id");
        if (!date) reasons.push("missing-date"); else if (!calendarDate(date)) reasons.push("invalid-date");
        if (!text) reasons.push("missing-hours"); else if (hundredths === null) reasons.push("invalid-hours");
        cleaned = {entryId, jobId, date, hundredths};
      }
      equal(item.reasons, reasons, path + ".reasons");
      equal(item.cleaned, reasons.length ? null : cleaned, path + ".cleaned");
      if (reasons.length) continue;
      const id = cleaned[isOrder ? "jobId" : "entryId"], indexById = groups[source];
      if (!indexById.has(id)) indexById.set(id, {first: item, conflict: false});
      const group = indexById.get(id), fields = isOrder ? ORDER_CLEAN : ENTRY_CLEAN;
      if (fields.some(key => item.cleaned[key] !== group.first.cleaned[key])) group.conflict = true;
    }
  }
  // Verify each claimed disposition, including earlier identical occurrences in
  // a later-disputed group. Indexing ALL valid audit items precedes date checks.
  for (const source of ["orders", "entries"]) {
    const isOrder = source === "orders", items = report.audit[source];
    for (const item of items) {
      const path = "audit." + source + " source line " + item.record.line;
      let disposition, duplicateOf = null, orderLine = null;
      if (item.cleaned === null) disposition = "rejected";
      else {
        const group = groups[source].get(item.cleaned[isOrder ? "jobId" : "entryId"]);
        if (group.conflict) disposition = "conflict";
        else if (item !== group.first) { disposition = "duplicate"; duplicateOf = group.first.record.line; }
        else if (isOrder) disposition = "retained";
        else if (item.cleaned.date < period.start || item.cleaned.date > period.end) disposition = "out-of-period";
        else {
          const order = groups.orders.get(item.cleaned.jobId);
          if (order?.conflict) disposition = "ambiguous-order";
          else if (!order) disposition = "unmatched";
          else { orderLine = order.first.record.line; disposition = order.first.cleaned.status === "complete" ? "included" : "incomplete-order"; }
        }
      }
      equal(item.disposition, disposition, path + ".disposition");
      equal(item.duplicateOf, duplicateOf, path + ".duplicateOf");
      if (!isOrder) equal(item.orderLine, orderLine, path + ".orderLine");
    }
    const names = ["input", "valid", "rejected", "duplicates", "conflicts", "conflictGroups",
      ...isOrder ? ["retained"] : ["outOfPeriod", "ambiguousOrder", "unmatched", "incompleteOrder", "included"]];
    if (!fieldsAre(report.counts[source], names)) fail("counts." + source, "incorrect count fields.");
    for (const name of names) {
      const value = name === "input" ? items.length : name === "valid" ? items.filter(item => item.cleaned !== null).length :
        name === "conflictGroups" ? [...groups[source].values()].filter(group => group.conflict).length :
          items.filter(item => item.disposition === DISPOSITIONS[name]).length;
      equal(report.counts[source][name], value, "counts." + source + "." + name);
    }
  }
  const included = report.audit.entries.filter(item => item.disposition === "included");
  function summary(items, path) {
    const units = items.reduce((sum, item) => sum + BigInt(item.cleaned.hundredths), 0n);
    if (units > BigInt(Number.MAX_SAFE_INTEGER)) fail(path, "reportable total exceeds safe integer hundredths; use a smaller report.");
    return {hours: String(units / 100n) + "." + String(units % 100n).padStart(2, "0"),
      jobCount: new Set(items.map(item => item.cleaned.jobId)).size, entryCount: items.length};
  }
  const totals = summary(included, "totalHours");
  equal(report.totalHours, totals.hours, "totalHours");
  equal(report.jobCount, totals.jobCount, "jobCount");
  equal(report.entryCount, totals.entryCount, "entryCount");
  for (const [name, key, lookup] of [["daily", "date", item => item.cleaned.date],
    ["sites", "site", item => groups.orders.get(item.cleaned.jobId).first.cleaned.site]]) {
    const memberships = new Map();
    for (const item of included) {
      const value = lookup(item);
      if (!memberships.has(value)) memberships.set(value, []);
      memberships.get(value).push(item);
    }
    const keys = [...memberships.keys()].sort();
    if (!Array.isArray(report[name]) || report[name].length !== keys.length) fail(name, "one group per included key; no absent or fabricated groups.");
    for (const [index, value] of keys.entries()) equal(report[name][index], {[key]: value, ...summary(memberships.get(value), name)}, name + "[" + index + "]");
  }
}
