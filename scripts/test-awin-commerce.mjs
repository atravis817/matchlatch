import test from 'node:test';
import assert from 'node:assert/strict';
import {affiliateConfig,merchantDestination,domainMatches,activeJoined,validateTrackingLink,generateAffiliateLink,awinRequest,normalizePerformance,reportWindow} from '../lib/awin-commerce.mjs';
import {GET as savings,POST as link} from '../api/savings.mjs';
import {GET as admin} from '../api/admin-summary.mjs';
import {deduplicateMerchantVariants} from '../lib/merchant-offer-identity.mjs';
const config={publisher:'3118944',token:'FICTIONAL_SECRET'},programme={id:123,name:'Fictional Retailer',status:'Active',currencyCode:'USD',primaryRegion:{countryCode:'US'},validDomains:[{domain:'shop.example'},{domain:'*.shop.example'}],linkStatus:'online'},destination='https://shop.example/products/shirt?variant=small';
const tracking=d=>'https://www.awin1.com/cread.php?awinmid=123&awinaffid=3118944&ued='+encodeURIComponent(d);
const details={programmeInfo:{...programme,membershipStatus:'Joined',deeplinkEnabled:true}};
test('merchant matching uses exact domains and explicit wildcards, never parents or name similarity',()=>{
 assert.ok(activeJoined(programme));assert.ok(domainMatches(destination,programme));assert.ok(domainMatches('https://us.shop.example/p',programme));
 for(const u of ['https://example/p','https://shop.example.evil.test/p','https://other.example/p'])assert.equal(domainMatches(u,programme),false);
 assert.equal(domainMatches('https://us.shop.example/p',{...programme,validDomains:[{domain:'shop.example'}]}),false);
 for(const delta of [{status:'Hidden'},{linkStatus:'offline'},{currencyCode:'EUR'},{primaryRegion:{countryCode:'GB'}},{validDomains:[{domain:'*.myshopify.com'}]}])assert.equal(activeJoined({...programme,...delta}),false);
});
test('unsafe retailer URLs, redirect parameters and customer identifiers fail closed',()=>{
 for(const u of ['http://shop.example/a','https://user:password@shop.example/a','https://shop.example:8443/a','https://127.0.0.1/a','https://shop.example/a#fragment','https://shop.example/redirect?next=https://evil.test','https://shop.example/a?access_token=PRIVATE','https://www.awin1.com/cread.php','https://shop.example\\@evil.test'])assert.equal(merchantDestination(u),null,u);
 assert.equal(merchantDestination(destination).href,destination);assert.equal(affiliateConfig({AWIN_API_TOKEN:'x',AWIN_PUBLISHER_ID:'other'}),null);
});
test('official long-link response must preserve publisher, advertiser and exact product destination',()=>{
 assert.equal(validateTrackingLink(tracking(destination),{...config,advertiserId:123,destination}),tracking(destination));
 for(const u of [tracking(destination).replace('3118944','999'),tracking(destination).replace('awinmid=123','awinmid=456'),tracking('https://shop.example/products/other'),tracking(destination)+'&awinmid=456',tracking(destination)+'&clickref=customer-id',tracking(destination).replace('www.awin1.com','evil.test')])assert.equal(validateTrackingLink(u,{...config,advertiserId:123,destination}),null);
});
test('link generation verifies live details and uses one official unshortened request without click metadata',async()=>{
 const calls=[];const request=async(path,options)=>{calls.push({path,options});if(path.includes('programmes?'))return [programme];if(path.includes('programmedetails?'))return details;assert.equal(options.method,'POST');assert.deepEqual(options.body,{advertiserId:123,destinationUrl:destination,shorten:false});return {url:tracking(destination)};};
 const result=await generateAffiliateLink(destination,{request,config});assert.equal(calls.length,3);assert.equal(result.trackingUrl,tracking(destination));assert.equal(result.affiliate,true);assert.equal(result.retailerUrl,destination);assert.equal(result.checkoutAttribution,'retailer_handoff_only');assert.ok(!JSON.stringify(result).includes(config.token));
});
test('pending/unmatched advertisers and revoked deep-link eligibility keep the ordinary link without generation',async()=>{
 for(const variant of [null,{...details.programmeInfo,membershipStatus:'Pending'},{...details.programmeInfo,membershipStatus:'Suspended'},{...details.programmeInfo,deeplinkEnabled:false},{...details.programmeInfo,validDomains:[{domain:'other.example'}]}]){let posts=0;const request=async path=>{if(path.includes('programmes?'))return variant===null?[]:[programme];if(path.includes('programmedetails?'))return {programmeInfo:variant};posts++;throw Error('Must not generate');};const r=await generateAffiliateLink(destination,{request,config});assert.equal(r.affiliate,false);assert.equal(r.retailerUrl,destination);assert.equal(posts,0);}
});
test('malformed generated link, ambiguous merchant identity and invalid listing response cannot monetize',async()=>{
 await assert.rejects(generateAffiliateLink(destination,{config,request:async path=>path.includes('programmes?')?[programme]:path.includes('programmedetails?')?details:{url:'https://evil.test'}}),/AWIN_INVALID_TRACKING_LINK/);
 const ambiguous=await generateAffiliateLink(destination,{config,request:async()=>[programme,{...programme,id:456}]});assert.equal(ambiguous.affiliate,false);
 await assert.rejects(generateAffiliateLink(destination,{config,request:async()=>({error:'SECRET'})}),/AWIN_INVALID_RESPONSE/);
});
test('fixed-host transport uses private Bearer header, timeout and byte limits; errors never contain provider body',async()=>{
 let calls=0;await awinRequest('/publishers/3118944/programmes',{config,fetcher:async(url,options)=>{calls++;assert.equal(url,'https://api.awin.com/publishers/3118944/programmes');assert.equal(options.headers.Authorization,'Bearer FICTIONAL_SECRET');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.ok(options.signal);return Response.json([]);}});assert.equal(calls,1);
 await assert.rejects(awinRequest('/test',{config,fetcher:async()=>new Response('PRIVATE_PROVIDER_BODY',{status:403})}),error=>error.message==='AWIN_HTTP_403');
 await assert.rejects(awinRequest('/test',{config,fetcher:async()=>new Response('x',{headers:{'content-length':'2000000'}})}),/AWIN_RESPONSE_LIMIT/);
});
test('aggregate performance preserves missing values, commissions by status, date range and unknown payable amounts',()=>{
 const r=normalizePerformance([{advertiserId:123,advertiserName:'Fictional Retailer',currency:'USD',clicks:8,pendingNo:2,pendingComm:'4.50',confirmedNo:1,confirmedComm:3,declinedNo:1,declinedComm:2,orderRef:'PRIVATE_ORDER',customerEmail:'PRIVATE_EMAIL'}],reportWindow('2026-10-01','2026-10-13'));
 assert.equal(r.rows[0].pendingCommission,4.5);assert.equal(r.rows[0].approvedCommission,3);assert.equal(r.rows[0].declinedCommission,2);assert.equal(r.payableCommission,null);assert.equal(r.reversalsSeparatelyReported,false);assert.ok(!JSON.stringify(r).includes('PRIVATE'));
 assert.equal(normalizePerformance([{}],r.window).rows[0].clicks,null);assert.equal(normalizePerformance([],r.window).empty,true);
 for(const dates of [['2026-02-30','2026-03-01'],['2026-09-01','2026-10-13'],['2026-10-13','2026-10-01'],['2030-01-01','2030-01-02']])assert.throws(()=>reportWindow(...dates));
});
test('Preview POST rejects unsafe/unsolicited requests and retains ordinary handoff when configuration is missing',async()=>{
 const saved={...process.env},f=globalThis.fetch;let calls=0;
 try{process.env.VERCEL_ENV='preview';delete process.env.AWIN_API_TOKEN;globalThis.fetch=async()=>{calls++;throw Error('Network forbidden');};
 const req=(body={},origin='https://fixture.test')=>new Request('https://fixture.test/api/savings',{method:'POST',headers:{origin,'content-type':'application/json','x-forwarded-for':Math.random().toString()},body:JSON.stringify(body)});
 assert.equal((await link(req({destination,intent:'retailer_handoff',affiliateConsent:true},'https://evil.test'))).status,403);
 assert.equal((await link(req({destination:'https://shop.example/?token=secret'}))).status,400);
 const r=await link(req({destination,intent:'retailer_handoff',affiliateConsent:true}));assert.equal(r.headers.get('cache-control'),'no-store');assert.equal((await r.json()).retailerUrl,destination);assert.equal(calls,0);process.env.VERCEL_ENV='production';assert.equal((await link(req())).status,404);
 }finally{process.env=saved;globalThis.fetch=f;}
});
test('Savings Check excludes expired, ambiguous, restricted-merchant and unrelated offers without changing prices',async()=>{
 const saved={...process.env},f=globalThis.fetch;const end=new Date(Date.now()+86400000).toISOString(),start=new Date(Date.now()-86400000).toISOString();let calls=0;
 const offer={promotionId:1,type:'voucher',advertiser:{id:123,joined:true},url:destination,title:'Fictional offer',terms:'Selected items only',startDate:start,endDate:end,regions:{all:true},voucher:{code:'SAVE10',exclusive:false}};
 try{Object.assign(process.env,{AWIN_API_TOKEN:'PRIVATE_TEST_TOKEN',AWIN_PUBLISHER_ID:'3118944'});
 globalThis.fetch=async(url,options)=>{calls++;if(url.includes('/programmes?'))return Response.json([programme,{...programme,id:456,name:'Restricted Retailer',description:'No coupon sites',validDomains:[{domain:'restricted.example'}]}]);assert.equal(JSON.parse(options.body).filters.type,'all');return Response.json([offer,{...offer,promotionId:2,endDate:'2000-01-01'}, {...offer,promotionId:3,advertiser:{id:456,joined:true},url:'https://restricted.example/p'}, {...offer,promotionId:4,url:'https://evil.test/p'}, {...offer,promotionId:5,endDate:null},{...offer,promotionId:6,voucher:{code:'BAD',exclusive:null}},{...offer,promotionId:7,regions:null},{...offer,promotionId:8,type:'promotion',voucher:undefined,title:'Fictional sale notice'}]);};
 const r=await savings(new Request('https://fixture.test/api/savings?domain=shop.example',{headers:{'x-forwarded-for':'offers-fixture'}})),data=await r.json();assert.equal(r.status,200);assert.equal(data.offers['shop.example'].length,2);assert.equal(data.offers['shop.example'][0].restricted,true);assert.equal(data.offers['shop.example'][0].checkoutVerified,false);assert.equal(data.offers['shop.example'][1].code,null);assert.ok(!JSON.stringify(data).includes('PRIVATE'));assert.equal(calls,2);
 const parent=await(await savings(new Request('https://fixture.test/api/savings?domain=example',{headers:{'x-forwarded-for':'parent'}}))).json();assert.equal(parent.error,'Invalid merchant domain.');
 }finally{process.env=saved;globalThis.fetch=f;}
});
test('Awin owner reporting denies guest/non-owner/Production before reading performance or feed data',async()=>{
 const saved={...process.env},f=globalThis.fetch,owner='11111111-1111-4111-8111-111111111111';let calls=0,user={id:owner,email_confirmed_at:'2026-10-13'};
 try{Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_ADMIN_USER_ID:owner,MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'});delete process.env.AWIN_API_TOKEN;
 globalThis.fetch=async url=>{if(String(url).endsWith('/auth/v1/user'))return Response.json(user);calls++;throw Error('Forbidden data call');};
 const req=(auth=true)=>new Request('https://fixture.test/api/admin-summary?action=awin-report',{headers:auth?{authorization:'Bearer '+'a'.repeat(60),'x-forwarded-for':Math.random().toString()}:{}});
 assert.equal((await admin(req(false))).status,403);user.id='22222222-2222-4222-8222-222222222222';assert.equal((await admin(req())).status,403);user.id=owner;assert.equal((await(await admin(req())).json()).status,'not_configured');process.env.VERCEL_ENV='production';assert.equal((await admin(req())).status,404);assert.equal(calls,0);
 }finally{process.env=saved;globalThis.fetch=f;}
});
test('cross-provider dedup requires the same merchant URL and original variant labels, preserving the first source intact',()=>{
 const shopify={source:'shopify_catalog',id:'shopify:1',url:destination+'&utm_source=shopify',size:'M',color:'Black',price:40,shippingEvidence:null},awin={...shopify,source:'awin',id:'awin:1',url:'https://www.awin1.com/pclick.php',merchantProductUrl:destination,price:35};
 assert.deepEqual(deduplicateMerchantVariants([shopify,awin]),[shopify]);assert.equal(shopify.url,destination+'&utm_source=shopify');
 for(const delta of [{size:'L'},{color:'Black/White'},{sizeSystem:'EU'},{merchantProductUrl:'https://shop.example/products/other?variant=small'}])assert.equal(deduplicateMerchantVariants([shopify,{...awin,...delta}]).length,2);
 assert.equal(deduplicateMerchantVariants([{...shopify,size:''},{...awin,size:''}]).length,2);
});
test('configured Preview link endpoint returns validated official URL and sanitized fallback after provider rejection',async()=>{
 const saved={...process.env},f=globalThis.fetch;let reject=false,generated=0;
 try{Object.assign(process.env,{VERCEL_ENV:'preview',AWIN_API_TOKEN:'FIXTURE_TOKEN',AWIN_PUBLISHER_ID:'3118944',MATCHLATCH_AWIN_HANDOFF_ENABLED:'true'});
 globalThis.fetch=async(url,options)=>{assert.equal(options.headers.Authorization,'Bearer FIXTURE_TOKEN');if(url.includes('programmes?'))return Response.json([programme]);if(url.includes('programmedetails?'))return Response.json(details);generated++;return reject?new Response('PRIVATE_PROVIDER_TOKEN',{status:403}):Response.json({url:tracking(destination)});};
 const req=()=>new Request('https://fixture.test/api/savings',{method:'POST',headers:{origin:'https://fixture.test','content-type':'application/json','x-forwarded-for':Math.random().toString()},body:JSON.stringify({destination,intent:'retailer_handoff',affiliateConsent:true})});
 const ok=await(await link(req())).json();assert.equal(ok.affiliate,true);assert.equal(ok.trackingUrl,tracking(destination));assert.ok(!JSON.stringify(ok).includes('FIXTURE_TOKEN'));reject=true;const fallback=await(await link(req())).json();assert.equal(fallback.affiliate,false);assert.equal(fallback.retailerUrl,destination);assert.ok(!JSON.stringify(fallback).includes('PRIVATE'));assert.equal(generated,2);
 }finally{process.env=saved;globalThis.fetch=f;}
});
