/*
 * Sandbox host. build/sandboxPage.js inlines this classic script into
 * sandbox.html, after a line that defines WORKER_SOURCE.
 *
 * sandbox.html is loaded in <iframe sandbox="allow-scripts">, so it has an
 * opaque origin: it cannot read the app's DOM or storage, open windows, or
 * navigate the top-level page. Its own Content Security Policy blocks
 * network requests and confines code evaluation to this frame and its
 * workers. Learner code never runs here directly; each run gets a fresh
 * worker that is terminated when the run finishes, times out, or is
 * cancelled.
 */
/* global WORKER_SOURCE */
"use strict";

(function startHost() {
  const parentWindow = window.parent;
  const MESSAGE_SOURCE = "data-detective-sandbox";
  const LIMITS = Object.freeze({
    maxLogEntries: 100,
    maxLogEntryChars: 500,
    maxLogChars: 20000,
    maxErrorChars: 500,
    maxResultItems: 5000,
    maxResultChars: 200000,
  });
  const MAX_CODE_CHARS = 50000;
  const MIN_TIMEOUT_MS = 100;
  const MAX_TIMEOUT_MS = 10000;

  let workerUrl = null;
  let active = null; // { runId, nonce, worker, timer }

  function send(message) {
    // The parent's origin can't be named from an opaque origin, so "*" is used.
    // Messages only carry run results, never app data.
    parentWindow.postMessage({ source: MESSAGE_SOURCE, ...message }, "*");
  }

  function makeNonce() {
    const bytes = new Uint32Array(4);
    self.crypto.getRandomValues(bytes);
    return Array.from(bytes, (n) => n.toString(16)).join("-");
  }

  function isValidRun(data) {
    return (
      typeof data.runId === "string" &&
      data.runId.length > 0 &&
      data.runId.length <= 100 &&
      typeof data.code === "string" &&
      data.code.length <= MAX_CODE_CHARS &&
      Array.isArray(data.rows) &&
      typeof data.timeoutMs === "number" &&
      data.timeoutMs >= MIN_TIMEOUT_MS &&
      data.timeoutMs <= MAX_TIMEOUT_MS
    );
  }

  function stopActive() {
    if (!active) return null;
    const stopped = active;
    active = null;
    clearTimeout(stopped.timer);
    stopped.worker.terminate();
    return stopped;
  }

  function finish(runId, result) {
    if (!active || active.runId !== runId) return;
    stopActive();
    send({ type: "result", runId, result });
  }

  // Copy only expected fields from the worker's reply, with types checked.
  function cleanReply(reply) {
    const logs = Array.isArray(reply.logs)
      ? reply.logs
          .slice(0, LIMITS.maxLogEntries)
          .filter((entry) => entry && typeof entry.text === "string")
          .map((entry) => ({
            level: ["log", "info", "warn", "error"].includes(entry.level) ? entry.level : "log",
            text: entry.text.slice(0, LIMITS.maxLogEntryChars + 20),
          }))
      : [];
    const error =
      reply.error && typeof reply.error === "object"
        ? {
            stage: String(reply.error.stage || "run"),
            name: String(reply.error.name || "Error").slice(0, 80),
            message: String(reply.error.message || "").slice(0, LIMITS.maxErrorChars + 20),
            line: Number.isInteger(reply.error.line) ? reply.error.line : undefined,
            column: Number.isInteger(reply.error.column) ? reply.error.column : undefined,
            atEnd: reply.error.atEnd === true,
          }
        : undefined;
    return {
      status: reply.status === "ok" ? "ok" : "error",
      resultType: typeof reply.resultType === "string" ? reply.resultType : undefined,
      outputJson:
        typeof reply.outputJson === "string" && reply.outputJson.length <= LIMITS.maxResultChars
          ? reply.outputJson
          : null,
      mutated: reply.mutated === true,
      logs,
      droppedLogs: Number.isInteger(reply.droppedLogs) ? reply.droppedLogs : 0,
      durationMs: typeof reply.durationMs === "number" ? reply.durationMs : undefined,
      error,
    };
  }

  function startRun(data) {
    const previous = stopActive();
    if (previous) send({ type: "result", runId: previous.runId, result: { status: "cancelled" } });

    const { runId, code, rows, timeoutMs } = data;
    const nonce = makeNonce();
    let worker;
    try {
      if (!workerUrl) {
        workerUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
      }
      worker = new Worker(workerUrl);
    } catch (error) {
      send({
        type: "result",
        runId,
        result: {
          status: "error",
          error: {
            stage: "runner",
            name: "Runner unavailable",
            message: "This browser couldn't start the code runner (" + String(error && error.message) + ").",
          },
        },
      });
      return;
    }

    const timer = setTimeout(() => finish(runId, { status: "timeout", timeoutMs }), timeoutMs);
    active = { runId, nonce, worker, timer };

    worker.onmessage = (event) => {
      const reply = event.data;
      if (!reply || typeof reply !== "object") return;
      if (reply.type !== "done" || reply.runId !== runId || reply.nonce !== nonce) return;
      finish(runId, cleanReply(reply));
    };
    worker.onerror = (event) => {
      event.preventDefault();
      finish(runId, {
        status: "error",
        error: { stage: "runner", name: "Runner error", message: String(event.message || "The worker stopped unexpectedly.") },
      });
    };
    worker.onmessageerror = () => {
      finish(runId, {
        status: "error",
        error: { stage: "runner", name: "Runner error", message: "The result couldn't be read." },
      });
    };

    worker.postMessage({ runId, nonce, code, rows, limits: LIMITS });
  }

  window.addEventListener("message", (event) => {
    if (event.source !== parentWindow) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "run") {
      if (isValidRun(data)) {
        startRun(data);
      } else if (typeof data.runId === "string") {
        send({
          type: "result",
          runId: data.runId.slice(0, 100),
          result: { status: "error", error: { stage: "runner", name: "Invalid request", message: "The run request was not valid." } },
        });
      }
    } else if (data.type === "cancel" && active && data.runId === active.runId) {
      finish(active.runId, { status: "cancelled" });
    }
  });

  send({ type: "ready" });
})();
