// The server decides visibility; this is a convenience link, never an access grant.
export function createOwnerNavigation({getUserId,getSession,fetcher=fetch,document:doc=document,onAuthChange}){
 let root=null,link=null,notice=null,generation=0;
 function clear(){generation++;link?.remove();notice?.remove();link=null;notice=null;}
 async function refresh(){
  clear();const ticket=generation,target=root,userId=getUserId();
  if(!target?.isConnected||!userId)return;
  const current=()=>ticket===generation&&target===root&&target.isConnected&&getUserId()===userId;
  function message(text,retry=false){
   if(!current())return;
   notice?.remove();notice=doc.createElement('div');notice.className='owner-navigation-status';
   const status=doc.createElement('p');status.setAttribute('role','status');status.textContent=text;notice.append(status);
   if(retry){const button=doc.createElement('button');button.type='button';button.textContent='Check owner access again';button.addEventListener('click',()=>{void refresh();});notice.append(button);}
   target.append(notice);
  }
  message('Checking owner access…');
  try{
   const {data,error}=await getSession();const account=data?.session;
   if(!current())return;
   if(error||!account?.access_token||account.user?.id!==userId){message('Owner access could not be checked. Sign in with your account, then check again.',true);return;}
   const r=await fetcher('/api/admin-summary?capability=1',{headers:{Authorization:'Bearer '+account.access_token},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
   if(!current())return;
   if(r.status===403||r.status===404){notice?.remove();notice=null;return;}
   if(!r.ok){message('Owner access could not be checked. The dashboard link is unavailable until verification succeeds.',true);return;}
   const capability=await r.json();if(!current())return;
   if(capability.commandCenter===false){notice?.remove();notice=null;return;}
   if(capability.commandCenter!==true){message('Owner access could not be verified. Please check again later.',true);return;}
   notice?.remove();notice=null;
   link=doc.createElement('a');link.href='/admin.html';link.className='profile-shortcut owner-command-center';
   const copy=doc.createElement('span');copy.className='profile-shortcut-copy';
   const eyebrow=doc.createElement('span');eyebrow.className='micro-title';eyebrow.textContent='Owner access';
   const title=doc.createElement('strong');title.textContent='Command Center';
   const description=doc.createElement('small');description.textContent='Private operating dashboard.';
   const arrow=doc.createElement('span');arrow.className='profile-shortcut-arrow';arrow.textContent='↗';
   copy.append(eyebrow,title,description);link.append(copy,arrow);target.append(link);
  }catch{message('Owner access could not be checked. Please check your connection and try again.',true);}
 }
 onAuthChange(()=>{void refresh();});
 return {mount(target){root=target;void refresh();},refresh,clear};
}
