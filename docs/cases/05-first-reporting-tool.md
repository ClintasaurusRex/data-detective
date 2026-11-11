# Case 5 — Your First Reporting Tool

Slice 1: browser capstone and independent variation; owner approval pending.
Slice 2's production Node file workflow is deliberately deferred. This contract
was defined before the checker. Cases 2–4 remain unapproved.

## Investigation and learning

Sam Okafor needs a trustworthy weekly operations report at fictional Riverbend
Water Services. Work orders identify sites and statuses; field entries record
hours. Neither export can safely be summed as received. Trace originals through
Inspect → Clean → Validate → Deduplicate → Match → Filter → Group → Verify.
The implementation validates the reporting period first and classifies valid,
deduplicated entries by date before matching: this makes out-of-period records
one explicit category regardless of missing jobs. Matching is needed only for
the remaining candidates. The lesson teaches why that precedence matters.

Combine earlier skills rather than reimplement CSV parsing. Practice map/filter,
Map/Set, reduce, exact keys, grouping, integer accumulation, inclusive calendar
comparison and independent accounting. Try helpers on one record, log a disputed
group, and hand-trace an exclusion before attempting the whole report. A correct
total with missing audit evidence is an incorrect report.

## Input

Write `buildWeeklyReport(rawOrders, rawEntries, period)`.

```js
rawOrders = [{ line: 2, jobId: "00110", site: " North Reservoir ", status: " Complete " }];
rawEntries = [{ line: 2, entryId: "E-101", jobId: "00110", date: "2026-11-09", hours: "2.50" }];
period = { start: "2026-11-09", end: "2026-11-15" };
```

These are already parsed arrays with exactly these fields; values other than
line are strings. Each source has unique positive safe-integer lines, in source
array order (gaps and nonnumerically ordered lines are allowed). Line is carried
provenance scoped to its source, never a matching key or physical JSON line.
Preserve arrays and every original field without mutation. Equal copies pass.
The existing sandbox receives `[rawOrders, rawEntries, period]` through a scoped
transform adapter; learners write only buildWeeklyReport and their helpers.

Period has exactly start/end, strict untrimmed ISO dates, years 0001–9999,
start <= end. Throw `Error("Invalid reporting period")` for invalid period dates
or reversed bounds, even with empty sources. No partial report. Check actual
Gregorian month lengths, century leap rules and leap days. Date strings in
records are trimmed before validation. Date-only semantics use no timezone,
clock time, DST or browser-local interpretation. Valid ISO dates compare
lexicographically. Inclusive start/end avoids silently losing either edge day.
Orders have no date: the period selects entries, not order creation/completion.

## Cleaning and validation

Trim IDs, sites, statuses, entry dates and hours. Keep identifier capitalization
and leading zeros. Internal whitespace and site capitalization remain meaningful.
Lowercase only statuses; approved values are open, complete, on hold.

Collect all reasons once per field, in this order:

| Source | Field | Reasons |
| --- | --- | --- |
| orders | jobId | missing-job-id if blank |
| orders | site | missing-site if blank |
| orders | status | missing-status if blank, else invalid-status unless approved |
| entries | entryId | missing-entry-id if blank |
| entries | jobId | missing-job-id if blank |
| entries | date | missing-date if blank, else invalid-date unless actual ISO date |
| entries | hours | missing-hours if blank, else invalid-hours unless syntax/range valid |

Hours syntax is `^\d+(\.\d{1,2})?$` after trimming: digits, optional dot and one
or two digits. Accept 0, 00.00, 07.50, 2.5; reject negatives, signs, .5, 5.,
exponents, hex, units, commas, Infinity, NaN and >2 decimal places. Blank is
unknown, never zero. Split whole/fraction text and pad the fraction to two
digits; converted hundredths must be a nonnegative safe integer. Inputs in this
browser exercise guarantee the sum of accepted hundredths is also safe. No
rounding or currency abstraction. Format totals with an integer whole part and
a two-digit remainder (e.g. 0.00, 2.50), always strings.

Cleaned valid order: exactly `{ jobId, site, status }`.
Cleaned valid entry: exactly `{ entryId, jobId, date, hundredths }`.
Rejected records use cleaned: null and all ordered reasons; preserve the raw
record. Rejections never participate in deduplication, even with a valid ID.

## Precedence and dispositions

1. Validate period, then clean/validate every record independently.
2. Group valid orders by jobId and valid entries by entryId. Multiple different
   entry IDs for the same job are legitimate separate work. Compare all cleaned
   business fields, excluding source line/raw text. If any version differs,
   every valid occurrence of that ID is conflict, including identical versions
   within that group. Preserve all; never choose a first/last winner.
