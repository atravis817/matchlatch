import {catalog,collectShopify,discoverProducts,parseDiscoveryRequest,STUDIO_PERMISSIONS} from '../lib/shopify-discovery.mjs';
import {discoveryFixtureTransport} from '../lib/discovery-fixtures.mjs';
import {allowRequest} from '../lib/request-limits.mjs';
import {searchAwin,verifyAwin,postgrestConfig} from "../lib/awin-public-catalog.mjs";
import {evaluateDelivery} from "../lib/delivery-intelligence.mjs";
// MATCHLATCH Private Shop: live Shopify Global Catalog UCP interface.
// No server-side catalog-result caching. A listing is displayed only when a
// purchasable variant is explicitly reported available at a valid USD price.
const SLOTS=new Set(["hat","scarf","jacket","shirt","watch","belt","pants","socks","shoes"]);
const gid=/^gid:\/\/shopify\/(?:p\/[A-Za-z0-9_-]+|ProductVariant\/[A-Za-z0-9_-]+)$/;
const clip=(s,n)=>String(s??"").replace(/[\u0000-\u001f]/g," ").trim().slice(0,n);
const safeUrl=(s)=>{
  try{const u=new URL(s);return u.protocol==="https:"?u.href:"";}catch{return "";}
};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
});
const plainAmount=m=>m?.currency==="USD"&&Number.isSafeInteger(m?.amount)&&m.amount>=0?m.amount:null;
function collect(data,selectedSize="",selectedColor=""){
  const matches=[];
  const products=[...(Array.isArray(data?.products)?data.products:[]),...(data?.product?[data.product]:[])];
  for(const p of products){
    if(!p||!gid.test(p.id||""))continue;
    const media=(p.media||[]).find(x=>x?.type==="image"&&safeUrl(x.url));
    for(const v of (p.variants||[])){
      if(!gid.test(v?.id||"")||v.availability?.available!==true)continue;
      const cents=plainAmount(v.price);
      if(cents===null)continue;
      const opts=Array.isArray(v.options)?v.options:[];
      const sizeOpt=opts.find(o=>/^(size|shoe size|waist)$/i.test(o.name||""));
      const size=clip(sizeOpt?.label||"",36);
      if(selectedSize && size.toLowerCase()!==selectedSize.toLowerCase())continue;
      const colorOpt=opts.find(o=>/^(color|colour)$/i.test(o.name||""));
      const color=clip(colorOpt?.label||"",60);
      const normalizeColor=s=>String(s||"").toLowerCase().replace(/grey/g,"gray").replace(/[^a-z0-9]/g,"");
      if(selectedColor&&(!color||!normalizeColor(color).includes(normalizeColor(selectedColor))))continue;
      const seller=v.seller||p.seller||{};
      const merchant=clip(seller.name,90);
      const merchantLink=safeUrl(p.url)||safeUrl(v.url)||safeUrl(v.checkout_url);
      // Only expose merchant-owned links; never invent checkout destinations.
      if(!merchantLink)continue;
      matches.push({
        productId:p.id,variantId:v.id,
        title:clip(p.title,155),variant:clip(v.title,100),
        merchant:merchant||new URL(merchantLink).hostname,
        merchantId:clip(seller.id,120),merchantDomain:clip(seller.domain,180),
        image:media?safeUrl(media.url):"",
        imageAlt:clip(media?.alt_text||p.title,130),
        url:merchantLink,checkoutUrl:safeUrl(v.checkout_url),
        price:cents/100,currency:"USD",size,color,available:true,
        stockStatus:clip(v.availability?.status||"available",40),
        lowStock:v.availability?.running_low===true,
        requiresShipping:v.requires?.shipping===true,
        nativeCheckoutEligible:v.eligible?.native_checkout===true,
        shippingCost:null,deliveryEstimate:null,
        checkedAt:new Date().toISOString()
      });
    }
  }
  return matches;
}
export async function GET(request){
  try{
    const u=new URL(request.url);
    const mode=u.searchParams.get("mode")||"search";
    if(mode==='studio-demo'){
      if(process.env.VERCEL_ENV!=='preview')return reply({error:'Not found'},404);
      if(!allowRequest(request,'studio-demo',30))return reply({error:'Too many demonstration requests.'},429);
      if(u.searchParams.get('save')||u.searchParams.get('ai'))return reply({error:'Saving and model calls are disabled in the fictional demonstration.'},403);
      try{const intent=parseDiscoveryRequest(u.searchParams.get('q')||'',{max:u.searchParams.get('max')||200,size:u.searchParams.get('size')||'',sizeSystem:u.searchParams.get('sizeSystem')||'',color:u.searchParams.get('color')||'',allowMixed:u.searchParams.get('mixed')==='1',country:u.searchParams.get('country')||'US'});
       return reply({...await discoverProducts(intent,{transport:discoveryFixtureTransport,fixture:true}),permissions:STUDIO_PERMISSIONS});
      }catch{return reply({error:'Choose one product type, US destination, and a budget from $1 to $10,000.'},400);}
    }
    const max=Number(u.searchParams.get("max"));
    const size=clip(u.searchParams.get("size"),36);
    const color=clip(u.searchParams.get("color"),50);
    const region=clip(u.searchParams.get("region"),2).toUpperCase();
    const postal=clip(u.searchParams.get("postal"),10);
    const needBy=clip(u.searchParams.get("needBy"),10);
    const today=new Date().toISOString().slice(0,10);
    if(needBy&&(!/^\d{4}-\d{2}-\d{2}$/.test(needBy)||needBy<today||!/^\d{5}$/.test(postal)))return reply({error:"A current deadline and five-digit ZIP are required."},400);
    if((region&&!/^[A-Z]{2}$/.test(region))||(postal&&!/^\d{5}(?:-\d{4})?$/.test(postal)))
      return reply({error:"Invalid US shipping destination."},400);
    const destination={country:"US",...(region?{region}:{}),...(postal?{postal_code:postal}:{})};
    if(mode==="capabilities"){
      return reply({
        catalog:"Shopify Global Catalog + approved Awin feeds",
        access:"Shopify live catalog and approved, verified Awin merchant-feed snapshots; no website crawling",
        studioDiscovery:STUDIO_PERMISSIONS,
        studioDemoAvailable:process.env.VERCEL_ENV==='preview',
        retailerDirectoryAvailable:false,
        retailerNames:[],
        criteria:{
          categories:[...SLOTS],currency:"USD",
          size:"Variant size when supplied by retailer",
          color:"Exact normalized variant color when explicitly requested",
          price:"USD variant price at lookup",
          stock:"Reported availability at lookup, not reserved quantity",
          shipping:"Catalog filter for US destination; costs and delivery dates unknown",
          checkout:"Retailer-issued checkout URL when published; not universal"
        },
        merchantDirectoryNote:"Shopify merchant names come from live searches. Awin retailers appear only after verified membership, accessible feed and database publication.",
        webDiscovery:"Separate opt-in source-backed research; web results do not enter cart without a verified product listing."
      });
    }
    if(mode==="search"){
      const slot=clip(u.searchParams.get("slot"),20).toLowerCase();
      const q=clip(u.searchParams.get("q"),170);
      if(!SLOTS.has(slot)||q.length<2||!/^[A-Za-z0-9]/.test(q)||!Number.isFinite(max)||max<1||max>10000)
        return reply({error:"Invalid search criteria."},400);
      let discoveryIntent=null;
      if(process.env.VERCEL_ENV==='preview'){try{discoveryIntent=parseDiscoveryRequest(q,{max,size,color});}catch{return reply({error:'Choose one product type and valid exact constraints.'},400);}}
      const filters={available:true,ships_to:destination,condition:["new"],price:{max:discoveryIntent?.maxCents??Math.floor(max*100)}};
      const attributes=[];
      if(size)attributes.push({name:"Size",values:[size]});
      if(color)attributes.push({name:"Color",values:[color]});
      if(attributes.length)filters.attributes=attributes;
      const provider=[...await Promise.allSettled([
        catalog("search_catalog",{
          query:q+" "+slot,
          filters,context:{address_country:"US",...(region?{address_region:region}:{}),...(postal?{postal_code:postal}:{}),currency:"USD"},
          pagination:{limit:process.env.VERCEL_ENV==='preview'?10:32}
        }),
        // Reads only RLS-published, joined + verified + fresh Awin feed rows.
        // Awin feed downloads never run in a shopper's request.
        searchAwin({slot,q,max,size,color})
      ])];
      const shopify=provider[0].status==="fulfilled"?provider[0].value:null;
      const awin=provider[1].status==="fulfilled"?provider[1].value:[];
      if(!shopify&&!awin.length){
        if(process.env.VERCEL_ENV==="preview"){
          const reason=r=>r.status==="fulfilled"?"fulfilled_empty":/^CATALOG_[A-Z_0-9]+$/.test(r.reason?.message||"")?r.reason.message:["AbortError","TimeoutError"].includes(r.reason?.name)?r.reason.name:"PROVIDER_FAILURE";
          // Fixed categories only: never log requests, tokens, product rows or URLs.
          console.warn("MATCHLATCH provider status:",JSON.stringify({shopify:reason(provider[0]),awin:reason(provider[1])}));
        }
        throw new Error("CATALOG_ALL_PROVIDERS_UNAVAILABLE");
      }
      const byProduct=new Map();
      const normalized=shopify?(process.env.VERCEL_ENV==='preview'?collectShopify(shopify,{...discoveryIntent,legacySlot:slot}).items:collect(shopify,size,color)):[];
      for(const p of normalized){
        if(p.price<=max&&!byProduct.has(p.productId))byProduct.set(p.productId,p);
      }
      for(const item of awin){
        if(!byProduct.has(item.variantId))byProduct.set(item.variantId,item);
      }
      // The client performs user-first style ranking over both real providers.
      const inventory=[...byProduct.values()].slice(0,36);
      // Trusted provider response only: never promote caller-authored evidence.
      const evaluated=inventory.map(item=>({...item,
        delivery:evaluateDelivery(item,{zip:postal,needBy,today})}));
      const items=needBy?evaluated.filter(item=>item.delivery.tier==="retailer_confirmed"&&item.delivery.eligible):evaluated;
      const merchants=new Map();
      for(const item of items){
        const id=item.merchantId||item.merchantDomain||item.merchant;
        if(!merchants.has(id))merchants.set(id,{name:item.merchant,id:item.merchantId||null,
          domain:item.merchantDomain||null,listingCount:0});
        merchants.get(id).listingCount++;
      }
      return reply({items,source:awin.length?"Shopify Global Catalog + Awin feed":"Shopify Global Catalog",checkedAt:new Date().toISOString(),
        criteria:{slot,size:size||null,color:color||null,max,currency:"USD",shipsTo:destination,needBy:needBy||null},
        deliveryFilter:{active:Boolean(needBy),evaluated:inventory.length,qualifying:items.length,withheld:inventory.length-items.length,rule:"retailer evidence only"},
        retailerCoverage:{scope:"this search only",merchants:[...merchants.values()],count:merchants.size},
        verification:{price:"Shopify live price or Awin recent merchant feed snapshot",
          stock:"Shopify point-in-time or Awin published-feed availability; neither is reserved",
          shipping:"US destination filtered for Shopify; Awin requires US eligibility in feed",
          checkout:"Shopify retailer checkout URL if supplied; Awin retailer product-page handoff"},
        providers:{shopify:provider[0].status==="fulfilled",
          awinConfigured:provider[1].status==="fulfilled"&&Boolean(postgrestConfig()),
          awinListings:awin.length},
        note:"Matching is personalized before savings. Awin inventory is a merchant-feed snapshot, not guaranteed stock. Tax and final delivery rates are retailer-confirmed."});
    }
    if(mode==="verify"){
      if(process.env.VERCEL_ENV==="preview")return reply({error:"Purchases and retailer checkout handoffs are disabled during the usability beta.",code:"BETA_PURCHASES_DISABLED"},403);
      const id=clip(u.searchParams.get("id"),250);
      const variantId=clip(u.searchParams.get("variant"),250);
      if(id.startsWith("awin:")){
        if(!/^awin:[1-9][0-9]{0,9}:.{1,200}$/.test(id)||
          !/^awin:[1-9][0-9]{0,9}:.{1,200}$/.test(variantId)||
          !Number.isFinite(max)||max<1||max>10000)
          return reply({error:"Invalid Awin item reference."},400);
        const item=await verifyAwin({id,variant:variantId,max,size,color});
        if(!item)return reply({error:"Retailer feed no longer confirms this listing. Choose another item."},409);
        return reply({item,checkedAt:new Date().toISOString(),
          caveat:"Awin feed prices and stock are snapshots. Final availability, total and shipping are verified by the retailer."});
      }
      if(!gid.test(id)||!gid.test(variantId)||!Number.isFinite(max)||max<1||max>10000)
        return reply({error:"Invalid item verification request."},400);
      // The existing Shopify verification remains unchanged.
      const data=await catalog("get_product",{
        id,filters:{ships_to:destination,available:true},
        context:{address_country:"US",...(region?{address_region:region}:{}),...(postal?{postal_code:postal}:{})}
      });
      const item=(process.env.VERCEL_ENV==='preview'?collectShopify(data,{size,color,maxCents:Math.floor(max*100)}).items:collect(data,size,color)).find(x=>x.variantId===variantId&&x.price<=max);
      if(!item)return reply({error:"Item is no longer confirmed available in this size and budget. Choose another."},409);
      return reply({item,checkedAt:new Date().toISOString()});
    }
    return reply({error:"Unknown mode."},400);
  }catch(e){
    console.error("MATCHLATCH catalog lookup:",e?.message||"failed");
    return reply({error:"Live retailer catalog is temporarily unavailable. Try again later."},503);
  }
}
