# Case 3: The Doubled Totals

Status: **feature-complete, including the standalone Node JSON-file workflow;
ready for owner QA, approval pending**. Owner review is queued for November
14–15, 2026. The contract was defined before checker implementation. Case 3
does not imply owner approval of Case 2; its manual QA remains deferred to
November 14–15, 2026.

## The request

Sam Okafor, Operations Planner at Riverbend Water Services, combined several
crew exports into one weekly staging file. Its hours total rose after a second
import, even though no extra work was reported. Some jobs were copied unchanged;
others have competing versions. Sam needs a reliable subtotal and an audit trail
to take back to the crews, rather than a script that quietly chooses a version.

Case 3 is independently playable. Its input is already parsed, cleaned and valid;
Case 2 completion and CSV parsing are not prerequisites.

## Input

`transform(rows)` receives an array of original records with exactly:

```js
{ line: 2, id: "00110", status: "complete", hours: 2, notes: "Meter swap" }
```

- `line` is the unique positive integer physical line in the source combined
  staging file, carried in the cleaned record as provenance. It is not a physical
  line number in the JSON input. Rows are in source order, with increasing lines;
  gaps are allowed. This identifies an occurrence, not a job, and is excluded
  from business equality.
- `id` is a nonblank, already-trimmed string. It is the explicit unique job key.
  Compare it exactly: `"0007"`, `"7"`, `"Job-A"`, and `"job-a"` are distinct IDs.
  Never convert IDs to numbers, trim them again, or change their capitalization.
- `status` is already `open`, `complete` or `on hold`.
- `hours` is a finite, nonnegative number in quarter-hour increments (including
  zero). All supplied totals are small. Integers, halves and quarters are exactly
  representable in JavaScript, so use exact numeric equality, with no tolerance
  or rounding. Do not convert hours to text. Detailed rounding belongs to Case 5.
- `notes` is a string. Spaces, capitalization, punctuation and embedded line
  breaks all matter; notes must remain unchanged.
- Do not mutate the array or any original record. Equal copied objects are
  accepted in the output: worker results are compared by content, not identity.

## Decisions and output

Return exactly four fields:

```js
{
  kept: [/* safe original records, one per ID */],
  duplicates: [
    { record: /* later identical original */, keptLine: 2 }
  ],
  conflicts: [
    { id: "00111", records: [/* ALL original occurrences of this ID */] }
  ],
  totalHours: 3.5
}
```

1. Group by the exact string `id`, even when occurrences are far apart.
2. Two occurrences contain identical job information only when `id`, `status`,
   numeric `hours`, and `notes` are all strictly equal. Ignore `line` for this
   comparison; preserve it in the returned original.
3. If all records in a group agree, put the first occurrence in `kept`. Put every
   later occurrence in `duplicates`, as `{ record, keptLine }`; `keptLine` is the
   numeric line of that group's retained first occurrence.
4. If ANY business field disagrees, put the ENTIRE group in `conflicts`, as
   `{ id, records }`. This includes repeated identical versions in the group.
   None of its records belongs in `kept` or `duplicates`. Never select a winner.
5. Every input occurrence appears exactly once: in `kept`, as a duplicate's
   `record`, or inside one conflict's `records`. A `keptLine` reference is a link,
   not another occurrence. No lost, invented, changed or multiply counted rows.
6. `kept` and `duplicates` each preserve input order. Conflict groups are ordered
   by their first occurrence; their `records` preserve input order. Object key
   order does not matter. All output records retain exactly the five input fields.
7. `totalHours` is the sum of `hours` in `kept` only, starting at numeric zero.
   Every status contributes when the job is safely kept; do not filter by status.
   Duplicate occurrences add nothing. Conflicting hours are excluded pending
   human review, not resolved or reclassified as zero hours of work.
8. Empty input returns `{ kept: [], duplicates: [], conflicts: [], totalHours: 0 }`.

## Case file and reconciliation

