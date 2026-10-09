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
const retailerMatch=file("retailer-match.js");
const awinFeed=file("lib/awin-feed-normalize.mjs");
const awinPublic=file("lib/awin-public-catalog.mjs");
const awinImporter=file("scripts/sync-awin-feeds.mjs");
const awinRegistry=file("lib/awin-retailers.mjs");
const webDiscovery=file("api/discover.mjs");
const camera=file("camera.js");
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
  ["library.js",library],["outfit-tree.js",tree],["retailer-match.js",retailerMatch],
  ["app-shell.js",file("app-shell.js")],["flow-pages.js",file("flow-pages.js")],
  ["savings.js",file("savings.js")],["camera.js",camera]
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
  ...flowPages.matchAll(/\$\("([^"]+)"\)/g),
  ...camera.matchAll(/\$\("([^"]+)"\)/g)].map(x=>x[1]));
const missing=[...referenced].filter(id=>!declared.has(id));
check(!missing.length,"All direct DOM references resolved"+(missing.length?": "+missing.join(", "):""));
for(const asset of ["logo-mark.svg","library.css","library.js","outfit-tree.css","outfit-tree.js",
  "savings.css","savings.js","app-shell.css","app-shell.js","theme.css",
  "flow-pages.css","flow-pages.js","greenglass.css","typography.css","commerce.css",
  "camera.css","camera.js","retailer-match.js"]){
  check(fs.existsSync(path.join(root,asset)),asset+" exists");
  check(html.includes("/"+asset),asset+" linked in HTML");
}
check(["mood","studio","store","styles","cart","account"].every(x=>html.includes('id="screen-'+x+'"')),"Six screen surfaces preserved");
check(tree.includes("FRESH_MS=")&&tree.includes("remaining(slotId)")&&tree.includes("cycle(slotId"),"Live tree cycle and budget safeguards present");
check(shop.includes('v.availability?.available!==true')&&shop.includes('m?.currency==="USD"'),"Stock/price checks present");
check(shop.includes('id,filters:{ships_to:destination,available:true}'),"Product verification uses supported API parameters");
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
check(file("SAVINGS-CHECK.md").includes("listed_not_checkout_verified"),
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
check(appShell.includes('function openProduct(item)')
  &&appShell.includes('lib()?.addRetailProduct?.({...item,slot:storeState.slot})')
  &&library.includes("function addRetailProduct(item)"),
  "Store real product selections feed the existing MATCHLATCH cart");
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
check(appShell.includes('showStoreView("results")')
  &&appShell.includes('showStoreView("product")')
  &&file("commerce.css").includes('#store-body[data-view="product"]'),
  "Store product details and results use dedicated views");
check(html.includes('src="/flow-pages.js"')&&html.includes('href="/flow-pages.css"')
  &&html.includes('MatchlatchStudioFlow?.open("look")'),
  "Studio flow navigation is loaded and successful styling opens the result page");
check(flowPages.includes("closet-new-look")&&library.includes('window.MatchlatchStudioFlow?.open("look")'),
  "New looks and reopened outfits use dedicated Studio views");



/* Commerce-stage release gate: real selection, one cart, honest checkout. */
check(html.includes('href="/commerce.css"')
  &&html.indexOf('href="/commerce.css"')>html.indexOf('href="/greenglass.css"'),
  "Commerce shell loads after existing GreenGlass and typography");
check(shop.includes('collect(shopify,size,color)')&&shop.includes('checkoutUrl:safeUrl(v.checkout_url)'),
  "Real retailer listings preserve exact variant and merchant-owned checkout references");
check(library.includes('function addRetailProduct(item)')
  &&library.includes('item.available!==true||item.currency!=="USD"')
  &&library.includes('secureProductUrl(item?.url)'),
  "Add-to-cart requires a verified USD variant and safe retailer link");
check(library.includes('function renderCheckout(target)')
  &&library.includes('if(selectedTab==="checkout")renderCheckout(content)')
  &&library.includes('checkout:"Checkout"'),
  "Checkout review is a real Closet subpage with shareable navigation");
check(library.includes('renderCart(target=$("cart-body"))')
  &&library.includes('addRetailProduct,')
  &&!library.includes('matchlatch-commerce-cart-v1'),
  "Studio and Store share the original persisted shopping cart");
check(library.includes('MATCHLATCH does not collect payment or place orders yet')
  &&library.includes('Each retailer handles payment and delivery'),
  "Checkout never claims payment or order placement");
check(file("commerce.css").includes('.commerce-checkout-grid')
  &&file("commerce.css").includes(':root[data-theme="dark"]')
  &&file("commerce.css").includes('@media(max-width:500px)'),
  "Commerce shell supports responsive layouts and dark mode");
check(file("COMMERCE-STAGE.md").includes('Variant-specific Shopify cart permalink is used')
  &&file("COMMERCE-STAGE.md").includes('POC-01'),
  "Commerce handoff and future capability boundaries documented");

/* POC-01: server-verified Shopify variant checkout link, no simulated payment. */
check(library.includes('async function verifyCheckoutItem(cartItem)')
  &&library.includes('mode:"verify"')
  &&library.includes('live.variantId!==variant')
  &&library.includes('secureProductUrl(live.checkoutUrl)'),
  "POC checkout verifies exact Shopify variant and HTTPS merchant link");
check(library.includes('function verifiedCheckoutAction(item)')
  &&library.includes('Price changed since you added this item')
  &&library.includes("Direct checkout isn't offered for this listing")
  &&library.includes('window.location.assign(checked.url)'),
  "POC handoff explicitly handles changed price, fallback and direct checkout");
check(file("PROOF-OF-CONCEPT.md").includes('10 independent first-time users')
  &&file("PROOF-OF-CONCEPT.md").includes('not yet measured results'),
  "POC includes measurable, currently unverified validation goals");

/* Native-permission in-app camera: no simulated prompts or background recording. */
check(html.includes('id="open-camera"')
  &&html.includes('id="studio-camera-dialog"')
  &&html.includes('id="camera-shutter"')
  &&html.includes('id="camera-review"')
  &&html.includes('playsinline muted')
  &&html.includes('capture="environment"'),
  "Studio exposes native-permission viewfinder and device-camera fallback");
check(camera.includes('navigator.mediaDevices.getUserMedia({')
  &&camera.includes('audio:false')
  &&camera.includes('openButton.addEventListener("click",()=>void openCamera())'),
  "Camera permission is requested only from the user-invoked camera action");
check(camera.includes('sequence++')
  &&camera.includes('track.stop()')
  &&camera.includes('visibilitychange')
  &&camera.includes('pagehide')
  &&camera.includes('matchlatch:page'),
  "Camera tracks are released after closing, page exit and in-flight permission cancellation");
check(camera.includes('canvas.toBlob(resolve,"image/jpeg",.84)')
  &&camera.includes('window.MatchlatchStudioPhoto?.loadFile?.(photo)')
  &&html.includes('MatchlatchStudioPhoto=Object.freeze({loadFile:file=>loadImage(file,true)})'),
  "Captured frames reuse Studio's existing photo processing and privacy pipeline");
check(file("camera.css").includes("safe-area-inset-bottom")
  &&file("camera.css").includes("prefers-reduced-motion")
  &&file("camera.css").includes('data-theme="dark"'),
  "Camera UI supports iPhone safe area, dark mode and reduced motion");
check(file("CAMERA-STAGE.md").includes("Permission behavior")
  &&file("CAMERA-STAGE.md").includes("not deployed"),
  "Camera stage privacy and deployment boundaries documented");

/* POC-04: curation-first and Awin feeds as strictly secondary opportunities. */
try{
 new vm.Script(awinFeed.replace(/^export\s+\{[^}]+\};?\s*$/gm,""),{filename:"lib/awin-feed-normalize.mjs"});
 check(true,"Dormant Awin feed normalizer parses");
}catch(error){console.error(error.message);check(false,"Dormant Awin feed normalizer parses");}
check(retailerMatch.includes('if(tokens.length&&!matched)continue')
  &&retailerMatch.includes('CATEGORY_HINTS[c.slot].test(visible)')
  &&retailerMatch.includes('explicitConflict(item,c)'),
  "Curation requires category, user intent evidence, and explicit restrictions");
