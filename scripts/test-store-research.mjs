import {test} from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../api/discover.mjs';
import {POST as commercePOST} from '../api/commerce.mjs';
import {createResearch,extractResearch} from '../lib/commerce-discovery.mjs';
import {parseCommerceCriteria} from '../lib/commerce-intelligence.mjs';
import {researchInput} from '../lib/research-route.mjs';
import {requestResearch} from '../research-client.mjs';
const code='synthetic-beta-code-only',id='00000000-0000-0000-0000-000000000001';
const query={q:'white shoes',max:100,size:'10',slot:'shoes',consent:true,betaCode:code};
const account={user:{id:'synthetic-account'},access_token:'a'.repeat(60)};
const criteria=parseCommerceCriteria({query:'white shoes',size:'10',max:100});
const provider=()=>({status:'completed',usage:{input_tokens:200,output_tokens:30},output:[
 {type:'web_search_call',status:'completed',action:{type:'search',sources:[{url:'https://www.gap.com/browse/product.do?pid=123&utm_source=x',title:'Fixture Gap reference'}]}},
 {type:'message',content:[{type:'output_text',text:'Untrusted prose',annotations:[{type:'url_citation',url:'https://nordstrom.com/s/fixture/123',title:'Fixture citation'}]}]}
]});
function request(body=query,headers={}){return new Request('https://fixture.test/api/discover',{method:'POST',headers:{authorization:'Bearer '+account.access_token,'x-forwarded-for':'research-'+(++request.count),...headers},body:JSON.stringify(body)});}
request.count=0;
async function isolated(fn){
 const env={...process.env},fetcher=globalThis.fetch;
 Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_BETA_CODE:code,MATCHLATCH_PREVIEW_OPENAI_API_KEY:'synthetic-key',MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service'});
 try{await fn();}finally{process.env=env;globalThis.fetch=fetcher;}
}
function transport({auth=true,quota={allowed:true,usage_id:id},meterError=false,data=provider(),providerError=false}={}){
 const calls=[];
 globalThis.fetch=async(url,options={})=>{
  calls.push({url:String(url),options});
  if(String(url).endsWith('/auth/v1/user'))return Response.json(auth?{id:account.user.id}:{error:'denied'},{status:auth?200:401});
  if(String(url).includes('matchlatch_commerce_reserve')){if(quota instanceof Error)throw quota;return Response.json(quota);}
  if(String(url).includes('matchlatch_commerce_meter')){if(meterError)throw Error('private database error');return Response.json(null);}
  if(String(url)==='https://api.openai.com/v1/responses'){if(providerError)throw Error('private upstream error');return Response.json(data);}
  if(String(url).includes('/matchlatch_awin_products?'))return Response.json([]);
  throw Error('Unexpected endpoint '+url);
 };return calls;
}
test('actual Store route rejects origin, environment, beta, auth and consent before any paid request',()=>isolated(async()=>{
 for(const [kind,status]of [['origin',403],['production',503],['beta',403],['auth',401],['consent',400]]){
  process.env.VERCEL_ENV=kind==='production'?'production':'preview';
  const calls=transport({auth:kind!=='auth'});
  const r=await POST(request({...query,...(kind==='beta'?{betaCode:'wrong'}:{}),...(kind==='consent'?{consent:false}:{})},kind==='origin'?{origin:'https://other.test'}:{}));
  assert.equal(r.status,status,kind);assert.ok(calls.every(c=>c.url.endsWith('/auth/v1/user')));
 }
}));
test('actual route rejects malformed and oversized bodies without a provider call',()=>isolated(async()=>{
 const calls=transport();
 for(const body of [null,[],{...query,q:'a'},{...query,max:-1},{...query,size:{private:'data'}}])assert.equal((await POST(request(body))).status,400);
 assert.equal((await POST(request({...query,profile:'x'.repeat(4500)}))).status,413);
 assert.equal(calls.length,0);
}));
test('actual route uses single indexed policy request, drops private extras and retains C3 citations as research',()=>isolated(async()=>{
 const calls=transport();const r=await POST(request({...query,q:'white shoes route integration',profile:{notes:'PRIVATE_NOTES'},image:'PRIVATE_IMAGE',zip:'12345',country:'CA',model:'unapproved'}));
 assert.equal(r.status,200);const data=await r.json();assert.equal(data.mode,'research_only');assert.equal(data.canAddToCart,false);assert.equal(data.sources.length,2);
 assert.ok(data.sources.every(s=>s.cartEligible===false&&s.verifiedStock===false));assert.equal(data.summary,'');
 const upstream=calls.filter(c=>c.url.includes('api.openai.com'));assert.equal(upstream.length,1);
 const b=JSON.parse(upstream[0].options.body);assert.equal(b.model,'gpt-5.4-mini');assert.equal(b.max_tool_calls,1);assert.equal(b.max_output_tokens,300);assert.equal(b.store,false);
 assert.equal(b.tools[0].external_web_access,false);assert.deepEqual(b.tools[0].filters.allowed_domains,['gap.com','nordstrom.com']);
 assert.deepEqual(JSON.parse(b.input),{query:'white shoes route integration',size:'10',maxUSD:100,country:'US',slots:['shoes'],colors:['white'],excludedColors:[]});
 assert.ok(!JSON.stringify(b).includes('PRIVATE'));assert.ok(!JSON.stringify(b).includes(code));
 assert.equal(calls.filter(c=>c.url.includes('reserve')).length,1);assert.equal(calls.filter(c=>c.url.includes('meter')).length,1);
 assert.equal(calls.some(c=>c.url.includes('matchlatch_awin_products')),false);
}));
test('actual commerce route uses the same bounded research path',()=>isolated(async()=>{
 const calls=transport();const r=await commercePOST(new Request('https://fixture.test/api/commerce',{method:'POST',headers:{authorization:'Bearer '+account.access_token,'x-forwarded-for':'commerce-path'},body:JSON.stringify({query:'white shoes commerce integration',max:100,allowExternal:true,consent:true,betaCode:code})}));
 assert.equal(r.status,200);const d=await r.json();assert.equal(d.researchStatus,'searched');assert.equal(d.recommendations.length,0);assert.equal(calls.filter(c=>c.url.includes('reserve')).length,1);
}));
test('actual Store route fails closed on reservation denial/error, malformed quota and settlement failure',()=>isolated(async()=>{
 for(const [index,opts,status,state,paid]of [
  [1,{quota:{allowed:false}},429,'budget_or_rate_limit',0],
  [2,{quota:Error('private meter detail')},503,'meter_unavailable',0],
  [3,{quota:{allowed:true}},503,'meter_unavailable',0],
  [4,{meterError:true},503,'settlement_failed',1]
 ]){
  const calls=transport(opts);const r=await POST(request({...query,q:'white shoes failure '+index}));assert.equal(r.status,status);const d=await r.json();assert.equal(d.researchStatus,state);assert.deepEqual(d.sources,[]);
  assert.equal(calls.filter(c=>c.url.includes('api.openai.com')).length,paid);assert.equal(calls.filter(c=>c.url.includes('reserve')).length,1);assert.ok(calls.filter(c=>c.url.includes('meter')).length<=1);
  assert.ok(!JSON.stringify(d).includes('private'));
 }
}));
test('configured state is distinct from provider failure and successful empty research',()=>isolated(async()=>{
 delete process.env.MATCHLATCH_PREVIEW_OPENAI_API_KEY;let calls=transport();let r=await POST(request({...query,q:'white shoes unconfigured'}));assert.equal(r.status,503);assert.equal((await r.json()).researchStatus,'not_configured');assert.equal(calls.length,1);
 process.env.MATCHLATCH_PREVIEW_OPENAI_API_KEY='synthetic-key';
 calls=transport({providerError:true});r=await POST(request({...query,q:'white shoes provider error'}));assert.equal(r.status,503);assert.equal((await r.json()).researchStatus,'failed_catalog_fallback');assert.equal(calls.filter(c=>c.url.includes('meter')).length,1);
 const empty=provider();empty.output[0].action.sources=[];empty.output[1].content[0].annotations=[];
 transport({data:empty});r=await POST(request({...query,q:'white shoes empty result'}));assert.equal(r.status,200);const d=await r.json();assert.equal(d.researchStatus,'searched');assert.deepEqual(d.sources,[]);
}));
test('one settlement per invalid usage/tool response; no references cached on failure',async()=>{
 for(const mutate of [d=>delete d.usage,d=>d.usage.output_tokens=-1,d=>d.usage.output_tokens=301,d=>d.output[0].status='failed',d=>d.output.push(d.output[0]),d=>d.status='incomplete',d=>d.error={message:'private'}]){
  const data=provider();mutate(data);let paid=0;const settlements=[];
  const research=createResearch({env:()=>({VERCEL_ENV:'preview',MATCHLATCH_PREVIEW_OPENAI_API_KEY:'fixture'}),fetcher:async()=>{paid++;return Response.json(data);},call:async(name,body,options)=>{assert.equal(options.retries,0);if(name.endsWith('reserve'))return {allowed:true,usage_id:id};settlements.push(body);return null;}});
  for(let i=0;i<2;i++)assert.equal((await research(criteria,'fixture-user')).status,'failed_catalog_fallback');
  assert.equal(paid,2);assert.equal(settlements.length,2);assert.ok(settlements.every(s=>s.p_outcome==='failed'));
 }
});
test('research cache is bounded to user and explicit input and does not repeat a reservation for a hit',async()=>{
 let paid=0,reserved=0;
 const research=createResearch({env:()=>({VERCEL_ENV:'preview',MATCHLATCH_PREVIEW_OPENAI_API_KEY:'fixture'}),fetcher:async()=>{paid++;return Response.json(provider());},call:async(name)=>name.endsWith('reserve')?(reserved++,{allowed:true,usage_id:id}):null});
 assert.equal((await research(criteria,'one')).status,'searched');assert.equal((await research(criteria,'one')).status,'cache_hit');assert.equal((await research(criteria,'two')).status,'searched');assert.equal(paid,2);assert.equal(reserved,2);
});
test('source policy rejects spoofed/unapproved and non-product citations; message without observed tool is empty',()=>{
 const d=provider();d.output[0].action.sources.push(...['https://uniqlo.com/us/product/1','https://evil.test/p/1','https://nordstrom.com.evil.test/s/a','https://gap.com/browse/search.do?pid=1','https://nordstrom.com/checkout/1'].map(url=>({url})));
 assert.equal(extractResearch(d).length,2);d.output.shift();assert.deepEqual(extractResearch(d),[]);
 const input=researchInput({...query,profile:{notes:'private'},image:'private',zip:'12345'});assert.equal(input.profile,undefined);assert.equal(input.zip,undefined);assert.equal(input.image,undefined);
});
test('Store consumer requires consent and auth and sends no profile, ZIP or image fields',async()=>{
 let calls=0;const options={session:async()=>account,fetcher:async(url,opts)=>{calls++;assert.equal(url,'/api/discover');assert.equal(opts.headers.Authorization,'Bearer '+account.access_token);assert.deepEqual(Object.keys(JSON.parse(opts.body)).sort(),['betaCode','consent','max','q','size','slot']);return Response.json({mode:'research_only',canAddToCart:false,sources:[]});}};
 await assert.rejects(requestResearch({...query,query:query.q,consent:false},options),/consent/);assert.equal(calls,0);
 await assert.rejects(requestResearch({...query,query:query.q},{...options,session:async()=>null}),/Sign in/);assert.equal(calls,0);
 await requestResearch({...query,query:query.q,profile:'private',image:'private',zip:'12345'},options);assert.equal(calls,1);
});
test('Store consumer discards stale search/account results and never reflects private upstream errors',async()=>{
 let reads=0;const opts={session:async()=>++reads===1?account:{...account,user:{id:'other-account'}},fetcher:async()=>Response.json({mode:'research_only',canAddToCart:false})};
 assert.equal(await requestResearch({...query,query:query.q},opts),null);
 await assert.rejects(requestResearch({...query,query:query.q},{session:async()=>account,fetcher:async()=>Response.json({error:'private stack key'},{status:503})}),e=>!e.message.includes('private stack'));
});

test('selected category changes the real provider input and cache identity',()=>isolated(async()=>{
 const calls=transport();
 for(const slot of ['shirt','jacket']){
  const r=await POST(request({...query,q:'oversized relaxed',slot}));assert.equal(r.status,200);
 }
 const provider=calls.filter(c=>c.url.includes('api.openai.com'));assert.equal(provider.length,2,'category must not reuse another category cache');
 assert.deepEqual(provider.map(c=>JSON.parse(JSON.parse(c.options.body).input).slots),[['shirt'],['jacket']]);
}));

test('commerce cannot bypass research beta gate with a valid account and consent',()=>isolated(async()=>{
 for(const betaCode of [undefined,'wrong']){const calls=transport();
 const r=await commercePOST(new Request('https://fixture.test/api/commerce',{method:'POST',headers:{authorization:'Bearer '+account.access_token,'x-forwarded-for':'beta-bypass-'+betaCode},body:JSON.stringify({query:'oversized relaxed',max:100,allowExternal:true,consent:true,betaCode})}));
 assert.equal(r.status,403);assert.equal(calls.length,0,'beta denial occurs before auth/catalog/quota/provider');}
}));
