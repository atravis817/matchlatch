import {createSyncStore} from './shopify-sync-store.mjs';
import {publicationDecision} from './shopify-sync.mjs';
import {normalizeRecord,evaluateRecord} from './unified-search-contract.mjs';
import {STORE_DOMAIN} from './shopify-storefront-adapter.mjs';
import {CATEGORIES,isCategoryBrowse} from './unified-discovery.mjs';
import {normalizeQuery,TAXONOMY,normalizeTerms} from './fashion-taxonomy.mjs';
export async function internalShopifySearch(input,{store=createSyncStore(),now=Date.now()}={}){
 const slot=input.slot||'all',q=String(input.query||'').trim(),max=Number(input.max??10000),offset=Number(input.offset||0),purpose=input.purpose||'display';
 if(slot!=='all'&&!CATEGORIES.has(slot)||q.length>170||!Number.isFinite(max)||max<1||max>10000||!Number.isSafeInteger(offset)||offset<0||offset>100000||!['display','recommendation'].includes(purpose))throw Error('invalid_catalog_search');
 const params=new URLSearchParams({shop:'eq.'+STORE_DOMAIN,is_public:'eq.true',available:'eq.true',retired:'eq.false',price_usd:'lte.'+max,observed_at:'gte.'+new Date(now-26*3600000).toISOString(),order:'price_usd.'+(input.sort==='price-desc'?'desc':'asc')+',variant_id.asc',limit:'60',offset:String(offset)});
 if(slot!=='all')params.set('slot','eq.'+slot);
 for(const field of ['size','color','brand'])if(input[field])params.set(field,'ilike.'+String(input[field]).slice(0,100).replace(/[\\%_*]/g,'\\$&'));
 const broad=!q||isCategoryBrowse(q,slot);
 if(!broad){
  const intent=normalizeQuery(q);let remaining=normalizeTerms(q);
  if(intent.productTypes.length===1){const type=intent.productTypes[0];if(type!=='shoe')params.set('data->>productType','eq.'+type);
   const aliases=TAXONOMY.filter(t=>t.productType===type).flatMap(t=>t.aliases).sort((a,b)=>b.length-a.length);
   for(const alias of aliases)remaining=remaining.replace(new RegExp('\\b'+alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','g'),' ');
  }
  const tokens=remaining.match(/[\p{L}\p{N}]+/gu)?.slice(0,12);if(tokens?.length)params.set('data->>title','fts(english).'+tokens.join(' & '));
  else if(!intent.productTypes.length)throw Error('invalid_search_query');
 }
 const rows=await store.db('matchlatch_shopify_products?'+params),items=[];
 for(const row of rows){
  if(!row.is_public||!publicationDecision(row,row.approval,now,purpose).eligible)continue;
  const evidence=row.approval,raw={...row.data,private:false,checkedAt:row.observed_at,shippingUsEligible:true,shippingEvidence:{kind:'reviewed_merchant_shipping',evidenceRef:evidence.evidenceRef,country:'US'}};
  if(input.sizeSystem&&(typeof raw.sizeSystem!=='string'||raw.sizeSystem.toLowerCase()!==String(input.sizeSystem).toLowerCase()))continue;
  const record=normalizeRecord(raw,{provider:'shopify_storefront',permissions:{...evidence,fresh:true}});
  const decision=evaluateRecord(record,broad?'':q,{purpose,max,size:input.size||'',color:input.color||''});
  if(!decision.matched)continue;
  items.push({...raw,url:raw.merchantProductUrl,private:false,discoveryProvider:'shopify_internal',saveAllowed:true,evaluationOnly:false,affiliateTracked:false,requiresMerchantVerification:true,aiProcessingAuthorized:false,classification:record.classification});
 }
 const withheld=input.needBy?items.length:0;
 return {items:input.needBy?[]:items,nextOffset:rows.length===60?offset+60:null,offset,limit:60,criteria:{query:q,slot,max,size:input.size||'',currency:'USD'},sources:{shopifyInternal:{status:items.length?'results':'empty',count:input.needBy?0:items.length,live:false,scope:'owner_approved_internal_inventory'},shopify:{status:'disabled',count:0,live:false,scope:'global_discovery_requires_separate_permission'},awin:{status:'disabled',count:0,live:false,scope:'frozen_shopify_first_phase'}},allFailed:false,partial:false,model:null,aiProcessing:false,deliveryFilter:{active:Boolean(input.needBy),withheld},limitations:input.needBy?['Delivery deadlines are not independently verified. Clear the deadline to browse.']:[],message:(input.needBy?0:items.length)+' approved Shopify listings in this page. Prices and stock are source snapshots; checkout revalidation is required.',checkedAt:new Date(now).toISOString()};
}
