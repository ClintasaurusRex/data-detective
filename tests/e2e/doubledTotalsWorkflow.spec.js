import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { doubledTotalsCase } from "../../src/missions/doubledTotals.js";
import { independentSolution } from "../support/doubledTotals.js";
import { check, outputJson, run, setCode, workbench } from "./helpers.js";

const exercise = doubledTotalsCase.exercises[0];
const ID = exercise.id;
const fileNames = ["deduplicate.mjs", "jobs-cleaned.json", "README.md"];
const execNode = promisify(execFile);
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem("data-detective:v1")));
async function openCase(page) {
  await page.goto("./#/case/doubled-totals");
  await page.getByRole("button", { name: "Skip for now" }).click();
}

for (const [name, solution] of [["Map", exercise.solution.code], ["per-occurrence", independentSolution]]) {
  test(`${name}: actual downloads match complete production browser reports on all 17 datasets`, async ({ page }) => {
    await openCase(page);
    const code = `const fs = 1, Console = 2, rows = 3, report = 4, json = 5;
function runScript() {} function fileProblem() {} function validateDoubledTotalsReport() {}
console.log("loading checked code"); globalThis.console.info("global log");
${solution.replace("const kept =", 'console.warn("building audit"); const kept =')}`;
    await setCode(page, code, ID);
    await page.evaluate(() => {
      window.__doubledParity = [];
      window.addEventListener("message", event => {
        const frame = document.querySelector('iframe[title="Code runner"]');
        if (event.source !== frame?.contentWindow || event.origin !== "null") return;
        const data = event.data;
        if (data?.source === "data-detective-sandbox" && data.type === "result" && data.result?.outputJson) {
          window.__doubledParity.push(JSON.parse(data.result.outputJson));
        }
      });
    });
    await check(page, ID);
    await expect(page.getByTestId("check-summary")).toHaveText("All 17 checks passed.");
    const browserReports = await page.evaluate(() => window.__doubledParity);
    expect(browserReports).toHaveLength(17);
    const dir = await mkdtemp(join(tmpdir(), "doubled-browser-download-"));
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
      expect(script).not.toContain("NEW-90");
      expect(JSON.parse(await readFile(join(dir, fileNames[1]), "utf8"))).toEqual(exercise.rows);
      const guide = (await readFile(join(dir, "README.md"), "utf8")).replace(/\s+/g, " ");
      for (const concept of ["Node.js 24", "normal filesystem permissions", "totalHours", "conflicts", "stdout", "stderr", "another-week.json", "source provenance"]) expect(guide).toContain(concept);
      for (const [index, dataset] of exercise.checks.entries()) {
        const input = JSON.stringify(dataset.rows, null, 2) + "\n";
        await writeFile(join(dir, "input.json"), input);
        const result = await execNode(process.execPath, ["deduplicate.mjs", "input.json"], {
          cwd: dir, timeout: 10000, env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1", NODE_PATH: "" },
        });
        const report = JSON.parse(result.stdout);
        expect(report, dataset.name).toEqual(browserReports[index]);
        const originals = [...report.kept, ...report.duplicates.map(entry => entry.record), ...report.conflicts.flatMap(group => group.records)];
        expect(originals.sort((a, b) => a.line - b.line), dataset.name).toEqual(dataset.rows);
        expect(await readFile(join(dir, "input.json"), "utf8")).toBe(input);
        for (const message of ["loading checked code", "global log", "building audit"]) expect(result.stderr).toContain(message);
      }
      const savedReport = await execNode(process.execPath, ["deduplicate.mjs", "jobs-cleaned.json", "report.json"], { cwd: dir });
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
  await setCode(page, `function transform() { return ${JSON.stringify(sample)}; }`, ID);
  await run(page, ID);
  await expect(page.getByRole("button", { name: /Download/ })).toHaveCount(0);
  await check(page, ID);
  await expect(page.getByTestId("check-panel")).toContainText("another week needs attention");
  await expect(page.getByTestId("solved-panel")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Download/ })).toHaveCount(0);
  await expect.poll(async () => (await saved(page))?.exercises[ID]?.checked?.passed).toBe(false);
  await page.reload();
  await page.getByRole("link", { name: "Toolbox (0)" }).click();
  await expect(page.getByTestId(`toolbox-${ID}`)).toHaveCount(0);
});

test("failed checks, edits, cancellation and refresh preserve the last passing download", async ({ page }) => {
  await openCase(page); await setCode(page, independentSolution, ID); await check(page, ID);
  const draft = "function transform() { return {}; } // unchecked edit";
  await setCode(page, draft, ID); await check(page, ID);
  await setCode(page, "function transform() { while (true) {} }", ID);
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
  await entry.getByRole("button", { name: "Download deduplicate.mjs", exact: true }).click();
  const script = await readFile(await (await pending).path(), "utf8");
  expect(script).toContain(independentSolution); expect(script).not.toContain("unchecked edit");
  expect((await saved(page)).exercises[ID]).toEqual(before);
});

test("editing during checks saves the code being checked and visibly marks the new draft stale", async ({ page }) => {
  await openCase(page);
  const checkedCode = independentSolution.replace("const kept =", "const until = Date.now() + 80; while(Date.now() < until) {} const kept =");
  await setCode(page, checkedCode, ID);
  await workbench(page, ID).getByRole("button", { name: "Check solution" }).click();
  const draft = "function transform() { return {}; } // edited during checking";
  await setCode(page, draft, ID);
  await expect(page.getByTestId("check-summary")).toHaveText("All 17 checks passed.");
  await expect(page.getByTestId("case-status")).toHaveText("Needs checking again");
  await expect(page.getByTestId("check-panel")).toContainText("earlier version of your code");
  await expect(page.getByTestId(`toolbox-${ID}`).getByLabel(`Checked code for ${exercise.title}`)).toHaveText(checkedCode);
  await expect.poll(async () => (await saved(page))?.exercises[ID]?.solved?.code).toBe(checkedCode);
});

for (const [width, height] of [[1920, 1080], [1366, 768], [375, 740]]) {
  test(`JSON Toolbox downloads and instructions work by keyboard at ${width}px`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.setViewportSize({ width, height }); await page.emulateMedia({ reducedMotion: "reduce" });
    await openCase(page); await setCode(page, independentSolution, ID); await check(page, ID);
    await page.getByRole("link", { name: "Toolbox (1)" }).focus(); await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    const entry = page.getByTestId(`toolbox-${ID}`);
    await entry.getByRole("button", { name: "Download deduplicate.mjs", exact: true }).focus();
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
    await expect(entry).toContainText("node deduplicate.mjs jobs-cleaned.json report.json");
    await expect(entry).toContainText("Only run code you trust");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press("Enter"); await expect(entry.locator("details")).not.toHaveAttribute("open");
    expect(errors).toEqual([]);
  });
}
