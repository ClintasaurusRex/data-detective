import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { doubledTotalsCase } from "../../src/missions/doubledTotals.js";
import { messyExportCase } from "../../src/missions/messyExport.js";
import { independentSolution, wrongSolutions } from "../support/doubledTotals.js";
import { SOLUTION, check, output, outputJson, run, setCode, workbench } from "./helpers.js";

const ID = "doubled-totals";
const exercise = doubledTotalsCase.exercises[0];
const solution = exercise.solution.code;
const execNode = promisify(execFile);
const caseLink = (page, name) => page.getByRole("complementary").getByRole("link", {name: new RegExp(name)});
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem("data-detective:v1")));
async function openCase(page) {
  await page.goto("./#/case/doubled-totals");
  await expect(page.getByRole("heading", {level:2,name:"The Doubled Totals"})).toBeVisible();
}
async function skip(page) { await page.getByRole("button", {name:"Skip for now"}).click(); }

test("independent investigation, fractional prediction, actual audit, all checks and persisted stale solution", async ({page}) => {
  await openCase(page);
  await expect(page.getByRole("region",{name:"Combined weekly export: original records"})).toContainText('"00111"');
  await expect(page.getByText("17 hours",{exact:true})).toBeVisible();
  await workbench(page,ID).getByRole("button",{name:"Check solution"}).click();
  await expect(page.getByLabel("Reliable hours",{exact:true})).toBeFocused();
  await expect(workbench(page,ID)).toHaveAttribute("data-checks","0");
  await page.getByLabel("Reliable hours",{exact:true}).fill("3.5");
  await page.getByRole("button",{name:"Save prediction"}).click();
  await expect(page.getByRole("button",{name:"Change my prediction"})).toBeFocused();
  await expect(page.getByTestId("prediction")).not.toContainText("Correct");
  await setCode(page,solution,ID);
  await run(page,ID);
  await expect(page.getByTestId("case-status")).toHaveText("Open case");
  await expect(output(page,ID).getByTestId("hours-comparison")).toContainText("Raw imported total: 17 hours");
  await expect(output(page,ID).getByTestId("hours-comparison")).toContainText("reliable total: 3.5");
  await expect(page.getByRole("region",{name:"Kept records",exact:true}).getByRole("row")).toHaveCount(4);
  await expect(page.getByRole("region",{name:"Exact duplicate occurrences",exact:true})).toContainText("retained file line 2");
  await expect(page.getByRole("region",{name:"Conflicting job groups",exact:true}).getByRole("row")).toHaveCount(4);
  const actual = await outputJson(page,ID);
  expect(actual.kept.map(r=>r.line)).toEqual([2,5,8]);
  expect(actual.conflicts[0].records.map(r=>r.line)).toEqual([3,6,9]);
  await check(page,ID);
  await expect(page.getByTestId("check-summary")).toHaveText("All 17 checks passed.");
  await expect(page.getByTestId("solved-panel")).toContainText("Solved without hints");
  await expect(page.getByRole("button",{name:/Download/})).toHaveCount(3);
  await page.getByText("Inspect this dataset",{exact:true}).first().click();
  await expect(page.getByTestId("check-panel")).toContainText("3 kept, 2 duplicates, 1 conflict groups; 3.5 reliable hours");
  await expect.poll(async()=> (await saved(page))?.exercises[ID]?.solved?.code).toBe(solution);
  await page.reload();
  await expect(page.getByTestId("prediction-value")).toContainText("3.5 reliable hours");
  await expect(workbench(page,ID)).toContainText("Last saved check: all datasets passed");
  await setCode(page,solution+"\n// changed draft",ID);
  await check(page,ID);
  await setCode(page,"function transform() { return {}; }",ID);
  await check(page,ID);
  await expect(page.getByTestId("case-status")).toHaveText("Needs checking again");
  await expect.poll(async()=> (await saved(page))?.exercises[ID]?.checked?.passed).toBe(false);
  await page.reload();
  await expect(page.getByTestId(`editor-${ID}`)).toHaveValue("function transform() { return {}; }");
  await expect(page.getByLabel(`Checked code for ${exercise.title}`)).toContainText("// changed draft");
  await page.getByRole("link",{name:"Toolbox (1)"}).click();
  await expect(page.getByTestId(`toolbox-${ID}`)).toBeVisible();
});

