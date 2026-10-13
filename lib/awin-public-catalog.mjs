/*
 * MATCHLATCH Awin publisher offer lookup.
 * Source: Supabase RLS-gated, explicitly published, fresh advertiser feeds.
 * Anonymous publishable key only; never a service-role key or Awin token.
 * No Awin feed is requested during consumer searches.
 */
const SLOTS=new Set(["hat","scarf","jacket","shirt","watch","belt","pants","socks","shoes"]);
const clean=(v,n=200)=>String(v??"").replace(/[\u0000-\u001f]/g," ").trim().slice(0,n);
const sourceId=/^awin:([1-9][0-9]{0,9}):(.{1,200})$/;
function validHttps(value){
 try{const u=new URL(String(value||""));return u.protocol==="https:"?u.href:"";}catch{return "";}
}
function postgrestConfig(){
 const base=String(process.env.MATCHLATCH_SUPABASE_URL||"");
 const key=String(process.env.MATCHLATCH_SUPABASE_PUBLISHABLE_KEY||"");
 if(!key.startsWith("sb_publishable_")||!validHttps(base))return null;
 const host=new URL(base).hostname;
 if(!/^[-a-z0-9]+\.supabase\.co$/.test(host))return null;
 return {base:base.replace(/\/$/,""),key};
}
function validPrice(amount){const n=Number(amount);return Number.isFinite(n)&&n>0&&n<=100000?n:null;}
function mapProduct(row){
 if(!row||!SLOTS.has(row.slot)||row.is_public!==true||row.available!==true
   ||row.shipping_us_eligible!==true||row.currency!=="USD")return null;
 const t=Date.parse(String(row.feed_imported_at||"")),expiry=Date.parse(String(row.valid_until||""));
 const now=Date.now();
 if(!Number.isFinite(t)||!Number.isFinite(expiry)||now-t>86400000||t>now+60000||expiry<=now)return null;
 const id=Number(row.advertiser_id),price=validPrice(row.price_usd);
 const destination=validHttps(row.product_url),publishedHost=clean(row.merchant_host,180).toLowerCase();
 if(!Number.isSafeInteger(id)||id<=0||!price||!destination)return null;
 const destinationHost=new URL(destination).hostname.toLowerCase().replace(/^www\./,"");
 if(!publishedHost||destinationHost!==publishedHost)return null;
 const supplied=validHttps(row.affiliate_url);
 let affiliate="";
 if(supplied){
  const host=new URL(supplied).hostname.toLowerCase();
  if(host==="awin1.com"||host.endsWith(".awin1.com")
   ||host==="awin2.com"||host.endsWith(".awin2.com"))affiliate=supplied;
 }
 const title=clean(row.title,180),variant=clean(row.source_variant_id,200),product=clean(row.source_product_id,200);
 if(!title||!variant||!product)return null;
 return {
  source:"awin",slot:row.slot,
  productId:"awin:"+id+":"+product,
  variantId:"awin:"+id+":"+variant,
  advertiserId:id,
  title,variant:clean([row.color,row.size].filter(Boolean).join(" / "),100),
  description:clean(row.description,400),brand:clean(row.brand,85),
  material:clean(row.material,85),fit:clean(row.fit,70),productType:clean(row.slot,35),
  merchant:clean(row.merchant_name,100),merchantDomain:clean(row.merchant_host,180),
  image:validHttps(row.image_url),imageAlt:title,url:affiliate||destination,
  merchantProductUrl:destination,affiliateTracked:Boolean(affiliate),
  checkoutUrl:"",price,currency:"USD",size:clean(row.size,50),
  color:clean(row.color,50),available:true,
  originalPrice:validPrice(row.original_price_usd),
  discountEvidence:validPrice(row.original_price_usd)>price?"retailer_published_sale":"none",
  stockStatus:clean(row.stock_status,40)||"feed_snapshot",
  stockVerifiedLive:false,requiresMerchantVerification:true,
  shippingCost:row.shipping_cost_usd===null?null:Number(row.shipping_cost_usd),
  shippingUsEligible:true,deliveryEstimate:null,
  checkedAt:new Date(t).toISOString()
 };
}
const SELECT=[
 "advertiser_id","source_product_id","source_variant_id","slot","title","description",
 "brand","material","fit","size","color","image_url","product_url","affiliate_url",
 "merchant_name","merchant_host","price_usd","original_price_usd","currency",
 "available","stock_status","shipping_us_eligible","shipping_cost_usd",
 "feed_imported_at","valid_until","is_public"
].join(",");
async function rows(params){
 const config=postgrestConfig();
 if(!config)return [];
 const u=new URL(config.base+"/rest/v1/matchlatch_awin_products");
 u.searchParams.set("select",SELECT);
 u.searchParams.set("is_public","eq.true");
 u.searchParams.set("available","eq.true");
 u.searchParams.set("shipping_us_eligible","eq.true");
 u.searchParams.set("valid_until","gt."+new Date().toISOString());
 for(const [key,value] of Object.entries(params))u.searchParams.set(key,value);
 u.searchParams.set("limit","36");
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
 try{
  const response=await fetch(u.href,{
   headers:{apikey:config.key,accept:"application/json"},redirect:"error",
   signal:controller.signal,cache:"no-store"
  });
  if(!response.ok)throw new Error("AWIN_PUBLIC_CATALOG_"+response.status);
  const body=await response.text();
  if(body.length>1200000)throw new Error("AWIN_PUBLIC_CATALOG_OVERSIZE");
  const items=JSON.parse(body);
  if(!Array.isArray(items))throw new Error("AWIN_PUBLIC_CATALOG_BAD_RESPONSE");
  return items;
 }finally{clearTimeout(timer);}
}
function queryWords(text){
 return clean(text,170).toLowerCase().replace(/[^a-z0-9 -]/g," ")
   .split(/\s+/).filter(w=>w.length>=3).slice(0,10);
}
async function searchAwin({slot,q,max,size="",color=""}){
 if(!SLOTS.has(slot)||!Number.isFinite(max)||max<1||max>10000)return [];
 const words=queryWords(q);
 if(!words.length)return [];
 const filters={
  slot:"eq."+slot,price_usd:"lte."+max,
  search_document:"wfts(simple)."+words.join(" ")
 };
 if(size)filters.size="ilike."+clean(size,36).replace(/[%*,().]/g,"");
 if(color)filters.color="ilike."+clean(color,50).replace(/[%*,().]/g,"");
 const retrieved=await rows(filters);
 return retrieved.map(mapProduct).filter(item=>item&&item.price<=max&&
  (!size||item.size.toLowerCase()===size.toLowerCase())&&
  (!color||item.color.toLowerCase().replace(/grey/g,"gray")===color.toLowerCase().replace(/grey/g,"gray")));
}
async function verifyAwin({id,variant,max,size="",color=""}){
 const p=sourceId.exec(String(id||"")),v=sourceId.exec(String(variant||""));
 if(!p||!v||p[1]!==v[1]||!Number.isFinite(max)||max<=0)return null;
 const list=await rows({
  advertiser_id:"eq."+p[1],
  source_product_id:"eq."+p[2],
  source_variant_id:"eq."+v[2]
 });
 const item=list.map(mapProduct).find(x=>x&&x.productId===id&&x.variantId===variant&&x.price<=max
  &&(!size||x.size.toLowerCase()===size.toLowerCase())
  &&(!color||x.color.toLowerCase()===color.toLowerCase()));
 return item||null;
}
export {searchAwin,verifyAwin,postgrestConfig,mapProduct};
