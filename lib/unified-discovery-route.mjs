import {json} from './catalog-server.mjs';
import {authorizeOwner} from './owner-authorization.mjs';
import {allowRequest} from './request-limits.mjs';
import {unifiedDiscovery,unifiedBrowse,unifiedPolicy} from './unified-discovery.mjs';
import {internalShopifySearch} from './shopify-internal-catalog.mjs';
export async function unifiedSearch(request){
 if(process.env.VERCEL_ENV!=='preview')return json({error:'Not found'},404);
 if(!allowRequest(request,'unified-discovery',8))return json({error:'Please wait before another product search.'},429);
 const u=new URL(request.url),gate=await authorizeOwner(request),owner=!gate.response;
 if(u.searchParams.get('mode')==='unified-capabilities')return json({enabled:unifiedPolicy().shopifyEvaluation,ownerEvaluation:owner&&unifiedPolicy().shopifyEvaluation,ownerOnly:true,publicShopify:false,aiProcessing:false,profileIdentity:'official_tutorial_profile',ownProfileStatus:'requires_profile_hosting_repair'});
 if(process.env.MATCHLATCH_SHOPIFY_FIRST_PHASE==='true'){
  try{return json(await internalShopifySearch({query:u.searchParams.get('q')||'',slot:u.searchParams.get('slot')||'all',max:Number(u.searchParams.get('max')||10000),size:u.searchParams.get('size')||'',sizeSystem:u.searchParams.get('sizeSystem')||'',color:u.searchParams.get('color')||'',brand:u.searchParams.get('brand')||'',sort:u.searchParams.get('sort')||'',needBy:u.searchParams.get('needBy')||'',offset:Number(u.searchParams.get('offset')||0),purpose:u.searchParams.get('context')?'recommendation':'display'}));}
  catch{return json({items:[],error:'Shopify-first catalog is awaiting isolated Preview configuration or valid search criteria.',sources:{shopifyInternal:{status:'unavailable',count:0},awin:{status:'disabled',count:0}},aiProcessing:false,allFailed:true},503);}
 }
 try{const result=await (u.searchParams.get('slot')==='all'?unifiedBrowse:unifiedDiscovery)({query:u.searchParams.get('q')||'',slot:u.searchParams.get('slot')||'shirt',max:Number(u.searchParams.get('max')||200),size:u.searchParams.get('size')||'',sizeSystem:u.searchParams.get('sizeSystem')||'',context:u.searchParams.get('context')||'',color:u.searchParams.get('color')||'',brand:u.searchParams.get('brand')||'',sort:u.searchParams.get('sort')||'',postal:u.searchParams.get('postal')||'',needBy:u.searchParams.get('needBy')||''},{owner});return json(result,result.allFailed?503:200);}catch(e){return json({error:'Choose one clothing category, exact constraints and a merchandise budget from $1 to $10,000.'},400);}
}
