// The core learner journey in a real browser, including exporting the
// script and running it with Node.
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import {
  MAIN,
  SOLUTION,
  VARIATION,
  check,
  openFresh,
  output,
  outputHeading,
  outputJson,
  run,
  setCode,
  workbench,
} from "./helpers.js";

const execNode = promisify(execFile);
const screenshots = process.env.UPDATE_SCREENSHOTS ? "docs/screenshots" : null;

test("a new learner can predict, run, use hints, check, export and come back later", async ({ page }) => {
  await openFresh(page);

  // The request and the planned cases are visible; planned cases aren't links.
  await expect(page.getByText("The weekly report says only one job is complete.")).toBeVisible();
  const caseList = page.getByRole("complementary", { name: "Cases" });
  await expect(caseList.getByRole("link")).toHaveCount(4);
  for (const title of ["The Messy Export", "The Doubled Totals", "The Two Exports", "Your First Reporting Tool"]) {
    await expect(caseList.getByText(title)).toBeVisible();
  }
  await expect(caseList.getByText("Planned")).toHaveCount(1);

  // Running before predicting asks for a prediction instead.
  const prediction = page.getByLabel("How many job records should the weekly report include?");
  await workbench(page).getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByText("Before your first run, make a prediction.")).toBeVisible();
  await expect(prediction).toBeFocused();

  // A wrong prediction gets feedback, not a lockout.
  await prediction.fill("1");
  await page.getByRole("button", { name: "Save prediction" }).click();
  await expect(page.getByText("Look again at the Status column.")).toBeVisible();
  await page.getByRole("button", { name: "Change my prediction" }).click();
  await prediction.fill("3");
  await page.getByRole("button", { name: "Save prediction" }).click();
  await expect(page.getByText("Good eye.")).toBeVisible();

  // Acceptance check 2: 1, then 2, then 3 records.
  await run(page);
  await expect(outputHeading(page)).toHaveText("Output · 1 record");
  await expect(output(page)).toContainText("You predicted 3.");
  await setCode(page, 'function transform(rows) {\n  return rows.filter(row => row.status.toLowerCase() === "complete");\n}\n');
  await run(page);
  await expect(outputHeading(page)).toHaveText("Output · 2 records");

  // Hints are progressive.
  const hints = page.getByRole("region", { name: "Hints and solution" }).first();
  for (const n of [1, 2, 3]) await hints.getByRole("button", { name: `Show hint ${n} of 3` }).click();
  await expect(hints.locator(".hint-list li")).toHaveCount(3);
  await expect(hints.getByRole("button", { name: /Show hint/ })).toHaveCount(0);

  // A run alone doesn't solve the case.
  await setCode(page, SOLUTION);
  await run(page);
  await expect(outputHeading(page)).toHaveText("Output · 3 records");
  await expect(page.getByTestId("case-status")).toHaveText("Open case");
  const browserOutput = await outputJson(page);

  // A hardcoded answer passes the case file but fails the variations.
  await setCode(page, 'function transform(rows) {\n  return rows.filter(row => ["J-101", "J-102", "J-104"].includes(row.id));\n}\n');
  await check(page);
  await expect(page.getByTestId("check-summary")).toHaveText("3 of 7 checks passed.");
  await expect(page.getByTestId("check-panel")).toContainText("Missing 3 jobs that should be included: J-2051");
  await expect(page.getByTestId("check-panel")).toContainText("not particular IDs or positions");

  // The real solution passes every check and solves the case.
  await setCode(page, SOLUTION);
  await check(page);
  await expect(page.getByTestId("check-summary")).toHaveText("All 7 checks passed.");
  await expect(page.getByTestId("case-status")).toHaveText("Solved");
  const solved = page.getByTestId("solved-panel");
  await expect(solved).toContainText("Solved with 3 hints");
  await expect(page.getByRole("link", { name: "Toolbox (1)" })).toBeVisible();
  if (screenshots) await page.screenshot({ path: `${screenshots}/desktop-solved.png`, fullPage: true });

  // Export: download both files and run the script with Node.
  const dir = await mkdtemp(join(tmpdir(), "data-detective-e2e-"));
  try {
    const [script] = await Promise.all([page.waitForEvent("download"), solved.getByRole("button", { name: "Download solve.mjs" }).click()]);
    expect(script.suggestedFilename()).toBe("solve.mjs");
    await script.saveAs(join(dir, "solve.mjs"));
    const [sample] = await Promise.all([page.waitForEvent("download"), solved.getByRole("button", { name: "Download sample.json" }).click()]);
    await sample.saveAs(join(dir, "sample.json"));
    const { stdout } = await execNode(process.execPath, ["solve.mjs", "sample.json"], { cwd: dir });
    expect(JSON.parse(stdout)).toEqual(browserOutput);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  // Refreshing restores the draft, prediction, hints and progress.
  await page.reload();
  await expect(page.getByTestId(`editor-${MAIN}`)).toHaveValue(SOLUTION);
  await expect(page.getByTestId("prediction-value")).toHaveText("3");
  await expect(page.getByTestId("case-status")).toHaveText("Solved");
  await expect(page.getByRole("region", { name: "Hints and solution" }).first().locator(".hint-list li")).toHaveCount(3);

  // Editing after a successful check needs a new check.
  await setCode(page, SOLUTION.replace('"complete"', '"completed"'));
  await expect(workbench(page).getByText("You’ve changed the code since it passed the checks.")).toBeVisible();
  await page.reload();
  await expect(workbench(page).getByText("You’ve changed the code since it passed the checks.")).toBeVisible();

  // Restoring the starter keeps the draft.
  await workbench(page).getByRole("button", { name: "Restore starter code" }).click();
  await expect(page.getByTestId(`editor-${MAIN}`)).toHaveValue(/row\.status === "complete"/);
  await workbench(page).getByRole("button", { name: "Bring back my draft" }).click();
  await expect(page.getByTestId(`editor-${MAIN}`)).toHaveValue(/"completed"/);

  // The Toolbox keeps the last checked version.
  await page.getByRole("link", { name: "Toolbox (1)" }).click();
  await expect(page.getByRole("heading", { name: "Your Toolbox" })).toBeVisible();
  await expect(page.getByTestId(`toolbox-${MAIN}`)).toContainText('=== "complete"');
});

