import {affiliateAllowed} from '../scripts/awin-import.mjs';
export const SLOTS=['hat','scarf','jacket','shirt','watch','belt','pants','socks','shoes'];
export const clean=(value,max=200)=>String(value??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max);
export const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export function config(){
 const base=process.env.MATCHLATCH_SUPABASE_URL,key=process.env.MATCHLATCH_SUPABASE_PUBLISHABLE_KEY;
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base||'')||!key?.startsWith('sb_publishable_'))throw Error('Catalog unavailable');
 return {base,key};
}
export async function database(path,{token='',method='GET',body}={}){
 const {base,key}=config();const r=await fetch(base+'/rest/v1/'+path,{method,headers:{apikey:key,...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('Catalog request failed');return r.json();
}
export async function session(request){
 const token=(request.headers.get('authorization')||'').match(/^Bearer ([A-Za-z0-9._-]{50,5000})$/)?.[1];
 if(!token)return null;
 const {base,key}=config();const r=await fetch(base+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(5000)});
 if(!r.ok)return null;
 const user=await r.json();if(!user.id||user.is_anonymous)return null;
 return {user,token};
}
export async function staffAccess(account){
 if(process.env.VERCEL_ENV!=='preview'||!account)return false;
 const rows=await database('matchlatch_catalog_staff?select=role&user_id=eq.'+encodeURIComponent(account.user.id),{token:account.token});
 return rows.some(row=>row.role==='catalog');
}
export function mapCatalog(row,{privateInventory=false}={}){
 if(!row||row.currency!=='USD'||!row.available||!SLOTS.includes(row.slot))return null;
 if(!Number.isFinite(Date.parse(row.valid_until))||Date.parse(row.valid_until)<=Date.now()||!Number.isFinite(Date.parse(row.feed_imported_at)))return null;
 if(privateInventory?row.is_public!==false:row.is_public!==true||row.shipping_us_eligible!==true||Date.parse(row.valid_until)<=Date.now()||Date.parse(row.feed_imported_at)<Date.now()-86400000)return null;
 if(privateInventory&&(!Number.isFinite(Date.parse(row.source_updated_at))||Date.parse(row.source_updated_at)<Date.now()-48*3600000))return null;
 const safe=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
 const image=safe(row.image_url),destination=safe(row.product_url),affiliate=safe(row.affiliate_url),price=Number(row.price_usd);
 if(!image||!destination||!affiliate||!affiliateAllowed(affiliate,row.advertiser_id)||new URL(destination).hostname.replace(/^www\./,'')!==row.merchant_host||!Number.isFinite(price)||price<=0)return null;
 return {id:'awin:'+row.advertiser_id+':'+row.source_variant_id,source:'awin',productId:'awin:'+row.advertiser_id+':'+row.source_product_id,variantId:'awin:'+row.advertiser_id+':'+row.source_variant_id,
  title:clean(row.title,250),description:clean(row.description,600),slot:row.slot,brand:clean(row.brand,150),color:clean(row.color,100),size:clean(row.size,100),fit:clean(row.fit,100),material:clean(row.material,100),
  price,currency:'USD',image,url:affiliate,merchantProductUrl:destination,merchant:clean(row.merchant_name,120),available:true,stockStatus:clean(row.stock_status,40),checkedAt:row.feed_imported_at,
  private:privateInventory,affiliateTracked:true,requiresMerchantVerification:true,stockVerifiedLive:false,shippingUsEligible:row.shipping_us_eligible===true};
}
export async function retrieveCatalog({max=10000,slot='',size='',brand='',offset=0,descending=false,privateInventory=false,account=null}={}){
 if(privateInventory){
  if(!await staffAccess(account)){const e=Error('Staff access required');e.status=403;throw e;}
  const rows=await database('rpc/matchlatch_staff_catalog_search',{method:'POST',token:account.token,body:{p_max:max,p_slot:slot,p_size:size,p_brand:brand,p_offset:offset,p_desc:descending}});
  return rows.map(row=>mapCatalog(row,{privateInventory:true})).filter(Boolean);
 }
 const params=new URLSearchParams({select:'*',is_public:'eq.true',available:'eq.true',shipping_us_eligible:'eq.true',valid_until:'gt.'+new Date().toISOString(),price_usd:'lte.'+max,limit:'60',offset:String(offset),order:'price_usd.'+(descending?'desc':'asc')+',source_variant_id.asc'});
 if(slot)params.set('slot','eq.'+slot);if(size)params.set('size','eq.'+size);
 if(brand)params.set('brand','eq.'+brand);
 const rows=await database('matchlatch_awin_products?'+params);return rows.map(row=>mapCatalog(row)).filter(Boolean);
}
