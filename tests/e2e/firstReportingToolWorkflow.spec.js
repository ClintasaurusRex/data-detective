import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';
import { firstReportingToolCase } from '../../src/missions/firstReportingTool.js';
import { independentReportingSolution } from '../support/firstReportingTool.js';
import { check, run, setCode, workbench } from './helpers.js';
const [main, variation] = firstReportingToolCase.exercises;
const fileNames = ['weekly-report.mjs','orders.json','entries.json','period.json','README.md'];
const execNode = promisify(execFile);
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('data-detective:v1')));
async function open(page, exercise = main) {
  await page.goto('./#/case/first-reporting-tool');
  await page.getByRole('button',{name:'Skip for now'}).click();
  if(exercise===variation) await page.getByRole('button',{name:'Independent variation',exact:true}).click();
  await expect(page.locator('main')).toContainText('standalone three-input Node tool');
}
async function download(page, entry, name, destination) {
  const pending=page.waitForEvent('download');
  await entry.getByRole('button',{name:`Download ${name}`,exact:true}).click();
  const file=await pending;expect(file.suggestedFilename()).toBe(name);
  if(destination)await file.saveAs(destination);
  return readFile(destination ?? await file.path(),'utf8');
}
for(const exercise of [main,variation]) for(const [algorithm,solution] of [['Map',main.solution.code],['search',independentReportingSolution]]) {
  test(`${exercise.id} ${algorithm}: genuine downloads match all 28 complete worker reports and refuse four invalid periods`,async({page})=>{
    await open(page,exercise);
    const code=`const fs=1, Console=2, report=3, json=4, ORDER_FIELDS=[];
function runScript(){} function validateWeeklyReport(){} function validReportingPeriod(){}
console.log('checked code loading');globalThis.console.log('global console');
${solution.replace('function buildWeeklyReport(rawOrders, rawEntries, period) {','function buildWeeklyReport(rawOrders, rawEntries, period) { console.warn("reporting invocation");')}`;
    await setCode(page,code,exercise.id);
    await page.evaluate(()=>{
      window.__weeklyFiles=[];
      window.addEventListener('message',event=>{
        const frame=document.querySelector('iframe[title="Code runner"]');
        if(event.source===frame?.contentWindow && event.origin==='null' && event.data?.source==='data-detective-sandbox' && event.data.type==='result') window.__weeklyFiles.push(event.data.result);
      });
    });
    await check(page,exercise.id);await expect(page.getByTestId('check-summary')).toHaveText('All 32 checks passed.');
    const browser=await page.evaluate(()=>window.__weeklyFiles);expect(browser).toHaveLength(32);
    const dir=await mkdtemp(join(tmpdir(),'weekly-real-download-'));
    try {
      const entry=page.getByTestId(`toolbox-${exercise.id}`);
      for(const name of fileNames)await download(page,entry,name,join(dir,name));
      const script=await readFile(join(dir,fileNames[0]),'utf8');expect(script).toContain(code);
      for(const hidden of ['reportingDatasets','CENTURY','reversedPeriod'])expect(script).not.toContain(hidden);
      const sourceValues=[exercise.orders,exercise.entries,exercise.period];
      for(const [index,name]of fileNames.slice(1,4).entries())expect(JSON.parse(await readFile(join(dir,name),'utf8'))).toEqual(sourceValues[index]);
      const guide=(await readFile(join(dir,'README.md'),'utf8')).replace(/\s+/g,' ');
      for(const concept of ['Node.js 24','no npm install','normal filesystem permissions','integer hundredths','stdout','stderr','another-period.json','conflictGroups'])expect(guide).toContain(concept);
      const invoke=args=>execNode(process.execPath,['weekly-report.mjs',...args],{cwd:dir,timeout:10000,env:{...process.env,NODE_PATH:'',FORCE_COLOR:'0',NO_COLOR:'1'}});
      let complete=0, refused=0;
      for(const [index,dataset]of exercise.checks.entries()) {
        const inputNames=['next-orders.json','next-entries.json','next-period.json'];
        const contents=dataset.rows.map(value=>JSON.stringify(value,null,2)+'\n');
        for(const [i,name]of inputNames.entries())await writeFile(join(dir,name),contents[i]);
        const result=await invoke(inputNames).then(r=>({...r,code:0}),e=>({stdout:e.stdout,stderr:e.stderr,code:e.code}));
        expect(browser[index].mutated).not.toBe(true);
        if(dataset.expectedError) {
          expect(browser[index].error.message).toBe('Invalid reporting period');
          expect(result.code).toBe(1);expect(result.stdout).toBe('');expect(result.stderr).toContain('Invalid reporting period');
          await writeFile(join(dir,'existing.json'),'KEEP THIS REPORT');
          const saved=await invoke([...inputNames,'existing.json']).then(r=>({...r,code:0}),e=>({stdout:e.stdout,stderr:e.stderr,code:e.code}));
          expect(saved.code).toBe(1);expect(saved.stdout).toBe('');expect(saved.stderr).toContain('Invalid reporting period');
          expect(await readFile(join(dir,'existing.json'),'utf8')).toBe('KEEP THIS REPORT');refused++;
        } else {
          expect(result.code,result.stderr).toBe(0);
          const report=JSON.parse(result.stdout);
          expect(report,dataset.name).toEqual(JSON.parse(browser[index].outputJson));
          expect(report,dataset.name).toEqual(dataset.expected);
          expect(report.audit.orders.map(item=>item.record)).toEqual(dataset.orders);
          expect(report.audit.entries.map(item=>item.record)).toEqual(dataset.entries);complete++;
        }
        for(const [i,name]of inputNames.entries())expect(await readFile(join(dir,name),'utf8')).toBe(contents[i]);
        for(const log of ['checked code loading','global console','reporting invocation'])expect(result.stderr).toContain(log);
      }
      expect(complete).toBe(28);expect(refused).toBe(4);
      const result=await invoke([...fileNames.slice(1,4),'report.json']);expect(result.stdout).toBe('');
      expect(JSON.parse(await readFile(join(dir,'report.json'),'utf8'))).toEqual(exercise.checks[0].expected);
    }finally{await rm(dir,{recursive:true,force:true});}
  });
}
test('Run and sample hardcoding never qualify a download',async({page})=>{
  await open(page);await setCode(page,independentReportingSolution,main.id);await run(page,main.id);
  await expect(page.getByRole('button',{name:/Download/})).toHaveCount(0);
  await setCode(page,`function buildWeeklyReport(){return ${JSON.stringify(main.checks[0].expected)};}`,main.id);await check(page,main.id);
  await expect(page.getByTestId('check-summary')).not.toHaveText('All 32 checks passed.');
  await expect(page.getByRole('button',{name:/Download/})).toHaveCount(0);await page.reload();
  await page.getByRole('link',{name:'Toolbox (0)'}).click();await expect(page.locator('main')).toContainText('weekly JSON reporting tool for Case 5');
});
test('each independent exercise retains its own checked artifacts through edits, failed and cancelled checks, navigation and refresh',async({page})=>{
  await open(page,variation);
  const checked = new Map([[variation,independentReportingSolution+'\n// variation checked'],[main,main.solution.code+'\n// main checked']]);
  for(const [exercise,code]of checked) {
    if(exercise===main)await page.getByRole('button',{name:'Main investigation',exact:true}).click();
    await setCode(page,code,exercise.id);await check(page,exercise.id);await expect(page.getByTestId('check-summary')).toHaveText('All 32 checks passed.');
    const draft='function buildWeeklyReport(){return {};} // '+exercise.id+' unchecked';
    await setCode(page,draft,exercise.id);
    const entry=page.getByTestId(`toolbox-${exercise.id}`);
    expect(await download(page,entry,'weekly-report.mjs')).toContain(code);
    await check(page,exercise.id);await expect.poll(async()=>(await saved(page))?.exercises[exercise.id]?.checked?.passed).toBe(false);
    await setCode(page,'function buildWeeklyReport(){while(true){}}',exercise.id);
    const bench=workbench(page,exercise.id);await bench.getByRole('button',{name:'Check solution'}).click();await bench.getByRole('button',{name:'Stop',exact:true}).click();
    await expect(bench.getByRole('region',{name:'Check results',exact:true})).toContainText('stopped before it finished');
    expect(await download(page,entry,'weekly-report.mjs')).toContain(code);
    await setCode(page,draft,exercise.id);await expect.poll(async()=>(await saved(page))?.exercises[exercise.id]?.draft).toBe(draft);
  }
  await page.reload();
  for(const [exercise,code]of checked)expect((await saved(page)).exercises[exercise.id].solved.code).toBe(code);
  await page.locator('aside a[href="#/case/two-exports"]').click();await page.goBack();
  await page.getByRole('link',{name:'Toolbox (2)'}).click();
  for(const [exercise,code]of checked) {
    const entry=page.getByTestId(`toolbox-${exercise.id}`),script=await download(page,entry,'weekly-report.mjs');
    expect(script).toContain(code);expect(script).not.toContain('unchecked');
    expect(script).not.toContain(exercise===main?'// variation checked':'// main checked');
    expect(JSON.parse(await download(page,entry,'orders.json'))).toEqual(exercise.orders);
    expect(JSON.parse(await download(page,entry,'entries.json'))).toEqual(exercise.entries);
    expect(JSON.parse(await download(page,entry,'period.json'))).toEqual(exercise.period);
    await expect(entry.getByLabel(`Checked code for ${exercise.title}`)).toHaveText(code);
  }
});
test('editing during checks exports submitted code, preserving the newer draft',async({page})=>{
  await open(page);await setCode(page,independentReportingSolution,main.id);
  await workbench(page,main.id).getByRole('button',{name:'Check solution'}).click();
  const draft='// newer draft\n'+independentReportingSolution;await setCode(page,draft,main.id);
  await expect(page.getByTestId('check-summary')).toHaveText('All 32 checks passed.');await expect(page.getByTestId('case-status')).toHaveText('Needs checking again');
  const script=await download(page,page.getByTestId(`toolbox-${main.id}`),'weekly-report.mjs');
  expect(script).toContain(independentReportingSolution);expect(script).not.toContain('// newer draft');await expect(page.getByTestId(`editor-${main.id}`)).toHaveValue(draft);
});
test('download failure offers focused complete file text and retry recovers',async({page})=>{
  await open(page);await setCode(page,independentReportingSolution,main.id);await check(page,main.id);
  const entry=page.getByTestId(`toolbox-${main.id}`);
  await page.evaluate(()=>{window.__blobURL=URL.createObjectURL;URL.createObjectURL=()=>{throw Error('download unavailable');};});
  await entry.getByRole('button',{name:'Download weekly-report.mjs',exact:true}).click();
  await expect(entry.getByRole('alert')).toContainText('could not start the download');
  const box=entry.getByRole('textbox',{name:'Copy weekly-report.mjs to save manually'});await expect(box).toBeFocused();
  const text=await box.inputValue();expect(text).toContain(independentReportingSolution);
  expect(await box.evaluate(el=>el.selectionEnd-el.selectionStart)).toBe(text.length);
  await page.evaluate(()=>{URL.createObjectURL=window.__blobURL;});
  expect(await download(page,entry,'weekly-report.mjs')).toBe(text);await expect(entry.getByRole('alert')).toHaveCount(0);
  await expect(entry.getByRole('status')).toContainText('Started download of weekly-report.mjs');
});
for(const width of [1920,1366,375])test(`weekly downloads and instructions work by keyboard at ${width}px`,async({page,browserName})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewportSize({width,height:width===375?740:900});await page.emulateMedia({reducedMotion:'reduce'});
  await open(page);await setCode(page,independentReportingSolution,main.id);await check(page,main.id);
  await page.getByRole('link',{name:'Toolbox (1)'}).focus();await page.keyboard.press('Enter');await expect(page.locator('main')).toBeFocused();
  const entry=page.getByTestId(`toolbox-${main.id}`);await entry.getByRole('button',{name:'Download weekly-report.mjs',exact:true}).focus();
  for(const name of fileNames) {
    const button=entry.getByRole('button',{name:`Download ${name}`,exact:true});await expect(button).toBeFocused();
    expect(await button.evaluate(el=>getComputedStyle(el).outlineStyle+' '+getComputedStyle(el).outlineWidth)).toBe('solid 3px');
    const pending=page.waitForEvent('download');await page.keyboard.press('Enter');expect((await pending).suggestedFilename()).toBe(name);
    const box=await button.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);expect(box.height).toBeGreaterThanOrEqual(40);
    await page.keyboard.press('Tab');
  }
  const summary=entry.locator('summary');await expect(summary).toBeFocused();await page.keyboard.press('Enter');await expect(entry.locator('details')).toHaveAttribute('open','');
  for(const text of ['node weekly-report.mjs orders.json entries.json period.json report.json','stdout','stderr','audit.orders','All three inputs','Only run code you trust'])await expect(entry).toContainText(text);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(browserName==='chromium')await page.screenshot({path:`/tmp/dd-weekly-toolbox-${width}.png`,fullPage:true});
  await page.keyboard.press('Enter');await expect(entry.locator('details')).not.toHaveAttribute('open');expect(errors).toEqual([]);
});
