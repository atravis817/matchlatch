import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {intentFromText,rankCandidates,normalizeSearch} from '../lib/styling-engine.mjs';
import {retrieveCatalog,mapCatalog} from '../lib/catalog-server.mjs';
import {POST} from '../api/style.mjs';
import {GET} from '../api/catalog.mjs';
const row={advertiser_id:116479,source_variant_id:'fixture',source_product_id:'fixture',slot:'watch',title:'Fictional Black Watch',description:'Watch fixture, not real inventory',brand:'Fixture',color:'',size:'',fit:'',material:'',image_url:'https://watchesofusa.com/fixture.jpg',product_url:'https://watchesofusa.com/products/fixture',affiliate_url:'https://www.awin1.com/pclick.php?p=1&a=3118944&m=116479&ued=https%3A%2F%2Fwatchesofusa.com%2Fproducts%2Ffixture',merchant_host:'watchesofusa.com',merchant_name:'Fictional test retailer',price_usd:100,currency:'USD',available:true,stock_status:'available',is_public:false,shipping_us_eligible:false,feed_imported_at:new Date().toISOString(),valid_until:new Date(Date.now()+3600000).toISOString(),source_updated_at:new Date().toISOString()};
test('singular/plural footwear synonyms, Unicode and grey normalize without relaxing exclusions',()=>{
 for(const q of ['black sneaker','BLACK SNEAKERS','black trainers','black tennis shoes']){const i=intentFromText(q);assert.equal(i.query,'black sneaker');assert.deepEqual(i.slots,['shoes']);assert.deepEqual(i.colors,['black']);}
 assert.equal(normalizeSearch('ＧＲＥＹ trainers'),'gray sneaker');assert.deepEqual(intentFromText('black timepieces').slots,['watch']);assert.deepEqual(intentFromText('no trainers black watch').slots,['watch']);
});
test('sneaker subtype cannot match boots or watches; legacy watch shirts are withheld',()=>{
 const watch=mapCatalog(row,{privateInventory:true});const sneaker={...watch,id:'fixture-sneaker',title:'Fictional black trainers',description:'Synthetic sneaker fixture',slot:'shoes'};
 assert.deepEqual(rankCandidates([watch,{...watch,slot:'shirt'},sneaker,{...sneaker,id:'boot',title:'Black boots',description:'Boot fixture'}],intentFromText('black sneaker')).map(p=>p.id),['fixture-sneaker']);
 assert.equal(rankCandidates([{...watch,slot:'shirt'}],intentFromText('black shirt')).length,0);
 assert.equal(rankCandidates([watch],intentFromText('black watch')).length,1);
 assert.equal(rankCandidates([watch],intentFromText('black watch',{size:'M'})).length,0);
});
test('public color/type filters run before page cap, retain visibility/US gates and reject injected vocabulary',async()=>{
 const env={...process.env},f=globalThis.fetch;Object.assign(process.env,{MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'});
 try{globalThis.fetch=async url=>{const p=new URL(url).searchParams;assert.equal(p.get('is_public'),'eq.true');assert.equal(p.get('shipping_us_eligible'),'eq.true');assert.equal(p.get('slot'),'eq.shoes');assert.equal(p.get('limit'),'60');assert.match(p.get('and'),/title.ilike.\*black\*/);assert.match(p.get('and'),/title.ilike.\*trainer\*/);assert.ok(!p.get('and').includes('injected'));return Response.json([]);};assert.deepEqual(await retrieveCatalog({slot:'shoes',colors:['black','injected)'],productType:'sneaker'}),[]);}finally{process.env=env;globalThis.fetch=f;}
});
test('black sneaker and present-type black watch both return honest public empty states with zero AI/quota calls',async()=>{
 const env={...process.env},f=globalThis.fetch;Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',MATCHLATCH_PREVIEW_OPENAI_API_KEY:'fixture-not-a-secret'});
 try{for(const q of ['black sneaker','black watch']){const calls=[];globalThis.fetch=async url=>{calls.push(String(url));if(String(url).endsWith('/auth/v1/user'))return Response.json({id:'fixture-user'});if(String(url).includes('/matchlatch_awin_products?'))return Response.json([]);throw Error('Unexpected model, quota or retailer call');};const r=await POST(new Request('https://fixture.test/api/style',{method:'POST',headers:{authorization:'Bearer '+'z'.repeat(60),'x-forwarded-for':q},body:JSON.stringify({query:q,consent:true,ai:true})}));assert.equal(r.status,200);const d=await r.json();assert.equal(d.aiSkipped,'no_eligible_catalog');assert.equal(d.model,null);assert.equal(d.retailerSearchIncluded,false);assert.equal(d.noMatchReason,'no_eligible_catalog_matches');assert.match(d.message,/participating retailer search in Store/);assert.equal(calls.length,2);assert.equal(d.products.length,0);}}finally{process.env=env;globalThis.fetch=f;}
});
test('owner UUID alone does not grant real private catalog; authorized staff can test fixture watches without publication',async()=>{
 const env={...process.env},f=globalThis.fetch;Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',MATCHLATCH_ADMIN_USER_ID:'00000000-0000-4000-8000-000000000001'});
 try{let staff=false;globalThis.fetch=async(url,opts)=>{if(String(url).endsWith('/auth/v1/user'))return Response.json({id:process.env.MATCHLATCH_ADMIN_USER_ID,email_confirmed_at:'2026-10-11'});if(String(url).includes('/matchlatch_catalog_staff?'))return Response.json(staff?[{role:'catalog'}]:[]);if(String(url).endsWith('/rpc/matchlatch_staff_catalog_search')){assert.equal(opts.method,'POST');return Response.json([row]);}throw Error('Unexpected external call');};const req=q=>new Request('https://fixture.test/api/catalog?private=1&q='+encodeURIComponent(q),{headers:{authorization:'Bearer '+'a'.repeat(60)}});assert.equal((await GET(req('black watch'))).status,403);staff=true;const d=await(await GET(req('black watch'))).json();assert.equal(d.items.length,1);assert.equal(d.items[0].private,true);assert.equal(d.items[0].shippingUsEligible,false);assert.equal((await(await GET(req('black sneaker'))).json()).items.length,0);assert.equal(row.is_public,false);}finally{process.env=env;globalThis.fetch=f;}
});
test('Studio offers an explicit user-driven retailer handoff, not hidden AI/provider fallback',()=>{
 const studio=readFileSync(new URL('../catalog-experience.js',import.meta.url),'utf8'),shell=readFileSync(new URL('../app-shell.js',import.meta.url),'utf8');assert.match(studio,/We’ll look for available products that fit your request/);assert.ok(!studio.includes('Search this request in Store'));assert.match(studio,/Find my outfit/);assert.match(shell,/matchlatch:retailer-search/);assert.match(shell,/storeState.provider="unified"/);assert.match(shell,/storeState.exactSize=String\(d.size/);
});
