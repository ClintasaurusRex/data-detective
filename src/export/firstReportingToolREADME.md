# Your weekly reporting tool

This is your exact last successfully checked JavaScript from Data Detective's
Case 5. It runs independently of the app. Main investigation and independent
variation packages have the same filenames, but their own checked code and
displayed week. Keep each package in a separate folder to keep both samples.
Later browser drafts, failed checks and stopped checks do not replace this code.

## Start here

Install **Node.js 24 LTS** (choose version 24.x at nodejs.org). In a terminal,
`node --version` should start with v24. Download all five files into one new folder:

| File | What it contains |
| --- | --- |
| weekly-report.mjs | Your checked buildWeeklyReport function, file reader and integrity checks |
| orders.json | The displayed raw work-order records |
| entries.json | The displayed raw field-time records |
| period.json | The displayed inclusive reporting start and end dates |
| README.md | This guide |

No dependencies, no npm install, no repository and no network are needed to run.
Open a terminal in that folder (an IDE's “Open Folder”, then “New Terminal” works):

```bash
node weekly-report.mjs orders.json entries.json period.json
node weekly-report.mjs orders.json entries.json period.json report.json
node weekly-report.mjs another-orders.json another-entries.json another-period.json weekly-report.json
```

The first three paths tell Node which files to open. Browsers supply sample
arrays automatically; a standalone program needs to know where your data lives.
The runner reads UTF-8 text with Node's built-in file APIs, then JSON.parse turns
that text into arrays and an object. Your function receives those values directly,
without any automatic trimming, business validation or repair of the records.
This tool reads JSON, not CSV. Copy to IDE is a separate current-draft exercise.

The optional fourth path saves formatted JSON. Relative paths start at the
terminal's current folder; the success message gives the full output location.
Quote paths with spaces: `"next week/orders.json"`. Existing regular reports are
replaced only after preparation succeeds; choose a new filename to keep one.

Without an output path, **stdout** (standard output) contains only the JSON report.
**stderr** (standard error) carries your console.log/globalThis.console messages,
diagnostics and save confirmation. Both streams usually appear in the terminal,
but programs can capture them separately. Use the output argument to save safely.
Never use shell redirection such as `> orders.json`: the shell can truncate a file
before this program starts. Require exit status 0 before trusting a new report.
On macOS/Linux, `echo $?` immediately after running shows the status; in PowerShell,
use `$LASTEXITCODE`. A nonzero value means failure. Old output may still be present.

## Compatible input files

orders.json contains an array with exactly these fields per record:

```json
[{"line":2,"jobId":"00110","site":" North Reservoir ","status":" Complete "}]
```

entries.json contains an array with exactly these fields per record:

```json
[{"line":2,"entryId":"E-101","jobId":"00110","date":"2026-11-09","hours":"2.50"}]
```

period.json contains exactly start and end strings:

```json
{"start":"2026-11-09","end":"2026-11-15"}
```

All business fields stay strings, including hours and identifiers with leading
zeros. line is a positive safe integer, unique within its source. This is
source-scoped provenance, not a physical line number in the JSON file. Gaps and
nonnumeric source order are allowed; the same line can occur in both files.
Arrays can be empty. Repeated business IDs are legitimate evidence.

Broken JSON, wrong fields/types or repeated source lines stop before your code
loads: these are structural file errors. Blank business fields, unknown statuses,
bad hours or impossible entry dates still reach your function. Cleaning removes
incidental outer spaces; validation asks whether the cleaned value is meaningful.
Blank hours mean unknown, not zero. Explicit zero counts as valid recorded work.
Only statuses become lowercase; job/entry capitalization and internal site text
remain meaningful. Rejections list every reason in documented field order.

The period controls field-time inclusion, not work-order creation. Its dates must
be strict, untrimmed YYYY-MM-DD strings, real Gregorian dates in years 0001–9999,
with start no later than end. Both boundaries are inclusive: otherwise a crew's
first or last day could disappear. Date-only comparisons avoid local timezones.
Invalid dates or reversed bounds require your function itself to throw
`Error("Invalid reporting period")`, even with empty arrays. The runner invokes
it and verifies this refusal; it never silently fixes dates or supplies a report.

For another week, create three compatible input files, update both period dates,
and use the third command above. Keep the original exports for comparison.

## Investigate and verify the report

Read audit.orders and audit.entries first. They preserve every original occurrence
in source order, plus cleaned values, ordered reasons, disposition and links.
Follow a rejected item back by its source and record.line; ask the source team to
correct the export rather than guessing. Excluded valid items explain copies,
conflicts, dates, missing references and incomplete jobs separately.

entryId identifies one time entry; jobId connects time to a work order. Two entry
IDs for one job may be two real visits. A repeated entry ID with identical cleaned
values is a copy; duplicateOf points to the first source occurrence, even if that
first entry is excluded later. Different versions of an ID hold the WHOLE group
for review, including earlier identical copies. A first/last winner could invent
the truth. Conflicting orders make otherwise eligible entries ambiguous-order.
Conflicts are unresolved work, not evidence that no hours were worked.

Check dates after detecting conflicts across the whole source. Candidate entries
outside the period are out-of-period before matching. Inside it, disputed orders,
missing jobs, incomplete jobs and included work have separate dispositions.
Only included entries on safe complete orders contribute hours; orderLine points
to the first retained order for included/incomplete-order entries only.

Hours accept digits with an optional dot and one or two decimal places, such as
0, 00.00, 07.50 and 2.5. Signs, .5, 5., units, exponents and extra precision are
rejected. Integer hundredths keep addition exact: 10 + 20 is reliable where
binary decimal 0.1 + 0.2 is surprising. Display values are fixed strings like
"0.30". Each accepted amount and the reportable total must fit safe integer
hundredths; the runner refuses totals outside that range rather than rounding.

Verify independently:

1. Compare each audit.record with its original source, preserving every field.
2. Orders input = rejected + duplicates + conflicts + retained.
3. Entries input = rejected + duplicates + conflicts + outOfPeriod +
   ambiguousOrder + unmatched + incompleteOrder + included.
4. valid = input - rejected for each source. It overlaps other counts.
   conflictGroups counts distinct disputed IDs; conflicts counts occurrences.
5. Sum included hundredths by date and by site. Each breakdown's hours and entry
   counts must add to the grand totals. Check exact JavaScript string ordering.
6. Count distinct included job IDs for jobCount; count included entries for
   entryCount. A job can span days, so group-level job counts need not sum to the
   grand job count. Zero-hour groups still count when an entry was included.

The runner checks the exact eight-field report and every nested shape/type,
original, cleaning fact/reason, duplicate link, conflict occurrence, disposition,
order reference, count, group, ordering and total. To verify arbitrary new files,
it recomputes calendar/decimal facts and group evidence, then reconciles claimed
included audit entries. These checks never build a substitute report or repair
your answer. Input mutation and misleading serialization are refused too. The
script contains no hidden fixture data or automatically substituted solution.

## Errors, file protection and limits

Errors explain the failing file or audit path on stderr and exit nonzero with
no successful stdout report. Check missing arguments, commas/quotes, field types,
read permissions, period values and your function's diagnostic. Output errors
may mean a missing folder, folder used as a file, read-only location or full disk.
Correct the cause and rerun. Keep an earlier good report until a new run succeeds.

All THREE inputs are protected from the runner's output argument using resolved
paths and file identity, including symlink and hard-link aliases. Output symlinks
are refused. The complete validated JSON is written to a private sibling staging
folder, synced, closed, checked again and renamed into place. Preparation/write
failures preserve an existing report; handled failures remove staging files.
An abrupt interruption can leave a .data-detective- staging folder; after the
process has ended you can remove it. Report replacement gives it new private
permissions; other hard links to the old report and its metadata are not updated.

This is ordinary local-filesystem staged replacement, not protection against
external concurrent filesystem changes or power loss. Platform/network-filesystem
rename and permission behavior can differ; Windows/network filesystems have not
been verified here. The parent directory is not synced for power-loss durability.
Keep backups. Shell redirection is outside the runner's protection.

**Only execute trusted code.** Node has normal filesystem permissions. This is
not a sandbox: your function can access files, network and process APIs, and has
no browser timeout or memory cap. Intentional writes from learner code are outside
the runner's protections, as are direct process.stdout writes. Whole files and
reports are held in memory. Begin with small fictional files, inspect your own
function, and stop a stuck process with Ctrl+C. Do not run strangers' scripts.
