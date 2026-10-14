import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {normalizeProduct,syncSlice} from '../lib/shopify-sync.mjs';
import {product,readerFor} from './shopify-sync-fixture.mjs';
import {STORE_DOMAIN} from '../lib/shopify-storefront-adapter.mjs';
const modulePath=process.env.MATCHLATCH_PGLITE_MODULE;
test('isolated PostgreSQL transactional synchronization and access controls',{skip:!modulePath},async t=>{
 const {PGlite}=await import(modulePath),db=new PGlite();
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 await db.exec(await readFile(new URL('../supabase/PROPOSED_shopify_sync.sql',import.meta.url),'utf8'));
 await db.exec('set role service_role');
 const rpc=async(action,payload)=>(await db.query('select public.matchlatch_shopify_sync($1,$2::jsonb) result',[action,JSON.stringify(payload)])).rows[0].result;
 const store={claim:p=>rpc('claim',p),commit:p=>rpc('commit',p),pause:p=>rpc('pause',p),fail:p=>rpc('fail',p)};
 const rowCount=async()=>Number((await db.query('select count(*) n from public.matchlatch_shopify_products')).rows[0].n);
 const rows=async()=> (await db.query('select * from public.matchlatch_shopify_products order by variant_id')).rows;
 const now=new Date();
 await t.test('paginated upserts preserve identities and return exact no-change counts',async()=>{
  const result=await syncSlice({store,reader:readerFor([product(1,{variants:2}),product(2)],1),now});assert.equal(result.inserted,3);assert.equal(await rowCount(),3);
  const repeat=await syncSlice({store,reader:readerFor([product(1,{variants:2}),product(2)],1),now});assert.equal(repeat.unchanged,3);assert.equal(repeat.updated,0);assert.equal(repeat.inserted,0);
 });
 await t.test('unknown/public/authenticated roles cannot read private catalog or call worker RPC',async()=>{
  for(const role of ['anon','authenticated']){await db.exec('reset role;set role '+role);await assert.rejects(db.query('select * from public.matchlatch_shopify_products'),/permission denied/);await assert.rejects(rpc('claim',{}),/permission denied/);}
  await db.exec('reset role;set role service_role');
 });
 await t.test('dry reconciliation leaves products and watermark intact; counts variant and product retirement once',async()=>{
  const before=await rows(),state=(await db.query('select * from public.matchlatch_shopify_sync_state')).rows;
  const dry=await syncSlice({store,reader:readerFor([product(1),product(3)],1),now,dryRun:true});assert.equal(dry.inserted,1);assert.equal(dry.retired,2);assert.deepEqual(await rows(),before);assert.deepEqual((await db.query('select * from public.matchlatch_shopify_sync_state')).rows,state);
 });
 await t.test('partial failure advances neither checkpoint nor watermark for a failed page',async()=>{
  const current=(await db.query('select watermark from public.matchlatch_shopify_sync_state')).rows[0].watermark;
  const paused=await syncSlice({store,reader:readerFor([product(1),product(2)],1),now,maxPages:1});assert.equal(paused.status,'paused');
  await assert.rejects(syncSlice({store,reader:{page:async()=>{throw Error('provider failed');}},now}),/sync_batch_failed/);
  assert.deepEqual((await db.query('select watermark from public.matchlatch_shopify_sync_state')).rows[0].watermark,current);
  const finished=await syncSlice({store,reader:readerFor([product(1),product(2)],1),now});assert.equal(finished.status,'succeeded');assert.equal(finished.retired,1);
 });
 await t.test('publication denies missing evidence; routine prices retain approval; identity changes revoke it',async()=>{
  const row=(await rows()).find(r=>r.variant_id==='gid://shopify/ProductVariant/100');
  const selection=[{variantId:row.variant_id,materialHash:row.material_hash}],owner=randomUUID();
  const publish=e=>db.query('select public.matchlatch_shopify_publish($1,$2,$3::jsonb,$4::jsonb,false)',[owner,STORE_DOMAIN,JSON.stringify(selection),JSON.stringify(e)]);
  await assert.rejects(publish({}),/publication_not_eligible/);
  const e={sourceAuthorized:true,displayAuthorized:true,recommendationAuthorized:true,imageRights:true,supplierVerified:true,channelVerified:true,usShippingVerified:true,supplierId:'fixture',channelId:'fixture',evidenceRef:'reviewed-fixture',expiresAt:'2030-01-01T00:00:00Z',vendor:row.brand,productIds:[row.product_id]};
  await publish(e);await syncSlice({store,reader:readerFor([product(1,{price:'45.00'}),product(2)]),now});assert.equal((await rows())[0].is_public,true);
  await syncSlice({store,reader:readerFor([product(1,{vendor:'Changed vendor'}),product(2)]),now});assert.equal((await rows())[0].is_public,false);assert.deepEqual((await rows())[0].approval,{});
 });
 await t.test('scheduled daily keys deduplicate completed runs',async()=>{
  const run=await syncSlice({store,reader:readerFor([product(1),product(2)]),now,scheduled:true});
  const repeat=await syncSlice({store,reader:readerFor([product(99)]),now,scheduled:true});assert.equal(run.id,repeat.id);assert.equal(await rowCount(),3);
 });
 await t.test('lease handover fences old worker and failed transaction writes no rows',async()=>{
  const first=await store.claim({shop:STORE_DOMAIN,day:'fixture-fencing',mode:'full',dryRun:false,worker:randomUUID(),cutoff:now.toISOString()});
  assert.equal((await store.claim({shop:STORE_DOMAIN,day:'other',mode:'full',dryRun:false,worker:randomUUID(),cutoff:now.toISOString()})).status,'busy');
  await db.query("update public.matchlatch_shopify_sync_jobs set lease_until=now()-interval '1 second' where id=$1",[first.id]);
  const successor=await store.claim({shop:STORE_DOMAIN,day:'other',mode:'full',dryRun:false,worker:randomUUID(),cutoff:now.toISOString()});
  await assert.rejects(store.commit({job:first.id,worker:first.worker,expectedCursor:null,nextCursor:null,done:true,rows:[],productIds:[]}),/lease_lost/);
  const before=await rows(),good=normalizeProduct(product(99)),bad={...normalizeProduct(product(98))[0],shop:'wrong-shop'};
  await assert.rejects(store.commit({job:successor.id,worker:successor.worker,expectedCursor:null,nextCursor:null,done:true,rows:[...good,bad],productIds:[product(99).id,product(98).id]}),/source_mismatch/);
  assert.deepEqual(await rows(),before);await store.fail({job:successor.id,worker:successor.worker});
 });
 await db.close();
});
