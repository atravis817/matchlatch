import {allowRequest} from '../lib/request-limits.mjs';
import {json,session,staffAccess,retrieveCatalog,clean,SLOTS} from '../lib/catalog-server.mjs';
import {intentFromText,rankCandidates,catalogEmptyMessage} from '../lib/styling-engine.mjs';
import {internalShopifySearch} from '../lib/shopify-internal-catalog.mjs';
import {colorEvidence} from '../lib/fashion-taxonomy.mjs';
function exactFilters(params){
 const filters={};
 for(const name of ['color','sizeSystem']){
  const values=params.getAll(name),value=values[0]||'';
  if(values.length>1||value.length>40||/[\u0000-\u001f\u007f]/.test(value)||value&&!value.trim())return null;
  filters[name]=value.trim();
 }
 if(filters.color&&(!/^[a-z]+$/i.test(filters.color)||!colorEvidence(filters.color).exactSolid))return null;
 // Sizing-system names are exact source labels, not inferred conversions.
 if(filters.sizeSystem&&!/^[a-z][a-z0-9 .-]{0,39}$/i.test(filters.sizeSystem))return null;
 return filters;
}
export async function GET(request){
 if(!allowRequest(request,'catalog',60))return json({error:'Too many catalog requests. Retry shortly.'},429);
 try{
  const u=new URL(request.url);const account=await session(request);
  if(process.env.VERCEL_ENV==='preview'&&process.env.MATCHLATCH_SHOPIFY_FIRST_PHASE==='true'){
   if(u.searchParams.get('mode')==='capabilities'){
    let available=false;try{available=(await internalShopifySearch({slot:'all',purpose:'recommendation'})).items.length>0;}catch{}
    const userInputAIConfigured=Boolean(process.env.MATCHLATCH_PREVIEW_OPENAI_API_KEY);
    return json({userInputAIConfigured,userInputAIConnectionVerified:false,userInputAIScope:'user_input_only',photo:false,fit:false,delivery:false,staff:false,aiReady:false,aiConfigured:false,aiConnectionVerified:false,catalogAvailable:available,catalogStatus:available?'available':'unconfigured_or_empty',studioDemoAvailable:true,studioLiveDiscovery:false,source:'shopify_internal',aiProcessing:false});
   }
   if(u.searchParams.get('private')==='1')return json({error:'Private Shopify products are available only in owner review.'},403);
   const filters=exactFilters(u.searchParams);if(!filters)return json({error:'Choose one supported solid color and a valid exact sizing-system label.'},400);
   const result=await internalShopifySearch({query:u.searchParams.get('q')||'',slot:u.searchParams.get('slot')||'all',max:Number(u.searchParams.get('max')||10000),size:u.searchParams.get('size')||'',...filters,brand:u.searchParams.get('brand')||'',sort:u.searchParams.get('sort')||'',needBy:u.searchParams.get('needBy')||'',offset:Number(u.searchParams.get('offset')||0)});
   return json({...result,hasMore:result.nextOffset!==null});
  }
  const filters=exactFilters(u.searchParams);
  if(!filters||filters.color||filters.sizeSystem)return json({error:'Explicit color and sizing-system filters are unsupported by this feed catalog route.'},400);
  if(u.searchParams.get('mode')==='capabilities'){
   const aiConfigured=process.env.VERCEL_ENV==='preview'&&Boolean(process.env.MATCHLATCH_PREVIEW_OPENAI_API_KEY);
   const publicProducts=await retrieveCatalog();
   return json({staff:await staffAccess(account),aiReady:aiConfigured,aiConfigured,aiConnectionVerified:false,catalogAvailable:publicProducts.length>0,catalogStatus:publicProducts.length?'available':'empty',studioDemoAvailable:process.env.VERCEL_ENV==='preview',studioLiveDiscovery:false});
  }
  if(u.searchParams.get('needBy'))return json({items:[],message:'Feed catalog delivery dates are not verified. Clear the deadline or use participating retailer search.',deliveryFilter:{withheld:null}});
  const max=Number(u.searchParams.get('max')||10000),slot=clean(u.searchParams.get('slot'),20),size=clean(u.searchParams.get('size'),40),q=clean(u.searchParams.get('q'),500),privateInventory=u.searchParams.get('private')==='1';
  if(!Number.isFinite(max)||max<1||max>10000||(slot&&!SLOTS.includes(slot)))return json({error:'Choose valid filters.'},400);
  const intent=q?intentFromText(q,{budget:max,size}):{query:'',budget:max,slots:slot?[slot]:[],colors:[],brands:[],size,outfit:false};
  if(slot){if(intent.slots.length&&!intent.slots.includes(slot))return json({items:[],message:'The category conflicts with your request.',private:privateInventory});intent.slots=[slot];}
  const brand=clean(u.searchParams.get('brand')||(intent.hardBrands&&intent.brands.length===1?intent.brands[0]:''),60),offset=Number(u.searchParams.get('offset')||0);
  if(!Number.isInteger(offset)||offset<0||offset>50000)return json({error:'Invalid page.'},400);
  const source=await retrieveCatalog({max:intent.budget,slot:intent.slots.length===1?intent.slots[0]:'',size,brand,colors:intent.hardColors?intent.colors:[],productType:!intent.outfit&&/\bsneaker\b/.test(intent.query)?'sneaker':'',offset,descending:u.searchParams.get('sort')==='price-desc',privateInventory,account});
  let items=rankCandidates(source,intent);if(brand)items=items.filter(p=>p.brand.toLowerCase()===brand.toLowerCase());
  const sort=u.searchParams.get('sort');if(sort==='price-asc')items.sort((a,b)=>a.price-b.price);else if(sort==='price-desc')items.sort((a,b)=>b.price-a.price);
  return json({items,source:'qualified_awin_catalog',retailerSearchIncluded:false,noMatchReason:items.length?null:'no_eligible_catalog_matches',private:privateInventory,shown:items.length,limit:60,nextOffset:offset+60,hasMore:source.length===60,message:items.length?'Feed availability; confirm current fit, price and stock at the retailer.':catalogEmptyMessage(intent,{privateInventory})});
 }catch(e){return json({error:e.status===403?'Staff access is required for private inventory.':'Catalog search is temporarily unavailable.'},e.status||503);}
}
