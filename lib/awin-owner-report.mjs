import {advertiserPerformance,affiliateConfig,joinedAdvertisers} from './awin-commerce.mjs';
import {discoverFeeds,feedMetadata} from '../scripts/awin-feed-utils.mjs';
import {json} from './catalog-server.mjs';
import {allowRequest} from './request-limits.mjs';
// Caller must pass the existing server-verified owner gate before invoking.
export async function awinOwnerReport(request,action){
 if(process.env.VERCEL_ENV!=='preview')return json({error:'Not found'},404);
 if(!allowRequest(request,'awin-owner',3))return json({error:'Please try again later.'},429);
 if(!affiliateConfig())return json({status:'not_configured',rows:[],missing:[...(!process.env.AWIN_API_TOKEN?['AWIN_API_TOKEN']:[]),...(process.env.AWIN_PUBLISHER_ID!=='3118944'?['AWIN_PUBLISHER_ID']:[])],message:'Configure the Awin publisher API credentials in this Preview branch. No Production credentials were read.'});
 try{
  if(action==='awin-feed-status'){
   if(!process.env.AWIN_PRODUCT_FEED_API_KEY)return json({status:'not_configured',rows:[],missing:['AWIN_PRODUCT_FEED_API_KEY']});
   const joined=await joinedAdvertisers(),ids=new Set(joined.map(p=>Number(p.id))),data=await discoverFeeds();
   const rows=data.rows.map(feedMetadata).filter(r=>ids.has(r.advertiser_id)&&r.membership?.toLowerCase()==='joined').map(({advertiser_id,advertiser_name,feed_id,last_imported,download_url_available,product_count})=>({advertiserId:advertiser_id,merchant:advertiser_name,feedId:feed_id,updatedAt:last_imported,downloadAvailable:download_url_available,reportedProductCount:product_count,publicEligible:false}));
   return json({status:'feed_metadata_only',rows,checkedAt:new Date().toISOString(),note:'No product feeds downloaded or published. Licensing, freshness, classification, sizes and US shipping must pass existing feed gates.'});
  }
  const u=new URL(request.url),end=u.searchParams.get('end')||new Date().toISOString().slice(0,10),start=u.searchParams.get('start')||new Date(Date.now()-6*86400000).toISOString().slice(0,10);
  return json(await advertiserPerformance(start,end));
 }catch(error){return json({status:'unavailable',rows:[],error:error?.message==='INVALID_REPORT_WINDOW'?'Choose a valid past date range of at most 31 days.':'Awin reporting is temporarily unavailable.'},error?.message==='INVALID_REPORT_WINDOW'?400:503);}
}
