import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';
import { firstReportingToolCase } from '../../src/missions/firstReportingTool.js';
import { independentReportingSolution } from '../support/firstReportingTool.js';
import { check, output, outputJson, run, setCode, workbench } from './helpers.js';
const [main,variation]=firstReportingToolCase.exercises, ID=main.id, VID=variation.id, solution=main.solution.code;
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('data-detective:v1')));
async function open(page,skip=true) {
  await page.goto('./#/case/first-reporting-tool');
  await expect(page.getByRole('heading',{name:'Your First Reporting Tool',level:2})).toBeVisible();
  if(skip)await page.getByRole('button',{name:'Skip for now'}).click();
}
for(const [name,code] of [['Map',solution],['independent searches',independentReportingSolution]]) test(`${name}: full real-worker outputs match all handwritten report and period expectations`,async({page})=>{
  await open(page);
  await page.evaluate(()=>{
    window.__weekly=[];
    window.addEventListener('message',event=>{
      const frame=document.querySelector('iframe[title="Code runner"]');
      if(event.source===frame?.contentWindow && event.origin==='null' && event.data?.type==='result') window.__weekly.push(event.data.result);
    });
  });
  await setCode(page,code,ID);await check(page,ID);
  await expect(page.getByTestId('check-summary')).toHaveText(`All ${main.checks.length} checks passed.`);
  const reports=await page.evaluate(()=>window.__weekly);
  expect(reports).toHaveLength(main.checks.length);
  reports.forEach((r,i)=>{
    const fixture=main.checks[i];expect(r.mutated).not.toBe(true);
    if(fixture.expectedError)expect(r.error.message).toBe(fixture.expectedError);
    else expect(JSON.parse(r.outputJson)).toEqual(fixture.expected);
  });
  await expect.poll(async()=>(await saved(page))?.exercises[ID].solved?.code).toBe(code);
  await expect(page.getByRole('button',{name:/Download/})).toHaveCount(5);
});
test('investigation, prediction, starter, actual groups and inspectable audit evidence',async({page})=>{
  await open(page,false);const bench=workbench(page,ID);
  await expect(page.getByRole('region',{name:'Source: work orders',exact:true})).toContainText('"00110"');
  await expect(page.getByRole('region',{name:'Source: field time',exact:true})).toContainText('"2.50"');
  await bench.getByRole('button',{name:'Run',exact:true}).click();await expect(page.getByLabel('Reportable entries', {exact:true})).toBeFocused();
  await expect(bench).toHaveAttribute('data-runs','0');
  await page.getByLabel('Reportable entries',{exact:true}).fill('1');await page.getByRole('button',{name:'Save prediction'}).click();
  await expect(page.getByRole('heading',{name:main.title,exact:true})).toBeFocused();
  await run(page,ID);await expect(output(page,ID)).toContainText('Return the weekly report');await expect(page.getByTestId('solved-panel')).toHaveCount(0);
  await setCode(page,solution,ID);await run(page,ID);
  expect(await outputJson(page,ID)).toEqual(main.checks[0].expected);
  await expect(output(page,ID)).toContainText('You predicted 1 reportable entries. Your code returned 5');
  for(const name of ['Reliable weekly totals','Daily breakdown','Site breakdown','Audit accounting','orders audit','entries audit']) await expect(output(page,ID).getByRole('region',{name,exact:true})).toBeVisible();
  await output(page,ID).getByText(/Source line 13/).click();await expect(output(page,ID)).toContainText('invalid-date');await expect(output(page,ID)).toContainText('missing-hours');
  await expect(page.getByTestId('case-status')).toHaveText('Open case');await check(page,ID);
  await expect(page.getByTestId('case-status')).toHaveText('Solved');
  await page.getByTestId('check-panel').getByText('Inspect this dataset',{exact:true}).first().click();
  await expect(page.getByRole('region',{name:'The weekly investigation: work orders',exact:true})).toBeVisible();
});
test('a correct total with a broken audit and sample hardcoding cannot solve',async({page})=>{
  await open(page);
  for(const code of [solution.replace('audit: {orders, entries}','audit: {orders, entries: entries.slice(1)}'),`function buildWeeklyReport(){return ${JSON.stringify(main.checks[0].expected)};}`]) {
    await setCode(page,code,ID);await check(page,ID);
    await expect(page.getByTestId('check-summary')).not.toHaveText(`All ${main.checks.length} checks passed.`);
    await expect(page.getByTestId('solved-panel')).toHaveCount(0);
  }
});
test('main and independent variation keep drafts, hints, reveal and checked code separately',async({page})=>{
  await open(page);await setCode(page,solution,ID);await check(page,ID);
  await page.getByRole('button',{name:'Show hint 1 of 6'}).click();
  await setCode(page,'// main draft\n'+solution,ID);
  await page.getByRole('button',{name:'Independent variation',exact:true}).click();
  await expect(page.getByTestId(`editor-${VID}`)).toContainText('design your own pipeline');
  await page.getByRole('button',{name:'Show hint 1 of 3'}).click();
  await page.getByRole('button',{name:'Show the explained solution…'}).click();
  await expect(page.getByRole('button',{name:'Yes, show the solution'})).toBeFocused();
  await page.getByRole('button',{name:'Not yet'}).click();await expect(page.getByTestId('solution')).toHaveCount(0);
  await page.getByRole('button',{name:'Show the explained solution…'}).click();await page.getByRole('button',{name:'Yes, show the solution'}).click();
  await expect(page.getByTestId('solution')).toBeFocused();await page.getByRole('button',{name:'Put this code in the editor'}).click();
  await check(page,VID);await expect(page.getByTestId('check-summary')).toHaveText(`All ${variation.checks.length} checks passed.`);
  await setCode(page,'// variation draft\n'+independentReportingSolution,VID);
  await expect.poll(async()=>(await saved(page))?.exercises[VID].draft).toContain('variation draft');
  await page.reload();await page.getByRole('button',{name:'Independent variation',exact:true}).click();
  await expect(page.getByTestId(`editor-${VID}`)).toHaveValue('// variation draft\n'+independentReportingSolution);
  await expect(page.getByTestId('solution')).toBeVisible();
  await page.getByRole('button',{name:'Main investigation',exact:true}).click();
  await expect(page.getByTestId(`editor-${ID}`)).toHaveValue('// main draft\n'+solution);await expect(page.getByTestId('solution')).toHaveCount(0);
  const state=await saved(page);expect(state.exercises[ID].solved.code).toBe(solution);expect(state.exercises[VID].solved.code).toBe(solution);expect(state.exercises[ID].solutionRevealed).toBe(false);expect(state.exercises[VID].solved.solutionRevealed).toBe(true);
  await page.getByRole('link',{name:/Toolbox/}).click();
  await expect(page.getByTestId(`toolbox-${ID}`)).toBeVisible();await expect(page.getByTestId(`toolbox-${VID}`)).toBeVisible();
  await expect(page.getByRole('button',{name:/Download/})).toHaveCount(10);
});
test('errors, malformed actual output, both-source and period mutation recover',async({page,browserName})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
  for(const [code,text] of [
    ['function buildWeeklyReport(){return x=>;}','Syntax error'],
    ['function buildWeeklyReport(){\n throw Error("trace source");\n}','trace source'],
    ['function other(){}','buildWeeklyReport'],
    ['function buildWeeklyReport(){return {daily:[],sites:[null],counts:null,audit:{orders:[null],entries:[null]}};}','Reliable weekly totals'],
    ['function buildWeeklyReport(){return null;}','Return the weekly report'],
    ['function buildWeeklyReport(){return {daily:[],sites:[],counts:{},audit:{orders:[{disposition:{toString:null}}],entries:[]}};}','Unknown disposition']]) {
    await setCode(page,code,ID);await run(page,ID);await expect(output(page,ID)).toContainText(text);
    if(browserName==='chromium' && text==='trace source')await expect(output(page,ID)).toContainText('line 2');
    await check(page,ID);await expect(page.getByTestId('solved-panel')).toHaveCount(0);
  }
  for(const mutation of ['rawOrders[0].site="changed";','rawEntries.reverse();','period.end="2026-11-16";']) {
    await setCode(page,solution.replace('  function validDate(text) {',mutation+'\n  function validDate(text) {'),ID);await check(page,ID);
    await expect(page.getByTestId('check-panel')).toContainText('changed an input');
  }
  await setCode(page,solution.replace('throw Error("Invalid reporting period");','period.start="changed"; throw Error("Invalid reporting period");'),ID);await check(page,ID);
  await expect(page.getByTestId('check-summary')).not.toHaveText(`All ${main.checks.length} checks passed.`);
  await setCode(page,'const transform = v=>v; const rows = null;\n'+solution,ID);await check(page,ID);
  await expect(page.getByTestId('check-summary')).toHaveText(`All ${main.checks.length} checks passed.`);expect(errors).toEqual([]);
});
test('timeout, Stop, failed checks and navigation preserve last passing code',async({page})=>{
  await open(page);await setCode(page,solution,ID);await check(page,ID);
  const loop='function buildWeeklyReport(){while(true){}}',bench=workbench(page,ID);
  await setCode(page,loop,ID);await run(page,ID);await expect(output(page,ID)).toContainText('2 seconds');
  await check(page,ID);await expect(page.getByTestId('check-summary')).toContainText('stopped early');
  await bench.getByRole('button',{name:'Run',exact:true}).click();await bench.getByRole('button',{name:'Stop',exact:true}).click();await expect(output(page,ID)).toContainText('stopped');
  await bench.getByRole('button',{name:'Check solution'}).click();await bench.getByRole('button',{name:'Stop',exact:true}).click();await expect(page.getByTestId('check-panel')).toHaveCount(0); // cancelled panel has no success test id
  await bench.getByRole('button',{name:'Check solution'}).click();await page.getByRole('button',{name:'Independent variation',exact:true}).click();
  await expect(page.getByTestId(`workbench-${VID}`)).toBeVisible();await page.waitForTimeout(2200);
  await expect.poll(async()=>(await saved(page))?.exercises[ID].solved?.code).toBe(solution);expect((await saved(page))?.exercises[VID].solved).toBeNull();
  await page.getByRole('button',{name:'Main investigation',exact:true}).click();await setCode(page,solution,ID);await check(page,ID);await expect(page.getByTestId('check-summary')).toHaveText(`All ${main.checks.length} checks passed.`);
});
for(const transfer of [false,true])test(`Copy to IDE fallback executes active ${transfer?'variation':'main'} sample in real Node`,async({page})=>{
  await open(page);if(transfer)await page.getByRole('button',{name:'Independent variation',exact:true}).click();
  const exercise=transfer?variation:main;
  await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(Error('blocked'))},configurable:true});});
  await setCode(page,solution,exercise.id);await workbench(page,exercise.id).getByRole('button',{name:'Copy to IDE'}).click();
  const box=page.getByRole('textbox',{name:/Your browser didn.t allow copying automatically/});
  await expect(box).toBeFocused();const file=await box.inputValue();
  const dir=await mkdtemp(join(tmpdir(),'dd-weekly-'));
  try {
    const path=join(dir,'challenge.js');await writeFile(path,file);
    const result=await promisify(execFile)(process.execPath,[path]);
    expect(JSON.parse(result.stdout.slice(result.stdout.indexOf('\n')+1))).toEqual(exercise.checks[0].expected);
    expect(await readFile(path,'utf8')).toBe(file);
  } finally {await rm(dir,{recursive:true,force:true});}
});
for(const width of [1920,1366,375])test(`keyboard, editor controls and contained report at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:width===375?740:900});await page.emulateMedia({reducedMotion:'reduce'});await open(page);
  const bench=workbench(page,ID);await setCode(page,solution,ID);
  await bench.getByRole('button',{name:'Expand editor'}).focus();await page.keyboard.press('Enter');await expect(bench.getByRole('button',{name:'Restore editor size'})).toBeFocused();
  await bench.getByLabel('Wrap long lines').focus();await page.keyboard.press('Space');await expect(page.getByTestId(`editor-${ID}`)).toHaveAttribute('wrap','soft');
  await page.getByTestId(`editor-${ID}`).focus();await page.keyboard.press('Control+Enter');await expect(bench).toHaveAttribute('data-runs','1');
  await expect(output(page,ID).getByRole('region',{name:'Audit accounting',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`/tmp/dd-weekly-${width}.png`,fullPage:true});
});
test('draft edits during checking retain exact submitted code; older missions and Back remain available',async({page})=>{
  await open(page);await setCode(page,solution,ID);const bench=workbench(page,ID);
  await bench.getByRole('button',{name:'Check solution'}).click();await setCode(page,'// newer draft\n'+solution,ID);
  await expect(page.getByTestId('check-summary')).toHaveText(`All ${main.checks.length} checks passed.`);
  await expect(page.getByTestId('case-status')).toHaveText('Needs checking again');await expect.poll(async()=>(await saved(page))?.exercises[ID].solved?.code).toBe(solution);
  for(const id of ['missing-jobs','messy-export','doubled-totals','two-exports']) {
    await page.locator(`aside a[href="#/case/${id}"]`).click();await expect(page.getByTestId(`editor-${id}`)).toBeVisible();
  }
  await page.locator('aside a[href="#/case/first-reporting-tool"]').click();await expect(page.getByTestId(`editor-${ID}`)).toHaveValue('// newer draft\n'+solution);
  await page.goBack();await expect(page.getByRole('heading',{name:'The Two Exports',level:2})).toBeVisible();await page.goForward();await expect(page.getByTestId(`editor-${ID}`)).toBeVisible();
});
for(const timezoneId of ['America/Vancouver','Asia/Tokyo'])test.describe(`Calendar dates in ${timezoneId}`,()=>{
  test.use({timezoneId});
  test('inclusive boundaries, leap days and period validation are timezone independent',async({page})=>{
    await open(page);await setCode(page,solution,ID);await check(page,ID);
    await expect(page.getByTestId('check-summary')).toHaveText(`All ${main.checks.length} checks passed.`);
  });
});
test('clipboard success copies the exact current draft without running or saving a solve',async({page,context,browserName})=>{
  test.skip(browserName !== 'chromium', 'WebKit does not support clipboard permission grants; fallback has separate coverage.');
  await context.grantPermissions(['clipboard-read','clipboard-write']);await open(page);
  const draft='// unfinished investigation\n'+main.starterCode;
  await setCode(page,draft,ID);await workbench(page,ID).getByRole('button',{name:'Copy to IDE'}).click();
  await expect(page.getByTestId('copy-success')).toBeVisible();
  const text=await page.evaluate(()=>navigator.clipboard.readText());
  expect(text).toContain(draft);expect(text).toContain('buildWeeklyReport(caseSampleOrders, caseSampleEntries, caseSamplePeriod)');
  expect(text).not.toContain('A future week');expect(text).not.toContain(solution);
  await expect(workbench(page,ID)).toHaveAttribute('data-runs','0');await expect(workbench(page,ID)).toHaveAttribute('data-checks','0');
});
