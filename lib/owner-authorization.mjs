import {json,session} from './catalog-server.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
// Shared server gate. Never authorize using email, display name or user_metadata.
export async function authorizeOwner(request){
 if(process.env.VERCEL_ENV!=='preview')return {response:json({error:'Not found'},404)};
 const owner=(process.env.MATCHLATCH_ADMIN_USER_ID||'').trim();
 if(!uuid.test(owner))return {response:json({error:'Owner dashboard not configured'},503)};
 const account=await session(request).catch(()=>null);
 if(!account||!account.user.email_confirmed_at||account.user.id.toLowerCase()!==owner.toLowerCase())return {response:json({error:'Forbidden'},403)};
 return {owner,account};
}