| Line | ID | Status | Hours | Notes |
| --- | --- | --- | --- | --- |
| 2 | 00110 | complete | 2 | Meter swap |
| 3 | 00111 | complete | 3 | Valve repair |
| 4 | 00110 | complete | 2 | Meter swap |
| 5 | 00112 | on hold | 1.5 | Access visit |
| 6 | 00111 | complete | 4 | Valve repair |
| 7 | 00112 | on hold | 1.5 | Access visit |
| 8 | 00113 | open | 0 | Awaiting parts |
| 9 | 00111 | complete | 3 | Valve repair |

Raw total: **17** hours. Retain lines **2, 5, 8**: reliable subtotal **3.5** hours.
Duplicates: line **4 → 2**, **7 → 5**, representing 3.5 excluded hours.
Conflict `00111`: lines **3, 6, 9**, representing 10 unverified hours in the raw
import. This is not a claim that 10 hours of work happened or that none happened.
Sam must ask which version is correct. Accounting: 3 kept + 2 duplicates + 3
conflict occurrences = 8 input records; 3.5 + 3.5 + 10 = 17 raw hours.

## Expected datasets and checking

Fixtures store independent, handwritten expected line lists, duplicate links,
conflict IDs/line lists and totals. These describe the above output without
embedding a reference transformation in the production checker. The checker
resolves originals from the input and checks content, structure, classification,
coverage, links, order, totals and mutation. Group classification must be correct
even when a conflict is only discovered at the end of the file.

The mission offers four progressive hints and a confirmed explained solution.
Map groups versions by exact ID; Set can track seen keys but does not establish
record equality on its own. Learners practice strict primitive comparison,
arrays, every/some, first occurrences, safe ordering and reduce with a numeric
initial value. The incomplete starter logs evidence but classifies nothing.

Run displays the learner's real values and audit lists. Prediction feedback does
not disclose the expected subtotal or treat matching counts as proof. Check
solution verifies all datasets before saving the exact passing code. Editing a
draft or failing a later check preserves the earlier passing solution. Drafts,
quarter-hour predictions, hints, reveal attribution and checks survive refresh
under the existing storage version. Case 3's checked code appears on its mission
page and in the Toolbox's JSON-file tool. Copy to IDE reproduces the sample and
current draft, without hidden datasets, a reference answer or a file reader.

## The 17 checking datasets

| Dataset | Purpose | Kept lines | Duplicate links | Conflict ID: lines | Reliable hours |
| --- | --- | --- | --- | --- | --- |
| The case file | A repeat import and competing valve-repair hours. Follow all three versions of 00111 before deciding. | 2, 5, 8 | 4 → 2; 7 → 5 | 00111: 3, 6, 9 | 3.5 |
| No repeated jobs | All statuses count when safely kept; zero is a real value. | 2, 4, 7 | none | none | 6.75 |
| One exact duplicate | Different file lines do not make different job information. | 2, 4 | 3 → 2 | none | 3.25 |
| Three copies of one job | Both later copies must link to the first, not to each other. | 3 | 5 → 3; 9 → 3 | none | 2.5 |
| Competing hours | A repeated ID with different hours is entirely unresolved. | 4 | none | H-1: 2, 3 | 0.25 |
| Status and notes disagree | Same hours alone do not prove equality. Compare every business field. | none | none | S-1: 2, 4; N-1: 3, 5 | 0 |
| A late conflicting version | Two identical copies become part of a conflict when a later version disagrees. | 4 | none | L-6: 2, 3, 8 | 1 |
| Several groups interleaved | Order groups by their first occurrence, not alphabetically or by when disagreement is discovered. | 4, 8 | 6 → 4 | Z: 2, 7; A: 3, 5 | 4.5 |
| Text keys and leading zeros | 0007 and 7 differ, as do Job-A and job-a. No numeric conversion or case folding. | 2, 3, 4, 5 | 6 → 2 | none | 10 |
| Same jobs, different order | First occurrences and duplicate links change with file order, even when the safe subtotal stays the same. | 3, 4, 5 | 7 → 3; 8 → 5 | 00111: 2, 6, 9 | 3.5 |
| Copies far apart | Compare with the whole ID group, not just the previous row. Duplicate list order follows occurrence order. | 2, 3, 4, 5 | 6 → 3; 10 → 2 | none | 6 |
| An empty week | Empty input is valid, and its total is numeric zero. | none | none | none | 0 |
| Every job copied | Retain one original for each identical group, not zero originals or every copy. | 2, 3 | 4 → 2; 5 → 3 | none | 2.25 |
| Nothing reliable yet | Every occurrence requires review, including identical versions inside a conflict. | none | none | C-1: 2, 4, 6; C-2: 3, 5 | 0 |
| Next week's jobs | Different IDs, lines, counts and total expose answers typed in by hand. | 11, 15 | 16 → 11 | NEW-92: 20, 21 | 6.25 |
| Notes are exact evidence | Do not trim or lower-case notes; multiline notes still compare as text. | 6 | 8 → 6 | SPACE: 2, 3; CASE: 4, 5 | 0.5 |
| IDs are data, not object properties | Map supports arbitrary string keys, including names inherited by plain objects. | 2, 3, 5 | 4 → 2 | none | 3 |

