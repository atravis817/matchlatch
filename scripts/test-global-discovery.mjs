import test from 'node:test';
import assert from 'node:assert/strict';
import {boundedGlobalDiscovery,globalDiscoveryPolicy,DISCOVERY_CATEGORIES} from '../lib/global-discovery.mjs';
import {discoveryFixtures} from '../lib/discovery-fixtures.mjs';
import {GET} from '../api/shop.mjs';
const profile='https://matchlatch.company/ucp-agent.json';
test('new discovery is Preview-only, disabled by default and needs owned profile plus display evidence',()=>{
 const e={VERCEL_ENV:'preview',MATCHLATCH_GLOBAL_DISCOVERY_ENABLED:'true',MATCHLATCH_GLOBAL_CATALOG_PROFILE_URL:profile,MATCHLATCH_GLOBAL_CATALOG_DISPLAY_EVIDENCE:'reviewed-evidence-reference'};
 assert.equal(globalDiscoveryPolicy(e).enabled,true);
 for(const delta of [{VERCEL_ENV:'production'},{MATCHLATCH_GLOBAL_DISCOVERY_ENABLED:''},{MATCHLATCH_GLOBAL_CATALOG_DISPLAY_EVIDENCE:''},{MATCHLATCH_GLOBAL_CATALOG_PROFILE_URL:'https://shopify.dev/example.json'},{MATCHLATCH_GLOBAL_CATALOG_PROFILE_URL:profile+'?key=sensitive'}])assert.equal(globalDiscoveryPolicy({...e,...delta}).enabled,false);
 assert.equal(globalDiscoveryPolicy({}).enabled,false);assert.equal(globalDiscoveryPolicy(e).aiProcessing,false);assert.equal(globalDiscoveryPolicy(e).publicEnabled,false);
});
test('all nine categories classify independently with bounded calls and no checkout claims',async()=>{
 const titles={hat:'Cotton hat',scarf:'Cotton scarf',jacket:'Denim jacket',shirt:'Cotton shirt',watch:'Steel watch',belt:'Leather belt',pants:'Denim jeans',socks:'Cotton socks',shoes:'Black sneakers'};
 for(const slot of DISCOVERY_CATEGORIES){let calls=0;const p=discoveryFixtures().products[0];p.title=titles[slot];p.product_type=slot==='pants'?'jeans':slot==='shoes'?'sneakers':slot;p.variants=p.variants.slice(0,1);
 const result=await boundedGlobalDiscovery({query:'minimal everyday',max:100,categories:[slot]},{profileUrl:profile,transport:async(tool,args,options)=>{calls++;assert.equal(tool,'search_catalog');assert.equal(options.profileUrl,profile);assert.equal(args.pagination.limit,10);return {products:[p,p]};}});
 assert.equal(calls,1);assert.equal(result.items.length,1,slot);assert.equal(result.items[0].slot,slot);assert.equal(result.items[0].checkoutUrl,'');assert.equal(result.items[0].nativeCheckoutEligible,false);assert.equal(result.aiProcessing,false);assert.equal(result.model,null);
 }
});
test('multi-category sweeps cap concurrency at two, preserve slots and report partial provider failure',async()=>{
 let active=0,peak=0,calls=0;
 const result=await boundedGlobalDiscovery({query:'minimal everyday',max:100,categories:['shoes','pants','watch']},{transport:async(tool,args)=>{calls++;active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,5));active--;if(args.query.endsWith('watch'))throw Error('private provider details');return discoveryFixtures();}});
 assert.equal(calls,3);assert.equal(peak,2);assert.equal(result.partial,true);assert.equal(result.providerSucceeded,true);assert.ok(result.items.every(p=>['shoes','pants'].includes(p.slot)));assert.ok(!JSON.stringify(result).includes('private provider details'));
});
test('explicit strict budget, size and solid color survive normalization',async()=>{
 const r=await boundedGlobalDiscovery({query:'black sneakers under $80 US size 10',max:150,categories:['shoes']},{transport:async()=>discoveryFixtures()});
 assert.equal(r.items.length,1);assert.equal(r.items[0].price,79);assert.equal(r.items[0].size,'10');assert.equal(r.items[0].sizeSystem,'US');assert.equal(r.items[0].colorEvidence.exactSolid,true);
 const empty=await boundedGlobalDiscovery({query:'black sneakers under $79',max:150,categories:['shoes']},{transport:async()=>discoveryFixtures()});assert.equal(empty.items.length,0);
});
test('malformed categories and contradictory requests fail before provider calls; all provider failures are explicit',async()=>{
 let calls=0;const transport=async()=>{calls++;throw Error('SECRET_PROVIDER_BODY');};
 for(const delta of [{categories:DISCOVERY_CATEGORIES},{categories:['shirt','shirt']},{categories:['unknown']},{max:Infinity},{query:'sneakers ship to Canada'},{query:'black white sneakers'}])await assert.rejects(boundedGlobalDiscovery({query:'everyday',max:100,categories:['shirt'],...delta},{transport}));
 assert.equal(calls,0);const r=await boundedGlobalDiscovery({query:'everyday',max:100,categories:['shirt']},{transport});assert.equal(calls,1);assert.equal(r.providerSucceeded,false);assert.equal(r.items.length,0);assert.ok(!JSON.stringify(r).includes('SECRET'));
});
test('owner gate rejects guests, customers, unconfirmed owners and disabled configuration without catalog calls',async()=>{
 const saved={...process.env},originalFetch=globalThis.fetch,owner='11111111-1111-4111-8111-111111111111';let catalogCalls=0,user={id:owner,email_confirmed_at:'2026-10-13',is_anonymous:false};
 try{Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_ADMIN_USER_ID:owner,MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'});delete process.env.MATCHLATCH_GLOBAL_DISCOVERY_ENABLED;
 globalThis.fetch=async url=>{if(String(url).endsWith('/auth/v1/user'))return Response.json(user);catalogCalls++;throw Error('Live catalog calls forbidden');};
 const request=(auth=true)=>new Request('https://fixture.test/api/shop?mode=discover&q=everyday&max=100&categories=shirt',{headers:auth?{authorization:'Bearer '+'a'.repeat(60)}:{}});
 assert.equal((await GET(request(false))).status,403);user.id='22222222-2222-4222-8222-222222222222';assert.equal((await GET(request())).status,403);user.id=owner;user.email_confirmed_at=null;assert.equal((await GET(request())).status,403);user.email_confirmed_at='2026-10-13';assert.equal((await GET(request())).status,403);process.env.VERCEL_ENV='production';assert.equal((await GET(request())).status,404);assert.equal(catalogCalls,0);
 }finally{process.env=saved;globalThis.fetch=originalFetch;}
});
