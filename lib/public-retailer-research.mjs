// POC-01 policy-aware public retail discovery. Research links, never live offers.
// No retailer HTML fetches, crawling, pricing extraction or inventory imports.
export const RETAILERS=Object.freeze([
 Object.freeze({id:"uniqlo",name:"UNIQLO",hosts:["uniqlo.com"],status:"excluded",reason:"US terms prohibit commercial collection/use of product listings without express consent"}),
 Object.freeze({id:"gap",name:"Gap",hosts:["gap.com"],status:"research_only",reason:"Public references only; robots excludes search/productData/checkout and reuse permission unverified"}),
 Object.freeze({id:"nordstrom",name:"Nordstrom",hosts:["nordstrom.com"],status:"research_only",reason:"Public references only; robots excludes search/API/checkout and reuse permission unverified"})
]);
export function classifyPublicReference(raw){
 let url;try{url=new URL(raw);}catch{return null;}
 if(url.protocol!=="https:"||url.username||url.password)return null;
 const host=url.hostname.toLowerCase();
 const retailer=RETAILERS.find(r=>r.hosts.some(d=>host===d||host.endsWith("."+d)));
 if(!retailer)return null;
 const path=url.pathname.toLowerCase();
 if(retailer.status==="excluded")return null;
 if(retailer.id==="gap"&&(/\/buy\//.test(path)||/\/checkout\//.test(path)||/\/profile\//.test(path)||/\/shopping-bag/.test(path)||/productdata\.do/.test(path)||/\/browse\/search\.do/.test(path)))return null;
 if(retailer.id==="nordstrom"&&(/^\/api\//.test(path)||/^\/(?:sr|search|checkout|signin|my-account|shoppingbag)/.test(path)))return null;
 return {retailer:retailer.name,retailerId:retailer.id,url:url.href,
  classification:"public_research_reference",verifiedStock:false,verifiedPrice:false,
  verifiedSize:false,verifiedShipping:false,cartEligible:false,sourcePolicy:retailer.reason};
}

/* Candidates are discovery leads, not approved automated ingestion sources.
 * Review current robots/terms, reuse rights, freshness and shipping data
 * individually before changing any status to research_only.
 */
export const REVIEW_QUEUE=Object.freeze([
 Object.freeze({id:"everlane",name:"Everlane",domain:"everlane.com",status:"review_required"}),
 Object.freeze({id:"madewell",name:"Madewell",domain:"madewell.com",status:"review_required"}),
 Object.freeze({id:"jcrew",name:"J.Crew",domain:"jcrew.com",status:"review_required"}),
 Object.freeze({id:"abercrombie",name:"Abercrombie & Fitch",domain:"abercrombie.com",status:"review_required"})
]);
export function researchSources(sources){
 if(!Array.isArray(sources))return [];
 const out=[],seen=new Set();
 for(const source of sources){
  const classified=classifyPublicReference(source?.url);
  if(!classified||seen.has(classified.url))continue;
  seen.add(classified.url);
  out.push({title:String(source.title||classified.retailer).slice(0,140),
   ...classified,kind:"product_page_reference",source:"public_web_reference",
   dataFreshness:"unverified",checkoutEligible:false});
  if(out.length===8)break;
 }
 return out;
}
