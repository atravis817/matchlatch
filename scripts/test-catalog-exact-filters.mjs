import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(new URL('..',import.meta.url).pathname);
const load=p=>import(pathToFileURL(resolve(root,p)).href);
const originalEnv={...process.env};
process.env.VERCEL_ENV='preview';process.env.MATCHLATCH_SHOPIFY_FIRST_PHASE='true';
process.env.MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL='https://lqxeizvrdxuhzvipmlkl.supabase.co';
process.env.MATCHLATCH_SHOPIFY_PREVIEW_SERVICE_KEY='synthetic-not-a-credential';
process.env.MATCHLATCH_SUPABASE_URL='https://synthetic-auth.supabase.co';
process.env.MATCHLATCH_SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic';
const {normalizeProduct}=await load('lib/shopify-sync.mjs');
const {product}=await load('scripts/shopify-sync-fixture.mjs');
const {GET}=await load('api/catalog.mjs');
let calls=[],rows=[];
const oldFetch=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 calls.push({url:String(url),method:options.method||'GET'});
 if(String(url)==='https://synthetic-auth.supabase.co/auth/v1/user')return Response.json({id:'synthetic-owner',is_anonymous:false});
 if(String(url).startsWith('https://synthetic-auth.supabase.co/rest/v1/matchlatch_records?'))return Response.json([]);
 if(String(url).startsWith('https://lqxeizvrdxuhzvipmlkl.supabase.co/rest/v1/matchlatch_shopify_products?'))return Response.json(rows);
 throw Error('UNEXPECTED_EGRESS:'+String(url));
};
function row(recommendationAuthorized=true){
 const p=product();p.variants.nodes[0].selectedOptions.push({name:'Size system',value:'US'});
 const r=normalizeProduct(p,{observedAt:new Date().toISOString()})[0];
 r.is_public=true;r.approval={sourceAuthorized:true,displayAuthorized:true,recommendationAuthorized,imageRights:true,supplierVerified:true,channelVerified:true,usShippingVerified:true,supplierId:'synthetic',channelId:'synthetic',evidenceRef:'synthetic-only',expiresAt:'2030-01-01',materialHash:r.material_hash,vendor:r.brand,productIds:[r.product_id]};return r;
}
const get=q=>GET(new Request('https://preview.invalid/api/catalog?'+q));
test('actual GET forwards color and independently enforces each exact filter without fallback',async()=>{
 const r=row();rows=[r];
 for(const query of ['color=Red','sizeSystem=EU','color=Red&sizeSystem=EU']){
  calls=[];const response=await get('slot=shirt&'+query);assert.equal(response.status,200);
  assert.deepEqual((await response.json()).items,[]);assert.equal(calls.length,1,'no unconstrained retry');
  if(query.includes('color='))assert.equal(new URL(calls[0].url).searchParams.get('color'),'ilike.Red');
 }
});
test('positive exact color/system/size/budget returns the same source variant without model access',async()=>{
 const r=row();rows=[r];calls=[];
 const response=await get('slot=shirt&color=blue&sizeSystem=us&size=S&max=100');
 assert.equal(response.status,200);const data=await response.json();assert.equal(data.items.length,1);
 assert.equal(data.items[0].variantId,r.data.variantId);assert.equal(data.items[0].merchantId,r.data.merchantId);
 assert.equal(data.items[0].aiProcessingAuthorized,false);assert.equal(calls.length,1);
 const q=new URL(calls[0].url).searchParams;assert.equal(q.get('color'),'ilike.blue');assert.equal(q.get('size'),'ilike.S');assert.equal(q.get('price_usd'),'lte.100');
});
test('missing or malformed source sizing stays unknown and does not discard eligible unrelated rows',async()=>{
 const exact=row(),unknown=row();unknown.data.sizeSystem=null;
 rows=[unknown,exact];let data=await (await get('slot=shirt&sizeSystem=US')).json();assert.equal(data.items.length,1);
 rows=[unknown];data=await (await get('slot=shirt&sizeSystem=US')).json();assert.deepEqual(data.items,[]);
 data=await (await get('slot=shirt')).json();assert.equal(data.items.length,1);
});
test('ambiguous, malformed, oversized and duplicate filter inputs reject before catalog reads',async()=>{
 for(const query of ['color=red%20blue','color=chartreuse','color=red*','color=red&color=blue','color=%20%20','color=red%00','sizeSystem=%20','sizeSystem=EU%0A','sizeSystem=EU&sizeSystem=US','sizeSystem=EU*','sizeSystem='+ 'a'.repeat(41)]){
  calls=[];const response=await get(query);assert.equal(response.status,400,query);assert.deepEqual(calls,[],query);
 }
});
test('exact filters never relax source approval, size or price constraints',async()=>{
 const good=row();
 for(const mutate of [r=>r.approval.displayAuthorized=false,r=>r.approval.materialHash='revoked',r=>r.data.size='M',r=>r.data.price=101]){
  const changed=structuredClone(good);mutate(changed);rows=[changed];calls=[];
  const response=await get('slot=shirt&color=Blue&sizeSystem=US&size=S&max=100');assert.equal(response.status,200);
  assert.deepEqual((await response.json()).items,[]);assert.equal(calls.length,1);
 }
});
test('public display remains anonymous; private products remain forbidden before product reads',async()=>{
 rows=[row()];calls=[];assert.equal((await get('private=1&color=Blue&sizeSystem=US')).status,403);assert.deepEqual(calls,[]);
 assert.equal((await get('slot=shirt&color=Blue&sizeSystem=US')).status,200);
 assert.ok(calls.every(c=>!c.url.includes('/auth/')));
});
test('legacy feed route explicitly rejects nonempty exact filters with no unconstrained search',async()=>{
 process.env.MATCHLATCH_SHOPIFY_FIRST_PHASE='false';
 try{for(const query of ['color=Red','sizeSystem=EU','color=Red&sizeSystem=EU']){
  calls=[];
  const response=await get(query);assert.equal(response.status,400);assert.match((await response.json()).error,/unsupported/);assert.deepEqual(calls,[]);
 }
 calls=[];assert.equal((await get('private=1')).status,403);assert.deepEqual(calls,[]);
 }finally{process.env.MATCHLATCH_SHOPIFY_FIRST_PHASE='true';}
});
test('empty filters preserve existing browse behavior and connector failure never retries unconstrained',async()=>{
 rows=[row()];calls=[];const response=await get('slot=shirt&color=&sizeSystem=');assert.equal(response.status,200);assert.equal((await response.json()).items.length,1);
 const intercepted=globalThis.fetch;let failedReads=0;
 globalThis.fetch=async()=>{failedReads++;return new Response('',{status:503});};
 try{const failed=await get('slot=shirt&color=Blue&sizeSystem=US');assert.equal(failed.status,503);assert.equal(failedReads,1);}
 finally{globalThis.fetch=intercepted;}
});
test.after(()=>{globalThis.fetch=oldFetch;process.env=originalEnv;});
