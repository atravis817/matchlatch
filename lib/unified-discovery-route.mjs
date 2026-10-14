import {json} from './catalog-server.mjs';
import {authorizeOwner} from './owner-authorization.mjs';
import {allowRequest} from './request-limits.mjs';
import {unifiedDiscovery,unifiedPolicy} from './unified-discovery.mjs';
export async function unifiedSearch(request){
 if(process.env.VERCEL_ENV!=='preview')return json({error:'Not found'},404);
 if(!allowRequest(request,'unified-discovery',8))return json({error:'Please wait before another product search.'},429);
 const u=new URL(request.url),gate=await authorizeOwner(request),owner=!gate.response;
 if(u.searchParams.get('mode')==='unified-capabilities')return json({enabled:unifiedPolicy().shopifyEvaluation,ownerEvaluation:owner&&unifiedPolicy().shopifyEvaluation,ownerOnly:true,publicShopify:false,aiProcessing:false,profileIdentity:'official_tutorial_profile',ownProfileStatus:'requires_profile_hosting_repair'});
 try{const result=await unifiedDiscovery({query:u.searchParams.get('q')||'',slot:u.searchParams.get('slot')||'shirt',max:Number(u.searchParams.get('max')||200),size:u.searchParams.get('size')||'',sizeSystem:u.searchParams.get('sizeSystem')||'',context:u.searchParams.get('context')||'',color:u.searchParams.get('color')||'',brand:u.searchParams.get('brand')||'',sort:u.searchParams.get('sort')||'',postal:u.searchParams.get('postal')||'',needBy:u.searchParams.get('needBy')||''},{owner});return json(result,result.allFailed?503:200);}catch(e){return json({error:'Choose one clothing category, exact constraints and a merchandise budget from $1 to $10,000.'},400);}
}
