// The app fills the viewport on wide screens and stays usable on phones.
import { expect, test } from "@playwright/test";
import { MAIN, SOLUTION, check, openFresh, output, run, setCode, workbench } from "./helpers.js";

const screenshots = process.env.UPDATE_SCREENSHOTS ? "docs/screenshots" : null;

const sizes = [
  { name: "wide desktop", width: 1920, height: 1080, sidebar: true },
  { name: "laptop", width: 1366, height: 768, sidebar: true },
  { name: "phone", width: 375, height: 740, sidebar: false },
];

async function expectNoOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function expectInside(locator, width) {
  const box = await locator.boundingBox();
  expect(box, await locator.textContent()).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
}

for (const size of sizes) {
  test.describe(size.name, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test(`fills the ${size.width}px viewport without overflow or clipped controls`, async ({ page }) => {
      await openFresh(page);
      await expectNoOverflow(page);

      // The shell spans the viewport width (modest padding) and at least its height.
      const app = await page.locator(".app").boundingBox();
      expect(app.width).toBeGreaterThanOrEqual(size.width - 1);
      expect(app.height).toBeGreaterThanOrEqual(size.height - 1);
      const mainBox = await page.locator("main").boundingBox();
      expect(size.width - (mainBox.x + mainBox.width)).toBeLessThanOrEqual(40);

      const sidebar = await page.getByRole("complementary", { name: "Cases" }).boundingBox();
      if (size.sidebar) {
        expect(sidebar.width).toBeLessThanOrEqual(230);
        expect(mainBox.x).toBeGreaterThan(sidebar.x + sidebar.width);
        expect(mainBox.width).toBeGreaterThanOrEqual(size.width - 300);
      } else {
        expect(mainBox.y).toBeGreaterThan(sidebar.y + sidebar.height - 1);
      }

      // Paragraphs stay readable even when the workspace is wide.
      const request = await page.locator("blockquote").boundingBox();
      expect(request.width).toBeLessThanOrEqual(80 * 16);

      // Work in the editor, then expand it, wrap lines and copy.
      await page.getByRole("button", { name: "Skip for now" }).click();
      await setCode(page, SOLUTION);
      await run(page);
      const bench = workbench(page);
      for (const name of ["Expand editor", "Copy to IDE", "Run", "Check solution"]) {
        await expectInside(bench.getByRole("button", { name, exact: true }), size.width);
      }
      await expectInside(bench.getByLabel("Wrap long lines"), size.width);

      const benchBox = await bench.boundingBox();
      await bench.getByRole("button", { name: "Expand editor" }).click();
      const editor = await page.getByTestId(`editor-${MAIN}`).boundingBox();
      expect(editor.width).toBeGreaterThan(benchBox.width - 4);
      expect((await output(page).boundingBox()).y).toBeGreaterThan(editor.y + editor.height);
      await bench.getByLabel("Wrap long lines").check();
      await bench.getByRole("button", { name: "Copy to IDE" }).click();
      await expect(bench.getByTestId("copy-success").or(bench.getByTestId("copy-fallback"))).toBeVisible();
      await expectNoOverflow(page);
      await expect(page.getByTestId(`editor-${MAIN}`)).toHaveValue(SOLUTION);

      await check(page);
      await expect(page.getByTestId("check-summary")).toHaveText("All 7 checks passed.");
      await bench.getByRole("button", { name: "Restore editor size" }).click();
      await expectNoOverflow(page);
      for (const name of ["Download solve.mjs", "Download sample.json"]) {
        await expectInside(page.getByTestId("solved-panel").getByRole("button", { name }), size.width);
      }
      if (screenshots && size.sidebar) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `${screenshots}/${size.width}-wide.png` });
      }

      // Normal vertical scrolling still works, and progress survives a reload.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await page.reload();
      await expect(page.getByTestId(`editor-${MAIN}`)).toHaveValue(SOLUTION);
      await expect(page.getByTestId("case-status")).toHaveText("Solved");
    });
  });
}
