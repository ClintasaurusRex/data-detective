// Handwritten expected source lines, pairs and differing field names.
// No solution algorithm is used to construct expectations.
const row = (line, id, site = "North reservoir", status = "complete", hours = 2) => ({ line, id, site, status, hours });
function fixture(name, description, orders, fieldReports, agreed = [], onlyOrders = [], onlyFieldReports = [], differences = [], ambiguous = []) {
  return { name, description, orders, fieldReports, rows: [orders, fieldReports],
    expected: { agreed, onlyOrders, onlyFieldReports, differences, ambiguous,
      summary: { orders: orders.length, fieldReports: fieldReports.length, agreed: agreed.length,
        onlyOrders: onlyOrders.length, onlyFieldReports: onlyFieldReports.length,
        differences: differences.length, ambiguous: ambiguous.length } } };
}
function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
export const twoExportsDatasets = freeze({
  caseFile: fixture("The case file", "Sam's scheduling and field exports for the week. Follow every version before trusting a pair.",
    [row(2,"0071"),row(3,"0072","Elm valve","open",1),row(4,"0073","East meter","complete",1.5),row(5,"0074","Hill hydrant","open",0),row(6,"0075","Lake pump","on hold",0.5),row(7,"0076","South main","complete",3),row(9,"0075","Lake pump","on hold",0.5)],
    [row(2,"0074","Hill hydrant","complete",0),row(3,"0071"),row(4,"0077","Depot meter","complete",1),row(5,"0073","East meter","complete",2),row(7,"0075","Lake pump","complete",0.5),row(8,"0076","South main","complete",3)],
    [[2,3],[7,8]],[3],[4],[[4,5,["hours"]],[5,2,["status"]]],[{id:"0075",orders:[6,9],fieldReports:[7]}]),
  perfect: fixture("Perfect agreement", "Different source lines do not make a difference. Every status and zero are valid.",
    [row(2,"P-1"),row(4,"P-2","Depot","open",0),row(7,"P-3","Elm","on hold",0.25)],
    [row(3,"P-1"),row(6,"P-2","Depot","open",0),row(9,"P-3","Elm","on hold",0.25)],[[2,3],[4,6],[7,9]]),
  ordersOnly: fixture("Scheduling only", "A scheduling job must remain visible without a field counterpart.",[row(2,"S-1"),row(5,"S-2")],[],[],[2,5]),
  fieldOnly: fixture("Field only", "Field work can lack scheduling records.",[],[row(2,"F-1"),row(7,"F-2")],[],[],[2,7]),
  overlap: fixture("Overlap with gaps", "Neither file contains the full week's union of jobs.",[row(2,"O-A"),row(3,"O-B"),row(6,"O-C")],[row(2,"O-C"),row(4,"O-D"),row(8,"O-A")],[[2,8],[6,2]],[3],[4]),
  details: fixture("Different details", "Planned versus actual effort is a review question, not invalid data.",[row(2,"D-1","West valve","complete",1)],[row(5,"D-1","West valve","complete",1.25)],[],[],[],[[2,5,["hours"]]]),
  reordered: fixture("Reordered exports", "Output follows scheduling first-seen keys, not field positions or alphabetical order.",[row(2,"Z-3"),row(5,"A-1"),row(8,"M-2")],[row(3,"M-2"),row(4,"Z-3"),row(10,"A-1")],[[2,4],[5,10],[8,3]]),
  zeros: fixture("Leading zeros", "007 and 7 are separate job identifiers.",[row(2,"007"),row(3,"7","Elm")],[row(2,"7","Elm"),row(4,"007")],[[2,4],[3,2]]),
  caseKeys: fixture("Case-sensitive keys", "Job-A and job-a are distinct even when other values agree.",[row(2,"Job-A"),row(4,"job-a","Elm")],[row(2,"job-a","Elm"),row(6,"Job-A")],[[2,6],[4,2]]),
  emptyOrders: fixture("Empty scheduling export", "The first source can be empty.",[],[row(11,"E-F","Harbour")],[],[],[11]),
  emptyField: fixture("Empty field export", "The second source can be empty.",[row(12,"E-S","Harbour")],[],[],[12]),
  empty: fixture("Empty week", "No work produces an empty reconciliation and numeric zeros.",[],[]),
  unrelated: fixture("Unrelated exports", "Same status or site does not establish identity.",[row(2,"U-1"),row(3,"U-2")],[row(2,"V-1"),row(3,"V-2")],[],[2,3],[2,3]),
  manyDifferences: fixture("Several differences", "Compare site, status and hours independently and list names in contract order.",
    [row(2,"M-S"),row(3,"M-T"),row(4,"M-H"),row(5,"M-ALL")],
    [row(2,"M-ALL","East","on hold",4),row(3,"M-H","North reservoir","complete",0),row(4,"M-T","North reservoir","open",2),row(5,"M-S","East")],[],[],[],
    [[2,5,["site"]],[3,4,["status"]],[4,3,["hours"]],[5,2,["site","status","hours"]]]),
  duplicateOrders: fixture("Repeated scheduling keys", "Even identical copies make the expected one-to-one relationship ambiguous.",[row(2,"R-S"),row(6,"R-S")],[row(3,"R-S")],[],[],[],[],[{id:"R-S",orders:[2,6],fieldReports:[3]}]),
  duplicateField: fixture("Repeated field keys", "Never pick the first or last field version.",[row(5,"R-F")],[row(2,"R-F"),row(8,"R-F","North reservoir","open",3)],[],[],[],[],[{id:"R-F",orders:[5],fieldReports:[2,8]}]),
  duplicatesBoth: fixture("Repeats in both exports", "Ambiguity takes priority over missingness, including one-sided repeated keys.",
    [row(2,"Z"),row(3,"A"),row(5,"Z"),row(8,"A")],
    [row(2,"Y"),row(4,"Z"),row(6,"Z"),row(9,"Y")],[],[],[],[],[{id:"Z",orders:[2,5],fieldReports:[4,6]},{id:"A",orders:[3,8],fieldReports:[]},{id:"Y",orders:[],fieldReports:[2,9]}]),
  farApart: fixture("Far-apart counterparts", "A late duplicate invalidates an early possible pair; keep looking after a match.",
    [row(2,"FAR"),row(3,"MID-1"),row(4,"MID-2"),row(5,"MID-3"),row(6,"MID-4"),row(7,"MID-5"),row(8,"MID-6"),row(9,"MID-7"),row(10,"MID-8"),row(11,"MID-9"),row(12,"MID-10"),row(13,"MID-11"),row(14,"MID-12"),row(19,"LATE"),row(20,"FAR")],
    [row(2,"LATE"),row(3,"MID-12"),row(4,"MID-11"),row(5,"MID-10"),row(6,"MID-9"),row(7,"MID-8"),row(8,"MID-7"),row(9,"MID-6"),row(10,"MID-5"),row(11,"MID-4"),row(12,"MID-3"),row(13,"MID-2"),row(14,"MID-1"),row(25,"FAR")],[[3,14],[4,13],[5,12],[6,11],[7,10],[8,9],[9,8],[10,7],[11,6],[12,5],[13,4],[14,3],[19,2]],[],[],[],[{id:"FAR",orders:[2,20],fieldReports:[25]}]),
  future: fixture("A future week", "Different keys, line gaps and counts expose sample-only solutions.",
    [row(11,"DEC-92","Harbour","open",0),row(16,"DEC-08","Well 3","complete",5.75),row(23,"DEC-41","Depot","on hold",0.25),row(28,"DEC-55","Hill","complete",1)],
    [row(12,"DEC-41","Depot","on hold",0.25),row(19,"DEC-99","Creek","complete",2.5),row(25,"DEC-08","Well 4","complete",6),row(31,"DEC-99","Creek","complete",2.5),row(38,"DEC-77","Town","complete",1.25)],
    [[23,12]],[11,28],[38],[[16,25,["site","hours"]]],[{id:"DEC-99",orders:[],fieldReports:[19,31]}]),
  exactText: fixture("Exact text and special keys", "Map handles arbitrary string keys. Do not trim or lowercase site evidence.",
    [row(2,"__proto__","Depot "),row(3,"constructor","Hill"),row(5,"toString","Creek\nGate"),row(9,"hasOwnProperty","Town")],
    [row(2,"hasOwnProperty","Town"),row(4,"constructor","hill"),row(6,"__proto__","Depot"),row(11,"toString","Creek\nGate")],
    [[5,11],[9,2]],[],[],[[2,6,["site"]],[3,4,["site"]]]),
});
