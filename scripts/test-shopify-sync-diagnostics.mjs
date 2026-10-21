import test from 'node:test';
import assert from 'node:assert/strict';
import {syncConfigurationDiagnostics,createSyncStore} from '../lib/shopify-sync-store.mjs';
const base='https://lqxeizvrdxuhzvipmlkl.supabase.co';
const key='synthetic.'+Buffer.from(JSON.stringify({role:'service_role',ref:'lqxeizvrdxuhzvipmlkl'})).toString('base64url')+'.synthetic';
const env={VERCEL_ENV:'preview',MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL:base,MATCHLATCH_SHOPIFY_PREVIEW_SERVICE_KEY:key};
test('diagnostics contain booleans only, no credential or destination strings',()=>{
 const d=syncConfigurationDiagnostics(env);assert.ok(Object.values(d).every(v=>typeof v==='boolean'));assert.equal(d.configurationGuardPassed,true);assert.equal(d.keyProjectMatches,true);assert.equal(d.legacyServiceRoleKey,true);assert.ok(!JSON.stringify(d).includes(key));assert.ok(!JSON.stringify(d).includes(base));
});
test('existing isolation guards fail closed, including customer auth alias',()=>{
 for(const patch of [{VERCEL_ENV:'production'},{MATCHLATCH_SHOPIFY_PREVIEW_SERVICE_KEY:''},{MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL:'https://odxqxymwlwnbqginqems.supabase.co'},{MATCHLATCH_SUPABASE_URL:base},{SUPABASE_URL:base}])assert.throws(()=>createSyncStore({env:{...env,...patch}}),/isolated_preview_database_required/);
});
test('postguard REST failures are distinguished without provider text or secrets',async()=>{
 for(const status of [401,403,404,500]){const store=createSyncStore({env,fetcher:async()=>new Response(key,{status})});await assert.rejects(store.status(),e=>{assert.equal(e.message,'sync_database_unavailable');assert.equal(e.diagnostics.databaseUnauthorized,status===401);assert.ok(!JSON.stringify(e).includes(key));return true;});}
});
test('read-only status succeeds with empty tables and zero counts',async()=>{
 const calls=[];const store=createSyncStore({env,fetcher:async(url,options)=>{calls.push({url,method:options.method});return Response.json(url.includes('/rpc/')?{totalProducts:0,totalVariants:0,public:0}:[]);}});const result=await store.status();assert.equal(result.counts.totalVariants,0);assert.equal(calls.length,3);assert.ok(calls.every(x=>!x.url.includes('matchlatch_shopify_sync?')));
});
