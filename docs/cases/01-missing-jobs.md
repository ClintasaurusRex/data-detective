# Case 1: The Missing Jobs

Source: [src/missions/missingJobs.js](../../src/missions/missingJobs.js) and [missingJobs.fixtures.js](../../src/missions/missingJobs.fixtures.js).

## The request

> "The weekly report says only one job is complete. I can see three completed jobs in the export. Find out why the report is missing them."
>
> Marisol Reyes, Operations Coordinator

## Contract

- Each row has a unique string `id` and a string `status`. (Case 2 introduces missing and invalid values.)
- A job is complete when its status is `complete` after removing surrounding whitespace and ignoring capital letters.
- Return the matching **original** records, in their **original order**.
- Don't change the input rows.

Starter code (returns 1 record on the case file):

```js
function transform(rows) {
  return rows.filter(row => row.status === "complete");
}
```

Ignoring capitals alone returns 2 records. Ignoring capitals and surrounding whitespace returns the expected 3: J-101, J-102 and J-104.

## How checking works

**Check solution** runs the learner's actual code in the sandbox, once per dataset, each time in a fresh worker. For each dataset the checker compares the returned records with an explicit list of expected IDs. It does not compare code text with a reference solution, so any approach that meets the contract passes (`filter`, a loop, `reduce`, a regular expression, `toUpperCase`, copies with identical content, and so on).

For each dataset it reports, in plain language:

- a run problem (syntax error with line, thrown error with line, timeout, missing `transform`)
- a result that isn't an array (for example, a missing `return`)
- items that aren't job records (for example, returning only IDs)
- IDs that aren't in the dataset (a typed-in or hardcoded answer)
- records whose content was changed
- input rows that were changed
- duplicates, missing records, unexpected records, and wrong order

If the case file passes but other datasets fail, it adds a note that the code may depend on particular IDs or positions. A run alone never marks the case solved; only a check where every dataset passes does. The checked code is stored with the solve, so editing it afterwards shows that the draft needs checking again.

## Datasets: completed jobs

| Dataset | Purpose | Expected IDs |
| --- | --- | --- |
| The case file | The four rows from the request | J-101, J-102, J-104 |
| Different job numbers | New IDs; catches hardcoded sample IDs | J-2051, J-2053, J-2055 |
| Same jobs, new order | Results must follow input order; catches picking rows by position | J-104, J-101, J-102 |
| More open jobs | Extra open/on-hold jobs and `"Incomplete"`, which catches `includes("complete")` | J-312, J-316 |
| Mixed capitals | `COMPLETE`, `cOmPlEtE`, `Complete` | J-420, J-421, J-422 |
| Extra whitespace | Leading/trailing spaces, a tab and a line break | J-530, J-531, J-532, J-534 |
| No completed jobs | The correct answer is an empty array | (none) |

## Variation: the open jobs

After solving, the learner tries the same pattern with less guidance: return jobs whose cleaned-up status is `open`. It starts from an empty function, has one hint and an explained solution, and is checked against the same datasets plus "No open jobs".

| Dataset | Expected IDs |
| --- | --- |
| The case file | J-103 |
| Different job numbers | J-2052, J-2054 |
| Same jobs, new order | J-103 |
| More open jobs | J-310, J-311, J-315 |
| Mixed capitals | J-423 |
| Extra whitespace | J-533 |
| No completed jobs | J-640, J-642 |
| No open jobs | (none) |

`tests/unit/evaluate.test.js` confirms that every expected list follows the case rules.

## Export

The Toolbox entry offers `solve.mjs` (or `solve-open-jobs.mjs`) with the learner's checked function, plus `sample.json`. Usage:

```bash
node solve.mjs sample.json
```

```bash
node solve.mjs sample.json result.json
```

The learner's code runs inside its own function, so helper names can't clash with the wrapper's, and its `console` messages go to standard error: standard output (and `result.json`) is always valid JSON. The wrapper reads the file, skips a byte-order mark if present, and gives clear errors for a missing argument, a missing file, a folder, invalid JSON and a non-array. The app explains that the browser exercise can't open files, which is why the Node wrapper exists.

## Working in an IDE

Both the main exercise and the variation have **Copy to IDE**. It copies `challenge.js`, which contains that exercise's request, goal and rules, the four case-file rows, the current draft, and a preview call. Learners save it, run `node challenge.js`, and paste the YOUR SOLUTION section back into the app to check it. The variation's copy asks for open jobs. Neither copy includes solutions, hints or the extra check datasets.
