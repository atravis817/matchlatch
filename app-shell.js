/* MATCHLATCH destinations: MOOD / MY CLOSET / STUDIO / STORE / ME.
 * Browser-side curation uses the owner's current profile and private library.
 * This is deterministic personalization, not an invented AI model output.
 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const lib=()=>window.MatchlatchLibrary;
const snapshot=()=>lib()?.discoverySnapshot?.()||{collections:[],inspirations:[],looks:[],favorites:[],cartCount:0};
const profile=()=>window.MatchlatchStyleProfile?.get?.()||{};
const el=(tag,cls,text)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=String(text);
 return node;
};
const button=(label,fn,cls="destination-link")=>{
 const b=el("button",cls,label);b.type="button";b.addEventListener("click",fn);return b;
};
const sectionTitle=(kicker,title,description)=>{
 const wrap=el("div","destination-section-title");
 const names=el("div");names.append(el("span","micro-title",kicker),el("h2",null,title));
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
 const heading=sectionTitle("YOUR STUDIO","Studio.","Start a new look or continue a saved project.");
 target.append(heading);
 const actions=el("div","studio-entry-grid");
 const newCard=el("article","studio-entry studio-entry-primary");
 newCard.append(el("span","studio-entry-eyebrow","START FRESH"));
 newCard.append(el("h3",null,"Start with a piece."));
 newCard.append(el("p",null,"Upload an image or describe the piece you want to build around."));
 newCard.append(button("Create a new look ↗",()=>lib()?.startFreshStudio?.(),"studio-entry-action"));
 actions.append(newCard);
 const resumeCard=el("article","studio-entry");
 resumeCard.append(el("span","studio-entry-eyebrow","SAVED WORK"));
 resumeCard.append(el("h3",null,"Continue a look."));
 resumeCard.append(el("p",null,state.looks.length?
   state.looks.length+" look"+(state.looks.length===1?"":"s")+" in your archive · "+state.collections.length+" folder"+(state.collections.length===1?"":"s"):
   "Your saved looks and collections will appear here."));
 resumeCard.append(button("Browse your folders ↗",openFolders,"studio-entry-action quiet"));
 actions.append(resumeCard);target.append(actions);
 if(state.collections.length){
  const row=el("div","destination-folders");
  row.append(el("div","destination-inline-title","YOUR COLLECTIONS"));
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
  wrap.append(sectionTitle("PICK UP WHERE YOU LEFT OFF","Recent looks","Open a saved look to keep styling or shopping."));
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
function sendMoodToStore(direction){
 initialStoreQuery=direction.query;
 showPage("store");
}
function renderMood(){
 const target=$("mood-body");if(!target)return;
 target.replaceChildren();
 const state=snapshot(),p=profile();
 const headline=sectionTitle("THE DAILY EDIT","Curated for your taste.",
  "Outfit ideas based on your saved preferences and collections. These are styling suggestions, not live products.");
 target.append(headline);
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
const storeState={query:"",slot:"shirt",max:200,items:[],searched:false,source:"",checkedAt:0};
const supportedSlots=[
 ["shirt","Tops"],["pants","Bottoms"],["jacket","Outerwear"],["shoes","Footwear"],
 ["hat","Headwear"],["scarf","Scarves"],["watch","Watches"],["belt","Belts"],["socks","Socks"]
];
const USD=value=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(Number(value)||0);
let searchId=0,controller=null;
function storeCard(item){
 const card=el("article","store-card");
 const cover=el("div","store-card-cover");
 if(item.image){
  try{
   const url=new URL(item.image);
   if(url.protocol==="https:"){
    const img=el("img");img.src=url.href;img.alt=item.imageAlt||item.title||"Retailer item";img.loading="lazy";
    cover.append(img);
   }
  }catch{}
 }
 if(!cover.children.length)cover.append(el("span","store-no-photo","No image"));
 card.append(cover);
 const info=el("div","store-card-info");
 info.append(el("span","micro-title",item.merchant||"RETAILER"));
 info.append(el("h3",null,item.title||"Retailer product"));
 info.append(el("strong","store-price",USD(item.price)));
 if(item.size)info.append(el("span","store-size","Size "+item.size));
 const actions=el("div","store-card-actions");
 try{
  const url=new URL(item.url);
  if(url.protocol==="https:"){
   const link=el("a","store-retailer-link","View at retailer ↗");
   link.href=url.href;link.target="_blank";link.rel="noopener noreferrer";
   actions.append(link);
  }
 }catch{}
 actions.append(button("Style a similar piece ↗",()=>{
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
  if(status)status.textContent="Choose the item type and color, then select Guided Styling. This won't add the retailer product to your closet.";
  $("studio")?.scrollIntoView({behavior:"smooth",block:"start"});
  $("itemcolor")?.focus();
 }, "destination-link quiet"));
 info.append(actions);
 window.MatchlatchSavings?.attach?.(info,item);
 card.append(info);return card;
}
function renderStore(){
 const target=$("store-body");if(!target)return;
 target.replaceChildren();
 target.dataset.view="search";
 $("screen-store").dataset.storeView="search";
 // A fresh tab cannot restore transient catalog results; start with a real search.
 if(location.hash==="#store/results")history.replaceState(null,"","#store");
 const p=profile();
 const box=el("section","store-search");
 box.append(sectionTitle("FIND YOUR NEXT PIECE","Find something new.",
  "Search participating retailers for available products. Results don't cover every store."));
 const form=el("form","store-search-form");
 const query=el("input");query.type="search";query.placeholder="e.g. charcoal oversized shirt";
 query.maxLength=170;query.required=true;query.minLength=2;
 query.setAttribute("aria-label","Search retailer products");
 query.value=initialStoreQuery||storeState.query||"";
 const select=el("select");select.setAttribute("aria-label","Clothing category");
 for(const [value,label] of supportedSlots){const option=new Option(label,value);select.add(option);}
 select.value=storeState.slot;
 const budget=el("input");budget.type="number";budget.min="1";budget.max="10000";budget.step="5";
 budget.setAttribute("aria-label","Maximum price in USD");
 budget.value=String(storeState.max||p.budget||200);
 const submit=el("button","store-submit","Search store ↗");submit.type="submit";
 const queryLabel=el("label","store-field store-query-field");queryLabel.append(el("span",null,"WHAT ARE YOU LOOKING FOR?"),query);
 const categoryLabel=el("label","store-field");categoryLabel.append(el("span",null,"CATEGORY"),select);
 const budgetLabel=el("label","store-field");budgetLabel.append(el("span",null,"MAX PRICE · USD"),budget);
 form.append(queryLabel,categoryLabel,budgetLabel,submit);
 box.append(form);
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
 box.append(quick);
 target.append(box);
 const results=el("div","store-results");
 const head=el("div","store-results-top");
 head.append(button("← Change search",()=>{
  target.dataset.view="search";
  $("screen-store").dataset.storeView="search";
  if(location.hash!=="#store")history.pushState(null,"","#store");
  window.scrollTo({top:0,behavior:"auto"});
 },"flow-back"));
 const heading=el("h2",null,"Your results");
 head.append(heading);
 results.append(head);
 const status=el("p","store-search-status");
 status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 results.append(status);
 const list=el("div","store-grid");results.append(list);
 target.append(results);
 if(initialStoreQuery){status.textContent="Your mood is ready to shop. Choose a category and search.";initialStoreQuery="";}
 else if(storeState.searched){
  status.textContent="Search again for updated prices and availability.";
 }else status.textContent="Search available products. You'll check out on the retailer's website.";
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  const q=query.value.trim(),max=Number(budget.value);
  if(q.length<2||!Number.isFinite(max)||max<1||max>10000){
   status.textContent="Enter a search of at least 2 characters and a budget between $1 and $10,000.";
   return;
  }
  storeState.query=q;storeState.slot=select.value;storeState.max=max;
  storeState.searched=true;storeState.items=[];
  target.dataset.view="results";
  $("screen-store").dataset.storeView="results";
  if(location.hash!=="#store/results")history.pushState(null,"","#store/results");
  window.scrollTo({top:0,behavior:"auto"});
  list.replaceChildren();status.textContent="Searching available retailer products…";
  submit.disabled=true;
  if(controller)controller.abort();
  controller=new AbortController();
  const run=++searchId;
  try{
   const params=new URLSearchParams({mode:"search",slot:select.value,q,max:String(max)});
   const response=await fetch("/api/shop?"+params,{signal:controller.signal,cache:"no-store"});
   const data=await response.json();
   if(run!==searchId)return;
   if(!response.ok)throw Error(data.error||"Retailer search unavailable.");
   const items=Array.isArray(data.items)?data.items.filter(item=>item?.available&&Number(item.price)<=max):[];
   storeState.items=items;storeState.checkedAt=Date.now();
   status.textContent=items.length?
    items.length+" available retailer listing"+(items.length===1?"":"s")+" found. Prices and availability may change.":
    "No available products found. Try another search or budget.";
   list.replaceChildren(...items.map(storeCard));
  }catch(error){
   if(run!==searchId)return;
   if(error?.name!=="AbortError")status.textContent="We couldn't check the live catalog right now. Please try again.";
  }finally{if(run===searchId)submit.disabled=false;}
 });
}
function renderProfileLinks(){
 const root=$("profile-shortcuts");if(!root)return;
 root.replaceChildren();
 const sections=[
  ["DISPLAY","Appearance","Light, dark or your device theme.", "me-appearance"],
  ["PERSONALIZATION","My style","Preferences, sizes and your look.", "me-preferences"],
  ["ACCOUNT ACCESS","My account","Guest access and secure sign-in.", "me-account-panel"],
  ["PRIVACY CONTROL","Privacy & data","Device data and account controls.", "me-privacy-panel"]
 ];
 for(const [number,name,description,targetId] of sections){
  const card=button("",()=>{
   const view={"me-appearance":"appearance","me-preferences":"preferences",
     "me-account-panel":"account","me-privacy-panel":"privacy"}[targetId];
   window.MatchlatchMeFlow?.open(view||"home");
  },"profile-shortcut");
  const info=el("span","profile-shortcut-copy");
  info.append(el("span","micro-title",number),el("strong",null,name),el("small",null,description));
  card.append(info,el("span","profile-shortcut-arrow","↗"));
  root.append(card);
 }
}
function renderAppearance(){
 const root=$("me-appearance");if(!root)return;
 root.replaceChildren();
 root.append(sectionTitle("DISPLAY SETTINGS","Appearance.",
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
 const heading=sectionTitle("STYLE PREFERENCES","Your style, your rules.",
  "Update the preferences used in Studio and Mood.");
 root.append(heading);
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
function renderDestination(page){
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
window.addEventListener("matchlatch:page",event=>renderDestination(event.detail?.page));
window.addEventListener("matchlatch:library",()=>{
 const current=(location.hash||"#studio").slice(1);
 if(current==="studio"||current==="mood")renderDestination(current);
});
const hash=(location.hash||"#studio").slice(1).split("?")[0];
renderDestination(hash==="me"?"account":(["mood","studio","store","account"].includes(hash)?hash:"studio"));
})();