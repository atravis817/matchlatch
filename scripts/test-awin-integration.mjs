// MATCHLATCH POC-05: no-network Awin browse + retailer-handoff contract tests.
// Run with: node scripts/test-awin-integration.mjs
import assert from "node:assert/strict";
import {CANDIDATES,merchantLinkAllowed,joinedCandidate} from "../lib/awin-retailers.mjs";
import {mapFeedRow} from "./sync-awin-feeds.mjs";
import {mapProduct,searchAwin,verifyAwin,postgrestConfig} from "../lib/awin-public-catalog.mjs";

const candidate=CANDIDATES.find(x=>x.id===6016);
assert.equal(CANDIDATES.length,8);
assert.equal(joinedCandidate({id:6016,status:"Active",currencyCode:"USD",
 primaryRegion:{countryCode:"US"}},candidate),true);
// The Awin joined-programmes endpoint does NOT include deeplinkEnabled or linkStatus.
assert.equal(joinedCandidate({id:6016,status:"Inactive",currencyCode:"USD",
 primaryRegion:{countryCode:"US"}},candidate),false);
assert.equal(joinedCandidate({id:6016,status:"Active",currencyCode:"USD",
 primaryRegion:{countryCode:"GB"}},candidate),false);
assert.equal(joinedCandidate({id:6016,status:"Active",currencyCode:"EUR",
 primaryRegion:{countryCode:"US"}},candidate),false);
assert.equal(merchantLinkAllowed(candidate,"https://wconcept.com/shirt/123"),true);
assert.equal(merchantLinkAllowed(candidate,"https://wconcept.com.attacker.example/shirt"),false);

const joinedNow=CANDIDATES.filter(c=>[117849,126793].includes(c.id));
assert.equal(joinedNow.length,2);
assert.ok(joinedNow.some(c=>c.domains.includes("zazzmode.com")));
assert.ok(joinedNow.some(c=>c.domains.includes("caciopepebrand.com")));
const importTime=new Date().toISOString();
const feed={id:"SKU-M-OLIVE",title:"Olive Oxford Cotton Shirt",
 description:"Minimalist tailored cotton oxford shirt for work",
 product_type:"Clothing > Shirts",brand:"Example Label",
 link:"https://wconcept.com/products/olive-oxford",
 image_link:"https://images.example/olive.webp",
 price:"95.00 USD",sale_price:"75.00 USD",availability:"in_stock",
 size:"M",color:"Olive",material:"Cotton",
 aw_deep_link:"https://www.awin1.com/awclick.php?mid=6016&id=3118944",
 shipping:[{country:"US",price:"6.00 USD"}]};
// Enhanced Google-format JSONL may nest its price, category and
// availability sections; importing must support those, including shipping objects.
const enhanced={
 meta:{advertiser_id:126793,advertiser_name:"Cacio Pepe (US)"},
 product_basic:{id:"CAMISA-M-BLACK",title:"Organic Cotton Camisa Shirt",
  description:"Slim organic cotton menswear shirt",
  link:"https://www.caciopepebrand.com/products/organic-cotton-camisa-crew-black",
  image_link:"https://img.example.com/tee.webp"},
 product_category:{product_type:"Clothing > Shirts"},
 product_attributes:{color:"Black",size:"M",material:"Cotton"},
 price_and_availability:{price:"75.00 USD",availability:"in_stock"},
 shipping:{country:"US",price:"0.00 USD"}
};
const cacio=CANDIDATES.find(c=>c.id===126793);
const cacioRow=mapFeedRow(enhanced,cacio,importTime);
assert.equal(cacioRow?.source_variant_id,"CAMISA-M-BLACK:M:Black");
assert.equal(cacioRow?.price_usd,75);
assert.equal(cacioRow?.slot,"shirt");
assert.equal(cacioRow?.shipping_us_eligible,true);
assert.equal(cacioRow?.shipping_cost_usd,0);
assert.equal(mapFeedRow({...enhanced,shipping:{country:"US",region:"CA"}},cacio,importTime),null,
 "Regional shipping alone is not evidence of nationwide eligibility");
