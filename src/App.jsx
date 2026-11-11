import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { allExercises, cases, playableCases } from "./missions/index.js";
import { createSandboxRunner } from "./runner/sandboxRunner.js";
import { loadState, saveState } from "./storage/progress.js";
import { MessyExportView } from "./components/MessyExportView.jsx";
import { DoubledTotalsView } from "./components/DoubledTotalsView.jsx";
import { TwoExportsView } from "./components/TwoExportsView.jsx";
import { ReportingView } from "./components/ReportingView.jsx";
import { CaseView } from "./components/CaseView.jsx";
import { ToolboxEntry } from "./components/ToolboxEntry.jsx";

const catalogue = { cases: playableCases, exercises: allExercises };
const SAVE_FAILURE_NOTICE = "Your latest changes couldn't be saved in this browser. Keep this page open and copy your code to your editor before refreshing or closing it. The app will try saving again when you make a change.";

function useProgress(readOnlyStorage, mayWrite) {
  const [loaded] = useState(() => loadState(catalogue, undefined, { readOnly: readOnlyStorage }));
  const [state, setState] = useState(loaded.state);
  const [notice, setNotice] = useState(loaded.notice);
  const latest = useRef(state);
  const persist = useCallback((value) => {
    if (!loaded.storage || !mayWrite()) return;
    if (!saveState(value, loaded.storage)) setNotice(SAVE_FAILURE_NOTICE);
    else setNotice(current => current === SAVE_FAILURE_NOTICE ? null : current);
  }, [loaded.storage, mayWrite]);

  useEffect(() => {
    latest.current = state;
    const timer = setTimeout(() => persist(state), 250);
    return () => clearTimeout(timer);
  }, [state, persist]);

  useEffect(() => {
    const flush = () => persist(latest.current);
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [persist]);

  const updateExercise = useCallback((id, fn) => {
    setState((s) => ({ ...s, exercises: { ...s.exercises, [id]: fn(s.exercises[id]) } }));
  }, []);
  const updateCase = useCallback((id, fn) => {
    setState((s) => ({ ...s, cases: { ...s.cases, [id]: fn(s.cases[id]) } }));
  }, []);

  return { state, updateExercise, updateCase, notice, dismissNotice: () => setNotice(null) };
}

function useRunner() {
  const ref = useRef(null);
  useEffect(() => {
    const runner = createSandboxRunner();
    ref.current = runner;
    return () => {
      runner.destroy();
      ref.current = null;
    };
  }, []);
  return useMemo(
    () => ({
      run: (code, rows) =>
        ref.current
          ? ref.current.run(code, rows)
          : Promise.resolve({ status: "error", logs: [], droppedLogs: 0, error: { stage: "runner", name: "Runner", message: "The code runner isn't ready yet. Try again in a moment." } }),
      cancel: () => ref.current?.cancel(),
    }),
    [],
  );
}

function useHashView() {
  const read = () => {
    const hash = window.location.hash;
    if (hash === "#/toolbox") return "toolbox";
    return playableCases.find((c) => hash === `#/case/${c.id}`)?.id ?? playableCases[0].id;
  };
  const [view, setView] = useState(read);
  useEffect(() => {
    const onChange = () => setView(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return view;
}

export default function App({ readOnlyStorage, mayWrite }) {
  const { state, updateExercise, updateCase, notice, dismissNotice } = useProgress(readOnlyStorage, mayWrite);
  const runner = useRunner();
  const view = useHashView();
  const mainRef = useRef(null);
  const solvedExercises = allExercises.filter((e) => (e.exportFileName || e.keepCheckedCode) && state.exercises[e.id]?.solved);
  const currentCase = playableCases.find((c) => c.id === view) ?? playableCases[0];
  const MissionView = currentCase.id === "first-reporting-tool" ? ReportingView : currentCase.id === "two-exports" ? TwoExportsView : currentCase.id === "doubled-totals" ? DoubledTotalsView : currentCase.id === "messy-export" ? MessyExportView : CaseView;

  // Move focus to the content when the view changes (not on first load).
  const firstView = useRef(true);
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [view]);

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={(event) => { event.preventDefault(); mainRef.current?.focus(); }}>
        Skip to content
      </a>
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            DD
          </span>
          <div>
            <h1>Data Detective</h1>
            <p className="tagline">Small data mysteries, solved with JavaScript.</p>
          </div>
        </div>
        <nav aria-label="Main">
          <ul className="nav-links">
            <li>
              <a href="#/case" aria-current={view !== "toolbox" ? "page" : undefined}>
                Case files
              </a>
            </li>
            <li>
              <a href="#/toolbox" aria-current={view === "toolbox" ? "page" : undefined}>
                Toolbox ({solvedExercises.length})
              </a>
            </li>
          </ul>
        </nav>
      </header>

      {notice && (
        <div className="notice warning app-notice" role="alert">
          <p>{notice}</p>
          <button type="button" onClick={dismissNotice}>
            Dismiss
          </button>
        </div>
      )}

      <div className="layout">
        <aside className="case-list" aria-labelledby="case-list-title">
          <h2 id="case-list-title">Cases</h2>
          <ol>
            {cases.map((c) => {
              const solved = c.playable && state.exercises[c.exercises[0].id]?.solved;
              return (
                <li key={c.id} className={c.playable ? "playable" : "planned"}>
                  {c.playable ? (
                    <a href={`#/case/${c.id}`} aria-current={view === c.id ? "page" : undefined}>
                      <span className="case-number">{c.number}</span>
                      <span className="case-name">{c.title}</span>
                      <span className="case-state">{solved ? "Solved" : "Open"}</span>
                    </a>
                  ) : (
                    <div>
                      <span className="case-number">{c.number}</span>
                      <span className="case-name">{c.title}</span>
                      <span className="case-state">Planned</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </aside>

        <main id="main" ref={mainRef} tabIndex={-1}>
          {view === "toolbox" ? (
            <Toolbox solvedExercises={solvedExercises} state={state} />
          ) : (
            <MissionView
              key={currentCase.id}
              caseDef={currentCase}
              caseState={state.cases[currentCase.id]}
              updateCase={(fn) => updateCase(currentCase.id, fn)}
              exerciseStates={state.exercises}
              updateExercise={updateExercise}
              runner={runner}
            />
          )}
        </main>
      </div>

      <footer className="site-footer">
        <p>
          All people, places and records in Data Detective are fictional. Your work is saved only in this browser.
        </p>
      </footer>
    </div>
  );
}

function Toolbox({ solvedExercises, state }) {
  return (
    <section aria-labelledby="toolbox-title">
      <h2 id="toolbox-title">Your Toolbox</h2>
      <p>Checked code and downloadable scripts. Case 5 reads raw work orders, field time and a reporting period from three JSON files. Case 4 reconciles two separate JSON exports. Cases 1 and 3 read one JSON file; Case 2 reads CSV files after installing its parser dependency. Each tool includes instructions for running it independently with Node.</p>
      {solvedExercises.length === 0 ? (
        <p className="panel muted">
          Nothing downloadable yet. Pass a case&rsquo;s checks to keep its working script here: JSON tools for Cases 1, 3 and 4, a weekly JSON reporting tool for Case 5, or a CSV reporting tool for Case 2.
        </p>
      ) : (
        solvedExercises.map((exercise) => (
          <div className="panel" key={exercise.id}>
            <ToolboxEntry exercise={exercise} solved={state.exercises[exercise.id].solved} headingLevel={3} />
          </div>
        ))
      )}
    </section>
  );
}
