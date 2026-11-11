// Message handling of the app-side runner client, with a fake iframe.
// Real execution and isolation are covered by tests/e2e/runner.spec.js.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSandboxRunner, normaliseResult } from "../../src/runner/sandboxRunner.js";

let listeners;
let frames;

function fakeFrame() {
  const contentWindow = { posted: [], postMessage(message) { this.posted.push(message); } };
  return {
    contentWindow,
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    remove() {
      this.removed = true;
    },
  };
}

beforeEach(() => {
  listeners = [];
  frames = [];
  vi.stubGlobal("window", {
    addEventListener: (type, fn) => listeners.push(fn),
    removeEventListener: (type, fn) => (listeners = listeners.filter((l) => l !== fn)),
  });
  vi.stubGlobal("document", {
    createElement: () => {
      const frame = fakeFrame();
      frames.push(frame);
      return frame;
    },
    body: { appendChild: () => {} },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function deliver(frame, data, origin = "null") {
  for (const listener of listeners) listener({ source: frame.contentWindow, origin, data });
}

const ok = (output) => ({ status: "ok", resultType: "array", outputJson: JSON.stringify(output), logs: [], droppedLogs: 0 });

async function startedRun(runner, frame, code = "x") {
  const promise = runner.run(code, []);
  await Promise.resolve();
  await Promise.resolve();
  const { runId } = frame.contentWindow.posted.at(-1);
  return { promise, runId };
}

describe("sandbox runner client", () => {
  it("creates a sandboxed frame without same-origin access", () => {
    createSandboxRunner();
    expect(frames[0].attributes.sandbox).toBe("allow-scripts");
  });

  it("waits for the sandbox to be ready, then resolves the matching result", async () => {
    const runner = createSandboxRunner();
    const frame = frames[0];
    deliver(frame, { source: "data-detective-sandbox", type: "ready" });
    const { promise, runId } = await startedRun(runner, frame);
    deliver(frame, { source: "data-detective-sandbox", type: "result", runId, result: ok([1, 2]) });
    expect(await promise).toMatchObject({ status: "ok", output: [1, 2] });
  });

  it("ignores stale, foreign and malformed replies", async () => {
    const runner = createSandboxRunner();
    const frame = frames[0];
    deliver(frame, { source: "data-detective-sandbox", type: "ready" });
    const first = await startedRun(runner, frame, "first");
    const second = await startedRun(runner, frame, "second");
    expect(await first.promise).toMatchObject({ status: "cancelled" });

    let settled = false;
    second.promise.then(() => (settled = true));
    // A late reply for the first run must not resolve the second.
    deliver(frame, { source: "data-detective-sandbox", type: "result", runId: first.runId, result: ok(["old"]) });
    // Right run ID, but from the wrong origin or wrong window.
    deliver(frame, { source: "data-detective-sandbox", type: "result", runId: second.runId, result: ok(["x"]) }, "http://evil.example");
    for (const listener of listeners) {
      listener({ source: {}, origin: "null", data: { source: "data-detective-sandbox", type: "result", runId: second.runId, result: ok(["x"]) } });
    }
    deliver(frame, "not an object");
    await Promise.resolve();
    expect(settled).toBe(false);

    deliver(frame, { source: "data-detective-sandbox", type: "result", runId: second.runId, result: ok(["new"]) });
    expect(await second.promise).toMatchObject({ status: "ok", output: ["new"] });
  });

  it("restarts the sandbox if it stops answering", async () => {
    vi.useFakeTimers();
    const runner = createSandboxRunner({ timeoutMs: 500 });
    const frame = frames[0];
    deliver(frame, { source: "data-detective-sandbox", type: "ready" });
    const { promise } = await startedRun(runner, frame);
    await vi.advanceTimersByTimeAsync(3000);
    expect(await promise).toMatchObject({ status: "error", error: { name: "Runner unresponsive" } });
    expect(frame.removed).toBe(true);
    expect(frames).toHaveLength(2);
  });

  it("reports a sandbox that never starts", async () => {
    vi.useFakeTimers();
    const runner = createSandboxRunner();
    const promise = runner.run("x", []);
    await vi.advanceTimersByTimeAsync(9000);
    expect(await promise).toMatchObject({ status: "error", error: { name: "Runner unavailable" } });
  });
});

describe("normaliseResult", () => {
  it("rejects unreadable output", () => {
    expect(normaliseResult({ status: "ok", outputJson: "{bad" })).toMatchObject({ status: "error" });
    expect(normaliseResult(null)).toMatchObject({ status: "error" });
  });

  it("passes through timeouts and cancellations", () => {
    expect(normaliseResult({ status: "timeout", timeoutMs: 2000 })).toMatchObject({ status: "timeout" });
    expect(normaliseResult({ status: "cancelled" })).toMatchObject({ status: "cancelled" });
  });

  it.each([["array", "null"], ["object", '"date text"'], ["number", "null"]])("refuses %s results changed by serialization to %s", (resultType, outputJson) => {
    expect(normaliseResult({ status: "ok", resultType, outputJson })).toMatchObject({ status: "error", hasOutput: true, error: { stage: "result" } });
  });
});
