// Real-browser checks of the code runner: feedback for broken code,
// recovery, and the isolation boundaries around learner code.
import http from "node:http";
import { expect, test } from "@playwright/test";
import { SOLUTION, openFresh, output, outputHeading, outputJson, run, setCode, skipPrediction, workbench } from "./helpers.js";

test.beforeEach(async ({ page }) => {
  await openFresh(page);
  await skipPrediction(page);
});

test("syntax errors give a line number, and the next valid run works", async ({ page }) => {
  await setCode(page, "function transform(rows) {\n  return rows.filter(row => )\n}");
  await run(page);
  await expect(output(page).getByTestId("run-error")).toContainText("Syntax error on line 2");
  await setCode(page, SOLUTION);
  await run(page);
  await expect(outputHeading(page)).toContainText("3 records");
});

test("thrown errors, wrong return types and a missing function are explained", async ({ page }) => {
  await setCode(page, "function transform(rows) {\n  const first = rows[10];\n  return first.status;\n}");
  await run(page);
  await expect(output(page).getByTestId("run-error")).toContainText("TypeError on line 3");
  await expect(output(page).getByTestId("run-error")).toContainText("Check the spelling");

  await setCode(page, 'function transform(rows) {\n  rows.filter(row => row.status === "complete");\n}');
  await run(page);
  await expect(output(page).getByTestId("run-error")).toContainText("returned nothing (undefined). Did you forget the word return?");

  await setCode(page, "function transform(rows) {\n  return rows.length;\n}");
  await run(page);
  await expect(output(page).getByTestId("run-error")).toContainText("returned a number, but the report needs an array");

  await setCode(page, "function report(rows) {\n  return rows;\n}");
  await run(page);
  await expect(output(page).getByTestId("run-error")).toContainText("Couldn't find a function named transform");
});

test("excessive console output and oversized results are bounded", async ({ page }) => {
  await setCode(page, 'function transform(rows) {\n  for (let i = 0; i < 100000; i++) console.log("line", i);\n  return [];\n}');
  await run(page);
  await expect(output(page).getByTestId("console-lines").locator("li")).toHaveCount(100);
  await expect(output(page).getByTestId("console-dropped")).toContainText("99900 more console messages were not shown");

  await setCode(page, "function transform(rows) {\n  return new Array(100000).fill(rows[0]);\n}");
  await run(page);
  await expect(output(page).getByTestId("run-error")).toContainText("transform returned 100000 items");
});

test("an infinite loop times out, and the app recovers without reloading", async ({ page }) => {
  await setCode(page, "function transform(rows) {\n  while (true) {}\n}");
  const started = Date.now();
  await run(page);
  expect(Date.now() - started).toBeLessThan(6000);
  await expect(output(page).getByTestId("run-error")).toContainText("still running after 2 seconds");
  await setCode(page, SOLUTION);
  await run(page);
  await expect(outputHeading(page)).toContainText("3 records");
});

test("Stop ends an infinite loop at once, and an old run never overwrites a newer one", async ({ page }) => {
  const bench = workbench(page);
  await setCode(page, "function transform(rows) {\n  while (true) {}\n}");
  await bench.getByRole("button", { name: "Run", exact: true }).click();
  await bench.getByRole("button", { name: "Stop" }).click();
  await expect(output(page).getByTestId("run-error")).toContainText("stopped before it finished");

  // A slow run that is stopped must not report later.
  await setCode(page, 'function transform(rows) {\n  const start = Date.now();\n  while (Date.now() - start < 1500) {}\n  return ["slow"];\n}');
  await bench.getByRole("button", { name: "Run", exact: true }).click();
  await bench.getByRole("button", { name: "Stop" }).click();
  await setCode(page, "function transform(rows) {\n  return rows.slice(0, 1);\n}");
  await run(page);
  await page.waitForTimeout(2000);
  await expect(outputHeading(page)).toContainText("1 record");
  await expect(output(page)).not.toContainText("slow");
});

test("running code can't change the case data", async ({ page }) => {
  await setCode(page, 'function transform(rows) {\n  rows.forEach(row => { row.status = "complete"; });\n  rows.push({ id: "J-999", status: "complete" });\n  return rows;\n}');
  await run(page);
  await expect(output(page)).toContainText("Your code changed the input rows");
  const evidence = page.getByRole("region", { name: "Job export: input rows" });
  await expect(evidence.locator("tbody tr")).toHaveCount(4);
  await expect(evidence).toContainText('" COMPLETE "');
  await setCode(page, "function transform(rows) {\n  return rows;\n}");
  await run(page);
  expect((await output(page).locator("tbody tr").allTextContents()).join("|")).toContain('" COMPLETE "');
});

test("a serialized array changing to null is explained without an unhandled error, and Run recovers", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await setCode(page, "function transform() { const result = []; result.toJSON = () => null; return result; }");
  await run(page);
  await expect(output(page).getByTestId("run-error")).toContainText("changed type during JSON conversion");
  expect(await outputJson(page)).toBeNull();
  await setCode(page, SOLUTION); await run(page);
  await expect(outputHeading(page)).toContainText("3 records");
  expect(errors).toEqual([]);
});

test("the actual sandbox host ignores a correct run ID with an incorrect worker nonce", async ({ page }) => {
  const frame = page.frames().find(f => f.url().endsWith("/sandbox.html"));
  await frame.evaluate(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(message, ...rest) {
        this.dispatchEvent(new MessageEvent("message", { data: {
          type: "done", runId: message.runId, nonce: "incorrect-nonce",
          status: "ok", resultType: "array", outputJson: "[]",
        } }));
        return super.postMessage(message, ...rest);
      }
    };
  });
  await setCode(page, SOLUTION); await run(page);
  await expect(outputHeading(page)).toContainText("3 records");
});

