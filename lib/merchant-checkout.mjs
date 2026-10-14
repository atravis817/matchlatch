// Authorized Storefront carts only. Global Catalog/Awin identifiers never grant cart access.
import {createCipheriv,createDecipheriv,randomBytes,createHash} from 'node:crypto';
import {STORE_DOMAIN,STOREFRONT_VERSION} from './shopify-storefront-adapter.mjs';
import {decodeRates} from './shopify-shipping-diagnostic.mjs';
import model from '../checkout-model.js';
export const VARIANTS_QUERY=`query CheckoutVariants($ids: [ID!]!) @inContext(country: US) { nodes(ids: $ids) { ... on ProductVariant { id availableForSale currentlyNotInStock quantityAvailable price { amount currencyCode } selectedOptions { name value } product { id onlineStoreUrl } } } }`;
const CART_FIELDS=`id checkoutUrl lines(first: 21) { nodes { quantity merchandise { ... on ProductVariant { id price { amount currencyCode } product { id } } } } pageInfo { hasNextPage } } cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } subtotalAmountEstimated totalAmountEstimated } delivery { addresses { selected address { ... on CartDeliveryAddress { countryCode provinceCode zip address1 address2 city } } } }`;
export const CREATE_QUERY=`mutation CheckoutCart($input: CartInput!) { cartCreate(input: $input) { cart { ${CART_FIELDS} } userErrors { code field } warnings { code } } }`;
export const CART_QUERY=`query CheckoutCartRead($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`;
export const RATES_QUERY=`query CheckoutRates($id: ID!) { cart(id: $id) { ... CheckoutRatesDeferred @defer } } fragment CheckoutRatesDeferred on Cart { deliveryGroups(first: 5, withCarrierRates: true) { nodes { id deliveryAddress { countryCodeV2 provinceCode zip address1 address2 city } selectedDeliveryOption { handle } deliveryOptions { handle title description estimatedCost { amount currencyCode } } } pageInfo { hasNextPage } } }`;
export const SELECT_QUERY=`mutation CheckoutDelivery($cartId: ID!, $options: [CartSelectedDeliveryOptionInput!]!) { cartSelectedDeliveryOptionsUpdate(cartId: $cartId, selectedDeliveryOptions: $options) { cart { ${CART_FIELDS} } userErrors { code field } warnings { code } } }`;
const fail=(message,status=409)=>{const e=Error(message);e.status=status;throw e;};
const clean=v=>typeof v==='string'?v.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,160):'';
export function checkoutConfig(env=process.env){
 let ids=[];try{ids=JSON.parse(env.MATCHLATCH_CHECKOUT_VARIANTS||'[]');}catch{}
 if(env.VERCEL_ENV!=='preview'||env.MATCHLATCH_CHECKOUT_ENABLED!=='true'||env.MATCHLATCH_CHECKOUT_PERMISSION_EVIDENCE?.trim().length<8||!env.MATCHLATCH_CHECKOUT_PERMISSION_EVIDENCE||!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(x=>!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(x))||!env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN||!/^.{32,}$/.test(env.MATCHLATCH_CHECKOUT_STATE_SECRET||''))return null;
 return {host:STORE_DOMAIN,token:env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN,variants:new Set(ids),secret:env.MATCHLATCH_CHECKOUT_STATE_SECRET};
}
export function validateInput(body,config){
 if(!body||!['prepare','refresh','select'].includes(body.operation)||body.merchant!==config.host||!Array.isArray(body.lines)||!body.lines.length||body.lines.length>20)fail('This retailer has no authorized cart integration.',403);
 const seen=new Set(),lines=body.lines.map(l=>{if(!l||!config.variants.has(l.variantId)||!/^gid:\/\/shopify\/Product\/\d+$/.test(l.productId||'')||model.quantity(l.quantity)===null||seen.has(l.variantId))fail('Choose distinct authorized variants and quantities from 1 to 20.',400);seen.add(l.variantId);return {productId:l.productId,variantId:l.variantId,quantity:model.quantity(l.quantity),size:clean(l.size),color:clean(l.color)};}).sort((a,b)=>a.variantId.localeCompare(b.variantId));
 const a=body.destination;if(!a||a.countryCode!=='US'||!/^[A-Z]{2}$/.test(a.provinceCode||'')||!/^\d{5}(?:-\d{4})?$/.test(a.zip||''))fail('Enter a US destination state and ZIP.',400);
 const destination={countryCode:'US',provinceCode:a.provinceCode,zip:a.zip};
 for(const field of ['address1','address2','city']){if(a[field]!==undefined&&(typeof a[field]!=='string'||a[field].length>160||/[\u0000-\u001f]/.test(a[field])))fail('Review the destination fields.',400);if(a[field]?.trim())destination[field]=a[field].trim();}
 return {lines,destination};
}
const contextKey=(user,lines,destination)=>createHash('sha256').update(JSON.stringify({user,lines,destination,host:STORE_DOMAIN})).digest('hex');
export function sealState(data,secret){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',createHash('sha256').update(secret).digest(),iv);const bytes=Buffer.concat([cipher.update(JSON.stringify(data)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),bytes]).toString('base64url');}
export function openState(token,secret,key,now=Date.now()){
 try{if(typeof token!=='string'||token.length>12000)throw Error();const b=Buffer.from(token,'base64url'),d=createDecipheriv('aes-256-gcm',createHash('sha256').update(secret).digest(),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));const s=JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString());if(s.key!==key||!Number.isFinite(s.expires)||s.expires<=now||!s.id?.startsWith('gid://shopify/Cart/'))throw Error();return s;}catch{fail('Cart quote expired or selections changed. Check shipping again.',409);}
}
async function transport(query,variables,config,fetcher){
 const r=await fetcher('https://'+config.host+'/api/'+STOREFRONT_VERSION+'/graphql.json',{method:'POST',headers:{'content-type':'application/json',Accept:'application/json, multipart/mixed','Shopify-Storefront-Private-Token':config.token},body:JSON.stringify({query,variables}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok)fail(r.status===429?'Retailer rate limit reached. Wait before trying again.':'Retailer cart access is unavailable.',r.status===429?429:502);
 if(!r.body)fail('Retailer response is incomplete.',502);const reader=r.body.getReader(),chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>256000){await reader.cancel();fail('Retailer response is incomplete.',502);}chunks.push(Buffer.from(value));}
 const text=Buffer.concat(chunks).toString('utf8');if(query===RATES_QUERY)return decodeRates(text,r.headers.get('content-type')||'');
 let data;try{data=JSON.parse(text);}catch{fail('Retailer response is incomplete.',502);}if(data.errors?.length)fail('Retailer permissions or cart query could not be verified.',502);return data.data;
}
function validateCart(cart,lines,destination,config){
 if(!cart?.id?.startsWith('gid://shopify/Cart/')||cart.lines?.pageInfo?.hasNextPage!==false||cart.lines?.nodes?.length!==lines.length)fail('Retailer cart contents could not be verified. No handoff prepared.');
 const seen=new Set();for(const line of cart.lines.nodes){const expected=lines.find(l=>l.variantId===line.merchandise?.id);if(!expected||seen.has(expected.variantId)||line.quantity!==expected.quantity||line.merchandise.product?.id!==expected.productId||line.merchandise.price?.currencyCode!=='USD'||model.cents(line.merchandise.price?.amount)===null)fail('Retailer changed a selected variant or quantity. No handoff prepared.');seen.add(expected.variantId);}
 const address=cart.delivery?.addresses?.find(a=>a.selected)?.address;
 if(!address||Object.entries(destination).some(([k,v])=>address[k]!==v))fail('Retailer did not accept this destination. More address information may be required.');
 const checkoutUrl=model.safeUrl(cart.checkoutUrl,{host:config.host,checkout:true});
 if(!checkoutUrl||!/^\/(?:cart|checkouts?)(?:\/|$)/.test(new URL(checkoutUrl).pathname))fail('Retailer checkout destination could not be verified.');
 return checkoutUrl;
}
export async function prepareMerchantCheckout(body,{user,config,fetcher=fetch,now=Date.now()}={}){
 const {lines,destination}=validateInput(body,config),key=contextKey(user,lines,destination);let state=body.state?openState(body.state,config.secret,key,now):null;
 if(body.operation!=='prepare'&&!state)fail('Check shipping before updating this cart.',400);
 // Query exact approved variants before any cart mutation. No Global Catalog ID conversion.
 const verified=await transport(VARIANTS_QUERY,{ids:lines.map(l=>l.variantId)},config,fetcher);
 if(!Array.isArray(verified?.nodes)||verified.nodes.length!==lines.length)fail('Selected availability could not be verified.');
 const variants=new Map();for(const v of verified.nodes||[]){if(!v?.id||variants.has(v.id))fail('Selected availability could not be verified.');variants.set(v.id,v);}
 for(const l of lines){const v=variants.get(l.variantId);if(!v||v.product?.id!==l.productId||v.availableForSale!==true||v.currentlyNotInStock!==false||!Number.isSafeInteger(v.quantityAvailable)||v.quantityAvailable<l.quantity||v.price?.currencyCode!=='USD'||model.cents(v.price?.amount)===null||!model.safeUrl(v.product.onlineStoreUrl,{host:config.host}))fail('The exact retailer variant or requested quantity is unavailable.');for(const [field,names] of [['size',['size','shoe size','waist size']],['color',['color','colour']]])if(l[field]&&!v.selectedOptions?.some(o=>names.includes(o.name?.toLowerCase())&&o.value===l[field]))fail('The selected '+field+' no longer matches.');}
 let cart;
 if(!state){const data=await transport(CREATE_QUERY,{input:{lines:lines.map(l=>({merchandiseId:l.variantId,quantity:l.quantity})),buyerIdentity:{countryCode:'US'},delivery:{addresses:[{selected:true,oneTimeUse:true,address:{deliveryAddress:destination}}]}}},config,fetcher);if(data?.cartCreate?.userErrors?.length||data?.cartCreate?.warnings?.length)fail('Retailer rejected the cart or destination. Review your selections.');cart=data?.cartCreate?.cart;}
 else {const d=await transport(CART_QUERY,{id:state.id},config,fetcher);cart=d?.cart;}
 validateCart(cart,lines,destination,config);
 const rawRates=await transport(RATES_QUERY,{id:cart.id},config,fetcher);
 if(rawRates.errors?.length||!rawRates.complete||!Array.isArray(rawRates.groups?.nodes)||rawRates.groups.pageInfo?.hasNextPage!==false)fail('Shipping rates are incomplete. Confirm shipping at the retailer.',502);
 for(const g of rawRates.groups.nodes){if(typeof g.id!=='string'||!g.id.startsWith('gid://shopify/CartDeliveryGroup/')||!g.deliveryAddress||Object.entries(destination).some(([k,v])=>g.deliveryAddress[k==='countryCode'?'countryCodeV2':k]!==v))fail('Shipping response does not match this cart destination.');}
 const deliveryGroups=rawRates.groups.nodes.map(g=>({id:g.id,selected:g.selectedDeliveryOption?.handle||null,options:(g.deliveryOptions||[]).map(o=>({handle:clean(o.handle),service:clean(o.title),description:clean(o.description),amountCents:o.estimatedCost?.currencyCode==='USD'?model.cents(o.estimatedCost.amount):null,currency:o.estimatedCost?.currencyCode,guaranteed:false})).filter(o=>o.handle&&o.service&&o.currency==='USD'&&o.amountCents!==null)}));
 if(body.operation==='select'){
  const choices=body.options;if(!Array.isArray(choices)||choices.length!==deliveryGroups.length||new Set(choices.map(x=>x.deliveryGroupId)).size!==choices.length||choices.some(c=>!deliveryGroups.find(g=>g.id===c.deliveryGroupId)?.options.some(o=>o.handle===c.deliveryOptionHandle)))fail('Choose a current shipping option for every delivery group.',400);
  const d=await transport(SELECT_QUERY,{cartId:cart.id,options:choices},config,fetcher);if(d?.cartSelectedDeliveryOptionsUpdate?.userErrors?.length||d?.cartSelectedDeliveryOptionsUpdate?.warnings?.length)fail('Retailer could not accept the shipping selection.');cart=d?.cartSelectedDeliveryOptionsUpdate?.cart;
  for(const g of deliveryGroups)g.selected=choices.find(c=>c.deliveryGroupId===g.id).deliveryOptionHandle;
 }
 const checkoutUrl=validateCart(cart,lines,destination,config),cost=cart.cost||{},money=m=>m?.currencyCode==='USD'?model.cents(m.amount):null;
 const selected=deliveryGroups.length&&deliveryGroups.every(g=>g.options.some(o=>o.handle===g.selected));
 const shippingCents=selected?deliveryGroups.reduce((n,g)=>n+g.options.find(o=>o.handle===g.selected).amountCents,0):null;
 const subtotalCents=money(cost.subtotalAmount),taxCents=null;
 const knownTotal=subtotalCents!==null&&shippingCents!==null&&taxCents!==null;
 return {status:deliveryGroups.some(g=>g.options.length)?'quote_ready':'more_information_required',merchant:config.host,currency:'USD',state:sealState({id:cart.id,key,expires:now+300000},config.secret),checkedAt:new Date(now).toISOString(),expiresAt:new Date(now+300000).toISOString(),deliveryGroups,shippingCents,subtotalCents,taxCents,estimatedTotalCents:knownTotal?subtotalCents+shippingCents+taxCents:null,merchantReportedTotalCents:money(cost.totalAmount),checkoutUrl,lines:cart.lines.nodes.map(l=>({variantId:l.merchandise.id,productId:l.merchandise.product.id,quantity:l.quantity,priceCents:money(l.merchandise.price)})),guaranteed:false,orderPlaced:false,affiliateWrapped:false};
}