test("a different valid algorithm passes the real sandbox checker", async ({page}) => {
  await openCase(page); await skip(page); await setCode(page,independentSolution,ID); await check(page,ID);
  await expect(page.getByTestId("check-summary")).toHaveText("All 17 checks passed.");
});

for (const [name,code] of Object.entries(wrongSolutions)) {
  test(`checker rejects ${name} without recording a solve`, async ({page}) => {
    await openCase(page); await skip(page); await setCode(page,code,ID); await check(page,ID);
    await expect(page.getByTestId("check-summary")).not.toHaveText("All 17 checks passed.");
    await expect(page.getByTestId("case-status")).toHaveText("Open case");
    await expect(page.getByTestId("check-panel").locator(".problems").first()).toBeVisible();
    await expect(page.getByTestId("solved-panel")).toHaveCount(0);
  });
}

test("a typed-in case answer fails the other weeks", async ({page}) => {
  const result = new Function(independentSolution+"\nreturn transform;")()(exercise.rows);
  await openCase(page); await skip(page);
  await setCode(page,`function transform() { return ${JSON.stringify(result)}; }`,ID); await check(page,ID);
  await expect(page.getByTestId("check-panel")).toContainText("another week needs attention");
  await expect(page.getByTestId("case-status")).toHaveText("Open case");
});

test("syntax, runtime, missing function and wrong output shapes recover", async ({page}) => {
  const errors=[]; page.on("pageerror",e=>errors.push(e.message));
  await openCase(page); await skip(page);
  for (const [code,text] of [
    ["function transform(rows) { return rows.filter(row => ); }","Syntax error"],
    ['function transform() { throw new Error("trace this job"); }',"trace this job"],
    ["function other() {}","Couldn't find a function named"],
    ["function transform() { return null; }","Return kept, duplicates"],
  ]) {
    await setCode(page,code,ID); await run(page,ID);
    await expect(output(page,ID).getByTestId("run-error")).toContainText(text);
  }
  await setCode(page,solution,ID); await run(page,ID);
  await expect(output(page,ID)).toContainText("reliable total: 3.5"); expect(errors).toEqual([]);
});

test("Run shows wrong values and malformed audit entries without substituting expected results or crashing", async ({page}) => {
  const errors=[]; page.on("pageerror",e=>errors.push(e.message));
  await openCase(page); await skip(page);
  await setCode(page,`function transform(rows) { return {kept:[{...rows[0],id:"MY-WRONG-ID"}], duplicates:[null,{keptLine:{bad:1},record:null}], conflicts:[null,{id:{bad:2},records:"wrong"}], totalHours:999}; }`,ID);
  await run(page,ID);
  await expect(output(page,ID)).toContainText("MY-WRONG-ID");
  await expect(output(page,ID)).toContainText("reliable total: 999");
  await expect(output(page,ID)).toContainText("This group needs a records array");
  expect(errors).toEqual([]);
  await check(page,ID); await expect(page.getByTestId("case-status")).toHaveText("Open case");
});

