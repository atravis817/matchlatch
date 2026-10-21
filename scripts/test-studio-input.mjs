import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../studio-input.js',import.meta.url),'utf8'),context);
const create=()=>context.MatchlatchStudioInput.create();
const envelope=(changes={})=>({prompt:'',photoContext:null,manualPreferences:{},savedDefaults:{},confirmedResolutions:{},...changes});
const result=(changes={})=>({effectiveConstraints:{budget:100},softPreferences:{style:'Casual'},conflicts:[],unsupportedOrUnknown:[],provenance:{budget:'manual'},...changes});
const plain=v=>JSON.parse(JSON.stringify(v));
test('unconfigured normalization blocks requests and preserves original combined inputs',async()=>{
 const c=create(),input=envelope({prompt:'No red',manualPreferences:{budget:'100'}});c.update(input);
 await assert.rejects(c.review(),/unavailable/);assert.deepEqual(plain(c.snapshot()),input);
 await assert.rejects(c.submit(),/Review/);
});
for(const [name,input] of Object.entries({prompt:envelope({prompt:'No red under $100'}),manual:envelope({manualPreferences:{budget:'100'}}),combined:envelope({prompt:'No red',manualPreferences:{budget:'100'}})})){
 test(`${name} passes the exact envelope to the owner normalizer and owner transport after review`,async()=>{
  const c=create();let calls=0,seen;
  c.configure({normalize:async value=>{assert.deepEqual(plain(value),input);return result();},submit:async(value,normalized)=>{calls++;seen=value;assert.deepEqual(plain(normalized),result());return {products:[],message:'No matches'};}});
  c.update(input);await assert.rejects(c.submit(),/Review/);await c.review();assert.equal(calls,0);assert.equal((await c.submit()).message,'No matches');assert.equal(calls,1);assert.deepEqual(plain(seen),input);
 });
}
test('explicit contradictions and unsupported material requirements never reach transport',async()=>{
 for(const blocked of [{conflicts:[{message:'Budget differs'}]},{unsupportedOrUnknown:[{message:'Cannot verify delivery'}]}]){
  const c=create();let calls=0;c.configure({normalize:()=>result(blocked),submit:()=>{calls++;}});c.update(envelope({prompt:'Budget $90, tomorrow',manualPreferences:{budget:'120'}}));await c.review();await assert.rejects(c.submit(),/Clarify/);assert.equal(calls,0);assert.equal(c.snapshot().manualPreferences.budget,'120');
 }
});
test('defaults, current overrides and confirmed resolutions remain separate; refinement requires fresh review',async()=>{
 const c=create(),seen=[];c.configure({normalize:input=>{seen.push(input);return result();},submit:()=>({products:[]})});
 const input=envelope({manualPreferences:{budget:'100'},savedDefaults:{budget:'200',fit:'Relaxed'},confirmedResolutions:{budget:'100'}});c.update(input);await c.review();await c.submit();
 input.manualPreferences.budget='80';c.update(input);await assert.rejects(c.submit(),/Review/);await c.review();assert.equal(seen[1].manualPreferences.budget,'80');assert.equal(seen[1].savedDefaults.budget,'200');
});
test('empty input and malformed normalization stop honestly',async()=>{
 const c=create();c.configure({normalize:()=>result(),submit:()=>{throw Error('must not call');}});await assert.rejects(c.review(),/Describe/);
 c.configure({normalize:()=>({}),submit:()=>{}});c.update(envelope({prompt:'An outfit'}));await assert.rejects(c.review(),/couldn’t check/);
});
test('provider failure retains prompt/photo/manual state and allows an explicit retry',async()=>{
 const c=create(),input=envelope({prompt:'An outfit',photoContext:{useUploadedPhoto:true},manualPreferences:{budget:'100'}});let calls=0;
 c.configure({normalize:()=>result(),submit:()=>{calls++;throw new TypeError('Provider unavailable');}});c.update(input);await c.review();await assert.rejects(c.submit(),/Provider/);assert.deepEqual(plain(c.snapshot()),input);await assert.rejects(c.submit(),/Provider/);assert.equal(calls,2);
});
test('changed inputs and account clearing reject late work and clear private input state',async()=>{
 const c=create();let resolve;c.configure({normalize:()=>new Promise(r=>resolve=r),submit:()=>({})});c.update(envelope({prompt:'Private outfit'}));const pending=c.review();c.clear();resolve(result());await assert.rejects(pending,/changed/);assert.deepEqual(plain(c.snapshot()),envelope());
});
test('duplicate submit is suppressed and late submitted result cannot cross a refinement',async()=>{
 const c=create();let resolve,calls=0;c.configure({normalize:()=>result(),submit:()=>{calls++;return new Promise(r=>resolve=r);}});c.update(envelope({prompt:'Outfit'}));await c.review();const pending=c.submit();await assert.rejects(c.submit(),/already/);c.update(envelope({prompt:'Different outfit'}));resolve({products:[]});await assert.rejects(pending,/changed/);assert.equal(calls,1);
});
