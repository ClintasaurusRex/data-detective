import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { messyExportCase } from "../../src/missions/messyExport.js";
import { datasets } from "../../src/missions/messyExport.fixtures.js";
import { MAIN, SOLUTION, check, openFresh, output, run, setCode, workbench } from "./helpers.js";

const ID = "messy-export";
const exercise = messyExportCase.exercises[0];
const solution = exercise.solution.code;
const execNode = promisify(execFile);
const caseLink = (page, title) => page.getByRole("complementary", { name: "Cases" }).getByRole("link", { name: new RegExp(title) });
async function openCase(page) {
  await page.goto("./#/case/messy-export");
  await expect(page.getByRole("heading", { level: 2, name: "The Messy Export" })).toBeVisible();
}
async function skip(page) { await page.getByRole("button", { name: "Skip for now" }).click(); }
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("data-detective:v1")));

test("mission links, Back, Forward, refresh and legacy progress remain independent", async ({ page }) => {
  await openFresh(page);
  await skip(page);
  await setCode(page, SOLUTION);
  await check(page);
  await page.getByRole("button", { name: "Show hint 1 of 3" }).click();
  await expect.poll(async () => (await saved(page))?.exercises[MAIN].hintsShown).toBe(1);
  const old = (await saved(page)).exercises[MAIN];
  await caseLink(page, "The Messy Export").click();
  await expect(page).toHaveURL(/#\/case\/messy-export$/);
  await expect(page.locator("main")).toBeFocused();
  await expect(caseLink(page, "The Messy Export")).toHaveAttribute("aria-current", "page");
  await expect(caseLink(page, "The Missing Jobs")).not.toHaveAttribute("aria-current");
  await skip(page);
  await setCode(page, "function transform(rows) { return { accepted: [], rejected: [] }; }", ID);
  await page.goBack();
  await expect(page.getByTestId(`editor-${MAIN}`)).toHaveValue(SOLUTION);
  await expect(page.getByTestId("case-status")).toHaveText("Solved");
  await page.goForward();
  await expect(page.getByTestId(`editor-${ID}`)).toHaveValue(/accepted: \[\]/);
  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "The Messy Export" })).toBeVisible();
  expect((await saved(page)).exercises[MAIN]).toEqual(old);
  expect((await saved(page)).cases[MAIN].prediction).toEqual({ skipped: true });
  await expect(page.getByTestId("prediction")).toContainText("Prediction skipped");
  await page.getByRole("link", { name: "Toolbox (1)" }).click();
  await expect(page.getByTestId(`toolbox-${MAIN}`)).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId(`editor-${ID}`)).toBeVisible();
  await expect(page.getByRole("complementary").getByText("Planned")).toHaveCount(0);
});

test("investigate, predict, compare real output, check all datasets and persist exact passing code", async ({ page }) => {
  await openCase(page);
  const bench = workbench(page, ID);
  await bench.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByLabel("Accepted records", { exact: true })).toBeFocused();
  await expect(bench).toHaveAttribute("data-runs", "0");
  await page.getByText("Inspect the parsed records supplied to transform", { exact: true }).click();
  await expect(page.getByRole("region", { name: "Parsed input records" })).toContainText('"004101"');
  await expect(page.getByRole("region", { name: "Parsed input records" })).toContainText('Customer not home.\\nCard left at door');
  await page.getByLabel("Accepted records", { exact: true }).fill("5");
  await page.getByLabel("Rejected records", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Save prediction" }).click();
  await expect(page.getByRole("button", { name: "Change my prediction" })).toBeFocused();
  await setCode(page, solution, ID);
  await run(page, ID);
  await expect(output(page, ID)).toContainText("You predicted 5 accepted and 3 rejected");
  const accepted = page.getByRole("region", { name: "Accepted records", exact: true });
  const rejected = page.getByRole("region", { name: "Rejected records", exact: true });
  await expect(accepted).toContainText('"004104"');
  await expect(accepted.getByRole("row")).toHaveCount(5);
  await expect(rejected).toContainText('" open "');
  await expect(rejected).toContainText("Blank means unknown, not zero");
  await expect(rejected.getByRole("table")).toHaveCount(4);
  await expect(page.getByTestId("case-status")).toHaveText("Open case");
  await check(page, ID);
  await expect(page.getByTestId("check-summary")).toHaveText("All 13 checks passed.");
  await expect(page.getByTestId("case-status")).toHaveText("Solved");
  await page.getByText("Inspect this dataset").first().click();
  await expect(page.getByTestId("check-panel")).toContainText("Expected result: 4 accepted and 4 rejected");
  await expect(page.getByTestId("solved-panel")).toContainText("Solved without hints");
  await expect(page.getByRole("button", { name: /Download/ })).toHaveCount(6);
  await page.reload();
  await expect(page.getByTestId(`editor-${ID}`)).toHaveValue(solution);
  await expect(page.getByTestId("case-status")).toHaveText("Solved");
  await expect(page.getByTestId("prediction-value")).toContainText("5 accepted and 3 rejected");
  await expect(bench).toContainText("Last saved check: all datasets passed");
  expect((await saved(page)).exercises[ID].solved.code).toBe(solution);
  await setCode(page, solution + "// changed\n", ID);
  await page.reload();
  await expect(page.getByTestId("case-status")).toHaveText("Needs checking again");
  await expect(bench).toContainText("changed the code since it passed");
  expect((await saved(page)).exercises[ID].solved.code).toBe(solution);
});

