import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../api/style.mjs';
import {modelJSON} from '../lib/styling-engine.mjs';
import {normalizeProduct} from '../lib/shopify-sync.mjs';
import {product} from './shopify-sync-fixture.mjs';

function approvedRow(){
 const r=normalizeProduct(product(),{observedAt:new Date().toISOString()})[0];
 r.is_public=true;r.approval={sourceAuthorized:true,displayAuthorized:true,recommendationAuthorized:true,imageRights:true,supplierVerified:true,channelVerified:true,usShippingVerified:true,supplierId:'synthetic-supplier',channelId:'synthetic-channel',evidenceRef:'synthetic-only',expiresAt:'2030-01-01T00:00:00Z',materialHash:r.material_hash,vendor:r.brand,productIds:[r.product_id]};return r;
}
const envelope=()=>({prompt:'blue shirt up to $100',manualPreferences:{size:'S'},savedDefaults:{max:200},confirmedResolutions:{}});
const interpretation=()=>({slots:['shirt'],budget:100,colors:['blue'],brands:[],anchor:null});
let serial=0;
async function scenario(body={},options={}){
 const env={...process.env},original=globalThis.fetch,calls=[];
 Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_SHOPIFY_FIRST_PHASE:'true',MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',SUPABASE_SERVICE_ROLE_KEY:'synthetic',MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL:'https://lqxeizvrdxuhzvipmlkl.supabase.co',MATCHLATCH_SHOPIFY_PREVIEW_SERVICE_KEY:'synthetic',MATCHLATCH_PREVIEW_OPENAI_API_KEY:'synthetic',MATCHLATCH_STYLING_MODEL:'gpt-5.4-mini',MATCHLATCH_BETA_CODE:'synthetic-private-beta-only',...options.config});
 globalThis.fetch=async(url,opts={})=>{
  url=String(url);const payload=opts.body?JSON.parse(opts.body):null;calls.push({url,payload,opts});
  if(url.endsWith('/auth/v1/user'))return Response.json({id:'synthetic-account',is_anonymous:false});
  if(url.includes('matchlatch_records?'))return Response.json([]);
  if(url.includes('matchlatch_shopify_products?'))return Response.json(options.rows??[approvedRow()]);
  if(url.endsWith('/rpc/matchlatch_ai_reserve'))return options.reserveError?new Response('',{status:503}):Response.json(options.quota??{allowed:true,usage_id:'synthetic-reservation'});
  if(url.endsWith('/rpc/matchlatch_ai_meter'))return options.meterError?new Response('',{status:503}):Response.json(null);
  if(url==='https://api.openai.com/v1/responses'){
   if(options.abort)throw new DOMException('Synthetic timeout','TimeoutError');
   if(options.providerError)return new Response('sensitive provider details',{status:429});
   return Response.json({status:options.status??'completed',...(options.noUsage?{}:{usage:{input_tokens:70,output_tokens:25}}),output:[{type:'message',content:[{type:'output_text',text:options.output??JSON.stringify(interpretation())}]}]});
  }
  throw Error('Unexpected external destination');
 };
 try{
  const raw=body.raw??JSON.stringify({consent:true,ai:true,betaCode:'synthetic-private-beta-only',studioRequest:envelope(),...body});
  const response=await POST(new Request('https://fixture.test/api/style',{method:'POST',headers:{...(options.guest?{}:{authorization:'Bearer '+'s'.repeat(60)}),'x-forwarded-for':'user-ai-'+serial++,origin:options.origin??'https://fixture.test'},body:raw}));
  return {status:response.status,data:await response.json(),calls};
 }finally{process.env=env;globalThis.fetch=original;}
}
const provider=r=>r.calls.filter(c=>c.url.includes('api.openai.com'));
const rpc=(r,name)=>r.calls.filter(c=>c.url.endsWith('/rpc/matchlatch_ai_'+name));