test("Stop, mutation warnings and leaving an active check preserve valid progress", async ({page}) => {
  await openCase(page); await skip(page);
  await setCode(page,"function transform() { while(true){} }",ID);
  await workbench(page,ID).getByRole("button",{name:"Run",exact:true}).click();
  await workbench(page,ID).getByRole("button",{name:"Stop",exact:true}).click();
  await expect(output(page,ID).getByTestId("run-error")).toContainText("stopped");
  await workbench(page,ID).getByRole("button",{name:"Check solution"}).click();
  await workbench(page,ID).getByRole("button",{name:"Stop",exact:true}).click();
  await expect(workbench(page,ID).getByRole("region",{name:"Check results",exact:true})).toContainText("The check was stopped before it finished");
  await setCode(page,solution.replace("const groups =",'rows[0].notes = "changed"; const groups ='),ID); await run(page,ID);
  await expect(output(page,ID)).toContainText("Your code changed the input");
  await check(page,ID); await expect(page.getByTestId("check-panel")).toContainText("Your code changed the input");
  await setCode(page,"function transform() { while(true){} }",ID);
  await workbench(page,ID).getByRole("button",{name:"Check solution"}).click();
  await caseLink(page,"The Missing Jobs").click(); await skip(page); await setCode(page,SOLUTION); await run(page);
  await expect(output(page)).toContainText("J-101");
  await caseLink(page,"The Doubled Totals").click();
  await expect(page.getByTestId("case-status")).toHaveText("Open case");
  await expect(workbench(page,ID)).toHaveAttribute("data-checks","0");
  await setCode(page,solution,ID); await check(page,ID);
  await expect(page.getByTestId("check-summary")).toHaveText("All 17 checks passed.");
});

test("hints, solution confirmation, attribution and previous draft persist", async ({page}) => {
  await openCase(page); await skip(page);
  const draft = "function transform() { return {}; } // my idea";
  await setCode(page,draft,ID);
  for(let i=1;i<=4;i++) await page.getByRole("button",{name:`Show hint ${i} of 4`}).click();
  await expect(page.getByRole("region",{name:"Hints and solution"})).toContainText("Map");
  await page.getByRole("button",{name:"Show the explained solution…"}).click();
  await expect(page.getByRole("button",{name:"Yes, show the solution"})).toBeFocused();
  await page.getByRole("button",{name:"Not yet"}).click();
  await expect(page.getByTestId("solution")).toHaveCount(0);
  await page.getByRole("button",{name:"Show the explained solution…"}).click();
  await page.getByRole("button",{name:"Yes, show the solution"}).click();
  await expect(page.getByTestId("solution")).toBeFocused();
  await page.getByRole("button",{name:"Put this code in the editor"}).click();
  await workbench(page,ID).getByRole("button",{name:"Bring back my draft"}).click();
  await expect(page.getByTestId(`editor-${ID}`)).toHaveValue(draft);
  await page.getByRole("button",{name:"Put this code in the editor"}).click(); await check(page,ID);
  await expect(page.getByTestId("solved-panel")).toContainText("explained solution");
  await expect.poll(async()=> (await saved(page))?.exercises[ID]?.hintsShown).toBe(4);
  await page.reload(); await expect(page.getByTestId("solution")).toBeVisible();
});

test("three-case navigation, Back, Forward, refresh and existing Toolbox retain both earlier saves", async ({page}) => {
  await page.goto("./"); await skip(page); await setCode(page,SOLUTION); await check(page);
  await caseLink(page,"The Messy Export").click(); await skip(page);
  await setCode(page,messyExportCase.exercises[0].solution.code,"messy-export"); await check(page,"messy-export");
  await expect.poll(async()=> (await saved(page))?.exercises["messy-export"]?.solved?.code).toBe(messyExportCase.exercises[0].solution.code);
  const before=await saved(page);
  await caseLink(page,"The Doubled Totals").focus(); await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await skip(page); await setCode(page,independentSolution,ID); await check(page,ID);
  await page.goBack(); await expect(page.getByTestId("editor-messy-export")).toHaveValue(messyExportCase.exercises[0].solution.code);
  await page.goForward(); await expect(page.getByTestId(`editor-${ID}`)).toHaveValue(independentSolution);
  await page.reload();
  const after=await saved(page);
  for(const id of ["missing-jobs","missing-jobs-open","messy-export"]) expect(after.exercises[id]).toEqual(before.exercises[id]);
  expect(after.cases["missing-jobs"]).toEqual(before.cases["missing-jobs"]); expect(after.cases["messy-export"]).toEqual(before.cases["messy-export"]);
  await page.getByRole("link",{name:"Toolbox (3)"}).click();
  await expect(page.getByTestId("toolbox-missing-jobs")).toBeVisible(); await expect(page.getByTestId("toolbox-messy-export")).toBeVisible();
  await expect(page.getByTestId(`toolbox-${ID}`)).toBeVisible();
});

