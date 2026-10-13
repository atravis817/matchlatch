// The server decides visibility; this is a convenience link, never an access grant.
export function createOwnerNavigation({getUserId,getSession,fetcher=fetch,document:doc=document,onAuthChange}){
 let root=null,link=null,generation=0;
 function clear(){generation++;link?.remove();link=null;}
 async function refresh(){
  clear();const ticket=generation,target=root,userId=getUserId();
  if(!target?.isConnected||!userId)return;
  try{
   const {data,error}=await getSession();const account=data?.session;
   if(error||!account?.access_token||account.user?.id!==userId)return;
   const r=await fetcher('/api/admin-summary?capability=1',{headers:{Authorization:'Bearer '+account.access_token},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
   if(!r.ok)return;const capability=await r.json();
   if(ticket!==generation||target!==root||!target.isConnected||getUserId()!==userId||capability.commandCenter!==true)return;
   link=doc.createElement('a');link.href='/admin.html';link.className='profile-shortcut owner-command-center';
   const copy=doc.createElement('span');copy.className='profile-shortcut-copy';
   const eyebrow=doc.createElement('span');eyebrow.className='micro-title';eyebrow.textContent='Owner access';
   const title=doc.createElement('strong');title.textContent='Command Center';
   const description=doc.createElement('small');description.textContent='Private operating dashboard.';
   const arrow=doc.createElement('span');arrow.className='profile-shortcut-arrow';arrow.textContent='↗';
   copy.append(eyebrow,title,description);link.append(copy,arrow);target.append(link);
  }catch{ /* Fail closed; shopping remains usable when recognition is unavailable. */ }
 }
 onAuthChange(()=>{void refresh();});
 return {mount(target){root=target;void refresh();},refresh,clear};
}
