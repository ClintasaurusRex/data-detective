import { useEffect, useId, useRef, useState } from "react";
import { RecordTable, RichText } from "./common.jsx";
import { solvedLabel } from "./format.js";
import { ToolboxEntry } from "./ToolboxEntry.jsx";
import { Workbench } from "./Workbench.jsx";

const glossary = [
  ["array", "A list of values in order, written in [square brackets]. `rows` is an array."],
  ["record", "One row of data. Here each record is a JavaScript object such as `{ id: \"J-101\", status: \"Complete\" }`."],
  ["string", "A piece of text, written in quotes. Every status is a string."],
  ["whitespace", "Characters you can't see: spaces, tabs (`\\t`) and line breaks (`\\n`)."],
  ["`===`", "Strict equality. Two strings are equal only if every character matches, including capitals and spaces."],
  ["`filter`", "An array method that keeps the items for which your test returns `true`, in a new array."],
];

export function CaseView({ caseDef, caseState, updateCase, exerciseStates, updateExercise, runner }) {
  const [main, variation] = caseDef.exercises;
  const mainState = exerciseStates[main.id];
  const variationState = exerciseStates[variation.id];
  const predictionRef = useRef(null);
  const [predictionPrompt, setPredictionPrompt] = useState(false);
  const prediction = caseState.prediction;

  // Celebrate only when the case is solved during this visit.
  const [celebrate, setCelebrate] = useState(false);
  const wasSolved = useRef(!!mainState.solved);
  useEffect(() => {
    if (mainState.solved && !wasSolved.current) setCelebrate(true);
    wasSolved.current = !!mainState.solved;
  }, [mainState.solved]);

  // Content for the "Copy to IDE" file, from the active exercise.
  const requestFrom = `${caseDef.colleague.name}, ${caseDef.colleague.role}`;
  const challengeFor = (exercise, request) => ({
    caseNumber: caseDef.number,
    caseTitle: caseDef.title,
    exerciseTitle: exercise.title,
    request,
    requestFrom,
    goal: exercise.goal,
    rules: exercise.rules ?? caseDef.rules,
    rows: exercise.rows,
  });

  function beforeRun() {
    if (prediction) return true;
    setPredictionPrompt(true);
    predictionRef.current?.focus();
    return false;
  }

  function describeRun(result) {
    if (!prediction || prediction.skipped) return null;
    const n = result.output.length;
    if (n === prediction.value) {
      return `Your code returned ${n} record${n === 1 ? "" : "s"}, matching your prediction of ${prediction.value}. Use “Check solution” to test it on more data.`;
    }
    return `Your code returned ${n} record${n === 1 ? "" : "s"}. You predicted ${prediction.value}. Compare the output with the input table: which rows are missing, and what do their statuses have in common?`;
  }

  return (
    <article className="case" aria-labelledby="case-title">
      <header className="case-header">
        <p className="eyebrow">Case {caseDef.number}</p>
        <h2 id="case-title">{caseDef.title}</h2>
        <p className={`badge ${mainState.solved ? "badge-solved" : ""}`} data-testid="case-status">
          {mainState.solved ? "Solved" : "Open case"}
        </p>
      </header>

      <div className="case-brief">
      <section className="panel request" aria-labelledby="request-title">
        <h3 id="request-title">The request</h3>
        <blockquote>
          <p>&ldquo;{caseDef.request}&rdquo;</p>
          <footer>
            {caseDef.colleague.name}, {caseDef.colleague.role}, Riverbend Water Services
          </footer>
        </blockquote>
        <p className="target">
          <strong>Your target: </strong>
          <RichText text={caseDef.target} />
        </p>
        <details className="rules">
          <summary>Case rules</summary>
          <ul>
            {caseDef.rules.map((rule) => (
              <li key={rule}>
                <RichText text={rule} />
              </li>
            ))}
          </ul>
        </details>
        <details className="glossary">
          <summary>Terms used in this case</summary>
          <dl>
            {glossary.map(([term, meaning]) => (
              <div key={term}>
                <dt>
                  <RichText text={term} />
                </dt>
                <dd>
                  <RichText text={meaning} />
                </dd>
              </div>
            ))}
          </dl>
        </details>
      </section>

      <section className="panel evidence" aria-labelledby="evidence-title">
        <h3 id="evidence-title">The evidence: this week&rsquo;s export</h3>
        <p className="small">
          Each row is a <em>record</em> for one job. Statuses are shown in quotes so you can see every character,
          including spaces.
        </p>
        <RecordTable rows={main.rows} caption="Job export: input rows" />
      </section>
      </div>

      <Prediction
        caseDef={caseDef}
        prediction={prediction}
        prompt={predictionPrompt}
        inputRef={predictionRef}
        onChange={(value) => {
          setPredictionPrompt(false);
          updateCase((s) => ({ ...s, prediction: value }));
        }}
      />

      <section className="panel" aria-labelledby="investigate-title">
        <h3 id="investigate-title">Investigate the code</h3>
        <p className="small">
          Run the code to see what it returns. When you think it&rsquo;s right, use <strong>Check solution</strong>: it
          tests your code on the case file and on {main.checks.length - 1} more datasets.
        </p>
        <Workbench
          exercise={main}
          state={mainState}
          update={(fn) => updateExercise(main.id, fn)}
          runner={runner}
          beforeRun={beforeRun}
          describeRun={describeRun}
          challenge={challengeFor(main, caseDef.request)}
        />
      </section>

      {mainState.solved && (
        <section className={`panel solved ${celebrate ? "celebrate" : ""}`} aria-labelledby="solved-title" data-testid="solved-panel">
          <p className="stamp" aria-hidden="true">
            Case closed
          </p>
          <h3 id="solved-title">Case solved</h3>
          <p>
            {solvedLabel(mainState.solved)}. The report now finds every completed job, however the status was typed.
            Your checked script is in your Toolbox, ready to run with Node.
          </p>
          <ToolboxEntry exercise={{ ...main, caseNumber: caseDef.number, caseTitle: caseDef.title }} solved={mainState.solved} headingLevel={4} />
        </section>
      )}

      {mainState.solved && (
        <section className="panel" aria-labelledby="variation-title">
          <h3 id="variation-title">{variation.title}</h3>
          <p>{variation.brief}</p>
          <p className="target">
            <strong>Your target: </strong>
            {variation.goal}
          </p>
          {variationState.solved && (
            <p className="feedback success" data-testid="variation-solved">
              Variation solved ({solvedLabel(variationState.solved).toLowerCase()}). It&rsquo;s in your Toolbox too.
            </p>
          )}
          <Workbench
            exercise={variation}
            state={variationState}
            update={(fn) => updateExercise(variation.id, fn)}
            runner={runner}
            challenge={challengeFor(variation, variation.brief)}
          />
        </section>
      )}
    </article>
  );
}

