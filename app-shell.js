/* MATCHLATCH destinations: MOOD / STUDIO / STORE / PROFILE.
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
 const fallback=el("span","destination-photo-fallback","MATCHLATCH  /  ARCHIVE");
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
 const heading=sectionTitle("02 / CREATE","The studio.","Start something new or continue where your inspiration left off.");
 target.append(heading);
 const actions=el("div","studio-entry-grid");
 const newCard=el("article","studio-entry studio-entry-primary");
 newCard.append(el("span","studio-entry-index","01 / NEW PROJECT"));
 newCard.append(el("h3",null,"Start with a piece."));
 newCard.append(el("p",null,"Upload an image or describe the piece you want to build around."));
 newCard.append(button("Create a new look ↗",()=>lib()?.startFreshStudio?.(),"studio-entry-action"));
 actions.append(newCard);
 const resumeCard=el("article","studio-entry");
 resumeCard.append(el("span","studio-entry-index","02 / YOUR WORK"));
 resumeCard.append(el("h3",null,"Pick up a project."));
 resumeCard.append(el("p",null,state.looks.length?
   state.looks.length+" look"+(state.looks.length===1?"":"s")+" in your archive · "+state.collections.length+" folder"+(state.collections.length===1?"":"s"):
   "Your looks and named collections will appear here as you create."));
 resumeCard.append(button("Browse your folders ↗",openFolders,"studio-entry-action quiet"));
 actions.append(resumeCard);target.append(actions);
 if(state.collections.length){
  const row=el("div","destination-folders");
  row.append(el("div","destination-inline-title","YOUR COLLECTIONS"));
  const rail=el("div","folder-rail");
  for(const folder of state.collections.slice(0,5)){
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
  wrap.append(sectionTitle("PICK UP WHERE YOU LEFT OFF","Recent projects","Return directly to the outfit editor and retailer options."));
  const grid=el("div","destination-recent-grid");
  for(const look of state.looks.slice(0,3)){
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
   number:"01",tag:"YOUR SIGNATURE",title:aesthetic==="Minimalist"?"The quiet uniform":aesthetic+" / daily",
   subtitle:"Everyday with intention.",accent:"charcoal",anchorType:"top:button-down-shirt",anchorColor:color,
   pieces:[fit+" shirt","Clean-cut trouser","Everyday sneaker","Subtle finishing layer"],
   query:[aesthetic,fit,palette,"outfit"].join(" "),reason:"Based on your "+aesthetic.toLowerCase()+" style preference."
  },
  {
   number:"02",tag:"DRESSED UP",title:"The considered layer",
   subtitle:"A sharper way to show up.",accent:"stone",anchorType:"outerwear:blazer",anchorColor:color,
   pieces:["Structured jacket","Soft base layer","Tailored pant","Polished footwear"],
   query:[aesthetic,"tailored",occasion,"jacket"].join(" "),
   reason:"A complementary direction for "+occasion.toLowerCase()+"."
  },
  {
   number:"03",tag:firstFolder?"FROM YOUR ARCHIVE":"OFF DUTY",
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
  "Starter outfits respond to your saved preferences and collection history. These are style concepts, not newly AI-generated retailer listings.");
 target.append(headline);
 const meta=el("div","mood-signal");
 const collectionCount=state.collections.length;
 meta.append(el("span",null,"SIGNALS  /  "+pick(p.aesthetic,"MINIMALIST").toUpperCase()+" · "+pick(p.fit,"RELAXED").toUpperCase()));
 meta.append(el("span",null,collectionCount?collectionCount+" FOLDERS":"BUILD YOUR PERSONAL ARCHIVE"));
 target.append(meta);
 const grid=el("div","mood-grid");
 for(const direction of curatedDirections(state,p)){
  const card=el("article","mood-card mood-"+direction.accent);
  const visual=el("div","mood-cover");
  visual.append(el("span","mood-sequence",direction.number+" / 03"));
  const outfit=el("div","mood-outfit");
  for(const [idx,piece] of direction.pieces.entries()){
   const row=el("div","mood-piece");
   row.append(el("span","mood-piece-index",String(idx+1).padStart(2,"0")));
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
 const related=state.looks.slice(0,4);
 if(related.length){
  const sec=el("section","mood-archive");
  sec.append(sectionTitle("ALREADY YOURS","Inspired by your archive.","Return to looks you've actually created."));
  const rail=el("div","mood-archive-rail");
  for(const look of related){
   const card=button("",()=>lib()?.openLook?.(look.id),"mood-archive-card");
   card.append(photoTile(look.inspirationId,"mood-archive-photo"));
   const info=el("span","mood-archive-copy");info.append(el("strong",null,look.label),el("small",null,"Continue this look ↗"));
   card.append(info);rail.append(card);
  }
  sec.append(rail);target.append(sec);
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
 if(!cover.children.length)cover.append(el("span","store-no-photo","PRODUCT IMAGE UNAVAILABLE"));
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
 actions.append(button("Build around this ↗",()=>{
  showPage("studio");
  $("studio")?.scrollIntoView({behavior:"smooth",block:"start"});
 }, "destination-link quiet"));
 info.append(actions);
 window.MatchlatchSavings?.attach?.(info,item);
 card.append(info);return card;
}
function renderStore(){
 const target=$("store-body");if(!target)return;
 target.replaceChildren();
 const p=profile();
 const box=el("section","store-search");
 box.append(sectionTitle("FIND YOUR NEXT PIECE","Shop the edit.",
  "Live available products from participating Shopify Global Catalog retailers. Coverage isn't the entire internet."));
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
 const status=el("p","store-search-status");
 status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 results.append(status);
 const list=el("div","store-grid");results.append(list);
 target.append(results);
 if(initialStoreQuery){status.textContent="Mood direction added. Choose a category and search live retailers.";initialStoreQuery="";}
 else if(storeState.searched){
  status.textContent="Previous search: "+storeState.query+". Search again for current availability and prices.";
 }else status.textContent="Search to see current in-stock retailer listings. All purchases are completed with the retailer.";
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  const q=query.value.trim(),max=Number(budget.value);
  if(q.length<2||!Number.isFinite(max)||max<1||max>10000){
   status.textContent="Enter a search of at least 2 characters and a budget between $1 and $10,000.";
   return;
  }
  storeState.query=q;storeState.slot=select.value;storeState.max=max;
  storeState.searched=true;storeState.items=[];
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
    "No verified in-stock products found. Try broader keywords or a higher budget.";
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
  ["01","Appearance","Light, dark or your device theme.", "me-appearance"],
  ["02","My style","Preferences, sizes and your look.", "me-preferences"],
  ["03","My account","Guest access and secure sign-in.", "me-account-panel"],
  ["04","Privacy & data","Device data and account controls.", "me-privacy-panel"]
 ];
 for(const [number,name,description,targetId] of sections){
  const card=button("",()=>{
   $(targetId)?.scrollIntoView({behavior:"smooth",block:"start"});
  },"profile-shortcut");
  const info=el("span","profile-shortcut-copy");
  info.append(el("span","micro-title",number+" / ME"),el("strong",null,name),el("small",null,description));
  card.append(info,el("span","profile-shortcut-arrow","↗"));
  root.append(card);
 }
}
function renderAppearance(){
 const root=$("me-appearance");if(!root)return;
 root.replaceChildren();
 root.append(sectionTitle("01 / YOUR SPACE","Appearance.",
  "A quieter look, day or night. Applies everywhere in MATCHLATCH."));
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
 const heading=sectionTitle("02 / YOUR TASTE","Your style, your rules.",
  "Edit the same preferences Studio uses to shape looks and MOOD uses to curate directions.");
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
   if(status)status.textContent="Preferences saved. Changes will guide your next look.";
  };
  clone.addEventListener(id==="notes"||id==="budget"?"input":"change",save);
  field.append(clone);grid.append(field);
 }
 root.append(grid);
 const footer=el("div","me-settings-bottom");
 footer.append(el("p","me-preferences-status","Changes save to your device or signed-in private account."));
 footer.lastChild.id="me-preferences-status";
 footer.append(button("More sizes & measurements in Studio ↗",()=>{
  showPage("studio");
  $("topSize")?.scrollIntoView({behavior:"smooth",block:"center"});
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