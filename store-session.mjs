// Read the existing app session; never create another client or inspect storage.
export async function storeSession({root=window,timeout=8000}={}){
 if(!root.MatchlatchAuth?.client){
  await new Promise(resolve=>{
   const ready=()=>{root.removeEventListener('matchlatch:auth-ready',ready);clearTimeout(timer);resolve();};
   const timer=setTimeout(ready,timeout);root.addEventListener('matchlatch:auth-ready',ready);
   if(root.MatchlatchAuth?.client)ready();
  });
 }
 const client=root.MatchlatchAuth?.client;
 if(!client)throw Error('Store account tools did not initialize. Reload this page; Command Center sign-in alone does not confirm Store initialization.');
 const {data,error}=await client.auth.getSession();
 if(error)throw Error('Store could not read your account session. Retry your MATCHLATCH sign-in.');
 return data?.session||null;
}
export async function checkStoreAccess({session,fetcher=fetch,signal}={}){
 if(!session?.access_token)return 'Store session: missing. Sign in to MATCHLATCH on this hostname.';
 const options={headers:{Authorization:'Bearer '+session.access_token},credentials:'same-origin',cache:'no-store',redirect:'error',signal};
 const results=await Promise.allSettled(['/api/admin-summary?capability=1','/api/shop?mode=unified-capabilities'].map(async url=>{
  const r=await fetcher(url,options);return {status:r.status,data:r.ok?await r.json():null};
 }));
 const admin=results[0].status==='fulfilled'?results[0].value:null,shop=results[1].status==='fulfilled'?results[1].value:null;
 if(!admin||!shop)return 'Store session: present. An access check could not be reached; retry later.';
 if(admin.status===200&&admin.data?.commandCenter===true&&shop.status===200&&shop.data?.ownerEvaluation===true)return 'Store session: present. Command Center owner: accepted. Shopify search owner: accepted. Ready for a product search without unverified delivery-date filters.';
 if(admin.status===200&&admin.data?.commandCenter===true)return 'Store session: present. Command Center owner: accepted. Shopify search owner: not accepted or evaluation disabled. The API routes disagree; this is not an empty product search.';
 return 'Store session: present. Command Center owner: not accepted (HTTP '+admin.status+'). Shopify search owner: '+(shop.data?.ownerEvaluation===true?'accepted':'not accepted')+'.';
}
