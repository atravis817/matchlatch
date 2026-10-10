import {createHash} from 'node:crypto';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function stableProduct(product){
 const {feed_imported_at,valid_until,source_hash,...data}=product;
 return Object.fromEntries(Object.keys(data).sort().map(key=>[key,data[key]]));
}
export const productHash=product=>createHash('sha256').update(JSON.stringify(stableProduct(product))).digest('hex');
export async function rpc(name,body,{retries=2}={}){
 const base=process.env.MATCHLATCH_SUPABASE_URL,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base||'')||!secret)throw Error('Missing trusted database configuration');
 for(let attempt=0;;attempt++){
  try{
   const r=await fetch(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000),redirect:'error'});
   if(!r.ok){const e=Error('Database RPC '+name+' HTTP '+r.status);e.retryable=r.status===429||r.status>=500;throw e;}
   return await r.json();
  }catch(e){if(attempt>=retries||e.retryable===false)throw e;await wait(250*2**attempt);}
 }
}
export async function bulkWrite(products,feeds,{resumeId=null,batchSize=Number(process.env.AWIN_BATCH_SIZE)||100}={}){
 if(process.env.VERCEL_ENV!=='preview')throw Error('Bulk import is Preview only');
 const size=Math.max(1,Math.min(200,Math.floor(batchSize))),results=[];
 for(const feed of feeds){
  const selected=products.filter(p=>p.advertiser_id===feed.advertiser_id).map(p=>({...p,source_feed_id:String(feed.feed_id),source_updated_at:feed.last_imported.replace(' ','T')+'Z'})).sort((a,b)=>a.source_variant_id.localeCompare(b.source_variant_id));
  for(const p of selected)p.source_hash=productHash(p);
  const checksum=createHash('sha256').update(selected.map(p=>p.source_hash).join('')).digest('hex');
  const start=await rpc('matchlatch_awin_begin',{p_advertiser:feed.advertiser_id,p_feed:String(feed.feed_id),p_checksum:checksum,p_total:selected.length,p_batch_size:size,p_resume:resumeId});
  const runId=start.run_id;
  try{
   for(let offset=start.next_batch*size;offset<selected.length;offset+=size){
    await rpc('matchlatch_awin_batch',{p_run:runId,p_batch:Math.floor(offset/size),p_products:selected.slice(offset,offset+size)});
   }
   const result=await rpc('matchlatch_awin_finish',{p_run:runId,p_valid_ids:selected.map(p=>p.source_variant_id)});
   results.push(result);console.log(JSON.stringify({stage:'bulk-result',...result}));
  }catch(e){await rpc('matchlatch_awin_fail',{p_run:runId,p_error:e.name+': '+String(e.message).slice(0,120)}).catch(()=>{});throw e;}
 }
 return results;
}
