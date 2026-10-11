import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GET as catalog} from '../api/catalog.mjs';
import {GET as admin} from '../api/admin-summary.mjs';
import {mapCatalog} from '../lib/catalog-server.mjs';
const owner='dacbe970-070d-4eb3-ad48-31c424bc6bc0';
test('catalog capability distinguishes configured AI from verified connection and eligible coverage',async()=>{
 const env={...process.env},f=globalThis.fetch;Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',MATCHLATCH_PREVIEW_OPENAI_API_KEY:'fixture-never-used'});
 try{let calls=0;globalThis.fetch=async(url,opts)=>{calls++;assert.ok(String(url).includes('is_public=eq.true'));assert.ok(!JSON.stringify(opts).includes('fixture-never-used'));return Response.json([]);};
 const r=await catalog(new Request('https://fixture.test/api/catalog?mode=capabilities'));assert.equal(r.status,200);assert.deepEqual(await r.json(),{staff:false,aiReady:true,aiConfigured:true,aiConnectionVerified:false,catalogAvailable:false,catalogStatus:'empty'});assert.equal(calls,1);
 const deadline=await catalog(new Request('https://fixture.test/api/catalog?needBy=2026-10-17'));assert.deepEqual((await deadline.json()).items,[]);assert.equal(calls,1);
 globalThis.fetch=async()=>{throw Error('Catalog unavailable');};assert.equal((await catalog(new Request('https://fixture.test/api/catalog?mode=capabilities'))).status,503);
 }finally{process.env=env;globalThis.fetch=f;}
});
test('private fictional fixtures require existing verified owner UUID; guests and customers cannot retrieve them',async()=>{
 const env={...process.env},f=globalThis.fetch;Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_ADMIN_USER_ID:owner,MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',SUPABASE_SERVICE_ROLE_KEY:'fixture-must-not-use'});
 try{let user={id:owner,email_confirmed_at:'2026-10-11'},calls=0;globalThis.fetch=async(url,opts)=>{calls++;assert.ok(String(url).endsWith('/auth/v1/user'));assert.ok(!JSON.stringify(opts).includes('fixture-must-not-use'));return Response.json(user);};
 const req=()=>new Request('https://fixture.test/api/admin-summary?fixtures=1',{headers:{authorization:'Bearer '+'a'.repeat(60)}});
 assert.equal((await admin(new Request('https://fixture.test/api/admin-summary?fixtures=1'))).status,403);assert.equal(calls,0);
 user={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email:'admin@matchlatch.company',email_confirmed_at:'2026-10-11'};assert.equal((await admin(req())).status,403);
 user={id:owner,email_confirmed_at:null};assert.equal((await admin(req())).status,403);
 user={id:owner,email_confirmed_at:'2026-10-11'};const good=await admin(req());assert.equal(good.status,200);const d=await good.json();assert.equal(d.fixture,true);assert.match(d.label,/fictional/);assert.equal(d.items.length,2);assert.ok(d.items.every(p=>p.fixture===true&&!p.url&&!p.productId));
 process.env.VERCEL_ENV='production';const before=calls;assert.equal((await admin(req())).status,404);assert.equal(calls,before);
 }finally{process.env=env;globalThis.fetch=f;}
});
test('old and proposed catalog schemas preserve public visibility and freshness eligibility',()=>{
 const row={advertiser_id:116479,source_variant_id:'fixture',source_product_id:'fixture',currency:'USD',available:true,is_public:true,shipping_us_eligible:true,valid_until:new Date(Date.now()+3600000).toISOString(),feed_imported_at:new Date().toISOString(),slot:'watch',title:'Fixture watch',price_usd:50,image_url:'https://example.test/image',product_url:'https://watchesofusa.com/product',merchant_host:'watchesofusa.com',affiliate_url:'https://www.awin1.com/pclick.php?a=3118944&m=116479'};
 assert.deepEqual(mapCatalog(row),mapCatalog({...row,source_checked_at:null,content_hash:null,content_changed_at:null}));
 assert.equal(mapCatalog({...row,is_public:false}),null);assert.equal(mapCatalog({...row,shipping_us_eligible:false}),null);
 assert.equal(mapCatalog({...row,valid_until:'2000-01-01',source_checked_at:new Date().toISOString()}),null);
});
test('one Store search, Studio-first entry, account-change clearing, and fixture saving protection are wired into actual UI assets',()=>{
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8'),shell=readFileSync(new URL('../app-shell.js',import.meta.url),'utf8'),studio=readFileSync(new URL('../catalog-experience.js',import.meta.url),'utf8');
 assert.ok(!index.includes('id="catalog-browse"'));assert.ok(!studio.includes("mount(document.getElementById('catalog-browse')"));
 assert.ok(index.indexOf('id="catalog-studio"')<index.indexOf('id="studio-workspace"'));
 assert.match(shell,/budget.step="0.01"/);assert.match(studio,/max.n.step='0.01'/);assert.match(shell,/preferredSize=exactSize.value.trim\(\)\|\|storeSizeFor/);assert.match(shell,/storeState.provider=provider.value/);assert.match(shell,/Product source/);assert.match(shell,/Exact size/);assert.match(shell,/Sort products/);assert.match(shell,/nextAccountId===storeAccountId/);assert.match(shell,/searchId\+\+;controller\?\.abort/);assert.match(shell,/if\(!item.fixture\)actions.append\(button\("Add to shortlist"/);
 const flow=readFileSync(new URL('../flow-pages.css',import.meta.url),'utf8');assert.match(flow,/> :not\(#studio-workspace\):not\(#catalog-studio\)/);assert.match(studio,/MatchlatchStudioFlow\?\.open\('home'\)/);assert.ok(!studio.includes("?'Ready.'"));assert.match(studio,/if\(ticket!==generation\)return/);
});
test('Preview provider diagnostics expose only fixed categories, never request or credential values',async()=>{
 const {GET:shop}=await import('../api/shop.mjs');const env={...process.env},f=globalThis.fetch,warn=console.warn,error=console.error;const logs=[];
 Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'});
 try{console.warn=(...args)=>logs.push(args);console.error=()=>{};globalThis.fetch=async url=>String(url).includes('catalog.shopify.com')?new Response('secret body must never be logged',{status:403}):Response.json([]);
 const request=new Request('https://fixture.test/api/shop?mode=search&slot=shoes&q=private-request-text&max=120');assert.equal((await shop(request)).status,503);assert.deepEqual(JSON.parse(logs[0][1]),{shopify:'CATALOG_HTTP_403',awin:'fulfilled_empty'});assert.ok(!JSON.stringify(logs).includes('private-request-text'));assert.ok(!JSON.stringify(logs).includes('secret body'));
 globalThis.fetch=async url=>{if(String(url).includes('catalog.shopify.com'))throw Error('sensitive payload must never be logged');return Response.json([]);};await shop(request);assert.equal(JSON.parse(logs[1][1]).shopify,'PROVIDER_FAILURE');assert.ok(!JSON.stringify(logs).includes('sensitive payload'));
 process.env.VERCEL_ENV='production';const before=logs.length;await shop(request);assert.equal(logs.length,before);
 }finally{process.env=env;globalThis.fetch=f;console.warn=warn;console.error=error;}
});
