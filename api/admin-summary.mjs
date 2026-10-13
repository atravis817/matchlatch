import {json,config} from '../lib/catalog-server.mjs';
import {allowRequest} from '../lib/request-limits.mjs';
import {collectMetrics} from '../lib/admin-data.mjs';
import {privateCatalogFixtures} from '../lib/catalog-fixtures.mjs';
import {authorizeOwner} from '../lib/owner-authorization.mjs';
import {runShopifyDiagnostic} from '../lib/shopify-diagnostic.mjs';
import {runShippingDiagnostic} from '../lib/shopify-shipping-diagnostic.mjs';
const cache=new Map(),pending=new Map();
export async function POST(request){
 if(process.env.VERCEL_ENV!=='preview')return json({error:'Not found'},404);
 if(new URL(request.url).searchParams.get('action')==='shopify-shipping')return runShippingDiagnostic(request);
 if(new URL(request.url).searchParams.get('action')!=='shopify-diagnostic')return json({error:'Unknown action'},404);
 return runShopifyDiagnostic(request);
}
export async function GET(request){
 if(process.env.VERCEL_ENV!=='preview')return json({error:'Not found'},404);
 if(!allowRequest(request,'admin-summary',30))return json({error:'Rate limited'},429);
 const gate=await authorizeOwner(request);if(gate.response)return gate.response;
 if(new URL(request.url).searchParams.get('fixtures')==='1')return json(privateCatalogFixtures());
 // Capability mode never loads metrics or uses a service-role credential.
 if(new URL(request.url).searchParams.get('capability')==='1')return json({commandCenter:true});
 const {owner}=gate;
 const days=Number(new URL(request.url).searchParams.get('days')||7);if(![1,7,30,90].includes(days))return json({error:'Choose 1, 7, 30 or 90 days'},400);
 try{const {base}=config(),key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return json({error:'Metrics service unavailable'},503);
  const cacheKey=owner+':'+days,hit=cache.get(cacheKey);if(hit&&hit.until>Date.now())return json({...hit.data,cache:{hit:true,maxAgeSeconds:45}});
  if(!pending.has(cacheKey))pending.set(cacheKey,collectMetrics({base,key,days}).then(data=>{if(cache.size>=4)cache.delete(cache.keys().next().value);cache.set(cacheKey,{data,until:Date.now()+45000});return data;}).finally(()=>pending.delete(cacheKey)));
  return json({...await pending.get(cacheKey),cache:{hit:false,maxAgeSeconds:45}});
 }catch(e){console.warn('Admin aggregate unavailable',e.name);return json({error:'Metrics temporarily unavailable'},503);}
}
