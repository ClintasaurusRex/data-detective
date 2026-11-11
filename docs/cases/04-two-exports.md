# Case 4: The Two Exports

Status: feature-complete, including standalone Node reconciliation; owner QA and
approval pending, queued November 14–15, 2026 if practical.
This contract was written before the checker.

## The request and learning scope

Sam Okafor has scheduling and field-operations exports for the same week at
Riverbend Water Services. Some jobs agree, some appear in only one system, and
some share an ID but disagree. Return an auditable reconciliation before Sam
trusts the weekly report. Play independently of Cases 1–3, with already-parsed,
validated data. No CSV parsing, cleaning, file uploads or SQL is required.

Practice two arrays, exact string keys, Map lookups and grouping, value equality,
missing records, meaningful differences, provenance, duplicate ambiguity and
exactly-once accounting. Introduce inner, left and full outer joins through the
records the learner classifies. A nested-loop solution is correct too; Map avoids
repeated full-array searches as inputs grow.

## Input contract

```js
function reconcile(orders, fieldReports) {
  // return your report
}
// Both arrays contain records with exactly these fields:
{ line: 2, id: "0071", site: "North reservoir", status: "complete", hours: 2 }
```

- Orders describe scheduled work; field reports describe observed work. `site`
  is the planned/reported location, `status` the scheduling/observed state, and
  `hours` the planned/actual effort. Compare corresponding values, but a difference
  is a question for Sam, not proof either source is invalid. Equal planned and
  actual hours alone do not establish agreement.
- Each source is in file order. `line` is a unique positive integer within that
  source, increasing with gaps allowed. The same line can occur in both sources.
  It is carried source provenance, never a match key or a physical JSON line.
- `id` is a nonblank already-trimmed string. Match with exact string equality:
  `"0071"` differs from `"71"`; `"Job-A"` differs from `"job-a"`. Never convert,
  trim, case-fold or otherwise normalize IDs.
- `site` is a nonblank string; spaces and capitalization are meaningful evidence.
  `status` is already `open`, `complete` or `on hold`. `hours` is a small finite
  nonnegative numeric multiple of 0.25, including zero. Compare values exactly;
  no rounding, tolerance, conversion or cleaning is required.
- Duplicate IDs are allowed as evidence of an ambiguous relationship, including
  exact repeated copies. They do not invalidate the whole source.
- Preserve both arrays and every record without mutation. Returned copies with
  identical fields/values are valid; object reference identity is irrelevant.
- The unchanged sandbox receives `[orders, fieldReports]`. A shared adapter
  isolates learner code in its own scope and calls `reconcile(orders, fieldReports)` through
  the existing `transform(rows)` entry point. Learners write only `reconcile`.
  Both sources travel together, so existing deep mutation detection covers both.

## Output contract and decisions

Return exactly these six fields:

```js
{
  agreed: [{ order: /* original */, fieldReport: /* original */ }],
  onlyOrders: [/* scheduling originals with no field report */],
  onlyFieldReports: [/* field originals with no scheduling record */],
  differences: [{ order: /* original */, fieldReport: /* original */,
                  fields: [/* differing names in site, status, hours order */] }],
  ambiguous: [{ id: /* exact string */, orders: [/* all originals */],
                fieldReports: [/* all originals */] }],
  summary: { orders: 0, fieldReports: 0, agreed: 0, onlyOrders: 0,
             onlyFieldReports: 0, differences: 0, ambiguous: 0 }
}
```

1. Group both sources by exact ID before making decisions. If either source has
   more than one occurrence, put ALL occurrences from BOTH sources for that ID
   into one `ambiguous` group. Even identical copies are ambiguous. This rule
   takes priority over missingness or differences. Empty opposite arrays are
   valid. Never arbitrarily select the first/last version or multiply matches.
2. Otherwise, one occurrence on each side forms one pair. Compare `site`,
   `status`, `hours` using strict primitive equality, excluding `line`. All three
   equal: `agreed`. Any different: `differences`, with exactly those field names
   once each, in `site`, `status`, `hours` order. Preserve both whole originals.
3. An unambiguous occurrence with no counterpart goes into `onlyOrders` (missing
   field record) or `onlyFieldReports` (missing scheduling record).
4. Every input occurrence appears exactly once across the five category lists,
   including originals inside pairs and ambiguous groups. Do not fabricate,
   change, omit or double-count records. Context identifies the source; line
   alone cannot identify an occurrence across both files.
5. Define a union key order: IDs first seen in orders, followed by IDs seen only
   in fieldReports, in their first-seen order. Each category follows this order;
   each ambiguous group's source arrays preserve their own source order. Never
   sort input. Output object property order is irrelevant; unexpected fields
   anywhere are invalid. All original records keep exactly their five fields.
