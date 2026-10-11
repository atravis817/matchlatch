import {json,session,config} from '../lib/catalog-server.mjs';
import {allowRequest} from '../lib/request-limits.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const count=async(path,token,base,key)=>{
 const response=await fetch(base+'/rest/v1/'+path,{
  headers:{apikey:key,Authorization:'Bearer '+token,Prefer:'count=exact',Range:'0-0'},
  cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)
 });
 if(!response.ok)throw Error('metrics_unavailable');
 const range=response.headers.get('content-range')||'';
 const n=Number(range.split('/')[1]);
 if(!Number.isSafeInteger(n)||n<0)throw Error('metrics_count_unavailable');
 return n;
};
export async function GET(request){
 if(process.env.VERCEL_ENV!=='preview')return json({error:'Not found'},404);
 if(!allowRequest(request,'admin-summary',30))return json({error:'Rate limited'},429);
 const owner=(process.env.MATCHLATCH_ADMIN_USER_ID||'').trim();
 if(!uuid.test(owner))return json({error:'Owner dashboard not configured'},503);
 const account=await session(request).catch(()=>null);
 if(!account||account.user.id.toLowerCase()!==owner.toLowerCase())return json({error:'Forbidden'},403);
 try{
  const base=config().base;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)return json({error:'Metrics service unavailable'},503);
  const now=new Date();
  const since=new Date(now.getTime()-7*86400000).toISOString();
  const c=path=>count(path,key,base,key);
  const [products,publicProducts,eligible,available,usersWithRecords,looks,aiRequests,aiCompleted,aiFailed]=await Promise.all([
   c('matchlatch_awin_products?select=id'),
   c('matchlatch_awin_products?select=id&is_public=eq.true'),
   c('matchlatch_awin_products?select=id&is_public=eq.true&shipping_us_eligible=eq.true&available=eq.true'),
   c('matchlatch_awin_products?select=id&available=eq.true'),
   c('matchlatch_records?select=user_id&is_deleted=eq.false'),
   c('matchlatch_records?select=user_id&kind=eq.looks&is_deleted=eq.false'),
   c('matchlatch_ai_usage?select=id&created_at=gte.'+encodeURIComponent(since)),
   c('matchlatch_ai_usage?select=id&created_at=gte.'+encodeURIComponent(since)+'&outcome=eq.completed'),
   c('matchlatch_ai_usage?select=id&created_at=gte.'+encodeURIComponent(since)+'&outcome=eq.failed')
  ]);
  return json({environment:'preview',generatedAt:now.toISOString(),period:'7d',
   catalog:{imported:products,public:publicProducts,eligible,listedAvailable:available},
   activity:{savedRecordRows:usersWithRecords,savedLookRows:looks},
   ai:{requests:aiRequests,completed:aiCompleted,failed:aiFailed},
   unavailable:['unique visitors','active users','page views','bug events','retailer clicks','confirmed sales','revenue'],
   note:'Only real database counts are shown. User count cannot be inferred from record counts. No analytics or sales tracking is installed yet.'});
 }catch(e){console.warn('Admin aggregate unavailable',e.name);return json({error:'Metrics temporarily unavailable'},503);}
}
