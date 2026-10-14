import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {acceptanceApproval,runAcceptance,ACCEPTANCE_PROJECT,ACCEPTANCE_SHOP} from '../lib/shopify-acceptance.mjs';
import {normalizeProduct,createShopifyReader} from '../lib/shopify-sync.mjs';
import {product,readerFor} from './shopify-sync-fixture.mjs';
const fixture=(products=[product()])=>({project:ACCEPTANCE_PROJECT,shop:ACCEPTANCE_SHOP,executionId:randomUUID(),commit:'a'.repeat(40),host:'matchlatch-fixture-matchlatch.vercel.app',privatePersistenceAuthorized:true,evidenceRef:'synthetic-evaluation-approval',expiresAt:new Date(Date.now()+3600000).toISOString(),products:products.map(p=>({productId:p.id,variantIds:p.variants.nodes.map(v=>v.id)}))});
const envFor=a=>({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/wo-ml-018a-nightly-shopify-sync',VERCEL_GIT_COMMIT_SHA:a.commit,VERCEL_URL:a.host,MATCHLATCH_SHOPIFY_ACCEPTANCE_ENABLED:'true',MATCHLATCH_SHOPIFY_PREVIEW_WRITES_ENABLED:'false',MATCHLATCH_SHOPIFY_PUBLICATION_ENABLED:'false',MATCHLATCH_SHOPIFY_PREVIEW_SCHEDULE_ENABLED:'false',SHOPIFY_STORE_DOMAIN:a.shop,MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL:`https://${ACCEPTANCE_PROJECT}.supabase.co`,MATCHLATCH_SHOPIFY_ACCEPTANCE_APPROVAL:JSON.stringify(a)});
test('server approval binds Preview branch, source, destination, exact build and disabled broad writes',()=>{
 const a=fixture(),env=envFor(a);assert.equal(acceptanceApproval(env).products.length,1);
 for(const patch of [{VERCEL_ENV:'production'},{VERCEL_GIT_COMMIT_REF:'main'},{VERCEL_GIT_COMMIT_SHA:'b'.repeat(40)},{VERCEL_URL:'other'},{SHOPIFY_STORE_DOMAIN:'other'},{MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL:'https://odxqxymwlwnbqginqems.supabase.co'},{MATCHLATCH_SHOPIFY_ACCEPTANCE_ENABLED:'false'},{MATCHLATCH_SHOPIFY_PREVIEW_WRITES_ENABLED:'true'},{MATCHLATCH_SHOPIFY_PUBLICATION_ENABLED:'true'},{MATCHLATCH_SHOPIFY_PREVIEW_SCHEDULE_ENABLED:'true'}])assert.throws(()=>acceptanceApproval({...env,...patch}));
 for(const bad of [{...a,products:Array.from({length:6},(_,i)=>({productId:`gid://shopify/Product/${i}`,variantIds:[`gid://shopify/ProductVariant/${i}`]}))},{...a,products:fixture([product(1,{variants:251})]).products},{...a,privatePersistenceAuthorized:false},{...a,expiresAt:'2020-01-01'},{...a,products:[a.products[0],a.products[0]]}])assert.throws(()=>acceptanceApproval(envFor(bad)));
});
test('one product page only; partial/overflow/mismatched provider page never reaches catalog commit',async()=>{
 for(const products of [[product(1,{variants:251})],[product(2)],[product(1),product(1)],[{...product(),variants:{...product().variants,pageInfo:{hasNextPage:true}}}]]){
  let claims=0,commits=0;const store={db:async(_,{body})=>{body.p_action==='claim'?claims++:commits++;}};
  await assert.rejects(runAcceptance({approval:fixture(),store,reader:readerFor(products)}),/review_required/);assert.equal(claims,1);assert.equal(commits,0);
 }
});
test('reader stops variant overflow before fetching another product page',async()=>{
 let reads=0;const p=product(1,{variants:251});const reader=createShopifyReader({env:{SHOPIFY_STORE_DOMAIN:ACCEPTANCE_SHOP,SHOPIFY_ADMIN_API_VERSION:'2026-10',SHOPIFY_ADMIN_READ_TOKEN:'synthetic'},fetcher:async()=>{reads++;return Response.json({data:{shop:{myshopifyDomain:ACCEPTANCE_SHOP,currencyCode:'USD'},products:{nodes:[p],pageInfo:{hasNextPage:false}}}},{headers:{'x-shopify-api-version':'2026-10'}});}});
 await assert.rejects(reader.page({mode:'full',acceptance:fixture().products}),/overflow/);assert.equal(reads,1);
});
test('durable SQL bounds, private defaults, atomicity and consumed-run fencing',{skip:!process.env.MATCHLATCH_PGLITE_MODULE},async t=>{
 const {PGlite}=await import(process.env.MATCHLATCH_PGLITE_MODULE);
 async function setup(){const db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');await db.exec(await readFile(new URL('../supabase/PROPOSED_shopify_sync.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../supabase/PROPOSED_shopify_acceptance.sql',import.meta.url),'utf8'));await db.exec('set role service_role');return db;}
 const rpc=(db,action,a,worker,rows=[])=>(db.query('select public.matchlatch_shopify_acceptance($1,$2::jsonb,$3::uuid,$4::jsonb) result',[action,JSON.stringify(a),worker,JSON.stringify(rows)]));
 await t.test('accept 5 products/250 variants once; no normal ledger/watermark/retirement/publication',async()=>{
  const db=await setup();try{const products=Array.from({length:5},(_,i)=>product(i+1,{variants:50})),a=fixture(products);const store={db:async(_,{body:b})=>(await rpc(db,b.p_action,b.p_manifest,b.p_worker,b.p_rows)).rows[0].result};
   const out=await runAcceptance({approval:a,store,reader:readerFor(products)});assert.equal(out.variants,250);assert.equal(out.fullSyncCompleted,false);
   const state=(await db.query("select count(*) n,count(*) filter(where is_public or approval<>'{}'::jsonb or retired) unsafe from public.matchlatch_shopify_products")).rows[0];assert.equal(state.n,250);assert.equal(state.unsafe,0);
   for(const table of ['sync_jobs','sync_state','sync_seen','publication_audit'])assert.equal((await db.query('select count(*) n from public.matchlatch_shopify_'+table)).rows[0].n,0);
   await assert.rejects(runAcceptance({approval:a,store,reader:readerFor(products)}),/consumed/);
   await assert.rejects(rpc(db,'claim',{...a,executionId:randomUUID()},randomUUID()),/consumed/);
  }finally{await db.close();}
 });
 await t.test('wrong binding, replay/concurrent claim and stale worker are denied',async()=>{
  const db=await setup();try{const a=fixture(),worker=randomUUID();await assert.rejects(rpc(db,'claim',{...a,project:'wrong'},worker),/binding/);await assert.rejects(rpc(db,'claim',{...a,shop:null},worker),/binding/);await rpc(db,'claim',a,worker);
   const settled=await Promise.allSettled([rpc(db,'claim',a,randomUUID()),rpc(db,'claim',a,randomUUID())]);assert.ok(settled.every(x=>x.status==='rejected'));
   await assert.rejects(rpc(db,'commit',a,randomUUID(),normalizeProduct(product())),/binding_mismatch/);
   await assert.rejects(rpc(db,'commit',{...a,manifestHash:'changed'},worker,normalizeProduct(product())),/binding_mismatch/);
   assert.equal((await db.query('select count(*) n from public.matchlatch_shopify_products')).rows[0].n,0);
  }finally{await db.close();}
 });
 await t.test('reject entire page on injected public row, manifest overflow, duplicate and invalid cast; no partial insert',async()=>{
  const db=await setup();try{const products=[product(1),product(2)],a=fixture(products),worker=randomUUID();await assert.rejects(rpc(db,'claim',fixture([product(1,{variants:251})]),worker),/cap/);await rpc(db,'claim',a,worker);
   const rows=products.flatMap(p=>normalizeProduct(p));for(const bad of [[rows[0],{...rows[1],is_public:true}],[rows[0],rows[0]],[rows[0],{...rows[1],price_usd:'invalid-number'}]]){await assert.rejects(rpc(db,'commit',a,worker,bad));assert.equal((await db.query('select count(*) n from public.matchlatch_shopify_products')).rows[0].n,0);}
   assert.equal((await db.query('select status from public.matchlatch_shopify_acceptance_ledger')).rows[0].status,'claimed');
  }finally{await db.close();}
 });
 await t.test('simultaneous first claims have one winner; changed baseline and expired lease fail closed',async()=>{
  const db=await setup();try{const a=fixture(),workers=[randomUUID(),randomUUID()];const results=await Promise.allSettled(workers.map(w=>rpc(db,'claim',a,w)));assert.equal(results.filter(x=>x.status==='fulfilled').length,1);const worker=workers[results.findIndex(x=>x.status==='fulfilled')];
   await db.exec("insert into public.matchlatch_shopify_sync_state(shop) values('pfcdgt-is.myshopify.com')");await assert.rejects(rpc(db,'commit',a,worker,normalizeProduct(product())),/baseline_changed/);await db.exec('reset role;delete from public.matchlatch_shopify_sync_state;set role service_role');
   await db.exec("update public.matchlatch_shopify_acceptance_ledger set lease_until=now()-interval '1 second'");await assert.rejects(rpc(db,'commit',a,worker,normalizeProduct(product())),/binding_mismatch/);assert.equal((await db.query('select count(*) n from public.matchlatch_shopify_products')).rows[0].n,0);
  }finally{await db.close();}
 });
 await t.test('source failure consumes run; permission denial; baseline contamination blocks commit',async()=>{
  const db=await setup();try{const a=fixture();const store={db:async(_,{body:b})=>(await rpc(db,b.p_action,b.p_manifest,b.p_worker,b.p_rows)).rows[0].result};await assert.rejects(runAcceptance({approval:a,store,reader:{page:async()=>{throw Error('synthetic-provider-failure');}}}),/consumed/);await assert.rejects(runAcceptance({approval:a,store,reader:readerFor([product()])}),/consumed/);
   for(const role of ['anon','authenticated']){await db.exec('reset role;set role '+role);await assert.rejects(db.query('select * from public.matchlatch_shopify_acceptance_ledger'),/permission denied/);await assert.rejects(rpc(db,'claim',a,randomUUID()),/permission denied/);}
  }finally{await db.close();}
 });
});

test('acceptance POST cannot bypass owner or Production gates',async()=>{
 const {POST}=await import('../lib/shopify-sync-route.mjs');const old=process.env.VERCEL_ENV;
 const request=()=>new Request('https://example.test/api/admin-summary?action=shopify-sync-acceptance',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:'{}'});
 try{process.env.VERCEL_ENV='production';assert.equal((await POST(request())).status,404);process.env.VERCEL_ENV='preview';const response=await POST(request());assert.ok([403,503].includes(response.status));assert.ok(!(await response.text()).includes('synthetic'));}finally{if(old===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=old;}
});
