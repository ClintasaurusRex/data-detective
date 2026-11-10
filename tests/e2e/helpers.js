import { expect } from "@playwright/test";

export const MAIN = "missing-jobs";
export const VARIATION = "missing-jobs-open";

export const SOLUTION = `function transform(rows) {
  return rows.filter(row =>
    row.status.trim().toLowerCase() === "complete"
  );
}
`;

export async function openFresh(page) {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "The Missing Jobs", level: 2 })).toBeVisible();
}

export function workbench(page, id = MAIN) {
  return page.getByTestId(`workbench-${id}`);
}

export async function skipPrediction(page) {
  await page.getByRole("button", { name: "Skip for now" }).click();
}

export async function setCode(page, code, id = MAIN) {
  await page.getByTestId(`editor-${id}`).fill(code);
}

async function waitForCounter(bench, attribute, action) {
  const before = Number(await bench.getAttribute(attribute));
  await action();
  await expect(bench).toHaveAttribute(attribute, String(before + 1), { timeout: 15_000 });
}

// Click Run and wait for that run to finish.
export async function run(page, id = MAIN) {
  const bench = workbench(page, id);
  await waitForCounter(bench, "data-runs", () => bench.getByRole("button", { name: "Run", exact: true }).click());
  return bench;
}

// Click Check solution and wait for the check to finish.
export async function check(page, id = MAIN) {
  const bench = workbench(page, id);
  await waitForCounter(bench, "data-checks", () => bench.getByRole("button", { name: "Check solution" }).click());
  return bench;
}

export function output(page, id = MAIN) {
  return workbench(page, id).getByRole("region", { name: "Output", exact: true });
}

export function outputHeading(page, id = MAIN) {
  return output(page, id).getByRole("heading", { name: /^Output/ });
}

export async function outputJson(page, id = MAIN) {
  const panel = output(page, id);
  await panel.getByText("Show as JSON", { exact: true }).click();
  return JSON.parse(await panel.getByLabel("Output as JSON").textContent());
}