check(retailerMatch.includes('candidates.sort((a,b)=>b.score-a.score||b.saving-a.saving')
  &&retailerMatch.includes('discountEvidence!=="retailer_published_sale"')
  &&!retailerMatch.includes('item.commission'),
  "Verified sale benefits can only break equal style-relevance ties; commissions never rank");
check(appShell.includes("function storeSizeFor(slot,p)")
  &&appShell.includes("items=matcher.rank(")
  &&appShell.includes('params.set("size",criteria.size)')
  &&appShell.includes('params.set("color",criteria.color)'),
  "All manual Store searches apply saved sizing and curation constraints");
check(tree.includes('if(state.selected?.variantId===item.variantId)')
  &&tree.includes('window.MatchlatchSavings?.attach?.(info,item)'),
  "Awin Savings Check runs only on the selected, qualifying Private Shop item");
check(analyze.includes("PERSONAL CURATION IS ALWAYS THE FIRST OBJECTIVE")
  &&analyze.includes("Do NOT reason about or prioritize discounts"),
  "OpenAI styling instructions put user's criteria before deals or advertising");
check(awinFeed.includes('sellerApproved(advertiserId,joinedIds)')
  &&awinFeed.includes('requiresMerchantVerification:true')
  &&awinFeed.includes('source:"awin_feed_snapshot"')
  &&!awinFeed.includes('fetch('),
  "Awin importer requires joined advertiser and live merchant verification; no crawling");
