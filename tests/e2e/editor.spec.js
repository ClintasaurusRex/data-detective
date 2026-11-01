// Editor size, word wrap and "Copy to IDE", for the main exercise and the
// variation (both use the same Workbench component).
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { MAIN, SOLUTION, VARIATION, check, openFresh, output, outputHeading, run, setCode, workbench } from "./helpers.js";

const execNode = promisify(execFile);

const LONG_DRAFT = `function transform(rows) {
  // A deliberately long comment line so that word wrap has something to wrap, because this line is much wider than the editor itself.
  return rows.filter(row => row.status.trim().toLowerCase() === "complete");
}
`;

async function savedState(page) {
  return page.evaluate(() => localStorage.getItem("data-detective:v1"));
}

test("expanding and restoring the editor keeps the draft, results and controls", async ({ page }) => {
  await openFresh(page);
  await page.getByRole("button", { name: "Skip for now" }).click();
  await setCode(page, LONG_DRAFT);
  await run(page);
  await expect(outputHeading(page)).toHaveText("Output · 3 records");

  const bench = workbench(page);
  const grid = page.getByTestId(`workbench-grid-${MAIN}`);
  const editor = page.getByTestId(`editor-${MAIN}`);
  const before = await editor.boundingBox();
  const outputBefore = await output(page).boundingBox();
  expect(outputBefore.x).toBeGreaterThan(before.x + before.width); // side by side on desktop

  await bench.getByRole("button", { name: "Expand editor" }).click();
  await expect(grid).toHaveAttribute("data-expanded", "true");
  const expanded = await editor.boundingBox();
  const gridBox = await grid.boundingBox();
  expect(expanded.width).toBeGreaterThan(gridBox.width - 4);
  expect(expanded.height).toBeGreaterThan(before.height * 1.8);
  const outputExpanded = await output(page).boundingBox();
  expect(outputExpanded.y).toBeGreaterThan(expanded.y + expanded.height); // results underneath
  await expect(editor).toHaveValue(LONG_DRAFT);
  await expect(outputHeading(page)).toHaveText("Output · 3 records");
  expect(await editor.evaluate((el) => getComputedStyle(el).resize)).toBe("vertical");

  // Run, Check and Stop still work while expanded.
  await run(page);
  await check(page);
  await expect(page.getByTestId("check-summary")).toHaveText("All 7 checks passed.");
  await setCode(page, "function transform(rows) {\n  while (true) {}\n}\n");
  await bench.getByRole("button", { name: "Run", exact: true }).click();
  await bench.getByRole("button", { name: "Stop" }).click();
  await expect(output(page).getByTestId("run-error")).toContainText("stopped before it finished");
  await setCode(page, LONG_DRAFT);
  await page.waitForTimeout(400); // let the debounced save finish
  const stored = await savedState(page);

  await bench.getByRole("button", { name: "Restore editor size" }).click();
  await expect(grid).toHaveAttribute("data-expanded", "false");
  await expect(editor).toHaveValue(LONG_DRAFT);
  await expect(page.getByTestId("check-summary")).toHaveText("All 7 checks passed.");
  expect((await editor.boundingBox()).height).toBeLessThan(expanded.height);
  await page.waitForTimeout(400);
  expect(await savedState(page)).toBe(stored);
  await expect(page.getByTestId("case-status")).toHaveText("Solved");

  await page.reload();
  await expect(page.getByTestId(`editor-${MAIN}`)).toHaveValue(LONG_DRAFT);
});

test("word wrap changes only the display, and the controls work from the keyboard", async ({ page }) => {
  await openFresh(page);
  await setCode(page, LONG_DRAFT);
  const editor = page.getByTestId(`editor-${MAIN}`);
  const bench = workbench(page);
  const unwrappedHeight = await editor.evaluate((el) => el.scrollHeight);
  expect(await editor.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);

  // Keyboard: Space toggles the checkbox, Enter presses buttons.
  const wrap = bench.getByLabel("Wrap long lines");
  await wrap.focus();
  await page.keyboard.press("Space");
  await expect(wrap).toBeChecked();
  expect(await editor.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe("pre-wrap");
  expect(await editor.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await editor.evaluate((el) => el.scrollHeight)).toBeGreaterThan(unwrappedHeight);
  await expect(editor).toHaveValue(LONG_DRAFT); // no line breaks inserted

  await page.keyboard.press("Space");
  await expect(wrap).not.toBeChecked();
  await expect(editor).toHaveValue(LONG_DRAFT);

  const expand = bench.getByRole("button", { name: "Expand editor" });
  await expand.focus();
  await page.keyboard.press("Enter");
  const restore = bench.getByRole("button", { name: "Restore editor size" });
  await expect(restore).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(bench.getByRole("button", { name: "Expand editor" })).toBeFocused();
  await expect(editor).toHaveValue(LONG_DRAFT);
});

test.describe("narrow screen", () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test("the editor controls fit and expanding causes no sideways scroll", async ({ page }) => {
    await openFresh(page);
    const bench = workbench(page);
    for (const name of ["Expand editor", "Copy to IDE"]) {
      const box = await bench.getByRole("button", { name }).boundingBox();
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }
    const wrapBox = await bench.getByLabel("Wrap long lines").boundingBox();
    expect(wrapBox.x + wrapBox.width).toBeLessThanOrEqual(375);
    await bench.getByRole("button", { name: "Expand editor" }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const name of ["Run", "Check solution", "Restore editor size"]) {
      const box = await bench.getByRole("button", { name, exact: true }).boundingBox();
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }
  });
});

