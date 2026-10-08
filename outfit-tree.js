/* MATCHLATCH Outfit Tree and Private Shop.
 * Shopify live catalog listings remain transient in memory; no catalog images
 * or search-result snapshots are saved. Only explicitly selected IDs are kept.
 */
(function(){
"use strict";
const SLOTS=[
 {id:"hat",label:"Hat",optional:true,weight:.07},
 {id:"scarf",label:"Scarf",optional:true,weight:.06},
 {id:"jacket",label:"Jacket",optional:true,weight:.28},
 {id:"shirt",label:"Shirt",optional:false,weight:.26},
 {id:"watch",label:"Watch",optional:true,weight:.10},
 {id:"belt",label:"Belt",optional:true,weight:.06},
 {id:"pants",label:"Pants",optional:false,weight:.33},
 {id:"socks",label:"Socks",optional:true,weight:.04},
 {id:"shoes",label:"Shoes",optional:false,weight:.35}
];
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(n||0);
const node=(tag,cls,text)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(text!==undefined)el.textContent=String(text);
 return el;
};
const button=(text,onClick,cls)=>{const b=node("button",cls,text);b.type="button";b.addEventListener("click",onClick);return b;};
const catalogs={};const FRESH_MS=60000;
let budget=200,prefs={},inspiration=null,session=0,anchor="",shopSlot=null;
let autoSlots=["shirt","pants","shoes"];
const slotById=id=>SLOTS.find(x=>x.id===id);
const stateFor=id=>catalogs[id]||(catalogs[id]={options:[],selected:null,query:"",loading:false,message:""});
const slotForItem=data=>{
 const kind=String(data?.item?.category||"").toLowerCase();
 const label=String(data?.item?.label||"").toLowerCase();
 if(/hat|cap|beanie/i.test(kind+" "+label))return "hat";
 if(/scarf/.test(kind+" "+label))return "scarf";
 if(/jacket|coat|blazer|outerwear/.test(kind+" "+label))return "jacket";
 if(/shirt|top|blouse|sweater|hoodie/.test(kind+" "+label))return "shirt";
 if(/watch/.test(kind+" "+label))return "watch";
 if(/belt/.test(kind+" "+label))return "belt";
 if(/pants|trousers|jeans|bottom|shorts|skirt/.test(kind+" "+label))return "pants";
 if(/socks/.test(kind+" "+label))return "socks";
 if(/shoes|sneakers|boots|loafers|footwear/.test(kind+" "+label))return "shoes";
 return "";
};
function sizeFor(slot) {
 const p=prefs;
 switch(slot){
  case "hat":return p.hatSize||"";
  case "jacket":return p.suitJacketSize && /formal|work|business|wedding|black tie|gala/i.test(p.occasion||"")?p.suitJacketSize:p.topSize||"";
  case "shirt":return p.topSize||"";
  case "pants":return p.waist||String(p.bottomSize||"").replace(/^(US|UK|EU)\s+/,"");
  case "belt":return p.beltSize||"";
  case "shoes":return p.shoeSize||"";
  default:return "";
 }
}
function queryFor(id){
 const source=inspiration?.pieces||[];
 const pattern={
  hat:/hat|cap|beanie/,scarf:/scarf/,jacket:/jacket|coat|blazer|outerwear|layer/,
  shirt:/shirt|top|sweater|hoodie|blouse/,watch:/watch/,
  belt:/belt/,pants:/pants|trousers|jeans|bottom|skirt/,
  socks:/sock/,shoes:/shoe|sneaker|boot|loafer|heel/
 }[id];
 const suggested=source.find(p=>pattern.test(String(p.type+" "+p.description).toLowerCase()));
 if(suggested){
  // Curated from the user's AI recommendation, bounded before the retailer API.
  return String(suggested.searchQuery||suggested.description||"").slice(0,110);
 }
 const palette=prefs.palette&&!/no preference/i.test(prefs.palette)?prefs.palette:"neutral";
 const aesthetic=prefs.aesthetic&&!/no preference/i.test(prefs.aesthetic)?prefs.aesthetic:"classic";
 const audience=prefs.sizeAudience&&prefs.sizeAudience!=="Mixed / depends on the item"?prefs.sizeAudience:"unisex";
 return [palette,aesthetic,audience,id].join(" ");
}
function sum(){
 return SLOTS.reduce((total,slot)=>total+(stateFor(slot.id).selected?.price||0),0);
}
function remaining(id){
 return Math.round(Math.max(0,budget-(sum()-(stateFor(id).selected?.price||0)))*100)/100;
}
function sizeHint(id) {
 const p=prefs;
 if(id==="shoes" && p.shoeSize)return p.shoeSystem+" "+p.shoeSize;
 if(id==="shirt" && p.topSize)return p.topSystem+" "+p.topSize;
 if(id==="jacket" && p.topSize)return p.topSystem+" "+p.topSize;
 if(id==="pants" && p.waist)return "Waist "+p.waist+" in";
 if(id==="pants" && p.bottomSize)return p.bottomSystem+" "+p.bottomSize;
 if(id==="hat" && p.hatSize)return p.hatSystem+" "+p.hatSize;
 return sizeFor(id)?sizeFor(id):"Any size";
}
function init(data,profile,savedSelections){
 session++;
 for(const key of Object.keys(catalogs))delete catalogs[key];
 inspiration=data;prefs=profile||{};budget=Math.max(25,Math.min(10000,Number(prefs.budget)||200));
 anchor=slotForItem(data);
 const needsJacket=/formal|business|office|work|wedding|gala|cold|cool|rain|winter|autumn|fall/i
   .test(String(prefs.occasion||"")+" "+String(prefs.climate||""));
 autoSlots=needsJacket?["jacket","shirt","pants","shoes"]:["shirt","pants","shoes"];
 const card=document.querySelector(".results-card");
 if(!card)return;
 let mount=$("outfit-tree");
 if(!mount){mount=node("section","tree-area");mount.id="outfit-tree";mount.setAttribute("aria-label","Curated outfit tree");
  const notes=$("style-notes");notes.after(mount);
 }
 const suggestions=$("styling-suggestions");
 if(suggestions)suggestions.open=false;
 render();
 setupDrawer();
 const generation=session;
 // Revalidate saved variant references live; no cached prices or images.
 (async()=>{
   if(savedSelections && typeof savedSelections==="object"){
     for(const [slot,ref] of Object.entries(savedSelections)){
       if(session!==generation)return;
       if(!slotById(slot)||slot===anchor||!ref?.productId||!ref?.variantId)continue;
       const current=stateFor(slot);
       current.loading=true;render();
       try{
         const qs=new URLSearchParams({mode:"verify",id:ref.productId,variant:ref.variantId,
           max:String(Math.max(1,remaining(slot)))});
         if(sizeFor(slot))qs.set("size",sizeFor(slot));
         const response=await fetch("/api/shop?"+qs.toString(),{cache:"no-store"});
         const result=await response.json();
         if(session!==generation)return;
         if(response.ok&&result.item&&result.item.price<=remaining(slot)+.001){
           current.options=[result.item];current.selected=result.item;current.index=0;
         } else current.message="Previously saved listing not available at this price/size.";
       }catch{
         if(session===generation)current.message="Saved listing could not be rechecked.";
       }finally{if(session===generation){current.loading=false;render();}}
     }
   }
   for(const slot of autoSlots){
     if(session!==generation)return;
     if(slot===anchor||stateFor(slot).selected)continue;
     await fetchOptions(slot,true);
   }
 })();
}
function render(){
 const mount=$("outfit-tree");if(!mount||!inspiration)return;
 mount.replaceChildren();
 const top=node("div","tree-heading");
 const intro=node("div");
 intro.append(node("div","micro-title","Build from top to toe"),node("h3",null,"Your outfit tree."));
 intro.append(node("p",null,"↶ ↷ Cycle alternatives. Private Shop opens a curated retailer browser."));
 top.append(intro);
 const amount=node("div","tree-total");
 amount.append(node("strong",null,money(sum())+" / "+money(budget)));
 const left=budget-sum();
 amount.append(node("small",null,money(left)+" remaining · before tax/shipping"));
 top.append(amount);mount.append(top);
 const list=node("div","tree-slots");
 for(const slot of SLOTS){
  const state=stateFor(slot.id);
  const row=node("div","tree-slot"+(slot.optional?" is-optional":""));
  const label=node("div","tree-slot-label",slot.label);
  const previous=button("‹",()=>cycle(slot.id,-1),"tree-slot-arrow");
  previous.setAttribute("aria-label","Previous "+slot.label+" alternative");
  const next=button("›",()=>cycle(slot.id,1),"tree-slot-arrow");
  next.setAttribute("aria-label","Next "+slot.label+" alternative");
  previous.disabled=next.disabled=state.loading||slot.id===anchor;
  const content=node("div","tree-slot-card");
  const info=node("div","tree-slot-info");
  if(slot.id===anchor){
    info.append(node("strong",null,"Your inspiration"));
    info.append(node("small",null,"Already owned / starting piece · $0"));
  } else if(state.selected){
    const item=state.selected;
    if(item.image){
      const img=node("img");img.src=item.image;img.alt=item.imageAlt||item.title;img.loading="lazy";content.append(img);
    }
    info.append(node("strong",null,item.title));
    info.append(node("small",null,item.merchant+" · "+money(item.price)+(item.size?" · "+item.size:"")));
  }else{
    info.append(node("strong",null,state.loading?"Checking current offers…":slot.optional?"Optional · add if you like":"Choose a piece"));
    info.append(node("small",null,state.message||((slot.id===anchor)?"":sizeHint(slot.id)+" · "+(slot.optional?"Explore when ready":"Curating options"))));
  }
  content.append(info);
  const shop=button(slot.id===anchor?"Inspiration":state.selected?"Private Shop ↗":"Private Shop",()=>openShop(slot.id),"tree-shop-btn");
  if(slot.id===anchor)shop.disabled=true;
  row.append(label,previous,content,next,shop);list.append(row);
 }
 mount.append(list);
 mount.append(node("p","tree-note","Products are shown only when the retailer catalog reports an available variant and USD price. No verified alternative? We leave the slot empty. Stock, taxes, shipping and checkout totals can change."));
}
async function fetchOptions(slotId,auto=false,custom="",autoSelect=auto){
 const slot=slotById(slotId),state=stateFor(slotId);
 if(!slot||slotId===anchor||state.loading)return;
 const max=Math.max(0,remaining(slotId));
 if(max<1){state.message="Budget fully allocated.";render();return;}
 const shares=autoSlots.includes("jacket")
   ? {jacket:.27,shirt:.19,pants:.24,shoes:.24}
   : {shirt:.26,pants:.33,shoes:.35};
 const cap=auto?Math.min(max,Math.max(3,Math.floor(budget*(shares[slotId]||slot.weight)))):max;
 const query=custom||state.query||queryFor(slotId);
 state.loading=true;state.message="";render();if(shopSlot===slotId)renderDrawer();
 const current=session;
 try{
  const qs=new URLSearchParams({mode:"search",slot:slotId,q:query,max:String(cap)});
  if(sizeFor(slotId))qs.set("size",sizeFor(slotId));
  const response=await fetch("/api/shop?"+qs.toString(),{cache:"no-store"});
  const data=await response.json();
  if(current!==session)return;
  if(!response.ok)throw Error(data.error||"Live catalog unavailable");
  state.options=Array.isArray(data.items)?data.items.filter(x=>x.available&&x.price<=cap):[];
  state.fetchedAt=Date.now();
  state.query=query;
  if(state.selected && !custom){
    const refreshed=state.options.find(x=>x.variantId===state.selected.variantId);
    state.selected=refreshed||null;
    if(refreshed)state.index=state.options.indexOf(refreshed);
  }
  // A manual query only displays alternatives; selecting one is always explicit.
  if(state.options.length&&!state.selected&&autoSelect)select(slotId,0,true);
  if(!state.options.length)state.message=auto?"No verified option in this allocation. Open Private Shop to broaden.":"No available items found in this size and budget.";
 }catch(e){if(current===session)state.message=e.message||"Catalog temporarily unavailable";}
 finally{if(current===session){state.loading=false;render();if(shopSlot===slotId)renderDrawer();}}
}
function select(slotId,index,persist=true){
 const st=stateFor(slotId),items=st.options;
 if(!items.length)return;
 const i=((index%items.length)+items.length)%items.length;
 const product=items[i];
 if(!product.available||product.price>remaining(slotId)+.001) {
   st.message="That option would exceed your budget. Try another.";
   render();return;
 }
 st.selected=product;st.index=i;st.message="";
 if(persist)window.MatchlatchLibrary?.chooseShopItem?.(slotId,product);
 render();
 if(shopSlot===slotId)renderDrawer();
}
function cycle(slotId,direction){
 const st=stateFor(slotId);
 if(!st.options.length||!st.fetchedAt||Date.now()-st.fetchedAt>FRESH_MS){
   st.options=[];st.selected=null;st.message="Rechecking current prices…";
   void fetchOptions(slotId,false,"",true);return;
 }
 select(slotId,(st.index??0)+direction);
}
function setupDrawer(){
 let overlay=$("private-shop-overlay");
 if(overlay)return;
 overlay=node("div","private-shop-overlay");
 overlay.id="private-shop-overlay";overlay.hidden=true;
 overlay.setAttribute("role","presentation");
 overlay.addEventListener("click",e=>{if(e.target===overlay)closeShop();});
 const panel=node("aside","private-shop-panel");
 panel.id="private-shop-panel";
 panel.setAttribute("role","dialog");
 panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label","Private Shop retailer browser");
 overlay.append(panel);document.body.append(overlay);
 document.addEventListener("keydown",e=>{
   if(e.key==="Escape"&&!overlay.hidden)closeShop();
 });
}
let lastFocus=null;
function openShop(slotId){
 if(slotId===anchor)return;
 setupDrawer();
 lastFocus=document.activeElement;
 shopSlot=slotId;
 $("private-shop-overlay").hidden=false;
 document.body.classList.add("private-shop-open");
 renderDrawer();
 const entry=stateFor(slotId);
 if((!entry.options.length||!entry.fetchedAt||Date.now()-entry.fetchedAt>FRESH_MS)&&!entry.loading){
   entry.options=[];entry.selected=null;
   void fetchOptions(slotId,false);
 }
}
function closeShop(){
 shopSlot=null;
 $("private-shop-overlay").hidden=true;
 document.body.classList.remove("private-shop-open");
 if(lastFocus?.isConnected)lastFocus.focus();
}
function renderDrawer(){
 if(!shopSlot)return;
 const id=shopSlot,slot=slotById(id),state=stateFor(id),panel=$("private-shop-panel");
 if(!panel)return;
 panel.replaceChildren();
 const top=node("div","private-shop-top"),heading=node("div");
 heading.append(node("div","micro-title","Private Shop"),node("h2",null,slot.label+" alternatives"));
 top.append(heading,button("×",closeShop,"private-shop-close"));panel.append(top);
 panel.append(node("p","private-shop-sub",money(remaining(id))+" left for this piece · "+sizeHint(id)+" · US merchants / shipping to US"));
 const controls=node("div","private-shop-controls");
 const input=document.createElement("input");input.type="search";input.value=state.query||queryFor(id);
 input.maxLength=170;input.setAttribute("aria-label","Refine "+slot.label+" product search");
 controls.append(input,button("Search",()=>void fetchOptions(id,false,input.value),""));
 input.addEventListener("keydown",e=>{if(e.key==="Enter")void fetchOptions(id,false,input.value);});
 panel.append(controls);
 if(state.loading)panel.append(node("div","private-shop-empty","Checking retailer prices and available variants…"));
 if(!state.loading&&state.message)panel.append(node("div","shop-feedback",state.message));
 const results=node("div","private-shop-results");
 for(let i=0;i<state.options.length;i++){
  const item=state.options[i];
  if(item.price>remaining(id)+.001)continue;
  const card=node("article","private-shop-item");
  if(item.image){const img=node("img","private-shop-image");img.src=item.image;img.alt=item.imageAlt||item.title;img.loading="lazy";card.append(img);}
  else card.append(node("div","private-shop-placeholder","Image unavailable"));
  const info=node("div","private-shop-details");
  info.append(node("strong",null,item.title),node("small",null,item.merchant+(item.size?" · Size "+item.size:"")));
  info.append(node("span","private-shop-price",money(item.price)));
  const checkedTime=item.checkedAt?new Date(item.checkedAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"recently";
  info.append(node("small",null,"In stock at "+checkedTime+" · subject to change"));
  const actions=node("div","private-shop-actions");
  actions.append(button(state.selected?.variantId===item.variantId?"Selected ✓":"Select this",()=>{
    select(id,i);window.MatchlatchLibrary?.chooseShopItem?.(id,item);
  }));
  const shop=document.createElement("a");shop.href=item.url;shop.target="_blank";shop.rel="noopener noreferrer";shop.textContent="Retailer ↗";
  actions.append(shop);
  actions.append(button("♡ Save",()=>window.MatchlatchLibrary?.favoriteShopItem?.(id,item),"tree-shop-help"));
  actions.append(button("＋ Cart",()=>window.MatchlatchLibrary?.cartShopItem?.(id,item),"tree-shop-help"));
  info.append(actions);card.append(info);results.append(card);
 }
 if(!state.loading&&!results.children.length)results.append(node("div","private-shop-empty","No confirmed in-stock alternatives in this size and price range. Try broader search terms or skip this piece."));
 panel.append(results);
 panel.append(node("p","tree-note","Live catalog browsing inside MATCHLATCH, not incognito browsing. Retailer visits open on the seller's site. Product images and result lists aren't saved; only your selected items are."));
}
function reset(){
 session++;inspiration=null;shopSlot=null;
 for(const key of Object.keys(catalogs))delete catalogs[key];
 const mount=$("outfit-tree");if(mount)mount.replaceChildren();
 const overlay=$("private-shop-overlay");if(overlay)overlay.hidden=true;
 document.body.classList.remove("private-shop-open");
}
window.MatchlatchShop={init,openShop,closeShop,reset};
})();