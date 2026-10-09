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