test("using the explained solution is recorded honestly, and the variation works", async ({ page }) => {
  await openFresh(page);
  await page.getByRole("button", { name: "Skip for now" }).click();
  const hints = page.getByRole("region", { name: "Hints and solution" }).first();
  await hints.getByRole("button", { name: "Show the explained solution…" }).click();
  await hints.getByRole("button", { name: "Not yet" }).click();
  await expect(page.getByTestId("solution")).toHaveCount(0);
  await hints.getByRole("button", { name: "Show the explained solution…" }).click();
  await hints.getByRole("button", { name: "Yes, show the solution" }).click();
  await expect(page.getByTestId("solution")).toContainText("immutable");
  await expect(page.getByTestId("solution")).toContainText("returns a new string");

  await setCode(page, "function transform(rows) {\n  // my own attempt\n  return [];\n}\n");
  await hints.getByRole("button", { name: "Put this code in the editor" }).click();
  await expect(page.getByTestId(`editor-${MAIN}`)).toHaveValue(SOLUTION);
  await check(page);
  await expect(page.getByTestId("solved-panel")).toContainText("Solved after viewing the explained solution");
  await workbench(page).getByRole("button", { name: "Bring back my draft" }).click();
  await expect(page.getByTestId(`editor-${MAIN}`)).toHaveValue(/my own attempt/);

  // The variation: open jobs, with less guidance.
  await expect(page.getByRole("heading", { name: "Variation: the open jobs" })).toBeVisible();
  await setCode(page, 'function transform(rows) {\n  return rows.filter(row => row.status.trim().toLowerCase() === "open");\n}\n', VARIATION);
  await run(page, VARIATION);
  await expect(outputHeading(page, VARIATION)).toHaveText("Output · 1 record");
  await check(page, VARIATION);
  await expect(page.getByTestId("variation-solved")).toContainText("solved without hints");
  await expect(page.getByRole("link", { name: "Toolbox (2)" })).toBeVisible();
});

