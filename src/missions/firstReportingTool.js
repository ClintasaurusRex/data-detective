import { reportingDatasets } from './firstReportingTool.fixtures.js';
import { reportingSolution } from './firstReportingTool.solution.js';

export const reportingRules = [
  'Write `buildWeeklyReport(rawOrders, rawEntries, period)`. Records are already parsed strings with source lines. Return the eight-field report below. Never mutate inputs or originals. Preserve every occurrence once, in source array order, in its audit list.',
  'Trim IDs, sites, dates and hours. Lowercase only status: open, complete, on hold. Keep leading zeros, ID capitalization and meaningful internal/site text. Reject blank IDs/sites and missing or unknown statuses.',
  'Dates must be actual Gregorian calendar dates in YYYY-MM-DD, years 0001–9999. Check leap years and month lengths. Period start/end are strict untrimmed dates with start <= end. Otherwise throw Error("Invalid reporting period"), even for empty sources. No timezone conversion is needed.',
  'Hours: digits with an optional dot and one or two fractional digits, e.g. 0, 07.50, 2.5. Reject blank, negative, signed, exponential, comma, units, .5, 5., or >2 decimal places. Blank means unknown; explicit zero is valid. Convert into safe integer hundredths before summing. Accepted input sums fit the safe integer range.',
  'Collect all validation reasons once in field order. Orders: missing-job-id, missing-site, missing-status OR invalid-status. Entries: missing-entry-id, missing-job-id, missing-date OR invalid-date, missing-hours OR invalid-hours. Rejected audit items have cleaned: null. Other items have reasons: [].',
  'Cleaned orders have exactly jobId, site, status. Cleaned entries have entryId, jobId, date, hundredths. Audit items keep the complete raw record separately. Source line is provenance scoped to a source, never a matching key.',
  'Validate before grouping. Group valid orders by jobId and valid entries by entryId. Compare all cleaned business fields. Any disagreement makes every valid occurrence in that group conflict, even earlier identical copies. Exact repeats collapse to the first occurrence; later copies are duplicate, with duplicateOf pointing to that first source line. Other items use duplicateOf: null.',
  'Distinct entry IDs for one job are legitimate separate entries. Detect conflicts across the entire export BEFORE filtering by date. Rejected versions do not create conflicts. Valid orders are retained, duplicate or conflict; invalid ones are rejected.',
  'For remaining unique/first entries, outside the inclusive period means out-of-period. Inside it, an order conflict means ambiguous-order; no safe valid order means unmatched; an open/on hold order means incomplete-order; a complete order means included. This precedence gives each occurrence one disposition. Do not fabricate missing orders.',
  'Entry audit items use orderLine only for included or incomplete-order: reference the retained order line. Otherwise orderLine: null. Dispositions explain exclusions; reasons contains validation codes only. Duplicate links remain valid even when the first entry is later excluded.',
  'Group included entries by date and by cleaned site. Sort daily dates ascending; sort sites by JavaScript string order, independent of locale. Groups have hours, jobCount (distinct jobIds) and entryCount. A job can span days; group job counts need not add to the grand count. Zero-hour included entries still count.',
  'Format all hours as two-decimal strings, e.g. 0.00. Add integer hundredths and format the integer whole part plus two-digit remainder. Grand jobCount counts distinct included jobIds; entryCount counts included entries. A complete order with no included entries does not count as reportable work.',
  'Counts describe occurrences, except conflictGroups counts distinct conflicting IDs. valid = input - rejected and includes duplicates/conflicts. Order input = rejected + duplicates + conflicts + retained. Entry input = rejected + duplicates + conflicts + outOfPeriod + ambiguousOrder + unmatched + incompleteOrder + included. Empty sources are valid; both empty gives empty groups, 0.00 and zero counts.',
];
export const reportingShape = `{
  period: { start, end },
  daily: [{ date, hours, jobCount, entryCount }],
  sites: [{ site, hours, jobCount, entryCount }],
  totalHours, jobCount, entryCount,
  counts: {
    orders: { input, valid, rejected, duplicates, conflicts, conflictGroups, retained },
    entries: { input, valid, rejected, duplicates, conflicts, conflictGroups,
      outOfPeriod, ambiguousOrder, unmatched, incompleteOrder, included }
  },
  audit: {
    orders: [{ record, cleaned, reasons, disposition, duplicateOf }],
    entries: [{ record, cleaned, reasons, disposition, duplicateOf, orderLine }]
  }
}`;
const hints = [
  'Decompose the investigation. Hand-trace one included record, one rejected record and one disputed ID. Sketch helpers for validation, grouping and summaries. Return a partial report and inspect it with Run before assembling everything.',
  'Use map to build new audit items, keeping record unchanged. Check each field independently, collecting reasons in field order. Trim text before checking; test blank hours before converting. Split valid hours at the dot and pad the fraction to two digits.',
  'Build Map groups from valid items only, keyed by jobId for orders and entryId for entries. A Set of IDs alone cannot compare versions. Compare every cleaned field across each whole group before choosing safe first occurrences.',
  'For each surviving entry, compare its valid ISO date with both inclusive bounds. Then look up its exact job ID: disputed order, absent order, incomplete order, or complete order. Keep a single disposition and the applicable order-line link.',
  'Group included entries twice, by site and by date. Sum hundredths with reduce starting at 0. Use a Set of jobIds for each distinct-job count. Sort group keys, not the original arrays. Format the whole hours and integer remainder after summing.',
  'Verify independently: audit lengths equal source lengths; mutually exclusive dispositions sum to input; valid equals input minus rejected. Sum both breakdowns back to the grand total and entry count. Trace duplicate links and every member of a conflict, even outside the reporting period.',
];
const solution = {code:reportingSolution,explanation:[
  'Validate the period first: a reversed range could make every valid entry seem outside the week. Calendar month lengths and Gregorian century rules validate date-only strings without local time or daylight-saving shifts.',
  'map builds audit wrappers around unchanged originals. Cleaning is separate from rejecting unknown information. Every field is checked, so a row with several problems gives Sam all the reasons in one follow-up.',
  'Hours are parsed into integer hundredths before addition. Number("") would invent zero; parseFloat would accept trailing units. Syntax and blank checks protect meaning. Formatting after accumulation avoids 0.1 + 0.2 artefacts without rounding away invalid input.',
  'Map holds arrays per exact key. Compare all cleaned fields, never source lines or object identity. Group the whole valid source before deduplication: a late conflict invalidates an earlier apparent winner. Multiple entry IDs per job remain legitimate work.',
  'The report classifies dates before matching only after conflicts are known. An out-of-period counterpart can still expose an entry-ID conflict. Candidate entries get one disposition; only safe complete jobs contribute to the weekly totals.',
  'The same included entries feed daily, site and grand summaries. Set counts distinct jobs, while reduce sums integer units. Daily job counts can overlap because a job can have entries on multiple days. Sorting keys leaves original array order untouched.',
  'Audit arrays retain every occurrence in its source order. Raw record, cleaned value, reason, disposition and links let another operator independently verify the report. Count vectors explain both sources; a matching total alone cannot establish trust.',
]};
const checks = Object.entries(reportingDatasets).map(([id,d])=>({id,...d}));
function exercise(id, sample, independent=false) {
  return {id,title:independent ? 'Independent handover: next reporting week' : 'Build a trustworthy weekly report',
    goal:'Build the complete weekly pipeline and explain every input occurrence.',outputKind:'weekly-report',keepCheckedCode:true,
    ...sample,checks:independent ? [checks.find(c=>c.id==='transfer'),...checks.filter(c=>c.id!=='transfer')] : checks,
    rules:reportingRules,hints:independent ? [hints[0],hints[3],hints[5]] : hints,solution,
    starterCode:independent ? `function buildWeeklyReport(rawOrders, rawEntries, period) {
  // Use the contract to design your own pipeline for this handover.
}` : `function buildWeeklyReport(rawOrders, rawEntries, period) {
  // Work a stage at a time. Add helpers below or outside this function.
  // cleanOrder(record): preserve raw values, collect validation reasons.
  // cleanEntry(record): validate dates and convert hours to hundredths.
  // classifyGroups(items, key): distinguish copies from conflicts.
  // summarize(included): build site/day groups and verify accounting.
  console.log("Inspect:", rawOrders.length, rawEntries.length, period);
  // Start with one record. Run small experiments before assembling a report.
  return null;
}`};
}
export const firstReportingToolCase = {
  id:'first-reporting-tool',number:5,title:'Your First Reporting Tool',playable:true,
  colleague:{name:'Sam Okafor',role:'Operations Planner'},
  request:'Two exports have arrived for the weekly operations report. The job list tells us where work happened and whether it is complete; field time tells us the hours. There are inconsistent values, copies, disputed versions and missing jobs. Can you build a report I can explain to management, with reliable hours by site and day, and keep the evidence we need to follow up?',
  target:'Create a weekly reporting pipeline whose totals and exclusions can be traced to both original exports.',
  rules:reportingRules,exercises:[exercise('first-reporting-tool',reportingDatasets.caseFile),exercise('first-reporting-tool-transfer',reportingDatasets.transfer,true)]
};
