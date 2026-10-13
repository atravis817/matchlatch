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
 // User-entered exact color words take precedence in manual Store searches.
 // Broad mood palettes ("earth tones", "neutrals") are NOT SKU color filters.
 const manual=clip(manualQuery,170).toLowerCase();
 const colors=["black","white","olive","navy","charcoal","gray","grey","brown",
  "tan","beige","camel","cream","blue","red","green","pink","yellow","purple",
  "burgundy","maroon","teal","orange","gold","silver"];
 const selectedColor=colors.find(x=>new RegExp("\\b"+x+"\\b","i").test(manual))||"";
 const exactColor=selectedColor==="grey"?"gray":selectedColor
  ||(!manual&&color&&!/^(no preference|neutral|mixed|multicolor|multicolour|various|any|assorted)$/i.test(color)?color:"");
 const aesthetic=clip(p.aesthetic,55),fit=clip(p.fit,45),audience=clip(p.sizeAudience,45);
 const search=clip(manualQuery||piece?.searchQuery||piece?.description,170);
 const basic=[exactColor,fit&&!/no preference/i.test(fit)?fit:"",aesthetic&&!/no preference/i.test(aesthetic)?aesthetic:"",slot].filter(Boolean).join(" ");
 const q=/^[a-z0-9]/i.test(search)?search:basic||slot;
 const alternate=[exactColor,slot,aesthetic&&!/no preference/i.test(aesthetic)?aesthetic:""].filter(Boolean).join(" ");
 return {
  slot,q:q.slice(0,170),alternate:alternate.slice(0,170),size:clip(size,36),color:exactColor,
  max:Math.max(1,Math.min(10000,Number(max)||200)),
  source:piece?"AI / guided look":"Style preferences",
  hints:{fit,aesthetic,audience,occasion:clip(p.occasion,50),
   palette:clip(p.palette,50),coordination:clip(p.coordination,60),
   climate:clip(p.climate,50),notes:clip(p.notes,260)},country:"US"
 };
}
/*
 * Curation > availability/variant > savings. Discounts, voucher feeds and
 * affiliate commission never affect whether a product is a personal match.
 */
