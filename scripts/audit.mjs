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
check(inline.length===2,"Early appearance boot and Studio logic are separate");
for(const [name,source] of [
  ["Appearance initializer",inline[0]],["Studio initializer",inline[1]],
  ["library.js",library],["outfit-tree.js",tree],
  ["app-shell.js",file("app-shell.js")],["flow-pages.js",file("flow-pages.js")],
  ["savings.js",file("savings.js")]
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
const appShell=file("app-shell.js");
const flowPages=file("flow-pages.js");
const declared=new Set([...htmlIds,...[...library.matchAll(/\.id\s*=\s*"([^"]+)"/g),
  ...tree.matchAll(/\.id\s*=\s*"([^"]+)"/g),
  ...appShell.matchAll(/\.id\s*=\s*"([^"]+)"/g),
  ...flowPages.matchAll(/\.id\s*=\s*"([^"]+)"/g)].map(x=>x[1])]);
const referenced=new Set([...inline.flatMap(x=>[...x.matchAll(/\$\("([^"]+)"\)/g)]),
  ...library.matchAll(/\$\("([^"]+)"\)/g),
  ...tree.matchAll(/\$\("([^"]+)"\)/g),
  ...appShell.matchAll(/\$\("([^"]+)"\)/g),
  ...flowPages.matchAll(/\$\("([^"]+)"\)/g)].map(x=>x[1]));
const missing=[...referenced].filter(id=>!declared.has(id));
check(!missing.length,"All direct DOM references resolved"+(missing.length?": "+missing.join(", "):""));
for(const asset of ["logo-mark.svg","library.css","library.js","outfit-tree.css","outfit-tree.js",
  "savings.css","savings.js","app-shell.css","app-shell.js","theme.css",
  "flow-pages.css","flow-pages.js"]){
  check(fs.existsSync(path.join(root,asset)),asset+" exists");
  check(html.includes("/"+asset),asset+" linked in HTML");
}
check(["mood","studio","store","styles","cart","account"].every(x=>html.includes('id="screen-'+x+'"')),"Six screen surfaces preserved");
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
check(html.includes('id="styles-tabs"')&&library.includes('function renderCollections('),
  "Named collections remain accessible in My Closet subpages");
check(library.includes('dbState.collections=dbState.collections.filter')
  &&library.includes('delete insp.collectionId'),"Deleting a folder retains linked data");
check(!html.includes(".header-side{")&&!file("library.css").includes(".library-note{"),"Orphaned visual styles removed");
const dock=[...html.matchAll(/class="dock-link[^"]*" type="button" data-page="([^"]+)"/g)].map(m=>m[1]);
check(JSON.stringify(dock)===JSON.stringify(["mood","closet","studio","store","me"]),
  "Five-tab navigation order keeps Studio centered");
check(html.indexOf('class="header-cart"')<html.indexOf('id="header-theme-toggle"')
  &&html.indexOf('id="header-theme-toggle"')<html.indexOf("<main"),
  "Cart and appearance controls remain at top right on every page");
check(library.includes('page==="styles"?"closet":page==="account"?"me":page')
  &&library.includes('if(page==="cart"){selectedTab="shortlist";page="styles";}'),
  "Legacy Cart and account links route to My Closet and Me");
check(library.includes('["Wants",wants,"wants"')
  &&library.includes('["Owned",dbState.purchases.length,"purchases"')
  &&library.includes('not retailer-verified orders'),
  "Wants and self-reported Owned items have dedicated, clearly labeled pages");
check(html.includes('id="styles-body" role="region"')
  &&library.includes('closet-page-title')
  &&library.includes('function openClosetTab('),
  "Closet uses labeled pages instead of crowded tab bars");
check(html.includes("matchlatch-appearance-v1")&&html.includes('href="/theme.css"')
  &&file("theme.css").includes(':root[data-theme="dark"]'),
  "Persistent app-wide light/dark theme loads before the first app screen");
check(html.includes("media?.addListener")&&html.includes("matchlatch:appearance")
  &&appShell.includes("initThemeToggle"),
  "Appearance updates on older and modern mobile browsers");
const lightMark=file("logo-mark.svg"),darkMark=file("logo-mark-dark.svg"),themeCss=file("theme.css");
const geometry=svg=>[...svg.matchAll(/\bd="([^"]+)"/g)].map(m=>m[1]);
check(JSON.stringify(geometry(lightMark))===JSON.stringify(geometry(darkMark))
  &&darkMark.includes('fill="#141714"')&&darkMark.includes('stroke="#E9F0E8"'),
  "Dark logo preserves the original lock M and tag geometry with visible cutouts");
check(html.split('src="/logo-mark-dark.svg"').length===3
  &&html.split('src="/logo-mark.svg"').length===3
  &&themeCss.includes('.brand-emblem .brand-mark-dark{display:none}')
  &&themeCss.includes(':root[data-theme="dark"] .brand-emblem .brand-mark-dark{display:block}')
  &&!themeCss.includes("brightness(0) invert"),
  "Header and footer switch logo artwork instead of applying a destructive inversion");
check(file("app-shell.css").includes("repeat(5,minmax(0,1fr))")
  &&file("app-shell.css").includes("safe-area-inset-bottom"),
  "Five destinations remain usable above iPhone home indicator");
check(appShell.includes('Style a similar piece ↗')
  &&appShell.includes('const suggestions={')
  &&appShell.includes('selected.value=choice'),
  "Store style action preselects a real Studio starting point");
check(!/vision engine|Vercel Production environment variables|incognito browser/i.test(html),
  "Customer-facing copy omits internal jargon");
check(html.includes('role="button" tabindex="0" aria-label="Choose a photo to style"')
  &&html.includes('drop.addEventListener("keydown"')
  &&library.includes('"drop")?.focus()'),
  "Photo upload is keyboard accessible and new-project focus is visible");
check(![appShell,library,tree,savings].some(code=>code.includes(".innerHTML")),
  "Product text and library names are never rendered as raw HTML");
check(file("README.md").includes("MOOD → MY CLOSET → STUDIO → STORE → ME"),
  "README describes the five user destinations");
check(flowPages.includes('view==="piece"')&&flowPages.includes('view==="style"')
  &&flowPages.includes('view==="look"')&&flowPages.includes("history.pushState"),
  "Studio uses focused piece, style and result routes with navigation history");
check(library.includes('"/"+selectedTab')&&library.includes('path[1]')&&library.includes("readLocation()"),
  "Closet subpages support refresh and browser Back/Forward");
check(flowPages.includes("MatchlatchMeFlow")&&flowPages.includes('privacy:"Privacy & data"')
  &&appShell.includes("MatchlatchMeFlow?.open("),
  "Me account, privacy, appearance and preferences open as separate pages");
check(appShell.includes('target.dataset.view="results"')
  &&appShell.includes('target.dataset.view="search"')
  &&file("flow-pages.css").includes('#store-body[data-view="results"] .store-search'),
  "Store results are shown on a dedicated view");
check(html.includes('src="/flow-pages.js"')&&html.includes('href="/flow-pages.css"')
  &&html.includes('MatchlatchStudioFlow?.open("look")'),
  "Studio flow navigation is loaded and successful styling opens the result page");
check(flowPages.includes("closet-new-look")&&library.includes('window.MatchlatchStudioFlow?.open("look")'),
  "New looks and reopened outfits use dedicated Studio views");


if(process.exitCode)console.error("MATCHLATCH static audit failed.");
else console.log("MATCHLATCH static audit passed.");
