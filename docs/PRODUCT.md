# Data Detective: product scope

This file records the product brief so work can continue in a new session without the original conversation. The project name is **Data Detective**.

## Who it's for

The learner knows the basics of Python, knows more JavaScript, and strongly prefers JavaScript. They want the confidence to recognise a repetitive workplace task, break it into steps, write a script, and check that its result is correct. Reporting involving VTScada is one possible future application, not a required integration.

The app teaches through meaningful coding, useful feedback and gradually increasing independence. It uses plain language, explains new terms where they appear, and treats mistakes as part of investigating a case.

## Concept

The learner is a data detective investigating small reporting mysteries using fictional workplace records. All cases are set at one fictional workplace, **Riverbend Water Services**, and build on the same recognisable data model (jobs with string IDs and statuses, extended in later cases).

The main loop:

1. Read a short request from a fictional colleague.
2. Inspect the input and predict what the output should contain.
3. Edit real JavaScript.
4. Run the code and inspect its actual output.
5. Check the result against the case requirements and extra dataset variations.
6. Request hints or an explained solution as needed.
7. Export the working script and try a related variation.

The fun comes from investigation, immediate visible results, collecting useful tools (the Toolbox), and solving increasingly independent tasks. Presentation is restrained and adult. Hints are optional and carry no penalty. Practice is untimed. A solved case is celebrated briefly, and reduced-motion preferences are honoured. Using the explained solution is recorded honestly, not as independent mastery.

## Constraints

- Static React + Vite app, plain JavaScript, npm with a committed lockfile. Node.js LTS for development and exported scripts.
- No login, backend, analytics, payments, runtime AI service or API key. The app must keep working without Claude or any paid model.
- Fictional bundled data only. No real workplace uploads or external integrations yet.
- Learner code runs in an isolated sandbox (see [ARCHITECTURE.md](ARCHITECTURE.md)).
- Browser exercises transform data only; file reading is taught through the exported Node script.

## Milestones

| # | Case | Status |
| --- | --- | --- |
| 1 | The Missing Jobs | **Done** (see [STATUS.md](STATUS.md)) |
| 2 | The Messy Export | Feature-complete through Slice 4; ready for owner QA, approval pending |
| 3 | The Doubled Totals | Planned |
| 4 | The Two Exports | Planned |
| 5 | Your First Reporting Tool | Planned |

### Milestone 1: The Missing Jobs (done)

Filtering with `filter`, `trim` and `toLowerCase`, with a prediction step, three hints, an explained solution, checks against seven datasets, a Node script export, and an "open jobs" variation. Details: [cases/01-missing-jobs.md](cases/01-missing-jobs.md).

### Milestone 2: The Messy Export (feature-complete; owner QA pending)

The contract and datasets are in [cases/02-messy-export.md](cases/02-messy-export.md).

The browser mission teaches CSV parsing and data validation through an export with spaces, blank fields and inconsistent values. Learners inspect both original CSV and parsed string records, predict accepted/rejected counts, write `transform(rows)`, and check it on 13 datasets. Four progressive hints and an explained solution remain optional. Malformed-file examples are separate from business-record rejection. Case 2 Copy to IDE runs the displayed parsed records. Separately, the Toolbox downloads the last passing code with a complete CSV-file runner, maintained parser/contract, pinned npm dependency, mission sample and beginner instructions. The learner installs the dependency once, then prints JSON or saves a report from a real CSV independently of the app. Node runs with normal filesystem permissions; the instructions explain trust, new concepts, error recognition and report verification. Browser and generated Node output agree on all 13 datasets. Owner QA and approval of Slices 3 and 4 are still pending.

- Use a maintained CSV parser rather than splitting lines on commas.
- Parser checks must include quoted commas, newlines inside quoted fields, and a byte-order mark.
- Introduce numeric conversion without turning blank input into an accidental zero.
- Keep identifiers as strings.
- Report rejected rows with reasons.
- Add a Node CSV runner alongside the browser's parsed-record exercise.

### Milestone 3: The Doubled Totals (backlog)

Teach duplicate detection using a declared unique key.

- Distinguish exact duplicates from conflicting records that share an ID.
- Make the treatment of conflicts explicit; never silently keep an arbitrary row.
- Keep an inspectable record of removed or flagged rows.

### Milestone 4: The Two Exports (backlog)

Teach matching two datasets by a string key.

- Explain unmatched records, duplicate lookup keys and one-to-many matches with small examples.
- The mission states the expected relationship before the learner codes it.

### Milestone 5: Your First Reporting Tool (backlog)

Combine cleaning, validation, deduplication, matching, filtering and grouping into a reusable report.

- Define the date format, reporting period, boundary inclusion and rounding rules explicitly.
- Show reconciled counts: input, accepted, rejected and output.
- Finish with a standalone Node script, example files, a verification checklist, and an independent variation with optional hints.

### Later (not scheduled)

Real VTScada connections, spreadsheets, SQL, APIs, Python equivalents, more themes and scheduling can follow once the core is useful.

## Planning notes

- Prefer a smaller complete learning experience over partly implemented cases.
- Do not merge, deploy, create accounts, provision paid services or add unrequested integrations without the owner's go-ahead.
- The owner tracks cloud credit between milestones; sessions should not estimate spend.
