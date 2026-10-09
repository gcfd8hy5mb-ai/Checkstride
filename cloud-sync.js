/* Account-scoped recovery and ordered, conditional Firestore writes. */
(function(root){
  function createCloudSync({storage,request,timeoutMs=10000}){
    const versions=new Map(), blocked=new Set();
    let tail=Promise.resolve();
    const key=uid=>`checkstride_pending_v1:${uid}`;
    const recoveryKey=uid=>`checkstride_recovery_v1:${uid}`;
    function recoveryCopies(uid){
      const archived=JSON.parse(storage.getItem(recoveryKey(uid))||'[]');
      const pending=storage.getItem(key(uid));
      return pending?archived.concat(JSON.parse(pending)):archived;
    }
    function keepCloud(uid){
      const pending=storage.getItem(key(uid));
      if(pending){
        const archived=JSON.parse(storage.getItem(recoveryKey(uid))||'[]');
        storage.setItem(recoveryKey(uid),JSON.stringify(archived.concat({...JSON.parse(pending),archivedAt:new Date().toISOString()})));
        storage.removeItem(key(uid));
      }
      blocked.delete(uid);
    }
    function remember(uid,data){
      const old=storage.getItem(key(uid));
      const entry={base:old?JSON.parse(old).base:versions.get(uid)??null,data:JSON.parse(JSON.stringify(data))};
      storage.setItem(key(uid),JSON.stringify(entry));
      if(blocked.has(uid))throw new Error('SAVE_CONFLICT');
      return entry;
    }
    function restore(uid,document){
      const version=document?.updateTime??null;
      versions.set(uid,version);
      const raw=storage.getItem(key(uid));
      if(!raw){blocked.delete(uid);return null}
      const pending=JSON.parse(raw);
      if(pending.base!==version){blocked.add(uid);throw new Error('LOCAL_RECOVERY_CONFLICT')}
      blocked.delete(uid);
      return pending.data;
    }
    function save(uid,data,send){
      const snapshot=JSON.parse(JSON.stringify(data));
      const run=async()=>{
        if(blocked.has(uid))throw new Error('SAVE_CONFLICT');
        const controller=new AbortController();
        const timer=setTimeout(()=>controller.abort(),timeoutMs);
        try{
          const version=versions.get(uid);
          if(version===undefined)throw new Error('STATE_NOT_LOADED');
          const response=await request(send(version,controller.signal,snapshot));
          if(response.status===409||response.status===412){blocked.add(uid);throw new Error('SAVE_CONFLICT')}
          if(response.status===401)throw new Error('SESSION_EXPIRED');
          if(response.status===403)throw new Error('SAVE_PERMISSION_DENIED');
          if(!response.ok){
            const error=await response.json().catch(()=>({}));
            if(['FAILED_PRECONDITION','ABORTED'].includes(error?.error?.status)){
              blocked.add(uid);throw new Error('SAVE_CONFLICT');
            }
            throw new Error('SAVE_FAILED');
          }
          const document=await response.json();
          const updateTime=document.updateTime||document.writeResults?.[0]?.updateTime;
          if(!updateTime)throw new Error('SAVE_UNCONFIRMED');
          versions.set(uid,updateTime);
          const raw=storage.getItem(key(uid));
          if(raw){
            const pending=JSON.parse(raw);
            if(JSON.stringify(pending.data)===JSON.stringify(snapshot))storage.removeItem(key(uid));
            else storage.setItem(key(uid),JSON.stringify({...pending,base:updateTime}));
          }
        }finally{clearTimeout(timer)}
      };
      const result=tail.then(run);
      tail=result.catch(()=>{});
      return result;
    }
    return {remember,restore,save,keepCloud,recoveryCopies,idle:()=>tail};
  }
  root.createCheckstrideCloudSync=createCloudSync;
  if(typeof module!=='undefined')module.exports=createCloudSync;
})(globalThis);
