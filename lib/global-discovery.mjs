import {catalog,collectShopify,parseDiscoveryRequest} from './shopify-discovery.mjs';
export const DISCOVERY_CATEGORIES=Object.freeze(['hat','scarf','jacket','shirt','watch','belt','pants','socks','shoes']);
const terms={hat:'hat',scarf:'scarf',jacket:'jacket',shirt:'shirt',watch:'watch',belt:'belt',pants:'pants',socks:'socks',shoes:'sneakers'};
export function globalDiscoveryPolicy(env=process.env){
 let profileUrl=null;try{const u=new URL(env.MATCHLATCH_GLOBAL_CATALOG_PROFILE_URL);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&['matchlatch.company','www.matchlatch.company','matchlatch.vercel.app'].includes(u.hostname))profileUrl=u.href;}catch{}
 const reviewed=typeof env.MATCHLATCH_GLOBAL_CATALOG_DISPLAY_EVIDENCE==='string'&&env.MATCHLATCH_GLOBAL_CATALOG_DISPLAY_EVIDENCE.trim().length>=8;
 return {enabled:env.VERCEL_ENV==='preview'&&env.MATCHLATCH_GLOBAL_DISCOVERY_ENABLED==='true'&&Boolean(profileUrl)&&reviewed,ownerOnly:true,publicEnabled:false,profileUrl,aiProcessing:false,reason:'Global discovery requires a verified MATCHLATCH agent profile and reviewed display rights.'};
}
export async function boundedGlobalDiscovery({query,max,categories,size='',color=''}, {transport=catalog,profileUrl}={}){
 if(typeof query!=='string'||query.trim().length<2||query.length>110||/[\u0000-\u001f]/.test(query)||!Number.isFinite(max)||max<1||max>10000||!Array.isArray(categories)||!categories.length||categories.length>3||new Set(categories).size!==categories.length||categories.some(s=>!DISCOVERY_CATEGORIES.includes(s)))throw Error('INVALID_DISCOVERY');
 const intent=parseDiscoveryRequest(query,{max,size,color}),maxCents=intent.maxCents,found=[];
 // At most two simultaneous requests, three total; no retries or caching.
 for(let offset=0;offset<categories.length;offset+=2){
  const group=categories.slice(offset,offset+2);
  const outcomes=await Promise.allSettled(group.map(async slot=>{
   const data=await transport('search_catalog',{query:query.trim()+' '+terms[slot],filters:{available:true,ships_to:{country:'US'},condition:['new'],price:{max:maxCents}},context:{address_country:'US',currency:'USD'},pagination:{limit:10}},{profileUrl});
   return collectShopify(data,{...intent,legacySlot:slot}).items.filter(item=>item.merchant&&item.merchantId&&item.image).slice(0,4);
  }));found.push(...outcomes);
 }
 const items=[],seen=new Set();for(const outcome of found){if(outcome.status!=='fulfilled')continue;for(const item of outcome.value){const key=item.productId+'|'+item.variantId+'|'+item.merchantId;if(!seen.has(key)){seen.add(key);items.push({...item,checkoutUrl:'',nativeCheckoutEligible:false});}}}
 return {items,partial:found.some(o=>o.status==='rejected'),providerSucceeded:found.some(o=>o.status==='fulfilled'),requests:categories.length,checkedAt:new Date().toISOString(),source:'shopify_catalog',model:null,aiProcessing:false,note:'Individual merchandise prices. Shipping, taxes and delivery remain unverified. Listings are not reserved.'};
}
