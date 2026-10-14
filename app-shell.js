/* MATCHLATCH destinations: MOOD / MY CLOSET / STUDIO / STORE / ME.
 * Browser-side curation uses the owner's current profile and private library.
 * This is deterministic personalization, not an invented AI model output.
 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const lib=()=>window.MatchlatchLibrary;
const snapshot=()=>lib()?.discoverySnapshot?.()||{collections:[],inspirations:[],looks:[],favorites:[],cartCount:0};
const profile=()=>{
 const base=window.MatchlatchStyleProfile?.get?.()||{};
 try{
  const accountId=window.MatchlatchLibrary?.getUserId?.();
 const quiz=accountId?JSON.parse(localStorage.getItem("matchlatch-style-quiz-v1-"+accountId)||"null"):null;
  if(quiz?.version!==1||!quiz.answers||typeof quiz.answers!=="object")return base;
  const labels=["Everyday vibe","Silhouette","Palette","Pattern","Layering","Occasion","Footwear","Priority","Accessories","Fabric","Denim","Top","Jacket","Trends","Inspiration","Contrast","Season","Complexity","Brands","AI goal"];
  const traits=Object.entries(quiz.answers).filter(([index,value])=>/^\d{1,2}$/.test(index)&&+index<20&&typeof value==="string"&&value.length<50).slice(0,12).map(([i,value])=>labels[+i]+": "+value);
  return {...base,notes:[String(base.notes||""),traits.join("; ")].filter(Boolean).join(". ").slice(0,210)};
 }catch{return base;}
};
const SHIPPING_KEY="matchlatch-shipping-region-v12";
const shippingKey=()=>{const id=lib()?.getUserId?.();return id?SHIPPING_KEY+"-"+id:null;};
const shippingZip=()=>{const key=shippingKey();if(!key)return "";try{const z=localStorage.getItem(key)||"";return /^\d{5}$/.test(z)?z:"";}catch{return "";}};
const shippingInfo=item=>{
 const zip=shippingZip(),label=zip?"Destination ZIP •••"+zip.slice(-2):"Destination not set";
 const verified=item?.delivery?.tier==="retailer_confirmed"?item.delivery:null;
 return verified?.earliest&&verified?.latest
  ?label+" · Retailer estimated "+verified.earliest+" to "+verified.latest+" (subject to logistics)"
  :label+" · Delivery estimate unavailable until retailer confirms transit times";
};
const el=(tag,cls,text)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=String(text);
 return node;
};
const button=(label,fn,cls="destination-link")=>{
 const b=el("button",cls,label);b.type="button";b.addEventListener("click",fn);return b;
};
const sectionTitle=(kicker,title,description,headingTag="h2")=>{
 const wrap=el("div","destination-section-title");
 const names=el("div");names.append(el("span","micro-title",kicker),el(headingTag,null,title));
 wrap.append(names);
 if(description)wrap.append(el("p",null,description));
 return wrap;
};
const showPage=page=>lib()?.showPage?.(page);
const formatDate=iso=>{
 const d=new Date(iso);return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{month:"short",day:"numeric"}):"";
};
const pick=(v,fallback)=>{
 const s=String(v||"").trim();
 return s&&!/^(no preference|balance \/ let ai decide|any season)$/i.test(s)?s:fallback;
};
function openFolders(){
 lib()?.openClosetTab?.("collections");
}
function photoTile(inspirationId,cls="destination-photo"){
 const wrap=el("div",cls);
 const img=el("img");img.alt="Saved inspiration";img.loading="lazy";
 const fallback=el("span","destination-photo-fallback","SAVED PHOTO");
 wrap.append(fallback,img);
 lib()?.attachInspirationPhoto?.(img,inspirationId);
 img.addEventListener("load",()=>{fallback.hidden=true;});
 img.addEventListener("error",()=>{img.removeAttribute("src");fallback.hidden=false;});
 return wrap;
}
function renderWorkspace(){
 const target=$("studio-workspace");if(!target)return;
 target.replaceChildren();
 const state=snapshot();
 const heading=sectionTitle("Your studio","Studio","Your style. Your budget. One simpler way to shop.","h1");
 target.append(heading);
 const p=profile();
 const context=el("section","v12-context");
 context.setAttribute("aria-label","Current styling preferences");
 context.append(el("span","micro-title","YOUR CURRENT STYLE"));
 const values=[["Style",pick(p.aesthetic,"Choose in Me")],["Fit",pick(p.fit,"Not set")],
  ["Occasion",pick(p.occasion,"Everyday")],["Budget",p.budget&&Number(p.budget)>0?"$"+Number(p.budget).toFixed(0):"Set in Studio"]];
 const tags=el("div","v12-context-tags");
 for(const [label,value] of values)tags.append(el("span","v12-context-tag",label+" · "+value));
 context.append(tags);
 context.append(button("Edit style in Me ↗",()=>{
  const openPreferences=()=>{if(lib()?.showPage?.("account")!==false)window.MatchlatchMeFlow?.open("preferences");};
  if(!lib()?.requireAccount?.(openPreferences))return;
  openPreferences();
 },"destination-link quiet"));
 target.append(context);
 const actions=el("div","studio-entry-grid");
 const newCard=el("article","studio-entry studio-entry-primary");
 newCard.append(el("span","studio-entry-eyebrow","Start fresh"));
 newCard.append(el("h3",null,"Start with a piece"));
 newCard.append(el("p",null,"Upload an image or describe the piece you want to build around."));
 newCard.append(button("Create a new look ↗",()=>lib()?.startFreshStudio?.(),"studio-entry-action"));
 actions.append(newCard);
 const resumeCard=el("article","studio-entry");
 resumeCard.append(el("span","studio-entry-eyebrow","Saved work"));
 resumeCard.append(el("h3",null,"Continue a look"));
 resumeCard.append(el("p",null,state.looks.length?
   state.looks.length+" look"+(state.looks.length===1?"":"s")+" in your archive · "+state.collections.length+" folder"+(state.collections.length===1?"":"s"):
   "Your saved looks and collections will appear here."));
 resumeCard.append(button("Browse your folders ↗",openFolders,"studio-entry-action quiet"));
 actions.append(resumeCard);target.append(actions);
 if(state.collections.length){
  const row=el("div","destination-folders");
  row.append(el("div","destination-inline-title","Your collections"));
  const rail=el("div","folder-rail");
  for(const folder of state.collections.slice(0,3)){
   const count=state.inspirations.filter(x=>x.collectionId===folder.id).length;
   const chip=button("",()=>lib()?.openCollection?.(folder.id),"folder-chip");
   chip.append(el("span","folder-chip-icon","▱"));
   const text=el("span");text.append(el("strong",null,folder.name),el("small",null,count+" inspiration"+(count===1?"":"s")));
   chip.append(text);rail.append(chip);
  }
  rail.append(button("All collections →",openFolders,"folder-chip-all"));
  row.append(rail);target.append(row);
 }
 if(state.looks.length){
  const wrap=el("div","destination-recent");
  wrap.append(sectionTitle("Pick up where you left off","Recent looks","Open a saved look to keep styling or shopping."));
  const grid=el("div","destination-recent-grid");
  for(const look of state.looks.slice(0,2)){
   const card=el("article","destination-recent-card");
   card.append(photoTile(look.inspirationId));
   const info=el("div","destination-recent-info");
   const folder=state.collections.find(c=>c.id===state.inspirations.find(i=>i.id===look.inspirationId)?.collectionId);
   info.append(el("div","micro-title",(folder?.name||"UNFILED")+" · "+formatDate(look.createdAt)));
   info.append(el("h3",null,look.label||"Untitled look"));
   info.append(button("Continue look ↗",()=>lib()?.openLook?.(look.id)));
   card.append(info);grid.append(card);
  }
  wrap.append(grid);target.append(wrap);
 }
}
function curatedDirections(state,p){
 const aesthetic=pick(p.aesthetic,"Minimalist");
 const fit=pick(p.fit,"Relaxed");
 const occasion=pick(p.occasion,"Everyday");
 const palette=pick(p.palette,"Neutral");
 const saved=state.looks.find(l=>l.saved)||state.looks[0];
 const oldColor=String(saved?.item?.color||"").trim();
 const color=oldColor||(/earth/i.test(palette)?"olive":/pastel/i.test(palette)?"sage":/black/i.test(palette)?"black":"charcoal");
 const firstFolder=state.collections.find(f=>state.inspirations.some(i=>i.collectionId===f.id));
 return [
  {
   tag:"YOUR SIGNATURE",title:aesthetic==="Minimalist"?"The quiet uniform":aesthetic+" / daily",
   subtitle:"Everyday with intention.",accent:"charcoal",anchorType:"top:button-down-shirt",anchorColor:color,
   pieces:[fit+" shirt","Clean-cut trouser","Everyday sneaker","Subtle finishing layer"],
   query:[aesthetic,fit,palette,"outfit"].join(" "),reason:"Based on your "+aesthetic.toLowerCase()+" style preference."
  },
  {
   tag:"DRESSED UP",title:"The considered layer",
   subtitle:"A sharper way to show up.",accent:"stone",anchorType:"outerwear:blazer",anchorColor:color,
   pieces:["Structured jacket","Soft base layer","Tailored pant","Polished footwear"],
   query:[aesthetic,"tailored",occasion,"jacket"].join(" "),
   reason:"A complementary direction for "+occasion.toLowerCase()+"."
  },
  {
   tag:firstFolder?"FROM YOUR ARCHIVE":"OFF DUTY",
   title:firstFolder?firstFolder.name:"The easy edit",
   subtitle:firstFolder?"A fresh take on a saved collection.":"Comfort, with a point of view.",
   accent:"sand",anchorType:"top:sweater",anchorColor:color,
   pieces:[fit+" knit","Easy trouser","Light outerwear","Low-profile shoe"],
   query:[aesthetic,fit,"casual",palette].join(" "),
   reason:firstFolder?"Inspired by your folder \""+firstFolder.name+"\".":"Guided by your fit and color preferences."
  }
 ];
}
function useMood(direction){
 showPage("studio");
 window.MatchlatchStudioFlow?.open("piece");
 const select=$("itemtype"),color=$("itemcolor");
 if(select&&[...select.options].some(o=>o.value===direction.anchorType))select.value=direction.anchorType;
 if(color)color.value=direction.anchorColor;
 const details=document.querySelector(".manual-details");
 if(details)details.open=true;
 const status=$("status");
 if(status)status.textContent="Starting point: "+direction.title+". Adjust the item and color, then choose Guided Styling—or upload a photo for AI analysis.";
 $("studio")?.scrollIntoView({behavior:"smooth",block:"start"});
}
let initialStoreQuery="";
let initialStoreSlot="";
function sendMoodToStore(direction){
 initialStoreQuery=direction.query;
 const category=String(direction.anchorType||"").split(":")[0];
 initialStoreSlot=({top:"shirt",outerwear:"jacket",bottom:"pants",shoes:"shoes",accessory:"hat"})[category]||"shirt";
 showPage("store");
}
function renderMood(){
 const target=$("mood-body");if(!target)return;
 target.replaceChildren();
 const state=snapshot(),p=profile();
 const headline=sectionTitle("The daily edit","Curated for your taste",
  "Outfit ideas based on your saved preferences and collections. These are styling suggestions, not live products.");
 target.append(headline);
 const jump=el("div","v12-action-strip");
 jump.append(el("p",null,"Found your inspiration? Start from a photo or describe a favorite piece."));
 jump.append(button("Create a look in Studio ↗",()=>lib()?.startFreshStudio?.(),"destination-link"));
 target.append(jump);
 const meta=el("div","mood-signal");
 const collectionCount=state.collections.length;
 meta.append(el("span",null,"YOUR STYLE  /  "+pick(p.aesthetic,"MINIMALIST").toUpperCase()+" · "+pick(p.fit,"RELAXED").toUpperCase()));
 meta.append(el("span",null,collectionCount?collectionCount+" FOLDERS":"NEW TO YOUR CLOSET"));
 target.append(meta);
 const grid=el("div","mood-grid");
 for(const direction of curatedDirections(state,p)){
  const card=el("article","mood-card mood-"+direction.accent);
  const visual=el("div","mood-cover");
  const outfit=el("div","mood-outfit");
  for(const piece of direction.pieces){
   const row=el("div","mood-piece");
   row.append(el("span","mood-piece-name",piece));
   outfit.append(row);
  }
  visual.append(outfit);card.append(visual);
  const detail=el("div","mood-card-detail");
  detail.append(el("span","micro-title",direction.tag),el("h3",null,direction.title),
    el("p","mood-card-sub",direction.subtitle),
    el("p","mood-reason",direction.reason));
  const actions=el("div","mood-card-actions");
  actions.append(button("Style this mood ↗",()=>useMood(direction)));
  actions.append(button("Shop direction",()=>sendMoodToStore(direction),"destination-link quiet"));
  detail.append(actions);card.append(detail);grid.append(card);
 }
 target.append(grid);
 if(state.looks.length){
  const saved=el("div","mood-archive-shortcut");
  saved.append(el("p",null,"Looking for a look you saved? Find it in My Closet."));
  saved.append(button("Open My Closet ↗",()=>showPage("closet"),"destination-link"));
  target.append(saved);
 }
}
const storeState={query:"",slot:"shirt",max:0,items:[],searched:false,source:"",checkedAt:0,selected:null,retailers:[],criteria:null,needBy:"",provider:"unified",exactSize:"",brand:"",sort:"relevance",styleContext:"",sizeSystem:"",useSavedSize:true};
const supportedSlots=[
 ["shirt","Tops"],["pants","Bottoms"],["jacket","Outerwear"],["shoes","Footwear"],
 ["hat","Headwear"],["scarf","Scarves"],["watch","Watches"],["belt","Belts"],["socks","Socks"]
];
// Respect saved category-specific sizes in every Store search.
function storeSizeFor(slot,p){
 switch(slot){
  case "hat":return p.hatSize||"";
  case "jacket":return p.suitJacketSize&&/formal|work|business|wedding|black tie|gala/i.test(p.occasion||"")
   ?p.suitJacketSize:p.topSize||"";
  case "shirt":return p.topSize||"";
  case "pants":return p.waist||String(p.bottomSize||"").replace(/^(US|UK|EU)\s+/,"");
  case "belt":return p.beltSize||"";
  case "shoes":return p.shoeSize||"";
  default:return "";
 }
}
const USD=value=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(Number(value)||0);
let searchId=0,controller=null;
function storeCard(item){
 const card=el("article","store-card v12-product-card");
 const cover=el("div","store-card-cover");
 if(item.image){
  try{
   const url=new URL(item.image);
   if(url.protocol==="https:"){
    const img=el("img");img.src=url.href;img.alt=item.imageAlt||item.title||"Retailer product";
    img.loading="lazy";img.decoding="async";
    img.addEventListener("error",()=>{cover.replaceChildren(el("span","store-no-photo","Image unavailable"));},{once:true});
    cover.append(img);
   }
  }catch{}
 }
 if(!cover.children.length)cover.append(el("span","store-no-photo","Image unavailable"));
 const info=el("div","store-card-info");
 const source=el("span","v12-product-source",item.fixture?"PRIVATE UI FIXTURE · FICTIONAL":item.source==="awin"?"AWIN RETAILER FEED":"SHOPIFY RETAILER CATALOG");
 info.append(source);
 info.append(el("span","micro-title",item.merchant||"Retailer"));
 info.append(el("h3",null,item.title||"Retailer product"));
 const meta=el("div","v12-product-meta");
 meta.append(el("strong","store-price",USD(item.price)));
 if(item.size)meta.append(el("span","store-size","Size "+item.size));
 else meta.append(el("span","store-size","Size not specified"));
 info.append(meta);
 const time=Date.parse(String(item.checkedAt||""));
 const timing=Number.isFinite(time)?(item.source==="awin"?"Feed snapshot ":"Provider snapshot ")+new Date(time).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):item.fixture?"Synthetic visual test":"Check latest price and stock";
 info.append(el("small","store-data-note",timing+" · Confirm final price, size and shipping at retailer"));
 info.append(el("small","v12-delivery-note",item.fixture?"Not a shopping offer. Stock, shipping and links are not supplied.":shippingInfo(item)));
 const actions=el("div","store-card-actions store-card-shopping");
 actions.append(button("View product details ↗",()=>openProduct(item),"store-view-details"));
 if(!item.fixture&&item.saveAllowed!==false)actions.append(button("Add to shortlist",()=>lib()?.addRetailProduct?.({...item,slot:item.slot||storeState.slot}),"store-add-to-cart"));
 if(item.evaluationOnly)info.append(el("small","store-data-note","Owner Preview evaluation · product saving disabled · imagery rendered live only."));
 info.append(actions);
 card.append(cover,info);
 return card;
}
function showStoreView(view,push=true){
 const target=$("store-body");
 const page=$("screen-store");
 if(!target||!page)return;
 const valid=["search","results","product"].includes(view)?view:"search";
 target.dataset.view=valid;
 page.dataset.storeView=valid;
 if(push){
  const hash=valid==="search"?"#store":"#store/"+valid;
  if(location.hash!==hash)history.pushState(null,"",hash);
  window.scrollTo({top:0,behavior:"auto"});
 }
}
function renderProduct(){
 const target=$("store-product");
 if(!target)return;
 target.replaceChildren();
 const item=storeState.selected;
 const back=button("← Back to products",()=>showStoreView(storeState.items.length?"results":"search"),"flow-back");
 target.append(back);
 if(!item){
  target.append(el("h2",null,"Find your next piece"));
  target.append(el("p",null,"Search Store to choose a product."));
  target.append(button("Browse products ↗",()=>showStoreView("search"),"store-add-to-cart"));
  return;
 }
 const layout=el("div","store-product-layout");
 const visual=el("div","store-product-visual");
 try{
  const url=new URL(item.image);
  if(url.protocol!=="https:")throw Error("Invalid image");
  const img=el("img");img.src=url.href;img.alt=item.imageAlt||item.title||"Product image";
  img.addEventListener("error",()=>{visual.replaceChildren(el("span",null,"Image unavailable"));},{once:true});
  visual.append(img);
 }catch{visual.append(el("span",null,"Image unavailable"));}
 const details=el("div","store-product-info");
 details.append(el("span","micro-title",item.merchant||"Retailer"));
 details.append(el("h2",null,item.title||"Retailer product"));
 details.append(el("strong","store-product-price",(item.fixture?"Illustrative ":"")+USD(item.price)));
 const specifics=el("div","store-product-specifics");
 if(item.size)specifics.append(el("span",null,"Size "+item.size));
 if(item.variant&&item.variant!==item.size)specifics.append(el("span",null,item.variant));
 if(!specifics.children.length)specifics.append(el("span",null,"Selected retailer listing"));
 details.append(specifics);
 details.append(el("p","v12-delivery-note",item.fixture?"Private UI fixture. No real product or delivery information.":shippingInfo(item)));
 details.append(el("p","store-product-disclaimer",item.fixture?"Fictional visual test; not a product offer.":item.source==="awin"
  ?"Retailer-feed listing. Confirm size, stock, final price and shipping on the retailer’s website."
  :"Price and availability are checked when listed and may change before checkout."));
 const actions=el("div","store-product-actions");
 if(!item.fixture&&item.saveAllowed!==false)actions.append(button("Add to shortlist",()=>lib()?.addRetailProduct?.({...item,slot:item.slot||storeState.slot}),"store-add-to-cart"));
 actions.append(button("View shortlist ↗",()=>lib()?.openClosetTab?.("shortlist"),"store-view-details"));
 const retailerLink=(()=>{try{const url=new URL(item.merchantProductUrl||item.url);return url.protocol==="https:"?url.href:"";}catch{return "";}})();
 if(retailerLink&&!document.querySelector('meta[name="matchlatch-usability-beta"][content="purchases-disabled"]')){
  const link=el("a","store-product-retailer","View at retailer ↗");
  link.href=retailerLink;link.target="_blank";link.rel=item.source==="awin"?"sponsored nofollow noopener noreferrer":"noopener noreferrer";
  actions.append(link);
 }
 details.append(actions);
 const more=el("details","store-product-more");
 more.append(el("summary",null,"More options"));
 more.append(button("Style a similar piece ↗",()=>{
  showPage("studio");
  window.MatchlatchStudioFlow?.open("piece");
  const selected=$("itemtype");
  const suggestions={
   shirt:"top:t-shirt",pants:"bottom:jeans",jacket:"outerwear:blazer",
   shoes:"shoes:low-top-sneakers",hat:"accessory:hat-cap",scarf:"accessory:scarf",
   watch:"accessory:watch",belt:"accessory:belt",socks:"accessory:socks"
  };
  const choice=suggestions[storeState.slot];
  if(selected&&[...selected.options].some(option=>option.value===choice))selected.value=choice;
  const panel=document.querySelector(".manual-details");
  if(panel)panel.open=true;
  const status=$("status");
  if(status)status.textContent="Choose the item type and color, then select Guided Styling.";
  $("studio")?.scrollIntoView({behavior:"smooth",block:"start"});
  $("itemcolor")?.focus();
 },"store-product-style-link"));
 details.append(more);
 if(!item.fixture)window.MatchlatchSavings?.attach?.(details,item);
 layout.append(visual,details);target.append(layout);
}
function openProduct(item){
 if(!item||item.available!==true)return;
 storeState.selected=item;
 renderProduct();
 showStoreView("product");
}
function renderStore(){
 const target=$("store-body");if(!target)return;
 target.replaceChildren();
 target.dataset.view="search";
 $("screen-store").dataset.storeView="search";
 const p=profile();
 const box=el("section","store-search");
 box.append(sectionTitle("Find your next piece","Find something new",
  "Search available retailer catalogs for your next piece. Outfit styling is separate."));
 const form=el("form","store-search-form");
 const query=el("input");query.type="search";query.placeholder="e.g. charcoal oversized shirt";
 query.maxLength=170;query.required=false;query.minLength=2;
 query.setAttribute("aria-label","Search products");
 query.value=initialStoreQuery||storeState.query||"";
 const select=el("select");select.setAttribute("aria-label","Clothing category");
 for(const [value,label] of supportedSlots){const option=new Option(label,value);select.add(option);}
 select.value=initialStoreSlot||storeState.slot;
 initialStoreSlot="";
 const budget=el("input");budget.type="number";budget.min="1";budget.max="10000";budget.step="0.01";
 budget.setAttribute("aria-label","Maximum price in USD");
 budget.value=String(storeState.max||p.budget||200);
 const submit=el("button","store-submit","Search store ↗");submit.type="submit";
 const queryLabel=el("label","store-field store-query-field");queryLabel.append(el("span",null,"WHAT ARE YOU LOOKING FOR?"),query);
 const categoryLabel=el("label","store-field");categoryLabel.append(el("span",null,"CATEGORY"),select);
 const budgetLabel=el("label","store-field");budgetLabel.append(el("span",null,"MAX PRICE · USD"),budget);
 const deadlineLabel=el("label","store-field v12-date-field");
 deadlineLabel.append(el("span",null,"NEED IT BY · OPTIONAL"));
 const deadline=el("input");deadline.type="date";deadline.setAttribute("aria-label","Need my items by date");
 deadline.value=storeState.needBy;
 // Native date input opens the device calendar picker.
 const localToday=()=>{const d=new Date(),off=d.getTimezoneOffset()*60000;return new Date(d.getTime()-off).toISOString().slice(0,10);};
 deadline.min=localToday();
 const deadlineNote=el("small","v12-delivery-note","Only retailer forecasts confirming arrival on or before this date qualify. Shipping estimates are not guarantees.");
 deadlineLabel.append(deadline,deadlineNote);
 const provider=el("select");provider.setAttribute("aria-label","Product source");
 provider.add(new Option("All available products","unified"));provider.add(new Option("Reviewed feed catalog","catalog"));provider.add(new Option("Participating retailer search","retailer"));provider.value=storeState.provider;
 const providerLabel=el("label","store-field store-source-field");providerLabel.append(el("span",null,"PRODUCT SOURCE"),provider);
 const exactSize=el("input");exactSize.type="text";exactSize.maxLength=40;exactSize.value=storeState.exactSize;exactSize.placeholder="Use saved size";exactSize.setAttribute("aria-label","Exact size");
 const sizeLabel=el("label","store-field");sizeLabel.append(el("span",null,"SIZE · OPTIONAL"),exactSize);
 const useSavedSize=el("input");useSavedSize.type="checkbox";useSavedSize.checked=storeState.useSavedSize!==false;useSavedSize.setAttribute("aria-label","Use my saved size when exact size is blank");
 const savedSizeLabel=el("label","store-size-choice");savedSizeLabel.append(useSavedSize,el("span",null,"Use my saved size when blank"));sizeLabel.append(savedSizeLabel);
 const brand=el("input");brand.type="text";brand.maxLength=60;brand.value=storeState.brand;brand.setAttribute("aria-label","Brand");
 const brandLabel=el("label","store-field");brandLabel.append(el("span",null,"BRAND · OPTIONAL"),brand);
 const sort=el("select");sort.setAttribute("aria-label","Sort products");for(const [v,t] of [["relevance","Relevance"],["price-asc","Price: low to high"],["price-desc","Price: high to low"]])sort.add(new Option(t,v));sort.value=storeState.sort;
 const sortLabel=el("label","store-field");sortLabel.append(el("span",null,"SORT"),sort);
 provider.onchange=()=>{query.required=false;brand.disabled=provider.value==="retailer";};provider.onchange();
 const formStatus=el("p","store-search-status");formStatus.setAttribute("role","status");formStatus.setAttribute("aria-live","polite");
 const browseWithoutDate=button("Browse without delivery date",()=>{deadline.value="";storeState.needBy="";form.requestSubmit();},"commerce-secondary");browseWithoutDate.hidden=true;
 deadline.addEventListener("change",()=>{browseWithoutDate.hidden=!deadline.value;});browseWithoutDate.hidden=!deadline.value;
 form.append(queryLabel,providerLabel,categoryLabel,budgetLabel,sizeLabel,brandLabel,sortLabel,deadlineLabel,submit,formStatus,browseWithoutDate);
 box.append(button("Build a look in Studio ↗",()=>showPage("studio"),"destination-link quiet"));
 box.append(form);
 const context=el("p","v12-store-context","Personal style, size and budget determine eligible results. Web references remain research-only.");
 if(storeState.styleContext){try{const c=JSON.parse(storeState.styleContext);context.textContent="From Studio: "+c.occasion+" · "+c.style+" · "+(c.notes||"Your preferences")+". Total merchandise budget retained; browse one garment at a time.";}catch{}}
 box.append(context);
 const quick=el("div","store-suggestions");
 quick.append(el("span","micro-title","START WITH"));
 const suggestions=[
  {name:"Your everyday edit",slot:"shirt",query:[pick(p.aesthetic,"minimal"),pick(p.fit,"relaxed"),"shirt"].join(" ")},
  {name:"Outer layers",slot:"jacket",query:[pick(p.aesthetic,"classic"),"jacket"].join(" ")},
  {name:"Everyday footwear",slot:"shoes",query:[pick(p.palette,"neutral"),"sneakers"].join(" ")}
 ];
 for(const hint of suggestions)quick.append(button(hint.name,()=>{
  query.value=hint.query;select.value=hint.slot;query.focus();
 },"store-chip"));
 const discover=button("Discover for me ✦",()=>discoverForMe(),"store-chip");
 discover.hidden=true;
 quick.append(discover);
 fetch("/api/shop?mode=capabilities",{cache:"no-store",signal:AbortSignal.timeout(8000)}).then(r=>r.json()).then(async d=>{if(!d.automaticDiscovery?.enabled)return;const session=(await window.MatchlatchAuth?.client?.auth.getSession())?.data?.session;if(!session)return;const r=await fetch("/api/admin-summary?capability=1",{headers:{Authorization:"Bearer "+session.access_token},cache:"no-store",signal:AbortSignal.timeout(8000)});if(r.ok&&discover.isConnected)discover.hidden=false;}).catch(()=>{});
 box.append(quick);
 box.append(el("p","store-curation-note",
  "Chosen for your style and saved sizes. Savings are considered only after a good match."));
 const readiness=el("p","v12-store-context","Checking product sources…");box.append(readiness);
 let feedAvailability=null;
 function showReadiness(){
  const feed=feedAvailability===null?"Reviewed feed availability has not been confirmed.":feedAvailability?"Reviewed feeds contain eligible public products.":"Reviewed feeds contain no eligible public products.";
  readiness.textContent=provider.value==="catalog"?feed:provider.value==="retailer"?"Participating retailer search is independent of the reviewed feed catalog.":"All available products searches two independent sources. Shopify search is a Preview evaluation for the verified owner only. Delivery-date verification is unavailable for these sources; clear Need it by to browse listings. "+feed;
 }
 const sourceChange=provider.onchange;provider.onchange=()=>{sourceChange();showReadiness();};showReadiness();
 fetch("/api/catalog?mode=capabilities",{cache:"no-store",signal:AbortSignal.timeout(10000)}).then(async r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{if(readiness.isConnected){feedAvailability=d.catalogAvailable===true;showReadiness();}}).catch(()=>{if(readiness.isConnected)showReadiness();});
 target.append(box);
 const results=el("div","store-results");
 const head=el("div","store-results-top");
 head.append(button("← Change search",()=>showStoreView("search"),"flow-back"));
 const heading=el("h2",null,"Your results");
 head.append(heading);
 results.append(head);
 const status=el("p","store-search-status");
 status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 results.append(status);
 const clearDateResults=button("Browse without delivery date",()=>{deadline.value="";storeState.needBy="";form.requestSubmit();},"commerce-secondary");clearDateResults.hidden=!storeState.needBy;results.append(clearDateResults);
 const retailerSummary=el("details","store-retailer-summary");
 retailerSummary.hidden=true;
 const summary=el("summary",null,"Retailers in these results");
 const shops=el("div","store-retailer-names");
 retailerSummary.append(summary,shops);
 results.append(retailerSummary);
 const list=el("div","store-grid");results.append(list);
 // Web references are opt-in styling research; never cart-ready products.
 const webPanel=el("section","store-web-discovery");webPanel.hidden=true;
 const webSummary=el("p","store-web-summary"),webSources=el("div","store-web-sources");
 const retailReferences=el("section","store-public-research");retailReferences.hidden=true;
 const webMessage=el("p","store-web-note","Web sources are not verified stock or checkout offers.");
 const webCode=el("input");webCode.type="password";webCode.maxLength=256;
 webCode.placeholder="Private beta code";webCode.autocomplete="off";
 webCode.hidden=true;webCode.setAttribute("aria-label","Web research beta code");
 const webButton=button("Explore wider web ↗",async()=>{
  const c=storeState.criteria;
  if(!c||webButton.disabled)return;
  const code=($("beta-code")?.value||webCode.value||"").trim();
  if(!code){webCode.hidden=false;webCode.focus();webMessage.textContent=
   "Your private beta code is required for web research.";return;}
  const run=searchId;
  webButton.disabled=true;webSources.replaceChildren();retailReferences.replaceChildren();retailReferences.hidden=true;webSummary.textContent="";
  webMessage.textContent="Finding source-backed style references…";
  try{
   const res=await fetch("/api/discover",{
    method:"POST",cache:"no-store",headers:{"content-type":"application/json"},
    body:JSON.stringify({betaCode:code,slot:c.slot,q:c.q,max:c.max,
     size:c.size,color:c.color,profile:profile()})
   });
   const found=await res.json();
   if(run!==searchId)return;
   if(!res.ok)throw Error(found?.error==="BETA_ACCESS_DENIED"?
    "That private beta code wasn't accepted.":"Web research is unavailable.");
   webSummary.textContent=found.summary||"";
   const references=Array.isArray(found.sources)?found.sources:[];
   for(const source of references){
    if(!/^https:\/\//i.test(source?.url||""))continue;
    const card=el("div","store-web-source");
    const link=el("a",null,source.title||source.domain||"Open source");
    link.href=source.url;link.target="_blank";link.rel=item.source==="awin"?"sponsored nofollow noopener noreferrer":"noopener noreferrer";
    card.append(link,el("small",null,(source.domain||"Source")+
      (source.kind==="product_page_reference"?" · Product-page reference":" · Style research")));
    webSources.append(card);
   }
   const approvedReferences=Array.isArray(found.retailResearch)?found.retailResearch:[];
   if(approvedReferences.length){
    retailReferences.hidden=false;
    retailReferences.append(el("h3",null,"Retailer research references"));
    retailReferences.append(el("p","store-web-note","Source-linked inspiration only. Prices, stock, sizes and delivery are not verified."));
    for(const item of approvedReferences){
     if(!/^https:\/\//i.test(item?.url||"")||item?.cartEligible!==false)continue;
     const entry=el("div","store-public-reference");
     const link=el("a",null,item.title||item.retailer||"Research source");
     link.href=item.url;link.target="_blank";link.rel=item.source==="awin"?"sponsored nofollow noopener noreferrer":"noopener noreferrer";
     entry.append(link,el("small",null,(item.retailer||"Retailer")+" · Research only · Not eligible for shortlist"));
     retailReferences.append(entry);
    }
   }
   webMessage.textContent=references.length
    ?"Web research only · check current size, stock, price and delivery at the retailer."
    :"No suitable source found. Refine your request without relaxing personal preferences.";
  }catch(error){if(run===searchId)webMessage.textContent=error?.message||"Web search unavailable.";}
  finally{webButton.disabled=false;}
 },"store-web-launch");
 webPanel.append(webButton,webCode,webSummary,retailReferences,webSources,webMessage);
 results.append(webPanel);
 target.append(results);
 const product=el("section","store-product-shell");product.id="store-product";target.append(product);
 const requestedView=(location.hash||"").slice(1).split("/")[1]||"search";
 // Returning from another tab restores the prior results page without implying fresh stock.
 const view=requestedView==="search"&&storeState.searched&&!initialStoreQuery?
  "results":requestedView;
 if(initialStoreQuery){
  status.textContent="Your request is ready. Confirm the source and category, then search.";
  initialStoreQuery="";
 }else if(storeState.searched){
  status.textContent="Previous results · prices and availability may have changed. Search again to refresh.";
  list.replaceChildren(...storeState.items.map(storeCard));
  webPanel.hidden=false;
 }else status.textContent="Find your next piece.";
 if(view==="product"&&storeState.selected){renderProduct();showStoreView("product",false);}
 else if(view==="results"&&storeState.searched){showStoreView("results",false);}
 else {
  if(view!=="search"&&location.hash.startsWith("#store/"))history.replaceState(null,"","#store");
  showStoreView("search",false);
 }
 // This unlinked QA mode uses the existing server UUID gate, never email.
 if(new URLSearchParams(location.search).get("catalogQa")==="1"){
  const qaStatus=el("p","v12-store-context");qaStatus.setAttribute("role","status");box.append(qaStatus);
  const fixtures=button("Load private UI fixtures",async()=>{
   const ticket=searchId,userId=lib()?.getUserId?.();if(!userId){qaStatus.textContent="Verified owner sign-in required for private fixtures.";return;}
   fixtures.disabled=true;
   try{const session=(await window.MatchlatchAuth?.client?.auth.getSession())?.data?.session;
    if(session?.user?.id!==userId||!session.access_token)throw Error("Owner session unavailable.");
    const r=await fetch("/api/admin-summary?fixtures=1",{headers:{Authorization:"Bearer "+session.access_token},cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!r.ok)throw Error("Private fixtures require verified owner access.");const data=await r.json();
    if(ticket!==searchId||lib()?.getUserId?.()!==userId||!fixtures.isConnected)return;
    storeState.items=data.items;storeState.selected=null;storeState.searched=true;showStoreView("results");status.textContent=data.label;list.replaceChildren(...data.items.map(storeCard));webPanel.hidden=true;
   }catch(e){if(ticket===searchId)qaStatus.textContent=e.message;}finally{fixtures.disabled=false;}
  },"destination-link quiet");box.append(fixtures);
 }
 async function discoverForMe(){
  if(discover.disabled||discover.hidden)return;
  const cues=[p.aesthetic,p.fit,p.palette].filter(value=>typeof value==="string"&&value.trim()).join(" ");
  const q=(cues||"minimal neutral everyday").slice(0,110);
  const max=Number(budget.value);
  if(!Number.isFinite(max)||max<1||max>10000){
   status.textContent="Choose a maximum price between $1 and $10,000.";
   return;
  }
  if(controller)controller.abort();
  controller=new AbortController();
  const run=++searchId,userId=lib()?.getUserId?.();
  if(!userId){status.textContent="Verified owner sign-in required.";return;}
  storeState.items=[];storeState.searched=true;storeState.query=q;storeState.max=max;
  list.replaceChildren();showStoreView("results");
  status.textContent="Discovering real products across Shopify retailers…";
  discover.disabled=true;
  try{
   const params=new URLSearchParams({mode:"discover",q,max:String(max),categories:select.value,size:exactSize.value,color:""});
   const session=(await window.MatchlatchAuth?.client?.auth.getSession())?.data?.session;if(!session)throw Error("Owner session unavailable");
   const response=await fetch("/api/shop?"+params,{headers:{Authorization:"Bearer "+session.access_token},signal:controller.signal,cache:"no-store"});
   const data=await response.json();
   if(run!==searchId||lib()?.getUserId?.()!==userId)return;
   if(!response.ok)throw Error(data.error||"Discovery unavailable");
   const items=Array.isArray(data.items)?data.items.filter(item=>item?.available&&Number(item.price)<=max):[];
   storeState.items=items;storeState.checkedAt=Date.now();
   status.textContent=items.length?
    items.length+" live products discovered for your style. Availability and prices may change.":
    "No available matches yet. Try a different style or budget.";
   list.replaceChildren(...items.map(storeCard));
  }catch(error){
   if(run!==searchId)return;
   if(error?.name!=="AbortError")status.textContent="Live discovery is temporarily unavailable. Try searching instead.";
  }finally{if(run===searchId)discover.disabled=false;}
 }
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  const q=query.value.trim()||select.value,max=Number(budget.value);
  formStatus.textContent="";
  const explainSearch=message=>{formStatus.textContent=message;status.textContent=message;};
  if(deadline.value&&(!/^\d{4}-\d{2}-\d{2}$/.test(deadline.value)||deadline.value<localToday())){explainSearch("Choose today or a future delivery date.");return;}
  if(deadline.value&&!shippingZip()){explainSearch("Save your destination ZIP in Me to check arrival dates, or choose Browse without delivery date.");browseWithoutDate.hidden=false;return;}
  if((provider.value!=="catalog"&&q.length<2)||q.length>170||!Number.isFinite(max)||max<1||max>10000){
   explainSearch("Choose a category or enter a search of at least 2 characters, and a budget between $1 and $10,000.");
   return;
  }
  const matcher=window.MatchlatchRetailerMatch;
  if(!matcher?.criteria||!matcher?.rank){
   status.textContent="Personalized search needs a refresh. Reload MATCHLATCH and try again.";
   return;
  }
  const p=profile(),preferredSize=exactSize.value.trim()||(useSavedSize.checked?storeSizeFor(select.value,p):"");
  const criteria=matcher.criteria({
   slot:select.value,profile:p,size:preferredSize,max,manualQuery:q
  });
  if(!criteria){status.textContent="Choose a supported clothing category.";return;}
  if(storeState.styleContext){try{const context=JSON.parse(storeState.styleContext);criteria.hints.notes=context.notes||"";criteria.hints.occasion=context.occasion||"";criteria.hints.aesthetic=context.style||criteria.hints.aesthetic;}catch{}}
  storeState.criteria=criteria;
  storeState.query=q;storeState.slot=select.value;storeState.max=max;storeState.useSavedSize=useSavedSize.checked;
  storeState.needBy=deadline.value;
  storeState.searched=true;storeState.items=[];storeState.provider=provider.value;storeState.exactSize=exactSize.value.trim();storeState.brand=brand.value.trim();storeState.sort=sort.value;
  browseWithoutDate.hidden=!deadline.value;clearDateResults.hidden=!deadline.value;
  showStoreView("results");
  list.replaceChildren();retailerSummary.hidden=true;shops.replaceChildren();
  webPanel.hidden=true;webCode.hidden=true;webSummary.textContent="";
  webSources.replaceChildren();
  status.textContent="Finding pieces that match your style…";
  submit.disabled=true;
  if(controller)controller.abort();
  controller=new AbortController();
  const run=++searchId;
  try{
   const params=new URLSearchParams({mode:"search",slot:criteria.slot,q:criteria.q,max:String(criteria.max)});
   if(criteria.size)params.set("size",criteria.size);
   if(criteria.color)params.set("color",criteria.color);
   if(shippingZip())params.set("postal",shippingZip());
   if(storeState.needBy)params.set("needBy",storeState.needBy);
   const catalogSource=provider.value==="catalog",unifiedSource=provider.value==="unified";
   if(unifiedSource){params.set("mode","unified");params.set("brand",brand.value.trim());params.set("sort",sort.value);if(storeState.styleContext)params.set("context",storeState.styleContext);if(preferredSize&&storeState.sizeSystem)params.set("sizeSystem",storeState.sizeSystem);}
   const accountId=lib()?.getUserId?.(),session=unifiedSource?(await window.MatchlatchAuth?.client?.auth.getSession())?.data?.session:null;
   if(unifiedSource&&accountId!==lib()?.getUserId?.())return;
   if(catalogSource){params.set("q",q);params.set("brand",brand.value.trim());params.set("sort",sort.value);}
   const response=await fetch((catalogSource?"/api/catalog?":"/api/shop?")+params,{signal:controller.signal,cache:"no-store",headers:session?.access_token?{Authorization:"Bearer "+session.access_token}:{}});
   const data=await response.json();
   if(run!==searchId)return;
   if(!response.ok)throw Error(data.error||"Retailer search unavailable.");
   // Hard preference/variant and suitability gates are mandatory for Store
   // just as they are for AI-originated Outfit Tree recommendations.
   const ranked=matcher.rank(Array.isArray(data.items)?data.items:[],criteria);
   const items=catalogSource&&storeState.needBy?[]:ranked;
   if(sort.value==="price-asc")items.sort((a,b)=>a.price-b.price);else if(sort.value==="price-desc")items.sort((a,b)=>b.price-a.price); // Server already enforces deadline eligibility against trusted provider data.
   storeState.items=items;storeState.checkedAt=Date.now();
   const matches=window.MatchlatchRetailerMatch;
   const merchants=matches?.merchants?.(items)||[];
   storeState.retailers=merchants;
   status.textContent=storeState.needBy&&!shippingZip()
    ?"Set a five-digit destination ZIP in Me before searching by delivery deadline.":
    storeState.needBy&&!items.length?
    catalogSource?data.message:"No trusted retailer delivery forecasts meet "+storeState.needBy+". "+(data.deliveryFilter?.withheld||0)+" otherwise matching product(s) withheld; clear the deadline to browse them.":items.length?
    items.length+" retailer listing"+(items.length===1?"":"s")+
    " · "+merchants.length+" retailer"+(merchants.length===1?"":"s")+
    " in this search. US shipping eligibility filtered; prices and stock may change.":
    catalogSource?(data.message||"No eligible public catalog products. Private development inventory is excluded."):"No suitable products confirmed for your style, size and budget. Refine your search or update preferences.";
   if(unifiedSource)status.textContent=(storeState.needBy?"These sources cannot verify arrival by "+storeState.needBy+". Products are withheld; choose Browse without delivery date to see listings with unknown arrival dates.":items.length?items.length+" products match your size, style and merchandise budget.":data.sources?.shopify?.status==="owner_required"?"Shopify was not searched: verified owner sign-in is required in this Preview.":data.sources?.shopify?.status==="disabled"?"Shopify search is disabled in this Preview.":data.sources?.shopify?.status==="unavailable"?"Shopify search could not be reached.":"No products meet all your selected size and style constraints.")+" "+(data.limitations||[]).join(" ")+" · Participating catalog: "+data.sources?.shopify?.status+" · Reviewed feeds: "+data.sources?.awin?.status;
   retailerSummary.hidden=merchants.length===0;
   retailerSummary.open=false;
   summary.textContent="View "+merchants.length+" retailer"+(merchants.length===1?"":"s")+" in this search";
   shops.replaceChildren(...merchants.map(merchant=>el("span","store-retailer-name",merchant.name)));
   list.replaceChildren(...items.map(storeCard));
   webPanel.hidden=false;
  }catch(error){
   if(run!==searchId)return;
   if(error?.name!=="AbortError"){
    status.textContent="We couldn't check the live catalog. You can still explore research sources.";
    webPanel.hidden=false;
   }
  }finally{if(run===searchId)submit.disabled=false;}
 });
}
function renderProfileLinks(){
 const root=$("profile-shortcuts");if(!root)return;
 root.replaceChildren();
 const sections=[
  ["Display","Appearance","Light, dark or your device theme.", "me-appearance"],
  ["Personalization","My style","Preferences, sizes and your look.", "me-preferences"],
  ["Account access","My account","Manage your sign-in and security.", "me-account-panel"],
  ["Privacy control","Privacy & data","Device data and account controls.", "me-privacy-panel"]
 ];
 for(const [eyebrow,name,description,targetId] of sections){
  const card=button("",()=>{
   const view={"me-appearance":"appearance","me-preferences":"preferences",
     "me-account-panel":"account","me-privacy-panel":"privacy"}[targetId];
   window.MatchlatchMeFlow?.open(view||"home");
  },"profile-shortcut");
  const info=el("span","profile-shortcut-copy");
  info.append(el("span","micro-title",eyebrow),el("strong",null,name),el("small",null,description));
  card.append(info,el("span","profile-shortcut-arrow","↗"));
  root.append(card);
 }
 window.MatchlatchOwnerNavigation?.mount(root);
}
function renderAppearance(){
 const root=$("me-appearance");if(!root)return;
 root.replaceChildren();
 root.append(sectionTitle("Display settings","Appearance",
  "Choose a look that feels right, day or night."));
 const row=el("div","appearance-control");
 row.setAttribute("role","group");row.setAttribute("aria-label","App color theme");
 const options=[
  ["light","Light","☼"],["dark","Dark","◐"],["system","System","◑"]
 ];
 const appearance=window.MatchlatchAppearance;
 for(const [id,label,symbol] of options){
  const active=appearance?.get?.()===id;
  const tile=button("",()=>{
   appearance?.set?.(id);
   renderAppearance();
  },"appearance-option"+(active?" active":""));
  tile.setAttribute("aria-pressed",String(active));
  tile.append(el("span","appearance-icon",symbol),el("strong",null,label));
  if(active)tile.append(el("span","appearance-check","✓"));
  row.append(tile);
 }
 root.append(row);
 const hint=el("p","appearance-help","System follows your device automatically. Your selection is remembered on this device.");
 root.append(hint);
}
function renderMePreferences(){
 const root=$("me-preferences");if(!root)return;
 root.replaceChildren();
 const heading=sectionTitle("Style preferences","Your style, your rules",
  "Update the preferences used in Studio and Mood.");
 root.append(heading);
 const context=el("p","v12-me-context","Changes affect future styling and searches. Existing saved looks are not automatically rewritten.");
 root.append(context);
 const grid=el("div","me-settings-grid");
 const fields=[
  ["Style expression","look"],
  ["Style direction","aesthetic"],
  ["Fit preference","fit"],
  ["Color palette","palette"],
  ["Occasion","occasion"],
  ["Season & weather","climate"],
  ["Max outfit budget ($)","budget"],
  ["Sizing preference","sizeAudience"],
  ["Personal style notes","notes"]
 ];
 for(const [title,id] of fields){
  const original=$(id);
  if(!original)continue;
  const field=el("label","me-setting"+(id==="notes"?" wide":""));
  field.append(el("span","me-setting-label",title));
  const clone=original.cloneNode(true);
  clone.removeAttribute("id");
  clone.removeAttribute("name");
  clone.value=original.value;
  clone.setAttribute("aria-label",title);
  const save=()=>{
   original.value=clone.value;
   original.dispatchEvent(new Event(id==="notes"||id==="budget"?"input":"change",{bubbles:true}));
   const status=$("me-preferences-status");
   if(status)status.textContent="Style preferences updated.";
  };
  clone.addEventListener(id==="notes"||id==="budget"?"input":"change",save);
  field.append(clone);grid.append(field);
 }
 root.append(grid);
 const shipping=el("section","v12-shipping-preference");
 shipping.append(el("h3",null,"Delivery destination"));
 shipping.append(el("p","v12-me-context","Optional US ZIP code for delivery forecasting. Saved on this device only; sent only to retailer catalog search when needed for destination filtering; never to OpenAI research. A retailer-specific estimate is required before dates appear."));
 const zipLabel=el("label","me-setting");
 zipLabel.append(el("span","me-setting-label","US ZIP code"));
 const input=el("input");input.type="text";input.inputMode="numeric";input.maxLength=5;
 input.pattern="[0-9]{5}";input.placeholder="5-digit ZIP";input.autocomplete="off";
 input.value=shippingZip();zipLabel.append(input);shipping.append(zipLabel);
 const zipStatus=el("p","v12-me-context");zipStatus.setAttribute("role","status");
 shipping.append(button("Save destination",()=>{
   if(!lib()?.requireAccount?.(()=>showPage("account")))return;
  const value=input.value.trim();
  if(value&&!/^\d{5}$/.test(value)){zipStatus.textContent="Enter a valid five-digit US ZIP code.";return;}
  try{const key=shippingKey();if(!key)throw Error("Sign in required");if(value)localStorage.setItem(key,value);else localStorage.removeItem(key);
   zipStatus.textContent=value?"Destination saved on this device.":"Destination cleared.";
  }catch{zipStatus.textContent="Local storage is unavailable. Destination not saved.";}
 },"destination-link"));
 shipping.append(zipStatus);
 root.append(shipping);
 const footer=el("div","me-settings-bottom");
 footer.append(el("p","me-preferences-status","Changes are saved to your device or signed-in account."));
 footer.lastChild.id="me-preferences-status";
 footer.append(button("Edit more size details in Studio ↗",()=>{
  showPage("studio");
  window.MatchlatchStudioFlow?.open("style");
  const field=$("topSize");
  const details=field?.closest("details");
  if(details)details.open=true;
  field?.scrollIntoView({behavior:"smooth",block:"center"});
 },"destination-link"));
 root.append(footer);
}
function renderClosetBridge(){
 const root=$("screen-styles");
 if(!root)return;
 let bridge=root.querySelector(".v12-closet-bridge");
 if(!bridge){
  bridge=el("section","v12-closet-bridge");
  bridge.setAttribute("aria-label","Continue your styling journey");
  const target=root.querySelector(".library-top")||root.firstElementChild;
  if(target)target.after(bridge);else root.prepend(bridge);
 }
 bridge.replaceChildren();
 const state=snapshot();
 bridge.append(el("strong",null,"Your style archive"));
 bridge.append(el("span","v12-closet-count",state.looks.length+" saved look"+(state.looks.length===1?"":"s")+" · "+state.collections.length+" collection"+(state.collections.length===1?"":"s")));
 bridge.append(button("Start a new look ↗",()=>lib()?.startFreshStudio?.(),"destination-link quiet"));
}
function renderDestination(page){
 if(page==="styles"||page==="closet")renderClosetBridge();
 if(page==="studio")renderWorkspace();
 if(page==="mood")renderMood();
 if(page==="store")renderStore();
 if(page==="account"){renderProfileLinks();renderAppearance();renderMePreferences();}
}
function initThemeToggle(){
 const control=$("header-theme-toggle"),appearance=window.MatchlatchAppearance;
 if(!control||!appearance)return;
 const update=()=>{
  const dark=appearance.effective()==="dark";
  const label=dark?"Switch to light mode":"Switch to dark mode";
  control.setAttribute("aria-label",label);
  control.setAttribute("title",label);
  control.setAttribute("aria-pressed",String(dark));
 };
 control.addEventListener("click",()=>{
  appearance.set(appearance.effective()==="dark"?"light":"dark");
  update();
 });
 window.addEventListener("matchlatch:appearance",update);
 update();
}
initThemeToggle();
void import("./owner-navigation.mjs").then(({createOwnerNavigation})=>{
 window.MatchlatchOwnerNavigation=createOwnerNavigation({
  getUserId:()=>lib()?.getUserId?.()||null,
  getSession:()=>window.MatchlatchAuth?.client?.auth.getSession()||Promise.resolve({data:{session:null}}),
  onAuthChange:callback=>window.addEventListener("matchlatch:auth-user",callback)
 });
 renderProfileLinks();
}).catch(()=>{});
let storeAccountId=lib()?.getUserId?.()||null;
window.addEventListener("matchlatch:auth-user",()=>{
 const nextAccountId=lib()?.getUserId?.()||null;if(nextAccountId===storeAccountId)return;storeAccountId=nextAccountId;
 searchId++;controller?.abort();storeState.items=[];storeState.selected=null;storeState.retailers=[];storeState.searched=false;storeState.criteria=null;storeState.styleContext="";storeState.sizeSystem="";
 if(location.hash.startsWith("#store"))renderStore();
});
window.addEventListener("matchlatch:page",event=>{if(event.detail?.page!=="store"&&storeState.items.some(i=>i.evaluationOnly)){storeState.items=storeState.items.filter(i=>!i.evaluationOnly);if(storeState.selected?.evaluationOnly)storeState.selected=null;storeState.searched=false;}renderDestination(event.detail?.page);});
window.addEventListener("matchlatch:retailer-search",event=>{
 const d=event.detail||{};const q=String(d.query||"").slice(0,170),max=Number(d.max);
 searchId++;controller?.abort();storeState.items=[];storeState.selected=null;storeState.criteria=null;storeState.searched=false;
 storeState.query=q;storeState.provider="unified";storeState.styleContext=String(d.context||"").slice(0,600);storeState.sizeSystem=String(d.sizeSystem||"").slice(0,40);storeState.exactSize=String(d.size||"").slice(0,40);storeState.brand="";storeState.needBy="";
 storeState.slot=supportedSlots.some(([slot])=>slot===d.slot)?d.slot:"shirt";
 storeState.max=Number.isFinite(max)&&max>=1&&max<=10000?max:200;
 initialStoreQuery=q;initialStoreSlot=storeState.slot;showPage("store");renderStore();
});
window.addEventListener("matchlatch:library",()=>{
 const current=(location.hash||"#studio").slice(1);
 if(current==="studio"||current==="mood"||current==="closet"||current==="styles")renderDestination(current);
});
const hash=(location.hash||"#studio").slice(1).split("?")[0].split("/")[0];
renderDestination(hash==="me"?"account":(["mood","studio","store","account"].includes(hash)?hash:"studio"));
})();
