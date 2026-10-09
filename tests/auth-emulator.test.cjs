const test=require('node:test'),assert=require('node:assert/strict');
const {initializeApp,deleteApp}=require('firebase/app');
const {getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,getIdToken}=require('firebase/auth');
const {getFirestore,connectFirestoreEmulator,doc,setDoc,getDocFromServer,terminate}=require('firebase/firestore');
test('emulator Auth: temporary ordinary users, refreshed token, A B A and signed-out denial',async()=>{
 const app=initializeApp({projectId:'demo-checkstride-release',apiKey:'fake-emulator-key'},'auth-release');const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8080);
 const suffix=Date.now(),emailA=`a-${suffix}@example.test`,emailB=`b-${suffix}@example.test`,password='emulator-only-password';
 try{const a=(await createUserWithEmailAndPassword(auth,emailA,password)).user;await setDoc(doc(db,`users/${a.uid}/state/main`),{bills:[{name:'A local only',amount:123.45}]});const aToken=await getIdToken(a,true);assert.ok(aToken);
 await signOut(auth);assert.equal(auth.currentUser,null);await assert.rejects(getDocFromServer(doc(db,`users/${a.uid}/state/main`)),/permission/i);
 const b=(await createUserWithEmailAndPassword(auth,emailB,password)).user;await setDoc(doc(db,`users/${b.uid}/state/main`),{bills:[{name:'B local only',amount:67.89}]});await assert.rejects(getDocFromServer(doc(db,`users/${a.uid}/state/main`)),/permission/i);assert.equal((await getDocFromServer(doc(db,`users/${b.uid}/state/main`))).data().bills[0].amount,67.89);
 await signOut(auth);await signInWithEmailAndPassword(auth,emailA,password);assert.equal(auth.currentUser.uid,a.uid);assert.equal((await getDocFromServer(doc(db,`users/${a.uid}/state/main`))).data().bills[0].amount,123.45);
 const refreshed=await fetch('http://127.0.0.1:9099/securetoken.googleapis.com/v1/token?key=fake-emulator-key',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:auth.currentUser.refreshToken})});assert.equal(refreshed.status,200);assert.equal((await refreshed.json()).user_id,a.uid);
 const invalid=await fetch('http://127.0.0.1:9099/securetoken.googleapis.com/v1/token?key=fake-emulator-key',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=refresh_token&refresh_token=invalid-local-test-token'});assert.equal(invalid.status,400);
 }finally{await signOut(auth);await terminate(db);await deleteApp(app)}
});
