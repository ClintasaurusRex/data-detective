import { useEffect, useId, useRef, useState } from "react";
import { CHALLENGE_FILE_NAME, buildChallengeFile } from "../export/challengeFile.js";

// Copies the active exercise as a standalone challenge.js. Only builds text:
// it doesn't run code or change the draft or progress.
export function CopyToIde({ challenge, code }) {
  const [result, setResult] = useState(null); // { ok: true } | { ok: false, text }
  const fallbackRef = useRef(null);
  const fallbackId = useId();

  async function copy() {
    const text = buildChallengeFile(challenge, code);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard not available");
      await navigator.clipboard.writeText(text);
      setResult({ ok: true });
    } catch {
      setResult({ ok: false, text });
    }
  }

  useEffect(() => {
    if (result && !result.ok) {
      fallbackRef.current?.focus();
      fallbackRef.current?.select();
    }
  }, [result]);

  return (
    <>
      <button type="button" className="small-button" onClick={copy} data-testid="copy-to-ide">
        Copy to IDE
      </button>
      <div className="copy-feedback" role="status" aria-live="polite">
        {result?.ok && (
          <p className="feedback success" data-testid="copy-success">
            Copied! Paste it into a new file in your IDE (for example VS Code or VSCodium), save it as{" "}
            <code>{CHALLENGE_FILE_NAME}</code>, and run <code>node {CHALLENGE_FILE_NAME}</code>. When it works, paste
            the YOUR SOLUTION section back into the editor here, without the sample data or preview.
          </p>
        )}
        {result && !result.ok && (
          <div className="feedback warning" data-testid="copy-fallback">
            <p>
              <label htmlFor={fallbackId}>
                Your browser didn&rsquo;t allow copying automatically. The file is below and already selected: press{" "}
                <kbd>Ctrl</kbd>+<kbd>C</kbd> (<kbd>⌘</kbd>+<kbd>C</kbd> on a Mac) to copy it, then save it as{" "}
                <code>{CHALLENGE_FILE_NAME}</code>.
              </label>
            </p>
            <textarea
              id={fallbackId}
              ref={fallbackRef}
              className="code-editor fallback-text"
              readOnly
              rows={12}
              value={result.text}
              spellCheck={false}
              wrap="off"
            />
            <button type="button" className="link-button" onClick={() => setResult(null)}>
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
}
