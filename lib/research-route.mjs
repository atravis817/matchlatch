import studioRequest from '../studio-request.js';
import {timingSafeEqual} from 'node:crypto';
import {json,session,SLOTS} from './catalog-server.mjs';
import {allowRequest} from './request-limits.mjs';
import {discoverCommerce} from './commerce-discovery.mjs';
import {researchSources} from './public-retailer-research.mjs';
export function acceptsCode(given,expected){
 if(typeof given!=='string'||typeof expected!=='string'||given.length>256||expected.length<16)return false;
 const a=Buffer.from(given),b=Buffer.from(expected);
 return a.length===b.length&&timingSafeEqual(a,b);
}
// Explicit shopper-entered fields only. Never spread profile/image/location inputs.
export function researchInput(body){
 if(!body||Array.isArray(body)||typeof body!=='object')throw Error('Invalid request');
 const studio=body.studioRequest===undefined?null:studioRequest.studioSearchInput(body.studioRequest);
 const query=studio?.query??body.q??body.query;
 if(studio)body={...body,...studio};
 if(typeof query!=='string'||query.trim().length<3||query.length>170)throw Error('Invalid query');
 if(body.size!==undefined&&(typeof body.size!=='string'||body.size.length>40))throw Error('Invalid size');
 if(body.slot!==undefined&&body.slot!==''&&!SLOTS.includes(body.slot))throw Error('Invalid category');
 const max=Number(body.max);
 if(!Number.isFinite(max)||max<1||max>10000)throw Error('Invalid budget');
 return {query:query.trim(),max,size:body.size||'',slot:body.slot||'',country:'US',allowExternal:true,consent:body.consent===true,...(studio?{normalized:studio.normalized}:{})};
}
const states={not_configured:[503,'Research is not configured. Use catalog search.'],
 preview_only:[503,'Research is available in protected Preview only.'],
 budget_or_rate_limit:[429,'Research limit reached. Use catalog search and try another day.'],
 meter_unavailable:[503,'Research metering is unavailable. Use catalog search.'],
 settlement_failed:[503,'Research could not be confirmed. Use catalog search.'],
 failed_catalog_fallback:[503,'Research is temporarily unavailable. Use catalog search.'],
 busy_catalog_fallback:[429,'Research is busy. Use catalog search and try later.']};
export function researchResponse(result,normalized=null){
 const state=states[result.researchStatus];
 const sources=(result.research||[]).map(p=>({url:p.fields.productURL?.value,title:p.fields.title?.value,
  domain:p.retailer.name,kind:'product_page_reference',verifiedStock:false,verifiedPrice:false,cartEligible:false}));
 return json({...(normalized?{normalized}:{}),mode:'research_only',researchStatus:result.researchStatus,
  ...(state?{error:state[1]}:{}),sources:state?[]:sources,retailResearch:state?[]:researchSources(sources),
  summary:'',canAddToCart:false,note:'Research references only. Stock, price, sizing and delivery require retailer confirmation.'},state?.[0]||200);
}
export async function researchRequest(request,{authenticate=session,discover=discoverCommerce,limit=allowRequest}={}){
 const url=new URL(request.url),origin=request.headers.get('origin');
 if(origin&&origin!==url.origin)return json({error:'Cross-origin research denied.'},403);
 if(process.env.VERCEL_ENV!=='preview')return json({error:'Research is Preview-only.'},503);
 if(!limit(request,'commerce',20))return json({error:'Too many requests. Retry later.'},429);
 let body,input;
 try{const raw=await request.text();if(raw.length>4000)return json({error:'Request too large.'},413);body=JSON.parse(raw);input=researchInput(body);}catch(e){return json({error:e.status===422?e.message:'Enter a product query, exact size and valid budget.',...(e.normalized?{normalized:e.normalized}: {})},e.status===422?422:400);}
 if(!acceptsCode(body.betaCode,process.env.MATCHLATCH_BETA_CODE))return json({error:'Private beta access is required.'},403);
 try{
  const account=await authenticate(request);
  if(!account?.user?.id)return json({error:'Sign in to use research.'},401);
  if(!input.consent)return json({error:'Select the research consent checkbox first.'},400);
  // Store has already looked up inventory. Research cannot resolve private stock.
  return researchResponse(await discover(input,{account,retrieve:async()=>[]}),input.normalized);
 }catch{return json({error:'Research is unavailable. Check your query or use catalog search.'},503);}
}
