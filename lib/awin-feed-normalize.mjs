/*
 * MATCHLATCH Awin product-feed normalization contract — POC-04.
 * NOT connected to live product search, shopping carts or payment.
 *
 * Supports common Awin legacy CSV columns and Enhanced/Google JSONL fields
 * (flat or documented product_basic/meta envelope). Actual merchant feed
 * mapping must be validated against joined advertisers before activation.
 *
 * This module does not crawl or fetch any URL and never uses an Awin token.
 */
const safe=(x,n=250)=>String(x??"").replace(/[\u0000-\u001f]/g," ").trim().slice(0,n);
function https(value){
 try{
  const u=new URL(String(value||""));
  return u.protocol==="https:"?u.href:"";
 }catch{return "";}
}
function usd(value,currency=""){
 if(value==null||value==="")return null;
 const str=String(value).trim();
 const parts=str.match(/^(\d+(?:\.\d{1,2})?)(?:\s+([A-Z]{3}))?$/);
 if(!parts)return null;
 const c=parts[2]||safe(currency,3).toUpperCase();
 if(c!=="USD")return null;
 const n=Number(parts[1]);
 return Number.isFinite(n)&&n>=0&&n<=100000?Math.round(n*100)/100:null;
}
function sellerApproved(advertiserId,joinedIds){
 if(!/^\d+$/.test(advertiserId)||!Array.isArray(joinedIds))return false;
 return joinedIds.map(String).includes(advertiserId);
}
function isCurrentSale(row,now=Date.now()){
 const window=safe(row.sale_price_effective_date,115);
 if(!window)return true;
 const [start,end]=window.split("/");
 if(!start||!end)return false;
 const a=Date.parse(start),b=Date.parse(end);
 return Number.isFinite(a)&&Number.isFinite(b)&&now>=a&&now<=b;
}
function normalizeAwinProduct(row,{joinedAdvertiserIds=[],importedAt="",now=Date.now()}={}){
 if(!row||typeof row!=="object"||row.error)return null;
 const product={...(row.product_basic||{}),...row},meta=row.meta||{};
 const advertiserId=safe(meta.advertiser_id||row.advertiser_id||row.merchant_id,18);
 if(!sellerApproved(advertiserId,joinedAdvertiserIds))return null;
 const productId=safe(product.id||product.aw_product_id||product.merchant_product_id,90);
 if(!productId)return null;
 const image=https(product.image_link||product.merchant_image_url);
 const url=https(product.link||product.merchant_deep_link);
 if(!url)return null;
 const trackedUrl=https(product.aw_deep_link||product.urlTracking);
 const price=usd(product.price||product.search_price,product.currency);
 const sale=usd(product.sale_price,product.currency);
 if(price==null||price<=0)return null;
 const effectiveSale=sale!=null&&sale>0&&sale<price&&isCurrentSale(product,now);
 const currentPrice=effectiveSale?sale:price;
 const updated=Date.parse(importedAt);
 const fresh=Number.isFinite(updated)&&updated<=now+60000&&now-updated<=86400000;
 const status=safe(product.availability||product.stock_status||
   (product.in_stock===true||String(product.in_stock)==="1"?"in_stock":""),36).toLowerCase();
 const inStock=status==="in_stock"||status==="instock"||status==="available";
 const usShipping=Array.isArray(product.shipping)?product.shipping
  .filter(s=>s&&String(s.country||"").toUpperCase()==="US"):[];
 const shippingPrice=usShipping
  .map(s=>usd(s.price))
  .find(n=>n!=null);
 const size=safe(product.size,50);
 const color=safe(product.color||product.colour,50);
 const productType=safe(product.product_type||product.merchant_category,160);
 return {
  source:"awin_feed_snapshot",advertiserId,
  merchant:safe(meta.advertiser_name||product.merchant_name||product.merchant,100),
  // Awin IDs are not Shopify variant identifiers and must never enter
  // the current Shopify-only cart until a dedicated handoff is verified.
  productId:"awin:"+advertiserId+":"+productId,
  variantId:"awin:"+advertiserId+":"+productId+":"+(size||"-")+":"+(color||"-"),
  title:safe(product.title||product.product_name,170),
  description:safe(product.description||product.product_short_description,480),
  productType,category:productType,
  brand:safe(product.brand||product.brand_name,80),material:safe(product.material,90),
  size,color,image,url,affiliateUrl:trackedUrl,
  price:currentPrice,originalPrice:effectiveSale?price:null,
  currency:"USD",discountEvidence:effectiveSale&&fresh?"retailer_published_sale":"none",
  available:inStock&&fresh,
  stockStatus:status||"unknown",stockVerifiedLive:false,
  shippingEligibility:usShipping.length?"US listed":"unknown",
  shippingCost:shippingPrice??null,deliveryEstimate:null,
  checkedAt:fresh?new Date(updated).toISOString():"",
  feedUpdatedAt:Number.isFinite(updated)?new Date(updated).toISOString():null,
  feedStale:!fresh,checkoutUrl:"",
  requiresMerchantVerification:true
 };
}
export {usd,normalizeAwinProduct};
