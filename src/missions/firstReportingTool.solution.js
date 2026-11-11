// Optional explained solution. The checker never imports or runs it.
export const reportingSolution = `function buildWeeklyReport(rawOrders, rawEntries, period) {
  function validDate(text) {
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(text)) return false;
    const [year, month, day] = text.split("-").map(Number);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
  }
  if (!period || Object.keys(period).length !== 2 ||
      typeof period.start !== "string" || typeof period.end !== "string" ||
      !validDate(period.start) || !validDate(period.end) || period.start > period.end) {
    throw Error("Invalid reporting period");
  }
  function cleanOrder(record) {
    const jobId = record.jobId.trim(), site = record.site.trim();
    const status = record.status.trim().toLowerCase(), reasons = [];
    if (!jobId) reasons.push("missing-job-id");
    if (!site) reasons.push("missing-site");
    if (!status) reasons.push("missing-status");
    else if (!["open", "complete", "on hold"].includes(status)) reasons.push("invalid-status");
    return { record, cleaned: reasons.length ? null : {jobId, site, status},
      reasons, disposition: reasons.length ? "rejected" : "retained", duplicateOf: null };
  }
  function cleanEntry(record) {
    const entryId = record.entryId.trim(), jobId = record.jobId.trim();
    const date = record.date.trim(), text = record.hours.trim(), reasons = [];
    const [whole, fraction = ""] = text.split(".");
    const hundredths = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    if (!entryId) reasons.push("missing-entry-id");
    if (!jobId) reasons.push("missing-job-id");
    if (!date) reasons.push("missing-date");
    else if (!validDate(date)) reasons.push("invalid-date");
    if (!text) reasons.push("missing-hours");
    else if (!/^\\d+(\\.\\d{1,2})?$/.test(text) || !Number.isSafeInteger(hundredths)) reasons.push("invalid-hours");
    return { record, cleaned: reasons.length ? null : {entryId, jobId, date, hundredths},
      reasons, disposition: reasons.length ? "rejected" : "candidate", duplicateOf: null, orderLine: null };
  }
  const orders = rawOrders.map(cleanOrder), entries = rawEntries.map(cleanEntry);
  function deduplicate(items, key, fields) {
    const groups = new Map();
    for (const item of items) {
      if (!item.cleaned) continue;
      const id = item.cleaned[key];
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(item);
    }
    for (const group of groups.values()) {
      const first = group[0];
      const conflict = group.some(item => fields.some(field => item.cleaned[field] !== first.cleaned[field]));
      if (conflict) {
        for (const item of group) item.disposition = "conflict";
      } else {
        for (const item of group.slice(1)) {
          item.disposition = "duplicate";
          item.duplicateOf = first.record.line;
        }
      }
    }
    return groups;
  }
  const jobs = deduplicate(orders, "jobId", ["jobId", "site", "status"]);
  deduplicate(entries, "entryId", ["entryId", "jobId", "date", "hundredths"]);
  for (const item of entries) {
    if (item.disposition !== "candidate") continue;
    const value = item.cleaned;
    const order = jobs.get(value.jobId)?.[0];
    if (value.date < period.start || value.date > period.end) item.disposition = "out-of-period";
    else if (order?.disposition === "conflict") item.disposition = "ambiguous-order";
    else if (!order) item.disposition = "unmatched";
    else {
      item.orderLine = order.record.line;
      item.disposition = order.cleaned.status === "complete" ? "included" : "incomplete-order";
    }
  }
  const included = entries.filter(item => item.disposition === "included");
  const format = units => Math.floor(units / 100) + "." + String(units % 100).padStart(2, "0");
  function summarize(items) {
    return {hours: format(items.reduce((sum, item) => sum + item.cleaned.hundredths, 0)),
      jobCount: new Set(items.map(item => item.cleaned.jobId)).size, entryCount: items.length};
  }
  function breakdown(key, getValue) {
    const groups = new Map();
    for (const item of included) {
      const value = getValue(item);
      if (!groups.has(value)) groups.set(value, []);
      groups.get(value).push(item);
    }
    return [...groups.keys()].sort().map(value => ({[key]: value, ...summarize(groups.get(value))}));
  }
  function counts(items, key, categories) {
    const count = disposition => items.filter(item => item.disposition === disposition).length;
    return {input: items.length, valid: items.length - count("rejected"),
      rejected: count("rejected"), duplicates: count("duplicate"), conflicts: count("conflict"),
      conflictGroups: new Set(items.filter(item => item.disposition === "conflict").map(item => item.cleaned[key])).size,
      ...Object.fromEntries(categories.map(([name, disposition]) => [name, count(disposition)]))};
  }
  const totals = summarize(included);
  return {period: {...period}, daily: breakdown("date", item => item.cleaned.date),
    sites: breakdown("site", item => jobs.get(item.cleaned.jobId)[0].cleaned.site),
    totalHours: totals.hours, jobCount: totals.jobCount, entryCount: totals.entryCount,
    counts: {orders: counts(orders, "jobId", [["retained", "retained"]]),
      entries: counts(entries, "entryId", [["outOfPeriod", "out-of-period"], ["ambiguousOrder", "ambiguous-order"],
        ["unmatched", "unmatched"], ["incompleteOrder", "incomplete-order"], ["included", "included"]])},
    audit: {orders, entries}};
}`;
