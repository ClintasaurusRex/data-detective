import { useEffect, useId, useRef, useState } from "react";
import { describeResultType, describeRunProblem, runChecks } from "../checking/evaluate.js";
import { runMessyExportChecks } from "../checking/evaluateMessyExport.js";
import { MessyExportOutput } from "./MessyExportOutput.jsx";
import { DoubledTotalsOutput } from "./DoubledTotalsOutput.jsx";
import { runDoubledTotalsChecks } from "../checking/evaluateDoubledTotals.js";
import { runTwoExportsChecks } from "../checking/evaluateTwoExports.js";
import { reconciliationCode } from "../missions/twoExports.adapter.js";
import { TwoExportsOutput, SourceExports } from "./TwoExportsOutput.jsx";
import { DEFAULT_TIMEOUT_MS } from "../runner/sandboxRunner.js";
import { CodeBlock, RecordTable, RichText } from "./common.jsx";
import { CopyToIde } from "./CopyToIde.jsx";
import { HintsPanel } from "./HintsPanel.jsx";

const TIMEOUT_SECONDS = DEFAULT_TIMEOUT_MS / 1000;

function countText(n) {
  return `${n} record${n === 1 ? "" : "s"}`;
}

// The editor, Run and Check actions, output, console and check results for
// one exercise. Shared by the main case and its variation. `challenge`
// describes the exercise for the "Copy to IDE" file.
export function Workbench({ exercise, state, update, runner, beforeRun, describeRun, challenge }) {
  const isMessy = exercise.outputKind === "accepted-rejected";
  const isDoubled = exercise.outputKind === "deduplication";
  const isTwo = exercise.outputKind === "reconciliation";
  const isStructured = isMessy || isDoubled || isTwo;
  const editorId = useId();
  const helpId = useId();
  const wrapId = useId();
  // Display-only preferences: they never change the code or saved progress.
  const [expanded, setExpanded] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const draft = state.draft ?? exercise.starterCode;
  const [busy, setBusy] = useState(null); // { kind: "run" } | { kind: "check", done, total }
  const [run, setRun] = useState(null); // { code, result }
  const [check, setCheck] = useState(null); // runChecks outcome
  const [announcement, setAnnouncement] = useState("");
  const [restoreNote, setRestoreNote] = useState("");
  const [completed, setCompleted] = useState({ runs: 0, checks: 0 }); // also used by browser tests
  const opRef = useRef(0);
  // Leaving a mission cancels the worker and prevents late results saving a solve.
  useEffect(() => () => { opRef.current++; runner.cancel(); }, [runner]);

  const setDraft = (code) => update((s) => ({ ...s, draft: code === exercise.starterCode ? null : code }));

  async function handleRun() {
    if (beforeRun && !beforeRun()) return;
    const op = ++opRef.current;
    const code = draft;
    setBusy({ kind: "run" });
    setAnnouncement("Running your code…");
    const result = await runner.run(isTwo ? reconciliationCode(code) : code, exercise.rows);
    if (op !== opRef.current) return; // a newer run or check has started
    setBusy(null);
    setRun({ code, result });
    setCompleted((c) => ({ ...c, runs: c.runs + 1 }));
    const problem = describeRunProblem(result, { timeoutSeconds: TIMEOUT_SECONDS });
    if (problem) setAnnouncement(`Run finished with a problem. ${problem.message}`);
    else if (isTwo) setAnnouncement("Run finished. Inspect agreements, missing records, differences, ambiguity and summary below.");
    else if (isMessy) setAnnouncement("Run finished. Inspect accepted and rejected records below.");
    else if (isDoubled) setAnnouncement("Run finished. Inspect kept records, duplicates, conflicts and the total below.");
    else if (result.resultType === "array") setAnnouncement(`Run finished. Output: ${countText(result.output.length)}.`);
    else setAnnouncement("Run finished, but the result isn't an array.");
  }

  async function handleCheck() {
    if (isStructured && beforeRun && !beforeRun()) return;
    const op = ++opRef.current;
    const code = draft;
    setBusy({ kind: "check", done: 0, total: exercise.checks.length });
    setAnnouncement("Checking your code against every dataset…");
    const checkCode = isTwo ? runTwoExportsChecks : isDoubled ? runDoubledTotalsChecks : isMessy ? runMessyExportChecks : runChecks;
    const outcome = await checkCode((c, rows) => runner.run(c, rows), exercise, code, {
      timeoutSeconds: TIMEOUT_SECONDS,
      onProgress: (done, total) => {
        if (op === opRef.current) setBusy({ kind: "check", done, total });
      },
    });
    if (op !== opRef.current) return;
    setBusy(null);
    setCheck(outcome);
    setCompleted((c) => ({ ...c, checks: c.checks + 1 }));
    if (outcome.status === "cancelled") {
      setAnnouncement("Check stopped.");
      return;
    }
    if (isStructured) update((s) => ({ ...s, checked: { code, passed: outcome.passed } }));
    const passedCount = outcome.results.filter((r) => r.passed).length;
    if (outcome.passed) {
      update((s) => ({
        ...s,
        solved: {
          code,
          solvedAt: new Date().toISOString(),
          hintsUsed: s.hintsShown,
          solutionRevealed: s.solutionRevealed,
        },
      }));
      setAnnouncement(`All ${exercise.checks.length} checks passed. Solved!`);
    } else {
      setAnnouncement(`${passedCount} of ${exercise.checks.length} checks passed. See the check results for details.`);
    }
  }

  function handleStop() {
    runner.cancel();
  }

  function handleRestoreStarter() {
    update((s) => ({ ...s, previousDraft: draft, draft: null }));
    setRestoreNote("Starter code restored. Your previous draft is kept: use “Bring back my draft” to return to it.");
  }

  function handleBringBack() {
    update((s) => ({ ...s, draft: s.previousDraft, previousDraft: draft === exercise.starterCode ? null : draft }));
    setRestoreNote("Your previous draft is back in the editor.");
  }

  function handleUseSolution() {
    update((s) => ({
      ...s,
      previousDraft: draft === exercise.starterCode || draft === exercise.solution.code ? s.previousDraft : draft,
      draft: exercise.solution.code,
    }));
    setRestoreNote("The solution is in the editor. Your previous draft is kept: use “Bring back my draft” to return to it.");
  }

  function onEditorKeyDown(event) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (!busy) handleRun();
    }
  }

  const solvedCode = state.solved?.code;
  const checkIsStale = check && check.status === "done" && check.code !== draft;
  const solvedIsStale = solvedCode !== undefined && solvedCode !== draft;
  const runIsStale = run && run.code !== draft;
  const isStarter = draft === exercise.starterCode;

  return (
    <div className="workbench" data-testid={`workbench-${exercise.id}`} data-runs={completed.runs} data-checks={completed.checks}>
      <div className={`workbench-grid${expanded ? " expanded" : ""}`} data-testid={`workbench-grid-${exercise.id}`} data-expanded={expanded}>
        <div className="editor-column">
          <label className="editor-label" htmlFor={editorId}>
            Your <code>{isTwo ? "reconcile" : "transform"}</code> function
          </label>
          <p id={helpId} className="help">
            {isTwo ? <> <code>reconcile(orders, fieldReports)</code> receives both source arrays and returns the six-field reconciliation report. </> : <><code>transform</code> receives <code>rows</code>, an array (list) of job records, and returns {isDoubled ? <code>{"{ kept, duplicates, conflicts, totalHours }"}</code> : isMessy ? <code>{"{ accepted, rejected }"}</code> : "a new array"}.</>}
            Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> (<kbd>⌘</kbd>+<kbd>Enter</kbd> on a Mac) to run.
          </p>
          <div className="editor-toolbar">
            <button type="button" className="small-button" onClick={() => setExpanded((e) => !e)} aria-controls={editorId}>
              {expanded ? "Restore editor size" : "Expand editor"}
            </button>
            <label className="toggle" htmlFor={wrapId}>
              <input id={wrapId} type="checkbox" checked={wrapLines} onChange={(e) => setWrapLines(e.target.checked)} />
              Wrap long lines
            </label>
            {challenge && <CopyToIde challenge={challenge} code={draft} />}
          </div>
          <textarea
            id={editorId}
            className={`code-editor${wrapLines ? " wrap" : ""}`}
            wrap={wrapLines ? "soft" : "off"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onEditorKeyDown}
            aria-describedby={helpId}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            rows={expanded ? Math.max(draft.split("\n").length + 4, 24) : Math.min(Math.max(draft.split("\n").length + 1, 7), 20)}
            data-testid={`editor-${exercise.id}`}
          />
          <div className="actions">
            <button type="button" className="primary" onClick={handleRun} disabled={!!busy}>
              Run
            </button>
            <button type="button" onClick={handleCheck} disabled={!!busy}>
              Check solution
            </button>
            {busy && (
              <button type="button" className="danger" onClick={handleStop}>
                Stop
              </button>
            )}
          </div>
          <div className="actions secondary-actions">
            {!isStarter && (
              <button type="button" className="link-button" onClick={handleRestoreStarter} disabled={!!busy}>
                Restore starter code
              </button>
            )}
            {state.previousDraft !== null && (
              <button type="button" className="link-button" onClick={handleBringBack} disabled={!!busy}>
                Bring back my draft
              </button>
            )}
          </div>
          {restoreNote && <p className="note">{restoreNote}</p>}
          {solvedIsStale && (
            <p className="notice warning" role="status">
              You&rsquo;ve changed the code since it passed the checks. {isStructured ? "Check it again to verify this draft. Your last passing code is kept below." : "Check it again to update your Toolbox. Until then, the Toolbox keeps the last version that passed."}
            </p>
          )}
        </div>

        <div className="results-column">
          <p className="status-line" role="status" aria-live="polite">
            {busy?.kind === "run" && "Running…"}
            {busy?.kind === "check" && `Checking… ${busy.done} of ${busy.total} datasets done`}
            {!busy && announcement}
          </p>
          <OutputPanel run={run} stale={runIsStale} describeRun={describeRun} isMessy={isMessy} isDoubled={isDoubled} isTwo={isTwo} rawTotal={isDoubled ? exercise.rows.reduce((sum, row) => sum + row.hours, 0) : undefined} />
          {!check && state.checked && <p className="note" role="status">Last saved check: {state.checked.passed ? "all datasets passed" : "some datasets failed"}.{state.checked.code !== draft && " The draft has changed; check again."} Run Check solution for full feedback.</p>}
          {check && <CheckPanel check={check} stale={checkIsStale} checks={exercise.checks} />}
        </div>
      </div>

      <HintsPanel exercise={exercise} state={state} update={update} onUseSolution={handleUseSolution} />
    </div>
  );
}

