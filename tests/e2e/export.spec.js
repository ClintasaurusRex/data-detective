// Solutions with wrapper-like helper names and console logging must pass the
// browser checker, and their downloaded scripts must print the same records
// as valid JSON, with the logging on standard error.
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { check, openFresh, outputHeading, outputJson, run, setCode } from "./helpers.js";

const execNode = promisify(execFile);

const solutions = {
  "helpers named fs, runScript and fail": {
    code: `const fs = "not the file system";
function fail(row) {
  return row.status.trim().toLowerCase() !== "complete";
}
function runScript(rows) {
  return rows.filter(row => !fail(row));
}
function transform(rows) {
  return runScript(rows);
}
`,
    logs: [],
  },
  "logging at the top level and inside transform": {
    code: `console.log("loading my script");
function transform(rows) {
  console.log("rows received:", rows.length);
  return rows.filter(row => {
    console.log("checking", row.id);
    return row.status.trim().toLowerCase() === "complete";
  });
}
`,
    logs: ["loading my script", "rows received: 4", "checking J-104"],
  },
};

for (const [name, { code, logs }] of Object.entries(solutions)) {
  test(`export works for a solution with ${name}`, async ({ page }) => {
    await openFresh(page);
    await page.getByRole("button", { name: "Skip for now" }).click();
    await setCode(page, code);
    await run(page);
    await expect(outputHeading(page)).toHaveText("Output · 3 records");
    for (const text of logs) await expect(page.getByTestId("console-lines")).toContainText(text);
    const browserOutput = await outputJson(page);

    await check(page);
    await expect(page.getByTestId("check-summary")).toHaveText("All 7 checks passed.");

    const solved = page.getByTestId("solved-panel");
    const dir = await mkdtemp(join(tmpdir(), "data-detective-export-"));
    try {
      const [script] = await Promise.all([page.waitForEvent("download"), solved.getByRole("button", { name: "Download solve.mjs" }).click()]);
      await script.saveAs(join(dir, "solve.mjs"));
      const [sample] = await Promise.all([page.waitForEvent("download"), solved.getByRole("button", { name: "Download sample.json" }).click()]);
      await sample.saveAs(join(dir, "sample.json"));
      const { stdout, stderr } = await execNode(process.execPath, ["solve.mjs", "sample.json"], {
        cwd: dir,
        // Playwright sets FORCE_COLOR, which would add colour codes to logged numbers.
        env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
      });
      expect(JSON.parse(stdout)).toEqual(browserOutput);
      for (const text of logs) expect(stderr).toContain(text);
      if (!logs.length) expect(stderr).toBe("");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}