test("Copy to IDE runs the exact sample challenge and draft without hidden fixtures", async ({page,context}) => {
  await context.grantPermissions(["clipboard-read","clipboard-write"]);
  await openCase(page); await setCode(page,solution+"\n// my current draft",ID);
  await workbench(page,ID).getByRole("button",{name:"Copy to IDE"}).click();
  await expect(workbench(page,ID).getByTestId("copy-success")).toBeVisible();
  const text=await page.evaluate(()=>navigator.clipboard.readText());
  expect(text).toContain("my current draft"); expect(text).toContain('"00110"'); expect(text).not.toContain("NEW-90");
  const dir=await mkdtemp(join(tmpdir(),"doubled-totals-ide-"));
  try {
    await writeFile(join(dir,"challenge.js"),text);
    const {stdout}=await execNode(process.execPath,["challenge.js"],{cwd:dir});
    const result=JSON.parse(stdout.split("\n").slice(1).join("\n"));
    expect(result.totalHours).toBe(3.5); expect(result.conflicts[0].records.map(r=>r.line)).toEqual([3,6,9]);
  } finally { await rm(dir,{recursive:true,force:true}); }
  await expect(workbench(page,ID)).toHaveAttribute("data-runs","0");
  await expect(workbench(page,ID)).toHaveAttribute("data-checks","0");
});

for(const [width,height] of [[1920,1080],[1366,768],[375,740]]) {
  test(`keyboard controls and audit output fit at ${width}px without console errors`, async ({page}) => {
    const errors=[]; page.on("pageerror",e=>errors.push(e.message)); page.on("console",m=>{if(m.type()==="error") errors.push(m.text());});
    await page.setViewportSize({width,height}); await page.emulateMedia({reducedMotion:"reduce"}); await openCase(page);
    await page.getByRole("link",{name:"Skip to content"}).focus(); await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused(); await expect(page).toHaveURL(/doubled-totals$/);
    await workbench(page,ID).getByRole("button",{name:"Run",exact:true}).focus(); await page.keyboard.press("Enter");
    await expect(page.getByLabel("Reliable hours",{exact:true})).toBeFocused(); await page.keyboard.type("5");
    await page.keyboard.press("Tab"); await page.keyboard.press("Enter");
    await setCode(page,solution,ID); await page.keyboard.press("Control+Enter");
    await expect(workbench(page,ID)).toHaveAttribute("data-runs","1");
    await expect(output(page,ID)).toContainText("You predicted 5 reliable hours");
    const bench=workbench(page,ID);
    await bench.getByRole("button",{name:"Expand editor"}).focus(); await page.keyboard.press("Enter");
    await expect(bench.getByRole("button",{name:"Restore editor size"})).toBeFocused();
    await bench.getByLabel("Wrap long lines").focus(); await page.keyboard.press("Space"); await expect(bench.getByLabel("Wrap long lines")).toBeChecked();
    expect(await page.getByTestId(`editor-${ID}`).evaluate(el=>getComputedStyle(el).resize)).toBe("vertical");
    await check(page,ID); await expect(page.getByTestId("check-summary")).toHaveText("All 17 checks passed.");
    await bench.getByRole("button",{name:"Copy to IDE"}).click();
    await expect(page.getByTestId(`editor-${ID}`)).toHaveValue(solution);
    for(const name of ["Restore editor size","Copy to IDE","Run","Check solution"]) {
      const box=await bench.getByRole("button",{name,exact:true}).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x+box.width).toBeLessThanOrEqual(width);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await bench.getByRole("button",{name:"Restore editor size"}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true); expect(errors).toEqual([]);
  });
}
