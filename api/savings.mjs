import {affiliateConfig,awinRequest,activeJoined,advertiserDomains,domainMatches,merchantDestination,generateAffiliateLink} from '../lib/awin-commerce.mjs';
import {allowRequest} from '../lib/request-limits.mjs';
// MATCHLATCH Savings Check · Awin publisher integration (server only).
// An Awin-listed voucher is not proof that it works for a particular item.
// Do not change merchandise prices or promise checkout savings.
const BASE="https://api.awin.com";
const CACHE_MS=5*60*1000;
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
const matches=(host,target)=>host.startsWith("*.")?target.endsWith("."+host.slice(2)):host===target;
const isUs=row=>{
 const regions=row?.regions;
 if(regions?.all===true)return true;
 if(!regions)return false;
 if(!Array.isArray(regions.list))return false;
 return regions.list.some(r=>(r?.countryCode||r)?.toString?.().toUpperCase()==="US");
};
const parseDate=(value,isEnd)=>{
 if(!value)return null;
 const s=short(value,45);
 const isoDate=/^\d{4}-\d{2}-\d{2}$/.test(s);
 if(isoDate){const d=new Date(s+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==s)return NaN;}
 const utc=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/.test(s)?s+'Z':s;
 const n=Date.parse(isoDate?s+(isEnd?"T23:59:59.999Z":"T00:00:00Z"):utc);
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
 return token&&publisher==='3118944'?{token,publisher}:null;
};
async function awinFetch(path,{method="GET",body,token}){
 return awinRequest(path,{method,body,config:{token,publisher:process.env.AWIN_PUBLISHER_ID}});
}
const blockedDomain=host=>!host||host==="awin.com"||host.endsWith(".awin.com")
 ||host==="awin1.com"||host.endsWith(".awin1.com")
 ||host==="awin2.com"||host.endsWith(".awin2.com");
function domainsForProgramme(programme){
 return advertiserDomains(programme).map(d=>(d.wildcard?'*.':'')+d.base);
}
function normalizeOffers(rows,programmes){
 const now=Date.now(),all=[];
 for(const offer of rows){
  if(!offer||!["voucher","promotion"].includes(offer.type)||offer.advertiser?.joined!==true)continue;
  const merchant=programmes.get(String(offer.advertiser.id));
  if(!merchant)continue; // Only publishers with an active advertiser membership.
  if(!isUs(offer)||String(merchant.description||"").toLowerCase().includes("no coupon sites"))continue;
  const code=short(offer.voucher?.code,60);
  if(offer.type==="voucher"&&(!/^[A-Za-z0-9][A-Za-z0-9_-]{2,49}$/.test(code)||typeof offer.voucher?.exclusive!=="boolean"))continue;
  const start=parseDate(offer.startDate,false);
  const end=parseDate(offer.endDate,true);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)continue;
  if((start!==null&&start>now)||(end!==null&&end<now))continue;
  const offerUrl=merchantDestination(offer.url)?.href;
  if(!offerUrl||!domainMatches(offerUrl,merchant))continue;
  const hosts=domainsForProgramme(merchant);
  const terms=short(offer.terms||offer.description,600);
  if(!terms)continue;
  const restricted=/first order|new customer|minimum|selected|members? only|students? only|excluding|excludes/i.test(terms);
  const normalized={
   offerId:short(offer.promotionId,30),kind:offer.type,code:offer.type==="voucher"?code:null,offerUrl,
   audience:offer.voucher?.exclusive===true?"publisher_exclusive":offer.type==="voucher"?"public":"source_terms",
   restricted,checkoutVerified:false,title:short(offer.title||offer.description||"Awin retailer promotion",160),
   terms,
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
   const programmes=new Map(),joinedRows=arrayFrom(joined,["programmes","data","results"]);
   if(!joinedRows)throw Error("AWIN_UNKNOWN_RESPONSE");
   for(const p of joinedRows){
    if(!activeJoined(p))continue;
    programmes.set(String(p.id),p);
   }
   const offers=[];
   for(let page=1;page<=MAX_PAGES;page++){
    const result=await awinFetch("/publisher/"+creds.publisher+"/promotions",{
     method:"POST",token:creds.token,
     body:{filters:{membership:"joined",regionCodes:["US"],status:"active",type:"all"},
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
 if(!allowRequest(request,"awin-savings",20))return output({error:"Please try again later."},429);
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
    if(!offer.expiresAt||Date.parse(offer.expiresAt)<Date.now())continue;
    if(!offer.domains.some(host=>matches(host,d)))continue;
    const key=offer.code||offer.offerId+offer.title;
    if(!matched.has(key)){
     // Never send internal matching domains or unrelated merchant entries.
     const {domains:_,...view}=offer;
     matched.set(key,view);
    }
   }
   found[d]=[...matched.values()].slice(0,5);
  }
  return output({enabled:true,status:"listed_not_checkout_verified",offers:found,source:"Awin",
   checkedAt:new Date(cacheExpires-CACHE_MS).toISOString(),
   limitedScan:true,
   message:"Awin-listed vouchers for joined advertisers. Code acceptance at retailer checkout is not verified."});
 }catch(err){
  // Never echo tokens, URLs, or upstream provider error bodies to logs or clients.
  console.error("MATCHLATCH Savings Check provider unavailable:",err?.name||"Error");
  return output({enabled:true,status:"provider_unavailable",offers:{},
   message:"Awin promotions are temporarily unavailable; no codes were verified."},503);
 }
}

// Explicit user action only. Never redirects or changes a Shopify checkout URL.
export async function POST(request){
 if(process.env.VERCEL_ENV!=='preview')return output({error:'Not found'},404);
 const url=new URL(request.url);
 if(request.headers.get('origin')!==url.origin||request.headers.get('content-type')?.split(';')[0]!=='application/json')return output({error:'Request rejected.'},403);
 if(!allowRequest(request,'awin-link',4))return output({error:'Please try again later.'},429);
 if(Number(request.headers.get('content-length')||0)>4096)return output({error:'Request too large.'},413);
 let body;try{const raw=await request.text();if(raw.length>4096)return output({error:'Request too large.'},413);body=JSON.parse(raw);}catch{return output({error:'Invalid request.'},400);}
 const destination=merchantDestination(body?.destination);
 if(!destination||body?.intent!=='retailer_handoff'||body?.affiliateConsent!==true)return output({error:'Choose a valid retailer link.'},400);
 const fallback={status:'ordinary_retailer_link',affiliate:false,retailerUrl:destination.href};
 if(process.env.MATCHLATCH_AWIN_HANDOFF_ENABLED!=='true'||!affiliateConfig())return output({...fallback,reason:'not_configured'});
 try{return output(await generateAffiliateLink(destination.href));}catch{return output({...fallback,reason:'affiliate_unavailable'});}
}