check(file("AWIN-CURATION-PRIORITIES.md").includes("Shopper-set criteria are the source of truth")
  &&file("AWIN-CURATION-PRIORITIES.md").includes("Secondary savings"),
  "Awin publisher feeds, privacy, permissions, and curation hierarchy documented");
check(file("scripts/test-curation.mjs").includes('Stronger personal match always outranks')
  &&file("scripts/test-curation.mjs").includes('Awin cached stock is never labeled live verified'),
  "Deterministic style-before-savings and Awin-feed regression suite included");

/* POC-03: AI-generated shopping criteria and honest retailer coverage. */
check(analyze.includes('slot: { type: "string", enum:')
  &&analyze.includes('color: { type: "string" }')
  &&analyze.includes('slot: p.slot'),
  "OpenAI structured output provides retailer category and garment color");
check(shop.includes('if(mode==="capabilities")')
  &&shop.includes('retailerDirectoryAvailable:false')
  &&shop.includes('retailerCoverage:{scope:"this search only"')
  &&shop.includes('merchantId:clip(seller.id,120)'),
  "Catalog reports observed shops without fabricating a global retailer directory");
check(shop.includes('ships_to:destination')
  &&shop.includes('const item=collect(data,size,color)')
  &&shop.includes('shippingCost:null,deliveryEstimate:null')
  &&shop.includes('lowStock:v.availability?.running_low===true'),
  "Retailer filter checks variant price, stock, size, color and US shipping eligibility");
check(tree.includes('function criteriaFor(id,max=')
  &&tree.includes('engine?.rank?.(raw,criteria)')
  &&tree.includes('qs.set("color",criteria.color)')
  &&tree.includes('if(auto&&!custom&&criteria?.alternate'),
  "Outfit tree searches catalog using explicit AI criteria and bounded fallback");
check(html.includes('src="/retailer-match.js"')
  &&html.indexOf('src="/retailer-match.js"')<html.indexOf('src="/outfit-tree.js"')
  &&retailerMatch.includes('window.MatchlatchRetailerMatch=Object.freeze'),
  "Retailer matching engine is loaded before outfit recommendations");
check(appShell.includes('store-retailer-summary')
  &&appShell.includes('matches?.merchants?.(items)'),
  "Store shows actual merchants returned by the current live search");
check(file("RETAILER-CAPABILITIES.md").includes("No direct crawling")
  &&file("RETAILER-CAPABILITIES.md").includes("Retailer names discovered only"),
  "Retailer coverage, exact data capabilities and unknowns documented");

/* POC-05 Awin guarded integration and current account application gates. */
for(const [name,source] of [
 ["Awin registry",awinRegistry],
 ["Awin public reader",awinPublic],
 ["Awin feed importer",awinImporter]
]){
 try{
  const valid=source.replace(/^import .*$/gm,"").replace(/^export\s+\{[^}]+\};?\s*$/gm,"");
  new vm.Script(valid,{filename:name});check(true,name+" parses");
 }catch(error){console.error(error.message);check(false,name+" parses");}
}
check(awinRegistry.includes("CANDIDATES=Object.freeze")
  &&awinRegistry.includes("merchantLinkAllowed")
  &&awinRegistry.includes("joinedCandidate"),
  "Retailer allowlist is limited to verified Awin programme IDs and domains");
check(awinPublic.includes('MATCHLATCH_SUPABASE_PUBLISHABLE_KEY')
  &&awinPublic.includes('row.is_public!==true')
  &&awinPublic.includes('stockVerifiedLive:false')
  &&awinPublic.includes('checkoutUrl:""'),
  "Awin products are RLS-published snapshots, not fake live stock or checkout sessions");
