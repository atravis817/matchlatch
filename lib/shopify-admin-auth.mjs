// Server-only. Never import from browser entry points or return tokens to clients.
import {STORE_DOMAIN} from './shopify-storefront-adapter.mjs';
export function createAdminAuth({env=process.env,fetcher=fetch,now=Date.now}={}){
 const shop=env.SHOPIFY_STORE_DOMAIN,id=env.SHOPIFY_CLIENT_ID,secret=env.SHOPIFY_CLIENT_SECRET,legacy=env.SHOPIFY_ADMIN_READ_TOKEN;
 const valid=v=>typeof v==='string'&&v.length>0&&v.length<=4096&&!/[\s\x00-\x1f]/.test(v);
 if(shop!==STORE_DOMAIN||((id||secret)?!valid(id)||!valid(secret)||Boolean(legacy):!valid(legacy)))throw Error('shopify_admin_configuration_unavailable');
 let cached=null,pending=null;
 async function exchange(){
  try{
   const started=now();
   const response=await fetcher(`https://${shop}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:id,client_secret:secret}).toString(),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error();
   const reader=response.body?.getReader();if(!reader)throw Error();let bytes=0,chunks=[];
   try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>16384)throw Error();chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
   const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   const scopes=typeof data.scope==='string'?data.scope.split(/[ ,]+/).filter(Boolean):[];
   if(!valid(data.access_token)||!Number.isFinite(data.expires_in)||data.expires_in<=60||data.expires_in>86400||!['read_products','read_inventory'].every(s=>scopes.includes(s))||scopes.some(s=>!['read_products','read_inventory'].includes(s)))throw Error();
   cached={token:data.access_token,expiresAt:started+data.expires_in*1000};return cached.token;
  }catch{cached=null;throw Error('shopify_app_authentication_failed');}
 }
 return {async token(){if(legacy)return legacy;if(cached&&now()<cached.expiresAt-60000)return cached.token;if(!pending)pending=exchange().finally(()=>{pending=null;});return pending;},invalidate(token){if(cached?.token===token)cached=null;},mode:legacy?'read_token':'client_credentials'};
}