const CATEGORY_HINTS={
 hat:/\b(hats?|caps?|beanies?|headwear)\b/i,
 scarf:/\b(scarves|scarf|wraps?)\b/i,
 jacket:/\b(jackets?|coats?|blazers?|outerwear|parkas?|windbreakers?)\b/i,
 shirt:/\b(shirts?|tops?|sweaters?|hoodies?|blouses?|polos?|t-shirts?|tees?|cardigans?|tunics?)\b/i,
 watch:/\b(watches|watch|timepieces?)\b/i,
 belt:/\b(belts?)\b/i,
 pants:/\b(pants|trousers?|jeans|bottoms?|skirts?|shorts?|chinos?|leggings?)\b/i,
 socks:/\b(socks?)\b/i,
 shoes:/\b(shoes?|sneakers?|boots?|loafers?|heels?|flats?|footwear|trainers?)\b/i
};
const BASE_WORDS=new Set([
 "shirt","shirts","top","tops","pants","trousers","trouser","jacket","jackets","coat","coats",
 "shoes","shoe","sneakers","sneaker","boots","boot","jeans","skirt","skirts",
 "hat","hats","scarf","scarves","watch","watches","belt","belts","socks","sock",
 "apparel","clothing","outfit","piece","fashion","black","white","navy","olive","charcoal",
 "grey","gray","brown","tan","beige","camel","cream","blue","red","green","pink","yellow"
]);
const AVOID_MATERIALS=["leather","wool","fur","silk","polyester","cotton","linen","denim","suede"];
function materialExclusions(notes){
 const copy=String(notes||"").toLowerCase();
 const avoid=new Set();
 for(const material of AVOID_MATERIALS){
  const expression=new RegExp("\\b(?:no|avoid|without|exclude|never|allergic to)\\s+(?:real\\s+|genuine\\s+|synthetic\\s+)?"+material+"\\b","i");
  if(expression.test(copy))avoid.add(material);
 }
 if(/\bvegan\b/.test(copy))
  for(const material of ["leather","fur","wool","silk","suede"])avoid.add(material);
 return [...avoid];
}
function explicitConflict(item,criteria){
 const visible=[item.title,item.description,item.material,item.productType,item.variant]
  .filter(Boolean).join(" ").toLowerCase();
 for(const material of materialExclusions(criteria.hints?.notes||"")){
  if(new RegExp("\\b"+material+"\\b","i").test(visible))return true;
 }
 const expected=normalize(criteria.hints?.fit);
 const actual=normalize(item.fit);
 const opposites={
  slim:["oversized","loose","baggy","wideleg"],fitted:["oversized","loose","baggy"],
  tailored:["oversized","baggy"],oversized:["slim","fitted","skinny"],
  loose:["slim","skinny","fitted"],relaxed:["skinny","bodycon"],
  wideleg:["skinny","slim"],tapered:["wideleg","flared"]
 };
 return Boolean(expected&&actual&&(opposites[expected]||[]).some(x=>actual.includes(x)));
}
function evidence(item){
 return [item.title,item.variant,item.description,item.brand,item.material,
  item.fit,item.pattern,item.productType,item.category]
  .filter(Boolean).join(" ").toLowerCase().replace(/grey/g,"gray");
}
function queryTokens(criteria){
 const hardColor=normalize(criteria.color);
 return [...new Set(String(criteria.q||"").toLowerCase().replace(/[^a-z0-9 -]/g," ")
  .split(/\s+/).filter(x=>x.length>=3&&!STOP.has(x)&&!BASE_WORDS.has(x)
  &&normalize(x)!==hardColor))].slice(0,14);
}
function actualSaleSaving(item){
 // Only fresh merchant-published item pricing is eligible; never coupon codes.
 if(item.discountEvidence!=="retailer_published_sale")return 0;
 const price=Number(item.price),regular=Number(item.originalPrice);
 const checked=Date.parse(String(item.checkedAt||""));
 if(!Number.isFinite(price)||!Number.isFinite(regular)||price<=0
  ||regular<=price||!Number.isFinite(checked)||Date.now()-checked>86400000
  ||checked>Date.now()+60000)return 0;
 return Math.min(.95,(regular-price)/regular);
}
function rank(items,c){
 if(!c||!Array.isArray(items)||!Object.hasOwn(CATEGORY_HINTS,c.slot))return [];
 const tokens=queryTokens(c),candidates=[];
 for(let i=0;i<items.length;i++){
  const item=items[i];
  if(!item||item.available!==true||item.currency!=="USD"
    ||!Number.isFinite(Number(item.price))||Number(item.price)>c.max||Number(item.price)<=0
    ||!item.productId||!item.variantId||!/^https:\/\//i.test(String(item.url||"")))continue;
  if(c.size&&normalize(item.size)!==normalize(c.size))continue;
  if(c.color&&(!item.color||normalize(item.color)!==normalize(c.color)))continue;
  if(item.slot&&item.slot!==c.slot)continue;
  const visible=evidence(item);
  if(!CATEGORY_HINTS[c.slot].test(visible))continue;
  if(explicitConflict(item,c))continue;
  let matched=0,score=0;
  for(const token of tokens){
   if(visible.includes(token)){matched++;score+=token.length>5?5:3;}
  }
  // No relevant style evidence means no recommendation, regardless of sale.
  if(tokens.length&&!matched)continue;
  const fit=normalize(c.hints?.fit);
  if(fit&&normalize(item.fit)===fit)score+=5;
  if(fit&&normalize(item.title).includes(fit))score+=3;
  const aesthetic=String(c.hints?.aesthetic||"").toLowerCase();
  if(aesthetic&&!/no preference/i.test(aesthetic)&&visible.includes(aesthetic))score+=3;
  if(c.color)score+=10;
  if(c.size)score+=8;
  // Relevance determines primary sort. Verified sale is tie-breaker only.
  candidates.push({item,score,saving:actualSaleSaving(item),index:i});
 }
 candidates.sort((a,b)=>b.score-a.score||b.saving-a.saving||a.index-b.index);
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