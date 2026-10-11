import {json,session,config} from '../lib/catalog-server.mjs';
import {allowRequest} from '../lib/request-limits.mjs';
import {collectMetrics} from '../lib/admin-data.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const cache=new Map(),pending=new Map();
export async function GET(request){
 if(process.env.VERCEL_ENV!=='preview')return json({error:'Not found'},404);
 if(!allowRequest(request,'admin-summary',30))return json({error:'Rate limited'},429);
 const owner=(process.env.MATCHLATCH_ADMIN_USER_ID||'').trim();if(!uuid.test(owner))return json({error:'Owner dashboard not configured'},503);
 const account=await session(request).catch(()=>null);if(!account||!account.user.email_confirmed_at||account.user.id.toLowerCase()!==owner.toLowerCase())return json({error:'Forbidden'},403);
 const days=Number(new URL(request.url).searchParams.get('days')||7);if(![1,7,30,90].includes(days))return json({error:'Choose 1, 7, 30 or 90 days'},400);
 try{const {base}=config(),key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return json({error:'Metrics service unavailable'},503);
  const cacheKey=owner+':'+days,hit=cache.get(cacheKey);if(hit&&hit.until>Date.now())return json({...hit.data,cache:{hit:true,maxAgeSeconds:45}});
  if(!pending.has(cacheKey))pending.set(cacheKey,collectMetrics({base,key,days}).then(data=>{if(cache.size>=4)cache.delete(cache.keys().next().value);cache.set(cacheKey,{data,until:Date.now()+45000});return data;}).finally(()=>pending.delete(cacheKey)));
  return json({...await pending.get(cacheKey),cache:{hit:false,maxAgeSeconds:45}});
 }catch(e){console.warn('Admin aggregate unavailable',e.name);return json({error:'Metrics temporarily unavailable'},503);}
}
