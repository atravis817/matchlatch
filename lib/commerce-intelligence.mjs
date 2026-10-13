import {createHash} from 'node:crypto';
import {POLICY,canonicalProductURL,researchPermission,adapterPermission} from './commerce-policy.mjs';
import {affiliateAllowed} from '../scripts/awin-import.mjs';
import {intentFromText} from './styling-engine.mjs';
import {evaluateDelivery} from './delivery-intelligence.mjs';
const authority={search_reference:1,retailer_structured:3,affiliate_feed:3,retailer_api:4};
const fields=['brand','title','category','productURL','affiliateURL','currency','price','originalPrice','salePrice','color','variants','stock','shippingDestinations','shippingCost','processing','delivery','returnPolicy','promotions','imageURL','gtin','mpn'];
const clean=(v,n=200)=>String(v??'').replace(/[\x00-\x1f]/g,' ').trim().slice(0,n);
export function evidence(value,{type,url,checkedAt=new Date().toISOString(),ttl=3600,method='source_record'}={}){
 const sourceURL=canonicalProductURL(url),time=Date.parse(checkedAt);if(!authority[type]||!sourceURL||!Number.isFinite(time)||time>Date.now()+60000)return null;
 return {value,sourceType:type,sourceURL,verifiedAt:new Date(time).toISOString(),expiresAt:new Date(time+ttl*1000).toISOString(),authority:authority[type],verificationMethod:method,confidence:type==='search_reference'?'unverified':'source_reported'};
}
export function fresh(e,now=Date.now()){return Boolean(e&&Number.isFinite(Date.parse(e.expiresAt))&&Date.parse(e.expiresAt)>now&&Date.parse(e.verifiedAt)<=now+60000);}
function record(id,retailer,collection){return {id,retailer,collection,publishable:false,sponsored:false,fields:Object.fromEntries(fields.map(f=>[f,null])),conflicts:[],freshness:'unknown'};}
export function fromCatalog(p){
 const url=canonicalProductURL(p.merchantProductUrl);if(!url)return null;const out=record(p.id,{id:p.id.split(':').slice(0,2).join(':'),name:p.merchant},p.private?'private_catalog':'approved_catalog');out.publishable=!p.private&&p.shippingUsEligible;out.catalogRef=p;
 const source={type:'affiliate_feed',url,checkedAt:p.checkedAt,ttl:POLICY.fieldFreshnessSeconds.stock,method:'advertiser_feed_snapshot'};
 for(const [field,value]of Object.entries({brand:p.brand,title:p.title,category:p.slot,productURL:url,currency:p.currency,price:p.price,color:p.color,imageURL:p.image,stock:p.available?'in_stock':'unavailable',variants:p.size?[{id:p.variantId,size:p.size,color:p.color,stock:p.available?'in_stock':'unavailable'}]:[]}))out.fields[field]=evidence(value,{...source,ttl:field==='price'?POLICY.fieldFreshnessSeconds.price:source.ttl});
 // Attribution has already passed the existing publisher/merchant validator.
 out.fields.affiliateURL=p.affiliateTracked&&affiliateAllowed(p.url,Number(p.id.split(':')[1]))?evidence(p.url,{...source,method:'publisher_and_advertiser_parameters_checked'}):null;
 out.freshness=fresh(out.fields.stock)?'fresh':'stale';return out;
}
export function fromReference(source){const r=researchPermission(source?.url);if(!r)return null;const out=record('research:'+createHash('sha256').update(r.url).digest('hex').slice(0,24),{id:r.id,name:r.name},'external_research');
 out.fields.productURL=evidence(r.url,{type:'search_reference',url:r.url,ttl:POLICY.cacheSeconds,method:'search_index_reference'});out.fields.title=evidence(clean(source.title||'Retailer product reference'),{type:'search_reference',url:r.url,ttl:POLICY.cacheSeconds,method:'search_index_title'});out.freshness='unverified';return out;
}
export function normalizePromotion(raw,source,{now=Date.now()}={}){
 const expiry=Date.parse(raw.expiresAt),checked=Date.parse(source.checkedAt),verified=source.type==='retailer_api'&&source.permissionVerified===true&&source.eligibilityVerified===true&&source.url&&Number.isFinite(checked)&&checked+3600000>now;
 return {code:typeof raw.code==='string'&&/^[A-Za-z0-9_-]{1,40}$/.test(raw.code)?raw.code:null,automatic:raw.automatic===true,percent:Number.isFinite(raw.percent)&&raw.percent>0&&raw.percent<=100?raw.percent:null,amount:Number.isFinite(raw.amount)&&raw.amount>0?raw.amount:null,currency:raw.currency||null,minPurchase:Number.isFinite(raw.minPurchase)?Math.max(0,raw.minPurchase):null,excludedCategories:Array.isArray(raw.excludedCategories)?raw.excludedCategories.map(v=>clean(v,40)).slice(0,20):null,firstOrderOnly:typeof raw.firstOrderOnly==='boolean'?raw.firstOrderOnly:null,countries:Array.isArray(raw.countries)?raw.countries.filter(v=>/^[A-Z]{2}$/.test(v)).slice(0,30):null,combinable:typeof raw.combinable==='boolean'?raw.combinable:null,expiresAt:Number.isFinite(expiry)?new Date(expiry).toISOString():null,status:Number.isFinite(expiry)&&expiry<=now?'expired':verified&&Number.isFinite(expiry)&&typeof raw.expiresAt==='string'&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(raw.expiresAt)&&(raw.automatic===true||typeof raw.code==='string'&&/^[A-Za-z0-9_-]{1,40}$/.test(raw.code))?'verified':'unverified',sourceURL:canonicalProductURL(source.url),verifiedAt:source.checkedAt||null,redemptionVerified:false};
}
export function fromRetailer(raw,{adapterId,kind,sourceURL,checkedAt}={}){
 const permission=adapterPermission(adapterId,kind);if(!permission)return null;const url=canonicalProductURL(sourceURL),product=canonicalProductURL(raw.productURL);if(!url||!product||!permission.hosts.includes(new URL(url).hostname)||!permission.hosts.includes(new URL(product).hostname))return null;
 if(!raw.productId||!raw.variantId||raw.currency!=='USD'||!Number.isFinite(raw.price)||raw.price<=0)return null;
 const out=record(adapterId+':'+raw.productId+':'+raw.variantId,{id:adapterId,name:permission.name},'authorized_external');out.sponsored=raw.sponsored===true;
 for(const f of fields){if(f==='affiliateURL'||raw[f]===undefined)continue;const ttl=['stock','variants'].includes(f)?900:POLICY.fieldFreshnessSeconds[f]||3600;const value=f==='promotions'?(Array.isArray(raw[f])?raw[f].slice(0,10).map(p=>normalizePromotion(p,{type:kind,url,checkedAt,permissionVerified:true,eligibilityVerified:p.eligibilityEvidence===true})):[]):raw[f];out.fields[f]=evidence(value,{type:kind==='retailer_api'?'retailer_api':'retailer_structured',url,checkedAt,ttl});}
 // A reviewed adapter must separately authorize attribution/publication; neither is implied.
 out.publishable=false;out.freshness='source_reported';return out;
}
export function mergeProduct(a,b){if(a.id!==b.id||a.retailer.id!==b.retailer.id||a.collection!==b.collection)throw Error('Cannot merge different products or permission scopes');const out=structuredClone(a);
 for(const f of fields){const old=out.fields[f],next=b.fields[f];if(!next)continue;if(old&&JSON.stringify(old.value)!==JSON.stringify(next.value))out.conflicts.push({field:f,sources:[old.sourceURL,next.sourceURL]});
 if(!old||(fresh(next)&&(!fresh(old)||next.authority>old.authority||(next.authority===old.authority&&Date.parse(next.verifiedAt)>Date.parse(old.verifiedAt)))))out.fields[f]=next;}
 return out;
}
export function deduplicate(products){const seen=new Map();for(const p of products.filter(Boolean)){const key=p.retailer.id+':'+p.id;if(!seen.has(key))seen.set(key,p);else seen.set(key,mergeProduct(seen.get(key),p));}return [...seen.values()];}
export function parseCommerceCriteria(input,now=new Date()){
 const q=clean(input.query,500),max=Number(input.max??(q.match(/(?:under|below|up to)\s*\$?\s*(\d+(?:\.\d{1,2})?)/i)?.[1]||10000));if(q.length<3||!Number.isFinite(max)||max<1||max>10000)throw Error('Describe a product and use a budget from $1 to $10,000.');
 const size=clean(input.size||q.match(/\bsize\s+([\d.]+|XS|S|M|L|XL|XXL)\b/i)?.[1],40),country=clean(input.country||'US',2).toUpperCase(),zip=clean(input.zip,5);if(!/^[A-Z]{2}$/.test(country)||(zip&&(country!=='US'||!/^\d{5}$/.test(zip))))throw Error('Choose a country and an optional five-digit US ZIP.');
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const today=['year','month','day'].map(t=>parts.find(p=>p.type===t).value).join('-');let needBy=clean(input.needBy,10);
 if(!needBy&&/\b(?:before|by) Saturday\b/i.test(q)){const d=new Date(today+'T12:00:00Z'),delta=(6-d.getUTCDay()+7)%7||7;d.setUTCDate(d.getUTCDate()+delta-(/before Saturday/i.test(q)?1:0));needBy=d.toISOString().slice(0,10);}
 if(needBy&&(!/^\d{4}-\d{2}-\d{2}$/.test(needBy)||!Number.isFinite(Date.parse(needBy))||new Date(needBy+'T12:00:00Z').toISOString().slice(0,10)!==needBy||needBy<today))throw Error('Choose a valid future delivery deadline.');
 const colors=q.toLowerCase().match(/\b(white|black|blue|navy|green|brown|red|silver|gold|beige)\b/g)||[];
 const intent=intentFromText(q,{budget:max,size});if(input.slot){if(!['hat','scarf','jacket','shirt','watch','belt','pants','socks','shoes'].includes(input.slot))throw Error('Invalid category.');if(intent.slots.length&&!intent.slots.includes(input.slot))throw Error('Category conflicts with your request.');intent.slots=[input.slot];}return {query:q,max:intent.budget,size,country,zip,today,needBy,colors:intent.colors,slots:intent.slots,excludedColors:intent.excludedColors,compareTotal:input.compareTotal===true||/total (?:prices?|cost)/i.test(q),firstOrder:input.firstOrder===true};
}
export function evaluateOffer(p,c){
 const value=f=>fresh(p.fields[f])?p.fields[f].value:null,why=[];let price=value('price');const currency=value('currency'),stock=value('stock');if(p.collection==='external_research')why.push('Research reference: product facts and retailer permission are unverified.');
 if(currency!=='USD'||!Number.isFinite(price)||price<=0)why.push('Current USD price unknown.');if(stock!=='in_stock')why.push('Fresh stock evidence is unavailable.');
 const variants=value('variants')||[];if(c.size&&!variants.some(v=>String(v.size).toLowerCase()===c.size.toLowerCase()&&v.stock==='in_stock'))why.push('Requested size is not confirmed available.');
 if(c.slots.length&&!c.slots.includes(value('category')))why.push('Requested category is not evidenced.');
 const label=String(value('title')||'')+' '+String(value('color')||'');if(c.colors.length&&!c.colors.some(color=>label.toLowerCase().includes(color)))why.push('Requested color is not evidenced.');
 if(c.excludedColors.some(color=>label.toLowerCase().includes(color)))why.push('Excluded color is present.');
 // Listed promotions are not redemption evidence. No authorized merchant-cart
 // discount confirmation is integrated, so keep merchandise totals unchanged.
 const discount=0;
 const destinations=value('shippingDestinations');if(!destinations?.includes(c.country)&&!(c.country==='US'&&p.catalogRef?.shippingUsEligible))why.push('Shipping eligibility for this country is not verified.');
 const shipping=value('shippingCost'),hasShipping=Number.isFinite(shipping)&&shipping>=0;const subtotal=Number.isFinite(price)?Math.round((price-discount)*100)/100:null,total=hasShipping&&subtotal!==null?Math.round((subtotal+shipping)*100)/100:null;
 if(subtotal!==null&&(total??subtotal)>c.max)why.push('Known cost exceeds the budget.');if(c.compareTotal&&!hasShipping)why.push('Destination shipping cost is unknown; total cannot be compared.');
 const delivery=evaluateDelivery({deliveryEstimate:value('delivery'),shippingPolicy:value('processing')},{zip:c.zip,needBy:c.needBy,today:c.today});if(c.needBy&&!delivery.eligible)why.push('No supported destination estimate meets the deadline.');
 return {eligible:why.length===0,reasons:why,advertisedPrice:price,discount,subtotal,knownShipping:hasShipping?shipping:null,estimatedTotal:total,taxIncluded:false,shippingUnknown:!hasShipping,delivery,couponRedemptionVerified:false};
}
export function rankOffers(products,c){const words=c.query.toLowerCase().match(/\b[a-z]{3,}\b/g)||[];return deduplicate(products).map(product=>({product,intelligence:evaluateOffer(product,c)})).sort((a,b)=>Number(b.intelligence.eligible)-Number(a.intelligence.eligible)||words.reduce((s,w)=>s+Number(String(b.product.fields.title?.value||'').toLowerCase().includes(w))-Number(String(a.product.fields.title?.value||'').toLowerCase().includes(w)),0)||(b.product.fields.stock?.authority||0)-(a.product.fields.stock?.authority||0)||(a.intelligence.estimatedTotal??a.intelligence.subtotal??Infinity)-(b.intelligence.estimatedTotal??b.intelligence.subtotal??Infinity)||a.product.id.localeCompare(b.product.id));}

export function comparisonGroups(offers){const groups=new Map();for(const o of offers){const g=o.product.fields.gtin;if(!o.intelligence.eligible||!fresh(g)||!/^\d{8}(?:\d{4,6})?$/.test(String(g.value)))continue;const id=String(g.value);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(o);}return [...groups].filter(([,rows])=>new Set(rows.map(o=>o.product.retailer.id)).size>1).map(([gtin,offers])=>({gtin,offers,comparison:'identical_GTIN',note:'Totals require destination shipping evidence; taxes are not included.'}));}
