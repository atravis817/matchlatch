import {authorizeOwner} from './owner-authorization.mjs';
import {json} from './catalog-server.mjs';
import {allowRequest} from './request-limits.mjs';
import {runShopifyDiagnostic,VARIANT_ID,sanitizedGraphqlErrors} from './shopify-diagnostic.mjs';
import {STORE_DOMAIN,STOREFRONT_VERSION} from './shopify-storefront-adapter.mjs';
export const CREATE_QUERY=`mutation ShippingTestCart($input: CartInput!) { cartCreate(input: $input) { cart { id lines(first: 2) { nodes { quantity merchandise { ... on ProductVariant { id price { amount currencyCode } } } } } delivery { addresses { selected address { ... on CartDeliveryAddress { countryCode provinceCode zip } } } } } userErrors { code field } warnings { code } } }`;
export const RATES_QUERY=`query ShippingTestRates($id: ID!) { cart(id: $id) { ... ShippingRates @defer } } fragment ShippingRates on Cart { deliveryGroups(first: 5, withCarrierRates: true) { nodes { deliveryOptions { title description estimatedCost { amount currencyCode } } } pageInfo { hasNextPage endCursor } } }`;
const baseline={cartCreation:'unverified',destinationAccepted:false,shippingOptions:[],tax:'unknown',orderInitiated:false,paymentInitiated:false,checkoutActivated:false};
const safeFields=new Set(['countryCode','provinceCode','zip','address1','address2','city','firstName','lastName','phone','email','delivery','addresses','buyerIdentity','lines','merchandiseId','quantity']);
const safeCodes=new Set(['ACCESS_DENIED','INVALID','INVALID_ADDRESS','INVALID_COUNTRY_CODE','INVALID_PROVINCE_CODE','INVALID_ZIP','MISSING_ADDRESS','MISSING_DELIVERY_ADDRESS','INVALID_MERCHANDISE_LINE','MERCHANDISE_NOT_FOUND','INSUFFICIENT_STOCK','UNAUTHENTICATED']);
const userErrors=errors=>(Array.isArray(errors)?errors:[]).slice(0,5).map(e=>({code:safeCodes.has(e?.code)?e.code:'UNCLASSIFIED',fields:(Array.isArray(e?.field)?e.field:[]).filter(f=>safeFields.has(f))}));
export function decodeRates(text,contentType){
 if(!contentType.includes('multipart/mixed')){const p=JSON.parse(text);return {groups:p?.data?.cart?.deliveryGroups,errors:p?.errors,complete:p?.hasNext!==true};}
 const boundary=contentType.match(/boundary="?([A-Za-z0-9_-]{1,80})"?/)?.[1];if(!boundary)throw Error('response');
 let groups,errors=[],complete=false;
 for(const part of text.split('--'+boundary).slice(1,20)){
  const start=part.indexOf('{');if(start<0)continue;const p=JSON.parse(part.slice(start).trim());
  if(Array.isArray(p.errors))errors.push(...p.errors);if(p.data?.cart?.deliveryGroups)groups=p.data.cart.deliveryGroups;
  for(const patch of p.incremental||[]){if(Array.isArray(patch.errors))errors.push(...patch.errors);if(JSON.stringify(patch.path)==='["cart"]'&&patch.data?.deliveryGroups)groups=patch.data.deliveryGroups;}
  if(p.hasNext===false)complete=true;
 }
 return {groups,errors,complete};
}
async function requestProvider(query,variables,token,timeout=8000){
 const r=await fetch(`https://${STORE_DOMAIN}/api/${STOREFRONT_VERSION}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, multipart/mixed','Shopify-Storefront-Private-Token':token},body:JSON.stringify({query,variables}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(timeout)});
 if(!r.ok)return {httpStatus:r.status,category:[401,403].includes(r.status)?'authorization_denied':r.status===429?'rate_limited':'provider_failure'};
 if(!r.body)return {httpStatus:r.status,category:'invalid_response'};
 const reader=r.body.getReader(),chunks=[];let bytes=0;while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>128000){await reader.cancel();return {httpStatus:r.status,category:'invalid_response'};}chunks.push(Buffer.from(value));}
 return {httpStatus:r.status,text:Buffer.concat(chunks).toString('utf8'),contentType:r.headers.get('content-type')||''};
}
export async function runShippingDiagnostic(request){
 if(process.env.VERCEL_ENV!=='preview')return json({error:'Not found'},404);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Forbidden'},403);
 const gate=await authorizeOwner(request).catch(()=>({response:json({error:'Forbidden'},403)}));if(gate.response)return gate.response;
 if(!allowRequest(request,'shipping-quote',1))return json({error:'Rate limited'},429);
 let cartCreation='not_attempted',destinationAccepted=false;
 const report=(extra,status=200)=>json({...baseline,cartCreation,destinationAccepted,...extra},status);
 try{
  const verification=await runShopifyDiagnostic(request);if(!verification.ok)return report({category:'product_verification_failed'},502);
  const product=await verification.json();if(!product.variantFound||!product.sizeS||product.availableForSale!==true||product.currentlyNotInStock!==false||!Number.isSafeInteger(product.quantityAvailable)||product.quantityAvailable<1||product.price?.currency!=='USD')return report({category:'variant_not_qualified'});
  const token=process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN;
  const input={lines:[{merchandiseId:VARIANT_ID,quantity:1}],buyerIdentity:{countryCode:'US'},delivery:{addresses:[{selected:true,oneTimeUse:true,address:{deliveryAddress:{countryCode:'US',provinceCode:'GA',zip:'30004'}}}]}};
  cartCreation='unverified'; // Never retry a mutation after a timeout or ambiguous response.
  const created=await requestProvider(CREATE_QUERY,{input},token);if(created.category)return report({category:created.category,httpStatus:created.httpStatus},502);
  const payload=JSON.parse(created.text);if(payload?.errors?.length)return report({category:'graphql_rejected',graphqlErrors:sanitizedGraphqlErrors(payload.errors)},502);
  const result=payload?.data?.cartCreate,cart=result?.cart;
  if(typeof cart?.id==='string'&&cart.id.startsWith('gid://shopify/Cart/'))cartCreation='pass';
  if(result?.userErrors?.length||result?.warnings?.length)return report({category:'cart_or_address_rejected',errors:userErrors(result.userErrors),warnings:userErrors(result.warnings)});
  if(cartCreation!=='pass')return report({category:'invalid_response'},502);
  const lines=cart.lines?.nodes;if(!Array.isArray(lines)||lines.length!==1||lines[0].quantity!==1||lines[0].merchandise?.id!==VARIANT_ID||lines[0].merchandise.price?.currencyCode!=='USD')return report({category:'cart_line_mismatch'});
  destinationAccepted=cart.delivery?.addresses?.some(a=>a.selected===true&&a.address?.countryCode==='US'&&a.address?.provinceCode==='GA'&&a.address?.zip==='30004')===true;
  if(!destinationAccepted)return report({category:'minimum_address_not_accepted'});
  const rates=await requestProvider(RATES_QUERY,{id:cart.id},token,15000);if(rates.category)return report({category:rates.category,httpStatus:rates.httpStatus},502);
  const decoded=decodeRates(rates.text,rates.contentType);
  if(decoded.errors?.length)return report({category:'graphql_rejected',graphqlErrors:sanitizedGraphqlErrors(decoded.errors)},502);
  if(!decoded.complete||!Array.isArray(decoded.groups?.nodes)||decoded.groups.pageInfo?.hasNextPage!==false)return report({category:'rates_incomplete'});
  const safeText=value=>typeof value==='string'&&!value.includes(token)?value.replace(/[\u0000-\u001f]/g,' ').slice(0,160):null;
  const options=decoded.groups.nodes.flatMap(g=>g.deliveryOptions||[]).slice(0,20).map(o=>({service:safeText(o.title),description:safeText(o.description),amount:/^\d+(?:\.\d{1,2})?$/.test(o.estimatedCost?.amount||'')?o.estimatedCost.amount:null,currency:o.estimatedCost?.currencyCode==='USD'?'USD':null,transitEstimate:null})).filter(o=>o.service&&o.amount!==null&&o.currency);
  return report({category:options.length?'rates_returned':'no_rates_returned',shippingOptions:options,merchandisePrice:product.price,observedAt:new Date().toISOString(),shippingEligibility:options.length?'quote_for_submitted_partial_destination':'unverified',cartPriceChanged:lines[0].merchandise.price.amount!==product.price.amount.toFixed(2),guaranteed:false});
 }catch{return report({category:'transport_or_invalid_response'},502);}
}