Expected output records are the unchanged originals at these lines. The line-based expected answers are fixture data, not computed by a production reference solver. Unit tests verify them against an independent per-occurrence algorithm as well as the lesson solution.

## Standalone Node JSON workflow

Only passing **Check solution** on all 17 datasets creates a Toolbox entry.
Run, a failed check or a cancelled check cannot create one. The entry uses
`solved.code`, never the current editor draft or the latest failed check.
Editing during a check retains the exact code being checked and marks a changed
draft stale. Refresh preserves that same last passing version.

Download all three files into a fresh folder:

| File | Purpose |
| --- | --- |
| `deduplicate.mjs` | Exact checked code, file runner, input and report guards |
| `jobs-cleaned.json` | The displayed fictional case-file records |
| `README.md` | Node setup, commands, input contract, conflict investigation, reconciliation and errors |

With Node 24 installed, open a terminal in that folder:

```bash
node deduplicate.mjs jobs-cleaned.json
node deduplicate.mjs jobs-cleaned.json report.json
node deduplicate.mjs another-week.json another-report.json
```

No npm install, external dependencies or source repository is required. The
first path supplies a JSON array with exactly the five cleaned fields. The
optional second path saves the four-field JSON report instead of printing it.
Quote paths containing spaces. Console messages, diagnostics and save confirmations
use stderr; stdout contains JSON alone. Errors exit with code 1; success uses 0.

The runner validates the whole input before loading learner code. It rejects
wrong fields/types, blank or untrimmed IDs, unknown statuses, invalid hours and
nonpositive, repeated or out-of-order provenance. Lines must be safe integers;
individual and combined quarter-hour units must fit JavaScript's safe integer
range. These guards keep the established small, exact-number contract honest
on external files. A leading UTF-8 byte-order mark is accepted as file metadata;
original field content is never cleaned or renumbered.

The result must have exactly `{ kept, duplicates, conflicts, totalHours }`.
Guards check originals, classification, every occurrence exactly once, links,
ordering, complete unresolved groups and the sum before and after JSON
serialization. They reject a misleading report rather than supplying a corrected
answer. Input mutation, code and serialization failures stop without touching an
existing output or creating a new one. The input is protected by resolved path
and open-file identity, including symlinks and hard links. An output write failure
can leave an incomplete report; require a successful exit and save confirmation.

Investigate every conflicting ID with the crews using the preserved versions and
source lines. Resolve the authoritative information in the source process before
preparing another input. Never silently retain the first or last disputed version.
The reliable total intentionally excludes unresolved jobs, without claiming zero
work occurred. Verify sample lines, links and all records, then sum kept hours:
3 kept + 2 copies + 3 conflicting originals = 8 records, with 3.5 reliable hours.
The downloaded README reconciles the 17 raw hours and explains the 10 unverified
hours attached to conflict `00111`.

Only execute trusted learner code: Node has normal filesystem permissions and
no browser sandbox, timeout or memory limit. The whole file is read into memory.
The script includes only the learner's checked code, validation/file helpers and
instructions; it contains no hidden checking datasets or automatic reference
solution. All 17 complete reports are compared between actual production
browser-worker replies and downloaded Node executions, with both correct
algorithms. Negative tests cover input, report, file, collision, console,
serialization and persistence failures. Owner approval remains separate.
