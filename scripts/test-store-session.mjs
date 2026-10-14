import test from 'node:test';
import assert from 'node:assert/strict';
import {storeSession,checkStoreAccess} from '../store-session.mjs';
test('Store waits for existing auth initialization instead of silently searching as guest',async()=>{
 const root=new EventTarget(),session={access_token:'fixture',user:{id:'owner'}};
 const pending=storeSession({root,timeout:100});
 root.MatchlatchAuth={client:{auth:{getSession:async()=>({data:{session}})}}};root.dispatchEvent(new Event('matchlatch:auth-ready'));
 assert.equal(await pending,session);
 await assert.rejects(storeSession({root:new EventTarget(),timeout:1}),/did not initialize/);
});
test('Store distinguishes missing sessions and session errors without leaking errors',async()=>{
 const root={MatchlatchAuth:{client:{auth:{getSession:async()=>({data:{session:null}})}}}};
 assert.equal(await storeSession({root}),null);
 root.MatchlatchAuth.client.auth.getSession=async()=>({error:Error('SECRET')});
 await assert.rejects(storeSession({root}),e=>!e.message.includes('SECRET'));
 let calls=0;assert.match(await checkStoreAccess({session:null,fetcher:()=>{calls++;}}),/missing/);assert.equal(calls,0);
});
test('Both owner checks use the same session and diagnose mismatched route authorization',async()=>{
 for(const enabled of [true,false]){
  const calls=[];const text=await checkStoreAccess({session:{access_token:'PRIVATE_TOKEN'},fetcher:async(url,options)=>{calls.push({url,options});return Response.json(url.includes('admin')?{commandCenter:true}:{ownerEvaluation:enabled});}});
  assert.equal(calls.length,2);assert.equal(calls[0].options,calls[1].options);assert.equal(calls[0].options.headers.Authorization,'Bearer PRIVATE_TOKEN');assert.equal(calls[0].options.credentials,'same-origin');assert.ok(!text.includes('PRIVATE_TOKEN'));assert.match(text,enabled?/Ready for a product search/:/API routes disagree/);
 }
});
test('Owner denial and transport failures never claim product availability',async()=>{
 assert.match(await checkStoreAccess({session:{access_token:'x'},fetcher:async()=>new Response('',{status:403})}),/not accepted/);
 assert.match(await checkStoreAccess({session:{access_token:'x'},fetcher:async()=>{throw Error('SECRET');}}),/could not be reached/);
});
