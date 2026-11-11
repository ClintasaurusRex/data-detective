import { expect, test } from "@playwright/test";
import { messyExportCase } from "../../src/missions/messyExport.js";
import { check, setCode } from "./helpers.js";

const KEY = "data-detective:v1";
const saved = page => page.evaluate(key => localStorage.getItem(key), KEY);
const blocked = page => page.getByRole("heading", { name: "Already open in another tab" });

test("a second tab cannot erase another case's checked code, including on retry, refresh and close", async ({ page, context }) => {
  await page.goto("./#/case/messy-export");
  await page.getByRole("button", { name: "Skip for now" }).click();
  const second = await context.newPage();
  await second.goto("./#/case/first-reporting-tool");
  await expect(blocked(second)).toBeVisible();
  await expect(second.locator("textarea")).toHaveCount(0);
  await setCode(page, messyExportCase.exercises[0].solution.code, "messy-export");
  await check(page, "messy-export");
  await expect.poll(async () => JSON.parse(await saved(page))?.exercises["messy-export"]?.solved?.code).toBe(messyExportCase.exercises[0].solution.code);
  const before = await saved(page);
  await second.getByRole("button", { name: "Retry" }).click();
  await expect(blocked(second)).toBeVisible();
  await second.reload();
  await expect(blocked(second)).toBeVisible();
  await second.close();
  expect(await saved(page)).toBe(before);
  const third = await context.newPage();
  await third.goto("./#/case/first-reporting-tool");
  await expect(blocked(third)).toBeVisible();
  await page.close();
  await third.getByRole("button", { name: "Retry" }).click();
  const draft = "function buildWeeklyReport() {} // another case";
  await setCode(third, draft, "first-reporting-tool");
  await expect.poll(async () => JSON.parse(await saved(third))?.exercises["first-reporting-tool"]?.draft).toBe(draft);
  expect(JSON.parse(await saved(third)).exercises["messy-export"].solved.code).toBe(messyExportCase.exercises[0].solution.code);
  await third.reload();
  await expect(third.getByTestId("editor-first-reporting-tool")).toHaveValue(draft);
  expect(JSON.parse(await saved(third)).exercises["messy-export"].solved.code).toBe(messyExportCase.exercises[0].solution.code);
});

test("simultaneous same-exercise startup grants only one editor and closing it flushes the final draft", async ({ page, context }) => {
  const second = await context.newPage();
  await Promise.all([page.goto("./"), second.goto("./")]);
  await expect.poll(async () => (await page.getByTestId("editor-missing-jobs").count()) + (await second.getByTestId("editor-missing-jobs").count())).toBe(1);
  const owner = await page.getByTestId("editor-missing-jobs").count() ? page : second;
  const other = owner === page ? second : page;
  await expect(blocked(other)).toBeVisible();
  const draft = "function transform(rows) { return rows; } // final edit";
  await setCode(owner, draft);
  // No debounce wait: actual pagehide on close must retain this edit.
  await owner.close();
  await other.getByRole("button", { name: "Retry" }).click();
  await expect(other.getByTestId("editor-missing-jobs")).toHaveValue(draft);
});

test("Back after another document takes ownership cannot revive a stale writable snapshot", async ({ page, context }) => {
  await page.goto("./");
  await setCode(page, "function transform() {} // old draft");
  await page.route("**/audit-away", route => route.fulfill({ contentType: "text/html", body: "<h1>Outside the application</h1>" }));
  await page.goto("./audit-away");
  const second = await context.newPage();
  await second.goto("./");
  const draft = "function transform() {} // newer draft";
  await setCode(second, draft);
  await expect.poll(async () => JSON.parse(await saved(second))?.exercises["missing-jobs"]?.draft).toBe(draft);
  await page.goBack();
  await expect(blocked(page)).toBeVisible();
  await second.close();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByTestId("editor-missing-jobs")).toHaveValue(draft);
});

for (const failure of ["missing", "rejected"]) test(`unavailable tab ownership (${failure}) works in memory without replacing readable progress`, async ({ page }) => {
  const code = "function transform() {} // saved before this visit";
  await page.addInitScript(({ failure, code }) => {
    localStorage.setItem("data-detective:v1", JSON.stringify({ version: 1, cases: {}, exercises: { "missing-jobs": { draft: code } } }));
    Object.defineProperty(navigator, "locks", { value: failure === "missing" ? undefined : { request: () => Promise.reject(new Error("Denied")) } });
  }, { failure, code });
  await page.goto("./");
  await expect(page.getByRole("alert")).toContainText("working in memory");
  await expect(page.getByTestId("editor-missing-jobs")).toHaveValue(code);
  const original = await saved(page);
  await setCode(page, "function transform() {} // unsaved session");
  await page.waitForTimeout(400);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
  expect(await saved(page)).toBe(original);
});

test("without ownership, unreadable originals and existing backups remain untouched", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("data-detective:v1", "{original");
    localStorage.setItem("data-detective:v1:unreadable", "earlier backup");
    Object.defineProperty(navigator, "locks", { value: undefined });
  });
  await page.goto("./");
  await expect(page.getByTestId("editor-missing-jobs")).toBeVisible();
  await setCode(page, "function transform() {} // memory only");
  await page.waitForTimeout(400);
  expect(await saved(page)).toBe("{original");
  expect(await page.evaluate(() => localStorage.getItem("data-detective:v1:unreadable"))).toBe("earlier backup");
});
