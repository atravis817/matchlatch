// MATCHLATCH Savings Check · Awin publisher integration (server only).
// An Awin-listed voucher is not proof that it works for a particular item.
// Do not change merchandise prices or promise checkout savings.
const BASE="https://api.awin.com";
const CACHE_MS=30*60*1000;
const ERROR_COOLDOWN_MS=60*1000;
const MAX_DOMAINS=15;
const PAGE_SIZE=200;
const MAX_PAGES=3; // bounded beta retrieval; a large network may have more offers
const MAX_BYTES=2*1024*1024;
const short=(v,n)=>String(v??"").replace(/[\u0000-\u001f]/g," ").trim().slice(0,n);
const output=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
});
const domain=value=>{
 const raw=short(value,240).toLowerCase().replace(/^www\./,"");
 return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(raw)?raw:"";
};
const websiteDomain=value=>{
 try{
  let s=String(value||"").trim();
  if(/^(?!https?:\/\/)[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(s))s="https://"+s;
  const url=new URL(s);
  return ["https:","http:"].includes(url.protocol)?domain(url.hostname):"";
 }catch{return ""}
};
const matches=(host,target)=>host===target||host.endsWith("."+target)||target.endsWith("."+host);
const isUs=row=>{
 const regions=row?.regions;
 if(!regions||regions.all===true)return true;
 if(!Array.isArray(regions.list))return false;
 return regions.list.some(r=>(r?.countryCode||r)?.toString?.().toUpperCase()==="US");
};
const parseDate=(value,isEnd)=>{
 if(!value)return null;
 const s=short(value,45);
 const isoDate=/^\d{4}-\d{2}-\d{2}$/.test(s);
 const n=Date.parse(isoDate?s+(isEnd?"T23:59:59.999Z":"T00:00:00Z"):s);
 return Number.isFinite(n)?n:NaN;
};
const arrayFrom=(data,fields)=>{
 if(Array.isArray(data))return data;
 if(!data||typeof data!=="object")return null;
 for(const key of fields)if(Array.isArray(data[key]))return data[key];
 return null;
};
const credentials=()=>{
 const token=String(process.env.AWIN_API_TOKEN||"").trim();
 const publisher=String(process.env.AWIN_PUBLISHER_ID||"").trim();
 return token&&/^[1-9][0-9]{0,17}$/.test(publisher)?{token,publisher}:null;
};
async function awinFetch(path,{method="GET",body,token}){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),11000);
 try{
  const res=await fetch(BASE+path,{
   method,signal:controller.signal,redirect:"error",cache:"no-store",
   headers:{"authorization":"Bearer "+token,"accept":"application/json",
    ...(body?{"content-type":"application/json"}:{})},
   ...(body?{body:JSON.stringify(body)}:{})
  });
  if(!res.ok)throw Error("AWIN_HTTP_"+res.status);
  if(Number(res.headers?.get?.("content-length")||0)>MAX_BYTES)throw Error("AWIN_RESPONSE_TOO_BIG");
  const raw=await res.text();
  if(raw.length>MAX_BYTES)throw Error("AWIN_RESPONSE_TOO_BIG");
  return JSON.parse(raw);
 }finally{clearTimeout(timeout)}
}
const blockedDomain=host=>!host||host==="awin.com"||host.endsWith(".awin.com")
 ||host==="awin1.com"||host.endsWith(".awin1.com")
 ||host==="awin2.com"||host.endsWith(".awin2.com");
