import {classifyProduct,colorEvidence,normalizeQuery} from './fashion-taxonomy.mjs';
export const CATALOG='https://catalog.shopify.com/api/ucp/mcp';
const PROFILE='https://matchlatch.vercel.app/ucp-agent.json';
const PREVIEW_PROFILE='https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json';
export const STUDIO_PERMISSIONS=Object.freeze({liveDiscovery:false,commercialDisplay:'unverified',aiProcessing:'unverified',accessRoute:'anonymous_example_profile',reason:'MATCHLATCH developer access, display rights and third-party AI processing are not confirmed.'});
const gid=/^gid:\/\/shopify\/(?:p\/[A-Za-z0-9_-]+|ProductVariant\/[A-Za-z0-9_-]+)$/;
const clip=(s,n=180)=>String(s??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n);
const safeUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
export async function catalog(tool,args,{fetcher=globalThis.fetch,environment=process.env.VERCEL_ENV,profileUrl}={}){
 if(!['search_catalog','get_product'].includes(tool))throw Error('CATALOG_TOOL_DENIED');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),11000);
 try{
  const response=await fetcher(CATALOG,{method:'POST',signal:controller.signal,redirect:'error',cache:'no-store',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:tool,arguments:{meta:{'ucp-agent':{profile:profileUrl||(environment==='preview'?PREVIEW_PROFILE:PROFILE)}},catalog:args}}})});
  if(!response.ok)throw Error('CATALOG_HTTP_'+response.status);
  const result=await response.json();if(result.error||result.result?.isError)throw Error('CATALOG_REJECTED');
  let data=result.result?.structuredContent;
  if(!data){try{data=JSON.parse(result.result?.content?.find(x=>x.type==='text')?.text);}catch{}}
  if(!data||(!Array.isArray(data.products)&&!data.product))throw Error('CATALOG_BAD_RESPONSE');
  return data;
 }finally{clearTimeout(timeout);}
}
export function parseDiscoveryRequest(query,{max=10000,size='',sizeSystem='',color='',allowMixed=false,country='US'}={}){
 const intent=normalizeQuery(query);if(intent.normalized.length<2||intent.ambiguous)throw Error('Describe one product type at a time.');
 const explicit=[...intent.normalized.matchAll(/\b(under|below|less than|up to|maximum|max|budget(?: of)?)\s*\$?\s*(\d+(?:\.\d{1,2})?)\b/g)];
 let maxCents=Math.floor(Number(max)*100);if(!Number.isSafeInteger(maxCents)||maxCents<100||maxCents>1000000)throw Error('Use a budget between $1 and $10,000.');
 for(const m of explicit){const cents=Math.round(Number(m[2])*100);maxCents=Math.min(maxCents,cents-(['under','below','less than'].includes(m[1])?1:0));}
 const foundColors=[...new Set(intent.normalized.match(/\b(black|white|gray|blue|navy|green|olive|red|pink|brown|beige|silver|gold)\b/g)||[])];
 if(!color&&foundColors.length>1)throw Error('Choose one explicit color constraint.');
 if(/\b(?:ship(?:ping)? to|deliver(?:y)? to|destination)\s+(?:canada|uk|united kingdom|mexico|europe)\b/.test(intent.normalized))throw Error('Unsupported destination requested.');
 const colors=clip(color)||intent.normalized.match(/\b(black|white|gray|blue|navy|green|olive|red|pink|brown|beige|silver|gold)\b/)?.[0]||'';
 const destination=clip(country,2).toUpperCase();if(destination!=='US')throw Error('This Preview demonstration supports US destination context only.');
 return {query:clip(query,500),productTypes:intent.productTypes,maxCents,size:clip(size||intent.normalized.match(/\b(?:us |eu )?size\s+([a-z0-9.]+)/)?.[1],40),sizeSystem:clip(sizeSystem||intent.normalized.match(/\b(us|eu)\s+size\s+/)?.[1]?.toUpperCase(),40),color:colorEvidence(colors).normalized,allowMixed:allowMixed===true,country:destination};
}
export function collectShopify(data,{size='',sizeSystem='',color='',allowMixed=false,maxCents=1000000,productTypes=[],legacySlot='',fixture=false,checkedAt=new Date().toISOString()}={}){
 const items=[],diagnostics=[];
 const products=[...(Array.isArray(data?.products)?data.products:[]),...(data?.product?[data.product]:[])].slice(0,32);
 for(const p of products){
  if(!p||!gid.test(p.id||''))continue;
  const classification=classifyProduct({title:p.title,sourceCategory:p.category?.name??p.category??'',sourceProductType:p.product_type??''});
  for(const v of (Array.isArray(p.variants)?p.variants:[]).slice(0,100)){
   const reasons=[];if(!gid.test(v?.id||''))continue;
   if(v.availability?.available!==true)reasons.push('variant_unavailable');
   const cents=v.price?.currency==='USD'&&Number.isSafeInteger(v.price?.amount)&&v.price.amount>0?v.price.amount:null;
   if(cents===null)reasons.push('valid_usd_price_missing');else if(cents>maxCents)reasons.push('budget_exceeded');
   if(legacySlot&&classification.legacySlot!==legacySlot)reasons.push('category_mismatch');
   if(classification.reviewRequired)reasons.push('classification_needs_review');
   if(productTypes.length&&!productTypes.includes(classification.productType)&&!(productTypes.includes('shoe')&&classification.category==='footwear'))reasons.push('product_type_mismatch');
   const options=(Array.isArray(v.options)?v.options:[]).map(o=>({name:clip(o.name,60),label:clip(o.label,80),unit:clip(o.unit??o.units,30)||null,sizeSystem:clip(o.size_system??o.sizeSystem,40)||null,inferred:o.inferred===true}));
   const sizeOpt=options.find(o=>/^(size|shoe size|numeric shoe size|waist|waist size)$/i.test(o.name));
   const observedSystem=sizeOpt?.sizeSystem??null;
   if(size&&(!sizeOpt||sizeOpt.label.toLowerCase()!==String(size).toLowerCase()))reasons.push('size_not_evidenced');
   if(sizeSystem&&(!observedSystem||observedSystem.toLowerCase()!==String(sizeSystem).toLowerCase()))reasons.push('size_system_not_evidenced');
   const colorOpt=options.find(o=>/^(color|colour)$/i.test(o.name)),evidence=colorEvidence(colorOpt?.label);
   const requested=colorEvidence(color).normalized;
   if(requested&&!(evidence.exactSolid&&evidence.normalized===requested)&&!(allowMixed&&evidence.families.includes(requested)))reasons.push('exact_color_not_evidenced');
   const seller=v.seller||p.seller||{};
   // Prefer the returned variant link, preserving every attribution parameter.
   const url=safeUrl(v.url)||safeUrl(p.url)||safeUrl(v.checkout_url);
   if(!url)reasons.push('retailer_link_missing');
   const media=(Array.isArray(p.media)?p.media:[]).find(m=>m?.type==='image'&&safeUrl(m.url));
   const item={id:v.id,productId:p.id,variantId:v.id,title:clip(p.title,155),variant:clip(v.title,100),brand:clip(p.brand,80),description:clip(p.description,1500),slot:classification.legacySlot,
    merchant:clip(seller.name,90)||(url?new URL(url).hostname:''),merchantId:clip(seller.id,120),merchantDomain:clip(seller.domain,180),url,checkoutUrl:fixture?'':safeUrl(v.checkout_url),
    image:media?safeUrl(media.url):'',imageAlt:clip(media?.alt_text||p.title,130),price:cents===null?null:cents/100,priceCents:cents,currency:'USD',available:v.availability?.available===true,
    size:sizeOpt?.label||'',sizeLabel:sizeOpt?.name??null,sizeUnit:sizeOpt?.unit??null,sizeSystem:observedSystem,options,color:colorOpt?.label||'',colorEvidence:evidence,classification,
    stockStatus:clip(v.availability?.status||'available',40),lowStock:v.availability?.running_low===true,requiresShipping:v.requires?.shipping===true,nativeCheckoutEligible:false,
    source:fixture?'fixture':'shopify_catalog',fixture,affiliateTracked:false,shippingUsEligible:false,shippingEvidence:null,shippingCost:null,deliveryEstimate:null,checkedAt,
    provenance:{provider:fixture?'synthetic_fixture':'shopify_catalog',observedAt:checkedAt,price:'provider_reported',stock:'variant_reported',shipping:'not_independently_verified',options:'original_labels_and_units',image:'merchant_listing_only',inferred:options.filter(o=>o.inferred).map(o=>o.name)},
    fixtureNote:fixture?'Fictional demonstration. No actual stock, price, shipping or retailer offer.':null};
   diagnostics.push({id:v.id,reasons});if(!reasons.length)items.push(item);
  }
 }
 return {items,diagnostics};
}
// Both Store and the isolated Studio demonstration use this exact projection.
export async function discoverProducts(intent,{transport=catalog,fixture=false}={}){
 const data=await transport('search_catalog',{query:intent.query,filters:{available:true,ships_to:{country:intent.country},price:{max:intent.maxCents}},context:{address_country:intent.country,currency:'USD'},pagination:{limit:10}});
 const bounded={...data,products:Array.isArray(data.products)?data.products.slice(0,10):[]};
 const normalized=collectShopify(bounded,{...intent,fixture});normalized.items=normalized.items.slice(0,10);
 return {...normalized,intent,fixture,model:null,aiSkipped:fixture?'isolated_fixture_demo':'permission_unverified',zeroReason:normalized.items.length?null:!data.products?.length?'no_inventory_in_response':'no_variants_meet_exact_constraints'};
}
export function validateRecommendationIds(ids,candidates){
 if(!Array.isArray(ids)||ids.length>10||new Set(ids).size!==ids.length||ids.some(id=>!candidates.some(p=>p.id===id)))throw Error('Invalid recommendation product references');
 return ids.map(id=>candidates.find(p=>p.id===id));
}