test('combined Shopify search makes one user-only AI call, preserves exact inputs, filters real mapper fixtures and settles usage',async()=>{
 const studioRequest=envelope(),before=structuredClone(studioRequest),r=await scenario({studioRequest});
 assert.equal(r.status,200);assert.equal(r.data.mode,'ai');assert.equal(r.data.products.length,1);assert.equal(r.data.complete,false);
 assert.deepEqual(studioRequest,before);assert.equal(r.data.normalized.provenance.max,'prompt');assert.equal(r.data.intent.size,'S');
 assert.equal(provider(r).length,1);const call=provider(r)[0],data=JSON.parse(call.payload.input[0].content[0].text);
 assert.equal(data.studio.prompt,studioRequest.prompt);assert.deepEqual(data.studio.effectiveConstraints,{max:100,size:'S',slot:'shirt',color:'blue'});
 assert.equal(call.payload.store,false);assert.equal(call.payload.model,'gpt-5.4-mini');assert.equal(call.payload.max_output_tokens,400);assert.equal(call.opts.redirect,'error');
 assert.ok(!JSON.stringify(call.payload).includes('Fixture supplier'));assert.ok(!JSON.stringify(call.payload).includes('gid://'));assert.ok(!('candidates' in data));assert.ok(!JSON.stringify(call.payload).includes('shopify.com'));
 assert.equal(rpc(r,'reserve').length,1);assert.deepEqual(rpc(r,'meter')[0].payload,{p_id:'synthetic-reservation',p_input:70,p_output:25,p_outcome:'completed'});
 assert.equal(r.data.capabilities.merchantDataSentToModel,false);assert.equal(r.data.capabilities.photo,false);assert.equal(r.data.capabilities.softPreferencesApplied,false);
 assert.ok(r.calls.findIndex(c=>c.url.includes('matchlatch_shopify_products?'))<r.calls.findIndex(c=>c.url.endsWith('matchlatch_ai_reserve')));
});
for(const [name,studioRequest] of Object.entries({prompt:{prompt:'blue shirt up to $100 size S'},manual:{manualPreferences:{slot:'shirt',color:'blue',max:'100',size:'S'}},defaults:{savedDefaults:{slot:'shirt',color:'blue',max:100,size:'S'}},override:{manualPreferences:{slot:'shirt',color:'blue',max:100,size:'S'},savedDefaults:{max:200,color:'red'}}}))test(`${name} input reaches AI and deterministic catalog filtering`,async()=>{
 const r=await scenario({studioRequest});assert.equal(r.status,200);assert.equal(provider(r).length,1);assert.equal(r.data.products.length,1);assert.equal(r.data.budget,100);
});
for(const [name,body,status] of [
 ['conflict',{studioRequest:{prompt:'shirt up to $100',manualPreferences:{max:90}}},422],
 ['photo',{studioRequest:{...envelope(),photoContext:{useUploadedPhoto:true}}},422],
 ['image',{image:'data:image/jpeg;base64,/9j/AA=='},422],
 ['deadline',{studioRequest:{...envelope(),manualPreferences:{needBy:'tomorrow'}}},422],
 ['fit',{studioRequest:{...envelope(),manualPreferences:{fit:'slim'}}},422],
 ['subtype',{studioRequest:{prompt:'blue polo up to $100'}},422],
 ['malformed',{raw:'{'},400],['null',{raw:'null'},400],['consent',{consent:false},400]
])test(`${name} blocks before reservation or model`,async()=>{const r=await scenario(body);assert.equal(r.status,status);assert.equal(provider(r).length,0);assert.equal(rpc(r,'reserve').length,0);});
test('guest, origin, empty inventory and AI opt-out never invoke the model',async()=>{
 assert.equal((await scenario({}, {guest:true})).status,401);assert.equal((await scenario({}, {origin:'https://other.test'})).status,403);
 const empty=await scenario({}, {rows:[]});assert.equal(empty.status,200);assert.equal(empty.data.aiSkipped,'no_eligible_catalog');assert.deepEqual(empty.data.products,[]);assert.equal(provider(empty).length,0);assert.equal(rpc(empty,'reserve').length,0);
 const guided=await scenario({ai:false});assert.equal(guided.data.mode,'catalog');assert.equal(provider(guided).length,0);
});
test('denied or malformed reservation never invokes provider; ambiguous reservation is not retried',async()=>{
 for(const quota of [{allowed:false},{allowed:'true',usage_id:'fake'},{allowed:true}]){const r=await scenario({}, {quota});assert.ok([429,503].includes(r.status));assert.equal(provider(r).length,0);assert.equal(rpc(r,'reserve').length,1);}
 const r=await scenario({}, {reserveError:true});assert.equal(provider(r).length,0);assert.equal(rpc(r,'reserve').length,1);
});
for(const [name,options] of Object.entries({malformed:{output:'{'},incomplete:{status:'incomplete'},wrongCategory:{output:JSON.stringify({...interpretation(),slots:['watch']})},relaxedBudget:{output:JSON.stringify({...interpretation(),budget:101})},inventedBrand:{output:JSON.stringify({...interpretation(),brands:['Gucci']})},missingUsage:{noUsage:true},timeout:{abort:true},provider:{providerError:true}}))test(`${name} returns an honest error and settles once without provider retry`,async()=>{
 const r=await scenario({},options);assert.equal(r.status,502);assert.equal(provider(r).length,1);assert.equal(rpc(r,'meter').length,1);assert.ok(!r.data.products);assert.ok(!JSON.stringify(r.data).includes('sensitive'));
 assert.equal(rpc(r,'meter')[0].payload.p_outcome,options.abort||options.providerError||options.noUsage?'failed_usage_unknown':'failed');
 if(!options.abort&&!options.providerError&&!options.noUsage)assert.equal(rpc(r,'meter')[0].payload.p_input,70);
});
test('settlement failure is not success and is not blindly retried',async()=>{const r=await scenario({}, {meterError:true});assert.equal(r.status,503);assert.equal(provider(r).length,1);assert.equal(rpc(r,'meter').length,1);assert.match(r.data.error,/usage could not be confirmed/);});
test('untrusted schema types, extra keys and conflicting colors are rejected with measured usage',async()=>{
 for(const value of [null,[],{...interpretation(),budget:'100'},{...interpretation(),extra:true},{...interpretation(),colors:['red']},{...interpretation(),slots:['shirt','shirt']},{...interpretation(),brands:[{}]},{...interpretation(),anchor:'invalid'}]){
  const r=await scenario({}, {output:JSON.stringify(value)});assert.equal(r.status,502);assert.equal(provider(r).length,1);assert.equal(rpc(r,'meter')[0].payload.p_input,70);assert.equal(rpc(r,'meter')[0].payload.p_outcome,'failed');
 }
});
test('confirmed resolution and soft context are transmitted separately from immutable hard filters',async()=>{
 const studioRequest={prompt:'blue shirt up to $90',manualPreferences:{max:'100.00',size:'S',occasion:'Work',style:'Casual'},savedDefaults:{max:200},confirmedResolutions:{max:100}};
 const r=await scenario({studioRequest});assert.equal(r.status,200);assert.equal(r.data.budget,100);assert.equal(r.data.normalized.provenance.max,'confirmedResolution');
 const context=JSON.parse(provider(r)[0].payload.input[0].content[0].text).studio;assert.deepEqual(context.softPreferences,{occasion:'Work',style:'Casual'});assert.equal(context.effectiveConstraints.max,100);assert.equal(r.data.capabilities.softPreferencesApplied,false);
});
test('denied source, stale/over-budget/wrong size/color variants cannot supply AI coverage',async()=>{
 for(const transform of [r=>{r.approval.recommendationAuthorized=false;},r=>{r.observed_at='2000-01-01T00:00:00Z';},r=>{r.data.price=101;r.price_usd=101;},r=>{r.data.size='M';},r=>{r.data.color='Blue/Pink';}]){
  const row=approvedRow();transform(row);const r=await scenario({}, {rows:[row]});assert.equal(r.status,200);assert.equal(r.data.products.length,0);assert.equal(provider(r).length,0);
 }
});
test('pre-aborted model request never contacts provider',async()=>{
 const env={...process.env},f=globalThis.fetch;process.env.MATCHLATCH_PREVIEW_OPENAI_API_KEY='synthetic';let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Forbidden');};
 try{await assert.rejects(modelJSON({query:'shirt',signal:AbortSignal.abort()}));assert.equal(calls,0);}finally{process.env=env;globalThis.fetch=f;}
});

