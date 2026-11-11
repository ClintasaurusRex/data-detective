# The Two Exports: your Node reconciliation tool

This program runs your last successfully checked reconcile(orders, fieldReports)
solution on TWO local JSON files. It reports agreements, missing counterparts,
differences and whole ambiguous groups. It never cleans invalid evidence.

Only run code you trust. Node runs with your normal filesystem permissions,
outside the browser sandbox: it can read local files through node:fs, while the
browser exercise cannot. There is no sandbox timeout or memory cap. The program
reads whole files into memory; start with small inputs. Validation catches
mistakes; it is not a secure sandbox for untrusted code.

## Set up once

For Node.js 24 LTS, open https://nodejs.org/en/download, select the 24.x LTS version and the installer
for your operating system, and complete installation. Reopen your terminal and verify:

    node --version

Expect v24.x.x (or a newer supported version). Put all FOUR downloads together
in a new folder: reconcile.mjs, orders.json, field-reports.json, README.md.
Keep the exact names; remove browser-added (1) suffixes. Open a terminal there.
No npm install is required: the script uses only Node's built-in modules.
No Data Detective repository, network access or extra dependency is needed.

## Print or save

    node reconcile.mjs orders.json field-reports.json
    node reconcile.mjs orders.json field-reports.json report.json
    node reconcile.mjs another-orders.json another-fields.json weekly-report.json

The first two command-line arguments name the scheduling and field files,
in that order. The optional third names the output. Paths are relative to your
terminal's current folder. Quote paths with spaces, for example "weekly orders.json".
Without an output argument, stdout (standard output) contains formatted JSON only.
With one, open that report file after success. Console messages, diagnostics,
errors and save confirmations go to stderr (standard error). Both streams may
appear in your terminal, but logs do not become part of JSON stdout.

Existing output reports are replaced after a valid report is fully prepared.
Choose a new output name to retain an earlier report. BOTH input files are
protected, including resolved aliases, symlinks and hard links to them.
Output symlinks, including dangling links, are refused: choose a regular file.
Never redirect stdout onto an input using >: your shell can erase that file
before Node starts, outside the program's protection. Use the output argument.

## Prepare two sources without changing evidence

orders.json represents scheduling work orders (planned work).
field-reports.json represents field operations (observed work).
Each file contains a JSON array with exactly these five fields per record:

    [
      { "line": 2, "id": "0071", "site": "North reservoir", "status": "complete", "hours": 2 }
    ]

line is source-scoped provenance, not a physical JSON line or a matching key.
Keep unique positive safe integers increasing in each file; gaps are fine.
The same line number may occur in both files. Formatting JSON does not renumber
provenance. id must be a nonblank already-trimmed string. "0071" and "71" are
different jobs, as are "Job-A" and "job-a". Match exact strings, never numbers.
site is a nonblank string; its spaces and capitalization remain evidence.
status must already be open, complete or on hold. hours must be a finite
nonnegative numeric multiple of 0.25, including zero. Quarter units must fit
JavaScript's safe integer range; no rounding or numeric conversion is performed.
Duplicate job IDs, even exact copies, are legitimate evidence. Duplicate source
lines within one file are invalid. Empty arrays, including BOTH empty, are valid.
An initial UTF-8 byte-order mark is accepted as file metadata. Values are not
silently normalized, trimmed or repaired. Both files are validated before your
code loads. Malformed JSON, wrong shapes or invalid values stop the whole run.

## Read and investigate the report

- agreed: unique matching IDs whose site, status and hours strictly agree.
  Each pair preserves order (scheduling) and fieldReport (field) originals.
- onlyOrders: scheduling originals with no field counterpart. Ask whether the
  field export is missing work or scheduling includes work not performed yet.
- onlyFieldReports: field originals with no scheduling counterpart. Ask whether
  unplanned work or a missing scheduling entry explains the difference.
- differences: unique matching IDs with unequal business values. fields lists
  every differing name once in site, status, hours order. Compare both originals:
  planned versus actual hours can differ legitimately; neither source wins by default.
- ambiguous: if either source repeats an ID, ALL occurrences from BOTH sources
  belong in one { id, orders, fieldReports } group, including identical copies
  or an empty counterpart array. Never select the first or last winner or multiply
  pairs. Ask the source teams which relationship and evidence are authoritative.
- summary: orders and fieldReports count input occurrences; agreed, onlyOrders,
  onlyFieldReports, differences and ambiguous count category entries. ambiguous
  counts groups, not the records inside them.

Every occurrence must appear exactly once, unchanged, with the correct source.
Follow IDs first seen in scheduling, then field-only IDs; each category follows
that union order. Each ambiguous group's arrays keep their own source order.
Copies with identical content are valid; object reference identity is irrelevant.

Verify the sample: 7 orders, 6 field reports, 2 agreements, 1 order-only,
1 field-only, 2 differences and 1 ambiguous group (0075: 2 orders, 1 field).
Reconcile source totals separately:

    orders:       2 agreed + 2 differences + 1 onlyOrders       + 2 ambiguous = 7
    fieldReports: 2 agreed + 2 differences + 1 onlyFieldReports + 1 ambiguous = 6

Trace every original as well as these counts. Ask about missing counterparts
0072 and 0077, differences for 0073 and 0074, and repeated scheduling ID 0075.
Preserve the evidence and record the reviewed decision in the source process
before preparing corrected exports. Matching summary counts alone prove little.
The runner validates shapes, original values, source roles, exact pair IDs,
classification, difference names/order, whole groups, ordering, every occurrence,
summary and input mutation, before and after serialization. It refuses an invalid
report; it never runs a reference solution or supplies a repaired answer.

## Recognise failures and protect files

Success exits with code 0. Error: and a nonzero exit mean failure; inspect the
last status using echo $? in bash/zsh or $LASTEXITCODE in PowerShell.
Errors explain missing arguments/files, JSON/data problems, learner exceptions,
invalid reports, permission failures and output-path/write problems. No successful
JSON is printed on these failures. An old report is still OLD after a failed run.

Output is staged in a private temporary directory beside the destination, synced,
then renamed into place. No existing report is truncated. Preparation, validation,
execution or pre-rename write failures leave it unchanged; temporary files are
cleaned on handled errors. Abrupt termination may leave a .data-detective- folder
which you can remove after the process stops. Rename is atomic on ordinary local
filesystems, but this is not a power-loss backup guarantee or protection from
other programs changing paths concurrently. Filesystem/platform behavior can
vary (including rename permission failures on Windows or network drives).
Keep backups of important data. Only trust a saved report after exit 0 and the
Wrote confirmation. Output replacement creates a new file with private permissions;
it does not preserve old report metadata or update other hard links to that report.

reconcile.mjs contains your checked code exactly, even after later draft edits or
failed/cancelled checks. The sample files contain only the displayed fictional
week. No hidden test fixtures or automatic reference solution are included.
Copy to IDE's challenge.js uses the CURRENT DRAFT and displayed sample arrays;
it remains a separate exercise without a file reader. Paste edits back into
Data Detective and check them before exporting another trusted version.
