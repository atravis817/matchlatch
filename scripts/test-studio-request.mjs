import {test} from 'node:test';
import assert from 'node:assert/strict';
import normalizer from '../studio-request.js';
import handoff from '../studio-discovery-handoff.js';
import {researchRequest,researchInput} from '../lib/research-route.mjs';
import {requestResearch} from '../research-client.mjs';
import {POST as style} from '../api/style.mjs';
const {normalizeStudioRequest:n,studioSearchInput:resolve}=normalizer;
const manualPreferences={slot:'shoes',max:100,size:'10'};
test('prompt and manual inputs resolve to the same supported search; strict budget stays strict',()=>{
 assert.deepEqual(resolve({prompt:'white shoes under $100 size 10'}).normalized.effectiveConstraints,resolve({manualPreferences:{...manualPreferences,color:'white',max:99.99}}).normalized.effectiveConstraints);
});
test('combined explicit inputs override saved defaults and preserve provenance',()=>{
 const r=resolve({prompt:'white shoes under $100',manualPreferences:{size:'10'},savedDefaults:{max:50,size:'8',color:'black'}});
 assert.equal(r.max,99.99);assert.equal(r.size,'10');assert.equal(r.normalized.effectiveConstraints.color,'white');assert.equal(r.normalized.provenance.max,'prompt');
});
test('conflicts require an editable resolution chosen from actual explicit alternatives',()=>{
 const raw={prompt:'shoes size 10 up to $100',manualPreferences:{...manualPreferences,size:'9',max:80}};
 assert.equal(n(raw).conflicts.length,2);assert.throws(()=>resolve(raw));
 const resolved=resolve({...raw,confirmedResolutions:{size:'10',max:80}});assert.equal(resolved.size,'10');assert.equal(resolved.max,80);
 assert.throws(()=>resolve({...raw,confirmedResolutions:{size:'12',max:1000}}));
});
test('empty, rich unknown constraints, required delivery, fit and photo context block before search',()=>{
 for(const raw of [{},{prompt:'silk waterproof shoes under $100'},{manualPreferences:{...manualPreferences,needBy:'2026-12-01'}},{manualPreferences:{...manualPreferences,fit:'wide'}},{manualPreferences,photoContext:'private image'}])assert.throws(()=>resolve(raw));
 assert.throws(()=>resolve({prompt:'no shoes under $100'}));
 assert.throws(()=>resolve({prompt:'white shoes without white under $100'}));
});
test('handoff and actual research input use the shared parser with exclusions intact',()=>{
 const studioRequest={prompt:'shoes without black up to $100',manualPreferences:{size:'10'}};
 const a=handoff.handoffCombined(studioRequest),b=researchInput({studioRequest,consent:true});
 assert.equal(a.query,b.query);assert.equal(b.max,100);assert.match(b.query,/without black/);
});
test('actual research route stops conflicts before auth, quota or provider',async()=>{
 const env=process.env.VERCEL_ENV;process.env.VERCEL_ENV='preview';let calls=0;
 try{const r=await researchRequest(new Request('https://fixture.test/api/discover',{method:'POST',body:JSON.stringify({studioRequest:{prompt:'shoes size 9 up to $100',manualPreferences}})}),{authenticate:async()=>{calls++;},discover:async()=>{calls++;},limit:()=>true});assert.equal(r.status,422);
 }finally{if(env===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=env;}
 assert.equal(calls,0);
});
test('actual style route rejects unsupported combined input before catalog/model calls',async()=>{
 const env={...process.env},oldFetch=globalThis.fetch;let calls=0;
 Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic'});
 globalThis.fetch=async()=>{calls++;return Response.json({id:'fixture-user'});};
 try{const r=await style(new Request('https://fixture.test/api/style',{method:'POST',headers:{authorization:'Bearer '+ 'a'.repeat(60)},body:JSON.stringify({consent:true,studioRequest:{prompt:'silk shoes under $100'}})}));assert.equal(r.status,422);assert.equal(calls,1);}finally{process.env=env;globalThis.fetch=oldFetch;}
});
test('consumer retains original request on failure, refinement resolves afresh and sends actual supported constraints',async()=>{
 const studioRequest={prompt:'shoes size 10 up to $100',manualPreferences:{max:100,slot:'shoes'}};
 const before=JSON.stringify(studioRequest);let calls=0;
 const session=async()=>({user:{id:'one'},access_token:'fixture-token'});
 const fetcher=async(_,opts)=>{calls++;const b=JSON.parse(opts.body);assert.equal(b.size,'10');assert.equal(b.max,100);return Response.json({researchStatus:'failed_catalog_fallback'},{status:503});};
 await assert.rejects(requestResearch({studioRequest,consent:true},{session,fetcher}),/provider/);assert.equal(JSON.stringify(studioRequest),before);
 const refined={...studioRequest,prompt:'shoes size 9 up to $80',manualPreferences:{max:80,slot:'shoes'}};
 assert.equal(resolve(refined).max,80);assert.equal(resolve(refined).size,'9');assert.equal(calls,1);
});
test('actual route passes resolved budget, size and exclusions to tool path and returns provenance',async()=>{
 const env={...process.env};Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_BETA_CODE:'synthetic-beta-long-code'});
 let count=0;
 try{const r=await researchRequest(new Request('https://fixture.test/api/discover',{method:'POST',body:JSON.stringify({betaCode:'synthetic-beta-long-code',consent:true,studioRequest:{prompt:'shoes without black under $100',manualPreferences:{size:'10'},savedDefaults:{max:50}}})}),{limit:()=>true,authenticate:async()=>({user:{id:'fixture'}}),discover:async(input)=>{count++;assert.equal(input.max,99.99);assert.equal(input.size,'10');assert.equal(input.query,'shoes without black');return {research:[],researchStatus:'searched'};}});assert.equal(r.status,200);const d=await r.json();assert.equal(d.normalized.provenance.max,'prompt');assert.equal(d.canAddToCart,false);assert.equal(count,1);}finally{process.env=env;}
});
test('resolved hard constraints filter real styling candidates without relaxing budget, size or exclusions',async()=>{
 const {intentFromText,rankCandidates}=await import('../lib/styling-engine.mjs');
 const r=resolve({prompt:'shoes without black under $100 size 10'});
 const intent=intentFromText(r.query,{budget:r.max,size:r.size});
 const good={id:'good',slot:'shoes',available:true,currency:'USD',price:99.99,size:'10',color:'white',title:'White shoes',brand:'Fixture',description:'',fit:''};
 const result=rankCandidates([good,{...good,id:'expensive',price:100},{...good,id:'wrong-size',size:'9'},{...good,id:'excluded',color:'black',title:'Black shoes'}],intent);
 assert.deepEqual(result.map(p=>p.id),['good']);
});