function domainsForProgramme(programme){
 const urls=[programme?.displayUrl];
 for(const value of programme?.validDomains||[])urls.push(typeof value==="string"?value:value?.domain);
 const result=new Set();
 for(const value of urls){
  const candidate=websiteDomain(value)||domain(value);
  if(candidate&&!blockedDomain(candidate))result.add(candidate);
 }
 return [...result];
}
function normalizeOffers(rows,programmes){
 const now=Date.now(),all=[];
 for(const offer of rows){
  if(!offer||offer.type!=="voucher"||!offer.advertiser?.joined)continue;
  const merchant=programmes.get(String(offer.advertiser.id));
  if(!merchant)continue; // Only publishers with an active advertiser membership.
  if(!isUs(offer))continue;
  const code=short(offer.voucher?.code,60);
  if(!/^[A-Za-z0-9][A-Za-z0-9_-]{2,49}$/.test(code))continue;
  const start=parseDate(offer.startDate,false);
  const end=parseDate(offer.endDate,true);
  if(Number.isNaN(start)||Number.isNaN(end))continue;
  if((start!==null&&start>now)||(end!==null&&end<now))continue;
  const landing=websiteDomain(offer.url);
  // Retain programme domains even if the offer uses Awin's tracking URL.
  const hosts=domainsForProgramme(merchant);
  if(landing&&!blockedDomain(landing)&&hosts.some(d=>matches(d,landing)))
   hosts.unshift(landing);
  if(!hosts.length)continue;
  const normalized={
   code,title:short(offer.title||offer.description||"Awin retailer promotion",160),
   terms:short(offer.terms||offer.description,320),
   expiresAt:end!==null?new Date(end).toISOString():null,
   source:"Awin",verification:"provider_listed",
   advertiserId:String(offer.advertiser.id)
  };
  all.push({...normalized,domains:[...new Set(hosts)]});
  if(all.length>=600)break;
 }
 return all;
}
let cache=null,cacheExpires=0,inFlight=null,holdUntil=0;
async function loadAwin(){
 const creds=credentials();
 if(!creds)return null;
 if(cache&&Date.now()<cacheExpires)return cache;
 if(inFlight)return inFlight;
 if(Date.now()<holdUntil)throw Error("AWIN_COOLDOWN");
 inFlight=(async()=>{
  try{
   // Awin's joined programmes supply stable merchant domains/advertiser IDs.
   const joined=await awinFetch("/publishers/"+creds.publisher+"/programmes?relationship=joined",
    {token:creds.token});
   const programmes=new Map();
   for(const p of arrayFrom(joined,["programmes","data","results"])||[]){
    if(!p?.id||!domainsForProgramme(p).length||String(p.linkStatus||"").toLowerCase()==="offline")continue;
    programmes.set(String(p.id),p);
   }
   const offers=[];
   for(let page=1;page<=MAX_PAGES;page++){
    const result=await awinFetch("/publisher/"+creds.publisher+"/promotions",{
     method:"POST",token:creds.token,
     body:{filters:{membership:"joined",regionCodes:["US"],status:"active",type:"voucher"},
      pagination:{page,pageSize:PAGE_SIZE}}
    });
    const current=arrayFrom(result,["promotions","offers","data","results","items"]);
    if(!current)throw Error("AWIN_UNKNOWN_RESPONSE");
    offers.push(...current);
    // Pages are bounded to protect Awin's 20 calls/minute/user throttle.
    if(current.length<PAGE_SIZE)break;
   }
   cache=normalizeOffers(offers,programmes);
   cacheExpires=Date.now()+CACHE_MS;
   holdUntil=0;
   return cache;
  }catch(err){
   holdUntil=Date.now()+ERROR_COOLDOWN_MS;
   throw err;
  }finally{inFlight=null}
 })();
 return inFlight;
}
export async function GET(request){
 const u=new URL(request.url);
 const origin=request.headers?.get?.("origin");
 if(origin&&origin!==u.origin)return output({error:"Cross-origin request rejected."},403);
 const raw=(u.searchParams.get("domains")||u.searchParams.get("domain")||"").split(",");
 if(raw.length>MAX_DOMAINS||raw.some(d=>d.length>235))
   return output({error:"Too many merchant domains."},400);
 const domains=[...new Set(raw.map(domain))];
 if(domains.some(d=>!d))return output({error:"Invalid merchant domain."},400);
 if(!credentials()){
  return output({enabled:false,status:"not_configured",offers:{},
   message:"Awin publisher integration awaits an API token and publisher ID."});
 }
 try{
  const listed=await loadAwin();
  const found={};
  for(const d of domains){
   const matched=new Map();
   for(const offer of listed||[]){
    if(!offer.domains.some(host=>matches(host,d)))continue;
    if(!matched.has(offer.code)){
     // Never send internal matching domains or unrelated merchant entries.
     const {domains:_,...view}=offer;
     matched.set(offer.code,view);
    }
   }
   found[d]=[...matched.values()].slice(0,5);
  }
  return output({enabled:true,status:"listed_not_checkout_verified",offers:found,source:"Awin",
   checkedAt:new Date().toISOString(),
   limitedScan:true,
   message:"Awin-listed vouchers for joined advertisers. Code acceptance at retailer checkout is not verified."});
 }catch(err){
  // Never echo tokens, URLs, or upstream provider error bodies to logs or clients.
  console.error("MATCHLATCH Savings Check provider unavailable:",err?.name||"Error");
  return output({enabled:true,status:"provider_unavailable",offers:{},
   message:"Awin promotions are temporarily unavailable; no codes were verified."},503);
 }
}
