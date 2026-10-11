import {json} from '../lib/catalog-server.mjs';
import {allowRequest} from '../lib/request-limits.mjs';
import {authorizeOwner} from '../lib/owner-authorization.mjs';
export async function GET(request){
 if(process.env.VERCEL_ENV!=='preview')return json({error:'Not found'},404);
 if(!allowRequest(request,'owner-access',30))return json({error:'Rate limited'},429);
 const gate=await authorizeOwner(request);if(gate.response)return gate.response;
 // Capability only: no UUIDs, identity metadata, metrics or service-role access.
 return json({commandCenter:true});
}