test('Q-C7-01 subtype nouns never silently broaden even with manual/default/resolution overrides',()=>{
 for(const noun of ['polo','polos','hoodie','hoodies','jeans','boots','sneakers','blazer','beanie','tee','shorts']){
  for(const extra of [{},{manualPreferences:{slot:'shirt',max:100}},{savedDefaults:{slot:'shirt',max:100}},{confirmedResolutions:{slot:'shirt'}}]){
   const raw={prompt:`blue ${noun} size M up to $100`,...extra};
   assert.ok(n(raw).unsupportedOrUnknown.includes('unsupported_subtype:'+noun));
   assert.throws(()=>resolve(raw),/Garment subtypes/);
  }
 }
 for(const prompt of ['polo hoodie under $100','shirt polo under $100','boots loafers under $100','polo shoes under $100'])assert.throws(()=>resolve({prompt}));
 assert.equal(resolve({prompt:'blue shirts size M up to $100'}).query,'blue shirt');
});
test('Q-C7-01 actual style and research routes stop subtype before retrieval/model/assembly',async()=>{
 const env={...process.env},oldFetch=globalThis.fetch;let authCalls=0,otherCalls=0;
 Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic'});
 globalThis.fetch=async(url)=>{if(String(url)==='https://fixture.supabase.co/auth/v1/user'){authCalls++;return Response.json({id:'fixture-user'});}otherCalls++;throw Error('Unexpected downstream call');};
 try{
  for(const prompt of ['blue polo size M up to $100','blue hoodie polo size M up to $100']){
   const studioRequest={prompt};
   const result=await style(new Request('https://fixture.test/api/style',{method:'POST',headers:{authorization:'Bearer '+'a'.repeat(60)},body:JSON.stringify({consent:true,studioRequest})}));
   assert.equal(result.status,422);const body=await result.json();assert.match(body.error,/Garment subtypes/);assert.ok(body.normalized.unsupportedOrUnknown.includes('unsupported_subtype:polo'));
   const research=await researchRequest(new Request('https://fixture.test/api/discover',{method:'POST',body:JSON.stringify({consent:true,studioRequest})}),{authenticate:async()=>{otherCalls++;},discover:async()=>{otherCalls++;},limit:()=>true});
   assert.equal(research.status,422);
  }
  assert.equal(authCalls,2);assert.equal(otherCalls,0);
 }finally{process.env=env;globalThis.fetch=oldFetch;}
});


test('hard size and budget values cannot be erased, truncated or coerced by downstream routes',async()=>{
 const invalid=[...['   ','X'.repeat(41),'M\n'].map(size=>({size})),...[true,[100],{},'0x64','1e2'].map(max=>({max}))];
 const env={...process.env},oldFetch=globalThis.fetch;let auth=0,downstream=0;
 Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic'});
 globalThis.fetch=async url=>{if(String(url)==='https://fixture.supabase.co/auth/v1/user'){auth++;return Response.json({id:'fixture-user'});}downstream++;throw Error('Unexpected downstream call');};
 try{
  for(const values of invalid){
   for(const source of ['manualPreferences','savedDefaults']){
    const raw={[source]:{slot:'shirt',max:100,...values}},before=JSON.stringify(raw);
    assert.throws(()=>resolve(raw));assert.equal(JSON.stringify(raw),before);
   }
   const studioRequest={manualPreferences:{slot:'shirt',max:100,...values}};
   const body=JSON.stringify({consent:true,studioRequest});
   const research=await researchRequest(new Request('https://fixture.test/api/discover',{method:'POST',body}),{limit:()=>true,authenticate:async()=>{downstream++;},discover:async()=>{downstream++;}});
   assert.equal(research.status,422);
   const result=await style(new Request('https://fixture.test/api/style',{method:'POST',headers:{authorization:'Bearer '+'a'.repeat(60),'x-forwarded-for':'size-budget-'+auth},body}));
   assert.equal(result.status,422);
  }
  assert.equal(auth,invalid.length);assert.equal(downstream,0);
  for(const max of [100,'100','100.50']){
   const r=resolve({manualPreferences:{slot:'shirt',max,size:'M'}});
   assert.equal(r.max,Number(max));assert.equal(r.size,'M');
  }
  assert.equal(resolve({manualPreferences:{slot:'shirt',max:100,size:''}}).size,'');
 }finally{process.env=env;globalThis.fetch=oldFetch;}
});


