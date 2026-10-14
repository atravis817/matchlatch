import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminAuth} from '../lib/shopify-admin-auth.mjs';
import {STORE_DOMAIN} from '../lib/shopify-storefront-adapter.mjs';
const env={SHOPIFY_STORE_DOMAIN:STORE_DOMAIN,SHOPIFY_CLIENT_ID:'synthetic-id',SHOPIFY_CLIENT_SECRET:'synthetic-secret'};
const reply=(extra={})=>Response.json({access_token:'synthetic-token',expires_in:86400,scope:'read_products,read_inventory',...extra});
test('exchange uses fixed HTTPS endpoint; caches, single-flights and renews before expiry',async()=>{
 let clock=0,calls=0;const auth=createAdminAuth({env,now:()=>clock,fetcher:async(url,options)=>{calls++;assert.equal(url,`https://${STORE_DOMAIN}/admin/oauth/access_token`);assert.equal(options.redirect,'error');assert.equal(new URLSearchParams(options.body).get('grant_type'),'client_credentials');return reply();}});
 assert.deepEqual(await Promise.all([auth.token(),auth.token()]),['synthetic-token','synthetic-token']);assert.equal(calls,1);clock=86341000;await auth.token();assert.equal(calls,2);auth.invalidate('synthetic-token');await auth.token();assert.equal(calls,3);
});
test('fails closed on scope expansion/missing scopes, expiry, malformed and oversized responses',async()=>{
 for(const response of [reply({scope:'read_products'}),reply({scope:'read_products,read_inventory,write_products'}),reply({expires_in:0}),reply({expires_in:86401}),new Response('{'),new Response('x'.repeat(17000)),new Response('synthetic-secret',{status:401})]){
  const auth=createAdminAuth({env,fetcher:async()=>response});await assert.rejects(auth.token(),{message:'shopify_app_authentication_failed'});
 }
});
test('transport errors never expose credentials and failures can retry later',async()=>{
 let calls=0;const auth=createAdminAuth({env,fetcher:async()=>{if(!calls++)throw Error('synthetic-secret');return reply();}});await assert.rejects(auth.token(),{message:'shopify_app_authentication_failed'});assert.equal(await auth.token(),'synthetic-token');
});
test('invalid hosts, partial and ambiguous credentials rejected; legacy compatible',async()=>{
 for(const bad of [{...env,SHOPIFY_STORE_DOMAIN:'evil.test'},{...env,SHOPIFY_CLIENT_SECRET:''},{...env,SHOPIFY_ADMIN_READ_TOKEN:'synthetic-legacy'}])assert.throws(()=>createAdminAuth({env:bad}),/configuration_unavailable/);
 const auth=createAdminAuth({env:{SHOPIFY_STORE_DOMAIN:STORE_DOMAIN,SHOPIFY_ADMIN_READ_TOKEN:'synthetic-legacy'},fetcher:()=>assert.fail()});assert.equal(await auth.token(),'synthetic-legacy');
});

test('reader renews once on 401 and stops repeated authentication failures',async()=>{
 const {createShopifyReader}=await import('../lib/shopify-sync.mjs');let tokens=0,reads=0;
 const reader=createShopifyReader({env:{...env,SHOPIFY_ADMIN_API_VERSION:'2026-10'},fetcher:async url=>{if(url.endsWith('access_token')){tokens++;return reply();}reads++;return new Response('',{status:401});}});
 await assert.rejects(reader.page({mode:'full'}),/provider_access_denied/);assert.equal(tokens,2);assert.equal(reads,2);
});
test('auth diagnostic remains closed in Production and without owner authorization',async()=>{
 const {GET}=await import('../lib/shopify-sync-route.mjs');const old=process.env.VERCEL_ENV;
 try{process.env.VERCEL_ENV='production';assert.equal((await GET(new Request('https://example.test/api/admin-summary?action=shopify-sync-auth'))).status,404);process.env.VERCEL_ENV='preview';assert.equal((await GET(new Request('https://example.test/api/admin-summary?action=shopify-sync-auth'))).status,503);}finally{if(old===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=old;}
});