check(shop.includes('searchAwin({slot,q,max,size,color})')
  &&shop.includes('await verifyAwin({id,variant:variantId,max,size,color})')
  &&shop.includes('Promise.allSettled'),
  "Shopify and Awin browsing providers coexist with independent failure isolation");
check(library.includes('item?.source==="awin"')
  &&library.includes('directCheckout:shopify&&Boolean(checkout)')
  &&library.includes('Retailer feed listing confirmed')
  &&library.includes('Product choices are based on your style, not commissions'),
  "Awin cart and retailer handoff preserve personalization and no false checkout");
check(awinImporter.includes('AWIN_PUBLISH_APPROVED==="1"')
  &&awinImporter.includes('joinedCandidate(joined.get(candidate.id),candidate)')
  &&awinImporter.includes('records.at(-1)?.error')
  &&awinImporter.includes('await delay(12500)'),
  "Awin feed indexing is manual, fail-closed, member-gated and provider-rate-limited");
check(file("supabase/awin_retailer_catalog.sql").includes("enable row level security")
  &&file("supabase/awin_retailer_catalog.sql").includes("create trigger matchlatch_awin_publish_gate")
  &&file("supabase/awin_retailer_catalog.sql").includes("create trigger matchlatch_awin_unpublish_partner"),
  "Supabase partner and product catalog enforce database-level activation gates");
check(file("AWIN-PARTNER-ONBOARDING.md").includes("NOT SUBMITTED")
  &&file("AWIN-PARTNER-ONBOARDING.md").includes("Not joined")
  &&file("scripts/test-awin-integration.mjs").includes("never use service-role auth to browse"),
  "Awin application handoff and integration regression tests are documented");

/* POC-06: first two joined Awin merchants and explicitly sourced web discovery. */
try{
 new vm.Script(webDiscovery.replace(/^import .*$/gm,"").replace(/^export\s+/gm,""),{filename:"api/discover.mjs"});
 check(true,"Web discovery endpoint parses");
}catch(error){console.error(error.message);check(false,"Web discovery endpoint parses");}
check(awinRegistry.includes("id:117849")&&awinRegistry.includes("id:126793")
  &&awinRegistry.includes("programme.primaryRegion?.countryCode")
  &&awinRegistry.includes("programme.currencyCode")
  &&!awinRegistry.includes('programme.deeplinkEnabled===true'),
  "Joined programmes are checked against the fields Awin actually returns");
check(awinFeed.includes("row.price_and_availability")
  &&awinFeed.includes("row.product_category")
  &&awinFeed.includes("row.product_attributes")
  &&awinFeed.includes("Array.isArray(shipment)")
  &&awinFeed.includes("!s.postal_code"),
  "Enhanced Awin Google feeds support nested pricing, category, size/color and region-safe shipping");
check(webDiscovery.includes('tools:[{type:"web_search",search_context_size:"low"}]')
  &&webDiscovery.includes('include:["web_search_call.action.sources"]')
  &&webDiscovery.includes("store:false")
  &&webDiscovery.includes("acceptsCode(body?.betaCode,code)"),
  "OpenAI web research requires beta code and returns real indexed citations without storing user search");
check(webDiscovery.includes("cartEligible:false")
  &&webDiscovery.includes("verifiedStock:false")
  &&webDiscovery.includes("verifiedPrice:false")
  &&webDiscovery.includes("PERSONAL CURATION outranks"),
  "Web research does not manufacture purchasable products and puts personal styling first");
check(appShell.includes('button("Explore wider web ↗"')
  &&appShell.includes('fetch("/api/discover"')
  &&appShell.includes("Web references are opt-in styling research; never cart-ready products."),
  "Store's optional web discovery is kept separate from actual cart-eligible retailer listings");
check(file("supabase/awin_joined_candidates.sql").includes("on conflict (advertiser_id) do nothing")
  &&file("JOINED-RETAILERS-WEB-DISCOVERY.md").includes("UNKNOWN (no live feed download)"),
  "Two joined merchants are documented without inventing available feeds or checkout");
check(file("scripts/test-web-discovery.mjs").includes("Bad code cannot incur web-search cost")
  &&file("scripts/test-awin-integration.mjs").includes("Awin joined-programmes endpoint does NOT include"),
  "Web source and Awin joined-product regression suites are present");

