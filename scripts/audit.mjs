import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const file=name=>fs.readFileSync(path.join(root,name),"utf8");
const check=(ok,message)=>{
  console.log((ok?"PASS":"FAIL")+" "+message);
  if(!ok)process.exitCode=1;
};
const html=file("index.html");
const library=file("library.js");
const tree=file("outfit-tree.js");
const cloud=file("cloud-sync.js");
const shop=file("api/shop.mjs");
const analyze=file("api/analyze.mjs");
const auth=file("api/auth-config.mjs");
const sql=file("supabase/setup.sql");
const agent=JSON.parse(file("ucp-agent.json"));
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
check(inline.length===1,"One inline app script");
for(const [name,source] of [
  ["index.html inline script",inline[0]],["library.js",library],["outfit-tree.js",tree]
]){
  try{new vm.Script(source,{filename:name});check(true,name+" parses");}
  catch(e){console.error(e.message);check(false,name+" parses");}
}
for(const name of ["cloud-sync.js","api/analyze.mjs","api/auth-config.mjs","api/shop.mjs"]){
  const source=file(name).replace(/^export\s+/gm,"").replace(/^import\s+.*$/gm,"");
  try{new vm.Script(source,{filename:name});check(true,name+" parses");}
  catch(e){console.error(e.message);check(false,name+" parses");}
}
const htmlIds=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
check(new Set(htmlIds).size===htmlIds.length,"No duplicate static element IDs");
const declared=new Set([...htmlIds,...[...library.matchAll(/\.id\s*=\s*"([^"]+)"/g),...tree.matchAll(/\.id\s*=\s*"([^"]+)"/g)].map(x=>x[1])]);
const referenced=new Set([...inline[0].matchAll(/\$\("([^"]+)"\)/g),...library.matchAll(/\$\("([^"]+)"\)/g),...tree.matchAll(/\$\("([^"]+)"\)/g)].map(x=>x[1]));
const missing=[...referenced].filter(id=>!declared.has(id));
check(!missing.length,"All direct DOM references resolved"+(missing.length?": "+missing.join(", "):""));
for(const asset of ["logo-mark.svg","library.css","library.js","outfit-tree.css","outfit-tree.js"]){
  check(fs.existsSync(path.join(root,asset)),asset+" exists");
  check(html.includes("/"+asset),asset+" linked in HTML");
}
check(["studio","styles","cart","account"].every(x=>html.includes('id="screen-'+x+'"')),"Four screens retained");
check(tree.includes("FRESH_MS=")&&tree.includes("remaining(slotId)")&&tree.includes("cycle(slotId"),"Live tree cycle and budget safeguards present");
check(shop.includes('v.availability?.available!==true')&&shop.includes('m?.currency==="USD"'),"Stock/price checks present");
check(!shop.includes("id,filters:{"),"Product verification uses supported API parameters");
check(shop.includes('"cache-control":"no-store"'),"Live catalog responses never cached by server");
check(agent.ucp?.capabilities?.["dev.ucp.shopping.catalog.search"]!==undefined,"Shopify agent profile includes catalog search");
check(analyze.includes('timingSafeEqual')&&analyze.includes('store: false'),"Private beta gate and no-store AI request");
check(sql.includes("enable row level security")&&sql.includes("public=false"),"Private database and storage policy definitions");
check(auth.includes("payload.role===\"anon\""),"No service-role key exposed through config");
check(library.includes("inspirationId:cart.inspirationId")&&library.includes("inspirationId:look.inspirationId"),"Inspiration linkage retained");
check(!library.includes('let activeTab='),"Obsolete navigation state removed");
const savings=file("savings.js");
const savingsApi=file("api/savings.mjs");
for(const [label,code] of [["savings.js",savings],["api/savings.mjs",savingsApi.replace(/^export\s+/gm,"")]]){
  try{new vm.Script(code,{filename:label});check(true,label+" parses");}
  catch(error){console.error(error.message);check(false,label+" parses");}
}
check(html.includes('src="/savings.js"')&&html.includes('href="/savings.css"'),
  "Automatic Savings Check UI assets linked");
check(tree.includes("MatchlatchSavings?.attach?.(info,item)")
  &&library.includes("MatchlatchSavings?.attach?.(actions,payload.item)"),
  "Coupon lookups attached to live and saved retailer items");
check(savingsApi.includes("AWIN_API_TOKEN")&&savingsApi.includes("provider_listed")
  &&savingsApi.includes("listed_not_checkout_verified"),
  "Coupon feed uses server-only key and no false checkout verification");
check(savingsApi.includes("matches(host,d)")
  &&savingsApi.includes("Date.parse("),
  "Coupon filtering validates merchant-domain match and expiry");
check(savings.includes("offset<domains.length;offset+=15")&&savings.includes("domains.slice(offset,offset+15)"),
  "Coupon scanner batches multi-retailer outfits within 15-domain API limit");
check(file("SAVINGS-CHECK.md").includes("not checkout-verified"),
  "Savings provider documentation records verification limitations");
check(library.includes('collections:[]')&&library.includes('function createCollection(')
  &&library.includes('function renderCollections('),"Named collections preserve old wardrobe state");
check(library.includes('inspiration.collectionId=collectionId')&&library.includes('delete inspiration.collectionId')
  &&library.includes('filter(x=>ids.has(x.inspirationId))'),"Inspiration-owned folder membership cascades to linked looks/items");
check(cloud.includes('"collections"')&&sql.includes("'collections'")
  &&file("supabase/collections.sql").includes("matchlatch_records_kind_check"),
  "Collections supported by private cloud records and upgrade script");
check(html.includes('id="styles-tabs"')&&library.includes('["collections","Collections"'),
  "Collection navigation wired into Your Styles");
check(library.includes('dbState.collections=dbState.collections.filter')
  &&library.includes('delete insp.collectionId'),"Deleting a folder retains linked data");
check(!html.includes(".header-side{")&&!file("library.css").includes(".library-note{"),"Orphaned visual styles removed");
if(process.exitCode)console.error("MATCHLATCH static audit failed.");
else console.log("MATCHLATCH static audit passed.");
