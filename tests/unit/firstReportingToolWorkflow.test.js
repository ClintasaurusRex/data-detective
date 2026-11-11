import { execFile, spawn } from 'node:child_process';
import { access, chmod, link, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { buildReportingWorkflow } from '../../src/export/firstReportingToolWorkflow.js';
import { firstReportingToolCase } from '../../src/missions/firstReportingTool.js';
import { independentReportingSolution, executeReporting } from '../support/firstReportingTool.js';
import { reportingCode } from '../../src/missions/firstReportingTool.adapter.js';

const exec = promisify(execFile), [main, variation] = firstReportingToolCase.exercises;
const sample = ['orders.json', 'entries.json', 'period.json'];
let dir;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'weekly-report-')); await writeFile(join(dir, 'old.json'), 'KEEP OLD REPORT'); });
afterEach(async () => { await chmod(dir, 0o700); await rm(dir, {recursive:true, force:true}); });
async function generate(code = main.solution.code, exercise = main) {
  const files = buildReportingWorkflow(exercise, {code});
  for (const file of files) await writeFile(join(dir, file.name), file.text);
  return files;
}
async function node(args = sample) {
  try { return {...await exec(process.execPath, ['weekly-report.mjs', ...args], {cwd:dir, timeout:10000,
    env:{...process.env, FORCE_COLOR:'0', NO_COLOR:'1', NODE_PATH:''}}), code:0}; }
  catch (error) { return {stdout:error.stdout, stderr:error.stderr, code:error.code, signal:error.signal}; }
}
async function failure(args = [...sample, 'old.json'], message = /Invalid report/) {
  const result = await node(args);
  expect(result.code, result.stderr).toBe(1); expect(result.stdout).toBe(''); expect(result.stderr).toMatch(message);
  expect(await readFile(join(dir, 'old.json'), 'utf8')).toBe('KEEP OLD REPORT');
  return result;
}
async function sources(rows) { for (const [index, value] of rows.entries()) await writeFile(join(dir, sample[index]), JSON.stringify(value)); }
const wrap = change => independentReportingSolution.replace('function buildWeeklyReport(', 'function calculate(') + `
function buildWeeklyReport(rawOrders, rawEntries, period) {
  const report=structuredClone(calculate(rawOrders, rawEntries, period)); ${change}; return report;
}`;

