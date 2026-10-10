/* MATCHLATCH Awin importer: trusted Node.js 20+, dry-run by default.
 * Explicit --write only. Every upsert remains private and US shipping unverified.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CANDIDATES,merchantLinkAllowed} from '../lib/awin-retailers.mjs';
import {APPROVED_ADVERTISERS,PUBLISHER_ID,FEED_HOSTS,field,https,feedKey,discoverFeeds,fetchCSV,feedMetadata,safeError} from './awin-feed-utils.mjs';
function slot(category){
 const s=category.toLowerCase();
 if(/sneaker|shoe|boot|footwear|sandal|heel/.test(s))return "shoes";
 if(/trouser|pant|jean|legging|short|skirt/.test(s))return "pants";
 if(/coat|jacket|outerwear|blazer/.test(s))return "jacket";
 if(/shirt|tee|top|blouse|sweater|hoodie|dress/.test(s))return "shirt";
 if(/watch/.test(s))return "watch";
 if(/belt/.test(s))return "belt";
 if(/sock/.test(s))return "socks";
 if(/scarf/.test(s))return "scarf";
 if(/hat|cap|beanie/.test(s))return "hat";
 return null;
}

export function affiliateAllowed(url,advertiserId) {
 try {
  const u=new URL(url);
  if(!https(url,['www.awin1.com','awin1.com'])||!['/cread.php','/pclick.php','/awclick.php'].includes(u.pathname))return false;
  const publisher=u.searchParams.get('awinaffid')||u.searchParams.get('a')||u.searchParams.get('id');
  const merchant=u.searchParams.get('awinmid')||u.searchParams.get('m')||u.searchParams.get('mid');
  return publisher===PUBLISHER_ID&&merchant===String(advertiserId);
 }catch{return false;}
}
export function validateProduct(p,id,retailer) {
 const productId=field(p,'merchant_product_id','aw_product_id','product_id');
 const variantId=field(p,'aw_product_id','merchant_product_id','product_id');
 const title=field(p,'product_name','title').slice(0,250);
 const price=Number(field(p,'search_price','store_price','price'));
 const category=field(p,'merchant_category','category_name','merchant_product_category_path','product_type');
 const s=slot(category+' '+title);
 const image=https(field(p,'aw_image_url','merchant_image_url','large_image'));
 const url=https(field(p,'merchant_deep_link','product_url'));
 const affiliate=https(field(p,'aw_deep_link'));
 const currency=field(p,'currency').toUpperCase();
 const stock=field(p,'in_stock','stock_status').toLowerCase();
 const available=['1','yes','true','in stock','in_stock','instock','available'].includes(stock);
 const sourceAdvertiser=field(p,'merchant_id','advertiser_id');
 const candidate=CANDIDATES.find(c=>c.id===id);
 const errors=[];
 if(!APPROVED_ADVERTISERS.has(id))errors.push('unapproved_advertiser');
 if(sourceAdvertiser&&Number(sourceAdvertiser)!==id)errors.push('advertiser_mismatch');
 if(!productId||productId.length>200||!variantId||variantId.length>200)errors.push('invalid_identifier');
 if(title.length<3)errors.push('invalid_title');
 if(!Number.isFinite(price)||price<=0||price>100000||Math.abs(price*100-Math.round(price*100))>0.000001)errors.push('invalid_price');
 if(!s)errors.push('unsupported_category');
 if(!image)errors.push('invalid_image_url');
 if(!url||!merchantLinkAllowed(candidate,url))errors.push('invalid_merchant_url');
 if(!affiliate||!affiliateAllowed(affiliate,id))errors.push('invalid_affiliate_attribution');
 if(currency!=='USD')errors.push('non_USD_currency');
 if(errors.length)return {product:null,errors};
 return {errors:[],product:{
  advertiser_id:id,source_variant_id:variantId,source_product_id:productId,slot:s,title,
  description:field(p,'description','product_short_description').slice(0,10000),
  brand:field(p,'brand_name').slice(0,150),material:field(p,'material','Fashion:material').slice(0,150),fit:field(p,'fit','Fashion:size_type').slice(0,100),
  size:field(p,'size','Fashion:size').slice(0,100),color:field(p,'colour','color','Fashion:color').slice(0,100),
  image_url:image,product_url:url,affiliate_url:affiliate,merchant_name:retailer,
  merchant_host:new URL(url).hostname.replace(/^www\./,''),price_usd:price,original_price_usd:null,currency:'USD',size_system:field(p,'size_system','Fashion:size_system').slice(0,100),
  available,stock_status:stock||'unknown',shipping_us_eligible:false,
  feed_imported_at:new Date().toISOString(),valid_until:new Date(Date.now()+36*3600*1000).toISOString(),is_public:false
 }};
}
export const mapProduct=(p,id,retailer)=>validateProduct(p,id,retailer).product;
export async function run({write=process.argv.includes('--write')}={}) {
 const key=feedKey();const maxItems=Math.min(1000,Math.max(1,Math.floor(Number(process.env.AWIN_IMPORT_LIMIT)||200)));
 const list=await discoverFeeds(key);
 const approved=list.rows.filter(row=>APPROVED_ADVERTISERS.has(Number(field(row,'advertiser_id','merchant_id'))));
 const feeds=approved.filter(row=>!field(row,'membership_status')||field(row,'membership_status').toLowerCase()==='joined');
 console.log(JSON.stringify({stage:'feed-list',http_status:list.http_status,rows:list.rows.length,headers:list.headers,matched_feeds:approved.map(feedMetadata),eligible_feeds:feeds.length,membership_conflicts:approved.length-feeds.length}));
 if(!feeds.length)throw Error('No eligible feeds for approved advertisers; no database writes performed');
 const all=[],seen=new Set(),report=[];
 for(const feed of feeds) {
  const metadata=feedMetadata(feed);const id=metadata.advertiser_id;
  const src=https(field(feed,'url','download_url','feed_url','datafeed_url'),FEED_HOSTS);
  if(!src){report.push({...metadata,error:'missing_supported_feed_url'});continue;}
  try {
   const products=await fetchCSV(src);let accepted=0,selected=0,duplicates=0;const rejected={};
   for(const row of products.rows) {
    const {product,errors}=validateProduct(row,id,field(feed,'advertiser_name','merchant_name')||'Retailer');
    if(!product){for(const error of errors)rejected[error]=(rejected[error]||0)+1;continue;}
    const identity=id+':'+product.source_variant_id;
    if(seen.has(identity)){duplicates++;continue;}seen.add(identity);accepted++;
    if(all.length<maxItems){all.push(product);selected++;}
   }
   report.push({...metadata,http_status:products.http_status,headers:products.headers,compression:products.compression,download_bytes:products.download_bytes,decoded_bytes:products.decoded_bytes,rows:products.rows.length,eligible:accepted,selected,duplicates,rejected});
  }catch(error){report.push({...metadata,error:safeError(error)});}
 }
 const summary={mode:write?'private-import':'dry-run',feeds:report,eligible_products:all.length,limit:maxItems,public_products_created:0,sample_products:all.slice(0,5).map(p=>({advertiser_id:p.advertiser_id,title:p.title,price_usd:p.price_usd,size:p.size,stock_status:p.stock_status,available:p.available,image_host:new URL(p.image_url).hostname,affiliate_verified:affiliateAllowed(p.affiliate_url,p.advertiser_id)}))};
 console.log(JSON.stringify(summary,null,2));
 if(report.some(feed=>feed.error))throw Error('One or more eligible feed downloads failed; no database writes performed');
 if(!all.length)throw Error('No valid products; no database writes performed');
 if(write) {
  const base=process.env.MATCHLATCH_SUPABASE_URL||process.env.SUPABASE_URL;const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!https(base)||!secret)throw Error('Write requires Supabase URL and server-only SUPABASE_SERVICE_ROLE_KEY');
  for(let i=0;i<all.length;i+=100) {
   const response=await fetch(base.replace(/\/$/,'')+'/rest/v1/matchlatch_awin_products?on_conflict=advertiser_id,source_variant_id',{
    method:'POST',headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(all.slice(i,i+100)),signal:AbortSignal.timeout(30000)
   });
   if(!response.ok)throw Error('Supabase upsert failed: HTTP '+response.status);
  }
  console.log(JSON.stringify({stage:'private-upsert',upserted_products:all.length,public_products_created:0}));
 }
 return summary;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))run().catch(error=>{console.error('Importer failed:',safeError(error));process.exitCode=1;});