/* V1.2 continuity: MOOD sends category context, STORE restores results honestly. */
check(appShell.includes("initialStoreSlot=")
  &&appShell.includes('select.value=initialStoreSlot||storeState.slot')
  &&appShell.includes('const category=String(direction.anchorType||"").split(":")[0]'),
  "V1.2 Mood shopping handoff carries matching clothing category");
check(appShell.includes('const requestedView=(location.hash||"")')
  &&appShell.includes('storeState.searched&&!initialStoreQuery')
  &&appShell.includes('Previous results · prices and availability may have changed. Search again to refresh.'),
  "V1.2 Store restores prior results with a stock freshness warning");
check(file("V1.2-UX-SPEC.md").includes("## Milestone A") &&
  file("V1.2-TAB-IMPLEMENTATION.md").includes("## MY CLOSET"),
  "V1.2 journey and five-tab acceptance plans are present");

/* V1.2 shared journey: all five destinations provide continuity. */
check(appShell.includes('function renderClosetBridge()')
  &&appShell.includes('if(page==="styles"||page==="closet")renderClosetBridge()'),
  "V1.2 Closet bridge offers a path back to Studio");
check(appShell.includes('const context=el("section","v12-context")')
  &&appShell.includes('Edit style in Me ↗'),
  "V1.2 Studio exposes applied preference context");
check(appShell.includes('Create a look in Studio ↗')
  &&appShell.includes('initialStoreSlot='),
  "V1.2 Mood provides explicit Studio and category-aware Store handoffs");
check(appShell.includes('v12-store-context') && appShell.includes('v12-me-context'),
  "V1.2 Store trust boundaries and Me profile impacts are explained");
check(file("app-shell.css").includes(".v12-closet-bridge")
  &&file("app-shell.css").includes("@media(max-width:580px)"),
  "V1.2 five-tab context is styled responsively");

check(appShell.includes('v12-product-source') &&
  appShell.includes('AWIN RETAILER FEED') &&
  appShell.includes('SHOPIFY RETAILER CATALOG') &&
  appShell.includes('Size not specified') &&
  appShell.includes('Confirm final price, size and shipping at retailer'),
  "V1.2 Store cards disclose product source, size limits, freshness and checkout uncertainty");
check(appShell.includes('button("View product details ↗"') &&
  appShell.includes('button("Add to shortlist"') &&
  file("app-shell.css").includes(".v12-product-card"),
  "V1.2 Store cards consistently present details and shortlist actions");

/* V1.2 delivery forecast: destination alone never fabricates shipping times. */
check(appShell.includes('const SHIPPING_KEY="matchlatch-shipping-region-v12"')
  &&appShell.includes('estimate?.destinationZip===zip')
  &&appShell.includes('estimate?.source==="retailer"')
  &&appShell.includes('Delivery estimate unavailable until retailer confirms transit times'),
  "Shipping forecast requires a retailer-sourced destination-specific date range");
check(appShell.includes('input.pattern="[0-9]{5}"')
  &&appShell.includes('localStorage.removeItem(SHIPPING_KEY)')
  &&appShell.includes("never sent to product search, analytics or OpenAI"),
  "Shipping destination is optional, editable and kept locally");

/* V1.2 delivery deadline blocks unsupported arrival claims and stays optional. */
check(appShell.includes('deadline.type="date"')
  &&appShell.includes('storeState.needBy=deadline.value')
  &&appShell.includes('deliveryByDate(item,storeState.needBy,shippingZip())'),
  "Store native calendar deadline participates in result filtering");
check(appShell.includes('e.latest<=deadline')
  &&appShell.includes('e?.source==="retailer"')
  &&appShell.includes('Save your destination ZIP in Me before using Need it by.'),
  "Need-by results require matching destination and retailer-estimated latest arrival");
check(file("app-shell.css").includes('.v12-date-field input[type="date"]'),
  "Delivery deadline calendar uses mobile-accessible styling");

check(file("lib/public-retailer-research.mjs").includes('status:"excluded"')
  &&file("lib/public-retailer-research.mjs").includes('classification:"public_research_reference"')
  &&file("api/discover.mjs").includes("classifyPublicReference(source.url)"),
  "POC-01 restricts commercial collection and identifies research-only citations");
check(file("api/public-catalog.mjs").includes('automatedProductIngestion:false')
  &&file("scripts/test-public-catalog.mjs").includes('PASS POC-01 policy guardrails'),
  "POC-01 exposes honest discovery readiness and regression tests");

if(process.exitCode)console.error("MATCHLATCH static audit failed.");
else console.log("MATCHLATCH static audit passed.");