test('DEP-UX-01 exact equal numeric/string ceiling reproducer accepts combined input',()=>{
 const raw={prompt:'blue shirt up to $100',manualPreferences:{max:'100'}};
 const before=structuredClone(raw),r=n(raw);
 assert.deepEqual(r.conflicts,[]);assert.deepEqual(r.unsupportedOrUnknown,[]);
 assert.equal(r.effectiveConstraints.max,100);assert.equal(r.provenance.max,'manual');
 assert.equal(resolve(raw).max,100);assert.deepEqual(raw,before);
});
test('DEP-UX-01 valid numeric representations share a ceiling without rounding',()=>{
 for(const max of [100,'100','100.0','100.00','0100.00',' 100 ']){
  const r=resolve({prompt:'blue shirt up to $100',manualPreferences:{max}});
  assert.equal(r.max,100);assert.equal(r.query,'blue shirt');
 }
 for(const [prompt,max] of [['shirt under $100','99.99'],['shirt up to $1','1.00'],['shirt up to $10000','10000.00']])assert.equal(resolve({prompt,manualPreferences:{max}}).max,Number(max));
 for(const max of [99.99,'99.99',100.001,'100.01',80,'80']){
  const raw={prompt:'blue shirt up to $100',manualPreferences:{max}};
  assert.deepEqual(n(raw).conflicts,[{field:'max',prompt:100,manual:max}]);assert.throws(()=>resolve(raw));
 }
});
test('DEP-UX-01 valid confirmations compare budget values; invalid coercions cannot resolve',()=>{
 const raw={prompt:'shirt up to $100',manualPreferences:{max:'80'}};
 for(const [max,expected] of [['100.00',100],[100,100],['80.00',80],[80,80]]){
  const r=resolve({...raw,confirmedResolutions:{max}});assert.equal(r.max,expected);assert.equal(r.normalized.provenance.max,'confirmedResolution');
 }
 for(const max of [true,[100],{},'1e2','0x64','100.000','101',Infinity,NaN])assert.throws(()=>resolve({...raw,confirmedResolutions:{max}}));
});
test('DEP-UX-01 malformed budgets remain guarded in combined/manual/default inputs',()=>{
 const invalid=[true,false,[100],{valueOf:()=>100},'0x64','1e2','100.000','100x','+100','100\n0','',null,undefined,NaN,Infinity,-1,0,0.99,10001,'10001','1,000'];
 for(const max of invalid){
  // Empty/null/absent manual values still mean untouched input; all other invalid values must block.
  if(max!==''&&max!=null){
   const raw={prompt:'blue shirt up to $100',manualPreferences:{max}};
   assert.throws(()=>resolve(raw),String(max));assert.ok(n(raw).conflicts.length||n(raw).unsupportedOrUnknown.length);
  }
  for(const source of ['manualPreferences','savedDefaults'])assert.throws(()=>resolve({[source]:{slot:'shirt',max}}));
 }
 for(const max of [true,[100],'1e2','100.000'])assert.throws(()=>resolve({prompt:'shirt up to $100',manualPreferences:{max},confirmedResolutions:{max}}));
});
test('DEP-UX-01 retained frozen input and downstream research/handoff use numeric ceiling',()=>{
 const raw=Object.freeze({prompt:'blue shirt up to $100',manualPreferences:Object.freeze({max:'100',size:'M'}),savedDefaults:Object.freeze({max:'50',color:'red'})});
 const before=structuredClone(raw);
 const r=resolve(raw),a=handoff.handoffCombined(raw),b=researchInput({studioRequest:raw,consent:true});
 assert.equal(r.max,100);assert.equal(a.max,100);assert.equal(b.max,100);assert.equal(b.size,'M');assert.equal(b.query,'blue shirt');assert.equal(b.consent,true);
 assert.deepEqual(raw,before);
 const conflict={...raw,manualPreferences:{max:'80'}};const retained=structuredClone(conflict);
 assert.throws(()=>resolve(conflict));assert.deepEqual(conflict,retained);
 // Other field equality remains strict; budget equivalence does not broaden size or color contracts.
 assert.throws(()=>resolve({prompt:'shirt size 10 up to $100',manualPreferences:{max:'100',size:10}}));
});