6. Summary `orders` and `fieldReports` are original occurrence counts. The other
   five numbers count category entries (ambiguous counts groups, not records).
   Counts are nonnegative integers. Trace ambiguous array lengths to reconcile:
   orders = agreed + differences + onlyOrders + ambiguous order occurrences;
   fieldReports = agreed + differences + onlyFieldReports + ambiguous field
   occurrences. Matching totals alone do not prove correct classification.
7. Both empty arrays return five empty lists and all seven summary counts zero.

## Joins in this investigation

A unique ID in both exports is an inner join pair; it can still have differences.
A left join keeps all scheduling jobs and attaches a counterpart when available,
so unmatched field-only jobs would be lost. This report is a full outer
reconciliation: it keeps evidence from both sides, including missing counterparts.
A duplicate key creates a possible one-to-many or many-to-many relationship.
Our task expects one-to-one jobs, so those whole groups await human review rather
than producing a Cartesian multiplication of pairs.

## Dataset inventory and independent expectations

`src/missions/twoExports.fixtures.js` contains recursively frozen fixtures with
handwritten line-based expectations. Pair tuples identify an order line and a
field line; differences also list explicit field names. Ambiguity lists each
source's lines. These expectations are not generated by the lesson algorithm.
Unit tests review them with an independent per-key filter/search algorithm and
verify complete original accounting, classification, field names and counts.

| Dataset | Purpose |
| --- | --- |
| The case file | Realistic mixed weekly investigation: two agreements, one missing on each side, two differences, one ambiguous ID |
| Perfect agreement | All statuses, zero hours, different source lines |
| Scheduling only | Every scheduling occurrence remains visible |
| Field only | Every field occurrence remains visible |
| Overlap with gaps | Each source is missing a different job; neither contains the union |
| Different details | A matched pair requires follow-up |
| Reordered exports | Matching and output must not depend on array positions |
| Leading zeros | Numeric-looking keys remain distinct strings |
| Case-sensitive keys | Capitalization changes identity |
| Empty scheduling export | Empty first input is valid |
| Empty field export | Empty second input is valid |
| Empty week | Both empty: all-zero summary |
| Unrelated exports | No pairs, all originals accounted for |
| Several differences | Isolate each business field and combine all three |
| Repeated scheduling keys | Preserve exact duplicate orders and single counterpart |
| Repeated field keys | Preserve every field version and single counterpart |
| Repeats in both exports | Many-to-many ambiguity and one-sided repeated keys |
| Far-apart counterparts | Search the complete second array; late duplicate affects early pair |
| A future week | New keys, lines, cardinalities and classifications defeat sample hardcoding |
| Exact text and special keys | Space/case-sensitive site values; safe arbitrary Map keys |

## Checking and learning experience

Run shows actual learner output, never a repaired report. Check executes each
fixture in a fresh sandbox worker, compares exact shapes, originals, source/line,
roles, pairs, difference names, ambiguity, ordering, exactly-once accounting,
summary and mutation against the independent expectations. Feedback identifies a
source, job and category without dumping the complete hidden answer. Only a full
pass saves the exact checked code. No keyword tests or preferred algorithm tests.

Investigation tables show both sources and original lines. Predict agreement
count or skip; matching a prediction is not proof. Hints progress from tracing a
job to lookup groups and classification. A confirmed explained solution teaches
Map, primitive equality, joins and audit accounting. Drafts, hints, prediction,
reveal attribution, checks and last passing code reuse version-1 storage. Later
edits, errors, failed checks, cancellation and refresh preserve the passing code.

Copy to IDE produces the current draft, both displayed arrays and a direct
`reconcile` preview, runnable as `node challenge.js`. No hidden fixtures or
automatic reference solution are included. The Toolbox retains checked browser
code and offers the four-file Node reconciliation package below. Case 5 is unstarted.

## Explicit expected source-line decisions

Pairs show scheduling line ↔ field line; a line is scoped to its source.
These are transcribed from the handwritten expectations, not the reference solution.

