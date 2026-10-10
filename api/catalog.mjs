import {json,session,staffAccess,retrieveCatalog,clean,SLOTS} from '../lib/catalog-server.mjs';
import {intentFromText,rankCandidates} from '../lib/styling-engine.mjs';
export async function GET(request){
 try{
  const u=new URL(request.url);const account=await session(request);
  if(u.searchParams.get('mode')==='capabilities')return json({staff:await staffAccess(account),aiReady:process.env.VERCEL_ENV==='preview'&&Boolean(process.env.MATCHLATCH_PREVIEW_OPENAI_API_KEY)});
  const max=Number(u.searchParams.get('max')||10000),slot=clean(u.searchParams.get('slot'),20),size=clean(u.searchParams.get('size'),40),q=clean(u.searchParams.get('q'),500),privateInventory=u.searchParams.get('private')==='1';
  if(!Number.isFinite(max)||max<1||max>10000||(slot&&!SLOTS.includes(slot)))return json({error:'Choose valid filters.'},400);
  const intent=q?intentFromText(q,{budget:max,size}):{query:'',budget:max,slots:slot?[slot]:[],colors:[],brands:[],size,outfit:false};
  if(slot){if(intent.slots.length&&!intent.slots.includes(slot))return json({items:[],message:'The category conflicts with your request.',private:privateInventory});intent.slots=[slot];}
  const brand=clean(u.searchParams.get('brand')||(intent.hardBrands&&intent.brands.length===1?intent.brands[0]:''),60),offset=Number(u.searchParams.get('offset')||0);
  if(!Number.isInteger(offset)||offset<0||offset>50000)return json({error:'Invalid page.'},400);
  const source=await retrieveCatalog({max:intent.budget,slot:intent.slots.length===1?intent.slots[0]:'',size,brand,offset,descending:u.searchParams.get('sort')==='price-desc',privateInventory,account});
  let items=rankCandidates(source,intent);if(brand)items=items.filter(p=>p.brand.toLowerCase()===brand.toLowerCase());
  const sort=u.searchParams.get('sort');if(sort==='price-asc')items.sort((a,b)=>a.price-b.price);else if(sort==='price-desc')items.sort((a,b)=>b.price-a.price);
  return json({items,private:privateInventory,shown:items.length,limit:60,nextOffset:offset+60,hasMore:source.length===60,message:items.length?'Feed availability; confirm current fit, price and stock at the retailer.':'No verified public products meet these filters. Private development inventory is excluded.'});
 }catch(e){return json({error:e.status===403?'Staff access is required for private inventory.':'Catalog search is temporarily unavailable.'},e.status||503);}
}
