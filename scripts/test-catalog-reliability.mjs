import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {feedFreshness} from '../lib/feed-freshness.mjs';
import {productHash,contentHash} from './awin-bulk.mjs';
import {POST,GET} from '../api/catalog-refresh.mjs';
test('repeat source checks cannot renew stale inventory evidence',()=>{
 const source='2026-10-10T09:00:00Z';const a=feedFreshness(source,'2026-10-10T10:00:00Z'),b=feedFreshness(source,'2026-10-11T10:00:00Z');
 assert.notEqual(a.source_checked_at,b.source_checked_at);assert.equal(a.valid_until,b.valid_until);assert.equal(b.valid_until,'2026-10-11T09:00:00.000Z');assert.equal(b.retailer_independently_verified,false);
 assert.throws(()=>feedFreshness('invalid'));assert.throws(()=>feedFreshness('2026-10-12','2026-10-10'));
});
test('content identity separates source revision and check times from price and stock',()=>{
 const product={price_usd:99,available:true,source_updated_at:'a'};
 assert.equal(contentHash(product),contentHash({...product,source_updated_at:'b',source_checked_at:'b',content_changed_at:'b'}));
 assert.notEqual(productHash(product),productHash({...product,source_updated_at:'b'}));
 assert.notEqual(contentHash(product),contentHash({...product,price_usd:100}));assert.notEqual(contentHash(product),contentHash({...product,available:false}));
});
test('refresh writes fail closed until approved, authentication precedes gate',async()=>{
 const env={...process.env},f=globalThis.fetch;Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_REFRESH_SECRET:'fixture-refresh'});delete process.env.MATCHLATCH_REFRESH_WRITES_ENABLED;
 try{globalThis.fetch=()=>{throw Error('No feed or DB calls permitted');};assert.equal((await GET()).status,405);assert.equal((await POST(new Request('https://fixture.test/api/catalog-refresh',{method:'POST'}))).status,401);assert.equal((await POST(new Request('https://fixture.test/api/catalog-refresh',{method:'POST',headers:{authorization:'Bearer fixture-refresh'}}))).status,503);process.env.VERCEL_ENV='production';assert.equal((await POST(new Request('https://fixture.test/api/catalog-refresh',{method:'POST'}))).status,503);}finally{process.env=env;globalThis.fetch=f;}
});
test('workflow never writes on push and defaults dispatch to dry run',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/awin-preview-refresh.yml',import.meta.url),'utf8');assert.ok(!/^  push:/m.test(workflow));assert.match(workflow,/default: false/);assert.match(workflow,/if: inputs.write == true/);assert.match(workflow,/cancel-in-progress: false/);
});
test('same-runtime overlapping refresh is rejected before a second feed request',async()=>{
 const env={...process.env},f=globalThis.fetch,log=console.error;let rejectDownload,calls=0;
 Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_REFRESH_SECRET:'fixture-refresh',MATCHLATCH_REFRESH_WRITES_ENABLED:'true',MATCHLATCH_CATALOG_WRITES_APPROVED:'true',MATCHLATCH_FEED_FRESHNESS_V2:'true',AWIN_PRODUCT_FEED_API_KEY:'FAKE_TEST_KEY'});
 try{
  console.error=()=>{};globalThis.fetch=()=>{calls++;return new Promise((_,reject)=>{rejectDownload=reject;});};
  const req=()=>new Request('https://fixture.test/api/catalog-refresh',{method:'POST',headers:{authorization:'Bearer fixture-refresh'}});
  const first=POST(req());assert.equal((await POST(req())).status,409);assert.equal(calls,1);rejectDownload(Error('Fixture download failure'));assert.equal((await first).status,502);
 }finally{process.env=env;globalThis.fetch=f;console.error=log;}
});
test('bootstrap and cost-control SQL preserve a complete UTC month with 90-day retention',()=>{
 for(const file of ['catalog_private_refresh.sql','catalog_ai_cost_controls.sql']){
  const sql=readFileSync(new URL('../supabase/'+file,import.meta.url),'utf8');assert.match(sql,/delete from public\.matchlatch_ai_usage where created_at<now\(\)-interval '90 days'/);assert.ok(!sql.includes("interval '7 days'"));
 }
});
