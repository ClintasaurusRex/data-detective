import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { twoExportsCase } from "../../src/missions/twoExports.js";
import { messyExportCase } from "../../src/missions/messyExport.js";
import { doubledTotalsCase } from "../../src/missions/doubledTotals.js";
import { expectedOutput, independentSolution, wrongSolutions } from "../support/twoExports.js";
import { check, output, outputJson, run, setCode, SOLUTION, workbench } from "./helpers.js";
const exercise=twoExportsCase.exercises[0],ID=exercise.id,solution=exercise.solution.code;
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem("data-detective:v1")));
const link=(page,name)=>page.getByRole("complementary").getByRole("link",{name:new RegExp(name)});
async function open(page,skip=true) {
  await page.goto("./#/case/two-exports");
  await expect(page.getByRole("heading",{name:"The Two Exports",level:2})).toBeVisible();
  if(skip) await page.getByRole("button",{name:"Skip for now"}).click();
}
for(const [name,code] of [["Map",solution],["nested searches",independentSolution]]) {
  test(`${name} matches independent full expected reports in all 20 real sandbox datasets`,async({page})=>{
    await open(page);
    await page.evaluate(()=>{
      window.__reports=[];
      window.addEventListener("message",e=>{
        const frame=document.querySelector('iframe[title="Code runner"]');
        if(e.source===frame?.contentWindow&&e.origin==="null"&&e.data?.source==="data-detective-sandbox"&&e.data.type==="result"&&e.data.result?.outputJson) window.__reports.push(JSON.parse(e.data.result.outputJson));
      });
    });
    await setCode(page,code,ID);await check(page,ID);
    await expect(page.getByTestId("check-summary")).toHaveText("All 20 checks passed.");
    expect(await page.evaluate(()=>window.__reports)).toEqual(exercise.checks.map(expectedOutput));
    await expect(page.getByRole("button",{name:/Download/})).toHaveCount(4);
    await expect.poll(async()=>(await saved(page))?.exercises[ID]?.solved?.code).toBe(code);
  });
}
test("adapter isolates helper names and preserves runtime source lines",async({page,browserName})=>{
  await open(page);await setCode(page,'const transform = value => value;\nconst rows = 1;\n'+independentSolution,ID);await check(page,ID);
  await expect(page.getByTestId("check-summary")).toHaveText("All 20 checks passed.");
  await setCode(page,'function reconcile(a,b){\n  throw Error("check original source line");\n}',ID);await run(page,ID);
  await expect(output(page,ID)).toContainText("check original source line");
  // Some engines omit source positions; never invent one in the product.
  if(browserName==="chromium") await expect(output(page,ID)).toContainText("line 2");
});
test("direct investigation, prediction, actual output and return categories",async({page})=>{
  await open(page,false);
  await expect(page.getByRole("region",{name:"Source: scheduling records",exact:true})).toContainText('"0071"');
  await expect(page.getByRole("columnheader",{name:"Planned hours"})).toBeVisible();
  await workbench(page,ID).getByRole("button",{name:"Check solution"}).click();
  await expect(page.getByLabel("Agreeing pairs",{exact:true})).toBeFocused();
  await expect(workbench(page,ID)).toHaveAttribute("data-checks","0");
  await page.getByLabel("Agreeing pairs",{exact:true}).fill("1");await page.getByRole("button",{name:"Save prediction"}).click();
  await expect(page.getByRole("button",{name:"Change my prediction"})).toBeFocused();
  await setCode(page,solution,ID);await run(page,ID);
  await expect(page.getByTestId("case-status")).toHaveText("Open case");
  await expect(output(page,ID)).toContainText("You predicted 1 agreeing pairs. Your code returned 2");
  for(const title of ["Agreements","Missing field records (scheduling only)","Missing scheduling records (field only)","Differences requiring follow-up","Ambiguous IDs","Reconciliation summary"]) await expect(page.getByRole("region",{name:title,exact:true})).toBeVisible();
  expect(await outputJson(page,ID)).toEqual(expectedOutput(exercise.checks[0]));
  await check(page,ID);await expect(page.getByTestId("case-status")).toHaveText("Solved");
  await page.getByTestId("check-panel").getByText("Inspect this dataset",{exact:true}).first().click();
  await expect(page.getByRole("region",{name:"The case file: scheduling records"})).toBeVisible();
});
for(const [name,code] of Object.entries(wrongSolutions)) test(`incorrect strategy: ${name} cannot solve the case`,async({page})=>{
  await open(page);await setCode(page,code,ID);await check(page,ID);
  await expect(page.getByTestId("check-summary")).not.toHaveText("All 20 checks passed.");
  await expect(page.getByTestId("solved-panel")).toHaveCount(0);
});
test("hardcoded sample and actual incorrect Run never create a solve",async({page})=>{
  await open(page);await run(page,ID);
  expect((await outputJson(page,ID)).agreed).toEqual([]);
  await expect(output(page,ID)).toContainText("Agreements · 0");
  await setCode(page,`function reconcile(){return ${JSON.stringify(expectedOutput(exercise.checks[0]))};}`,ID);await check(page,ID);
  await expect(page.getByTestId("check-panel")).toContainText("different week needs attention");
  await expect(page.getByTestId("solved-panel")).toHaveCount(0);
});
test("syntax, runtime, missing function, malformed and mutation errors recover",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));await open(page);
  for(const [code,text] of [["function reconcile(a,b){ return a.filter(r=>); }","Syntax error"],['function reconcile(){throw Error("trace the field source");}',"trace the field source"],["function other() {}","reconcile"],["function reconcile(){return null;}","five reconciliation arrays"],["function reconcile(){return {agreed:[null],onlyOrders:[null],onlyFieldReports:[],differences:[null],ambiguous:[null],summary:null};}","Reconciliation summary"]]) {
    await setCode(page,code,ID);await run(page,ID);await expect(output(page,ID)).toContainText(text);
    await check(page,ID);await expect(page.getByTestId("check-summary")).not.toHaveText("All 20 checks passed.");
  }
  await setCode(page,solution.replace('const scheduled =','orders[0].site = "changed"; fieldReports.reverse(); const scheduled ='),ID);await run(page,ID);
  await expect(output(page,ID)).toContainText("Your code changed an input");await check(page,ID);
  await expect(page.getByTestId("check-panel")).toContainText("changed an input export");
  await setCode(page,solution,ID);await check(page,ID);await expect(page.getByTestId("check-summary")).toHaveText("All 20 checks passed.");expect(errors).toEqual([]);
});
test("unexpected original field names remain inspectable without inherited heading values",async({page})=>{
  await open(page);
  await setCode(page,'function reconcile(){return {agreed:[],onlyOrders:[],onlyFieldReports:[],differences:[],ambiguous:[{id:"x",orders:[{line:2,id:"x",toString:"evidence",["__proto__"]:"original text"}],fieldReports:[]}],summary:{}};}',ID);
  await run(page,ID);
  for(const name of ["toString","__proto__"]) await expect(output(page,ID).getByRole("columnheader",{name,exact:true})).toBeVisible();
  await check(page,ID);await expect(page.getByTestId("check-summary")).not.toHaveText("All 20 checks passed.");
  await setCode(page,solution,ID);await run(page,ID);expect(await outputJson(page,ID)).toEqual(expectedOutput(exercise.checks[0]));
});
test("timeout, Stop run/check and navigation cancellation cannot save stale results",async({page})=>{
  await open(page);const bench=workbench(page,ID);
  await setCode(page,"function reconcile(){while(true){}}",ID);await run(page,ID);
  await expect(output(page,ID).getByTestId("run-error")).toContainText("2 seconds");
  await bench.getByRole("button",{name:"Run",exact:true}).click();await bench.getByRole("button",{name:"Stop",exact:true}).click();
  await expect(output(page,ID)).toContainText("stopped");
  await bench.getByRole("button",{name:"Check solution"}).click();await bench.getByRole("button",{name:"Stop",exact:true}).click();
  await expect(bench.getByRole("region",{name:"Check results",exact:true})).toContainText("stopped before it finished");
  const slow=solution.replace('const scheduled =','const until=Date.now()+200; while(Date.now()<until){} const scheduled =');
  await setCode(page,slow,ID);await bench.getByRole("button",{name:"Check solution"}).click();await link(page,"The Doubled Totals").click();
  await page.getByRole("button",{name:"Skip for now"}).click();await setCode(page,doubledTotalsCase.exercises[0].solution.code,"doubled-totals");await run(page,"doubled-totals");
  await expect.poll(async()=>(await saved(page))?.exercises[ID]?.draft).toBe(slow);expect((await saved(page)).exercises[ID].solved).toBeNull();
  await page.goBack();await expect(page.getByTestId(`editor-${ID}`)).toHaveValue(slow);
  await setCode(page,solution,ID);await run(page,ID);expect(await outputJson(page,ID)).toEqual(expectedOutput(exercise.checks[0]));
});
test("hints progress, reveal confirmation and prior draft survive refresh",async({page})=>{
  await open(page);await setCode(page,"// my earlier draft",ID);
  for(let i=1;i<=4;i++) await page.getByRole("button",{name:`Show hint ${i} of 4`}).click();
  await page.getByRole("button",{name:"Show the explained solution…"}).click();
  await expect(page.getByRole("button",{name:"Yes, show the solution"})).toBeFocused();
  await page.getByRole("button",{name:"Not yet"}).click();await expect(page.getByTestId("solution")).toHaveCount(0);
  await page.getByRole("button",{name:"Show the explained solution…"}).click();await page.getByRole("button",{name:"Yes, show the solution"}).click();
  await expect(page.getByTestId("solution")).toBeFocused();await expect(page.getByTestId("solution")).toContainText("inner join");
  await page.getByRole("button",{name:"Put this code in the editor"}).click();await check(page,ID);
  await expect(page.getByTestId(`toolbox-${ID}`)).toContainText("explained solution");
  await workbench(page,ID).getByRole("button",{name:"Bring back my draft"}).click();
  await expect.poll(async()=>(await saved(page))?.exercises[ID]?.draft).toBe("// my earlier draft");await page.reload();
  await expect(page.getByTestId(`editor-${ID}`)).toHaveValue("// my earlier draft");await expect(page.getByTestId("solution")).toBeVisible();
  expect((await saved(page)).exercises[ID].hintsShown).toBe(4);
});
test("passing code survives incorrect runs, failed/cancelled checks, newer draft and refresh",async({page})=>{
  await open(page);await setCode(page,independentSolution,ID);await check(page,ID);
  await setCode(page,"function reconcile(){return {};}",ID);await run(page,ID);await check(page,ID);
  await setCode(page,"function reconcile(){while(true){}}",ID);await workbench(page,ID).getByRole("button",{name:"Check solution"}).click();await workbench(page,ID).getByRole("button",{name:"Stop",exact:true}).click();
  await expect(workbench(page,ID).getByRole("region",{name:"Check results",exact:true})).toContainText("stopped before it finished");
  const draft="// newer draft";await setCode(page,draft,ID);
  await expect.poll(async()=>(await saved(page))?.exercises[ID]?.draft).toBe(draft);await page.reload();
  await expect(page.getByTestId(`editor-${ID}`)).toHaveValue(draft);await expect(page.getByTestId("case-status")).toHaveText("Needs checking again");
  expect((await saved(page))?.exercises[ID]?.solved?.code).toBe(independentSolution);
  await page.getByRole("link",{name:"Toolbox (1)"}).click();await expect(page.getByTestId(`toolbox-${ID}`).getByLabel(`Checked code for ${exercise.title}`)).toHaveText(independentSolution);
  await expect(page.getByRole("button",{name:/Download/})).toHaveCount(4);
});
test("editing during a check retains exact checked code and marks newer draft stale",async({page})=>{
  await open(page);const code=solution.replace('const scheduled =','const until=Date.now()+80;while(Date.now()<until){} const scheduled =');
  await setCode(page,code,ID);await workbench(page,ID).getByRole("button",{name:"Check solution"}).click();await setCode(page,"// changed during checking",ID);
  await expect(page.getByTestId("check-summary")).toHaveText("All 20 checks passed.");await expect(page.getByTestId("case-status")).toHaveText("Needs checking again");
  await expect(page.getByTestId("check-panel")).toContainText("earlier version");
  await expect.poll(async()=>(await saved(page))?.exercises[ID]?.solved?.code).toBe(code);
});
test("all four missions keep earlier progress, navigation history and Toolbox entries",async({page})=>{
  await page.goto("./");
  for(const [id,code,title] of [["missing-jobs",SOLUTION,"The Messy Export"],["messy-export",messyExportCase.exercises[0].solution.code,"The Doubled Totals"],["doubled-totals",doubledTotalsCase.exercises[0].solution.code,"The Two Exports"]]) {
    await page.getByRole("button",{name:"Skip for now"}).click();await setCode(page,code,id);await check(page,id);await link(page,title).click();
  }
  await expect.poll(async()=>(await saved(page))?.exercises["doubled-totals"]?.solved?.code).toBe(doubledTotalsCase.exercises[0].solution.code);
  const before=await saved(page);await page.getByRole("button",{name:"Skip for now"}).click();await setCode(page,solution,ID);await check(page,ID);
  await page.goBack();await expect(page.getByTestId("editor-doubled-totals")).toHaveValue(doubledTotalsCase.exercises[0].solution.code);
  await page.goForward();await expect(page.getByTestId(`editor-${ID}`)).toHaveValue(solution);await page.reload();
  for(const id of ["missing-jobs","missing-jobs-open","messy-export","doubled-totals"]) expect((await saved(page)).exercises[id]).toEqual(before.exercises[id]);
  await page.getByRole("link",{name:"Toolbox (4)"}).click();for(const id of ["missing-jobs","messy-export","doubled-totals",ID]) await expect(page.getByTestId(`toolbox-${id}`)).toBeVisible();
});
test("Copy to IDE fallback is focused and its actual current-draft challenge runs in Node",async({page})=>{
  await open(page);await page.evaluate(()=>Object.defineProperty(navigator,"clipboard",{configurable:true,value:undefined}));
  const code=solution+'\n// exact current draft';await setCode(page,code,ID);await workbench(page,ID).getByRole("button",{name:"Copy to IDE"}).click();
  const area=page.getByTestId("copy-fallback").getByRole("textbox");await expect(area).toBeFocused();const text=await area.inputValue();expect(text).toContain(code);expect(text).not.toContain("DEC-92");expect(text).not.toContain("function transform");
  const dir=await mkdtemp(join(tmpdir(),"two-exports-ide-"));
  try {await writeFile(join(dir,"challenge.js"),text);const {stdout}=await promisify(execFile)(process.execPath,["challenge.js"],{cwd:dir});expect(JSON.parse(stdout.split("\n").slice(1).join("\n"))).toEqual(expectedOutput(exercise.checks[0]));}finally{await rm(dir,{recursive:true,force:true});}
  await expect(workbench(page,ID)).toHaveAttribute("data-runs","0");await expect(workbench(page,ID)).toHaveAttribute("data-checks","0");
});
for(const [width,height] of [[1920,1080],[1366,768],[375,740]]) test(`keyboard, reduced motion, editor and source/output layouts at ${width}px`,async({page,browserName})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
  await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:"reduce"});await open(page,false);
  await page.getByRole("link",{name:"Skip to content"}).focus();await page.keyboard.press("Enter");await expect(page.locator("main")).toBeFocused();
  await workbench(page,ID).getByRole("button",{name:"Run",exact:true}).focus();await page.keyboard.press("Enter");await expect(page.getByLabel("Agreeing pairs",{exact:true})).toBeFocused();
  await page.keyboard.type("2");await page.keyboard.press("Tab");await page.keyboard.press("Enter");
  await setCode(page,solution,ID);await page.keyboard.press("Control+Enter");await expect(workbench(page,ID)).toHaveAttribute("data-runs","1");
  const bench=workbench(page,ID);await bench.getByRole("button",{name:"Expand editor"}).focus();await page.keyboard.press("Enter");await expect(bench.getByRole("button",{name:"Restore editor size"})).toBeFocused();
  await bench.getByLabel("Wrap long lines").focus();await page.keyboard.press("Space");await expect(bench.getByLabel("Wrap long lines")).toBeChecked();
  expect(await page.getByTestId(`editor-${ID}`).evaluate(e=>getComputedStyle(e).resize)).toBe("vertical");
  await check(page,ID);await expect(page.getByTestId("check-summary")).toHaveText("All 20 checks passed.");
  for(const name of ["Restore editor size","Copy to IDE","Run","Check solution"]) {const box=await bench.getByRole("button",{name,exact:true}).boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const semantics=await page.evaluate(()=>({ids:[...document.querySelectorAll('[id]')].map(e=>e.id),badHeaders:document.querySelectorAll('th:not([scope])').length,unnamed:[...document.querySelectorAll('.table-wrap')].filter(e=>!e.getAttribute('aria-label')).length}));
  expect(new Set(semantics.ids).size).toBe(semantics.ids.length);expect(semantics.badHeaders).toBe(0);expect(semantics.unnamed).toBe(0);
  await bench.getByRole("button",{name:"Restore editor size"}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  // WebKit screenshot capture injects a stylesheet blocked by production CSP.
  // Layout and console assertions run in every engine; capture in Chromium.
  if(browserName==="chromium") await page.screenshot({path:`/tmp/dd-case4-${width}.png`,fullPage:true});
  expect(errors).toEqual([]);
});
