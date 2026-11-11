import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { twoExportsCase } from "../../src/missions/twoExports.js";
import { independentSolution } from "../support/twoExports.js";
import { check, outputJson, run, setCode, workbench } from "./helpers.js";

const exercise = twoExportsCase.exercises[0];
const ID = exercise.id;
const fileNames = ["reconcile.mjs", "orders.json", "field-reports.json", "README.md"];
const execNode = promisify(execFile);
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem("data-detective:v1")));
async function openCase(page) {
  await page.goto("./#/case/two-exports");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page.locator("main")).toContainText("last passing solution as a two-file Node tool");
}

for (const [name, solution] of [["Map", exercise.solution.code], ["per-occurrence", independentSolution]]) {
  test(`${name}: actual downloads match complete production browser reports on all 20 datasets`, async ({ page }) => {
    await openCase(page);
    const code = `const fs = 1, Console = 2, rows = 3, report = 4, json = 5;
function runScript() {} function fileProblem() {} function validateTwoExportsReport() {}
console.log("loading checked code"); globalThis.console.info("global log");
${solution.replace("function reconcile(orders, fieldReports) {", 'function reconcile(orders, fieldReports) { console.warn("building audit");')}`;
    await setCode(page, code, ID);
    await page.evaluate(() => {
      window.__reconciliationParity = [];
      window.addEventListener("message", event => {
        const frame = document.querySelector('iframe[title="Code runner"]');
        if (event.source !== frame?.contentWindow || event.origin !== "null") return;
        const data = event.data;
        if (data?.source === "data-detective-sandbox" && data.type === "result" && data.result?.outputJson) {
          window.__reconciliationParity.push(JSON.parse(data.result.outputJson));
        }
      });
    });
    await check(page, ID);
    await expect(page.getByTestId("check-summary")).toHaveText("All 20 checks passed.");
    const browserReports = await page.evaluate(() => window.__reconciliationParity);
    expect(browserReports).toHaveLength(20);
    const dir = await mkdtemp(join(tmpdir(), "reconciliation-browser-download-"));
    try {
      const entry = page.getByTestId(`toolbox-${ID}`);
      for (const name of fileNames) {
        const pending = page.waitForEvent("download");
        await entry.getByRole("button", { name: `Download ${name}`, exact: true }).click();
        const download = await pending;
        expect(download.suggestedFilename()).toBe(name);
        await download.saveAs(join(dir, name));
      }
      const script = await readFile(join(dir, fileNames[0]), "utf8");
      expect(script).toContain(code);
      expect(script).not.toContain("DEC-99");
      expect(JSON.parse(await readFile(join(dir, fileNames[1]), "utf8"))).toEqual(exercise.orders);
      expect(JSON.parse(await readFile(join(dir, "field-reports.json"), "utf8"))).toEqual(exercise.fieldReports);
      const guide = (await readFile(join(dir, "README.md"), "utf8")).replace(/\s+/g, " ");
      for (const concept of ["Node.js 24", "normal filesystem permissions", "ambiguous", "differences", "stdout", "stderr", "another-orders.json", "source-scoped"]) expect(guide).toContain(concept);
      for (const [index, dataset] of exercise.checks.entries()) {
        const input = JSON.stringify(dataset.orders, null, 2) + "\n";
        const fields = JSON.stringify(dataset.fieldReports, null, 2) + "\n";
        await writeFile(join(dir, "fields.json"), fields);
        await writeFile(join(dir, "input.json"), input);
        const result = await execNode(process.execPath, ["reconcile.mjs", "input.json", "fields.json"], {
          cwd: dir, timeout: 10000, env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1", NODE_PATH: "" },
        });
        const report = JSON.parse(result.stdout);
        expect(report, dataset.name).toEqual(browserReports[index]);
        const originals = {
          orders: [...report.agreed.map(p=>p.order), ...report.onlyOrders, ...report.differences.map(p=>p.order), ...report.ambiguous.flatMap(g=>g.orders)],
          fieldReports: [...report.agreed.map(p=>p.fieldReport), ...report.onlyFieldReports, ...report.differences.map(p=>p.fieldReport), ...report.ambiguous.flatMap(g=>g.fieldReports)],
        };
        for (const source of ["orders", "fieldReports"]) expect(originals[source].sort((a,b)=>a.line-b.line)).toEqual(dataset[source]);
        expect(await readFile(join(dir, "fields.json"), "utf8")).toBe(fields);
        expect(await readFile(join(dir, "input.json"), "utf8")).toBe(input);
        for (const message of ["loading checked code", "global log", "building audit"]) expect(result.stderr).toContain(message);
      }
      const savedReport = await execNode(process.execPath, ["reconcile.mjs", "orders.json", "field-reports.json", "report.json"], { cwd: dir });
      expect(savedReport.stdout).toBe("");
      expect(JSON.parse(await readFile(join(dir, "report.json"), "utf8"))).toEqual(browserReports[0]);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
}

test("neither a correct Run nor a hardcoded sample Run/check unlocks downloads", async ({ page }) => {
  await openCase(page);
  await setCode(page, independentSolution, ID); await run(page, ID);
  const sample = await outputJson(page, ID);
  await expect(page.getByRole("button", { name: /Download/ })).toHaveCount(0);
  await setCode(page, `function reconcile() { return ${JSON.stringify(sample)}; }`, ID);
  await run(page, ID);
  await expect(page.getByRole("button", { name: /Download/ })).toHaveCount(0);
  await check(page, ID);
  await expect(page.getByTestId("check-panel")).toContainText("a different week needs attention");
  await expect(page.getByTestId("solved-panel")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Download/ })).toHaveCount(0);
  await expect.poll(async () => (await saved(page))?.exercises[ID]?.checked?.passed).toBe(false);
  await page.reload();
  await page.getByRole("link", { name: "Toolbox (0)" }).click();
  await expect(page.locator("main")).toContainText("JSON tools for Cases 1, 3 and 4");
  await expect(page.getByTestId(`toolbox-${ID}`)).toHaveCount(0);
});

test("failed checks, edits, cancellation and refresh preserve the last passing download", async ({ page }) => {
  await openCase(page); await setCode(page, independentSolution, ID); await check(page, ID);
  const draft = "function reconcile() { return {}; } // unchecked edit";
  await setCode(page, draft, ID);
  const editedDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download reconcile.mjs", exact: true }).click();
  const editedScript = await readFile(await (await editedDownload).path(), "utf8");
  expect(editedScript).toContain(independentSolution); expect(editedScript).not.toContain("unchecked edit");
  await check(page, ID);
  await expect.poll(async () => (await saved(page))?.exercises[ID]?.checked?.passed).toBe(false);
  await setCode(page, "function reconcile() { while (true) {} }", ID);
  await workbench(page, ID).getByRole("button", { name: "Check solution" }).click();
  await workbench(page, ID).getByRole("button", { name: "Stop", exact: true }).click();
  await expect(workbench(page, ID).getByRole("region", { name: "Check results", exact: true })).toContainText("stopped before it finished");
  await setCode(page, draft, ID);
  await expect.poll(async () => (await saved(page))?.exercises[ID]?.draft).toBe(draft);
  const before = (await saved(page)).exercises[ID];
  expect(before.solved.code).toBe(independentSolution);
  expect(before.checked.passed).toBe(false);
  await page.reload();
  await expect(page.getByTestId(`editor-${ID}`)).toHaveValue(draft);
  await page.getByRole("link", { name: "Toolbox (1)" }).click();
  const entry = page.getByTestId(`toolbox-${ID}`);
  await expect(entry.getByLabel(`Checked code for ${exercise.title}`)).toHaveText(independentSolution);
  const pending = page.waitForEvent("download");
  await entry.getByRole("button", { name: "Download reconcile.mjs", exact: true }).click();
  const script = await readFile(await (await pending).path(), "utf8");
  expect(script).toContain(independentSolution); expect(script).not.toContain("unchecked edit");
  expect((await saved(page)).exercises[ID]).toEqual(before);
});

test("editing during checks saves the code being checked and visibly marks the new draft stale", async ({ page }) => {
  await openCase(page);
  const checkedCode = independentSolution.replace('const agreed=[]', 'const until = Date.now() + 80; while(Date.now() < until) {} const agreed=[]');
  await setCode(page, checkedCode, ID);
  await workbench(page, ID).getByRole("button", { name: "Check solution" }).click();
  const draft = "function reconcile() { return {}; } // edited during checking";
  await setCode(page, draft, ID);
  await expect(page.getByTestId("check-summary")).toHaveText("All 20 checks passed.");
  await expect(page.getByTestId("case-status")).toHaveText("Needs checking again");
  await expect(page.getByTestId("check-panel")).toContainText("earlier version of your code");
  await expect(page.getByTestId(`toolbox-${ID}`).getByLabel(`Checked code for ${exercise.title}`)).toHaveText(checkedCode);
  await expect.poll(async () => (await saved(page))?.exercises[ID]?.solved?.code).toBe(checkedCode);
});

for (const [width, height] of [[1920, 1080], [1366, 768], [375, 740]]) {
  test(`Reconciliation Toolbox downloads and instructions work by keyboard at ${width}px`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.setViewportSize({ width, height }); await page.emulateMedia({ reducedMotion: "reduce" });
    await openCase(page); await setCode(page, independentSolution, ID); await check(page, ID);
    await page.getByRole("link", { name: "Toolbox (1)" }).focus(); await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    await expect(page.locator("main")).toContainText("Case 4 reconciles two separate JSON exports");
    const entry = page.getByTestId(`toolbox-${ID}`);
    await entry.getByRole("button", { name: "Download reconcile.mjs", exact: true }).focus();
    for (const name of fileNames) {
      const button = entry.getByRole("button", { name: `Download ${name}`, exact: true });
      await expect(button).toBeFocused();
      expect(await button.evaluate(el => getComputedStyle(el).outlineStyle + " " + getComputedStyle(el).outlineWidth)).toBe("solid 3px");
      const pending = page.waitForEvent("download"); await page.keyboard.press("Enter");
      expect((await pending).suggestedFilename()).toBe(name);
      const box = await button.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.height).toBeGreaterThanOrEqual(40);
      await page.keyboard.press("Tab");
    }
    const summary = entry.locator("summary");
    await expect(summary).toBeFocused(); await page.keyboard.press("Enter");
    await expect(entry.locator("details")).toHaveAttribute("open", "");
    await expect(entry).toContainText("node reconcile.mjs orders.json field-reports.json report.json");
    await expect(entry).toContainText("Only run code you trust");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (test.info().project.name === "desktop-chromium") {
      await page.screenshot({ path: `/tmp/data-detective-case4-toolbox-${width}.png`, fullPage: true });
    }
    await page.keyboard.press("Enter"); await expect(entry.locator("details")).not.toHaveAttribute("open");
    expect(errors).toEqual([]);
  });
}
