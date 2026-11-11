import { expect, test } from "@playwright/test";
import { messyExportCase } from "../../src/missions/messyExport.js";
import { check, setCode } from "./helpers.js";

test("Case 1 checking rejects prefix status matching before a tool can be downloaded", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await setCode(page, 'function transform(rows) {return rows.filter(row => row.status.trim().toLowerCase().startsWith("complete"));}');
  await check(page);
  await expect(page.getByTestId("check-summary")).not.toHaveText("All 7 checks passed.");
  await expect(page.getByTestId("check-panel")).toContainText("Completed");
  await expect(page.getByRole("button", { name: /Download/ })).toHaveCount(0);
});

test("Case 2 checking rejects digit overflow even when numeric syntax is correct", async ({ page }) => {
  await page.goto("./#/case/messy-export");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await setCode(page, messyExportCase.exercises[0].solution.code.replace(' ||\n             !Number.isFinite(Number(hoursText))', ''), "messy-export");
  await check(page, "messy-export");
  await expect(page.getByTestId("check-summary")).not.toHaveText("All 13 checks passed.");
  await expect(page.getByTestId("check-panel")).toContainText("File line 20");
  await expect(page.getByRole("button", { name: /Download/ })).toHaveCount(0);
});
