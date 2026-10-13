import {authorizeOwner} from './owner-authorization.mjs';
import {json} from './catalog-server.mjs';
import {allowRequest} from './request-limits.mjs';
import {prepareStorefrontRecords,STORE_DOMAIN,STOREFRONT_VERSION} from './shopify-storefront-adapter.mjs';
export const PRODUCT_ID='gid://shopify/Product/15499321999554';
export const VARIANT_ID='gid://shopify/ProductVariant/67768739332290';
export const QUERY=`query MatchlatchDiagnostic($id: ID!) @inContext(country: US) {
 product(id: $id) { id title vendor productType onlineStoreUrl
  variants(first: 20) { nodes { id title availableForSale currentlyNotInStock quantityAvailable
   price { amount currencyCode } selectedOptions { name value } image { url altText }
  } pageInfo { hasNextPage endCursor } }
 }
}`;
const failure=(category,status=502,httpStatus=null)=>json({authentication:'unverified',category,httpStatus},status);
export function sanitizedGraphqlErrors(errors){
 const codes=new Set(['ACCESS_DENIED','UNAUTHENTICATED','THROTTLED','GRAPHQL_VALIDATION_FAILED','undefinedField','accessDenied','argumentNotAccepted','variableRequiresValidType']);
 const fields=new Set(['product','variants','id','title','vendor','productType','onlineStoreUrl','availableForSale','currentlyNotInStock','quantityAvailable','price','amount','currencyCode','selectedOptions','name','value','image','url','altText','pageInfo','hasNextPage','endCursor']);
 return errors.slice(0,5).map(e=>({code:codes.has(e?.extensions?.code)?e.extensions.code:'UNCLASSIFIED',fields:[...new Set([...(Array.isArray(e?.path)?e.path:[]),e?.extensions?.fieldName].filter(f=>fields.has(f)))],missingScopes:[...new Set((typeof e?.message==='string'?e.message:'').match(/\bunauthenticated_read_product_(?:inventory|listings)\b/g)||[])]}));
}
export async function runShopifyDiagnostic(request){
 if(process.env.VERCEL_ENV!=='preview')return json({error:'Not found'},404);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Forbidden'},403);
 const gate=await authorizeOwner(request).catch(()=>({response:json({error:'Forbidden'},403)}));
 if(gate.response)return gate.response;
 if(!allowRequest(request,'shopify-diagnostic',3))return json({error:'Rate limited'},429);
 const domain=process.env.SHOPIFY_STORE_DOMAIN,version=process.env.SHOPIFY_STOREFRONT_API_VERSION,token=process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN;
 if(!token||domain!==STORE_DOMAIN||version!==STOREFRONT_VERSION||/[\r\n]/.test(token))return failure('configuration_unavailable',503);
 try{
  // Owner operational diagnostic, not buyer traffic. No buyer IP is forwarded.
  const upstream=await fetch(`https://${domain}/api/${version}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','Shopify-Storefront-Private-Token':token},body:JSON.stringify({query:QUERY,variables:{id:PRODUCT_ID}}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!upstream.ok)return json({authentication:[401,403].includes(upstream.status)?'fail':'unverified',httpStatus:upstream.status,category:[401,403].includes(upstream.status)?'authorization_denied':upstream.status===429?'upstream_rate_limited':'upstream_failure'},502);
  const length=Number(upstream.headers.get('content-length'));if(length>128000)return failure('invalid_response',502,upstream.status);
  if(!upstream.body)return failure('invalid_response',502,upstream.status);
  const reader=upstream.body.getReader(),chunks=[];let bytes=0;
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>128000){await reader.cancel();return failure('invalid_response',502,upstream.status);}chunks.push(Buffer.from(value));}
  let payload;try{payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return failure('invalid_response',502,upstream.status);}
  if(payload?.errors?.length){if(!Array.isArray(payload.errors))return failure('invalid_response',502,upstream.status);return json({authentication:payload.errors.some(e=>e?.extensions?.code==='UNAUTHENTICATED')?'fail':'unverified',queryValidity:'rejected',productVisibility:'unverified',category:'graphql_rejected',httpStatus:upstream.status,graphqlErrors:sanitizedGraphqlErrors(payload.errors)},502);}
  if(!payload?.data||!Object.hasOwn(payload.data,'product'))return failure('invalid_response',502,upstream.status);
  const acceptedVersion=upstream.headers.get('x-shopify-api-version')===version;
  const product=payload.data.product;
  if(product===null)return json({authentication:'pass',queryValidity:'pass',httpStatus:upstream.status,apiVersionAccepted:acceptedVersion,productVisibility:'unverified',category:'product_not_visible_or_not_found'});
  if(product.id!==PRODUCT_ID||!Array.isArray(product.variants?.nodes))return failure('invalid_response',502,upstream.status);
  // No commercial/publication/supplier/shipping permissions are fabricated.
  // Vendor is retained internally as a claim, never promoted to supplier proof.
  const checkedAt=new Date().toISOString();
  const prepared=prepareStorefrontRecords({data:{products:{nodes:[product],pageInfo:{hasNextPage:false,endCursor:null}}}},{environment:'preview',storeDomain:domain,checkedAt});
  const record=prepared.records.find(r=>r.identity.variantId===VARIANT_ID);
  const sizeS=record?.offer.options.some(o=>o.name.toLowerCase()==='size'&&o.value==='S')===true;
  const image=product.variants.nodes.find(v=>v.id===VARIANT_ID)?.image;
  let imagePresent=false;try{const u=new URL(image?.url);imagePresent=u.protocol==='https:'&&u.hostname==='cdn.shopify.com'&&!u.username&&!u.password;}catch{}
  return json({authentication:'pass',queryValidity:'pass',httpStatus:upstream.status,apiVersionAccepted:acceptedVersion,productVisibility:'visible_through_token_channel',publication:'channel_identity_unverified',productId:PRODUCT_ID,variantId:record?VARIANT_ID:null,variantFound:Boolean(record),sizeS,
   price:record?.offer.priceCents!==null&&record?.offer.priceCents!==undefined&&record.offer.currency==='USD'?{amount:record.offer.priceCents/100,currency:'USD'}:null,
   observedAt:checkedAt,availableForSale:record?.offer.inventoryEvidence.availableForSale??null,currentlyNotInStock:record?.offer.inventoryEvidence.currentlyNotInStock??null,quantityAvailable:record?.offer.inventoryEvidence.quantityAvailable??null,inventoryEvidence:'storefront_snapshot_not_supplier_stock_proof',
   image:{present:imagePresent,altTextPresent:typeof image?.altText==='string'&&image.altText.length>0,displayRights:'unverified'},
   supplier:{status:'unverified',vendorMatchesExpected:product.vendor==='Love to Kleep'},adapter:{normalized:Boolean(record),sizeOptionsPreserved:sizeS,liveEligible:false},
   permissions:'unverified',shipping:'unverified',checkoutEnabled:false,aiProcessingEnabled:false});
 }catch{return failure('transport_or_timeout');}
}
