// MATCHLATCH Savings Check: optional LinkMyDeals provider feed.
// IMPORTANT: "listed/active" is NOT "accepted at checkout". Do not change
// display prices or promise a code will work without merchant-cart proof.
const FEED="https://feed.linkmydeals.com/getOffers/";
const TTL=12*60*60*1000; // in-memory beta cache; not global across serverless instances
const SIZE_LIMIT=8*1024*1024;
const MAX_DOMAINS=15;
const clip=(v,n)=>String(v??"").replace(/[\u0000-\u001f]/g," ").trim().slice(0,n);
const out=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
});
const domain=(value)=>{
 try{
  const raw=String(value||"").trim().toLowerCase();
  if(!/^[a-z0-9.-]{4,235}$/.test(raw))return "";
  const d=raw.replace(/^www\./,"");
  if(!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(d))return "";
  return d;
 }catch{return ""}
};
const websiteDomain=(link)=>{
 try{
  const u=new URL(String(link||""));
  return ["https:","http:"].includes(u.protocol)?domain(u.hostname):"";
 }catch{return ""}
};
const matchesDomain=(merchant,requested)=>merchant===requested
  ||merchant.endsWith("."+requested)||requested.endsWith("."+merchant);
const field=(row,...names)=>{
 for(const name of names){const v=row?.[name];if(v!==undefined&&v!==null&&String(v).trim())return v;}
 return "";
};
const dateMs=(value,end=false)=>{
 if(!value)return null;
 const raw=clip(value,50);
 // A calendar-day expiry includes its entire last date (UTC).
 const ymd=/^\d{4}-\d{2}-\d{2}$/.test(raw);
 const time=Date.parse(ymd?raw+(end?"T23:59:59.999Z":"T00:00:00Z"):raw);
 return Number.isFinite(time)?time:NaN;
};
function extract(feed){
 const rows=Array.isArray(feed?.offers)?feed.offers:Array.isArray(feed?.Offers)?feed.Offers:[];
 const now=Date.now(),clean=[];
 for(const row of rows){
  if(!row||typeof row!=="object")continue;
  const type=clip(field(row,"Type","type"),65);
  const code=clip(field(row,"Coupon Code","coupon_code","couponCode","code"),42).toUpperCase();
  if(!code||!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code))continue;
  if(type && !/coupon|code/i.test(type))continue;
  const state=clip(field(row,"Status","status"),35).toLowerCase();
  if(/suspend|expir|delet|inactiv|cancel|invalid/.test(state))continue;
  const start=dateMs(field(row,"Start Date","start_date","startDate"));
  const end=dateMs(field(row,"End Date","end_date","endDate"),true);
  if(Number.isNaN(start)||Number.isNaN(end))continue;
  if((start!==null&&start>now)||(end!==null&&end<now))continue;
  const host=websiteDomain(field(row,"Merchant Homepage","merchant_homepage","merchantHomepage"));
  if(!host)continue; // Never guess a merchant match from a brand name.
  const title=clip(field(row,"Offer Text","Title","title","offer_text"),160);
  const terms=clip(field(row,"Terms and Conditions","Description","description","terms"),320);
  clean.push({domain:host,code,title:title||"Public code listed by coupon provider",
   terms,expiresAt:end!==null?new Date(end).toISOString():null,
   source:"LinkMyDeals",verification:"provider_listed"});
  if(clean.length>=5000)break;
 }
 return clean;
}
let cache=null,expires=0,inFlight=null;
async function refresh(){
 const key=String(process.env.LINKMYDEALS_API_KEY||"").trim();
 if(!key)return null;
 if(cache&&Date.now()<expires)return cache;
 if(inFlight)return inFlight;
 inFlight=(async()=>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),11500);
  try{
   const feedUrl=new URL(FEED);
   feedUrl.searchParams.set("API_KEY",key);
   feedUrl.searchParams.set("format","json");
   feedUrl.searchParams.set("off_record","1");
   const response=await fetch(feedUrl,{
    signal:controller.signal,headers:{"accept":"application/json"},redirect:"error",cache:"no-store"
   });
   if(!response.ok)throw Error("COUPON_PROVIDER_HTTP_"+response.status);
   if(Number(response.headers.get("content-length")||0)>SIZE_LIMIT)throw Error("COUPON_FEED_TOO_LARGE");
   const raw=await response.text();
   if(raw.length>SIZE_LIMIT)throw Error("COUPON_FEED_TOO_LARGE");
   const body=JSON.parse(raw);
   if(!body||typeof body!=="object"||
      !Array.isArray(body.offers)&&!Array.isArray(body.Offers)||
      body.result===false||body.result===0||body.result==="0")
      throw Error("COUPON_FEED_INVALID");
   cache=extract(body);expires=Date.now()+TTL;
   return cache;
  }finally{clearTimeout(timeout);inFlight=null;}
 })();
 return inFlight;
}
export async function GET(request){
 const origin=request.headers?.get?.("origin");
 if(origin&&origin!==new URL(request.url).origin)
   return out({error:"Cross-origin request rejected."},403);
 const u=new URL(request.url);
 const values=(u.searchParams.get("domains")||u.searchParams.get("domain")||"").split(",");
 if(values.length>MAX_DOMAINS||values.some(v=>v.length>235))
   return out({error:"Too many merchant domains."},400);
 const domains=[...new Set(values.map(domain).filter(Boolean))];
 if(!domains.length||domains.length!==new Set(values.map(v=>v.toLowerCase().trim().replace(/^www\./,""))).size)
   return out({error:"Please supply valid merchant domains."},400);
 if(!process.env.LINKMYDEALS_API_KEY){
  return out({enabled:false,offers:{},status:"not_configured",
   message:"Savings feed is not connected. No coupon codes have been verified."});
 }
 try{
  const listings=await refresh();
  const offers={};
  for(const d of domains){
   const list=new Map();
   for(const coupon of listings||[]){
    if(!matchesDomain(coupon.domain,d))continue;
    const key=coupon.code;
    if(!list.has(key))list.set(key,coupon);
   }
   offers[d]=[...list.values()].slice(0,5);
  }
  return out({enabled:true,status:"listed_not_checkout_verified",offers,
   source:"LinkMyDeals",checkedAt:new Date().toISOString(),
   message:"Codes are currently listed by a third-party feed; checkout acceptance is unverified. Do not include discounts in price totals."});
 }catch(err){
  // Never log upstream URL or API keys; provider errors may contain secrets.
  console.error("MATCHLATCH Savings Check upstream failed",err?.name||"Error");
  return out({enabled:true,status:"provider_unavailable",offers:{},
   message:"Coupon provider is temporarily unavailable; codes were not checked."},503);
 }
}
