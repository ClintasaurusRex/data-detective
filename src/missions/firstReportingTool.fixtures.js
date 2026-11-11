// Handwritten expectations. Helpers only name tuple fields and attach originals;
// they do not clean, classify, group, sum or derive expected counts.
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const W = { start: '2026-11-09', end: '2026-11-15' };
const D = '2026-11-09';
const o = (line, jobId = 'A', site = 'North', status = 'complete') => ({line,jobId,site,status});
const e = (line, entryId = 'E', jobId = 'A', date = D, hours = '1') => ({line,entryId,jobId,date,hours});
const a = (jobId = 'A', site = 'North', status = 'complete', disposition = 'retained', duplicateOf = null) => ({cleaned:{jobId,site,status},reasons:[],disposition,duplicateOf});
const b = (entryId = 'E', jobId = 'A', date = D, hundredths = 100, disposition = 'included', orderLine = 2, duplicateOf = null) => ({cleaned:{entryId,jobId,date,hundredths},reasons:[],disposition,duplicateOf,orderLine});
const reject = (...reasons) => ({cleaned:null,reasons,disposition:'rejected',duplicateOf:null});
const rejectEntry = (...reasons) => ({...reject(...reasons),orderLine:null});
const orderKeys = ['input','valid','rejected','duplicates','conflicts','conflictGroups','retained'];
const entryKeys = ['input','valid','rejected','duplicates','conflicts','conflictGroups','outOfPeriod','ambiguousOrder','unmatched','incompleteOrder','included'];
const named = (keys,values) => Object.fromEntries(keys.map((key,i)=>[key,values[i]]));
function dataset(name, orders, entries, oa, ea, daily, sites, totalHours, jobCount, entryCount, oc, ec, period = W) {
  return {name,description:name,orders,entries,period,rows:[orders,entries,period],expected:{
    period:{...period},daily:daily.map(([date,hours,jobCount,entryCount])=>({date,hours,jobCount,entryCount})),
    sites:sites.map(([site,hours,jobCount,entryCount])=>({site,hours,jobCount,entryCount})),totalHours,jobCount,entryCount,
    counts:{orders:named(orderKeys,oc),entries:named(entryKeys,ec)},
    audit:{orders:oa.map((x,i)=>({record:orders[i],...x})),entries:ea.map((x,i)=>({record:entries[i],...x}))}
  }};
}
const O1=[1,1,0,0,0,0,1], E1=[1,1,0,0,0,0,0,0,0,0,1];
const O0=[0,0,0,0,0,0,0], E0=[0,0,0,0,0,0,0,0,0,0,0];
const single=(name,order,entry,oa,ea,hours='1.00',period=W)=>dataset(name,[order],[entry],[oa],[ea],[[ea.cleaned.date,hours,1,1]],[[oa.cleaned.site,hours,1,1]],hours,1,1,O1,E1,period);
export const reportingDatasets = freeze({
  caseFile:dataset('The weekly investigation',
    [o(2,'00110',' North Reservoir ',' Complete '),o(3,'00111','South Pump'),o(4,'00112','Depot','open'),o(5,'00113','North Reservoir','on hold'),o(6,'X','East'),o(7,'00110','North Reservoir'),o(8,'X','West'),o(9,' ',' ','Closed')],
    [e(2,'E-101','00110',D,'2.50'),e(3,'E-102','00110','2026-11-10','0.10'),e(4,'E-103','00111','2026-11-15','1.20'),e(5,' E-101 ','00110',D,'2.5'),e(6,'C-1','00111',D,'3'),e(7,'C-1','00111','2026-11-10','3'),e(8,'M','MISSING',D,'4'),e(9,'O','00112'),e(10,'H','00113','2026-11-10','0'),e(11,'X1','X',D,'2'),e(12,'OLD','MISSING','2026-11-08','2'),e(13,'BAD','00110','2026-11-31',''),e(14,'ZERO','00111',D,'0'),e(15,'NEXT','00110','2026-11-16'),e(16,'E-104','00111','2026-11-11','0.20')],
    [a('00110','North Reservoir'),a('00111','South Pump'),a('00112','Depot','open'),a('00113','North Reservoir','on hold'),a('X','East','complete','conflict'),a('00110','North Reservoir','complete','duplicate',2),a('X','West','complete','conflict'),reject('missing-job-id','missing-site','invalid-status')],
    [b('E-101','00110',D,250),b('E-102','00110','2026-11-10',10),b('E-103','00111','2026-11-15',120,'included',3),b('E-101','00110',D,250,'duplicate',null,2),b('C-1','00111',D,300,'conflict',null),b('C-1','00111','2026-11-10',300,'conflict',null),b('M','MISSING',D,400,'unmatched',null),b('O','00112',D,100,'incomplete-order',4),b('H','00113','2026-11-10',0,'incomplete-order',5),b('X1','X',D,200,'ambiguous-order',null),b('OLD','MISSING','2026-11-08',200,'out-of-period',null),rejectEntry('invalid-date','missing-hours'),b('ZERO','00111',D,0,'included',3),b('NEXT','00110','2026-11-16',100,'out-of-period',null),b('E-104','00111','2026-11-11',20,'included',3)],
    [[D,'2.50',2,2],['2026-11-10','0.10',1,1],['2026-11-11','0.20',1,1],['2026-11-15','1.20',1,1]],
    [['North Reservoir','2.60',1,2],['South Pump','1.40',1,3]],'4.00',2,5,[8,7,1,1,2,1,4],[15,14,1,1,2,1,2,1,1,2,5]),
  clean:single('Clean export',o(2),e(2),a(),b()),
  whitespace:single('Whitespace and status normalization',o(2,' A ',' North ',' COMPLETE '),e(8,' E ',' A ',' 2026-11-09 ',' 07.50 '),a(),b('E','A',D,750),'7.50'),
  exactKeys:dataset('Leading zeros and case-sensitive identifiers',
    [o(2,'0007','N'),o(3,'7','S'),o(4,'Job-A','N'),o(5,'job-a','S')],
    [e(2,'a','7',D,'2'),e(3,'A','0007',D,'1'),e(4,'b','job-a',D,'4'),e(5,'B','Job-A',D,'3')],
    [a('0007','N'),a('7','S'),a('Job-A','N'),a('job-a','S')],
    [b('a','7',D,200,'included',3),b('A','0007'),b('b','job-a',D,400,'included',5),b('B','Job-A',D,300,'included',4)],
    [[D,'10.00',4,4]],[['N','4.00',2,2],['S','6.00',2,2]],'10.00',4,4,[4,4,0,0,0,0,4],[4,4,0,0,0,0,0,0,0,0,4]),
  badHours:dataset('Blank and malformed hours',[o(2)],
    ['', ' ', '-1','+1','.5','5.','1e2','0x10','2h','1,5','NaN','Infinity','1.001','90071992547410'].map((h,i)=>e(i+2,`B${i}`,'A',D,h)),[a()],
    [rejectEntry('missing-hours'),rejectEntry('missing-hours'),...Array.from({length:12},()=>rejectEntry('invalid-hours'))],[],[],'0.00',0,0,O1,[14,0,14,0,0,0,0,0,0,0,0]),
  zero:single('Explicit zero is valid',o(2),e(2,'E','A',D,'00.00'),a(),b('E','A',D,0),'0.00'),
  precision:dataset('Integer decimal accumulation and multiple entries',[o(2)],
    [e(2,'x','A',D,'0.1'),e(3,'y','A',D,'0.20'),e(4,'z','A',D,'1.07')],[a()],[b('x','A',D,10),b('y','A',D,20),b('z','A',D,107)],[[D,'1.37',1,3]],[['North','1.37',1,3]],'1.37',1,3,O1,[3,3,0,0,0,0,0,0,0,0,3]),
  entryCopies:dataset('Exact entry copies retain first provenance',[o(2)],
    [e(7,'E','A',D,'1.0'),e(3,'E','A',D,'01.00'),e(20)],[a()],
    [b(),b('E','A',D,100,'duplicate',null,7),b('E','A',D,100,'duplicate',null,7)],[[D,'1.00',1,1]],[['North','1.00',1,1]],'1.00',1,1,O1,[3,3,0,2,0,0,0,0,0,0,1]),
  entryConflict:dataset('Late entry conflict includes earlier identical copies',[o(2)],
    [e(2),e(3),e(4,'E','A',D,'2')],[a()],
    [b('E','A',D,100,'conflict',null),b('E','A',D,100,'conflict',null),b('E','A',D,200,'conflict',null)],[],[],'0.00',0,0,O1,[3,3,0,0,3,1,0,0,0,0,0]),
  orderCopies:dataset('Exact cleaned order copies',[o(8,'A',' North ',' COMPLETE '),o(2)], [e(2)],
    [a(),a('A','North','complete','duplicate',8)],[b('E','A',D,100,'included',8)],[[D,'1.00',1,1]],[['North','1.00',1,1]],'1.00',1,1,[2,2,0,1,0,0,1],E1),
  orderConflict:dataset('Work-order status conflict holds all versions',[o(2),o(3,'A','North','open'),o(4)],[e(2)],
    [a('A','North','complete','conflict'),a('A','North','open','conflict'),a('A','North','complete','conflict')],
    [b('E','A',D,100,'ambiguous-order',null)],[],[],'0.00',0,0,[3,3,0,0,3,1,0],[1,1,0,0,0,0,0,1,0,0,0]),
  unmatched:dataset('Missing job references',[o(2)],[e(2,'E','UNKNOWN')],[a()],[b('E','UNKNOWN',D,100,'unmatched',null)],[],[],'0.00',0,0,O1,[1,1,0,0,0,0,0,0,1,0,0]),
  incomplete:dataset('Open and on-hold work stays visible',[o(2,'A','North',' OPEN '),o(3,'B','South','On Hold')],[e(2),e(3,'F','B',D,'0')],
    [a('A','North','open'),a('B','South','on hold')],[b('E','A',D,100,'incomplete-order',2),b('F','B',D,0,'incomplete-order',3)],[],[],'0.00',0,0,[2,2,0,0,0,0,2],[2,2,0,0,0,0,0,0,0,2,0]),
  boundaries:dataset('Inclusive boundaries and immediately outside',[o(2)],
    [e(2,'start'),e(3,'end','A','2026-11-15','2'),e(4,'before','A','2026-11-08'),e(5,'after','A','2026-11-16')],[a()],
    [b('start'),b('end','A','2026-11-15',200),b('before','A','2026-11-08',100,'out-of-period',null),b('after','A','2026-11-16',100,'out-of-period',null)],
    [[D,'1.00',1,1],['2026-11-15','2.00',1,1]],[['North','3.00',1,2]],'3.00',1,2,O1,[4,4,0,0,0,0,2,0,0,0,2]),
  leap:dataset('Leap-day and impossible calendar dates',[o(2)],
    [e(2,'leap','A','2028-02-29'),...['2026-02-29','2028-02-30','2028-13-01','2028-00-10','2028-04-31','2028-2-09','0000-01-01','1900-02-29','2028-01-00'].map((d,i)=>e(i+3,`bad${i}`,'A',d))],[a()],
    [b('leap','A','2028-02-29'),...Array.from({length:9},()=>rejectEntry('invalid-date'))],
    [['2028-02-29','1.00',1,1]],[['North','1.00',1,1]],'1.00',1,1,O1,[10,1,9,0,0,0,0,0,0,0,1],{start:'2028-02-28',end:'2028-03-01'}),
  noOrders:dataset('Empty work-order input',[],[e(2)],[],[b('E','A',D,100,'unmatched',null)],[],[],'0.00',0,0,O0,[1,1,0,0,0,0,0,0,1,0,0]),
  noEntries:dataset('Empty field-time input',[o(2)],[],[a()],[],[],[],'0.00',0,0,O1,E0),
  empty:dataset('Both exports empty',[],[],[],[],[],[],'0.00',0,0,O0,E0),
  groups:dataset('Site and day grouping differs from job counts',[o(2,'A','z'),o(3,'B','Alpha'),o(4,'C','z')],
    [e(2,'e1','A','2026-11-11','2'),e(3,'e2','B',D,'3'),e(4,'e3','C',D,'4'),e(5,'e4','A',D,'1')],
    [a('A','z'),a('B','Alpha'),a('C','z')],[b('e1','A','2026-11-11',200),b('e2','B',D,300,'included',3),b('e3','C',D,400,'included',4),b('e4')],
    [[D,'8.00',3,3],['2026-11-11','2.00',1,1]],[['Alpha','3.00',1,1],['z','7.00',2,3]],'10.00',3,4,[3,3,0,0,0,0,3],[4,4,0,0,0,0,0,0,0,0,4]),
  reordered:dataset('Reordered originals with stable summary sorting',[o(9,'B','z'),o(2,'A','Alpha')],
    [e(8,'later','B','2026-11-15','2'),e(2,'earlier','A')],[a('B','z'),a('A','Alpha')],
    [b('later','B','2026-11-15',200,'included',9),b('earlier')],[[D,'1.00',1,1],['2026-11-15','2.00',1,1]],[['Alpha','1.00',1,1],['z','2.00',1,1]],'3.00',2,2,[2,2,0,0,0,0,2],[2,2,0,0,0,0,0,0,0,0,2]),
  differentPeriod:single('Different period including century leap day',o(2),e(2,'E','A','2000-02-29','2.01'),a(),b('E','A','2000-02-29',201),'2.01',{start:'2000-02-29',end:'2000-02-29'}),
  transfer:dataset('Independent handover: a future week',
    [o(11,'DEC-8','Harbour'),o(15,'DEC-9','Hill','on hold'),o(21,'DEC-X','Hill'),o(22,'DEC-X','Harbour')],
    [e(12,'N1','DEC-8','2027-12-06','3.33'),e(16,'N2','DEC-8','2027-12-12','0.67'),e(20,'N3','DEC-9','2027-12-08','2'),e(25,'N4','NO-JOB','2027-12-07','1'),e(29,'N5','DEC-X','2027-12-09','1.25'),e(30,'CROSS','DEC-8','2027-12-06','2'),e(31,'CROSS','DEC-8','2027-12-13','2'),e(35,'OLD','DEC-8','2027-12-05','1')],
    [a('DEC-8','Harbour'),a('DEC-9','Hill','on hold'),a('DEC-X','Hill','complete','conflict'),a('DEC-X','Harbour','complete','conflict')],
    [b('N1','DEC-8','2027-12-06',333,'included',11),b('N2','DEC-8','2027-12-12',67,'included',11),b('N3','DEC-9','2027-12-08',200,'incomplete-order',15),b('N4','NO-JOB','2027-12-07',100,'unmatched',null),b('N5','DEC-X','2027-12-09',125,'ambiguous-order',null),b('CROSS','DEC-8','2027-12-06',200,'conflict',null),b('CROSS','DEC-8','2027-12-13',200,'conflict',null),b('OLD','DEC-8','2027-12-05',100,'out-of-period',null)],
    [['2027-12-06','3.33',1,1],['2027-12-12','0.67',1,1]],[['Harbour','4.00',1,2]],'4.00',1,2,[4,4,0,0,2,1,2],[8,8,0,0,2,1,1,1,1,1,2],{start:'2027-12-06',end:'2027-12-12'}),
  invalidBeforeDedup:dataset('Reject before grouping and preserve all reasons',
    [o(2),o(3,'A','','Closed'),o(4,' ',' ',' ')],
    [e(2),e(3,'E','A','bad','-2'),e(4,' ',' ',' ',' ')],
    [a(),reject('missing-site','invalid-status'),reject('missing-job-id','missing-site','missing-status')],
    [b(),rejectEntry('invalid-date','invalid-hours'),rejectEntry('missing-entry-id','missing-job-id','missing-date','missing-hours')],
    [[D,'1.00',1,1]],[['North','1.00',1,1]],'1.00',1,1,[3,1,2,0,0,0,1],[3,1,2,0,0,0,0,0,0,0,1]),
  crossPeriod:dataset('Conflict detection before period filtering',[o(2)],
    [e(2),e(3,'E','A','2026-11-16')],[a()],[b('E','A',D,100,'conflict',null),b('E','A','2026-11-16',100,'conflict',null)],[],[],'0.00',0,0,O1,[2,2,0,0,2,1,0,0,0,0,0]),
  onlyRejectedOrder:dataset('Rejected work orders do not create matches',[o(2,'A','','complete')],[e(2)],
    [reject('missing-site')],[b('E','A',D,100,'unmatched',null)],[],[],'0.00',0,0,[1,0,1,0,0,0,0],[1,1,0,0,0,0,0,0,1,0,0]),
  specialKeys:single('Arbitrary text keys and exact site text',o(2,'__proto__','constructor'),e(2,'toString','__proto__'),a('__proto__','constructor'),b('toString','__proto__')),
  entryJobConflict:dataset('Same entry ID with different job references',[o(2),o(3,'B')],[e(2),e(3,'E','B')],
    [a(),a('B')],[b('E','A',D,100,'conflict',null),b('E','B',D,100,'conflict',null)],[],[],'0.00',0,0,[2,2,0,0,0,0,2],[2,2,0,0,2,1,0,0,0,0,0]),
  outsideDuplicate:dataset('Duplicates link to an excluded first occurrence',[o(2)],[e(8,'E','A','2026-11-08'),e(2,'E','A','2026-11-08')],[a()],
    [b('E','A','2026-11-08',100,'out-of-period',null),b('E','A','2026-11-08',100,'duplicate',null,8)],[],[],'0.00',0,0,O1,[2,2,0,1,0,0,1,0,0,0,0]),
  ...Object.fromEntries([
    ['reversedPeriod',{start:'2026-11-15',end:D}],
    ['invalidPeriod',{start:'2026-02-29',end:'2026-03-01'}],
    ['spacedPeriod',{start:' 2026-11-09',end:'2026-11-15'}],
    ['blankPeriod',{start:'',end:''}]
  ].map(([id,period])=>[id,{name:id,description:'Invalid reporting period must fail before producing a report.',orders:[],entries:[],period,rows:[[],[],period],expectedError:'Invalid reporting period'}]))
});
