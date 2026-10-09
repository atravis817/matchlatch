/* MATCHLATCH Awin candidate programmes — October 9, 2026 live account audit.
 * IDs and authorized domains from official Awin programme details.
 * NONE of these merchants is joined or feed-verified yet.
 */
const CANDIDATES=Object.freeze([
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
 return Boolean(candidate&&programme&&Number(programme.id)===candidate.id
  &&String(programme.linkStatus||"").toLowerCase()==="online"
  &&String(programme.status||"Active").toLowerCase()==="active"
  &&programme.deeplinkEnabled===true);
}
export {CANDIDATES,merchantLinkAllowed,joinedCandidate};