test.describe("Copy to IDE", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("copies a runnable challenge.js without running code or changing progress", async ({ page }) => {
    await openFresh(page);
    const draft = 'function transform(rows) {\n  // my "draft" with `backticks`\n  return rows.filter(row => row.status === "Complete");\n}\n';
    await setCode(page, draft);
    const bench = workbench(page);
    await page.waitForTimeout(400); // let the debounced save finish
    const stored = await savedState(page);

    await bench.getByRole("button", { name: "Copy to IDE" }).click();
    await expect(bench.getByTestId("copy-success")).toContainText("Copied!");
    await expect(bench.getByTestId("copy-success")).toContainText("challenge.js");

    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain(draft);
    expect(text).toContain("Exercise: Find the completed jobs");
    expect(text).toContain('"status": " COMPLETE "');
    expect(text).not.toContain("trim().toLowerCase()");

    // Nothing ran, and the draft and progress are unchanged.
    await expect(bench).toHaveAttribute("data-runs", "0");
    await expect(bench).toHaveAttribute("data-checks", "0");
    await expect(page.getByTestId(`editor-${MAIN}`)).toHaveValue(draft);
    await page.waitForTimeout(400);
    expect(await savedState(page)).toBe(stored);
    await expect(page.getByTestId("prediction")).toContainText("How many job records");

    const dir = await mkdtemp(join(tmpdir(), "data-detective-ide-"));
    try {
      await writeFile(join(dir, "challenge.js"), text);
      const { stdout } = await execNode(process.execPath, ["challenge.js"], { cwd: dir, env: { ...process.env, FORCE_COLOR: "0" } });
      expect(stdout.split("\n")[0]).toBe("transform(caseSampleRows) returned:");
      expect(JSON.parse(stdout.split("\n").slice(1).join("\n"))).toEqual([{ id: "J-101", status: "Complete" }]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("the variation copies its own open-jobs challenge", async ({ page }) => {
    await openFresh(page);
    await page.getByRole("button", { name: "Skip for now" }).click();
    await setCode(page, SOLUTION);
    await check(page);
    const bench = workbench(page, VARIATION);
    await bench.getByRole("button", { name: "Copy to IDE" }).click();
    await expect(bench.getByTestId("copy-success")).toBeVisible();
    const text = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\n\/\/\s+/g, " ");
    expect(text).toContain("Exercise: Variation: the open jobs");
    expect(text).toContain("A job is open when its status is open");
    expect(text).toContain("// Return the jobs that are still open.");
    expect(text).not.toContain('=== "open"');
  });
});

test("if the clipboard is blocked, the file is shown selected for manual copying", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new DOMException("Denied", "NotAllowedError")) },
    });
  });
  await openFresh(page);
  await setCode(page, LONG_DRAFT);
  const bench = workbench(page);
  await bench.getByRole("button", { name: "Copy to IDE" }).click();
  const fallback = bench.getByTestId("copy-fallback");
  await expect(fallback).toContainText("didn’t allow copying automatically");
  const box = fallback.getByRole("textbox");
  await expect(box).toBeFocused();
  const value = await box.inputValue();
  expect(value).toContain(LONG_DRAFT);
  expect(value).toContain("node challenge.js");
  const selected = await box.evaluate((el) => el.selectionEnd - el.selectionStart);
  expect(selected).toBe(value.length);
  await expect(page.getByTestId(`editor-${MAIN}`)).toHaveValue(LONG_DRAFT);
  await fallback.getByRole("button", { name: "Close" }).click();
  await expect(fallback).toHaveCount(0);
});