const normalized=mapFeedRow(feed,candidate,importTime);
assert.ok(normalized,"eligible US feed item should normalize");
assert.equal(normalized.advertiser_id,6016);
assert.equal(normalized.slot,"shirt");
assert.equal(normalized.price_usd,75);
assert.equal(normalized.original_price_usd,95);
assert.equal(normalized.is_public,false,"a feed import never directly publishes an offer");
assert.equal(normalized.shipping_us_eligible,true);
assert.equal(normalized.shipping_cost_usd,6);
assert.equal(mapFeedRow({...feed,link:"https://hostile.example/shirt"},candidate,importTime),null);
assert.equal(mapFeedRow({...feed,shipping:[]},candidate,importTime),null);

const exposed={...normalized,is_public:true};
const mapped=mapProduct(exposed);
assert.equal(mapped.source,"awin");
assert.equal(mapped.stockVerifiedLive,false);
assert.equal(mapped.checkoutUrl,"","Awin feed offers never invent native merchant checkout");
assert.equal(mapped.productId,"awin:6016:SKU-M-OLIVE");
assert.equal(mapped.affiliateTracked,true);
assert.ok(mapped.url.startsWith("https://www.awin1.com/"));
assert.equal(mapProduct({...exposed,is_public:false}),null,"unpublished offers must be hidden");
assert.equal(mapProduct({...exposed,available:false}),null);
assert.equal(mapProduct({...exposed,merchant_host:"fraud.example"}),null);
assert.equal(mapProduct({...exposed,valid_until:new Date(Date.now()-1000).toISOString()}),null);
assert.equal(mapProduct({...exposed,feed_imported_at:new Date(Date.now()-2*86400000).toISOString()}),null);
assert.equal(mapProduct({...exposed,affiliate_url:"https://untrusted.example/redirect"}).affiliateTracked,false);

const originalEnv={...process.env};
const originalFetch=globalThis.fetch;
try{
 process.env.MATCHLATCH_SUPABASE_URL="https://unittest.supabase.co";
 process.env.MATCHLATCH_SUPABASE_PUBLISHABLE_KEY="sb_publishable_UNIT_TEST_PUBLIC_ONLY";
 assert.ok(postgrestConfig());
 const seen=[];
 globalThis.fetch=async(url,options)=>{
  seen.push({url:String(url),options});
  return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify([exposed])};
 };
 const results=await searchAwin({slot:"shirt",q:"olive oxford cotton",max:100,size:"M",color:"Olive"});
 assert.equal(results.length,1);
 assert.ok(seen[0].url.includes("wfts"));
 assert.ok(seen[0].url.includes("is_public=eq.true"));
 assert.ok(seen[0].url.includes("size=ilike.M"));
 assert.equal(seen[0].options.headers.apikey,"sb_publishable_UNIT_TEST_PUBLIC_ONLY");
 assert.equal(seen[0].options.headers.authorization,undefined,"never use service-role auth to browse");
 const verified=await verifyAwin({id:mapped.productId,variant:mapped.variantId,max:100,size:"M",color:"Olive"});
 assert.equal(verified?.variantId,mapped.variantId);
 assert.equal(verified?.checkoutUrl,"");
 assert.equal(await verifyAwin({id:"awin:6016:unknown",variant:mapped.variantId,max:100}),null);
 globalThis.fetch=async()=>({ok:true,headers:{get:()=>null},text:async()=>JSON.stringify([])});
 assert.deepEqual(await searchAwin({slot:"shirt",q:"olive oxford",max:100}),[]);
 }finally{
  globalThis.fetch=originalFetch;
  process.env.MATCHLATCH_SUPABASE_URL=originalEnv.MATCHLATCH_SUPABASE_URL;
  process.env.MATCHLATCH_SUPABASE_PUBLISHABLE_KEY=originalEnv.MATCHLATCH_SUPABASE_PUBLISHABLE_KEY;
 }
console.log("POC-05 Awin registry, feed import, RLS catalog lookup and product handoff contract passed.");
