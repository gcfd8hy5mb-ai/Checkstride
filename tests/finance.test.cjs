const test=require('node:test'),assert=require('node:assert/strict');const api=require('./app-harness.cjs')();
const cents=x=>Math.round(x*100),date=s=>new Date(s+'T12:00:00');
test('round decimal half cents correctly',()=>{for(const [value,want] of [[1.005,1.01],[2.675,2.68],[10.075,10.08],[0,0],[-1,0],['NaN',0]])assert.equal(api.clampMoney(value),want)});
test('400 known calendar income scenarios across years and month ends',()=>{
 for(const frequency of ['weekly','biweekly','semimonthly','monthly'])for(let i=0;i<100;i++){
  const start='2024-01-'+(frequency==='semimonthly'?'15':'31');const year=2024+Math.floor(i/12),month=i%12;const source={id:'primary',payday:start,paycheck:123.45,frequency};
  let expected=[];for(let d=1;d<=new Date(year,month+1,0).getDate();d++){const current=new Date(year,month,d,12),days=Math.round((Date.UTC(year,month,d)-Date.UTC(2024,0,31))/86400000);if(frequency==='weekly'?days%7===0:frequency==='biweekly'?days%14===0:frequency==='semimonthly'?(d===1||d===15):d===new Date(year,month+1,0).getDate())expected.push(api.dateKey(current));}
  assert.deepEqual(Array.from(api.sourcePaydatesInMonth(source,year,month),api.dateKey),expected,`${frequency} ${year}-${month+1}`);
 }
});
test('600 split scenarios exactly conserve cents, even and full allocations match oracle',()=>{
 for(let i=1;i<=200;i++){const amount=(i*793%100000)/100,count=i%7+1,events=Array.from({length:count},(_,j)=>({income:(j+1)*111.11}));
 for(const mode of ['auto','even','full']){const got=Array.from(api.allocationShares(amount,events,mode,'important',count-1));assert.equal(got.reduce((s,x)=>s+cents(x),0),cents(amount));assert.ok(got.every(x=>Number.isFinite(x)&&x>=0));if(mode==='even'){const base=Math.floor(cents(amount)/count),rem=cents(amount)%count;assert.deepEqual(got,events.map((_,j)=>(base+(j<rem?1:0))/100))}if(mode==='full')assert.deepEqual(got,events.map((_,j)=>j===count-1?amount:0));}
 }
});
test('multiple jobs, overrides, bill editing/deleting, zero income and expense deficit',()=>{
 const state={payday:'2026-10-01',paycheck:100,frequency:'weekly',additionalPaychecks:[{id:'second',payday:'2026-10-01',paycheck:50,frequency:'monthly'}],paycheckOverrides:{'primary|2026-10-08':0},bills:[{id:'one',name:'Rent',amount:1000,dueMode:'monthly',splitMode:'even'}]};api.setState(state);let m=api.monthlyIncomeAndBills(date('2026-10-01'));assert.equal(cents(m.income),45000);assert.equal(m.remaining,-550);api.setState({...state,bills:[{...state.bills[0],amount:400}]});assert.equal(api.monthlyIncomeAndBills(date('2026-10-01')).remaining,50);api.setState({...state,bills:[]});assert.equal(api.monthlyIncomeAndBills(date('2026-10-01')).bills,0);api.setState({bills:state.bills});m=api.monthlyIncomeAndBills(date('2026-10-01'));assert.equal(m.income,0);assert.equal(m.remaining,-1000);assert.equal(api.buildAutonomousPlan(),null);
});
test('due dates clamp to February, exclusive window ends, leap and year boundaries',()=>{
 const b={amount:25.25,dueDay:31};assert.equal(api.dueBetween(b,date('2024-02-01'),date('2024-03-01')),25.25);assert.equal(api.dueBetween(b,date('2026-12-01'),date('2027-02-01')),50.50);assert.equal(api.dueBetween(b,date('2026-12-31'),date('2026-12-31')),0);assert.equal(api.dateKey(api.nextPayday('2024-01-31','monthly',1)),'2024-02-29');assert.equal(api.dateKey(api.nextPayday('2026-12-15','semimonthly',1)),'2027-01-01');
});
test('200 forecast and savings recommendations respect known budgets and cent precision',()=>{
 for(let i=1;i<=200;i++){const income=i*10.01,bill=i*4.03,overdue=i%10*1.01;api.setState({payday:'2026-10-01',paycheck:income,frequency:'monthly',cushion:10,bills:[{id:'b',amount:bill,overdue,dueMode:'monthly',splitMode:'full'}],smartMemory:{goals:[{name:'Save',target:1000,saved:i}]}});const f=api.forecast()[0];assert.equal(cents(f.due),cents(bill));assert.equal(cents(f.catchup),Math.min(cents(overdue),Math.max(0,cents(income)-cents(bill)-1000)));assert.equal(cents(f.safe),Math.max(0,cents(income)-cents(bill)-cents(f.catchup)-1000));const p=api.buildAutonomousPlan();assert.ok(p.safe>=0&&p.goalAllocation>=0);for(const k of ['income','due','cushion','catchup','goalAllocation','safe'])assert.ok(Math.abs(p[k]*100-Math.round(p[k]*100))<1e-7,`${k} has fractional cents: ${p[k]}`);const g=api.goalGuidance();assert.ok(g.perCheck>=0&&g.perCheck<=1000-i);}
});

test('approved plan invalidates for a one-cent budget change',()=>{const p={income:100,due:20,cushion:10,catchup:0,goalAllocation:0,safe:70,strategy:'balanced',goalName:''};assert.equal(api.autonomousPlanMatches(p,{...p,safe:69.99}),false);assert.equal(api.autonomousPlanMatches(p,{...p}),true)});
