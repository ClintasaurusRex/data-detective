import { useEffect, useState } from "react";
import App from "../App.jsx";
import { ErrorBoundary } from "../ErrorBoundary.jsx";

let accessPromise;
let canWrite = false;

// One request per DOCUMENT, including StrictMode remounts. Keep the lock for
// the document's lifetime: pagehide can flush while it is still held, and the
// browser releases it on unload/close. No localStorage check-and-set or lease.
function progressAccess() {
  if (accessPromise) return accessPromise;
  accessPromise = new Promise(resolve => {
    try {
      if (!navigator.locks?.request) { resolve("memory"); return; }
      navigator.locks.request("data-detective:progress-writer", { mode: "exclusive", ifAvailable: true }, lock => {
        if (!lock) { resolve("blocked"); return; }
        canWrite = true;
        resolve("editing");
        // A restored history document must reload/reacquire before using an
        // old snapshot, even if an engine retained the document in bfcache.
        window.addEventListener("pageshow", event => {
          if (event.persisted) { canWrite = false; window.location.reload(); }
        });
        return new Promise(() => {});
      }).catch(() => { canWrite = false; resolve("memory"); });
    } catch { resolve("memory"); }
  });
  return accessPromise;
}

const mayWrite = () => canWrite;

export function ProgressSession() {
  const [access, setAccess] = useState(null);
  useEffect(() => {
    let mounted = true;
    progressAccess().then(value => { if (mounted) setAccess(value); });
    return () => { mounted = false; };
  }, []);

  if (access === "editing" || access === "memory") return <>
    {access === "memory" && <div className="notice warning" role="alert">
      Saving is unavailable because this browser could not reserve exclusive tab access.
      This session is working in memory and leaves existing saved progress unchanged.
      Copy your code before refreshing or closing this page.
    </div>}
    <ErrorBoundary mayWrite={mayWrite}><App readOnlyStorage={access === "memory"} mayWrite={mayWrite} /></ErrorBoundary>
  </>;
  return <div className="app"><main className="panel">
    <h1>{access === "blocked" ? "Already open in another tab" : "Opening saved progress…"}</h1>
    {access === "blocked" ? <>
      <p role="alert">To protect your saved work, this tab cannot edit or save progress. Continue in the other Data Detective tab, or close it and retry here. This tab has not changed your progress.</p>
      <button type="button" onClick={() => window.location.reload()}>Retry</button>
    </> : <p role="status">Checking that this tab can safely save your work.</p>}
  </main></div>;
}
