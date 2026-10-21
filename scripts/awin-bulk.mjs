import {createHash} from 'node:crypto';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function stableProduct(product){
 const {feed_imported_at,valid_until,source_hash,source_checked_at,content_changed_at,content_hash,...data}=product;
 return Object.fromEntries(Object.keys(data).sort().map(key=>[key,data[key]]));
}
export const CONTENT_FIELDS=['advertiser_id','source_variant_id','source_product_id','slot','title','description','brand','material','fit','size','color','image_url','product_url','affiliate_url','merchant_name','merchant_host','price_usd','original_price_usd','currency','size_system','available','stock_status','source_feed_id'];
export const contentData=p=>Object.fromEntries(CONTENT_FIELDS.map(k=>[k,p[k]??null]));
export const contentHash=product=>createHash('sha256').update(JSON.stringify(contentData(product))).digest('hex');
export function contentOutcome(prior,incoming){
 if(!prior)return 'inserted';
 if(!prior.content_hash)return contentHash(prior)===contentHash(incoming)?'initialized':'updated';
 return prior.content_hash===contentHash(incoming)?'unchanged':'updated';
}
export function writeApproval(){
 if(process.env.MATCHLATCH_SHOPIFY_FIRST_PHASE==='true')throw Error('Awin writes are frozen during Shopify validation');
 if(process.env.VERCEL_ENV!=='preview'||process.env.MATCHLATCH_CATALOG_WRITES_APPROVED!=='true'||process.env.MATCHLATCH_FEED_FRESHNESS_V2!=='true')throw Error('Catalog writes paused: Preview approval and installed v2 protocol required');
}
export function importBound(value,fallback,ceiling=899){
 const n=Number(value??fallback);if(!Number.isInteger(n)||n<1||n>ceiling)throw Error('Invalid controlled import bound');return n;
}
export const productHash=product=>createHash('sha256').update(JSON.stringify(stableProduct(product))).digest('hex');
export async function rpc(name,body,{retries=2,signal}={}){
 const base=process.env.MATCHLATCH_SUPABASE_URL,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base||'')||!secret)throw Error('Missing trusted database configuration');
 for(let attempt=0;;attempt++){
  signal?.throwIfAborted();
  try{
   const r=await fetch(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.any([AbortSignal.timeout(20000),...(signal?[signal]:[])]),redirect:'error'});
   if(!r.ok){const e=Error('Database RPC '+name+' HTTP '+r.status);e.retryable=r.status===429||r.status>=500;throw e;}
   return await r.json();
  }catch(e){if(attempt>=retries||e.retryable===false)throw e;await wait(250*2**attempt);}
 }
}
export async function bulkWrite(products,feeds,{resumeId=null,batchSize=process.env.AWIN_BATCH_SIZE??100,reconcile=false,signal=AbortSignal.timeout(240000)}={}){
 writeApproval();
 if(reconcile)throw Error('Full-feed reconciliation is disabled pending separately validated complete feed and approval');
 if(resumeId)throw Error('Automatic resume is disabled; recovery requires exact snapshot review');
 importBound(products.length,25);
 const size=importBound(batchSize,100,200),results=[];
 const identities=products.map(p=>p.advertiser_id+':'+p.source_variant_id);
 if(new Set(identities).size!==products.length)throw Error('Duplicate product identity');
 if(feeds.length!==1||feeds[0].advertiser_id!==116479||String(feeds[0].feed_id)!=='102556')throw Error('Only the reviewed private development source supports v2 writes');
 if(products.some(p=>p.advertiser_id!==116479||p.is_public!==false||p.shipping_us_eligible!==false))throw Error('Private source flags required');
 const call=(name,body)=>rpc(name,body,{signal});
 for(const feed of feeds){
  const selected=products.filter(p=>p.advertiser_id===feed.advertiser_id).map(p=>({...p,source_feed_id:String(feed.feed_id),source_updated_at:feed.last_imported.replace(' ','T')+'Z'})).sort((a,b)=>a.source_variant_id.localeCompare(b.source_variant_id));
  for(const p of selected){p.source_hash=productHash(p);p.source_checked_at=feed.source_checked_at;p.content_hash=contentHash(p);}
  const checksum=createHash('sha256').update(selected.map(p=>p.source_hash).join('')).digest('hex');
  const start=await call('matchlatch_awin_begin_v2',{p_advertiser:feed.advertiser_id,p_feed:String(feed.feed_id),p_checksum:checksum,p_total:selected.length,p_batch_size:size,p_resume:resumeId});
  const runId=start.run_id;
  try{
   for(let offset=start.next_batch*size;offset<selected.length;offset+=size){
    await call('matchlatch_awin_batch_v2',{p_run:runId,p_batch:Math.floor(offset/size),p_products:selected.slice(offset,offset+size)});
   }
   const result=await call('matchlatch_awin_finish_v2',{p_run:runId,p_valid_ids:selected.map(p=>p.source_variant_id)});
   results.push(result);if(result.removed!==0)throw Error('Unexpected removal count');console.log(JSON.stringify({stage:'bulk-result',...result}));
  }catch(e){await call('matchlatch_awin_fail',{p_run:runId,p_error:e.name+': '+String(e.message).slice(0,120)}).catch(()=>{});throw e;}
 }
 return results;
}
