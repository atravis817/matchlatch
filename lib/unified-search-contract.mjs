import {classifyProduct,normalizeQuery,colorEvidence,TAXONOMY_VERSION} from './fashion-taxonomy.mjs';
// A contract/projection prototype, not an authorization endpoint. Adapters must
// enforce existing source rights before passing records to this module.
export const CONTRACT_VERSION='1.0.0-preview';
export function normalizeRecord(raw,{provider,permissions={}}={}){
 if(!['awin','shopify_catalog','retailer_api','research','fixture'].includes(provider))throw Error('Unknown source contract');
 const classification=classifyProduct(raw),price=Number(raw.price),currency=raw.currency??null;
 return {contractVersion:CONTRACT_VERSION,taxonomyVersion:TAXONOMY_VERSION,
  identity:{provider,merchantId:raw.merchantId??null,productId:raw.productId??null,variantId:raw.variantId??null,id:raw.id??null},
  source:{provider,checkedAt:raw.checkedAt??null,sourceUrl:raw.merchantProductUrl??raw.url??null},
  merchant:{id:raw.merchantId??null,name:raw.merchant??null,permissionEvidence:permissions.evidenceRef??null},
  title:raw.title??'',brand:raw.brand??null,classification,color:colorEvidence(raw.color),style:{tags:[],evidence:[],status:'unknown'},
  offer:{price:Number.isFinite(price)&&raw.price!==null&&raw.price!==undefined?price:null,currency,originalPrice:raw.originalPrice??null,size:raw.size??null,sizeSystem:raw.sizeSystem??null,stock:raw.available===true?'source_available':raw.available===false?'source_unavailable':'unknown',checkedAt:raw.checkedAt??null},
  imagery:{url:raw.image??null,usageRights:permissions.imageRights===true?'reviewed':'unverified'},
  links:{product:raw.merchantProductUrl??raw.url??null,affiliate:provider==='awin'&&raw.affiliateTracked===true?raw.url:null,affiliateVerified:provider==='awin'&&raw.affiliateTracked===true,checkout:raw.checkoutUrl??null},
  shipping:{usEligible:raw.shippingUsEligible===true,evidence:raw.shippingEvidence??null,cost:raw.shippingCost??null,delivery:raw.deliveryEstimate??null},
  eligibility:{sourceAuthorized:permissions.sourceAuthorized===true,displayAuthorized:permissions.displayAuthorized===true,recommendationAuthorized:permissions.recommendationAuthorized===true,private:raw.private===true||provider==='fixture',research:provider==='research',fresh:permissions.fresh===true},
  // Internal immutable projection input; never return this to public clients.
  original:structuredClone(raw)};
}
export function evaluateRecord(record,query,{max=10000,size='',color='',purpose='recommendation'}={}){
 const intent=normalizeQuery(query),reasons=[];
 if(!record.eligibility.sourceAuthorized)reasons.push('source_permission_unverified');
 if(!record.eligibility.displayAuthorized)reasons.push('display_permission_unverified');
 if(purpose==='recommendation'&&!record.eligibility.recommendationAuthorized)reasons.push('recommendation_permission_unverified');
 if(record.eligibility.private)reasons.push('private_inventory');
 if(record.eligibility.research)reasons.push('research_not_inventory');
 if(!record.eligibility.fresh)reasons.push('freshness_unverified');
 if(record.classification.reviewRequired)reasons.push('classification_needs_review');
 if(record.offer.currency!=='USD'||!Number.isFinite(record.offer.price)||record.offer.price<=0)reasons.push('valid_usd_price_missing');
 if(record.offer.stock!=='source_available')reasons.push('stock_not_confirmed');
 if(!record.shipping.usEligible||!record.shipping.evidence)reasons.push('shipping_evidence_missing');
 if(!record.imagery.url||record.imagery.usageRights!=='reviewed')reasons.push('image_evidence_missing');
 if(!record.links.product)reasons.push('retailer_link_missing');
 if(record.identity.provider==='awin'&&!record.links.affiliateVerified)reasons.push('affiliate_attribution_unverified');
 // Hard relevance constraints are separate from permission/data-quality gates.
 const constraintReasons=[];
 if(intent.ambiguous)constraintReasons.push('ambiguous_request');
 const broadFootwear=intent.productTypes.length===1&&intent.productTypes[0]==='shoe'&&record.classification.category==='footwear';
 if(intent.productTypes.length&&!broadFootwear&&!intent.productTypes.includes(record.classification.productType))constraintReasons.push('product_type_mismatch');
 if(size&&String(record.offer.size??'').toLowerCase()!==String(size).toLowerCase())constraintReasons.push('size_not_evidenced');
 if(color&&(!record.color.exactSolid||record.color.normalized!==color.toLowerCase().replace(/grey/g,'gray')))constraintReasons.push('exact_color_not_evidenced');
 if(!Number.isFinite(max)||record.offer.price>max)constraintReasons.push('budget_exceeded');
 const eligibilityPassed=!reasons.length,matched=eligibilityPassed&&!constraintReasons.length;
 return {eligible:eligibilityPassed,matched,eligibilityReasons:reasons,constraintReasons,relevance:matched?intent.normalized.split(/\s+/).reduce((n,w)=>n+Number(record.title.toLowerCase().includes(w)),0):null};
}
export function searchRecords(records,query,options={}){
 const evaluated=records.map(record=>({record,decision:evaluateRecord(record,query,options)}));
 const matches=evaluated.filter(x=>x.decision.matched).sort((a,b)=>b.decision.relevance-a.decision.relevance||a.record.offer.price-b.record.offer.price);
 return {matches,diagnostics:evaluated.map(({record,decision})=>({id:record.identity.id,...decision})),zeroReason:matches.length?null:!records.length?'no_inventory_in_selected_source':evaluated.some(x=>x.decision.eligible)?'no_matching_eligible_inventory':'no_qualified_inventory'};
}
