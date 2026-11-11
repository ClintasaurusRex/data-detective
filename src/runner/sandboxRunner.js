// App-side client for the sandboxed code runner.
//
// It owns one hidden <iframe sandbox="allow-scripts"> pointing at
// sandbox.html. Each run gets a unique ID; only the reply for the latest run
// is accepted, so an older, slower run can never overwrite a newer result.
// Starting a new run cancels the previous one.

const MESSAGE_SOURCE = "data-detective-sandbox";
export const DEFAULT_TIMEOUT_MS = 2000;
const READY_TIMEOUT_MS = 8000;
const WATCHDOG_EXTRA_MS = 2000;

let runCounter = 0;
function nextRunId() {
  runCounter += 1;
  const random = Math.random().toString(36).slice(2, 10);
  return `run-${Date.now().toString(36)}-${runCounter}-${random}`;
}

function runnerError(name, message) {
  return { status: "error", logs: [], droppedLogs: 0, error: { stage: "runner", name, message } };
}

// Turn the sandbox's reply into a plain, validated RunResult.
export function normaliseResult(raw) {
  if (!raw || typeof raw !== "object") return runnerError("Runner error", "The runner sent an unreadable reply.");
  if (raw.status === "cancelled") return { status: "cancelled", logs: [], droppedLogs: 0 };
  if (raw.status === "timeout") {
    return { status: "timeout", timeoutMs: raw.timeoutMs, logs: [], droppedLogs: 0 };
  }
  const result = {
    status: raw.status === "ok" ? "ok" : "error",
    resultType: typeof raw.resultType === "string" ? raw.resultType : undefined,
    mutated: raw.mutated === true,
    logs: Array.isArray(raw.logs) ? raw.logs : [],
    droppedLogs: Number.isInteger(raw.droppedLogs) ? raw.droppedLogs : 0,
    durationMs: raw.durationMs,
    error: raw.error,
    hasOutput: false,
    output: undefined,
  };
  if (typeof raw.outputJson === "string") {
    try {
      result.output = JSON.parse(raw.outputJson);
      result.hasOutput = true;
      const outputType = result.output === null ? "null" : Array.isArray(result.output) ? "array" : typeof result.output;
      if (outputType !== result.resultType) {
        result.status = "error";
        result.error = { stage: "result", name: "Result changed type", message: "Your result changed type during JSON conversion. Return plain records and arrays with finite numbers; avoid custom toJSON methods." };
      }
    } catch {
      return runnerError("Runner error", "The result couldn't be read.");
    }
  }
  return result;
}

export function createSandboxRunner({ sandboxUrl = "./sandbox.html", timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  let iframe = null;
  let ready = null; // Promise that resolves when the sandbox says "ready"
  let resolveReady = null;
  let current = null; // { runId, resolve, watchdog }
  let destroyed = false;

  function onMessage(event) {
    if (!iframe || event.source !== iframe.contentWindow) return;
    // A sandboxed frame without allow-same-origin has the opaque origin "null".
    if (event.origin !== "null") return;
    const data = event.data;
    if (!data || typeof data !== "object" || data.source !== MESSAGE_SOURCE) return;
    if (data.type === "ready") {
      resolveReady?.(true);
      return;
    }
    if (data.type !== "result" || !current || data.runId !== current.runId) return; // stale
    settle(normaliseResult(data.result));
  }

  function createFrame() {
    iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.setAttribute("referrerpolicy", "no-referrer");
    iframe.setAttribute("allow", "");
    iframe.setAttribute("title", "Code runner");
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("tabindex", "-1");
    iframe.hidden = true;
    ready = new Promise((resolve) => {
      resolveReady = resolve;
      setTimeout(() => resolve(false), READY_TIMEOUT_MS);
    });
    iframe.src = sandboxUrl;
    document.body.appendChild(iframe);
  }

  function resetFrame() {
    iframe?.remove();
    iframe = null;
    if (!destroyed) createFrame();
  }

  function settle(result) {
    if (!current) return;
    const { resolve, watchdog } = current;
    clearTimeout(watchdog);
    current = null;
    resolve(result);
  }

  window.addEventListener("message", onMessage);
  createFrame();

  async function run(code, rows, options = {}) {
    if (destroyed) return runnerError("Runner error", "The runner has been closed.");
    cancel();
    const runId = nextRunId();
    const limitMs = options.timeoutMs ?? timeoutMs;
    const promise = new Promise((resolve) => {
      current = { runId, resolve, watchdog: null };
    });
    const isReady = await ready;
    if (!current || current.runId !== runId) return promise; // cancelled while waiting
    if (!isReady) {
      resetFrame();
      settle(runnerError("Runner unavailable", "The code runner didn't start. Reload the page and try again."));
      return promise;
    }
    // If the sandbox itself stops answering, replace it.
    current.watchdog = setTimeout(() => {
      resetFrame();
      settle(runnerError("Runner unresponsive", "The code runner stopped responding and has been restarted."));
    }, limitMs + WATCHDOG_EXTRA_MS);
    iframe.contentWindow.postMessage({ type: "run", runId, code, rows, timeoutMs: limitMs }, "*");
    return promise;
  }

  function cancel() {
    if (!current) return;
    const { runId } = current;
    iframe?.contentWindow?.postMessage({ type: "cancel", runId }, "*");
    settle({ status: "cancelled", logs: [], droppedLogs: 0 });
  }

  function destroy() {
    destroyed = true;
    cancel();
    window.removeEventListener("message", onMessage);
    iframe?.remove();
    iframe = null;
  }

  return { run, cancel, destroy };
}
