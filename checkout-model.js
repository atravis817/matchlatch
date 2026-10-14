/* Shared checkout calculations. No network, account data or provider mutations. */
(function(root){
 'use strict';
 const quantity=value=>value===undefined?1:Number.isSafeInteger(Number(value))&&Number(value)>=1&&Number(value)<=20?Number(value):null;
 const cents=value=>{if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=1000000&&Math.abs(n*100-Math.round(n*100))<0.000001?Math.round(n*100):null;};
 function safeUrl(value,{host,checkout=false}={}){
  try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||u.hostname==='localhost'||/^\d+(?:\.\d+){3}$/.test(u.hostname)||!u.hostname.includes('.'))return '';
   if(host&&u.hostname!==host)return '';
   if(!checkout&&(/\/(?:checkouts?|cart|account|login|auth|payment|oauth)(?:\/|$)/i.test(u.pathname)||/^awin[12]?\.com$/.test(u.hostname)||u.hostname.endsWith('.awin1.com')))return '';
   for(const k of u.searchParams.keys())if(/^(?:redirect|redirect_uri|return_url|url|access_token|token|email|password)$/i.test(k))return '';
   return u.href;
  }catch{return '';}
 }
 const destination=item=>safeUrl(item?.merchantProductUrl||item?.productUrl);
 const identity=item=>{const u=destination(item);return item?.shopRef?.productId&&item?.shopRef?.variantId&&u?new URL(u).hostname+'|'+String(item.merchantId||item.shopRef.merchantId||'')+'|'+item.shopRef.productId+'|'+item.shopRef.variantId:null;};
 function groupCart(cart){
  const groups=new Map(),unresolved=[];
  for(const item of cart||[]){const u=destination(item),price=cents(item.target),q=quantity(item.quantity);
   if(!identity(item)||item.currency!=='USD'||price===null||q===null){unresolved.push(item);continue;}
   const host=new URL(u).hostname,merchantId=String(item.merchantId||item.shopRef.merchantId||host),key=merchantId+'|'+host;
   if(!groups.has(key))groups.set(key,{key,host,merchantId,merchant:item.retailer||host,currency:'USD',items:[],subtotalCents:0,units:0});
   const g=groups.get(key);g.items.push(item);g.subtotalCents+=price*q;g.units+=q;
  }
  return {groups:[...groups.values()],unresolved,subtotalCents:[...groups.values()].reduce((n,g)=>n+g.subtotalCents,0)};
 }
 const fingerprint=(group,destination={})=>JSON.stringify({merchant:group.key,lines:group.items.map(i=>[identity(i),quantity(i.quantity),cents(i.target),i.size||'',i.color||'',i.variant||'']).sort((a,b)=>a[0].localeCompare(b[0])),destination});
 const fresh=(at,now=Date.now())=>Number.isFinite(Date.parse(at))&&Date.parse(at)<=now&&now-Date.parse(at)<=300000;
 function matchVerified(item,live){
  if(!live||live.productId!==item.shopRef?.productId||live.variantId!==item.shopRef?.variantId||live.currency!==item.currency||live.available!==true||cents(live.price)===null)throw Error('The selected product or variant is no longer verified.');
  const original=destination(item),current=safeUrl(live.merchantProductUrl||live.url);
  if(!original||!current||new URL(current).hostname!==new URL(original).hostname||(item.merchantId&&live.merchantId!==item.merchantId))throw Error('The retailer association changed. Choose the item again.');
  for(const k of ['size','color'])if(item[k]&&String(live[k]||'')!==String(item[k]))throw Error('The selected '+k+' changed. Choose the item again.');
  if(!fresh(live.checkedAt))throw Error('Availability information expired. Check this item again.');
  return {productUrl:current,priceCents:cents(live.price),priceChanged:cents(live.price)!==cents(item.target),feedOnly:live.stockVerifiedLive===false};
 }
 const api={quantity,cents,safeUrl,destination,identity,groupCart,fingerprint,fresh,matchVerified};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.MatchlatchCheckoutModel=Object.freeze(api);
})(typeof window==='object'?window:globalThis);
