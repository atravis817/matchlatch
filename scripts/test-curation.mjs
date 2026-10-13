// Run: node scripts/test-curation.mjs (Node 20+).
// No network calls, secrets or external packages. Regression gate for POC-04.
import assert from "node:assert/strict";
import {normalizeAwinProduct,usd} from "../lib/awin-feed-normalize.mjs";
globalThis.window={};
await import("../retailer-match.js");
const match=globalThis.window.MatchlatchRetailerMatch;
assert.ok(match,"Matcher should be exposed on the app window");
const now=new Date().toISOString();
const profile={
 fit:"Tailored",aesthetic:"Minimalist",occasion:"Work",notes:"No leather. No polyester.",
 palette:"Neutrals",budget:100,topSize:"M"
};
const c=match.criteria({
 slot:"shirt",profile,size:"M",max:100,
 pieces:[{slot:"shirt",color:"Olive",type:"Shirt",searchQuery:"olive cotton oxford shirt"}]
});
assert.equal(c.color,"Olive");
assert.equal(c.hints.notes,profile.notes);
const make=(title,options={})=>({
 productId:"gid://shopify/p/test",variantId:"gid://shopify/ProductVariant/test",
 title,category:"Apparel > Shirts",price:75,currency:"USD",
 size:"M",color:"Olive",available:true,url:"https://store.example/product",
 checkedAt:now,...options
});
const best=make("Olive cotton oxford shirt",{fit:"Tailored",material:"Cotton",price:75});
const saleOffStyle=make("Olive graphic tee",{price:9,originalPrice:125,
 discountEvidence:"retailer_published_sale"});
const badMaterial=make("Olive leather oxford shirt",{material:"Leather",price:7,
 originalPrice:200,discountEvidence:"retailer_published_sale"});
const wrongSize=make("Olive cotton oxford shirt",{size:"L",price:1});
const wrongColor=make("Black cotton oxford shirt",{color:"Black",price:1});
const unrelated=make("Olive Oxford leather loafers",{category:"Footwear > Shoes",price:2});
const curatedSale=make("Olive cotton oxford shirt",{fit:"Tailored",material:"Cotton",
 price:65,originalPrice:95,discountEvidence:"retailer_published_sale"});
const pool=[saleOffStyle,badMaterial,wrongSize,wrongColor,unrelated,best,curatedSale];
const results=match.rank(pool,c);
assert.equal(results.length,2,"Off-style, excluded-material, wrong size, color or category are rejected");
assert.equal(results[0].price,65,"Confirmed sale breaks tie after matching style relevance");
assert.equal(results[1].price,75);
const muchBetter=make("Olive tailored cotton oxford shirt",{fit:"Tailored",price:95,material:"Cotton"});
const discounted=make("Olive cotton oxford shirt",{price:5,material:"Cotton",
 originalPrice:150,discountEvidence:"retailer_published_sale"});
assert.equal(match.rank([discounted,muchBetter],c)[0],muchBetter,
 "Stronger personal match always outranks even a steep genuine markdown");
assert.equal(match.rank([{...best,commissionPct:100},best],c)[0].commissionPct,100,
 "Commission information does not alter ordering");
const manual=match.criteria({slot:"shirt",profile,size:"M",max:85,manualQuery:"white linen oxford shirt"});
assert.equal(manual.color,"white","Manual explicit colors take priority");
assert.equal(manual.size,"M");
assert.equal(match.rank([make("Black linen oxford shirt",{color:"Black"})],manual).length,0);
const importedAt=new Date(Date.now()-3600000).toISOString();
const feed={
 meta:{advertiser_id:123,advertiser_name:"Joined Example Store"},
 product_basic:{
  id:"product-1",title:"Olive cotton oxford shirt",description:"Tailored cotton workwear",
  link:"https://shop.example/olive-oxford",price:"100.00 USD",sale_price:"65.00 USD",
  availability:"in_stock",size:"M",color:"Olive",material:"Cotton",
  product_type:"Apparel > Shirts",
  shipping:[{country:"US",price:"5.00 USD"}]
 }
};
const options={joinedAdvertiserIds:["123"],importedAt};
const p=normalizeAwinProduct(feed,options);
assert.equal(p.price,65);
assert.equal(p.originalPrice,100);
assert.equal(p.discountEvidence,"retailer_published_sale");
assert.equal(p.stockVerifiedLive,false,"Awin cached stock is never labeled live verified");
assert.equal(p.shippingCost,5);
assert.ok(p.productId.startsWith("awin:"));
assert.equal(p.checkoutUrl,"","Awin snapshots cannot invent native Shopify checkout");
assert.equal(normalizeAwinProduct(feed,{...options,joinedAdvertiserIds:[]}),null,
 "Advertisers without verified membership are excluded");
assert.equal(normalizeAwinProduct({...feed,product_basic:{...feed.product_basic,
 link:"javascript:alert(1)"}},options),null);
const stale=normalizeAwinProduct(feed,{...options,importedAt:new Date(Date.now()-172800000).toISOString()});
assert.equal(stale.available,false);
assert.equal(stale.discountEvidence,"none");
assert.equal(usd("12.99 GBP"),null);
console.log("MATCHLATCH POC-04 curation > savings and Awin feed normalization tests passed.");
