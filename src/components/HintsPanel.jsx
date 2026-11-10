import { useEffect, useRef, useState } from "react";
import { CodeBlock, RichText } from "./common.jsx";

// Progressive hints, then an explained solution behind a confirmation.
// Hints carry no penalty; using the solution is recorded honestly.
export function HintsPanel({ exercise, state, update, onUseSolution }) {
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef(null);
  const confirmRef = useRef(null);
  const solutionRef = useRef(null);
  const interacted = useRef(false);
  useEffect(() => {
    if (!interacted.current) return;
    if (confirming) confirmRef.current?.focus();
    else if (state.solutionRevealed) solutionRef.current?.focus();
    else triggerRef.current?.focus();
  }, [confirming, state.solutionRevealed]);
  const { hints, solution } = exercise;
  const shown = state.hintsShown;

  return (
    <section className="panel hints-panel" aria-label="Hints and solution">
      <h4>Need a lead?</h4>
      <p className="muted small">Hints are free. Take as many as you like, whenever you like.</p>
      {shown > 0 && (
        <ol className="hint-list">
          {hints.slice(0, shown).map((hint, i) => (
            <li key={i}>
              <span className="hint-label">Hint {i + 1}: </span>
              <RichText text={hint} />
            </li>
          ))}
        </ol>
      )}
      {shown < hints.length && (
        <button type="button" onClick={() => update((s) => ({ ...s, hintsShown: Math.min(s.hintsShown + 1, hints.length) }))}>
          Show hint {shown + 1} of {hints.length}
        </button>
      )}

      <div className="solution">
        <h5>Explained solution</h5>
        {!state.solutionRevealed && !confirming && (
          <button ref={triggerRef} type="button" onClick={() => { interacted.current = true; setConfirming(true); }}>
            Show the explained solution…
          </button>
        )}
        {!state.solutionRevealed && confirming && (
          <div className="confirm" role="group" aria-label="Confirm showing the solution">
            <p>
              This shows a complete, working answer with an explanation. You can still finish the case afterwards, and
              your progress will note that you viewed the solution.
            </p>
            <div className="actions">
              <button
                type="button"
                ref={confirmRef}
                className="primary"
                onClick={() => {
                  setConfirming(false);
                  update((s) => ({ ...s, solutionRevealed: true }));
                }}
              >
                Yes, show the solution
              </button>
              <button type="button" onClick={() => setConfirming(false)}>
                Not yet
              </button>
            </div>
          </div>
        )}
        {state.solutionRevealed && (
          <div className="solution-body" data-testid="solution" ref={solutionRef} tabIndex={-1}>
            <CodeBlock code={solution.code} label="Explained solution code" />
            <ul>
              {solution.explanation.map((line, i) => (
                <li key={i}>
                  <RichText text={line} />
                </li>
              ))}
            </ul>
            <p className="small muted">
              Typing it yourself is the best practice. If you&rsquo;d rather copy it, your current draft is kept.
            </p>
            <button type="button" onClick={onUseSolution}>
              Put this code in the editor
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
