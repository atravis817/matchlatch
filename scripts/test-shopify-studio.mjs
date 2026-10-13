import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectShopify,parseDiscoveryRequest,discoverProducts,catalog,validateRecommendationIds,STUDIO_PERMISSIONS} from '../lib/shopify-discovery.mjs';
import {discoveryFixtures,discoveryFixtureTransport} from '../lib/discovery-fixtures.mjs';
import {GET as shop} from '../api/shop.mjs';
import {POST as style} from '../api/style.mjs';
const fixture=()=>{const p=discoveryFixtures().products[0];p.variants=p.variants.slice(0,1);return p;};
const input=(p=fixture())=>({products:[p]});
test('six product types and trainers use the same deterministic discovery pipeline',async()=>{
 for(const [q,type] of [['black sneakers under $100','sneaker'],['black trainers under $100','sneaker'],['black jeans','jeans'],['black jacket','jacket'],['black boots','boot'],['black dress','dress'],['black watch','watch']]){
  let calls=0;const r=await discoverProducts(parseDiscoveryRequest(q),{fixture:true,transport:async(...args)=>{calls++;return discoveryFixtureTransport(...args);}});assert.equal(calls,1);assert.equal(r.items.length,1);assert.equal(r.items[0].classification.productType,type);assert.equal(r.items[0].fixture,true);assert.equal(r.items[0].source,'fixture');assert.equal(r.model,null);
 }
});
test('under is strict in cents, up-to inclusive, and explicit UI budget cannot relax request',()=>{
 assert.equal(parseDiscoveryRequest('sneakers under $100',{max:120}).maxCents,9999);assert.equal(parseDiscoveryRequest('sneakers up to $100',{max:120}).maxCents,10000);assert.equal(parseDiscoveryRequest('sneakers under $100',{max:50}).maxCents,5000);
 const p=fixture();p.variants[0].price.amount=10000;assert.equal(collectShopify(input(p),parseDiscoveryRequest('sneakers under $100')).items.length,0);assert.equal(collectShopify(input(p),parseDiscoveryRequest('sneakers up to $100')).items.length,1);
});
test('availability filter is not trusted; each variant must report available',()=>{
 const p=fixture();p.variants.push({...p.variants[0],id:'gid://shopify/ProductVariant/unavailable',availability:{available:false}});const n=collectShopify(input(p));assert.equal(n.items.length,1);assert.ok(n.diagnostics.find(d=>d.id.endsWith('unavailable')).reasons.includes('variant_unavailable'));
 p.variants[0].availability={};assert.equal(collectShopify(input(p)).items.length,0);
});
test('sizing preserves Numeric shoe size, waist/inseam units and size-system uncertainty',()=>{
 const shoe=collectShopify(input(),{size:'10',sizeSystem:'US'}).items[0];assert.equal(shoe.sizeLabel,'Numeric shoe size');assert.equal(shoe.sizeSystem,'US');assert.equal(shoe.sizeUnit,null);
 assert.equal(collectShopify(input(),{size:'10',sizeSystem:'EU'}).items.length,0);
 const jeans=collectShopify(input(discoveryFixtures().products[1]),{size:'32'}).items[0];assert.equal(jeans.sizeLabel,'Waist size');assert.equal(jeans.sizeUnit,'in');assert.ok(jeans.options.some(o=>o.name==='Inseam length'&&o.label==='30'&&o.unit==='in'));
 const p=fixture();delete p.variants[0].options[1].size_system;assert.equal(collectShopify(input(p),{size:'10',sizeSystem:'US'}).items.length,0);
});
test('solid black, mixed black and unknown color remain distinct; mixed matching requires opt-in',()=>{
 const p=fixture();assert.equal(collectShopify(input(p),{color:'black'}).items.length,1);
 p.variants[0].options[0].label='Black/Hot Pink';assert.equal(collectShopify(input(p),{color:'black'}).items.length,0);assert.equal(collectShopify(input(p),{color:'black',allowMixed:true}).items.length,1);
 p.variants[0].options[0].label='Midnight';const a=collectShopify(input(p)).items[0];assert.equal(a.colorEvidence.status,'unknown');assert.equal(collectShopify(input(p),{color:'black',allowMixed:true}).items.length,0);
});
test('watches cannot satisfy sneakers, shirts or dress requests',()=>{
 const p=discoveryFixtures().products[5];for(const q of ['black sneaker','black shirt','black dress'])assert.equal(collectShopify(input(p),parseDiscoveryRequest(q)).items.length,0);assert.equal(collectShopify(input(p),parseDiscoveryRequest('black watch')).items.length,1);
});
test('original variant links, options and inferred evidence survive without shipping or commission claims',()=>{
 const p=fixture(),original=structuredClone(p);p.url='https://example.invalid/parent';p.variants[0].options[0].inferred=true;const n=collectShopify(input(p)).items[0];assert.equal(n.url,p.variants[0].url);assert.match(n.url,/variant=fixture-sneaker&source=demo/);assert.equal(n.shippingUsEligible,false);assert.equal(n.shippingEvidence,null);assert.equal(n.affiliateTracked,false);assert.deepEqual(n.provenance.inferred,['Color']);assert.deepEqual(p.variants[0].price,original.variants[0].price);
});
test('invalid prices, unknown classifications and unsafe URLs are withheld',()=>{
 for(const price of [{amount:-1,currency:'USD'},{amount:12.5,currency:'USD'},{amount:100,currency:'EUR'}]){const p=fixture();p.variants[0].price=price;assert.equal(collectShopify(input(p)).items.length,0);}
 const p=fixture();p.variants[0].url='javascript:alert(1)';assert.equal(collectShopify(input(p)).items.length,0);p.variants[0].url='https://example.invalid/a';p.title='Mystery product';p.product_type='unknown';assert.equal(collectShopify(input(p)).items.length,0);
});
test('no-match diagnostics distinguish no source inventory from rejected variants',async()=>{
 const intent=parseDiscoveryRequest('black sneaker',{size:'99'});const r=await discoverProducts(intent,{transport:discoveryFixtureTransport,fixture:true});assert.equal(r.items.length,0);assert.equal(r.zeroReason,'no_variants_meet_exact_constraints');const empty=await discoverProducts(intent,{transport:async()=>({products:[]})});assert.equal(empty.zeroReason,'no_inventory_in_response');
});
test('bounded adapter makes one no-store search, caps ten products and denies order tools',async()=>{
 let calls=0;await catalog('search_catalog',{query:'sneaker',pagination:{limit:10}},{environment:'preview',fetcher:async(url,o)=>{calls++;assert.equal(o.cache,'no-store');assert.equal(o.redirect,'error');assert.equal(o.headers.Authorization,undefined);const b=JSON.parse(o.body);assert.equal(b.params.name,'search_catalog');return Response.json({result:{structuredContent:discoveryFixtures()}});}});assert.equal(calls,1);await assert.rejects(catalog('complete_checkout',{}),/CATALOG_TOOL_DENIED/);
 let seen;await discoverProducts(parseDiscoveryRequest('sneaker'),{transport:async(tool,args)=>{seen=args;return {products:[]};}});assert.equal(seen.pagination.limit,10);
});
test('recommendation IDs are limited to qualifying supplied variants, without duplicates',()=>{
 const items=collectShopify(input()).items;assert.deepEqual(validateRecommendationIds([items[0].id],items),items);for(const ids of [['fabricated'],[items[0].id,items[0].id],null])assert.throws(()=>validateRecommendationIds(ids,items));
});
test('demo is Preview-only and makes zero network, database or model requests for every role',async()=>{
 const env={...process.env},f=globalThis.fetch;let calls=0;process.env.VERCEL_ENV='preview';globalThis.fetch=async()=>{calls++;throw Error('External calls forbidden');};
 try{for(const role of ['guest','customer','owner']){const r=await shop(new Request('https://demo.test/api/shop?mode=studio-demo&q=black+sneaker+under+$100&max=200',{headers:{'x-forwarded-for':role,...(role!=='guest'?{authorization:'Bearer '+role}: {})}}));assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');const d=await r.json();assert.equal(d.items.length,1);assert.equal(d.permissions.liveDiscovery,false);assert.equal(d.model,null);assert.ok(d.items.every(p=>p.fixture));}
 assert.equal(calls,0);assert.equal((await shop(new Request('https://demo.test/api/shop?mode=studio-demo&q=watch&save=1'))).status,403);process.env.VERCEL_ENV='production';assert.equal((await shop(new Request('https://demo.test/api/shop?mode=studio-demo&q=watch'))).status,404);assert.equal(calls,0);
 }finally{process.env=env;globalThis.fetch=f;}
});
test('Studio rejects live Shopify and fixture model/save attempts before catalog/quota/model calls',async()=>{
 const env={...process.env},f=globalThis.fetch;Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'});let calls=0;
 try{globalThis.fetch=async url=>{calls++;if(String(url).endsWith('/auth/v1/user'))return Response.json({id:'fixture-customer',email_confirmed_at:'2026-10-11'});throw Error('Unauthorized external call');};
 for(const source of ['shopify','fixture']){const r=await style(new Request('https://demo.test/api/style',{method:'POST',headers:{authorization:'Bearer '+'a'.repeat(60),'x-forwarded-for':source},body:JSON.stringify({source,query:'black sneaker',consent:true,ai:true,save:true,candidates:discoveryFixtures()})}));assert.equal(r.status,403);const d=await r.json();assert.equal(d.aiSkipped,'permission_unverified');assert.equal(d.model,null);}
 assert.equal(calls,2);assert.equal(STUDIO_PERMISSIONS.commercialDisplay,'unverified');
 }finally{process.env=env;globalThis.fetch=f;}
});
test('ambiguous requests and unsupported destinations fail without fabricated conversions',()=>{
 assert.throws(()=>parseDiscoveryRequest('sneaker and watch'));assert.throws(()=>parseDiscoveryRequest('sneaker',{country:'GB'}));assert.throws(()=>parseDiscoveryRequest('sneaker',{max:Infinity}));
});
test('existing Store adapter enforces subtype, category, numeric size, solid color and strict budget before returning cards',async()=>{
 const env={...process.env},f=globalThis.fetch;process.env.VERCEL_ENV='preview';delete process.env.MATCHLATCH_SUPABASE_URL;delete process.env.SUPABASE_URL;let calls=0;
 try{globalThis.fetch=async(url,o)=>{calls++;assert.equal(String(url),'https://catalog.shopify.com/api/ucp/mcp');const b=JSON.parse(o.body);assert.equal(b.params.arguments.catalog.pagination.limit,10);assert.equal(b.params.arguments.catalog.filters.price.max,9999);return Response.json({result:{structuredContent:discoveryFixtures()}});};
 const r=await shop(new Request('https://demo.test/api/shop?mode=search&slot=shoes&q=black+sneakers+under+$100&max=120&size=10&color=black'));assert.equal(r.status,200);const d=await r.json();assert.equal(d.items.length,1);assert.equal(d.items[0].sizeLabel,'Numeric shoe size');assert.equal(d.items[0].colorEvidence.exactSolid,true);assert.equal(calls,1);
 }finally{process.env=env;globalThis.fetch=f;}
});
test('a category-only shirt filter cannot accept a watch with a matching color',()=>{const p=discoveryFixtures().products[5];assert.equal(collectShopify(input(p),{color:'black',legacySlot:'shirt'}).items.length,0);});
test('query-supplied US sizing and conflicting destination/color are parsed conservatively',()=>{const i=parseDiscoveryRequest('black sneakers US size 10 under $100');assert.equal(i.size,'10');assert.equal(i.sizeSystem,'US');assert.throws(()=>parseDiscoveryRequest('black sneakers ship to Canada'));assert.throws(()=>parseDiscoveryRequest('black white sneakers'));});
test('upstream rate limits and timeouts do not retry or leak response payloads',async()=>{
 let calls=0;await assert.rejects(catalog('search_catalog',{}, {fetcher:async()=>{calls++;return new Response('sensitive',{status:429});}}),e=>e.message==='CATALOG_HTTP_429');assert.equal(calls,1);
 calls=0;await assert.rejects(catalog('get_product',{}, {fetcher:async()=>{calls++;throw new DOMException('timed out','AbortError');}}),e=>e.name==='AbortError');assert.equal(calls,1);
});
