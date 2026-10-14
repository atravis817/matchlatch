// Owner-only Shopify evaluation + independently published Awin offers.
// No model call, result caching, feed download, persistence, cart or checkout operation.
import {catalog,collectShopify,parseDiscoveryRequest} from './shopify-discovery.mjs';
import {searchAwin,postgrestConfig} from './awin-public-catalog.mjs';
import {deduplicateMerchantVariants} from './merchant-offer-identity.mjs';
import {classifyProduct,colorEvidence} from './fashion-taxonomy.mjs';
import model from '../checkout-model.js';
export const EVALUATION_PROFILE='https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json';
export const CATEGORIES=new Set(['hat','scarf','jacket','shirt','watch','belt','pants','socks','shoes']);
export function unifiedPolicy(env=process.env){return {preview:env.VERCEL_ENV==='preview',shopifyEvaluation:env.VERCEL_ENV==='preview'&&env.MATCHLATCH_UNIFIED_DISCOVERY_ENABLED==='true',ownerOnly:true,publicShopify:false,aiProcessing:false,resultPersistence:false,profile:EVALUATION_PROFILE,profileIdentity:'official_tutorial_profile',ownProfileStatus:'published_profile_requires_services_and_json_content_type'};}
export function discoveryCriteria(input){
 if(!input||typeof input.query!=='string'||input.query.trim().length<2||input.query.length>170||/[\u0000-\u001f]/.test(input.query)||!CATEGORIES.has(input.slot)||input.brand&&typeof input.brand!=='string'||String(input.brand||'').length>60)throw Error('Choose one supported product category and a valid query.');
 if(typeof (input.context||'')!=='string'||String(input.context||'').length>600||/[\u0000-\u001f]/.test(input.context||''))throw Error('Invalid styling context.');
 const intent=parseDiscoveryRequest(input.query,{max:input.max,size:input.size,sizeSystem:input.sizeSystem,color:input.color});
 return {...intent,slot:input.slot,context:input.context||'',brand:String(input.brand||'').trim(),sort:['price-asc','price-desc'].includes(input.sort)?input.sort:'relevance',postal:/^\d{5}$/.test(input.postal||'')?input.postal:'',needBy:input.needBy||''};
}
function qualified(item,c){
 const destination=model.safeUrl(item?.merchantProductUrl||item?.url),price=model.cents(item?.price);
 if(!item||!['awin','shopify_catalog'].includes(item.source)||!destination||!item.productId||!item.variantId||item.currency!=='USD'||price===null||price<=0||price>c.maxCents||item.available!==true||item.slot!==c.slot||!item.merchant||!item.image||!model.safeUrl(item.image,{checkout:true}))return null;
 const classification=classifyProduct({title:item.title,sourceProductType:item.productType||'',slot:item.slot});
 if(classification.reviewRequired||classification.legacySlot!==c.slot||c.productTypes.length&&!c.productTypes.includes(classification.productType)&&!(c.productTypes.includes('shoe')&&classification.category==='footwear'))return null;
 if(c.size&&String(item.size||'').toLowerCase()!==c.size.toLowerCase()||c.sizeSystem&&String(item.sizeSystem||'').toLowerCase()!==c.sizeSystem.toLowerCase()||c.color&&(!colorEvidence(item.color).exactSolid||colorEvidence(item.color).normalized!==c.color)||c.brand&&String(item.brand||'').toLowerCase()!==c.brand.toLowerCase())return null;
 let notes='';try{notes=JSON.parse(c.context||'{}').notes||'';}catch{}
 const excluded=[...String(notes).matchAll(/\b(?:no|avoid|without|exclude)\s+(black|white|gray|grey|navy|blue|green|olive|red|pink|brown|beige|gold|silver|leather|wool|fur|silk|polyester)\b/gi)].map(m=>m[1].toLowerCase().replace('grey','gray'));
 const evidenced=[item.title,item.color,item.material,item.description].filter(Boolean).join(' ').toLowerCase().replace(/grey/g,'gray');if(excluded.some(t=>new RegExp('\\b'+t+'\\b','i').test(evidenced)))return null;
 const at=Date.parse(item.checkedAt);if(!Number.isFinite(at)||at>Date.now()+60000||Date.now()-at>(item.source==='awin'?86400000:300000))return null;
 return {...item,url:destination,merchantProductUrl:destination,checkoutUrl:'',nativeCheckoutEligible:false,affiliateTracked:false,
  discoveryProvider:item.source==='awin'?'awin_feed':'shopify_global',stockVerifiedLive:item.source==='awin'?false:null,
  saveAllowed:item.source==='awin',evaluationOnly:item.source!=='awin',classification,
  persistenceNote:item.source==='awin'?'Published merchant-feed snapshot.':'Owner Preview evaluation. Search results and images are not saved.'};
}
export async function unifiedDiscovery(input,{owner=false,policy=unifiedPolicy(),shopify=catalog,awin=searchAwin,awinConfigured=Boolean(postgrestConfig())}={}){
 const c=discoveryCriteria(input),attributes=[];if(c.size)attributes.push({name:'Size',values:[c.size]});if(c.color)attributes.push({name:'Color',values:[c.color]});
 const shopifyAllowed=policy.shopifyEvaluation&&owner;
 const calls=[shopifyAllowed?shopify('search_catalog',{query:c.query+' '+c.slot,filters:{available:true,ships_to:{country:'US'},condition:['new'],price:{max:c.maxCents},...(attributes.length?{attributes}:{})},context:{address_country:'US',currency:'USD',...(c.context?{intent:c.context}:{}),...(c.postal?{postal_code:c.postal}:{})},pagination:{limit:10}},{profileUrl:policy.profile}):Promise.resolve(null),awinConfigured?awin({slot:c.slot,q:c.query,max:c.maxCents/100,size:c.size,color:c.color}):Promise.resolve(null)];
 const outcomes=await Promise.allSettled(calls),sources={};
 const s=outcomes[0],a=outcomes[1];
 let rawShopify=[],rawAwin=[];
 if(s.status==='fulfilled'&&s.value)rawShopify=collectShopify(s.value,{...c,legacySlot:c.slot}).items;
 if(a.status==='fulfilled'&&Array.isArray(a.value))rawAwin=a.value;
 const itemsBySource=[rawShopify,rawAwin].map(rows=>rows.map(i=>qualified(i,c)).filter(Boolean));
 sources.shopify={status:!policy.shopifyEvaluation?'disabled':!owner?'owner_required':s.status==='rejected'?'unavailable':itemsBySource[0].length?'results':'empty',count:itemsBySource[0].length,live:shopifyAllowed&&s.status==='fulfilled',scope:'owner_preview_evaluation',profileIdentity:policy.profileIdentity};
 sources.awin={status:!awinConfigured?'not_configured':a.status==='rejected'?'unavailable':itemsBySource[1].length?'results':'empty',count:itemsBySource[1].length,live:false,scope:'reviewed_published_feed',inventory:'snapshot_not_live_stock'};
 const merged=deduplicateMerchantVariants([...itemsBySource[0],...itemsBySource[1]]),seen=new Set();
 let items=merged.filter(i=>{const k=i.discoveryProvider+'|'+i.merchantDomain+'|'+i.productId+'|'+i.variantId;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,36);
 // Deterministic relevance; no commission/provider preference scoring.
 const tokens=c.query.toLowerCase().split(/\s+/).filter(x=>x.length>=3).slice(0,15);
 const score=i=>tokens.reduce((n,t)=>n+(String(i.title).toLowerCase().includes(t)?1:0),0);
 items.sort((x,y)=>c.sort==='price-asc'?x.price-y.price:c.sort==='price-desc'?y.price-x.price:score(y)-score(x)||x.price-y.price);
 const before=items.length;if(c.needBy)items=[]; // Neither provider establishes retailer-confirmed deadline evidence here.
 const active=Object.values(sources).filter(s=>['results','empty','unavailable'].includes(s.status)),allFailed=active.length>0&&active.every(s=>s.status==='unavailable');
 const limitations=[];if(!shopifyAllowed)limitations.push(owner?'Shopify evaluation is disabled for this Preview.':'Shopify evaluation requires verified owner sign-in.');if(sources.awin.status==='empty')limitations.push('No qualifying published Awin products match.');if(sources.awin.status==='not_configured')limitations.push('Published Awin product access is not configured.');if([sources.shopify.status,sources.awin.status].includes('unavailable'))limitations.push('One catalog could not be reached; successful results are retained.');if(c.needBy)limitations.push('Delivery deadlines are not independently verified. Clear the deadline to browse.');
 return {items,sources,criteria:{query:c.query,slot:c.slot,size:c.size,color:c.color,sizeSystem:c.sizeSystem,brand:c.brand,max:c.maxCents/100,currency:'USD'},partial:Object.values(sources).some(s=>['unavailable','disabled','owner_required','not_configured'].includes(s.status)),allFailed,model:null,aiProcessing:false,checkedAt:new Date().toISOString(),deliveryFilter:{active:Boolean(c.needBy),withheld:c.needBy?before:0},message:items.length?items.length+' matching retailer listings. Merchandise prices exclude tax and shipping.':allFailed?'Both available catalogs could not be reached. Try again later.':'No eligible products match these exact constraints.',limitations,note:'Owner Shopify evaluation uses an official tutorial profile, not proof of MATCHLATCH commercial launch clearance. Awin availability is a published feed snapshot. Checkout remains disabled.'};
}
