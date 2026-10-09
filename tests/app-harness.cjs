const fs=require('node:fs'),vm=require('node:vm');
module.exports=function(){
 const html=fs.readFileSync('index.html','utf8');let script=html.match(/<script>\s*\(\(\) => \{([\s\S]*?)<\/script>/)[0].replace(/^<script>/,'').replace(/<\/script>$/,'');
 script=script.slice(0,script.indexOf('  (async()=>{\n    const startupAttempt='));
 script+='globalThis.api={clampMoney,nextPayday,previousPayday,dateKey,dueBetween,allocationShares,sourcePaydatesInMonth,monthlyIncomeAndBills,incomeEvents,forecast,goalGuidance,buildAutonomousPlan,autonomousPlanMatches,datedBillAllocation,monthlyBillAllocation,setState:x=>state={...structuredClone(blank),...x}};})();';
 const element=()=>new Proxy({value:'',classList:{add(){},remove(){},toggle(){},contains(){return false}},style:{},dataset:{},addEventListener(){},querySelectorAll(){return []},querySelector(){return null},closest(){return null}}, {get:(t,k)=>k in t?t[k]:()=>{}});
 const elements=new Map();const context={console,Date,Intl,Math,Number,Set,Map,JSON,structuredClone,setTimeout:()=>0,clearTimeout(){},globalThis:null,window:{addEventListener(){}},document:{getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},querySelectorAll(){return[]},querySelector(){return null},addEventListener(){}},navigator:{},localStorage:{getItem(){return null},setItem(){},removeItem(){}},sessionStorage:{getItem(){return null},setItem(){},removeItem(){}},createCheckstrideCloudSync:()=>({})};context.globalThis=context;vm.runInNewContext(script,context);return context.api;
};
