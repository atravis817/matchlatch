import {json,session} from './catalog-server.mjs';
import {allowRequest} from './request-limits.mjs';
import {checkoutConfig,prepareMerchantCheckout} from './merchant-checkout.mjs';
export async function checkoutRequest(request){
 if(process.env.VERCEL_ENV!=='preview')return json({error:'Not found'},404);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Same-origin checkout request required.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required.'},415);
 if(!allowRequest(request,'checkout',6))return json({error:'Please wait before checking shipping again.'},429);
 try{
  const account=await session(request);if(!account||!account.user.email_confirmed_at)return json({error:'Sign in with a verified account to prepare a retailer cart.'},401);
  const config=checkoutConfig();if(!config)return json({error:'Retailer cart and shipping access have not been authorized. Purchases remain disabled in this Preview.',code:'CHECKOUT_NOT_AUTHORIZED'},403);
  const raw=await request.text();if(raw.length>20000)return json({error:'Request too large.'},413);let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
  return json(await prepareMerchantCheckout(body,{user:account.user.id,config}));
 }catch(e){return json({error:e.status?e.message:'Retailer cart preparation could not be verified. No automatic mutation retry was attempted.'},e.status||502);}
}
