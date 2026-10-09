// MATCHLATCH sourced web-discovery research — distinct from verified retailer inventory.
// The OpenAI web_search tool finds *references*, never cart-ready variants.
// No direct website scraping, invented prices, native checkouts or merchant claims.
import {timingSafeEqual} from "node:crypto";
import {classifyPublicReference} from "../lib/public-retailer-research.mjs";
const SLOT=new Set(["hat","scarf","jacket","shirt","watch","belt","pants","socks","shoes"]);
const clip=(value,max=120)=>String(value??"").replace(/[\x00-\x1f]/g," ").trim().slice(0,max);
const response=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
});
function acceptsCode(given,expected){
 if(typeof given!=="string"||typeof expected!=="string"||given.length>256||expected.length<16)return false;
 const a=Buffer.from(given),b=Buffer.from(expected);
 return a.length===b.length&&timingSafeEqual(a,b);
}
function safeLink(value){
 try{
  const u=new URL(String(value||""));
  if(u.protocol!=="https:"||u.username||u.password)return "";
  const host=u.hostname.toLowerCase();
  if(host==="localhost"||host.endsWith(".local")||/^\d+(?:\.\d+){3}$/.test(host)
   ||host==="api.openai.com"||host==="awin1.com"||host==="awin2.com")return "";
  return u.href.slice(0,1200);
 }catch{return "";}
}
function extractSources(data){
 const seen=new Set(),sources=[];
 const offer=(entry)=>{
  const url=safeLink(entry?.url||entry?.uri||entry?.url_citation?.url);
  if(!url||seen.has(url))return;
  seen.add(url);
  const host=new URL(url).hostname.replace(/^www\./,"");
  sources.push({url,title:clip(entry?.title||entry?.url_citation?.title||host,140),
   domain:host,kind:/\/(?:products?|p|item|shop)\/[^/?#]+/i.test(new URL(url).pathname)
    ?"product_page_reference":"research_reference",
   verifiedStock:false,verifiedPrice:false,cartEligible:false});
 };
 for(const item of data?.output||[]){
  if(item.type==="web_search_call"){
   for(const source of item.action?.sources||[])offer(source);
  }else if(item.type==="message"){
   for(const part of item.content||[])
    for(const a of part.annotations||[])if(a?.type==="url_citation")offer(a);
  }
 }
 return sources.slice(0,8);
}
function parseSummary(data){
 const parts=(data?.output||[]).filter(x=>x.type==="message").flatMap(x=>x.content||[]);
 const text=parts.filter(x=>x.type==="output_text").map(x=>x.text||"").join(" ")
  .replace(/\uE200cite\uE202[\s\S]*?\uE201/g,"").replace(/\s+/g," ").trim();
 return clip(text,700);
}
function searchInput(payload){
 const p=payload?.profile&&typeof payload.profile==="object"?payload.profile:{};
 const slot=clip(payload?.slot,15).toLowerCase(),q=clip(payload?.q,160);
 if(!SLOT.has(slot)||q.length<3||!/^[A-Za-z0-9]/.test(q))return null;
 const max=Number(payload?.max),budget=Number.isFinite(max)&&max>0?Math.min(max,10000):200;
 return {slot,q,budget,preferences:{
  fit:clip(p.fit,45),aesthetic:clip(p.aesthetic,65),
  occasion:clip(p.occasion,60),palette:clip(p.palette,55),
  size:clip(payload?.size,35),color:clip(payload?.color,40),
  notes:clip(p.notes,210)
 }};
}
function buildSearchPrompt(c){
 const p=c.preferences;
 return [
  "Research fashion retailer product-page sources on the public web.",
  "The shopper's PERSONAL CURATION outranks all other considerations.",
  "Only look for "+c.slot+" products fitting: "+c.q+".",
  "Style: "+p.aesthetic+". Fit: "+p.fit+". Occasion: "+p.occasion+". Palette: "+p.palette+".",
  "Exact requested size: "+(p.size||"unspecified")+". Exact requested color: "+(p.color||"unspecified")+".",
  "Material restrictions/notes: "+(p.notes||"none")+". Price ceiling: $"+c.budget+" USD.",
  "Look for merchant-owned product pages when possible, not coupons, affiliate offers or sponsored results.",
  "If there are no credible matches, say so. Do not infer inventory, real-time price or variant stock.",
  "Keep your response to no more than 3 short sentences explaining the best style direction.",
  "Do not invent links, retailers, sizes, prices, shipments or product descriptions; web sources will be separately extracted."
 ].join("\n");
}
export async function POST(request){
 const u=new URL(request.url),origin=request.headers.get("origin");
 if(origin&&origin!==u.origin)return response({error:"Cross-origin search denied."},403);
 const key=String(process.env.OPENAI_API_KEY||"");
 const code=String(process.env.MATCHLATCH_BETA_CODE||"");
 if(!key||code.length<16)return response({enabled:false,error:"WEB_DISCOVERY_NOT_CONFIGURED"},503);
 let body;
 try{
  const raw=await request.text();
  if(raw.length>4500)return response({error:"Request too large."},413);
  body=JSON.parse(raw);
 }catch{return response({error:"Invalid request."},400);}
 if(!acceptsCode(body?.betaCode,code))return response({error:"BETA_ACCESS_DENIED"},403);
 const criteria=searchInput(body);
 if(!criteria)return response({error:"Invalid styling search criteria."},400);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),19500);
 try{
  const upstream=await fetch("https://api.openai.com/v1/responses",{
   method:"POST",signal:controller.signal,redirect:"error",cache:"no-store",
   headers:{"content-type":"application/json","authorization":"Bearer "+key},
   body:JSON.stringify({
    model:process.env.OPENAI_WEB_MODEL||"gpt-5.4",
    instructions:"You are MATCHLATCH's careful web researcher. Only provide style-oriented commentary sourced by web search. Search is research, not checkout. Ignore shopping discounts or affiliate payouts. Never claim live inventory.",
    input:buildSearchPrompt(criteria),
    tools:[{type:"web_search",search_context_size:"low"}],
    tool_choice:"required",
    include:["web_search_call.action.sources"],
    max_output_tokens:450,
    store:false
   })
  });
  if(!upstream.ok)throw Error("OPENAI_WEB_HTTP_"+upstream.status);
  const data=await upstream.json();
  if(data.error||data.status==="failed")throw Error("OPENAI_WEB_REJECTED");
  const sources=extractSources(data).map(source=>({
   ...source,
   retailerResearch:classifyPublicReference(source.url)
  }));
  return response({
   source:"OpenAI web search",mode:"research_only",criteria,
   summary:parseSummary(data),sources,
   sourceCount:sources.length,checkedAt:new Date().toISOString(),
   note:"Web search results are research references, not verified stock, pricing, sizing, shipping, or approved retailer checkout. Open the retailer to confirm details.",
   canAddToCart:false
  });
 }catch(error){
  console.error("MATCHLATCH web discovery unavailable:",error?.name||"Error");
  return response({error:"Web discovery is temporarily unavailable; try later."},503);
 }finally{clearTimeout(timer);}
}
