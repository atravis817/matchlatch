import {STORE_DOMAIN} from './shopify-storefront-adapter.mjs';
// Explicit separate Preview DB; never fall back to the shared/live DB config.
export function createSyncStore({env=process.env,fetcher=fetch}={}){
 const base=env.MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL,key=env.MATCHLATCH_SHOPIFY_PREVIEW_SERVICE_KEY;
 if(env.VERCEL_ENV!=='preview'||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base||'')||!key||base==='https://odxqxymwlwnbqginqems.supabase.co'||base===env.MATCHLATCH_SUPABASE_URL)throw Error('isolated_preview_database_required');
 const db=async(path,{method='GET',body}={})=>{
  const response=await fetcher(base+'/rest/v1/'+path,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('sync_database_unavailable');return response.json();
 };
 const rpc=(action,payload)=>db('rpc/matchlatch_shopify_sync',{method:'POST',body:{p_action:action,p_payload:payload}});
 return {claim:p=>rpc('claim',p),commit:p=>rpc('commit',p),pause:p=>rpc('pause',p),fail:p=>rpc('fail',p),db,
  async status(){const [jobs,state,counts]=await Promise.all([db('matchlatch_shopify_sync_jobs?shop=eq.'+STORE_DOMAIN+'&order=started_at.desc&limit=10'),db('matchlatch_shopify_sync_state?shop=eq.'+STORE_DOMAIN),db('rpc/matchlatch_shopify_counts',{method:'POST',body:{}})]);return {jobs,state,counts};},
  async candidates(offset=0){return db('matchlatch_shopify_products?shop=eq.'+STORE_DOMAIN+'&retired=eq.false&order=variant_id.asc&limit=30&offset='+offset);}
 };
}
