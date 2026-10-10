import {affiliateAllowed} from './scripts/awin-import.mjs';
import {safeError} from './scripts/awin-feed-utils.mjs';
try {
if(process.env.VERCEL_ENV!=='preview')throw Error('Preview only');
const base=process.env.MATCHLATCH_SUPABASE_URL.replace(/\/$/,'');
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const r=await fetch(base+'/rest/v1/matchlatch_awin_products?advertiser_id=eq.116479&select=advertiser_id,title,price_usd,size,stock_status,available,image_url,affiliate_url,is_public,shipping_us_eligible&limit=25',{headers:{apikey:key,Authorization:'Bearer '+key,Prefer:'count=exact'},signal:AbortSignal.timeout(15000)});
if(!r.ok)throw Error('Readback HTTP '+r.status);
const rows=await r.json();
if(rows.length!==25||rows.some(p=>p.is_public!==false||p.shipping_us_eligible!==false||!affiliateAllowed(p.affiliate_url,p.advertiser_id)))throw Error('Private readback mismatch');
console.log('READBACK '+JSON.stringify({status:r.status,content_range:r.headers.get('content-range'),rows:rows.length,private:rows.every(p=>!p.is_public),affiliate_attribution:rows.every(p=>affiliateAllowed(p.affiliate_url,p.advertiser_id))}));
const pub=process.env.MATCHLATCH_SUPABASE_PUBLISHABLE_KEY;
if(!pub)throw Error('Missing public credential for visibility check');
const anon=await fetch(base+'/rest/v1/matchlatch_awin_products?advertiser_id=eq.116479&select=advertiser_id',{headers:{apikey:pub,Prefer:'count=exact'},signal:AbortSignal.timeout(15000)});
if(!anon.ok)throw Error('Anonymous visibility HTTP '+anon.status);
const visible=await anon.json();console.log('ANONYMOUS '+JSON.stringify({status:anon.status,rows:visible.length,content_range:anon.headers.get('content-range')}));
if(visible.length)throw Error('Private products visible anonymously');
for(const p of rows.slice(0,3)){try{
const img=await fetch(p.image_url,{signal:AbortSignal.timeout(10000),redirect:'error'});
console.log('IMAGE_CHECK '+JSON.stringify({title:p.title,status:img.status,content_type:img.headers.get('content-type')}));
await img.body?.cancel();
}catch(e){console.log('IMAGE_CHECK '+JSON.stringify({title:p.title,error:safeError(e)}))}}
}catch(e){console.error('Verification failed: '+safeError(e));process.exitCode=1}