test("malformed saved data doesn't break startup", async ({ page, context }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("data-detective:v1", "{this is not json");
      sessionStorage.setItem("seeded", "1");
    }
  });
  await openFresh(page);
  await expect(page.getByRole("alert")).toContainText("Your saved progress couldn't be read");
  expect(await page.evaluate(() => localStorage.getItem("data-detective:v1:unreadable"))).toBe("{this is not json");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await setCode(page, SOLUTION);
  await run(page);
  await expect(outputHeading(page)).toHaveText("Output · 3 records");
  await page.close();

  // Well-formed JSON with wrong field types is cleaned up quietly.
  const second = await context.newPage();
  await second.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem(
        "data-detective:v1",
        JSON.stringify({ version: 1, cases: { "missing-jobs": { prediction: "x" } }, exercises: { "missing-jobs": { draft: 7, hintsShown: "lots", solved: { code: 5 } } } }),
      );
      sessionStorage.setItem("seeded", "1");
    }
  });
  await openFresh(second);
  await expect(second.getByRole("alert")).toHaveCount(0);
  await expect(second.getByTestId("case-status")).toHaveText("Open case");
  await expect(second.getByTestId(`editor-${MAIN}`)).toHaveValue(/row\.status === "complete"/);
  await expect(second.getByRole("button", { name: "Skip for now" })).toBeVisible();
});

test("the essential flow works from the keyboard with visible focus", async ({ page }) => {
  await openFresh(page);
  const prediction = page.getByLabel("How many job records should the weekly report include?");
  // Tab through the page until the prediction field is reached.
  for (let i = 0; i < 40 && !(await prediction.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(prediction).toBeFocused();
  await page.keyboard.type("3");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Good eye.")).toBeVisible();

  const editor = page.getByLabel("Your transform function");
  for (let i = 0; i < 20 && !(await editor.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(editor).toBeFocused();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type('function transform(rows) {\nreturn rows.filter(row => row.status.trim().toLowerCase() === "complete");\n}');
  const bench = workbench(page);
  await page.keyboard.press("Control+Enter");
  await expect(bench).toHaveAttribute("data-runs", "1");
  await expect(outputHeading(page)).toHaveText("Output · 3 records");

  // Tab to Run, then Check solution, and use them with the keyboard.
  await page.keyboard.press("Tab");
  const runButton = bench.getByRole("button", { name: "Run", exact: true });
  await expect(runButton).toBeFocused();
  const outline = await runButton.evaluate((el) => getComputedStyle(el).outlineStyle + " " + getComputedStyle(el).outlineWidth);
  expect(outline).toBe("solid 3px");
  await page.keyboard.press("Tab");
  await expect(bench.getByRole("button", { name: "Check solution" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("check-summary")).toHaveText("All 7 checks passed.");
});

test.describe("phone-sized screen", () => {
  test.use({ viewport: { width: 375, height: 740 }, reducedMotion: "reduce" });

  test("fits without clipped controls and honours reduced motion", async ({ page }) => {
    await openFresh(page);
    const noHorizontalScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(await noHorizontalScroll()).toBe(true);
    if (screenshots) await page.screenshot({ path: `${screenshots}/mobile-start.png`, fullPage: true });

    await page.getByRole("button", { name: "Skip for now" }).click();
    await setCode(page, SOLUTION);
    const bench = workbench(page);
    for (const name of ["Run", "Check solution"]) {
      const box = await bench.getByRole("button", { name, exact: true }).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
      expect(box.height).toBeGreaterThanOrEqual(40);
    }
    await run(page);
    await check(page);
    await expect(page.getByTestId("check-summary")).toHaveText("All 7 checks passed.");
    expect(await noHorizontalScroll()).toBe(true);
    const animation = await page.locator(".stamp").evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe("none");
    for (const name of ["Download solve.mjs", "Download sample.json"]) {
      const box = await page.getByTestId("solved-panel").getByRole("button", { name }).boundingBox();
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }
    if (screenshots) {
      await page.getByTestId("solved-panel").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${screenshots}/mobile-solved.png` });
    }
  });
});