const wrongSolutions = [
  ["blank becomes zero", solution.replace('if (hoursText === "")', 'if (false)').replace('!/^\\d+', 'hoursText !== "" && !/^\\d+'), "Blank hours mean unknown, never zero"],
  ["IDs converted", solution.replace('line: row.line, id, status,', 'line: row.line, id: Number(id), status,'), "Keep IDs as text"],
  ["invalid status accepted", solution.replace('!["open", "complete", "on hold"].includes(status)', 'false'), "belongs in"],
  ["loose numeric conversion", solution.replace('!/^\\d+(\\.\\d+)?$/.test(hoursText) ||', ''), "invalid-hours"],
  ["missing reasons", solution.replace('record: row, reasons', 'record: row, reasons: []'), "Include every reason"],
  ["dropped rows", 'function transform() { return { accepted: [], rejected: [] }; }', "is missing"],
  ["duplicates", solution.replace('return { accepted, rejected };', 'return { accepted: accepted.concat(accepted), rejected };'), "appears 2 times"],
  ["reordered", solution.replace('return { accepted, rejected };', 'return { accepted: accepted.reverse(), rejected };'), "out of order"],
  ["changed rejected originals", solution.replace('record: row, reasons', 'record: { ...row, status }, reasons'), "rejected `record` was changed"],
  ["input mutation", solution.replace('const id = row.id.trim();', 'row.status = row.status.trim().toLowerCase();\n    const id = row.id.trim();'), "changed the input"],
];
for (const [name, code, message] of wrongSolutions) {
  test(`checker explains ${name} without solving`, async ({ page }) => {
    await openCase(page);
    await skip(page);
    await setCode(page, code, ID);
    await check(page, ID);
    await expect(page.getByTestId("check-panel")).toContainText(message.replaceAll("`", ""));
    await expect(page.getByTestId("case-status")).toHaveText("Open case");
    await page.reload();
    await expect(workbench(page, ID)).toContainText("Last saved check: some datasets failed");
  });
}

test("a typed-in case-file answer fails other datasets", async ({ page }) => {
  await openCase(page);
  await skip(page);
  const expected = datasets.caseFile.expected;
  const hardcoded = { accepted: expected.accepted, rejected: expected.rejected.map(({ line, reasons }) => ({ record: exercise.rows.find((r) => r.line === line), reasons })) };
  await setCode(page, `function transform() { return ${JSON.stringify(hardcoded)}; }`, ID);
  await check(page, ID);
  await expect(page.getByTestId("check-panel")).toContainText("Your code works on the case file but not every variation");
  await expect(page.getByTestId("case-status")).toHaveText("Open case");
});

