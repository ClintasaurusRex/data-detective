import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { messyExportCase } from "../../src/missions/messyExport.js";
import { datasets } from "../../src/missions/messyExport.fixtures.js";
import { check, setCode, workbench } from "./helpers.js";
import { installCsvParser } from "../support/csvWorkflow.js";

const exercise = messyExportCase.exercises[0];
const ID = exercise.id;
const files = ["report.mjs", "parseCsv.mjs", "contract.mjs", "package.json", "jobs-export.csv", "README.md"];
const execNode = promisify(execFile);
// These declarations intentionally share runner names. Both lexical and global
// console calls must stay off stdout in the exported process.
const code = `const fs = "helper", parsed = "helper", json = "helper";
function runScript() {} function fileProblem() {}
console.log("loading checked code");
globalThis.console.info("global log");
${exercise.solution.code.replace("const accepted = [];", 'console.warn("validating rows"); const accepted = [];')}`;

async function openCase(page) {
  await page.goto("./#/case/messy-export");
  await page.getByRole("button", { name: "Skip for now" }).click();
}

async function downloadAll(page, entry, dir) {
  for (const name of files) {
    const promise = page.waitForEvent("download");
    await entry.getByRole("button", { name: `Download ${name}`, exact: true }).click();
    const download = await promise;
    expect(download.suggestedFilename()).toBe(name);
    await download.saveAs(join(dir, name));
  }
}

test("downloads actual checked CSV files and matches browser worker output on all 13 datasets", async ({ page }) => {
  await openCase(page);
  await expect(page.getByRole("button", { name: /Download/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Toolbox (0)" }).click();
  await expect(page.getByRole("main")).toContainText("Nothing downloadable yet");
  await page.goBack();
  await setCode(page, code, ID);
  // Observe actual checker replies from the unchanged production sandbox.
  // Every check runs in a fresh worker. No substitute browser evaluator.
  await page.evaluate(() => {
    window.__csvParityResults = [];
    window.addEventListener("message", event => {
      const frame = document.querySelector('iframe[title="Code runner"]');
      if (event.source !== frame?.contentWindow || event.origin !== "null") return;
      const data = event.data;
      if (data?.source === "data-detective-sandbox" && data.type === "result" && data.result?.outputJson) {
        window.__csvParityResults.push(JSON.parse(data.result.outputJson));
      }
    });
  });
  await check(page, ID);
  await expect(page.getByTestId("check-summary")).toHaveText("All 13 checks passed.");
  const browserResults = await page.evaluate(() => window.__csvParityResults);
  expect(browserResults).toHaveLength(13);
  const entry = page.getByTestId(`toolbox-${ID}`);
  await expect(entry).toBeVisible();
  const dir = await mkdtemp(join(tmpdir(), "csv-browser-download-"));
  try {
    await downloadAll(page, entry, dir);
    expect(await readFile(join(dir, "report.mjs"), "utf8")).toContain(code);
    expect(await readFile(join(dir, "parseCsv.mjs"), "utf8")).toBe(await readFile("src/csv/parseCsv.js", "utf8"));
    expect(await readFile(join(dir, "contract.mjs"), "utf8")).toBe((await readFile("src/missions/messyExport.contract.js", "utf8")).replace('"../csv/parseCsv.js"', '"./parseCsv.mjs"'));
    expect(await readFile(join(dir, "jobs-export.csv"), "utf8")).toBe(exercise.csv);
    expect(JSON.parse(await readFile(join(dir, "package.json"), "utf8")).dependencies).toEqual({ papaparse: "5.7.0" });
    const guide = await readFile(join(dir, "README.md"), "utf8");
    for (const concept of ["npm install", "readFile", "stdout", "stderr", "permissions", "another-export.csv", "exit code"]) expect(guide).toContain(concept);
    await installCsvParser(dir);
    let index = 0;
    for (const dataset of Object.values(datasets)) {
      await writeFile(join(dir, "input.csv"), dataset.csv);
      const result = await execNode(process.execPath, ["report.mjs", "input.csv"], {
        cwd: dir, env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1", NODE_PATH: "" },
      });
      const report = JSON.parse(result.stdout);
      expect(report, dataset.name).toEqual(browserResults[index++]);
      expect(report.accepted).toEqual(dataset.expected.accepted);
      for (const message of ["loading checked code", "global log", "validating rows"]) expect(result.stderr).toContain(message);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("Toolbox exports the earlier passing code after failed checks, draft changes, refresh and navigation", async ({ page }) => {
  await openCase(page);
  await setCode(page, exercise.solution.code, ID);
  await check(page, ID);
  const draft = 'function transform() { return { accepted: [], rejected: [] }; } // unchecked draft';
  await setCode(page, draft, ID);
  await check(page, ID);
  await expect(page.getByTestId("case-status")).toHaveText("Needs checking again");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("data-detective:v1"))?.exercises["messy-export"]?.checked?.passed)).toBe(false);
  await page.reload();
  await expect(page.getByTestId(`editor-${ID}`)).toHaveValue(draft);
  await page.getByRole("link", { name: "Toolbox (1)" }).click();
  const entry = page.getByTestId(`toolbox-${ID}`);
  await expect(entry.getByLabel(`Checked code for ${exercise.title}`)).toHaveText(exercise.solution.code);
  const pending = page.waitForEvent("download");
  await entry.getByRole("button", { name: "Download report.mjs", exact: true }).click();
  const download = await pending;
  const script = await readFile(await download.path(), "utf8");
  expect(script).toContain(exercise.solution.code);
  expect(script).not.toContain("unchecked draft");
  await page.getByRole("complementary").getByRole("link", { name: /The Missing Jobs/ }).click();
  await expect(page.getByTestId("editor-missing-jobs")).toBeVisible();
  await page.getByRole("complementary").getByRole("link", { name: /The Messy Export/ }).click();
  await expect(page.getByTestId(`editor-${ID}`)).toHaveValue(draft);
});

for (const [width, height] of [[1920, 1080], [1366, 768], [375, 740]]) {
  test(`CSV downloads and expanded instructions fit and work by keyboard at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openCase(page);
    await setCode(page, exercise.solution.code, ID);
    const checkButton = workbench(page, ID).getByRole("button", { name: "Check solution" });
    await checkButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("check-summary")).toHaveText("All 13 checks passed.");
    const toolboxLink = page.getByRole("link", { name: "Toolbox (1)" });
    await toolboxLink.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    const entry = page.getByTestId(`toolbox-${ID}`);
    await entry.getByRole("button", { name: "Download report.mjs", exact: true }).focus();
    for (const file of files) {
      const button = entry.getByRole("button", { name: `Download ${file}`, exact: true });
      await expect(button).toBeFocused();
      const pending = page.waitForEvent("download");
      await page.keyboard.press("Enter");
      expect((await pending).suggestedFilename()).toBe(file);
      const box = await button.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      await page.keyboard.press("Tab");
    }
    const summary = entry.locator("summary");
    await expect(summary).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(entry.locator("details")).toHaveAttribute("open", "");
    await expect(entry).toContainText("npm install");
    await expect(entry).toContainText("node report.mjs jobs-export.csv report.json");
    await expect(entry).toContainText("Only run code you trust");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press("Enter");
    await expect(entry.locator("details")).not.toHaveAttribute("open");
  });
}
