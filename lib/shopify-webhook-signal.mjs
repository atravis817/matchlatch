import {createHmac,timingSafeEqual} from 'node:crypto';
// Optional signal preparation only. No webhook registration, mutation or
// delivery endpoint is enabled. Nightly reconciliation remains authoritative.
export function verifyWebhook({body,signature,secret,shop,topic,eventId}){
 if(shop!=='pfcdgt-is.myshopify.com'||!['products/create','products/update','products/delete'].includes(topic)||!Buffer.isBuffer(body)||body.length>1024*1024||typeof secret!=='string'||secret.length<32||typeof signature!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(signature)||typeof eventId!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(eventId))return null;
 const expected=createHmac('sha256',secret).update(body).digest(),received=Buffer.from(signature,'base64');if(expected.length!==received.length||!timingSafeEqual(expected,received))return null;
 let payload;try{payload=JSON.parse(body);}catch{return null;}
 const numeric=String(payload.id||'');if(!/^\d{1,20}$/.test(numeric))return null;
 // Retain identifiers only, never full product/customer/event bodies. Deleted
 // events are reconciliation hints, not an out-of-order destructive mutation.
 return {shop,eventId,topic,productId:'gid://shopify/Product/'+numeric,updatedAt:Number.isFinite(Date.parse(payload.updated_at))?new Date(payload.updated_at).toISOString():null};
}
export function mergeSignals(existing,incoming){
 const events=new Map(existing.map(e=>[e.shop+'|'+e.eventId,e]));
 for(const signal of incoming)if(!events.has(signal.shop+'|'+signal.eventId))events.set(signal.shop+'|'+signal.eventId,signal);
 return [...events.values()];
}