test("syntax, runtime, wrong return shapes and Stop recover without refresh", async ({ page }) => {
  await openCase(page);
  await skip(page);
  for (const [code, message] of [
    ['function transform(rows) {\n return {\n}', "Syntax"],
    ['function transform(rows) {\n throw new Error("Ask Priya");\n}', "Ask Priya"],
    ['function transform(rows) { return rows; }', "accepted and rejected arrays"],
    ['function transform() {}', "accepted and rejected arrays"],
  ]) {
    await setCode(page, code, ID);
    await run(page, ID);
    await expect(output(page, ID).getByTestId("run-error")).toContainText(message);
  }
  await setCode(page, 'function transform(rows) { while (true) {} }', ID);
  const bench = workbench(page, ID);
  await bench.getByRole("button", { name: "Run", exact: true }).click();
  await bench.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(output(page, ID).getByTestId("run-error")).toContainText("stopped");
  await bench.getByRole("button", { name: "Check solution" }).click();
  await bench.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(bench.getByRole("region", { name: "Check results" })).toContainText("stopped before it finished");
  await setCode(page, solution, ID);
  await run(page, ID);
  await expect(page.getByRole("region", { name: "Accepted records", exact: true })).toContainText("4");
});

test("hints and reference confirmation, attribution and previous draft persist", async ({ page }) => {
  await openCase(page);
  await skip(page);
  await setCode(page, '// my investigation\nfunction transform(rows) { return {}; }', ID);
  for (const n of [1, 2, 3, 4]) await page.getByRole("button", { name: `Show hint ${n} of 4` }).click();
  await page.getByRole("button", { name: "Show the explained solution…" }).click();
  await expect(page.getByRole("button", { name: "Yes, show the solution" })).toBeFocused();
  await page.getByRole("button", { name: "Not yet" }).click();
  await expect(page.getByRole("button", { name: "Show the explained solution…" })).toBeFocused();
  await expect(page.getByTestId("solution")).toHaveCount(0);
  await page.getByRole("button", { name: "Show the explained solution…" }).click();
  await page.getByRole("button", { name: "Yes, show the solution" }).click();
  await expect(page.getByTestId("solution")).toBeFocused();
  await page.getByRole("button", { name: "Put this code in the editor" }).click();
  await check(page, ID);
  await expect(page.getByTestId("solved-panel")).toContainText("Solved after viewing the explained solution");
  await page.reload();
  await expect(page.locator(".hint-list li")).toHaveCount(4);
  await expect(page.getByTestId("solution")).toBeVisible();
  await workbench(page, ID).getByRole("button", { name: "Bring back my draft" }).click();
  await expect(page.getByTestId(`editor-${ID}`)).toHaveValue(/my investigation/);
  await expect(page.getByTestId("case-status")).toHaveText("Needs checking again");
});

test("malformed file examples use actual parser errors and never a partial report", async ({ page }) => {
  await openCase(page);
  await page.getByText("Explore malformed CSV examples", { exact: true }).click();
  await expect(page.getByTestId("csv-errors")).toContainText("too-many-fields");
  await page.getByLabel("Example file").selectOption("unterminatedQuote");
  await expect(page.getByTestId("csv-errors")).toContainText("File line 2");
  await expect(page.getByTestId("csv-errors")).toContainText("unterminated-quote");
  await page.getByLabel("Example file").selectOption("missingColumn");
  await expect(page.getByTestId("csv-errors")).toContainText("missing-column");
  await expect(page.getByTestId("csv-errors")).toContainText("No partial report");
  await expect(workbench(page, ID)).toHaveAttribute("data-runs", "0");
});

test("leaving an active check cancels it and does not save a late solve", async ({ page }) => {
  await openCase(page);
  await skip(page);
  await setCode(page, 'function transform() { while (true) {} }', ID);
  await workbench(page, ID).getByRole("button", { name: "Check solution" }).click();
  await caseLink(page, "The Missing Jobs").click();
  await skip(page);
  await setCode(page, SOLUTION);
  await run(page);
  await expect(output(page)).toContainText('"J-101"');
  await caseLink(page, "The Messy Export").click();
  await expect(workbench(page, ID)).toHaveAttribute("data-checks", "0");
  await expect(page.getByTestId("case-status")).toHaveText("Open case");
});