function OutputPanel({ run, stale, describeRun, isMessy, isDoubled, isTwo, rawTotal }) {
  if (!run) {
    return (
      <section className="panel output-panel" aria-label="Output">
        <h4>Output</h4>
        <p className="muted">Run your code to see what it returns.</p>
      </section>
    );
  }
  const { result } = run;
  const problem = describeRunProblem(result, { timeoutSeconds: TIMEOUT_SECONDS });
  const typeProblem = !problem && !isTwo && !isMessy && !isDoubled ? describeResultType(result.resultType) : null;
  const isRecords = !isTwo && !isMessy && !isDoubled && !problem && !typeProblem && Array.isArray(result.output);
  const extra = isRecords && describeRun ? describeRun(result) : null;

  return (
    <section className="panel output-panel" aria-label="Output">
      <h4>
        Output{isRecords && <span className="count"> · {countText(result.output.length)}</span>}
      </h4>
      {stale && <p className="note">This output is from an earlier version of your code.</p>}
      {problem && (
        <p className="feedback error" data-testid="run-error">
          <RichText text={problem.message} />
        </p>
      )}
      {typeProblem && (
        <p className="feedback error" data-testid="run-error">
          <RichText text={typeProblem} />
        </p>
      )}
      {isTwo && !problem && <TwoExportsOutput result={result} describeRun={describeRun} />}
      {isMessy && !problem && <MessyExportOutput result={result} describeRun={describeRun} />}
      {isDoubled && !problem && <DoubledTotalsOutput result={result} describeRun={describeRun} rawTotal={rawTotal} />}
      {isRecords && extra && <p className="feedback info">{extra}</p>}
      {isRecords && result.mutated && (
        <p className="feedback warning">
          <RichText text="Your code changed the input rows. Compare a cleaned-up copy of a value instead of assigning to `row.status`." />
        </p>
      )}
      {isRecords && result.output.length > 0 && (
        <RecordTable rows={result.output.slice(0, 200)} caption="Records returned by your code" />
      )}
      {isRecords && result.output.length === 0 && <p className="muted">An empty array: no records.</p>}
      {result.hasOutput && (
        <details className="json-details">
          <summary>Show as JSON</summary>
          <CodeBlock code={JSON.stringify(result.output, null, 2)} label="Output as JSON" />
        </details>
      )}
      <ConsolePanel logs={result.logs} dropped={result.droppedLogs} />
    </section>
  );
}

