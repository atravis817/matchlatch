import './studio-request.js';
const studioNormalizer=globalThis.MatchlatchStudioRequest;
import {storeSession} from './store-session.mjs';
const messages={422:'Clarify conflicting or unsupported Studio constraints before searching.',400:'Review your product query, budget and research consent.',401:'Sign in to MATCHLATCH on this hostname, then try research.',403:'Private beta research access was not accepted.',429:'Research limit reached or service busy. Use catalog search and try later.',503:'Research is unavailable or not configured. Use catalog search.'};
const states={not_configured:'Research is not configured for this Preview. Use catalog search.',
 meter_unavailable:'Research metering is unavailable. Use catalog search.',
 settlement_failed:'Research could not be confirmed. Use catalog search.',
 budget_or_rate_limit:'Research limit reached. Use catalog search and try another day.',
 busy_catalog_fallback:'Research is busy. Use catalog search and try later.',
 failed_catalog_fallback:'The research provider is unavailable. Use catalog search.'};
export async function requestResearch({query,max,size,slot,consent,betaCode,studioRequest},{session=storeSession,fetcher=fetch,current=()=>true}={}){
 if(studioRequest!==undefined){const resolved=studioNormalizer.studioSearchInput(studioRequest);({query,max,size,slot}=resolved);}
 if(consent!==true)throw Error('Select the research consent checkbox first.');
 const before=await session();
 if(!before?.user?.id||!before.access_token)throw Error(messages[401]);
 if(!current())return null;
 let r,found;
 try{r=await fetcher('/api/discover',{method:'POST',cache:'no-store',redirect:'error',credentials:'same-origin',signal:AbortSignal.timeout(25000),
  headers:{'content-type':'application/json',Authorization:'Bearer '+before.access_token},
  body:JSON.stringify({q:query,max,size,slot,consent:true,betaCode,...(studioRequest===undefined?{}:{studioRequest})})});
 found=await r.json();
 }catch{throw Error('Research could not be reached. Use catalog search.');}
 if(!current())return null;
 const after=await session();
 if(after?.user?.id!==before.user.id||!current())return null;
 if(!r.ok){const error=Error(states[found?.researchStatus]||messages[r.status]||'Research is temporarily unavailable. Use catalog search.');if(r.status===422)error.normalized=found?.normalized;throw error;}
 if(found.mode!=='research_only'||found.canAddToCart!==false)throw Error('Research returned an unsupported response. Use catalog search.');
 return found;
}
