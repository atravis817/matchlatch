import {timingSafeEqual} from 'node:crypto';
import {run} from '../scripts/awin-import.mjs';
import {safeError} from '../scripts/awin-feed-utils.mjs';
export const maxDuration=300;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export async function POST(request){
 const expected=process.env.MATCHLATCH_REFRESH_SECRET,received=request.headers.get('authorization')||'';
 if(process.env.VERCEL_ENV!=='preview'||!expected)return json({error:'Worker unavailable'},503);
 const a=Buffer.from(received),b=Buffer.from('Bearer '+expected);
 if(a.length!==b.length||!timingSafeEqual(a,b))return json({error:'Unauthorized'},401);
 try{
  const result=await run({write:true,full:true,accessibleTestFeeds:true});
  return json({ok:true,results:result.import_results});
 }catch(e){console.error('Private refresh failed:',safeError(e));return json({error:'Private refresh failed. Inspect protected import history.'},502);}
}
export const GET=()=>json({error:'Method not allowed'},405);
