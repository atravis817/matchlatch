import test from 'node:test';
import assert from 'node:assert/strict';
import {createSyncStore,syncConfigurationDiagnostics} from '../lib/shopify-sync-store.mjs';

const destination='https://lqxeizvrdxuhzvipmlkl.supabase.co';
const env={VERCEL_ENV:'preview',MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL:destination,MATCHLATCH_SHOPIFY_PREVIEW_SERVICE_KEY:'synthetic-server-key'};

test('sync rejects unapproved Supabase destinations before reads or durable RPCs',()=>{
 let calls=0;
 const fetcher=async()=>{calls++;throw Error('transport must remain unused');};
 for(const base of ['https://other-preview.supabase.co','https://odxqxymwlwnbqginqems.supabase.co','https://lqxeizvrdxuhzvipmlkl.supabase.co.evil.test','http://lqxeizvrdxuhzvipmlkl.supabase.co',destination+'/']){
  const config={...env,MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL:base};
  assert.equal(syncConfigurationDiagnostics(config).configurationGuardPassed,false,base);
  assert.throws(()=>createSyncStore({env:config,fetcher}),/isolated_preview_database_required/,base);
 }
 assert.equal(calls,0);
});

test('exact approved destination retains counts and durable worker RPC transport',async()=>{
 const calls=[];
 const store=createSyncStore({env,fetcher:async(url,options)=>{
  calls.push({url,options});
  return Response.json(url.includes('/rpc/matchlatch_shopify_sync')?{status:'paused'}:[]);
 }});
 await store.status();
 await store.claim({shop:'pfcdgt-is.myshopify.com',worker:'synthetic'});
 assert.equal(calls.length,4);
 assert.ok(calls.every(c=>new URL(c.url).origin===destination));
 const call=calls[3];
 assert.equal(call.options.redirect,'error');
 assert.equal(call.options.cache,'no-store');
 assert.equal(JSON.parse(call.options.body).p_action,'claim');
});

test('approved destination still denies Production, auth collisions and missing keys',()=>{
 for(const patch of [{VERCEL_ENV:'production'},{MATCHLATCH_SUPABASE_URL:destination},{SUPABASE_URL:destination},{MATCHLATCH_SHOPIFY_PREVIEW_SERVICE_KEY:''}]){
  assert.throws(()=>createSyncStore({env:{...env,...patch}}),/isolated_preview_database_required/);
 }
});
