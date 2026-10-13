// Isolated, deterministic preparation only. No fetch, credentials, storage,
// model, cart, or live-route imports. Evidence is supplied by a trusted server
// reader in a future authorized integration, never by shopper request bodies.
import {normalizeRecord,searchRecords} from './unified-search-contract.mjs';
export const STOREFRONT_VERSION='2026-10';
export const STORE_DOMAIN='pfcdgt-is.myshopify.com';
export const STOREFRONT_READ_QUERY=`query MatchlatchStorefrontProducts($first: Int!, $after: String, $query: String) @inContext(country: US) {
 products(first: $first, after: $after, query: $query) {
  nodes { id title vendor productType onlineStoreUrl
   variants(first: 20) {
    nodes { id title availableForSale currentlyNotInStock quantityAvailable
     price { amount currencyCode } selectedOptions { name value } image { url altText }
    }
    pageInfo { hasNextPage endCursor }
   }
  }
  pageInfo { hasNextPage endCursor }
 }
}`;
const text=(v,n=150)=>typeof v==='string'?v.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n):'';
const evidence=v=>v?.verified===true&&Boolean(text(v.evidenceRef,200));
function url(value,hosts){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&hosts.includes(u.hostname)&&!u.hash?u.href:null;}catch{return null;}}
function cents(value){if(typeof value!=='string'||!/^\d{1,7}(?:\.\d{1,2})?$/.test(value))return null;const [a,b='']=value.split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));return Number.isSafeInteger(n)&&n>0?n:null;}

export function prepareStorefrontRecords(response,context={}){
 const {environment,storeDomain,checkedAt,permissions={},publicationByProduct={},supplierByProduct={},shippingByProduct={},approvedCustomDomains=[],now=Date.now()}=context;
 if(environment!=='preview'||storeDomain!==STORE_DOMAIN)return {records:[],diagnostics:[{reasons:['preview_store_context_required']}],pagination:null};
 if(response?.errors?.length||!Array.isArray(response?.data?.products?.nodes))return {records:[],diagnostics:[{reasons:['storefront_response_unavailable']}],pagination:null};
 const timestamp=Date.parse(checkedAt),fresh=Number.isFinite(timestamp)&&timestamp<=now&&now-timestamp<=300000;
 const reviewed=Boolean(text(permissions.evidenceRef,200));
 const hosts=[STORE_DOMAIN,...approvedCustomDomains.filter(v=>typeof v==='string'&&/^[a-z0-9.-]+$/.test(v))];
 const records=[],diagnostics=[];
 for(const p of response.data.products.nodes.slice(0,50)){
  if(!/^gid:\/\/shopify\/Product\/\d+$/.test(p?.id||'')){diagnostics.push({reasons:['invalid_product_id']});continue;}
  const publication=publicationByProduct[p.id],supplier=supplierByProduct[p.id],shipping=shippingByProduct[p.id];
  const publicationVerified=evidence(publication)&&Boolean(text(publication.channelId));
  const supplierVerified=evidence(supplier)&&Boolean(text(supplier.id))&&Boolean(text(supplier.name));
  const usVerified=evidence(shipping)&&shipping.country==='US'&&shipping.eligible===true;
  const productUrl=url(p.onlineStoreUrl,hosts);
  for(const v of (Array.isArray(p.variants?.nodes)?p.variants.nodes:[]).slice(0,20)){
   if(!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(v?.id||'')){diagnostics.push({productId:p.id,reasons:['invalid_variant_id']});continue;}
   const amount=cents(v.price?.amount),quantity=Number.isSafeInteger(v.quantityAvailable)&&v.quantityAvailable>=0?v.quantityAvailable:null;
   const available=v.availableForSale===false||v.currentlyNotInStock===true||quantity===0?false:v.availableForSale===true&&v.currentlyNotInStock===false&&quantity!==null?quantity>0:null;
   const options=(Array.isArray(v.selectedOptions)?v.selectedOptions:[]).filter(o=>typeof o.name==='string'&&typeof o.value==='string').map(o=>({name:text(o.name,100),value:text(o.value,100)}));
   const option=names=>options.find(o=>names.includes(o.name.toLowerCase()))?.value||null;
   const record=normalizeRecord({id:'shopify-storefront:'+STORE_DOMAIN+':'+v.id.split('/').pop(),productId:p.id,variantId:v.id,merchantId:STORE_DOMAIN,merchant:'MATCHLATCH',title:text(p.title,250),sourceProductType:text(p.productType),brand:text(p.vendor),price:amount===null?null:amount/100,currency:v.price?.currencyCode??null,size:option(['size','waist size','shoe size']),sizeSystem:option(['size system','sizing system']),color:option(['color','colour']),available,image:url(v.image?.url,['cdn.shopify.com']),merchantProductUrl:productUrl,checkoutUrl:null,shippingUsEligible:usVerified,shippingEvidence:usVerified?{kind:'reviewed_merchant_shipping',evidenceRef:shipping.evidenceRef,country:'US'}:null,checkedAt,private:false},{provider:'shopify_storefront',permissions:{sourceAuthorized:reviewed&&permissions.sourceAuthorized===true&&publicationVerified&&supplierVerified,displayAuthorized:reviewed&&permissions.displayAuthorized===true,recommendationAuthorized:reviewed&&permissions.recommendationAuthorized===true,imageRights:reviewed&&permissions.imageRights===true,fresh,evidenceRef:reviewed?permissions.evidenceRef:null}});
   record.supplier={id:supplierVerified?supplier.id:null,name:supplierVerified?supplier.name:null,vendorClaim:text(p.vendor),status:supplierVerified?'verified':'unverified',evidenceRef:supplierVerified?supplier.evidenceRef:null};
   record.offer.priceCents=amount;record.offer.options=options;
   record.offer.inventoryEvidence={kind:'storefront_variant_snapshot',availableForSale:typeof v.availableForSale==='boolean'?v.availableForSale:null,currentlyNotInStock:typeof v.currentlyNotInStock==='boolean'?v.currentlyNotInStock:null,quantityAvailable:quantity,checkedAt,expiresAt:fresh?new Date(timestamp+300000).toISOString():null,reserved:false};
   record.source.storeDomain=STORE_DOMAIN;record.source.apiVersion=STOREFRONT_VERSION;
   record.publication={verified:publicationVerified,channelId:publicationVerified?publication.channelId:null,evidenceRef:publicationVerified?publication.evidenceRef:null};
   record.checkoutDestination={kind:'shopify_merchant_checkout',storeDomain:STORE_DOMAIN,variantId:v.id,url:null,enabled:false};
   record.eligibility.aiProcessingAuthorized=false;
   records.push(record);
   const reasons=[];if(!publicationVerified)reasons.push('channel_publication_unverified');if(!supplierVerified)reasons.push('supplier_identity_unverified');if(!available)reasons.push('positive_variant_inventory_unverified');if(!usVerified)reasons.push('us_shipping_unverified');if(!fresh)reasons.push('inventory_snapshot_stale');
   diagnostics.push({productId:p.id,variantId:v.id,reasons,variantPagination:p.variants?.pageInfo??null});
  }
 }
 return {records,diagnostics,pagination:response.data.products.pageInfo??null};
}
export function selectStorefrontCandidates(response,context,query,options={}){
 const prepared=prepareStorefrontRecords(response,context);
 const result=searchRecords(prepared.records,query,options);
 return {...result,sourceDiagnostics:prepared.diagnostics,pagination:prepared.pagination};
}
