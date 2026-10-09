/* MATCHLATCH Savings Check: transient merchant coupon lookups.
 * Runs automatically as real retailer offers appear; groups concurrent
 * merchant requests and never stores coupons in a user's wardrobe.
 * A provider-listed code is NOT checkout-verified.
 */
(function(){
 "use strict";
 const CACHE_MS=10*60*1000;
 const cache=new Map();
 let queued=new Map(),timer=null;
 const byId=new Map();
 const make=(tag,cls,text)=>{
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(text!==undefined)n.textContent=String(text);
  return n;
 };
 const getDomain=item=>{
  try{
   const u=new URL(item?.url||"");
   if(u.protocol!=="https:")return "";
   const d=u.hostname.toLowerCase().replace(/^www\./,"");
   return /^(?:[a-z0-9-]+\.)+[a-z]{2,24}$/.test(d)?d:"";
  }catch{return ""}
 };
 const update=(container,domain)=>{
  const entry=cache.get(domain);
  if(!entry)return;
  container.replaceChildren();
  const {data}=entry;
  const summary=make("summary","savings-summary");
  if(data.status==="not_configured"){
   summary.textContent="Savings Check · Feed not connected";
   container.append(summary);
   container.append(make("p","savings-note","Coupon lookup will activate when a licensed provider is connected."));
   return;
  }
  if(data.status==="provider_unavailable"){
   summary.textContent="Savings Check · Unavailable";
   container.append(summary);
   container.append(make("p","savings-note","Coupon source could not be reached. Retailer prices are unchanged."));
   return;
  }
  const coupons=Array.isArray(data.offers)?data.offers.filter(c=>c?.verification==="provider_listed"):[],
   count=coupons.length;
  summary.textContent=count?"Savings Check · "+count+" public code"+(count===1?"":"s"):"Savings Check · No listed codes";
  container.append(summary);
  if(!count){
   container.append(make("p","savings-note","No current codes found for this store in the connected provider's feed."));
   return;
  }
  const info=make("p","savings-note",
   "Third-party listings only. These codes have NOT been tested at checkout and may exclude this item.");
  container.append(info);
  for(const offer of coupons.slice(0,3)){
   const row=make("div","savings-offer");
   const main=make("div","savings-offer-copy");
   main.append(make("strong",null,offer.code));
   if(offer.title)main.append(make("small",null,offer.title));
   if(offer.terms)main.append(make("small",null,offer.terms));
   if(offer.expiresAt){
    const date=new Date(offer.expiresAt);
    if(Number.isFinite(date.getTime()))main.append(make("small",null,"Listed expiry: "+date.toLocaleDateString()));
   }
   const copy=make("button","savings-copy","Copy");
   copy.type="button";copy.setAttribute("aria-label","Copy discount code "+offer.code);
   copy.addEventListener("click",async()=>{
    try{
     if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(offer.code);
     else{
      const el=make("textarea");el.value=offer.code;document.body.append(el);el.select();
      if(!document.execCommand("copy"))throw Error("COPY_FAILED");
      el.remove();
     }
     copy.textContent="Copied ✓";
    }catch{
     copy.textContent="Select code";main.prepend(make("small",null,"Code: "+offer.code));
    }
   });
   row.append(main,copy);container.append(row);
  }
 };
 const fanOut=(domain,data)=>{
  cache.set(domain,{time:Date.now(),data});
  const targets=byId.get(domain)||new Set();
  for(const node of targets)if(node.isConnected)update(node,domain);
  byId.delete(domain);
 };
 async function run(){
  timer=null;
  const pending=queued;queued=new Map();
  const domains=[...pending.keys()];
  if(!domains.length)return;
  // /api/savings limits one request to 15 merchant domains. A full outfit
  // can include more unique retailers, so split instead of failing every item.
  for(let offset=0;offset<domains.length;offset+=15){
   const batch=domains.slice(offset,offset+15);
   try{
    const search=new URLSearchParams({domains:batch.join(",")});
    const response=await fetch("/api/savings?"+search,{cache:"no-store"});
    const payload=await response.json();
    if(!response.ok||!payload||!payload.status)throw Error("FEED_REQUEST_FAILED");
    for(const d of batch)fanOut(d,{status:payload.status,offers:payload.offers?.[d]||[]});
   }catch{
    for(const d of batch)fanOut(d,{status:"provider_unavailable",offers:[]});
   }
  }
 }
 function attach(parent,item){
  const d=getDomain(item);
  if(!d||!parent)return;
  const wrapper=make("details","savings-check");
  wrapper.setAttribute("aria-label","Savings Check for "+d);
  parent.append(wrapper);
  const existing=cache.get(d);
  if(existing&&Date.now()-existing.time<CACHE_MS){update(wrapper,d);return;}
  wrapper.append(make("summary","savings-summary","Savings Check · Looking for codes…"));
  if(!byId.has(d))byId.set(d,new Set());
  byId.get(d).add(wrapper);
  queued.set(d,true);
  if(!timer)timer=setTimeout(()=>void run(),120);
 }
 window.MatchlatchSavings={attach};
})();