for (const exercise of [main, variation]) {
  it(exercise.id + ': exactly five files with own sample, period and verbatim checked code', async () => {
    const code = independentReportingSolution + '\r\n// ` ${text} </script> */ "quotes"\r\n';
    const files = await generate(code, exercise);
    expect(files.map(f=>f.name)).toEqual(['weekly-report.mjs', ...sample, 'README.md']);
    expect(files[0].text).toContain(code); expect(files[0].text).not.toContain(main.solution.code);
    expect(files.slice(1,4).map(f=>JSON.parse(f.text))).toEqual([exercise.orders, exercise.entries, exercise.period]);
    for (const f of files) expect(f.text).not.toMatch(/reportingDatasets|independentReportingSolution|CENTURY|reversedPeriod/);
    const guide = files[4].text.replace(/\s+/g, ' ');
    for (const text of ['Node.js 24', 'no npm install', 'normal filesystem permissions', 'stdout', 'stderr', 'source-scoped',
      'integer hundredths', 'inclusive', 'another-period.json', 'conflictGroups', 'power loss', 'Ctrl+C']) expect(guide).toContain(text);
    const result = await node(); expect(result.code, result.stderr).toBe(0); expect(JSON.parse(result.stdout)).toEqual(exercise.checks[0].expected);
  });
  for (const [algorithm, code] of [['Map', main.solution.code], ['search', independentReportingSolution]]) {
    it.each(exercise.checks)(exercise.id + ' ' + algorithm + ': real-process $name', async check => {
      await generate(code, exercise); await sources(check.rows);
      const result = await node();
      if (check.expectedError) {
        expect(result.code).toBe(1); expect(result.stdout).toBe(''); expect(result.stderr).toContain('Invalid reporting period');
        await failure([...sample, 'old.json'], /Invalid reporting period/);
        expect((await node([...sample, 'new.json'])).code).toBe(1);
        await expect(access(join(dir, 'new.json'))).rejects.toThrow();
      } else { expect(result.code, result.stderr).toBe(0); expect(JSON.parse(result.stdout)).toEqual(check.expected); }
      for (const [index, value] of check.rows.entries()) expect(await readFile(join(dir, sample[index]), 'utf8')).toBe(JSON.stringify(value));
    });
  }
}
for (const [sourceIndex, row] of [[0, main.orders[0]], [1, main.entries[0]]]) {
  const malformed = [
    ['broken JSON', '[{]', /valid JSON/],
    ...[null, {}, 'text', 2].map(x=>['nonarray '+JSON.stringify(x), JSON.stringify(x), /JSON array/]),
    ...[null, [], {}, {...row, extra:1}, ...Object.keys(row).map(key=>{const r={...row};delete r[key];return r;})]
      .map((x,i)=>['wrong shape '+i, JSON.stringify([x]), /expected exactly/]),
    ...Object.keys(row).slice(1).map(key=>[key+' numeric', JSON.stringify([{...row,[key]:2}]), /raw string/]),
    ...[0,-1,1.5,2**53,'2',null].map(line=>['invalid line '+line, JSON.stringify([{...row,line}]), /unique positive safe integer/]),
    ['repeated line', JSON.stringify([row,row]), /unique positive safe integer/],
  ];
  it.each(malformed)(`source ${sourceIndex}: %s stops before learner code loads`, async (_name,text,message) => {
    await generate('console.log("LEARNER RAN"); function buildWeeklyReport(){ throw Error("LEARNER RAN"); }');
    await writeFile(join(dir, sample[sourceIndex]), text);
    expect((await failure([...sample,'old.json'],message)).stderr).not.toContain('LEARNER RAN');
    expect((await node([...sample,'new.json'])).code).toBe(1); await expect(access(join(dir,'new.json'))).rejects.toThrow();
    expect(await readFile(join(dir,sample[sourceIndex]),'utf8')).toBe(text);
  });
}
it.each(['{', 'null', '[]', '"period"', '{}', '{"start":"2026-11-09"}', '{"start":"a","end":"b","extra":0}', '{"start":2026,"end":"b"}', '{"start":"a","end":null}'])('rejects structural period %s before learner loading', async text => {
  await generate('throw Error("LEARNER RAN");'); await writeFile(join(dir,sample[2]),text);
  expect((await failure([...sample,'old.json'],/Period must|valid JSON/)).stderr).not.toContain('LEARNER RAN');
});
it('preserves raw business defects, same source lines across files, repeated IDs and nonnumeric source order', async () => {
  await generate();
  const orders=[{line:42,jobId:' a ',site:' Mixed  Site ',status:' Complete '},{line:2,jobId:'a',site:'Mixed  Site',status:'complete'},
    {line:7,jobId:' ',site:' ',status:' Mystery '}];
  const entries=[{line:42,entryId:' 01 ',jobId:'a',date:' 2400-02-29 ',hours:' 00.00 '},
    {line:2,entryId:'01',jobId:'a',date:'2400-02-29',hours:'0'},
    {line:11,entryId:'02',jobId:'a',date:'1900-02-29',hours:'1.234'},
    {line:1,entryId:'',jobId:' ',date:' ',hours:' '}];
  const period={start:'2400-02-29',end:'2400-02-29'};
  await sources([orders,entries,period]);
  await writeFile(join(dir,sample[0]),'\uFEFF'+JSON.stringify(orders));
  const result=await node(); expect(result.code,result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual(executeReporting(reportingCode(independentReportingSolution),[orders,entries,period]).output);
});
it('separates global/lexical console streams and isolates helper names', async () => {
  await generate(`const fs=1, Console=2, constants=3, resolve=4, dirname=5, join=6;
const ORDER_FIELDS=[], ENTRY_FIELDS=[], ORDER_CLEAN=[], ENTRY_CLEAN=[], DISPOSITIONS={};
function runScript(){} function readJsonInput(){} function saveReport(){} function checkOutput(){}
function validateReportingInput(){} function validateWeeklyReport(){} function validReportingPeriod(){}
function calendarDate(){} function fieldsAre(){} function loadCheckedCode(){}
console.log('loading'); globalThis.console.log('global'); console.info('info'); console.warn('warning'); console.error('error log'); console.table([{value:1}]);
${independentReportingSolution}`);
  const result=await node(); expect(result.code,result.stderr).toBe(0); expect(JSON.parse(result.stdout)).toEqual(main.checks[0].expected);
  for(const text of ['loading','global','info','warning','error log','value'])expect(result.stderr).toContain(text);
});
const corruptions = [
  'report.audit.entries=[]', 'report.audit.entries.reverse()', 'report.audit.orders.pop()',
  'report.audit.entries[0].record.hours="2.5"', 'delete report.audit.orders[0].record.site',
  'report.audit.entries[0].record.line=999', 'report.audit.orders[0].cleaned.site="north reservoir"',
  'report.audit.entries[0].cleaned.jobId=110', 'report.audit.entries[0].cleaned.hundredths=2.5',
  'report.audit.entries[11].reasons.pop()', 'report.audit.entries[11].reasons.reverse()',
  'report.audit.entries[11].reasons.push("missing-job-id")', 'report.audit.entries[11].cleaned={}',
  'report.audit.entries[4].disposition="included"', 'report.audit.entries[3].disposition="included"',
  'report.audit.entries[3].duplicateOf=5', 'report.audit.entries[3].orderLine=2',
  'report.audit.entries[6].orderLine=2', 'report.audit.entries[9].disposition="included"',
  'report.audit.entries[7].disposition="included"', 'report.audit.entries[10].disposition="rejected"',
  'report.audit.entries[2].orderLine=2', 'report.counts.entries.conflictGroups=2',
  'report.counts.entries.valid--', 'report.totalHours=4', 'report.totalHours="4"',
  'report.daily.reverse()', 'report.sites.reverse()', 'report.daily[0].jobCount=1',
  'report.daily.push(report.daily[0])', 'report.sites[0].hours="0.00"', 'report.daily[0].hours="0.00"',
  'report.entryCount--', 'report.jobCount=5', 'report.extra=1', 'report.audit.entries[0].extra=1',
  'report.period.end="2026-11-16"', 'report.audit.entries[0]=null', 'report.counts.orders.input="8"',
  'report.counts=null', 'report.jobCount=NaN', 'report.counts.orders.extra=0', 'report.sites[0].extra=0',
];
it.each(corruptions)('refuses incorrect evidence: %s', async change => { await generate(wrap(change)); await failure(); });
it.each(['null','undefined','[]','1','"report"','{}','Promise.resolve({})'])('refuses malformed return %s', async value => {
  await generate(`function buildWeeklyReport(){return ${value};}`); await failure();
});
it.each([
  'throw "loading failed"; function buildWeeklyReport(){}', 'function other(){}',
  'function buildWeeklyReport(){throw Error("runtime failed");}',
  wrap('rawOrders[0].site="changed"'), wrap('rawEntries.reverse()'), wrap('period.start="changed"'),
  wrap('Object.defineProperty(report,"toJSON",{value(){throw Error("serialization failed")}})'),
  wrap('Object.defineProperty(report,"toJSON",{value(){return {}}})'),
  wrap('Object.defineProperty(report,"toJSON",{value(){rawOrders[0].site="changed";return {...report}}})'),
])('preserves files on code/mutation/serialization failure', async code => {
  await generate(code); await failure([...sample,'old.json'],/valid report/);
});
it('rejects hardcoded sample report on a different week', async () => {
  await generate(`function buildWeeklyReport(){return ${JSON.stringify(main.checks[0].expected)};}`);
  expect((await node()).code).toBe(0); await sources([variation.orders,variation.entries,variation.period]); await failure();
});
for(const check of main.checks.filter(c=>c.expectedError)) {
  for(const [label,body] of [['return','return {}'],['wrong error','throw Error("wrong error")'],['string throw','throw "Invalid reporting period"'],['mutation','period.start="changed";throw Error("Invalid reporting period")']]) {
    it(check.id+': invalid period '+label+' cannot be concealed by guards',async()=>{
      await generate(`function buildWeeklyReport(a,b,period){console.error("CALLED");${body};}`); await sources(check.rows);
      const result=await failure([...sample,'old.json'],/invalid period|Invalid period|changed an input/);
      expect(result.stderr).toContain('CALLED');
    });
  }
}
it('refuses unsafe accumulated totals rather than silently rounding',async()=>{
  await generate(); await sources([[{line:2,jobId:'x',site:'x',status:'complete'}],
    ['a','b'].map((entryId,i)=>({line:i+1,entryId,jobId:'x',date:main.period.start,hours:'90071992547409.91'})),main.period]);
  await failure([...sample,'old.json'],/safe integer hundredths/);
});
it('saves formatted complete output with spaced paths and cleans staging',async()=>{
  await generate();await writeFile(join(dir,'weekly orders.json'),JSON.stringify(main.orders));
  const result=await node(['weekly orders.json',...sample.slice(1),'old.json']);expect(result.code,result.stderr).toBe(0);expect(result.stdout).toBe('');
  expect(result.stderr).toContain(join(dir,'old.json'));expect(await readFile(join(dir,'old.json'),'utf8')).toBe(JSON.stringify(main.checks[0].expected,null,2)+'\n');
  expect((await readdir(dir)).filter(x=>x.startsWith('.data-detective-'))).toEqual([]);
});
it.each([[],['orders.json'],sample.slice(0,2),[...sample,'old.json','extra'],['',...sample.slice(1)],['--help',...sample.slice(1)]])('explains arguments %j',async(...args)=>{await generate();await failure(args,/Usage: node weekly-report.mjs/);});
for(const index of [0,1,2]) {
  it('explains missing source '+index,async()=>{await generate();const args=[...sample];args[index]='missing.json';await failure([...args,'old.json'],/read input.*not found/);});
  it('explains directory source '+index,async()=>{await generate();const args=[...sample];args[index]='.';await failure([...args,'old.json'],/regular JSON file/);});
  for(const alias of ['same','resolved','symlink','hardlink'])it(`protects input ${index} through ${alias}`,async()=>{
    await generate();const path=sample[index],before=await readFile(join(dir,path),'utf8');
    const output=alias==='same'?path:alias==='resolved'?'./'+path:'alias.json';
    if(alias==='symlink')await symlink(join(dir,path),join(dir,output));
    if(alias==='hardlink')await link(join(dir,path),join(dir,output));
    await failure([...sample,output],/different file|points to an input/);expect(await readFile(join(dir,path),'utf8')).toBe(before);
  });
  it('protects source '+index+' when it is an input alias',async()=>{
    await generate();for(const kind of ['symbolic','hard']) {
      const alias=kind+'.json';await (kind==='symbolic'?symlink:link)(join(dir,sample[index]),join(dir,alias));
      const args=[...sample];args[index]=alias;await failure([...args,sample[index]],/points to an input/);
    }
  });
  it('handles actual source permission failure '+index,async()=>{
    await generate();await chmod(join(dir,sample[index]),0);
    try{await failure([...sample,'old.json'],/permission denied/);}finally{await chmod(join(dir,sample[index]),0o600);}
  });
}
it.each(['missing/report.json','.'])('handles output path failure %s',async path=>{await generate();await failure([...sample,path],/write output/);});
it('rejects dangling and unrelated output symlinks',async()=>{
  await generate();for(const target of ['missing.json','old.json']) {
    const alias=target+'.link';await symlink(join(dir,target),join(dir,alias));await failure([...sample,alias],/Output symlinks/);
  }
});
it('handles real output permissions and read-only staging parent',async()=>{
  await generate();await chmod(join(dir,'old.json'),0o400);await failure([...sample,'old.json'],/permission denied/);await chmod(join(dir,'old.json'),0o600);
  await mkdir(join(dir,'locked'),{mode:0o500});
  try{await failure([...sample,'locked/report.json'],/permission denied/);}finally{await chmod(join(dir,'locked'),0o700);}
});
it('preserves existing output on an actual mid-write filesystem failure',async()=>{
  await generate();
  const result=await exec('bash',['-c','ulimit -f 1\nexec "$@"','limited-node',process.execPath,'weekly-report.mjs',...sample,'old.json'],{cwd:dir}).then(
    result=>({...result,failed:false}),error=>({...error,failed:true}));
  expect(result.failed).toBe(true);expect(result.stdout).toBe('');expect(result.signal==='SIGXFSZ'||/EFBIG|file too large/i.test(result.stderr)).toBe(true);
  expect(await readFile(join(dir,'old.json'),'utf8')).toBe('KEEP OLD REPORT');
});
it('preserves all files when interrupted before output preparation',async()=>{
  await generate('function buildWeeklyReport(){console.error("READY");while(true){}}');
  const before=await Promise.all(sample.map(path=>readFile(join(dir,path),'utf8')));
  const child=spawn(process.execPath,['weekly-report.mjs',...sample,'old.json'],{cwd:dir});let stdout='';child.stdout.on('data',data=>{stdout+=data;});
  const closed=new Promise(resolve=>child.on('close',(code,signal)=>resolve({code,signal})));
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('child did not start'));},5000);
    child.stderr.on('data',data=>{if(data.toString().includes('READY')){clearTimeout(timer);child.kill('SIGTERM');resolve();}});child.on('error',reject);
  });
  expect((await closed).signal).toBe('SIGTERM');expect(stdout).toBe('');expect(await readFile(join(dir,'old.json'),'utf8')).toBe('KEEP OLD REPORT');
  expect(await Promise.all(sample.map(path=>readFile(join(dir,path),'utf8')))).toEqual(before);
});

it('accepts copied objects and reversed object-key order without changing array order',async()=>{
  await generate(wrap("function reorder(value){return Array.isArray(value)?value.map(reorder):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reorder(item)])):value;} return reorder(report)"));
  const result=await node();expect(result.code,result.stderr).toBe(0);expect(JSON.parse(result.stdout)).toEqual(main.checks[0].expected);
});
for(const input of ['orders','entries'])it('rejects '+input+' mutation before an invalid-period error',async()=>{
  await generate(`function buildWeeklyReport(orders,entries){${input}.push({line:1});throw Error("Invalid reporting period");}`);
  await sources([[],[],{start:'2026-11-15',end:'2026-11-09'}]);await failure([...sample,'old.json'],/changed an input/);
});
it.each(['90071992547409.91','90071992547409.92','0000000000000000000000000000000.01'])('handles decimal range edge %s exactly',async hours=>{
  await generate(independentReportingSolution);const rows=[[{line:1,jobId:'x',site:'S',status:'complete'}],
    [{line:1,entryId:'a',jobId:'x',date:main.period.start,hours}],main.period];await sources(rows);
  const result=await node();expect(result.code,result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual(executeReporting(reportingCode(main.solution.code),rows).output);
});
