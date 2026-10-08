// MATCHLATCH Private Shop: live Shopify Global Catalog UCP interface.
// No server-side catalog-result caching. A listing is displayed only when a
// purchasable variant is explicitly reported available at a valid USD price.
const CATALOG="https://catalog.shopify.com/api/ucp/mcp";
const PROFILE="https://matchlatch.vercel.app/ucp-agent.json";
const SLOTS=new Set(["hat","scarf","jacket","shirt","watch","belt","pants","socks","shoes"]);
const gid=/^gid:\/\/shopify\/(?:p\/[A-Za-z0-9_-]+|ProductVariant\/[A-Za-z0-9_-]+)$/;
const clip=(s,n)=>String(s??"").replace(/[\u0000-\u001f]/g," ").trim().slice(0,n);
const safeUrl=(s)=>{
  try{const u=new URL(s);return u.protocol==="https:"?u.href:"";}catch{return "";}
};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
});
const plainAmount=m=>m?.currency==="USD"&&Number.isSafeInteger(m?.amount)&&m.amount>=0?m.amount:null;
function collect(data,selectedSize=""){
  const matches=[];
  const products=[...(Array.isArray(data?.products)?data.products:[]),...(data?.product?[data.product]:[])];
  for(const p of products){
    if(!p||!gid.test(p.id||""))continue;
    const media=(p.media||[]).find(x=>x?.type==="image"&&safeUrl(x.url));
    for(const v of (p.variants||[])){
      if(!gid.test(v?.id||"")||v.availability?.available!==true)continue;
      const cents=plainAmount(v.price);
      if(cents===null)continue;
      const opts=Array.isArray(v.options)?v.options:[];
      const sizeOpt=opts.find(o=>/^(size|shoe size|waist)$/i.test(o.name||""));
      const size=clip(sizeOpt?.label||"",36);
      if(selectedSize && size.toLowerCase()!==selectedSize.toLowerCase())continue;
      const merchant=clip(v.seller?.name||p.seller?.name,90);
      const merchantLink=safeUrl(p.url)||safeUrl(v.checkout_url);
      // Only expose merchant-owned links; never invent checkout destinations.
      if(!merchantLink)continue;
      matches.push({
        productId:p.id,variantId:v.id,
        title:clip(p.title,155),variant:clip(v.title,100),
        merchant:merchant||new URL(merchantLink).hostname,
        image:media?safeUrl(media.url):"",
        imageAlt:clip(media?.alt_text||p.title,130),
        url:merchantLink,checkoutUrl:safeUrl(v.checkout_url),
        price:cents/100,currency:"USD",size,available:true,
        checkedAt:new Date().toISOString()
      });
    }
  }
  return matches;
}
async function catalog(tool,catalogArgs){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),11000);
  try{
    const response=await fetch(CATALOG,{
      method:"POST",signal:controller.signal,
      headers:{"content-type":"application/json","accept":"application/json"},
      body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/call",params:{
        name:tool,arguments:{meta:{"ucp-agent":{profile:PROFILE}},catalog:catalogArgs}
      }})
    });
    if(!response.ok)throw new Error("CATALOG_HTTP_"+response.status);
    const result=await response.json();
    if(result.error||result.result?.isError)throw new Error("CATALOG_REJECTED");
    let structured=result.result?.structuredContent;
    if(!structured&&Array.isArray(result.result?.content)){
      const txt=result.result.content.find(x=>x.type==="text")?.text;
      if(txt){try{structured=JSON.parse(txt);}catch{}}
    }
    if(!structured||(!Array.isArray(structured.products)&&!structured.product))throw new Error("CATALOG_BAD_RESPONSE");
    return structured;
  }finally{clearTimeout(timeout);}
}
export async function GET(request){
  try{
    const u=new URL(request.url);
    const mode=u.searchParams.get("mode")||"search";
    const max=Number(u.searchParams.get("max"));
    const size=clip(u.searchParams.get("size"),36);
    if(mode==="search"){
      const slot=clip(u.searchParams.get("slot"),20).toLowerCase();
      const q=clip(u.searchParams.get("q"),170);
      if(!SLOTS.has(slot)||q.length<2||!/^[A-Za-z0-9]/.test(q)||!Number.isFinite(max)||max<1||max>10000)
        return reply({error:"Invalid search criteria."},400);
      const filters={available:true,ships_to:{country:"US"},condition:["new"],price:{max:Math.floor(max*100)}};
      if(size)filters.attributes=[{name:"Size",values:[size]}];
      const data=await catalog("search_catalog",{
        query:q+" "+slot,
        filters,context:{address_country:"US",currency:"USD"},
        pagination:{limit:16}
      });
      const byProduct=new Map();
      for(const p of collect(data,size)){
        if(p.price<=max&&!byProduct.has(p.productId))byProduct.set(p.productId,p);
      }
      const items=[...byProduct.values()].slice(0,9);
      return reply({items,source:"Shopify Global Catalog",checkedAt:new Date().toISOString(),
        note:"Retailer availability is checked when fetched, not guaranteed at checkout. Prices exclude tax and possible shipping."});
    }
    if(mode==="verify"){
      const id=clip(u.searchParams.get("id"),120);
      const variantId=clip(u.searchParams.get("variant"),120);
      if(!gid.test(id)||!gid.test(variantId)||!Number.isFinite(max)||max<1||max>10000)
        return reply({error:"Invalid item verification request."},400);
      // get_product accepts id, selected, preferences and context; filters belong
      // to search_catalog only. Validate stock, currency and price after lookup.
      const data=await catalog("get_product",{
        id,context:{address_country:"US"}
      });
      const item=collect(data,size).find(x=>x.variantId===variantId&&x.price<=max);
      if(!item)return reply({error:"Item is no longer confirmed available in this size and budget. Choose another."},409);
      return reply({item,checkedAt:new Date().toISOString()});
    }
    return reply({error:"Unknown mode."},400);
  }catch(e){
    console.error("MATCHLATCH catalog lookup:",e?.message||"failed");
    return reply({error:"Live retailer catalog is temporarily unavailable. Try again later."},503);
  }
}
