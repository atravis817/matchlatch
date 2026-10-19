import {merchantDestination,boundTrackingLink} from './awin-tracking.mjs';
export {merchantDestination} from './awin-tracking.mjs';
// Preview affiliate commerce. No customer identifiers, cookies or checkout writes.
const BASE='https://api.awin.com',TTL=5*60*1000;
const clean=(v,n=160)=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n);
export const affiliateConfig=(env=process.env)=>{
 const token=String(env.AWIN_API_TOKEN||'').trim(),publisher=String(env.AWIN_PUBLISHER_ID||'').trim();
 return token&&publisher==='3118944'?{token,publisher}:null;
};
const host=v=>clean(v,240).toLowerCase().replace(/^www\./,'');
export function advertiserDomains(programme){
 const result=[];
 for(const entry of programme?.validDomains||[]){const value=typeof entry==='string'?entry:entry?.domain,raw=host(value),wildcard=raw.startsWith('*.'),base=wildcard?raw.slice(2):raw;
  if(!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(base)||['co.uk','com.au','myshopify.com','awin.com','awin1.com','awin2.com'].includes(base))continue;
  result.push({base,wildcard});
 }return result;
}
export const domainMatches=(value,programme)=>{const u=merchantDestination(value);return Boolean(u&&advertiserDomains(programme).some(d=>host(u.hostname)===d.base||d.wildcard&&host(u.hostname).endsWith('.'+d.base)));};
export function activeJoined(programme){return Boolean(programme&&Number.isSafeInteger(Number(programme.id))&&String(programme.status).toLowerCase()==='active'&&programme.primaryRegion?.countryCode==='US'&&programme.currencyCode==='USD'&&String(programme.linkStatus||'online').toLowerCase()!=='offline'&&advertiserDomains(programme).length);}
export function validateTrackingLink(value,options){return boundTrackingLink(value,{...options,context:'commerce'});}
let providerWindow={until:0,count:0},providerHold=0;
export async function awinRequest(path,{method='GET',body,config=affiliateConfig(),fetcher=globalThis.fetch}={}){
 if(!config)throw Error('AWIN_NOT_CONFIGURED');
 if(fetcher===globalThis.fetch){const now=Date.now();if(now<providerHold)throw Error('AWIN_COOLDOWN');if(now>=providerWindow.until)providerWindow={until:now+60000,count:0};if(++providerWindow.count>20)throw Error('AWIN_RATE_LIMIT');}
 const r=await fetcher(BASE+path,{method,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{Authorization:'Bearer '+config.token,accept:'application/json',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(!r.ok){if(r.status===429)providerHold=Date.now()+60000;throw Error('AWIN_HTTP_'+r.status);}
 if(Number(r.headers.get('content-length')||0)>1048576)throw Error('AWIN_RESPONSE_LIMIT');
 const reader=r.body?.getReader();if(!reader)throw Error('AWIN_INVALID_RESPONSE');let raw='',size=0;const decoder=new TextDecoder();
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1048576){await reader.cancel();throw Error('AWIN_RESPONSE_LIMIT');}raw+=decoder.decode(value,{stream:true});}
 try{return JSON.parse(raw+decoder.decode());}catch{throw Error('AWIN_INVALID_RESPONSE');}
}
let joinedCache=null,joinedPending=null,cooldown=0;
export async function joinedAdvertisers({request=awinRequest,config=affiliateConfig(),now=Date.now()}={}){
 if(!config)throw Error('AWIN_NOT_CONFIGURED');
 // Injectable transports never share runtime caches with live account data.
 const cached=request===awinRequest;
 if(cached&&joinedCache?.publisher===config.publisher&&joinedCache.until>now)return joinedCache.rows;
 if(cached&&now<cooldown)throw Error('AWIN_COOLDOWN');if(cached&&joinedPending)return joinedPending;
 const run=async()=>{try{const data=await request('/publishers/'+config.publisher+'/programmes?relationship=joined',{config});if(!Array.isArray(data)||data.length>2000)throw Error('AWIN_INVALID_RESPONSE');const rows=data.filter(activeJoined);if(cached)joinedCache={publisher:config.publisher,until:now+TTL,rows};return rows;}catch(error){if(cached){joinedCache=null;cooldown=now+60000;}throw error;}finally{if(cached)joinedPending=null;}};
 const promise=run();if(cached)joinedPending=promise;return promise;
}
export async function generateAffiliateLink(destination,{request=awinRequest,config=affiliateConfig()}={}){
 const url=merchantDestination(destination);if(!url)throw Error('INVALID_DESTINATION');
 const programmes=await joinedAdvertisers({request,config}),matches=programmes.filter(p=>domainMatches(url.href,p));
 if(matches.length!==1)return {status:'ordinary_retailer_link',retailerUrl:url.href,affiliate:false};
 const programme=matches[0],details=await request('/publishers/'+config.publisher+'/programmedetails?advertiserId='+programme.id+'&relationship=joined',{config});
 const info=details?.programmeInfo;
 if(!info||Number(info.id)!==Number(programme.id)||info.membershipStatus!=='Joined'||info.deeplinkEnabled!==true||String(info.linkStatus||'online').toLowerCase()==='offline'||!domainMatches(url.href,info))return {status:'ordinary_retailer_link',retailerUrl:url.href,affiliate:false};
 const generated=await request('/publishers/'+config.publisher+'/linkbuilder/generate',{method:'POST',config,body:{advertiserId:Number(programme.id),destinationUrl:url.href,shorten:false}});
 const trackingUrl=validateTrackingLink(generated?.url,{publisher:config.publisher,advertiserId:programme.id,destination:url.href});if(!trackingUrl)throw Error('AWIN_INVALID_TRACKING_LINK');
 return {status:'affiliate_link_generated',affiliate:true,trackingUrl,retailerUrl:url.href,merchant:clean(programme.name),checkedAt:new Date().toISOString(),disclosure:'MATCHLATCH may earn a commission if you purchase through this link. Your price is unchanged.',checkoutAttribution:'retailer_handoff_only'};
}
export function reportWindow(start,end){
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 if(!date(start)||!date(end))throw Error('INVALID_REPORT_WINDOW');const days=(Date.parse(end)-Date.parse(start))/86400000+1;
 if(days<1||days>31||end>new Date().toISOString().slice(0,10))throw Error('INVALID_REPORT_WINDOW');return {start,end,days};
}
export function normalizePerformance(data,window){
 if(!Array.isArray(data)||data.length>2000)throw Error('AWIN_INVALID_RESPONSE');
 const number=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
 const rows=data.map(r=>({advertiserId:clean(r.advertiserId,18),merchant:clean(r.advertiserName),currency:/^[A-Z]{3}$/.test(r.currency)?r.currency:null,clicks:number(r.clicks),pendingSales:number(r.pendingNo),approvedSales:number(r.confirmedNo),declinedSales:number(r.declinedNo),pendingCommission:number(r.pendingComm),approvedCommission:number(r.confirmedComm),declinedCommission:number(r.declinedComm)}));
 return {status:'reported',window:{...window,timezone:'UTC',region:'US',dateType:'transaction'},rows,empty:rows.length===0,payableCommission:null,reversalsSeparatelyReported:false,note:'Awin-attributed activity only. Clicks are not purchases; approved commission is not proof of payment. Missing values remain unknown.'};
}
export async function advertiserPerformance(start,end,{request=awinRequest,config=affiliateConfig()}={}){
 const window=reportWindow(start,end);if(!config)return {status:'not_configured',rows:[],window};
 const params=new URLSearchParams({startDate:start,endDate:end,region:'US',timezone:'UTC',dateType:'transaction'});
 return normalizePerformance(await request('/publishers/'+config.publisher+'/reports/advertiser?'+params,{config}),window);
}
