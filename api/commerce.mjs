import {acceptsCode} from '../lib/research-route.mjs';
import {json,session,staffAccess} from '../lib/catalog-server.mjs';
import {allowRequest} from '../lib/request-limits.mjs';
import {discoverCommerce} from '../lib/commerce-discovery.mjs';
import {checkoutRequest} from '../lib/checkout-route.mjs';
export async function POST(request){
 if(new URL(request.url).searchParams.get('action')==='checkout')return checkoutRequest(request);
 if(process.env.VERCEL_ENV!=='preview')return json({error:'Shopping intelligence is available in Preview only.'},503);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Cross-origin research denied.'},403);
 if(!allowRequest(request,'commerce',20))return json({error:'Too many requests. Retry shortly.'},429);
 try{const raw=await request.text();if(raw.length>4000)return json({error:'Request too large.'},413);let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}if(!body||Array.isArray(body)||typeof body!=='object'||body.address||body.streetAddress)return json({error:'Use a country and optional ZIP; do not send a street address.'},400);
 if(body.allowExternal===true&&!acceptsCode(body.betaCode,process.env.MATCHLATCH_BETA_CODE))return json({error:'Private beta access is required for research.'},403);
 const account=await session(request),privateInventory=body.private===true;if(privateInventory&&!await staffAccess(account))return json({error:'Staff access required.'},403);
 const result=await discoverCommerce(body,{account,privateInventory});return json(result);
 }catch(e){return json({error:e.status?e.message:'Shopping intelligence is unavailable. Catalog search remains available.'},e.status||503);}
}
export const GET=()=>json({error:'Method not allowed'},405);
