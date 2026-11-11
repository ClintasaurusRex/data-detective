import { expect, test } from "@playwright/test";
import { twoExportsCase } from "../../src/missions/twoExports.js";
import { doubledTotalsCase } from "../../src/missions/doubledTotals.js";
import { messyExportCase } from "../../src/missions/messyExport.js";
import { SOLUTION, check, run, setCode, workbench } from "./helpers.js";

const KEY = "data-detective:v1";
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);

test("late write failures are announced; working drafts and checked Toolbox tools survive recovery", async ({ page }) => {
  await page.goto("./#/case/doubled-totals");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await setCode(page, doubledTotalsCase.exercises[0].solution.code, "doubled-totals");
  await check(page, "doubled-totals");
  await expect.poll(async () => (await saved(page))?.exercises["doubled-totals"]?.solved?.code).toBe(doubledTotalsCase.exercises[0].solution.code);
  const previous = await saved(page);
  await page.evaluate(() => {
    window.__originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "data-detective:v1") throw new DOMException("Quota exceeded", "QuotaExceededError");
      return window.__originalSetItem.call(this, key, value);
    };
  });
  const draft = doubledTotalsCase.exercises[0].solution.code + "\n// unsaved idea";
  await setCode(page, draft, "doubled-totals");
  await expect(page.getByRole("alert")).toContainText("Your latest changes couldn't be saved");
  await expect(page.getByRole("alert")).toContainText("copy your code");
  expect(await saved(page)).toEqual(previous);
  await page.getByRole("complementary").getByRole("link", { name: /The Messy Export/ }).click();
  await page.getByRole("button", { name: "Skip for now" }).click();
  await setCode(page, messyExportCase.exercises[0].solution.code, "messy-export"); await check(page, "messy-export");
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("link", { name: "Toolbox (2)" }).click();
  await expect(page.getByTestId("toolbox-doubled-totals")).toContainText(doubledTotalsCase.exercises[0].solution.code);
  await page.evaluate(() => { Storage.prototype.setItem = window.__originalSetItem; });
  await page.getByRole("complementary").getByRole("link", { name: /The Doubled Totals/ }).click();
  await expect(page.getByTestId("editor-doubled-totals")).toHaveValue(draft);
  await setCode(page, draft + "\n// saved now", "doubled-totals");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect.poll(async () => (await saved(page))?.exercises["doubled-totals"]?.draft).toBe(draft + "\n// saved now");
  await page.reload();
  await expect(page.getByTestId("editor-doubled-totals")).toHaveValue(draft + "\n// saved now");
  await page.getByRole("link", { name: "Toolbox (2)" }).click();
  await expect(page.getByTestId("toolbox-messy-export")).toBeVisible();
  await expect(page.getByTestId("toolbox-doubled-totals")).toBeVisible();
});

test("quota at startup still restores readable progress and warns when saving fails", async ({ page }) => {
  await page.addInitScript(({ code }) => {
    const setItem = Storage.prototype.setItem;
    setItem.call(localStorage, "data-detective:v1", JSON.stringify({ version: 1, cases: {}, exercises: {
      "doubled-totals": { draft: code, solved: { code, solvedAt: "2026-11-10T00:00:00Z" } },
    } }));
    Storage.prototype.setItem = function () { throw new DOMException("Full", "QuotaExceededError"); };
  }, { code: doubledTotalsCase.exercises[0].solution.code });
  await page.goto("./#/case/doubled-totals");
  await expect(page.getByTestId("editor-doubled-totals")).toHaveValue(doubledTotalsCase.exercises[0].solution.code);
  await expect(page.getByRole("alert")).toContainText("couldn't be saved");
  await expect(page.getByRole("link", { name: "Toolbox (1)" })).toBeVisible();
});

test("failed backup of malformed progress never claims success or overwrites the only original", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("data-detective:v1", "{unreadable original");
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "data-detective:v1:unreadable") throw new DOMException("Full", "QuotaExceededError");
      return setItem.call(this, key, value);
    };
  });
  await page.goto("./");
  await expect(page.getByRole("alert")).toContainText("couldn't be read or backed up");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await setCode(page, SOLUTION); await check(page);
  await page.getByRole("link", { name: "Toolbox (1)" }).click();
  await expect(page.getByTestId("toolbox-missing-jobs")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("data-detective:v1"))).toBe("{unreadable original");
  expect(await page.evaluate(() => localStorage.getItem("data-detective:v1:unreadable"))).toBeNull();
});

test("pagehide flushes the latest draft without waiting for the debounce", async ({ page }) => {
  await page.goto("./");
  const draft = SOLUTION + "\n// last edit before leaving";
  await setCode(page, draft);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
  expect((await saved(page)).exercises["missing-jobs"].draft).toBe(draft);
});

test("switching through all four missions cancels pending checks and cannot create stale solves", async ({ page }) => {
  const missions = [
    ["missing-jobs", SOLUTION, "The Messy Export"],
    ["messy-export", messyExportCase.exercises[0].solution.code, "The Doubled Totals"],
    ["doubled-totals", doubledTotalsCase.exercises[0].solution.code, "The Two Exports"],
    ["two-exports", twoExportsCase.exercises[0].solution.code, "The Missing Jobs"],
  ];
  await page.goto("./");
  for (const [id, solution, next] of missions) {
    await page.getByRole("button", { name: "Skip for now" }).click();
    const slow = solution.replace("{", "{ const until = Date.now() + 300; while(Date.now() < until) {}");
    await setCode(page, slow, id);
    await workbench(page, id).getByRole("button", { name: "Check solution" }).click();
    await page.getByRole("complementary").getByRole("link", { name: new RegExp(next) }).click();
    await expect(page.locator("main")).toBeFocused();
  }
  await setCode(page, SOLUTION); await run(page);
  await expect(workbench(page)).toContainText("J-101");
  await expect.poll(async () => (await saved(page))?.exercises["doubled-totals"]?.draft).toContain("Date.now");
  for (const [id] of missions) expect((await saved(page)).exercises[id].solved).toBeNull();
  await page.getByRole("link", { name: "Toolbox (0)" }).click();
  await expect(page.getByRole("main")).toContainText("Nothing downloadable yet");
});
