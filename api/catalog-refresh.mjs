import {timingSafeEqual} from 'node:crypto';
import {run} from '../scripts/awin-import.mjs';
import {safeError} from '../scripts/awin-feed-utils.mjs';
export const maxDuration=300;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
let running=false;
export async function POST(request){
 if(process.env.MATCHLATCH_SHOPIFY_FIRST_PHASE==='true')return json({error:'Awin imports are frozen during Shopify validation.'},503);
 const expected=process.env.MATCHLATCH_REFRESH_SECRET,received=request.headers.get('authorization')||'';
 if(process.env.VERCEL_ENV!=='preview'||!expected)return json({error:'Worker unavailable'},503);
 const a=Buffer.from(received),b=Buffer.from('Bearer '+expected);
 if(a.length!==b.length||!timingSafeEqual(a,b))return json({error:'Unauthorized'},401);
 if(process.env.MATCHLATCH_REFRESH_WRITES_ENABLED!=='true')return json({error:'Shared-database refresh is paused pending owner approval.'},503);
 if(running)return json({error:'A refresh is already running.'},409);
 running=true;
 try{
  const result=await run({write:true,full:true,accessibleTestFeeds:true});
  return json({ok:true,results:result.import_results});
 }catch(e){console.error('Private refresh failed:',safeError(e));return json({error:'Private refresh failed. Inspect protected import history.'},502);}
 finally{running=false;}
}
export const GET=()=>json({error:'Method not allowed'},405);
