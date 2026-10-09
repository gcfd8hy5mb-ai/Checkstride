const test=require('node:test'),assert=require('node:assert/strict');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc,deleteDoc}=require('firebase/firestore');
const fs=require('node:fs');
test('emulator fixture: ordinary A/B ownership, switching and signed-out denial',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-checkstride-release',firestore:{host:'127.0.0.1',port:8080,rules:fs.readFileSync('tests/firestore.fixture.rules','utf8')}});
 try{
  const A=env.authenticatedContext('A').firestore(),B=env.authenticatedContext('B').firestore(),out=env.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(doc(A,'users/A/state/main'),{bills:[{name:'A rent',amount:800}]}));
  await assertSucceeds(setDoc(doc(B,'users/B/state/main'),{bills:[{name:'B power',amount:90}]}));
  for(const [db,other] of [[A,'B'],[B,'A']]){
   await assertFails(getDoc(doc(db,`users/${other}/state/main`)));
   await assertFails(setDoc(doc(db,`users/${other}/state/main`),{bills:[]}));
   await assertFails(deleteDoc(doc(db,`users/${other}/state/main`)));
  }
  for(const [db,uid,name] of [[A,'A','A rent'],[B,'B','B power'],[A,'A','A rent']])assert.equal((await getDoc(doc(db,`users/${uid}/state/main`))).data().bills[0].name,name);
  for(const uid of ['A','B']){
   await assertFails(getDoc(doc(out,`users/${uid}/state/main`)));
   await assertFails(setDoc(doc(out,`users/${uid}/state/main`),{bills:[]}));
   await assertFails(deleteDoc(doc(out,`users/${uid}/state/main`)));
  }
 }finally{await env.cleanup()}
});
