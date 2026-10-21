import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeProduct,reconcile,syncSlice,publicationDecision,easternDay,isMidnightWindow,nextMidnight,changeQuery,createShopifyReader} from '../lib/shopify-sync.mjs';
import {createSyncStore} from '../lib/shopify-sync-store.mjs';
import {internalShopifySearch} from '../lib/shopify-internal-catalog.mjs';
import {POST,GET} from '../lib/shopify-sync-route.mjs';
import {MemoryStore,product,readerFor} from './shopify-sync-fixture.mjs';
import {STORE_DOMAIN} from '../lib/shopify-storefront-adapter.mjs';
import {createHmac} from 'node:crypto';
import {verifyWebhook,mergeSignals} from '../lib/shopify-webhook-signal.mjs';
import {ownedCandidates} from '../lib/shopify-owned-candidates.mjs';
import {groundedLook,intentFromText} from '../lib/styling-engine.mjs';
const now=new Date('2026-10-14T04:00:00Z');
const normalized=p=>normalizeProduct(p,{observedAt:new Date().toISOString()});
const evidence=row=>({sourceAuthorized:true,displayAuthorized:true,recommendationAuthorized:true,imageRights:true,supplierVerified:true,channelVerified:true,usShippingVerified:true,supplierId:'supplier-1',channelId:'channel-1',evidenceRef:'owner-reviewed-fixture',expiresAt:'2030-01-01T00:00:00Z',materialHash:row.material_hash,vendor:row.brand,productIds:[row.product_id]});
test('899 Awin records are a distinct source and cannot deduplicate Shopify IDs by title',()=>{
 const rows=normalized(product());const existing=Array.from({length:899},(_,i)=>({shop:'awin:116479',variant_id:String(i),content_hash:rows[0].content_hash}));
 assert.deepEqual(reconcile(existing,rows),{inserted:1,updated:0,unchanged:0,retired:0});
});
test('new products, multiple pages and no-change repeat are idempotent',async()=>{
 const store=new MemoryStore(),reader=readerFor(Array.from({length:12},(_,i)=>product(i+1)));
 let result=await syncSlice({store,reader,now});assert.equal(result.inserted,12);assert.equal(store.rows.size,12);
 result=await syncSlice({store,reader,now});assert.equal(result.inserted,0);assert.equal(result.unchanged,12);assert.equal(store.rows.size,12);
});
test('price and inventory updates change only stable source identities',async()=>{
 const store=new MemoryStore();await syncSlice({store,reader:readerFor([product()]),now});
 const row=[...store.rows.values()][0];row.is_public=true;row.approval=evidence(row);
 const result=await syncSlice({store,reader:readerFor([product(1,{price:'50.00',quantity:0})]),now});
 const updated=[...store.rows.values()][0];assert.equal(result.updated,1);assert.equal(updated.data.price,50);assert.equal(updated.available,false);assert.equal(updated.is_public,true);assert.equal(publicationDecision(updated,updated.approval).eligible,false);
});
test('material supplier changes revoke approval; returning retired variants need review',async()=>{
 const store=new MemoryStore();await syncSlice({store,reader:readerFor([product()]),now});const old=[...store.rows.values()][0];old.is_public=true;old.approval=evidence(old);
 await syncSlice({store,reader:readerFor([product(1,{vendor:'New supplier'})]),now});assert.equal([...store.rows.values()][0].is_public,false);
 await syncSlice({store,reader:readerFor([]),now});assert.equal([...store.rows.values()][0].retired,true);
 await syncSlice({store,reader:readerFor([product()]),now});assert.equal([...store.rows.values()][0].is_public,false);
});
test('variant additions and removals retain retired identities',async()=>{
 const store=new MemoryStore();await syncSlice({store,reader:readerFor([product(1,{variants:2}),product(2)]),now});
 await syncSlice({store,reader:readerFor([product(1)]),now,mode:'incremental'});assert.equal(store.rows.get('gid://shopify/ProductVariant/101').retired,true);assert.equal(store.rows.get('gid://shopify/ProductVariant/200').retired,false);
 await syncSlice({store,reader:readerFor([product(1,{variants:3})]),now});assert.equal(store.rows.size,4);assert.equal(store.rows.get('gid://shopify/ProductVariant/200').retired,true);
});
test('interrupted run resumes after last committed page; watermark is atomic',async()=>{
 const store=new MemoryStore(),reader=readerFor([product(1),product(2),product(3)],1);
 const first=await syncSlice({store,reader,now,maxPages:1});assert.equal(first.status,'paused');assert.equal(first.cursor,'1');assert.equal(store.watermark,null);
 const result=await syncSlice({store,reader,now});assert.equal(result.status,'succeeded');assert.equal(result.inserted,3);assert.equal(store.watermark,now.toISOString());
});
test('provider failure preserves checkpoint and existing inventory; next invocation resumes',async()=>{
 const store=new MemoryStore(),normal=readerFor([product(1),product(2)],1);let fail=true;
 const reader={async page(input){if(input.cursor==='1'&&fail)throw Error('token must not leak');return normal.page(input);}};
 await assert.rejects(syncSlice({store,reader,now}),/sync_batch_failed/);assert.equal(store.jobs[0].cursor,'1');assert.equal(store.watermark,null);assert.equal(store.rows.size,1);
 fail=false;const result=await syncSlice({store,reader,now});assert.equal(result.inserted,2);
});
test('concurrent workers and repeated scheduled day cannot duplicate runs',async()=>{
 const store=new MemoryStore();let release;const delayed={page:()=>new Promise(r=>release=()=>r({nodes:[],currency:'USD',pageInfo:{hasNextPage:false}}))};
 const first=syncSlice({store,reader:delayed,now,scheduled:true});await new Promise(r=>setImmediate(r));
 assert.equal((await syncSlice({store,reader:readerFor([]),now,scheduled:true})).status,'busy');release();await first;
 const again=await syncSlice({store,reader:readerFor([product()]),now,scheduled:true});assert.equal(again.status,'succeeded');assert.equal(store.rows.size,0);assert.equal(store.jobs.length,1);
});
test('dry runs do not change catalog, approvals or watermarks and cannot resume write jobs',async()=>{
 const rows=normalized(product()),store=new MemoryStore(rows);const before=structuredClone([...store.rows.values()]);
 await syncSlice({store,reader:readerFor([product(2)]),now,dryRun:true});assert.deepEqual([...store.rows.values()],before);assert.equal(store.watermark,null);
 await syncSlice({store,reader:readerFor([product(1),product(2)],1),now,maxPages:1});
 assert.equal((await syncSlice({store,reader:readerFor([]),now,dryRun:true})).status,'resume_required');
});
test('fencing prevents a stale worker from committing after lease handover',async()=>{
 const store=new MemoryStore(),claim=await store.claim({shop:STORE_DOMAIN,day:'x',mode:'full',dryRun:false,worker:'a',cutoff:now.toISOString()});
 await store.pause({job:claim.id,worker:'a'});await store.claim({shop:STORE_DOMAIN,day:'x',mode:'full',dryRun:false,worker:'b',cutoff:now.toISOString()});
 await assert.rejects(store.commit({job:claim.id,worker:'a',rows:[],expectedCursor:null}),/lease_lost/);
});
test('incomplete, duplicate and unknown inventory variants fail safely',()=>{
 const p=product();p.variants.pageInfo.hasNextPage=true;assert.throws(()=>normalized(p),/incomplete_variants/);
 p.variants.pageInfo.hasNextPage=false;p.variants.nodes.push(p.variants.nodes[0]);assert.throws(()=>normalized(p),/duplicate_variant/);
 const unknown=product();unknown.variants.nodes[0].inventoryItem.tracked=false;assert.equal(normalized(unknown)[0].available,false);
 unknown.variants.nodes[0].inventoryItem.tracked=true;unknown.variants.nodes[0].inventoryPolicy='CONTINUE';assert.equal(normalized(unknown)[0].available,false);
 const headless={...product(),onlineStoreUrl:null,handle:'basalt-s-n-jersey-3-4-sleeve-crop-top-tee'};
 assert.equal(normalized(headless)[0].data.merchantProductUrl,'https://'+STORE_DOMAIN+'/products/basalt-s-n-jersey-3-4-sleeve-crop-top-tee');
 assert.ok(!normalized(headless)[0].warnings.includes('merchant_destination_missing'));
 const noDest={...product(),onlineStoreUrl:null,handle:''};
 assert.ok(normalized(noDest)[0].warnings.includes('merchant_destination_missing'));
});
test('DST-aware midnight and next run match spring and fall transitions',()=>{
 assert.equal(isMidnightWindow(new Date('2026-07-01T04:00:00Z')),true);assert.equal(isMidnightWindow(new Date('2026-12-01T05:00:00Z')),true);
 assert.equal(isMidnightWindow(new Date('2026-12-01T04:00:00Z')),false);
 assert.equal(nextMidnight(new Date('2026-03-08T05:01:00Z')),'2026-03-09T04:00:00.000Z');
 assert.equal(nextMidnight(new Date('2026-11-01T04:01:00Z')),'2026-11-02T05:00:00.000Z');
 assert.equal(easternDay(new Date('2026-10-14T03:59:00Z')),'2026-10-13');
 assert.match(changeQuery('2026-10-13T04:00:00Z',now.toISOString()),/2026-10-13T03:55:00.000Z/);
});
test('publication requires current evidence, exact material review and recommendation rights',()=>{
 const row=normalized(product())[0];assert.equal(publicationDecision(row).eligible,false);
 const e=evidence(row);assert.equal(publicationDecision(row,e).eligible,true);
 assert.equal(publicationDecision(row,{...e,materialHash:'different'}).eligible,false);
 assert.equal(publicationDecision(row,{...e,expiresAt:'2020-01-01'}).eligible,false);
 assert.equal(publicationDecision({...row,observed_at:'2020-01-01'},e).eligible,false);
 assert.equal(publicationDecision(row,{...e,recommendationAuthorized:false},Date.now(),'recommendation').eligible,false);
});
test('Store and Studio exclude private rows, preserve exact size, bounded pages, checkout and AI gates',async()=>{
 const row=normalized(product())[0],approved={...row,is_public:true,approval:evidence(row)};let path;
 const store={async db(value){path=value;return [approved,{...approved,variant_id:'private',is_public:false}];}};
 const results=await internalShopifySearch({slot:'shirt',query:'',max:100,size:'S',purpose:'recommendation'},{store});assert.equal(results.items.length,1);assert.match(path,/limit=60/);assert.equal(results.items[0].nativeCheckoutEligible,false);assert.equal(results.aiProcessing,false);assert.equal(results.sources.awin.status,'disabled');
 assert.equal((await internalShopifySearch({slot:'shirt',query:'',max:100,size:'M'},{store})).items.length,0);
 assert.equal((await internalShopifySearch({slot:'shirt',query:'',max:100,needBy:'2026-10-20'},{store})).items.length,0);
});
test('separate Preview DB requirement prevents shared live catalog writes',()=>{
 assert.throws(()=>createSyncStore({env:{VERCEL_ENV:'production'}}),/isolated_preview/);
 assert.throws(()=>createSyncStore({env:{VERCEL_ENV:'preview',MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL:'https://odxqxymwlwnbqginqems.supabase.co',MATCHLATCH_SHOPIFY_PREVIEW_SERVICE_KEY:'secret'}}),/isolated_preview/);
});
test('read-only upstream retry handles throttles, nested variant pagination and shop identity',async()=>{
 let calls=0;const p=product();p.variants.pageInfo={hasNextPage:true,endCursor:'v1'};
 const fetcher=async(url,options)=>{calls++;const req=JSON.parse(options.body);assert.match(url,/\/admin\/api\/2026-10/);
  if(calls===1)return new Response('',{status:429});
  const data=req.query.includes('query MatchlatchSyncVariants')?{product:{id:p.id,variants:product(1,{variants:2}).variants}}:{shop:{myshopifyDomain:STORE_DOMAIN,currencyCode:'USD'},products:{nodes:[p],pageInfo:{hasNextPage:false}}};
  if(req.query.includes('query MatchlatchSyncVariants'))data.product.variants.nodes=data.product.variants.nodes.slice(1);
  return new Response(JSON.stringify({data}),{headers:{'x-shopify-api-version':'2026-10'}});
 };
 const reader=createShopifyReader({env:{SHOPIFY_STORE_DOMAIN:STORE_DOMAIN,SHOPIFY_ADMIN_API_VERSION:'2026-10',SHOPIFY_ADMIN_READ_TOKEN:'fixture'},fetcher,wait:async()=>{}});
 const page=await reader.page({cutoff:now.toISOString()});assert.equal(calls,3);assert.equal(page.nodes[0].variants.nodes.length,2);
});
test('Production and unauthenticated scheduler paths are closed',async()=>{
 const old=process.env.VERCEL_ENV;try{process.env.VERCEL_ENV='production';assert.equal((await POST(new Request('https://example.test/api/admin-summary?action=shopify-sync-status',{method:'POST'}))).status,404);assert.equal((await GET(new Request('https://example.test/api/admin-summary?action=shopify-sync-status'))).status,404);
 process.env.VERCEL_ENV='preview';assert.equal((await POST(new Request('https://example.test/api/admin-summary?action=shopify-sync-scheduled',{method:'POST'}))).status,401);}finally{if(old===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=old;}
});
test('SQL proposal has atomic checkpoint, fencing, private tables and restricted execute grants',async()=>{
 const sql=await readFile(new URL('../supabase/PROPOSED_shopify_sync.sql',import.meta.url),'utf8');assert.match(sql,/j\.cursor is distinct from/);assert.match(sql,/lease_until<=now\(\)/);assert.match(sql,/last_successful_run=j.id/);assert.match(sql,/revoke all on function.*from public,anon,authenticated/);assert.equal((sql.match(/enable row level security/g)||[]).length,5);
});
test('optional signed webhook signals reject forgery and deduplicate out-of-order metadata',()=>{
 const secret='s'.repeat(32),body=Buffer.from(JSON.stringify({id:123,updated_at:'2026-10-14T02:00:00Z',customer:'not retained'})),signature=createHmac('sha256',secret).update(body).digest('base64');
 const signal=verifyWebhook({body,signature,secret,shop:STORE_DOMAIN,topic:'products/update',eventId:'event-1'});assert.equal(signal.productId,'gid://shopify/Product/123');assert.equal(Object.hasOwn(signal,'customer'),false);
 assert.equal(verifyWebhook({body,signature:'x'.repeat(43)+'=',secret,shop:STORE_DOMAIN,topic:'products/update',eventId:'event-1'}),null);
 assert.equal(mergeSignals([signal],[signal,{...signal,eventId:'event-2',topic:'products/delete',updatedAt:'2026-10-13T01:00:00Z'}]).length,2);
});
test('owned wardrobe candidates cost zero new spend and never invent size or merchant availability',()=>{
 const owned=ownedCandidates([{record_id:'1',payload:{source:'user-entered',description:'Blue t-shirt',paid:80}}]);assert.equal(owned[0].price,0);assert.equal(owned[0].size,'');assert.equal(owned[0].source,'owned');
 const look=groundedLook(owned,intentFromText('Complete outfit',{budget:50}),owned.map(p=>p.id));assert.equal(look.total,0);assert.equal(look.products.length,1);assert.equal(look.products[0].nativeCheckoutEligible,false);
});
