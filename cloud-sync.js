// MATCHLATCH authenticated, owner-scoped cloud sync.
// Every write uses the logged-in user's own Supabase session and table/storage RLS.
// Saved state is per-record; a deletion is a tombstone so other devices don't resurrect it.
export function createCloudSync(supabase, hooks) {
  const BUCKET="matchlatch-inspirations";
  const KINDS=["inspirations","looks","favorites","cart","purchases"];
  const blank=()=>Object.fromEntries(KINDS.map(k=>[k,[]]));
  const copy=value=>JSON.parse(JSON.stringify(value));
  const cacheKey=id=>"matchlatch-cloud-cache-v1-"+id;
  const key=(kind,id)=>kind+":"+id;
  let account=null;
  let epoch=0,ready=false,syncing=false,fetching=false,status="idle";
  let state=blank(),lastSnapshot=blank(),profile=null,lastProfile=null;
  let pending=new Map(),photos=new Set();
  let timer=null,interval=null;
  const notify=(message)=>{status=message;hooks.onStatus?.(message);};
  const mapState=(source)=>{
    const output=new Map();
    for(const kind of KINDS)for(const item of (source?.[kind]||[])){
      if(item&&typeof item.id==="string"&&item.id.length<=128)output.set(key(kind,item.id),{kind,record_id:item.id,payload:item,is_deleted:false});
    }
    return output;
  };
  const toState=(records)=>{
    const output=blank();
    for(const record of records.values()){
      if(record.kind==="profile"||record.is_deleted)continue;
      if(KINDS.includes(record.kind)&&record.payload&&typeof record.payload==="object"
        &&record.payload.id===record.record_id)output[record.kind].push(record.payload);
    }
    for(const k of KINDS)output[k].sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
    return output;
  };
  function saveCache(){
    if(!account)return;
    try{localStorage.setItem(cacheKey(account.id),JSON.stringify({state,pending:[...pending.values()],photos:[...photos],profile}));}
    catch{notify("Your browser has limited storage. Cloud changes may need to be retried.");}
  }
  function loadCache(userId){
    try {
      const v=JSON.parse(localStorage.getItem(cacheKey(userId))||"null");
      if(v&&typeof v==="object")return v;
    }catch{}
    return null;
  }
  const accountPhotoKey=(uid,id)=>"account-"+uid+"-"+id;
  const photoPath=(uid,id)=>uid+"/"+encodeURIComponent(id)+".jpg";
  const current=(uid,token)=>account?.id===uid && epoch===token;

  function refreshDisplay(){
    hooks.setState(copy(state));
    hooks.applyProfile(profile);
    hooks.onStatus?.(status);
  }
  function mergeWithPending(rows){
    const merged=new Map();
    for(const row of rows){
      if(!["profile",...KINDS].includes(row.kind))continue;
      merged.set(key(row.kind,row.record_id),{
        kind:row.kind,record_id:row.record_id,
        payload:row.payload||{},is_deleted:Boolean(row.is_deleted)
      });
    }
    for(const change of pending.values())merged.set(key(change.kind,change.record_id),change);
    state=toState(merged);
    const p=merged.get("profile:preferences");
    profile=p&&!p.is_deleted?p.payload:null;
    lastSnapshot=copy(state);
    lastProfile=profile?copy(profile):null;
    saveCache();
    refreshDisplay();
  }
  async function pull(){
    if(!account||fetching)return;
    const token=epoch,uid=account.id;
    fetching=true;
    const rows=[];
    try {
      for(let offset=0;;offset+=500){
        const {data,error}=await supabase.from("matchlatch_records")
          .select("kind,record_id,payload,is_deleted,updated_at")
          .eq("user_id",uid).order("record_id").order("kind").range(offset,offset+499);
        if(error)throw error;
        if(!current(uid,token))return;
        rows.push(...(data||[]));
        if(!data||data.length<500)break;
      }
      if(!current(uid,token))return;
      mergeWithPending(rows);
      ready=true;
      notify(pending.size||photos.size?"Syncing your changes…":"Synced securely across devices.");
    }catch(e){
      if(current(uid,token))notify("Cloud unavailable. Saved changes will retry when connected.");
      console.warn("MATCHLATCH cloud read",e?.message||e);
    }finally{fetching=false;}
  }
  const afterQueue=()=>{
    saveCache();
    clearTimeout(timer);
    timer=setTimeout(()=>void flush(),350);
  };
  function queueState(newState){
    if(!account)return;
    const previous=mapState(lastSnapshot),next=mapState(newState);
    const allKeys=new Set([...previous.keys(),...next.keys()]);
    for(const entry of allKeys){
      const prev=previous.get(entry),now=next.get(entry);
      if(now&&JSON.stringify(now.payload)!==JSON.stringify(prev?.payload)){
        pending.set(entry,now);
      }else if(prev&&!now){
        pending.set(entry,{...prev,is_deleted:true});
      }
    }
    state=copy(newState);lastSnapshot=copy(newState);
    afterQueue();
  }
  function queueProfile(newProfile){
    if(!account)return;
    const next=newProfile&&typeof newProfile==="object"?copy(newProfile):null;
    if(JSON.stringify(next)===JSON.stringify(lastProfile))return;
    profile=next;lastProfile=copy(next);
    pending.set("profile:preferences",{
      kind:"profile",record_id:"preferences",
      payload:next||{},is_deleted:!next
    });
    afterQueue();
  }
  async function uploadPhotos(uid,token){
    for(const id of [...photos]){
      if(!current(uid,token))return;
      try {
        const data=await hooks.loadAccountPhoto(accountPhotoKey(uid,id));
        if(!data || !data.startsWith("data:image/jpeg;base64,"))continue;
        const blob=await(await fetch(data)).blob();
        const {error}=await supabase.storage.from(BUCKET)
          .upload(photoPath(uid,id),blob,{contentType:"image/jpeg",upsert:true,cacheControl:"3600"});
        if(error)throw error;
        if(current(uid,token))photos.delete(id);
      }catch(e){
        console.warn("MATCHLATCH photo sync",e?.message||e);
      }
    }
  }
  async function flush(){
    if(!account||syncing)return;
    syncing=true;const uid=account.id,token=epoch;
    try {
      const batch=[...pending.values()];
      if(batch.length) {
        const {error}=await supabase.from("matchlatch_records").upsert(
          batch.map(x=>({
            user_id:uid,kind:x.kind,record_id:x.record_id,
            payload:x.payload,is_deleted:x.is_deleted
          })),
          {onConflict:"user_id,kind,record_id"}
        );
        if(error)throw error;
        if(current(uid,token))for(const change of batch){
          const k=key(change.kind,change.record_id);
          if(pending.get(k)===change)pending.delete(k);
        }
      }
      if(current(uid,token))await uploadPhotos(uid,token);
      if(current(uid,token)){
        saveCache();
        notify(pending.size||photos.size?"Some changes are waiting to sync.":"Synced securely across devices.");
      }
    }catch(e){
      if(current(uid,token))notify("Changes saved on this device. Cloud sync will retry.");
      console.warn("MATCHLATCH cloud write",e?.message||e);
    }finally{
      syncing=false;
      if(current(uid,token)&&(pending.size||photos.size)) {
        // Retry later, not in a tight loop.
        clearTimeout(timer);timer=setTimeout(()=>void flush(),15000);
      }
    }
  }
  async function setUser(user){
    const previous=account;
    epoch++;clearTimeout(timer);clearInterval(interval);
    const token=epoch;
    account=user?.id?{id:user.id,email:user.email}:null;
    if(previous&&previous.id!==account?.id){
      // A signed-out account must not leave its cached wardrobe/photos for the
      // next person using this browser. Cloud copies remain protected by RLS.
      try{localStorage.removeItem(cacheKey(previous.id));}catch{}
      await hooks.clearAccountPhotos?.(previous.id);
    }
    ready=false;syncing=false;fetching=false;
    pending=new Map();photos=new Set();state=blank();lastSnapshot=blank();profile=null;lastProfile=null;
    if(!account){notify("guest");hooks.setGuest();return;}
    const uid=account.id;
    const cache=loadCache(uid);
    if(cache){
      for(const k of KINDS)state[k]=Array.isArray(cache.state?.[k])?cache.state[k]:[];
      lastSnapshot=copy(state);
      pending=new Map((cache.pending||[]).filter(x=>x?.kind&&x.record_id).map(x=>[key(x.kind,x.record_id),x]));
      photos=new Set(cache.photos||[]);
      profile=cache.profile&&typeof cache.profile==="object"?cache.profile:null;
      lastProfile=copy(profile);
    }
    notify("Connecting to your private library…");
    refreshDisplay();
    await pull();
    if(!current(uid,token))return;
    if(pending.size||photos.size)void flush();
    interval=setInterval(()=>{
      if(!current(uid,token)||document.visibilityState==="hidden"||!navigator.onLine)return;
      void flush().then(()=>pull());
    },60000);
  }
  function savePhoto(id){
    if(!account)return;
    photos.add(id);afterQueue();
  }
  async function fetchPhoto(id){
    if(!account)return null;
    const uid=account.id,token=epoch;
    try{
      const {data,error}=await supabase.storage.from(BUCKET).download(photoPath(uid,id));
      if(error)throw error;
      const base64=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result);
        reader.onerror=()=>reject(reader.error);
        reader.readAsDataURL(data);
      });
      return current(uid,token)&&typeof base64==="string"?base64:null;
    }catch{return null;}
  }
  async function importGuest(){
    if(!account||!ready)return {ok:false,message:"Cloud is not connected yet."};
    const guest=hooks.getGuestState();
    const prev=mapState(state),next=copy(state);
    let added=0;
    for(const kind of KINDS){
      const known=new Set(next[kind].map(x=>x.id));
      for(const item of guest[kind]||[]){
        if(!item?.id||known.has(item.id))continue;
        next[kind].push(copy(item));known.add(item.id);added++;
      }
    }
    if(added){
      queueState(next);
      hooks.setState(copy(next));
      for(const inspiration of guest.inspirations||[]){
        const photo=await hooks.loadGuestPhoto(inspiration.id);
        if(!photo)continue;
        await hooks.saveAccountPhoto(accountPhotoKey(account.id,inspiration.id),photo);
        savePhoto(inspiration.id);
      }
    }
    const guestProfile=hooks.getGuestProfile?.();
    let profileImported=false;
    if(!profile&&guestProfile&&typeof guestProfile==="object") {
      queueProfile(guestProfile);
      hooks.applyProfile(guestProfile);
      profileImported=true;
    }
    if(added||profileImported)await flush();
    if(!added&&!profileImported)return{ok:true,message:"Guest items are already in your account."};
    return{ok:true,message:(added?added+" guest items":"Your guest preferences")+
      " added to your private account. Cloud sync may continue."};
  }
  function retry(){
    if(!account)return;
    void flush().then(()=>pull());
  }
  window.addEventListener("online",retry);
  window.addEventListener("focus",retry);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")retry();});
  return {
    setUser,queueState,queueProfile,savePhoto,fetchPhoto,importGuest,retry,
    accountPhotoKey,getStatus:()=>status,isReady:()=>ready,isSignedIn:()=>Boolean(account),
    hasPending:()=>pending.size>0||photos.size>0,
    getAccount:()=>account
  };
}
