# Owner QA — November 14–15, 2026

Cases 2–5 are feature-complete and technically ready for owner-led QA after the
Slice 3 audit. They are **not owner-approved**. Case 1's existing approval stands;
the audit corrected additional edge cases without changing its business rules.
Prioritize Cases 2–4, then Case 5 as practical. No new milestone is planned.

## Prepare once

- [ ] Close every previously opened Data Detective tab, including old builds.
  Start this reviewed build in one tab. Older loaded versions do not participate
  in the new ownership lock. Keep copies of any important existing code first.
- [ ] Use localhost or HTTPS and Node 24. Check `node --version`; `.nvmrc`
  requests **24.22.1**, while this audit ran **24.18.0**, npm **11.16.0**.
  Exercise the pinned version on your computer before final acceptance.
- [ ] Use your normal laptop and phone browser. Record browser/version/device
  and any assistive technology used. Automated checks are not screen-reader or
  native Safari/iOS certification.

## Shared experience — use while learning each case

- [ ] Work from the starter before revealing the solution. Record where the
  request, terminology or next coding step becomes unclear and whether the
  difficulty increase feels manageable. Hints are optional and free.
- [ ] Try a useful hint, cancel solution confirmation once, then review the
  explained solution if needed. Confirm the app records that it was revealed.
  Assess whether explanations help you explain the rule in your own words.
- [ ] Run an incomplete attempt and inspect the actual incorrect output. Try a
  syntax/runtime error, then recover; use Check and Stop. Decide whether feedback
  identifies a helpful next debugging step without giving away the whole answer.
- [ ] Navigate with the keyboard: skip link, case links, prediction, editor,
  Ctrl/Command+Enter, Check/Stop, hints, disclosures and downloads. Check visible
  focus and sensible return focus after solution/copy controls. Try your usual
  zoom/text size and screen reader if available; note announcements and friction.
- [ ] On laptop and phone, scroll the source/output tables and long audit lists.
  Check that headings, provenance, controls and warnings remain understandable.
  Decide whether the long Case 5 contract and mobile navigation are comfortable.
- [ ] Edit code after passing, fail or stop a later check, navigate and refresh.
  The draft should survive and the Toolbox should retain the last passing code.
- [ ] Open a second tab: it should explain that another tab owns progress and
  offer Retry, with no editor. Close the owning tab, then Retry; the latest saved
  progress and checked code should load. A browser without exclusive access must
  clearly say it is working in memory. Copy unsaved work before leaving.
- [ ] Use Copy to IDE, save `challenge.js`, run it, edit the solution section and
  paste it back for checking. This uses the current draft and displayed samples.
- [ ] Download the complete checked Node package into a **fresh separate folder**
  with exact filenames. Run its print and save commands; inspect the JSON itself
  and require exit status 0. These programs execute trusted code with normal
  Node permissions, not the browser sandbox. Keep real workplace data out of QA.
- [ ] Try a missing file, malformed file and an output path pointing to an input.
  Check actionable errors, nonzero exit and preserved input/earlier report.
  An old report after failure is still old. Cases 1–3 can leave incomplete output
  on a mid-write failure; Cases 4–5 stage before replacement. Do not redirect
  stdout onto an input file.

## Case 2 — The Messy Export

- [ ] Explain file-structure failure versus rejected business records. Inspect
  the multiline note, physical file lines, leading-zero IDs, explicit zero,
  blank hours and all reasons on a record with several problems.
- [ ] Reconcile the sample's four accepted and four rejected records. Use the
  six-file package, run `npm install`, then print/save reports and try another
  small CSV. Invalid quotes must stop the whole file. Understand why long digit
  strings can overflow even when they match the hours syntax.
- [ ] **Final acceptance: pending.** Owner decision/date/notes: __________

## Case 3 — The Doubled Totals

- [ ] Trace all eight originals: three kept, two linked copies and all three
  versions of conflicting job `00111`; independently add the **3.5** reliable
  hours. Explain why excluding unresolved jobs does not mean zero work happened.
- [ ] Run the three-file package without npm install; inspect another cleaned
  file with a late conflict, exact notes and text IDs. Follow a duplicate's link
  to its first occurrence rather than choosing a conflicting winner.
- [ ] **Final acceptance: pending.** Owner decision/date/notes: __________

## Case 4 — The Two Exports

- [ ] Account for all seven scheduling and six field records. Explain agreeing
  pairs, each missing counterpart, planned/actual differences and the whole
  duplicate-key ambiguity. A source line is scoped to its source.
- [ ] Run the four-file package without npm install. Try a different pair of
  small files and inspect the full reconciliation, not only its seven counts.
- [ ] **Final acceptance: pending.** Owner decision/date/notes: __________

## Case 5 — Your First Reporting Tool

- [ ] Review main and independent variation separately. Try the variation with
  less scaffolding; explain why its same total does not imply the same report.
- [ ] Trace the main sample's eight orders and fifteen field occurrences,
  **4.00** hours, two reportable jobs and five included entries. Explain every
  rejection/exclusion/link, zero-hour inclusion and cross-period conflict.
- [ ] Check inclusive dates, ordered reasons, exact hundredths and daily/site
  groups. Distinct job counts across days need not add to the grand job count.
- [ ] Keep each five-file package in its own folder. Run print/save/new-week
  commands without npm install; inspect both audit arrays. Try an invalid or
  reversed period and confirm no successful partial report is produced.
- [ ] Confirm main/variation drafts, hints, reveal attribution and checked tools
  remain independent through refresh and navigation.
- [ ] **Final acceptance: pending.** Owner decision/date/notes: __________

Record defects and acceptance decisions separately from automated evidence in
[ENGINEERING-REVIEW.md](ENGINEERING-REVIEW.md). No acceptance box is pre-checked.
