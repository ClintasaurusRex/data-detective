import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { allExercises, cases, playableCases } from "./missions/index.js";
import { createSandboxRunner } from "./runner/sandboxRunner.js";
import { loadState, saveState } from "./storage/progress.js";
import { MessyExportView } from "./components/MessyExportView.jsx";
import { CaseView } from "./components/CaseView.jsx";
import { ToolboxEntry } from "./components/ToolboxEntry.jsx";

const catalogue = { cases: playableCases, exercises: allExercises };

function useProgress() {
  const [loaded] = useState(() => loadState(catalogue));
  const [state, setState] = useState(loaded.state);
  const [notice, setNotice] = useState(loaded.notice);
  const latest = useRef(state);

  useEffect(() => {
    latest.current = state;
    const timer = setTimeout(() => saveState(state, loaded.storage), 250);
    return () => clearTimeout(timer);
  }, [state, loaded.storage]);

  useEffect(() => {
    const flush = () => saveState(latest.current, loaded.storage);
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [loaded.storage]);

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

export default function App() {
  const { state, updateExercise, updateCase, notice, dismissNotice } = useProgress();
  const runner = useRunner();
  const view = useHashView();
  const mainRef = useRef(null);
  const solvedExercises = allExercises.filter((e) => e.exportFileName && state.exercises[e.id]?.solved);
  const currentCase = playableCases.find((c) => c.id === view) ?? playableCases[0];
  const MissionView = currentCase.id === "messy-export" ? MessyExportView : CaseView;

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
      <p>Downloadable scripts you&rsquo;ve checked. Each one runs on its own with Node, on any JSON file with the same shape.</p>
      {solvedExercises.length === 0 ? (
        <p className="panel muted">
          Nothing downloadable yet. Case 1 adds a checked JSON script here. Case 2 keeps its checked code in its mission; the full CSV-file tool comes in a later slice.
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
