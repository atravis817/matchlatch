import {createAdminAuth} from './shopify-admin-auth.mjs';
import {createHash,randomUUID} from 'node:crypto';
import {classifyProduct} from './fashion-taxonomy.mjs';
import {STORE_DOMAIN} from './shopify-storefront-adapter.mjs';

export const API_VERSION='2026-10';
const variants=`nodes { id title price inventoryQuantity inventoryPolicy selectedOptions { name value } media(first: 1) { nodes { preview { image { url } } } } inventoryItem { tracked } } pageInfo { hasNextPage endCursor }`;
export const PRODUCTS_QUERY=`query MatchlatchSyncProducts($first: Int!, $after: String, $query: String, $sort: ProductSortKeys!) {
 shop { myshopifyDomain currencyCode }
 products(first: $first, after: $after, query: $query, sortKey: $sort) {
  nodes { id title handle vendor productType description status updatedAt onlineStoreUrl featuredMedia { preview { image { url } } }
   variants(first: 50) { ${variants} }
  } pageInfo { hasNextPage endCursor }
 }
}`;
export const VARIANTS_QUERY=`query MatchlatchSyncVariants($id: ID!, $after: String) { product(id: $id) { id variants(first: 50, after: $after) { ${variants} } } }`;
const id=(v,type)=>typeof v==='string'&&new RegExp('^gid://shopify/'+type+'/[0-9]+$').test(v);
const text=(v,max=250)=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max);
export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const safeUrl=(v,hosts)=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&hosts.includes(u.hostname)?u.href:null;}catch{return null;}};
export function easternDay(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const value=type=>parts.find(p=>p.type===type).value;return `${value('year')}-${value('month')}-${value('day')}`;
}
export function isMidnightWindow(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).formatToParts(now);
 return parts.find(p=>p.type==='hour').value==='00';
}
export function nextMidnight(now=new Date()){
 const day=easternDay(now);let candidate=new Date(Math.floor(now.getTime()/3600000)*3600000+3600000);
 for(let n=0;n<27;n++,candidate=new Date(candidate.getTime()+3600000))if(easternDay(candidate)!==day&&isMidnightWindow(candidate))return candidate.toISOString();
 throw Error('timezone_unavailable');
}
export function changeQuery(watermark,cutoff){
 if(!Number.isFinite(Date.parse(cutoff)))throw Error('invalid_cutoff');
 const upper=`updated_at:<=\"${new Date(cutoff).toISOString()}\"`;
 return watermark?`updated_at:>=\"${new Date(Date.parse(watermark)-300000).toISOString()}\" ${upper}`:upper;
}
export function normalizeProduct(product,{shop=STORE_DOMAIN,currency='USD',observedAt=new Date().toISOString()}={}){
 if(shop!==STORE_DOMAIN||!id(product?.id,'Product')||!Number.isFinite(Date.parse(product.updatedAt))||!Number.isFinite(Date.parse(observedAt)))throw Error('invalid_source_product');
 if(product.variants?.pageInfo?.hasNextPage!==false||!Array.isArray(product.variants?.nodes))throw Error('incomplete_variants');
 const classification=classifyProduct({title:text(product.title),description:text(product.description,600),sourceProductType:text(product.productType)});
 const seen=new Set();
 return product.variants.nodes.map(v=>{
  if(!id(v.id,'ProductVariant')||seen.has(v.id))throw Error('invalid_or_duplicate_variant');seen.add(v.id);
  const options=(v.selectedOptions||[]).map(o=>({name:text(o.name,100),value:text(o.value,100)}));
  const option=names=>options.find(o=>names.includes(o.name.toLowerCase()))?.value||'';
  const price=/^\d{1,7}(?:\.\d{1,2})?$/.test(v.price||'')?Number(v.price):null;
  const tracked=v.inventoryItem?.tracked===true,quantity=Number.isSafeInteger(v.inventoryQuantity)?v.inventoryQuantity:null;
  // Admin quantity is a snapshot across inventory locations, not US sellable
  // stock. Publication requires separate channel/shipping evidence.
  const available=product.status==='ACTIVE'&&tracked&&quantity!==null&&quantity>0&&v.inventoryPolicy==='DENY';
  const image=safeUrl(v.media?.nodes?.[0]?.preview?.image?.url||product.featuredMedia?.preview?.image?.url,['cdn.shopify.com']);
  const handleUrl=/^[a-z0-9][a-z0-9-]{0,200}$/i.test(product.handle||'')?`https://${shop}/products/${product.handle}`:null;
  const destination=safeUrl(product.onlineStoreUrl||handleUrl,[shop]);
  const data={id:'shopify-storefront:'+shop+':'+v.id.split('/').pop(),source:'shopify_storefront',productId:product.id,variantId:v.id,merchantId:shop,merchant:'MATCHLATCH',title:text(product.title),description:text(product.description,600),brand:text(product.vendor,150),sourceProductType:text(product.productType),productType:classification.productType,slot:classification.legacySlot,size:option(['size','waist size','shoe size']),sizeSystem:option(['size system','sizing system']),color:option(['color','colour']),fit:'',material:'',price,currency,image,merchantProductUrl:destination,available,stockVerifiedLive:false,nativeCheckoutEligible:false,checkoutUrl:'',checkoutEnabled:false,inventory:{tracked,quantity,policy:v.inventoryPolicy||null},options};
  // Routine price/quantity changes preserve approval; source/merchant/identity,
  // type, image, destination and options changes invalidate it.
  const materialHash=digest({shop,product:product.id,variant:v.id,title:data.title,vendor:data.brand,type:data.sourceProductType,status:product.status,image,destination,options});
  const contentHash=digest(data);
  const warnings=[];if(classification.reviewRequired)warnings.push('classification_needs_review');if(!image)warnings.push('image_missing');if(!destination)warnings.push('merchant_destination_missing');if(currency!=='USD'||!price||price<=0)warnings.push('valid_usd_price_missing');if(!available)warnings.push('positive_tracked_inventory_unverified');
  return {shop,product_id:product.id,variant_id:v.id,source_updated_at:product.updatedAt,observed_at:observedAt,slot:data.slot,size:data.size,color:data.color,brand:data.brand,price_usd:currency==='USD'?price:null,available,material_hash:materialHash,content_hash:contentHash,data,warnings};
 });
}
export function reconcile(existing,incoming){
 const old=new Map(existing.map(r=>[r.shop+'|'+r.variant_id,r])),seen=new Set(),counts={inserted:0,updated:0,unchanged:0,retired:0};
 for(const row of incoming){const k=row.shop+'|'+row.variant_id;if(seen.has(k))throw Error('duplicate_source_identity');seen.add(k);const prior=old.get(k);counts[!prior?'inserted':prior.content_hash===row.content_hash?'unchanged':'updated']++;}
 return counts;
}
export function publicationDecision(row,evidence={},now=Date.now(),purpose='display'){
 const reasons=[...(row.warnings||[])];
 for(const field of ['sourceAuthorized','displayAuthorized','imageRights','supplierVerified','channelVerified','usShippingVerified'])if(evidence[field]!==true)reasons.push(field+'_unverified');
 if(purpose==='recommendation'&&evidence.recommendationAuthorized!==true)reasons.push('recommendation_permission_unverified');
 if(!evidence.evidenceRef||!evidence.supplierId||!evidence.channelId)reasons.push('permission_evidence_missing');
 if(evidence.vendor!==row.brand||!Array.isArray(evidence.productIds)||!evidence.productIds.includes(row.product_id))reasons.push('source_policy_scope_mismatch');
 if(evidence.materialHash!==row.material_hash)reasons.push('material_approval_mismatch');
 if(!Number.isFinite(Date.parse(evidence.expiresAt))||Date.parse(evidence.expiresAt)<=now)reasons.push('permission_expired');
 const checked=Date.parse(row.observed_at);if(!Number.isFinite(checked)||checked>now+60000||now-checked>26*3600000)reasons.push('inventory_stale');
 if(!row.available||row.retired)reasons.push('unavailable');
 return {eligible:reasons.length===0,reasons:[...new Set(reasons)]};
}
export function createShopifyReader({env=process.env,fetcher=fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 const {SHOPIFY_STORE_DOMAIN:shop,SHOPIFY_ADMIN_API_VERSION:version}=env;
 if(shop!==STORE_DOMAIN||version!==API_VERSION)throw Error('shopify_admin_configuration_unavailable');
 const auth=createAdminAuth({env,fetcher});
 const call=async(query,variables)=>{
  let renewed=false;
  for(let attempt=0;attempt<4;attempt++){
   const token=await auth.token();
   let response;try{response=await fetcher(`https://${shop}/admin/api/${version}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});}catch{throw Error('provider_unavailable');}
   if(response.status===401&&auth.mode==='client_credentials'&&!renewed){auth.invalidate(token);renewed=true;continue;}
   if(response.status===429||response.status>=500){if(attempt===3)throw Error('provider_unavailable');await wait(Math.min(5000,Math.max(250,Number(response.headers.get('retry-after')||1)*1000)));continue;}
   if(!response.ok)throw Error('provider_access_denied');
   if(response.headers.get('x-shopify-api-version')!==version)throw Error('api_version_mismatch');
   const reader=response.body?.getReader();if(!reader)throw Error('invalid_provider_response');let bytes=0,chunks=[];
   try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2*1024*1024)throw Error('provider_response_too_large');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
   const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(payload.errors?.length){if(payload.errors.every(e=>e.extensions?.code==='THROTTLED')&&attempt<3){await wait(1000*(attempt+1));continue;}throw Error('provider_query_rejected');}
   if(!payload.data)throw Error('invalid_provider_response');return payload.data;
  }
 };
 return {async page({cursor=null,mode='full',watermark=null,cutoff,acceptance=null}){
  if(acceptance&&(!Array.isArray(acceptance)||!acceptance.length||acceptance.length>5||acceptance.some(p=>!id(p.productId,'Product'))))throw Error('acceptance_manifest_invalid');
  const filter=acceptance?'('+acceptance.map(p=>'id:'+p.productId.split('/').pop()).join(' OR ')+')':null;
  const data=await call(PRODUCTS_QUERY,{first:5,after:cursor,query:acceptance?filter:mode==='full'?null:changeQuery(watermark,cutoff),sort:mode==='full'?'ID':'UPDATED_AT'});
  if(data.shop?.myshopifyDomain!==shop||!data.shop.currencyCode)throw Error('shop_identity_mismatch');
  const page=data.products;if(!Array.isArray(page?.nodes)||page.nodes.length>5||typeof page.pageInfo?.hasNextPage!=='boolean')throw Error('invalid_products_page');
  let acceptanceCount=0;
  for(const p of page.nodes){if(acceptance&&(acceptanceCount+(p.variants?.nodes?.length||0)>250))throw Error('acceptance_variant_overflow');let loops=0,seen=new Set();while(p.variants?.pageInfo?.hasNextPage){const after=p.variants.pageInfo.endCursor;if(!after||seen.has(after)||++loops>40)throw Error('variant_pagination_limit');seen.add(after);const more=await call(VARIANTS_QUERY,{id:p.id,after});if(more.product?.id!==p.id||!Array.isArray(more.product.variants?.nodes))throw Error('product_changed_during_read');if(acceptance&&acceptanceCount+p.variants.nodes.length+more.product.variants.nodes.length>250)throw Error('acceptance_variant_overflow');p.variants.nodes.push(...more.product.variants.nodes);p.variants.pageInfo=more.product.variants.pageInfo;}acceptanceCount+=p.variants?.nodes?.length||0;}
  return {...page,currency:data.shop.currencyCode};
 }};
}
// Store.claim uses a DB transaction and a fencing token. A timed-out worker
// cannot commit after a successor takes its lease. DB mutations are not retried.
export async function syncSlice({store,reader,shop=STORE_DOMAIN,mode='full',scheduled=false,dryRun=false,now=new Date(),maxPages=10,budgetMs=45000}={}){
 if(!['full','incremental'].includes(mode)||!Number.isInteger(maxPages)||maxPages<1||maxPages>50)throw Error('invalid_sync_options');
 const day=scheduled?easternDay(now):'manual:'+randomUUID();
 const claim=await store.claim({shop,mode,day,dryRun,cutoff:now.toISOString(),worker:randomUUID()});
 if(claim.status!=='running')return claim;
 const started=Date.now();let state=claim;
 try{
  for(let n=0;n<maxPages&&Date.now()-started<budgetMs;n++){
   const page=await reader.page({cursor:state.cursor,mode:state.mode,watermark:state.watermark,cutoff:state.cutoff});
   const rows=page.nodes.flatMap(p=>normalizeProduct(p,{shop,currency:page.currency,observedAt:new Date().toISOString()}));
   const next=page.pageInfo.hasNextPage?page.pageInfo.endCursor:null;
   if(page.pageInfo.hasNextPage&&(!next||next===state.cursor))throw Error('invalid_page_cursor');
   state=await store.commit({job:state.id,worker:state.worker,expectedCursor:state.cursor,nextCursor:next,done:!page.pageInfo.hasNextPage,rows,productIds:page.nodes.map(p=>p.id)});
   if(state.status==='succeeded')return state;
  }
  return await store.pause({job:state.id,worker:state.worker});
 }catch(error){await store.fail({job:state.id,worker:state.worker,category:'sync_batch_failed'}).catch(()=>{});throw Error('sync_batch_failed');}
}