test.describe("isolation", () => {
  let server;
  let hits;
  let port;

  test.beforeAll(async () => {
    hits = [];
    server = http.createServer((req, res) => {
      hits.push(`${req.method} ${req.url}`);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end("[]");
    });
    server.on("upgrade", (req, socket) => {
      hits.push(`UPGRADE ${req.url}`);
      socket.destroy();
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = server.address().port;
  });

  test.afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test("learner code can't reach the network, the page, or stored progress", async ({ page }) => {
    // Control: the test server itself is reachable.
    const control = await fetch(`http://127.0.0.1:${port}/control`);
    expect(control.ok).toBe(true);
    hits.length = 0;

    await page.evaluate(() => localStorage.setItem("data-detective:secret-probe", "private"));
    const startUrl = page.url();
    let popups = 0;
    page.on("popup", () => popups++);

    const url = `http://127.0.0.1:${port}`;
    await setCode(
      page,
      `function transform(rows) {
  const report = [];
  const attempt = (name, fn) => {
    try { report.push(name + ": " + fn()); } catch (e) { report.push(name + ": blocked (" + e.name + ")"); }
  };
  attempt("document", () => typeof document);
  attempt("window", () => typeof window);
  attempt("parent", () => typeof parent);
  attempt("top", () => typeof top);
  attempt("localStorage", () => typeof localStorage);
  attempt("indexedDB", () => { indexedDB.open("probe"); return "opened"; });
  attempt("sync XHR", () => { const x = new XMLHttpRequest(); x.open("GET", "${url}/xhr", false); x.send(); return x.status; });
  attempt("fetch", () => { fetch("${url}/fetch").catch(() => {}); return "called"; });
  attempt("WebSocket", () => { new WebSocket("ws://127.0.0.1:${port}/ws").onerror = () => {}; return "created"; });
  attempt("EventSource", () => { new EventSource("${url}/es"); return "created"; });
  attempt("importScripts", () => { importScripts("${url}/script.js"); return "loaded"; });
  attempt("nested worker", () => { new Worker("${url}/worker.js"); return "created"; });
  attempt("open", () => typeof open);
  attempt("location", () => { location.href = "${url}/nav"; return "changed"; });
  attempt("origin", () => self.origin);
  const start = Date.now();
  while (Date.now() - start < 800) {}
  return report;
}`,
    );
    await run(page);
    const text = (await outputJson(page)).join("\n");
    expect(text).toContain("document: undefined");
    expect(text).toContain("window: undefined");
    expect(text).toContain("parent: undefined");
    expect(text).toContain("top: undefined");
    expect(text).toContain("localStorage: undefined");
    expect(text).toContain("indexedDB: blocked (SecurityError)");
    expect(text).toContain("sync XHR: blocked (NetworkError)");
    expect(text).toContain("importScripts: blocked (NetworkError)");
    expect(text).toContain("nested worker: blocked (SecurityError)");
    expect(text).toContain("open: undefined");
    expect(text).toContain("origin: null");

    await page.waitForTimeout(1000);
    expect(hits).toEqual([]);
    expect(page.url()).toBe(startUrl);
    expect(popups).toBe(0);
    expect(await page.evaluate(() => localStorage.getItem("data-detective:secret-probe"))).toBe("private");
  });

  test("the sandbox frame itself is cut off from the app", async ({ page }) => {
    const frame = page.frames().find((f) => f.url().endsWith("/sandbox.html"));
    expect(frame).toBeTruthy();
    const startUrl = page.url();
    const result = await frame.evaluate((testUrl) => {
      const out = {};
      const attempt = (name, fn) => {
        try {
          out[name] = fn();
        } catch (e) {
          out[name] = `blocked (${e.name})`;
        }
      };
      attempt("parentDocument", () => typeof window.parent.document);
      attempt("parentStorage", () => window.parent.localStorage.length);
      attempt("ownStorage", () => localStorage.length);
      attempt("cookie", () => document.cookie);
      attempt("open", () => String(window.open("about:blank")));
      attempt("topNavigation", () => {
        window.top.location.href = testUrl;
        return "attempted";
      });
      attempt("origin", () => window.origin);
      return out;
    }, `http://127.0.0.1:${port}/top`);
    expect(result.parentDocument).toBe("blocked (SecurityError)");
    expect(result.parentStorage).toBe("blocked (SecurityError)");
    expect(result.ownStorage).toBe("blocked (SecurityError)");
    expect(result.cookie).toBe("blocked (SecurityError)");
    expect(result.open).toBe("null");
    expect(result.origin).toBe("null");
    await page.waitForTimeout(500);
    expect(page.url()).toBe(startUrl);
    expect(hits.filter((h) => h.includes("/top"))).toEqual([]);
  });

  test("the app page blocks inline scripts and string eval; only the sandbox allows eval", async ({ page }) => {
    // DevTools evaluation itself bypasses CSP, so these probes run the code
    // through the page's own script and timer machinery instead.
    const probe = async () => {
      window.__probe = [];
      const script = document.createElement("script");
      script.textContent = 'window.__probe.push("inline script")';
      document.body.append(script);
      setTimeout('window.__probe.push("string timer")', 0);
      await new Promise((resolve) => setTimeout(resolve, 300));
      return window.__probe;
    };
    expect(await page.evaluate(probe)).toEqual([]);
    const frame = page.frames().find((f) => f.url().endsWith("/sandbox.html"));
    expect(await frame.evaluate(probe)).toEqual(["string timer"]);
  });
});