function Prediction({ caseDef, prediction, prompt, inputRef, onChange }) {
  const inputId = useId();
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(false);
  const { question, answer, answerIds } = caseDef.prediction;
  const rowCount = caseDef.exercises[0].rows.length;
  const showForm = !prediction || prediction.skipped || editing;

  function submit(event) {
    event.preventDefault();
    const n = Number(value);
    if (value.trim() === "" || !Number.isInteger(n) || n < 0) return;
    setEditing(false);
    onChange({ value: n });
  }

  let feedback = null;
  if (prediction && !prediction.skipped && !editing) {
    const v = prediction.value;
    if (v === answer) {
      feedback = `Good eye. ${answer} statuses mean “complete” to a person: ${answerIds.join(", ")}. Now run the code and see how many the computer finds.`;
    } else if (v > rowCount) {
      feedback = `There are only ${rowCount} rows in the export, so the report can't include more than ${rowCount}. Look at each status again.`;
    } else if (v > answer) {
      feedback = "Look closely at each status. Is every one of them really a completed job? You can change your prediction, or run the code and investigate.";
    } else {
      feedback = "Look again at the Status column. The quotes show the exact text, including capital letters and spaces. How many of those would a person read as complete? You can change your prediction, or run the code and investigate.";
    }
  }

  return (
    <section className="panel prediction" aria-labelledby="prediction-title" data-testid="prediction">
      <h3 id="prediction-title">Your prediction</h3>
      {showForm ? (
        <form onSubmit={submit} className="prediction-form">
          <label htmlFor={inputId}>{question}</label>
          {prompt && (
            <p className="notice" role="alert">
              Before your first run, make a prediction. Any answer is fine; it&rsquo;s there to compare with what the code does.
            </p>
          )}
          <div className="inline-fields">
            <input
              id={inputId}
              ref={inputRef}
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="number-input"
            />
            <button type="submit" className="primary">
              Save prediction
            </button>
            {!prediction && (
              <button type="button" className="link-button" onClick={() => onChange({ skipped: true })}>
                Skip for now
              </button>
            )}
          </div>
          {prediction?.skipped && !editing && <p className="small muted">Prediction skipped. You can still make one.</p>}
        </form>
      ) : (
        <div>
          <p>
            You predicted <strong data-testid="prediction-value">{prediction.value}</strong>.
          </p>
          <p className={prediction.value === answer ? "feedback success" : "feedback info"}>{feedback}</p>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setValue(String(prediction.value));
              setEditing(true);
            }}
          >
            Change my prediction
          </button>
        </div>
      )}
    </section>
  );
}