3. When every version agrees, first occurrence is retained (orders) or a candidate
   (entries); later occurrences are duplicate with duplicateOf = first line.
   Preserve that first provenance even if its entry is later excluded.
4. For each candidate entry, first test period. Outside inclusive bounds:
   out-of-period. Otherwise look up safe orders by exact cleaned jobId.
   A valid order conflict for that ID: ambiguous-order. No safe order (including
   only rejected orders): unmatched. Safe order open/on hold: incomplete-order.
   Safe complete order: included. Do not fabricate missing work orders.
5. Group only included entries by cleaned site and by date. Distinct reportable
   jobs means unique included jobIds, not every complete order in the source.
   A zero-hour included entry still counts as an entry and a reportable job.

Order dispositions: rejected, conflict, duplicate, retained.
Entry dispositions: rejected, conflict, duplicate, out-of-period,
ambiguous-order, unmatched, incomplete-order, included. These categories are
mutually exclusive occurrence counts. Valid means all non-rejected occurrences,
including conflicts/duplicates/exclusions; it is an overlapping validation count.
Conflict groups count distinct conflicting valid IDs; conflicts counts occurrences.
Conflicts are unresolved evidence, not proof that zero work occurred.

## Exact output

Return exactly eight fields (object key order irrelevant):

```js
{
  period: { start, end },
  daily: [{ date: "2026-11-09", hours: "2.50", jobCount: 1, entryCount: 1 }],
  sites: [{ site: "North Reservoir", hours: "2.50", jobCount: 1, entryCount: 1 }],
  totalHours: "2.50", jobCount: 1, entryCount: 1,
  counts: {
    orders: { input: 1, valid: 1, rejected: 0, duplicates: 0,
      conflicts: 0, conflictGroups: 0, retained: 1 },
    entries: { input: 1, valid: 1, rejected: 0, duplicates: 0,
      conflicts: 0, conflictGroups: 0, outOfPeriod: 0,
      ambiguousOrder: 0, unmatched: 0, incompleteOrder: 0, included: 1 }
  },
  audit: {
    orders: [{ record: rawOrders[0], cleaned: { jobId: "00110",
      site: "North Reservoir", status: "complete" }, reasons: [],
      disposition: "retained", duplicateOf: null }],
    entries: [{ record: rawEntries[0], cleaned: { entryId: "E-101",
      jobId: "00110", date: "2026-11-09", hundredths: 250 }, reasons: [],
      disposition: "included", duplicateOf: null, orderLine: 2 }]
  }
}
```

Each audit list has exactly one item per original in input order, with exactly
the keys shown. duplicateOf is numeric first-occurrence line only for duplicate,
otherwise null. Entry orderLine is the retained order's numeric line only for
included/incomplete-order, otherwise null. It is a reference, not another order
occurrence. reasons contains only validation codes; non-rejected items use [].
Dispositions explain other exclusions. Every raw record stays whole and unchanged.
Cleaned objects and all structures have no extra fields. Counts are nonnegative
integers; hours are fixed two-decimal strings. Daily sorts ascending by ISO date;
sites sorts ascending by JavaScript string comparison (< / >, UTF-16), independent
of locale. No absent/zero-activity groups, except included zero-hour groups.
Counts of distinct jobs within groups need not add to grand jobCount (a job can
span days). Site/day hours and entry counts each add to the grand values.

Audit reconciliation:
- orders.input = rejected + duplicates + conflicts + retained.
- entries.input = rejected + duplicates + conflicts + outOfPeriod +
  ambiguousOrder + unmatched + incompleteOrder + included.
- valid = input - rejected, separately for each source.
- entryCount = entries.included; jobCount = distinct included jobIds.
- Original audit lengths equal source lengths; every original is present once.
Both empty arrays give empty groups/audits, 0.00 and all zero counts.
Empty entries do not erase orders; empty orders leave eligible entries unmatched.

## Checking, progression and independent transfer

Immutable fixtures carry handwritten cleaned values, dispositions, links, reasons,
group rows, totals and count vectors. A materializer only attaches original
records and names to those explicitly recorded values; it does not solve the
pipeline. Unit tests compare them with two independently structured algorithms.
The behavioural checker compares every field/type, array order, original, cleaned
value, rejection, link, group and count. No variable-name or source-text checks.
Feedback identifies paths/source lines/categories without printing hidden reports.
Fresh workers, timeout, Stop, error recovery and mutation detection are reused.

