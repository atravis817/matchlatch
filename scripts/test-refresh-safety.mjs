// Contract tests use synthetic products and intercepted RPCs, never a live DB.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bulkWrite,contentHash,contentOutcome,importBound} from './awin-bulk.mjs';
const product={advertiser_id:116479,source_variant_id:'fixture-1',price_usd:50,available:true,is_public:false,shipping_us_eligible:false};
test('hash initialization reports baseline separately; actual price and category corrections count as updates',()=>{
 assert.equal(contentOutcome(null,product),'inserted');assert.equal(contentOutcome(product,product),'initialized');
 assert.equal(contentOutcome(product,{...product,price_usd:60}),'updated');assert.equal(contentOutcome(product,{...product,slot:'watch'}),'updated');
 assert.equal(contentOutcome({...product,content_hash:contentHash(product)},product),'unchanged');
 assert.equal(contentHash(product),contentHash({...product,shipping_us_eligible:true,is_public:true,source_checked_at:'later'}));
});
test('bounds reject zero, fractions, excess and invalid values instead of clamping',()=>{
 for(const n of [0,-1,900,1.1,'no',Infinity])assert.throws(()=>importBound(n,25));
 assert.equal(importBound(undefined,25),25);assert.equal(importBound('899',25),899);
});
test('25-row sample uses only v2 RPCs, does not reconcile 874 omitted records, and stays bounded',async()=>{
 const env={...process.env},fetch=globalThis.fetch,log=console.log,calls=[];
 Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_CATALOG_WRITES_APPROVED:'true',MATCHLATCH_FEED_FRESHNESS_V2:'true',MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture-not-secret'});
 try{
  console.log=()=>{};globalThis.fetch=async(url,options)=>{const name=String(url).split('/').pop(),body=JSON.parse(options.body);calls.push({name,body});if(name==='matchlatch_awin_begin_v2')return Response.json({run_id:'fixture-run',next_batch:0});return Response.json({removed:0});};
  const rows=Array.from({length:25},(_,i)=>({...product,source_variant_id:'fixture-'+i}));
  const feeds=[{advertiser_id:116479,feed_id:'102556',last_imported:'2026-10-11 01:00:00',source_checked_at:'2026-10-11T02:00:00Z'}];
  await bulkWrite(rows,feeds,{batchSize:10});
  assert.deepEqual(calls.map(c=>c.name),['matchlatch_awin_begin_v2','matchlatch_awin_batch_v2','matchlatch_awin_batch_v2','matchlatch_awin_batch_v2','matchlatch_awin_finish_v2']);
  assert.deepEqual(calls.filter(c=>c.body.p_products).map(c=>c.body.p_products.length),[10,10,5]);assert.equal(calls.at(-1).body.p_valid_ids.length,25);
  assert.ok(calls.filter(c=>c.body.p_products).every(c=>c.body.p_products.every(p=>p.is_public===false&&p.shipping_us_eligible===false)));
  const before=calls.length;
  await assert.rejects(bulkWrite(rows,feeds,{reconcile:true}),/reconciliation is disabled/);
  await assert.rejects(bulkWrite(rows,feeds,{resumeId:'legacy-run'}),/resume is disabled/);
  await assert.rejects(bulkWrite([...rows,rows[0]],feeds),/Duplicate/);
  await assert.rejects(bulkWrite(rows,feeds,{signal:AbortSignal.abort()}));assert.equal(calls.length,before);
 }finally{process.env=env;globalThis.fetch=fetch;console.log=log;}
});
test('SQL proposal preserves qualification/public flags on conflict, isolates v2 receipts, and has no removal or partner mutations',()=>{
 const sql=readFileSync(new URL('../supabase/PROPOSED_feed_freshness_v2.sql',import.meta.url),'utf8');
 const conflict=sql.split('on conflict(advertiser_id,source_variant_id) do update set')[1].split('returning')[0];
 assert.ok(!/shipping_us_eligible\s*=|is_public\s*=/.test(conflict));
 assert.match(sql,/Published records excluded/);assert.match(sql,/pipeline_version is distinct from 2/);assert.match(sql,/Receipt payload mismatch/);
 assert.match(sql,/initialized=initialized\+nh/);assert.match(sql,/least\(r.batch_size,r.total-p_batch\*r.batch_size\)/);
 assert.ok(!/update public\.matchlatch_awin_partners|set available=false|delete from public\.matchlatch_awin_products/i.test(sql));
 assert.match(sql,/lock_timeout='3s'/);assert.match(sql,/Unexpected product changes/);assert.match(sql,/Unexpected security or trigger changes/);
});
test('rollback is idempotent, keeps evidence, and refuses running imports',()=>{
 const sql=readFileSync(new URL('../supabase/PROPOSED_feed_freshness_v2_ROLLBACK.sql',import.meta.url),'utf8');assert.equal((sql.match(/drop function if exists/g)||[]).length,3);assert.match(sql,/Resolve running imports/);assert.ok(!/drop column|cascade|delete from/i.test(sql));assert.match(sql,/Rollback function removal failed/);
});
