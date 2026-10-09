/* MATCHLATCH AI retailer criteria + ranking. No parallel cart or extra AI calls. */
(function(){
"use strict";
const WORDS={
 hat:/\b(hat|cap|beanie|headwear)\b/i,scarf:/\b(scarf|wrap)\b/i,
 jacket:/\b(jacket|coat|blazer|outerwear|layer|parka)\b/i,
 shirt:/\b(shirt|top|sweater|hoodie|blouse|polo|t-shirt|tee|cardigan)\b/i,
 watch:/\b(watch|timepiece)\b/i,belt:/\b(belt)\b/i,
 pants:/\b(pants|trousers|jeans|bottoms|bottom|skirt|shorts|chinos)\b/i,
 socks:/\b(socks?)\b/i,
 shoes:/\b(shoes?|sneakers?|boots?|loafers?|heels?|flats?|footwear)\b/i
};
const clip=(x,n=170)=>String(x??"").replace(/[\x00-\x1f]/g," ").replace(/\s+/g," ").trim().slice(0,n);
const normalize=s=>clip(s,150).toLowerCase().replace(/grey/g,"gray").replace(/[^a-z0-9]/g,"");
const STOP=new Set(["and","with","the","for","in","of","a","an","fashion","style","look","wear","clothes","unisex","mens","womens","men","women","size","casual","everyday","lightweight","comfortable","relaxed"]);
function pieceFor(slot,pieces){
 const arr=Array.isArray(pieces)?pieces:[];
 return arr.find(p=>p?.slot===slot)
   ||arr.find(p=>WORDS[slot]?.test(String(p?.type||"")+" "+String(p?.description||"")))
   ||null;
}
function criteria({slot,pieces=[],profile={},size="",max=200,manualQuery=""}){
 if(!Object.hasOwn(WORDS,slot))return null;
 const p=profile&&typeof profile==="object"?profile:{};
 const piece=pieceFor(slot,pieces),color=clip(piece?.color,40);
 // Hard-filter only explicit AI garment colors, not broad palettes.
 const exactColor=!clip(manualQuery,170)&&color&&!/^(no preference|neutral|mixed|multicolor|multicolour|various|any|assorted)$/i.test(color)?color:"";
 const aesthetic=clip(p.aesthetic,55),fit=clip(p.fit,45),audience=clip(p.sizeAudience,45);
 const search=clip(manualQuery||piece?.searchQuery||piece?.description,170);
 const basic=[exactColor,fit&&!/no preference/i.test(fit)?fit:"",aesthetic&&!/no preference/i.test(aesthetic)?aesthetic:"",slot].filter(Boolean).join(" ");
 const q=/^[a-z0-9]/i.test(search)?search:basic||slot;
 const alternate=[exactColor,slot,aesthetic&&!/no preference/i.test(aesthetic)?aesthetic:""].filter(Boolean).join(" ");
 return {
  slot,q:q.slice(0,170),alternate:alternate.slice(0,170),size:clip(size,36),color:exactColor,
  max:Math.max(1,Math.min(10000,Number(max)||200)),
  source:piece?"AI / guided look":"Style preferences",
  hints:{fit,aesthetic,audience,occasion:clip(p.occasion,50)},country:"US"
 };
}
function rank(items,c){
 if(!c||!Array.isArray(items))return [];
 const wanted=String(c.q||"").toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/)
  .filter(w=>w.length>=3&&!STOP.has(w)).slice(0,15);
 const candidates=[];
 for(let i=0;i<items.length;i++){
  const item=items[i];
  if(!item||item.available!==true||item.currency!=="USD"
    ||!Number.isFinite(Number(item.price))||Number(item.price)>c.max||Number(item.price)<=0
    ||!item.productId||!item.variantId||!item.url)continue;
  if(c.size&&normalize(item.size)!==normalize(c.size))continue;
  if(c.color&&(!item.color||!normalize(item.color).includes(normalize(c.color))))continue;
  const hay=(String(item.title||"")+" "+String(item.variant||"")+" "+String(item.color||"")).toLowerCase().replace(/grey/g,"gray");
  let score=0;
  for(const word of wanted)if(hay.includes(word))score+=word.length>5?3:2;
  if(c.color&&normalize(item.color).includes(normalize(c.color)))score+=9;
  if(c.size&&normalize(item.size)===normalize(c.size))score+=6;
  if(item.checkoutUrl)score+=.25;
  candidates.push({item,score,index:i});
 }
 candidates.sort((a,b)=>b.score-a.score||a.index-b.index);
 return candidates.map(x=>x.item);
}
function merchants(items){
 const unique=new Map();
 for(const item of Array.isArray(items)?items:[]){
  const name=clip(item?.merchant,90);if(!name)continue;
  const id=clip(item.merchantId||item.merchantDomain||name,180);
  if(!unique.has(id))unique.set(id,{name,domain:clip(item.merchantDomain,180),count:0});
  unique.get(id).count++;
 }
 return [...unique.values()];
}
window.MatchlatchRetailerMatch=Object.freeze({criteria,rank,merchants,pieceFor});
})();