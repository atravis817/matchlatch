/* MATCHLATCH explicitly vetted Awin programme registry. Membership is checked live.
 * Joined is not a product-feed approval. Merchant destinations are allowlisted.
 */
const CANDIDATES=Object.freeze([
 {id:117849,name:"ZazzMode",category:"Statement fashion",slots:["shirt","jacket","hat"],domains:["zazzmode.com","rd9wpk-6j.myshopify.com"],priority:0},
 {id:126793,name:"Cacio Pepe (US)",category:"Menswear essentials",slots:["shirt","pants","jacket","hat","shoes"],domains:["caciopepebrand.com","caciopepebrand.myshopify.com"],priority:0},
 {id:6016,name:"W Concept (US)",category:"Designer fashion",slots:["shirt","pants","jacket","shoes"],domains:["wconcept.com","us.wconcept.com"],priority:1},
 {id:16225,name:"Suitsupply (US)",category:"Tailored menswear",slots:["shirt","pants","jacket","shoes","belt"],domains:["suitsupply.com"],priority:1},
 {id:15378,name:"MESHKI US",category:"Women's fashion",slots:["shirt","pants","jacket","shoes"],domains:["meshki.us","meshki.com.au","meshki-us.myshopify.com"],priority:1},
 {id:15431,name:"Under Armour US",category:"Athletic clothing",slots:["shirt","pants","jacket","shoes","socks","hat"],domains:["underarmour.com"],priority:1},
 {id:83063,name:"Loci Wear Ltd",category:"Vegan footwear",slots:["shoes"],domains:["lociwear.com","lociwear.myshopify.com"],priority:2},
 {id:106789,name:"Varley US",category:"Women's everyday clothing",slots:["shirt","pants","jacket"],domains:["varley.com"],priority:2}
]);
const asHost=value=>{
 try{const url=new URL(value);return url.protocol==="https:"?url.hostname.toLowerCase().replace(/^www\./,""):"";}
 catch{return "";}
};
function merchantLinkAllowed(candidate,url){
 const host=asHost(url);
 return Boolean(candidate&&host&&candidate.domains.some(domain=>host===domain||host.endsWith("."+domain)));
}
function joinedCandidate(programme,candidate){
 // Awin GET /programmes?relationship=joined omits deeplinkEnabled and
 // linkStatus; those fields occur only in programmedetails. Requiring them
 // here wrongly rejects every joined programme. The endpoint provides proof
 // of membership, and the joined listing must still be Active and US-based.
 return Boolean(candidate&&programme&&Number(programme.id)===candidate.id
  &&String(programme.status||"").toLowerCase()==="active"
  &&String(programme.primaryRegion?.countryCode||"").toUpperCase()==="US"
  &&String(programme.currencyCode||"")==="USD"
  &&candidate.domains.length>0);
}
export {CANDIDATES,merchantLinkAllowed,joinedCandidate};