function ConsolePanel({ logs, dropped }) {
  return (
    <div className="console" aria-label="Console">
      <h5>Console</h5>
      {logs.length === 0 && !dropped ? (
        <p className="muted small">
          Nothing logged. Use <code>console.log(value)</code> to see values while your code runs.
        </p>
      ) : (
        <ol className="console-lines" data-testid="console-lines">
          {logs.map((entry, i) => (
            <li key={i} className={`console-${entry.level}`}>
              {entry.level !== "log" && <span className="console-level">{entry.level}: </span>}
              {entry.text}
            </li>
          ))}
        </ol>
      )}
      {dropped > 0 && (
        <p className="note small" data-testid="console-dropped">
          {dropped} more console message{dropped === 1 ? " was" : "s were"} not shown. Only the first {logs.length} are kept.
        </p>
      )}
    </div>
  );
}

function CheckPanel({ check, stale, checks }) {
  const total = checks.length;
  if (check.status === "cancelled") {
    return (
      <section className="panel check-panel" aria-label="Check results">
        <h4>Check results</h4>
        <p className="muted">The check was stopped before it finished.</p>
      </section>
    );
  }
  const passedCount = check.results.filter((r) => r.passed).length;
  return (
    <section className="panel check-panel" aria-label="Check results" data-testid="check-panel">
      <h4>Check results</h4>
      {stale && (
        <p className="notice warning">
          These results are for an earlier version of your code. Check again to test what&rsquo;s in the editor now.
        </p>
      )}
      <p className={check.passed ? "feedback success" : "feedback error"} data-testid="check-summary">
        {check.passed
          ? `All ${total} checks passed.`
          : check.stoppedEarly
            ? "The check stopped early because the same problem would affect every dataset."
            : `${passedCount} of ${total} checks passed.`}
      </p>
      {check.note && (
        <p className="feedback info">
          <RichText text={check.note} />
        </p>
      )}
      <ul className="check-list">
        {check.results.map((r) => (
          <li key={r.id} className={r.passed ? "passed" : "failed"}>
            <p className="check-title">
              <span className="check-mark" aria-hidden="true">
                {r.passed ? "✓" : "✗"}
              </span>
              <strong>{r.name}</strong> <span className="visually-hidden">{r.passed ? "passed" : "failed"}</span>
              <span className="check-summary">{r.summary}</span>
            </p>
            {r.problems.length > 0 && (
              <ul className="problems">
                {r.problems.map((p, i) => (
                  <li key={i}>
                    <RichText text={p.message} />
                  </li>
                ))}
              </ul>
            )}
            <DatasetDetails check={checks.find((c) => c.id === r.id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function DatasetDetails({ check }) {
  if (!check) return null;
  if (check.orders) return <details className="dataset-details"><summary>Inspect this dataset</summary><p className="small">{check.description}</p><SourceExports orders={check.orders} fieldReports={check.fieldReports} prefix={check.name} /><p className="small">Trace keys and compare fields using the contract; hidden expected reports are not included in Copy to IDE.</p></details>;
  return (
    <details className="dataset-details">
      <summary>Inspect this dataset</summary>
      <p className="small">{check.description}</p>
      <RecordTable rows={check.rows} caption={`Input: ${check.name}`} highlightIds={check.expectedIds} />
      <p className="small">
        Expected result: {check.expected?.kept
          ? `${check.expected.kept.length} kept, ${check.expected.duplicates.length} duplicates, ${check.expected.conflicts.length} conflict groups; ${check.expected.totalHours} reliable hours`
          : check.expected
          ? `${check.expected.accepted.length} accepted and ${check.expected.rejected.length} rejected`
          : check.expectedIds.length ? check.expectedIds.join(", ") : "an empty array"}
        {check.expectedIds?.length > 0 && " (highlighted)"}.
      </p>
      {check.expected && <details><summary>Inspect expected values and reasons</summary><CodeBlock code={JSON.stringify(check.expected, null, 2)} label={`Expected: ${check.name}`} /></details>}
    </details>
  );
}