for(const [name,body,config] of [
 ['missing',{betaCode:undefined},{}],['wrong',{betaCode:'wrong'},{}],
 ['unconfigured',{}, {MATCHLATCH_BETA_CODE:undefined}],['empty configuration',{}, {MATCHLATCH_BETA_CODE:''}],
 ['short configuration',{betaCode:'short'}, {MATCHLATCH_BETA_CODE:'short'}],
 ['non-string',{betaCode:123},{}],['oversized',{betaCode:'x'.repeat(257)},{}],
 ['whitespace altered',{betaCode:' synthetic-private-beta-only'},{}]
])test(`private beta ${name} denies AI before reserve/provider`,async()=>{
 const r=await scenario(body,{config});assert.equal(r.status,403);assert.equal(r.data.error,'Private beta access is required.');
 assert.equal(rpc(r,'reserve').length,0);assert.equal(provider(r).length,0);assert.equal(rpc(r,'meter').length,0);
 assert.equal(r.calls.filter(c=>c.url.includes('matchlatch_shopify_products?')).length,0);
});
test('explicit permitted beta code allows exactly one user-only reservation/provider/settlement',async()=>{
 const r=await scenario({betaCode:'synthetic-private-beta-only'});assert.equal(r.status,200);assert.equal(r.data.mode,'ai');
 assert.equal(rpc(r,'reserve').length,1);assert.equal(provider(r).length,1);assert.equal(rpc(r,'meter').length,1);
 assert.equal(JSON.stringify(provider(r)[0].payload).includes('synthetic-private-beta-only'),false);
 assert.equal(r.data.capabilities.photo,false);assert.equal(r.data.products[0].checkoutEnabled,false);
});
test('explicit catalog-only choice needs no beta configuration or reservation',async()=>{
 const r=await scenario({ai:false,betaCode:undefined},{config:{MATCHLATCH_BETA_CODE:undefined}});
 assert.equal(r.status,200);assert.equal(r.data.mode,'catalog');assert.equal(r.data.products.length,1);
 assert.equal(rpc(r,'reserve').length,0);assert.equal(provider(r).length,0);
});