| Dataset | Agreements | Scheduling only | Field only | Differences | Ambiguity |
| --- | --- | --- | --- | --- | --- |
| The case file | 2 ↔ 3; 7 ↔ 8 | 3 | 4 | 4 ↔ 5: hours; 5 ↔ 2: status | 0075: orders [6,9], field [7] |
| Perfect agreement | 2 ↔ 3; 4 ↔ 6; 7 ↔ 9 | none | none | none | none |
| Scheduling only | none | 2, 5 | none | none | none |
| Field only | none | none | 2, 7 | none | none |
| Overlap with gaps | 2 ↔ 8; 6 ↔ 2 | 3 | 4 | none | none |
| Different details | none | none | none | 2 ↔ 5: hours | none |
| Reordered exports | 2 ↔ 4; 5 ↔ 10; 8 ↔ 3 | none | none | none | none |
| Leading zeros | 2 ↔ 4; 3 ↔ 2 | none | none | none | none |
| Case-sensitive keys | 2 ↔ 6; 4 ↔ 2 | none | none | none | none |
| Empty scheduling export | none | none | 11 | none | none |
| Empty field export | none | 12 | none | none | none |
| Empty week | none | none | none | none | none |
| Unrelated exports | none | 2, 3 | 2, 3 | none | none |
| Several differences | none | none | none | 2 ↔ 5: site; 3 ↔ 4: status; 4 ↔ 3: hours; 5 ↔ 2: site, status, hours | none |
| Repeated scheduling keys | none | none | none | none | R-S: orders [2,6], field [3] |
| Repeated field keys | none | none | none | none | R-F: orders [5], field [2,8] |
| Repeats in both exports | none | none | none | none | Z: orders [2,5], field [4,6]; A: orders [3,8], field []; Y: orders [], field [2,9] |
| Far-apart counterparts | 3 ↔ 14; 4 ↔ 13; 5 ↔ 12; 6 ↔ 11; 7 ↔ 10; 8 ↔ 9; 9 ↔ 8; 10 ↔ 7; 11 ↔ 6; 12 ↔ 5; 13 ↔ 4; 14 ↔ 3; 19 ↔ 2 | none | none | none | FAR: orders [2,20], field [25] |
| A future week | 23 ↔ 12 | 11, 28 | 38 | 16 ↔ 25: site, hours | DEC-99: orders [], field [19,31] |
| Exact text and special keys | 5 ↔ 11; 9 ↔ 2 | none | none | 2 ↔ 6: site; 3 ↔ 4: site | none |

For the case file, summary is `{ orders: 7, fieldReports: 6, agreed: 2, onlyOrders: 1, onlyFieldReports: 1, differences: 2, ambiguous: 1 }`. Accounting: scheduling 2 + 2 + 1 + 2 = 7; field 2 + 2 + 1 + 1 = 6. Ask the source teams about 0072, 0077, planned/actual differences for 0073 and 0074, and the repeated scheduling key 0075.


## Standalone Node reconciliation

Pass Check solution on all 20 datasets, then download all four files to one folder:

| File | Purpose |
| --- | --- |
| `reconcile.mjs` | Exact last passing reconcile code, file runner and integrity guards |
| `orders.json` | Displayed fictional scheduling records |
| `field-reports.json` | Displayed fictional field-operation records |
| `README.md` | Node 24 setup, commands, concepts, investigation, safety and errors |

```bash
node reconcile.mjs orders.json field-reports.json
node reconcile.mjs orders.json field-reports.json report.json
node reconcile.mjs another-orders.json another-fields.json weekly-report.json
```

No npm install, repository or dependencies are required. The two mandatory paths
supply already-valid JSON arrays. Optional third path saves a report; otherwise
stdout contains formatted JSON alone. Console and operational/error messages use
stderr. Invalid arguments, reads/data, execution/results or writes exit nonzero.
The checked solution is loaded after both inputs validate, in a separate strict
scope, and called directly with both arrays. No browser adapter is required.

Input validation enforces the exact record fields/types and existing contract,
without cleaning. Source lines are increasing positive safe integers, unique
within each file, independently of the other source. Quarter-hour units must
fit JavaScript's safe integer range. IDs remain exact strings; duplicate job
IDs, including exact copies, are accepted as evidence. Both empty arrays are
valid. Optional initial UTF-8 BOM is file metadata, not a change to record text.

Report validation checks originals, source roles, exact matching keys, category
eligibility, duplicate-key precedence, all differing fields/order, whole groups,
category/group order, full source coverage, seven counts and input preservation.
It works from arbitrary valid inputs rather than hidden expectations. Checks run
before and after serialization. Invalid results are rejected, never repaired or
replaced with a reference solver. Later draft changes, failed/cancelled checks,
navigation and refresh preserve the earlier passing export.

Both inputs are protected by resolved paths and dev/ino identity, including
symlink/hard-link aliases. Output symlinks are rejected. Existing output remains
untouched until a fully prepared sibling report is synced, closed and renamed.
Handled preparation/write errors preserve old output and clean staging files;
forced termination may leave a temporary directory. No guarantee covers shell
redirection onto inputs, malicious code, concurrent external path manipulation,
network-filesystem behavior or power-loss durability. Require successful exit.
Node has normal filesystem permissions, no sandbox timeout/memory cap and reads
whole files: run trusted code only and start with small exports.

The downloaded guide independently traces the sample's 7 scheduling and 6 field
occurrences, explains missingness/differences/ambiguity and follow-up with source
teams, and teaches stdout/stderr, arguments and failures. Full actual-download
Node/browser-worker parity passes all 20 datasets with both correct algorithms
in Chromium and focused WebKit. See ENGINEERING-REVIEW.md for final test counts,
current cross-mission evidence and owner/device QA limitations.