test("keyboard navigation, prediction, run, wrap, expand and checking", async ({ page }) => {
  await openFresh(page);
  await caseLink(page, "The Messy Export").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/messy-export$/);
  await workbench(page, ID).getByRole("button", { name: "Run", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Accepted records", { exact: true })).toBeFocused();
  await page.keyboard.type("4");
  await page.keyboard.press("Tab");
  await page.keyboard.type("4");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Change my prediction" })).toBeFocused();
  await setCode(page, solution, ID);
  await page.keyboard.press("Control+Enter");
  await expect(workbench(page, ID)).toHaveAttribute("data-runs", "1");
  const wrap = workbench(page, ID).getByLabel("Wrap long lines");
  await wrap.focus();
  await page.keyboard.press("Space");
  await expect(wrap).toBeChecked();
  await workbench(page, ID).getByRole("button", { name: "Expand editor" }).focus();
  await page.keyboard.press("Enter");
  await expect(workbench(page, ID).getByRole("button", { name: "Restore editor size" })).toBeFocused();
  await workbench(page, ID).getByRole("button", { name: "Check solution" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("check-summary")).toHaveText("All 13 checks passed.");
});

for (const [width, height] of [[1920, 1080], [1366, 768], [375, 740]]) {
  test(`Case 2 controls, evidence, output and editor fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openCase(page);
    await skip(page);
    await setCode(page, solution, ID);
    await run(page, ID);
    const bench = workbench(page, ID);
    await page.getByText("Inspect the parsed records supplied to transform", { exact: true }).click();
    await bench.getByRole("button", { name: "Expand editor" }).click();
    await bench.getByLabel("Wrap long lines").check();
    await bench.getByRole("button", { name: "Copy to IDE" }).click();
    for (const name of ["Restore editor size", "Copy to IDE", "Run", "Check solution"]) {
      const box = await bench.getByRole("button", { name, exact: true }).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    const editor = page.getByTestId(`editor-${ID}`);
    expect(await editor.evaluate((el) => getComputedStyle(el).resize)).toBe("vertical");
    await expect(editor).toHaveValue(solution);
    expect((await output(page, ID).boundingBox()).y).toBeGreaterThan((await editor.boundingBox()).y + (await editor.boundingBox()).height);
    await check(page, ID);
    await bench.getByRole("button", { name: "Restore editor size" }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByTestId("case-status")).toHaveText("Solved");
  });
}

test("Copy to IDE runs the displayed parsed-record exercise in Node", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openCase(page);
  await setCode(page, solution, ID);
  const bench = workbench(page, ID);
  await bench.getByRole("button", { name: "Copy to IDE" }).click();
  await expect(bench.getByTestId("copy-success")).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain("It does not read a CSV file");
  expect(text).toContain('"id": "004101"');
  expect(text).not.toContain("010233");
  const dir = await mkdtemp(join(tmpdir(), "messy-export-ide-"));
  try {
    await writeFile(join(dir, "challenge.js"), text);
    const { stdout } = await execNode(process.execPath, ["challenge.js"], { cwd: dir });
    const result = JSON.parse(stdout.split("\n").slice(1).join("\n"));
    expect(result.accepted).toEqual(datasets.caseFile.expected.accepted);
    expect(result.rejected).toHaveLength(4);
  } finally { await rm(dir, { recursive: true, force: true }); }
  await expect(bench).toHaveAttribute("data-runs", "0");
  await expect(bench).toHaveAttribute("data-checks", "0");
});


test("Run displays wrong learner values and missing reasons without substituting answers", async ({ page }) => {
  await openCase(page);
  await skip(page);
  await setCode(page, `function transform(rows) {
    return {
      accepted: [{ ...rows[0], id: "MY-WRONG-ID", hours: 999 }],
      rejected: [{ record: rows[1], reasons: [] }, { record: null, reasons: ["__proto__"] }]
    };
  }`, ID);
  await run(page, ID);
  await expect(output(page, ID)).toContainText("MY-WRONG-ID");
  await expect(output(page, ID)).toContainText("999");
  await expect(output(page, ID)).toContainText("No reason codes supplied");
  await expect(output(page, ID)).toContainText("Unknown reason code");
  await expect(page.getByTestId("case-status")).toHaveText("Open case");
});