Run displays only actual learner output; matching prediction counts never prove
correctness. Hints stage decomposition, cleaning/validation, whole-group decisions,
matching/date precedence, integer totals and reconciliation. Full solution stays
behind the existing confirmation and records reveal attribution. Main scaffold
suggests helper boundaries without providing the processing algorithm.

The independent variation is a later week with different sites, order statuses,
missing references, cross-boundary conflicts and reporting dates. It starts with
only the function signature and optional hints. It uses the same contract and
checker, but a different dataset-first order and stable exercise ID
first-reporting-tool-transfer. Its draft, hints, reveal and exact last passing
code remain separate from first-reporting-tool. Both can be played independently.
Copy to IDE contains only the active sample, period, current draft and contract;
no file reader, hidden expected reports or automatic solution. Toolbox retains
checked browser code only. Production Node downloads await Slice 2 permission.

## Dataset inventory and explicit accounting

32 immutable scenarios: 28 complete-report expectations and four expected period errors.
These counts and totals are recorded independently of either solution.

| Dataset | Original orders / entries | Reliable hours | Jobs / entries |
| --- | --- | --- | --- |
| The weekly investigation | 8 / 15 | 4.00 | 2 / 5 |
| Clean export | 1 / 1 | 1.00 | 1 / 1 |
| Whitespace and status normalization | 1 / 1 | 7.50 | 1 / 1 |
| Leading zeros and case-sensitive identifiers | 4 / 4 | 10.00 | 4 / 4 |
| Blank and malformed hours | 1 / 14 | 0.00 | 0 / 0 |
| Explicit zero is valid | 1 / 1 | 0.00 | 1 / 1 |
| Integer decimal accumulation and multiple entries | 1 / 3 | 1.37 | 1 / 3 |
| Exact entry copies retain first provenance | 1 / 3 | 1.00 | 1 / 1 |
| Late entry conflict includes earlier identical copies | 1 / 3 | 0.00 | 0 / 0 |
| Exact cleaned order copies | 2 / 1 | 1.00 | 1 / 1 |
| Work-order status conflict holds all versions | 3 / 1 | 0.00 | 0 / 0 |
| Missing job references | 1 / 1 | 0.00 | 0 / 0 |
| Open and on-hold work stays visible | 2 / 2 | 0.00 | 0 / 0 |
| Inclusive boundaries and immediately outside | 1 / 4 | 3.00 | 1 / 2 |
| Leap-day and impossible calendar dates | 1 / 10 | 1.00 | 1 / 1 |
| Empty work-order input | 0 / 1 | 0.00 | 0 / 0 |
| Empty field-time input | 1 / 0 | 0.00 | 0 / 0 |
| Both exports empty | 0 / 0 | 0.00 | 0 / 0 |
| Site and day grouping differs from job counts | 3 / 4 | 10.00 | 3 / 4 |
| Reordered originals with stable summary sorting | 2 / 2 | 3.00 | 2 / 2 |
| Different period including century leap day | 1 / 1 | 2.01 | 1 / 1 |
| Independent handover: a future week | 4 / 8 | 4.00 | 1 / 2 |
| Reject before grouping and preserve all reasons | 3 / 3 | 1.00 | 1 / 1 |
| Conflict detection before period filtering | 1 / 2 | 0.00 | 0 / 0 |
| Rejected work orders do not create matches | 1 / 1 | 0.00 | 0 / 0 |
| Arbitrary text keys and exact site text | 1 / 1 | 1.00 | 1 / 1 |
| Same entry ID with different job references | 2 / 2 | 0.00 | 0 / 0 |
| Duplicates link to an excluded first occurrence | 1 / 2 | 0.00 | 0 / 0 |
| reversedPeriod | 0 / 0 | period error | no report |
| invalidPeriod | 0 / 0 | period error | no report |
| spacedPeriod | 0 / 0 | period error | no report |
| blankPeriod | 0 / 0 | period error | no report |

For the main investigation, orders reconcile as 1 rejected + 1 duplicate + 2
conflict occurrences + 4 retained = 8. Entries reconcile as 1 rejected + 1
duplicate + 2 conflicts + 2 out-of-period + 1 ambiguous-order + 1 unmatched + 2
incomplete-order + 5 included = 15. Reportable hours are 4.00 across two jobs.
Zero-hour entry ZERO remains included; it contributes to counts and audit
evidence. The future handover has the same 4.00 total but different jobs,
dates, groups and audit decisions, so a copied total cannot pass.

The adapter additionally snapshots inputs for thrown-error paths because the
shared worker reports mutation only after a successful learner return. A learner
that changes an invalid period before throwing cannot pass the period checks.
The sandbox itself, its CSP and its messaging/lifecycle remain unchanged.
