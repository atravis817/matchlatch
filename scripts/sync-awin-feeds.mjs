// MATCHLATCH private Awin Enhanced feed importer. Never invoked by shoppers.
// Requires AWIN_API_TOKEN, AWIN_PUBLISHER_ID, MATCHLATCH_SUPABASE_URL,
// MATCHLATCH_SUPABASE_SERVICE_ROLE_KEY. Default: private staging only.
import {CANDIDATES,merchantLinkAllowed,joinedCandidate} from "../lib/awin-retailers.mjs";
import {normalizeAwinProduct} from "../lib/awin-feed-normalize.mjs";
const now=()=>new Date().toISOString();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function slotFor(item){
 const t=(item.productType+" "+item.title).toLowerCase();
 const rules=[
 ["shoes",/\b(shoes?|sneakers?|boots?|loafers?|heels?|footwear|trainers?)\b/],
 ["jacket",/\b(jackets?|coats?|blazers?|outerwear)\b/],
 ["pants",/\b(pants|trousers?|jeans|skirts?|shorts?|leggings?)\b/],
 ["shirt",/\b(shirts?|tops?|blouses?|sweaters?|hoodies?|polos?|t-shirts?|cardigans?)\b/],
 ["hat",/\b(hats?|caps?|beanies?)\b/],["scarf",/\b(scarves|scarf)\b/],
 ["watch",/\b(watches|watch)\b/],["belt",/\b(belts?)\b/],["socks",/\b(socks?)\b/]
 ];
 return rules.find(([,r])=>r.test(t))?.[0]||"";
}
function mapFeedRow(row,candidate,at){
 const enriched={...row,meta:{...row.meta,advertiser_id:candidate.id,advertiser_name:candidate.name}};
 const p=normalizeAwinProduct(enriched,{joinedAdvertiserIds:[candidate.id],importedAt:at});
 if(!p?.available||!merchantLinkAllowed(candidate,p.url)
    ||p.shippingEligibility!=="US listed")return null;
 const slot=slotFor(p),prefix="awin:"+candidate.id+":";
 if(!candidate.slots.includes(slot))return null;
 const pid=p.productId.slice(prefix.length),vid=p.variantId.slice(prefix.length);
 if(!pid||!vid||vid.length>200)return null;
 const raw={...(row.product_basic||{}),...row};
 return {
  advertiser_id:candidate.id,source_product_id:pid,source_variant_id:vid,
  slot,title:p.title,description:p.description,brand:p.brand,material:p.material,
  fit:String(raw.fit||"").slice(0,70),size:p.size,color:p.color,
  image_url:p.image,product_url:p.url,
  affiliate_url:(()=>{
    try{
      const host=new URL(p.affiliateUrl).hostname.toLowerCase();
      return host==="awin1.com"||host.endsWith(".awin1.com")||
        host==="awin2.com"||host.endsWith(".awin2.com")
        ?p.affiliateUrl:"";
    }catch{return "";}
  })(),
  merchant_name:candidate.name,merchant_host:new URL(p.url).hostname.toLowerCase().replace(/^www\./,""),
  price_usd:p.price,original_price_usd:p.originalPrice||null,currency:"USD",
  available:true,stock_status:p.stockStatus,shipping_us_eligible:true,
  shipping_cost_usd:p.shippingCost??null,feed_imported_at:at,
  valid_until:new Date(Date.parse(at)+23*3600000).toISOString(),is_public:false
 };
}
async function request(url,options={},maxBytes=15*1024*1024){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
 try{
  const r=await fetch(url,{...options,signal:controller.signal,redirect:"error",cache:"no-store"});
  if(!r.ok)throw Error("Provider HTTP "+r.status);
  if(Number(r.headers.get("content-length")||0)>maxBytes)throw Error("Response too large");
  const text=await r.text();
  if(text.length>maxBytes)throw Error("Response too large");
  return text;
 }finally{clearTimeout(timer);}
}
async function sync(){
 const token=String(process.env.AWIN_API_TOKEN||"");
 const pid=String(process.env.AWIN_PUBLISHER_ID||"");
 const base=String(process.env.MATCHLATCH_SUPABASE_URL||"").replace(/\/$/,"");
 const key=String(process.env.MATCHLATCH_SUPABASE_SERVICE_ROLE_KEY||"");
 if(!token||!key||!/^[1-9]\d{0,17}$/.test(pid)
    ||!/^https:\/\/[-a-z0-9]+\.supabase\.co$/.test(base))
  throw Error("Missing publisher token or privileged database sync configuration");
 const ah={authorization:"Bearer "+token,accept:"application/json"};
 const dh={apikey:key,authorization:"Bearer "+key,"content-type":"application/json"};
 const db=async(path,method,body,prefer)=>{
  await request(base+"/rest/v1/"+path,{
    method,headers:{...dh,...(prefer?{prefer}:{})},
    body:body===undefined?undefined:JSON.stringify(body)
  });
 };
 const update=(id,data)=>db("matchlatch_awin_partners?advertiser_id=eq."+id,
  "PATCH",{...data,updated_at:now()},"return=minimal");
 const joinedRaw=await request("https://api.awin.com/publishers/"+pid+"/programmes?relationship=joined",
  {headers:ah});
 const programmes=JSON.parse(joinedRaw);
 if(!Array.isArray(programmes))throw Error("Awin joined-programme response invalid");
 const joined=new Map(programmes.map(x=>[Number(x.id),x]));
 const activate=process.env.AWIN_PUBLISH_APPROVED==="1",result=[];
 let downloads=0;
 for(const candidate of CANDIDATES){
  if(!joinedCandidate(joined.get(candidate.id),candidate)){
   await update(candidate.id,{membership_status:"not_joined",feed_status:"unverified",
    browse_enabled:false,checkout_enabled:false,membership_checked_at:now()});
   result.push({id:candidate.id,status:"not_joined"});continue;
  }
  const checked=now();
  await update(candidate.id,{membership_status:"joined",feed_status:"pending",
   browse_enabled:false,checkout_enabled:false,membership_checked_at:checked});
  if(downloads++)await delay(12500); // Awin limits Enhanced Feed downloads to <=5/min.
  const at=now();let count=0,published=0;
  try{
   const data=await request("https://api.awin.com/publishers/"+pid+
    "/awinfeeds/download/"+candidate.id+"-retail-en_US.jsonl",{headers:ah},20*1024*1024);
   const lines=data.trim().split(/\r?\n/);
   if(!lines.length||lines.length>10000)throw Error("Feed exceeds pilot limits");
   const records=lines.map(l=>JSON.parse(l));
   if(records.at(-1)?.error)throw Error("Awin incomplete-feed marker");
   let batch=[];
   for(const row of records){
    count++;
    const normalized=mapFeedRow(row,candidate,at);
    if(!normalized)continue;
    batch.push(normalized);published++;
    if(batch.length>=100){
     await db("matchlatch_awin_products?on_conflict=advertiser_id,source_variant_id",
      "POST",batch,"resolution=merge-duplicates,return=minimal");batch=[];
    }
   }
   if(batch.length)await db("matchlatch_awin_products?on_conflict=advertiser_id,source_variant_id",
    "POST",batch,"resolution=merge-duplicates,return=minimal");
   if(!published)throw Error("Feed contains no verifiable US fashion listings");
   await update(candidate.id,{membership_status:"joined",feed_status:"verified",
    membership_checked_at:checked,feed_checked_at:now(),
    browse_enabled:activate,checkout_enabled:false});
   if(activate){
    const params=new URLSearchParams({advertiser_id:"eq."+candidate.id,
     feed_imported_at:"eq."+at,available:"eq.true",shipping_us_eligible:"eq.true"});
    await db("matchlatch_awin_products?"+params,"PATCH",{is_public:true},"return=minimal");
   }
   result.push({id:candidate.id,status:activate?"published":"privately_staged",received:count,eligible:published});
  }catch(error){
   await update(candidate.id,{membership_status:"joined",feed_status:"unavailable",
    browse_enabled:false,checkout_enabled:false,membership_checked_at:checked});
   result.push({id:candidate.id,status:"feed_unavailable",reason:String(error.message).slice(0,100)});
  }
 }
 console.log(JSON.stringify({checkedAt:now(),activated:activate,results:result}));
}
if(process.argv[1]?.endsWith("sync-awin-feeds.mjs"))
 sync().catch(e=>{console.error("Awin sync failed:",e.message);process.exitCode=1;});
export {sync,mapFeedRow,slotFor};
