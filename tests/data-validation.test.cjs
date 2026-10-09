const test=require('node:test'),assert=require('node:assert/strict');const {validateFinancialState}=require('./app-harness.cjs')();
test('malformed persisted records stop migration rather than being silently discarded',()=>{
 for(const record of [{bills:{}},{bills:[null]},{bills:[{name:'Rent',amount:-1}]},{bills:[{name:'',amount:5}]},{bills:[{name:'Rent',amount:'invalid'}]},{additionalPaychecks:[{payday:'2026-10-09',paycheck:0}]},{paymentHistory:{}}])assert.throws(()=>validateFinancialState(record),/STATE_DATA_INVALID/);
 assert.doesNotThrow(()=>validateFinancialState({bills:[{name:'Rent',amount:1.01}],additionalPaychecks:[],paymentHistory:[],paycheckHistory:[],futureField:{keep:true}}));
});
