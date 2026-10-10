/* MATCHLATCH Awin feed importer — server-side only, Node 20+.
 * Dry-run by default. Explicit --write plus server-only SUPABASE_SERVICE_ROLE_KEY
 * required for database writes. No products are made public automatically.
 */
import {gunzipSync} from "node:zlib";
const approved=new Set([117849,126793]);
const key=process.env.AWIN_PRODUCT_FEED_API_KEY;
const write=process.argv.includes("--write");
const maxItems=Math.min(1000,Math.max(1,Number(process.env.AWIN_IMPORT_LIMIT)||200));
function csv(text){
  const out=[];let r=[],v="",q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){if(c==='"'&&text[i+1]==='"'){v+='"';i++;}else if(c==='"')q=false;else v+=c;}
    else if(c==='"')q=true;else if(c===','){r.push(v);v="";}
    else if(c==='\n'){r.push(v.replace(/\r$/,""));out.push(r);r=[];v="";}else v+=c;
  }if(q)throw Error("Unterminated CSV");if(v||r.length){r.push(v);out.push(r);}return out;
}
const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
function obj(rows){const keys=(rows.shift()||[]).map(norm);return rows.map(row=>Object.fromEntries(keys.map((k,i)=>[k,row[i]||""])));}
const field=(p,...keys)=>keys.map(k=>p[norm(k)]).find(s=>s!==undefined&&s!=="")||"";
function https(input,hosts){try{const u=new URL(input);return u.protocol==="https:"&&(!hosts||hosts.includes(u.hostname))?u.href:null;}catch{return null;}}
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
function mapProduct(p,id,retailer){
 const productId=field(p,"merchant_product_id","aw_product_id","product_id");
 const variantId=field(p,"aw_product_id","merchant_product_id","product_id");
 const title=field(p,"product_name","title").slice(0,250);
 const price=Number(field(p,"search_price","store_price","price"));
 const category=field(p,"merchant_category","category_name","merchant_product_category_path","product_type");
 const s=slot(category+" "+title);
 const image=https(field(p,"aw_image_url","merchant_image_url","large_image"));
 const url=https(field(p,"merchant_deep_link","product_url"));
 const affiliate=https(field(p,"aw_deep_link"));
 const currency=field(p,"currency").toUpperCase();
 const stock=field(p,"in_stock","stock_status").toLowerCase();
 const available=["1","yes","true","in stock","instock","available"].includes(stock);
 if(!productId||!variantId||title.length<3||!Number.isFinite(price)||price<=0||price>100000||!s||!image||!url||!affiliate||currency!=="USD")return null;
 return {
 advertiser_id:id,source_variant_id:variantId.slice(0,200),source_product_id:productId.slice(0,200),
 slot:s,title,description:field(p,"description","product_short_description").slice(0,10000),
 brand:field(p,"brand_name").slice(0,150),material:"",fit:"",size:field(p,"size").slice(0,100),
 color:field(p,"colour","color").slice(0,100),
 image_url:image,product_url:url,affiliate_url:affiliate,merchant_name:retailer,
 merchant_host:new URL(url).hostname.replace(/^www\./,""),
 price_usd:price,original_price_usd:null,currency:"USD",size_system:"",
 available,stock_status:stock||"unknown",shipping_us_eligible:false,
 feed_imported_at:new Date().toISOString(),valid_until:new Date(Date.now()+36*3600*1000).toISOString(),
 is_public:false
 };
}
async function fetchCSV(url){
 const resp=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(45000)});
 if(!resp.ok)throw Error("Feed HTTP "+resp.status);
 const ab=Buffer.from(await resp.arrayBuffer());
 if(ab.length>25_000_000)throw Error("Compressed feed too large");
 const payload=(ab[0]===31&&ab[1]===139)?gunzipSync(ab,{maxOutputLength:75_000_000}):ab;
 if(payload.length>75_000_000)throw Error("Feed too large");
 return obj(csv(payload.toString("utf8").replace(/^\uFEFF/,"")));
}
async function run(){
 if(!key)throw Error("Missing AWIN_PRODUCT_FEED_API_KEY");
 const list=await fetchCSV("https://productdata.awin.com/datafeed/list/apikey/"+encodeURIComponent(key));
 const feeds=list.filter(x=>approved.has(Number(field(x,"advertiser_id","merchant_id","advertiserid","merchantid"))));
 const all=[];const seen=new Set();const report=[];
 const listHeaders=Object.keys(list[0]||{});
 console.log(JSON.stringify({stage:"feed-list",rows:list.length,headers:listHeaders,matched_feeds:feeds.length}));
 for(const feed of feeds){
  const id=Number(field(feed,"advertiser_id","merchant_id","advertiserid","merchantid"));
  const src=https(field(feed,"url","download_url","feed_url","datafeed_url"),["datafeed.api.productserve.com","productdata.awin.com","productserve.com"]);
  if(!src){report.push({advertiser_id:id,feed_id:field(feed,"feed_id","id"),error:"missing_supported_feed_url"});continue;}
  const products=await fetchCSV(src);let accepted=0;
  for(const p of products){
   const candidate=mapProduct(p,id,field(feed,"advertiser_name")||"Retailer");
   if(!candidate)continue;
   const identity=id+":"+candidate.source_variant_id;
   if(seen.has(identity))continue;
   seen.add(identity);all.push(candidate);accepted++;
   if(all.length>=maxItems)break;
  }
  report.push({advertiser_id:id,feed_id:field(feed,"feed_id","id"),rows:products.length,eligible:accepted});
  if(all.length>=maxItems)break;
 }
 if(write){
  const base=process.env.MATCHLATCH_SUPABASE_URL || process.env.SUPABASE_URL;
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!https(base)||!secret)throw Error("Write requires MATCHLATCH_SUPABASE_URL (or SUPABASE_URL) and server-only SUPABASE_SERVICE_ROLE_KEY");
  for(let i=0;i<all.length;i+=100){
   const response=await fetch(base.replace(/\/$/,"")+"/rest/v1/matchlatch_awin_products?on_conflict=advertiser_id,source_variant_id",{
    method:"POST",headers:{"apikey":secret,"Authorization":"Bearer "+secret,"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(all.slice(i,i+100)),signal:AbortSignal.timeout(30000)
   });
   if(!response.ok)throw Error("Supabase upsert failed: HTTP "+response.status);
  }
 }
 console.log(JSON.stringify({mode:write?"private-import":"dry-run",feeds:report,eligible_products:all.length,public_products_created:0},null,2));
}
run().catch(e=>{console.error("Importer failed:",e.message);process.exitCode=1;});
