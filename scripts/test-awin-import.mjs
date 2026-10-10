// Synthetic contract tests. These do not prove real feed access or write a database.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {gzipSync} from 'node:zlib';
import {csv,feedKey,fetchCSV,safeError} from './awin-feed-utils.mjs';
import {mapProduct,run,validateProduct} from './awin-import.mjs';
import {ACCESSIBLE_TEST_SOURCES} from './awin-test-sources.mjs';
const product={merchant_id:'117849',merchant_product_id:'SKU-1',aw_product_id:'AW-1',product_name:'Cotton Oxford Shirt',merchant_category:'Shirts',search_price:'39.95',currency:'USD',merchant_image_url:'https://images.example.test/shirt.png',merchant_deep_link:'https://zazzmode.com/products/shirt',aw_deep_link:'https://www.awin1.com/cread.php?awinmid=117849&awinaffid=3118944','Fashion:size':'M',in_stock:'in_stock'};
const encode=rows=>rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n');
const list=(membership='Joined',id=117849)=>encode([['Advertiser ID','Advertiser Name','Membership Status','Feed ID','URL'],[id,'Test retailer',membership,42,'https://datafeed.api.productserve.com/datafeed/download/apikey/FAKE_TEST_KEY/fid/42']]);
const feed=()=>{
 const keys=Object.keys(product);const values=Array.from({length:30},(_,i)=>({...product,merchant_product_id:'SKU-'+i,aw_product_id:'AW-'+i}));
 values.push(values[0],{...product,merchant_id:'99999',aw_product_id:'OTHER'});
 return encode([keys,...values.map(row=>keys.map(key=>row[key]))]);
};
async function isolated(callback){
 const originalFetch=globalThis.fetch;const originalEnv={...process.env};const originalLog=console.log;
 process.env.AWIN_PRODUCT_FEED_API_KEY='https://datafeed.api.productserve.com/datafeed/download/apikey/FAKE_TEST_KEY/';
 process.env.AWIN_IMPORT_LIMIT='25';process.env.MATCHLATCH_SUPABASE_URL='https://fixture.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='FAKE_TEST_WRITER';
 console.log=()=>{};
 try{return await callback();}finally{globalThis.fetch=originalFetch;process.env=originalEnv;console.log=originalLog;}
}
test('keys and feed URLs normalize without accepting an untrusted credential host',()=>{
 assert.equal(feedKey('  FAKE_TEST_KEY  '),'FAKE_TEST_KEY');
 assert.equal(feedKey('https://productdata.awin.com/datafeed/list/apikey/FAKE_TEST_KEY'),'FAKE_TEST_KEY');
 assert.throws(()=>feedKey('https://attacker.example/apikey/FAKE_TEST_KEY'),/Unsupported/);
 assert.throws(()=>feedKey('https://user:pass@productdata.awin.com/apikey/FAKE_TEST_KEY'),/Unsupported/);
 assert.throws(()=>feedKey(' '),/Missing/);
});
test('CSV handles commas, escaped quotes, newlines and rejects truncation',()=>{
 assert.deepEqual(csv('id,name\r\n1,"Shirt, \"\"Olive\"\"\nCotton"\r\n'),[['id','name'],['1','Shirt, "Olive"\nCotton']]);
 assert.throws(()=>csv('id,name\n1,"unfinished'),/Unterminated/);
});
test('GZIP, byte bounds and malformed row rejection',()=>isolated(async()=>{
 globalThis.fetch=async()=>new Response(gzipSync('ID,Name\n1,Shirt\n'));
 const parsed=await fetchCSV('https://fixture.example/feed');assert.equal(parsed.compression,'gzip');assert.equal(parsed.rows[0].name,'Shirt');
 await assert.rejects(fetchCSV('https://fixture.example/feed',{maxCompressedBytes:2}),/byte limit/);
 globalThis.fetch=async()=>new Response('ID,Name\n1\n');await assert.rejects(fetchCSV('https://fixture.example/feed'),/column count/);
}));
test('mapping preserves private flags, fashion size and known stock values; validates attribution',()=>{
 const row=Object.fromEntries(Object.entries(product).map(([k,v])=>[k.toLowerCase().replace(/[^a-z0-9]/g,''),v]));
 const mapped=mapProduct(row,117849,'ZazzMode');assert.equal(mapped.size,'M');assert.equal(mapped.price_usd,39.95);assert.equal(mapped.available,true);assert.equal(mapped.is_public,false);assert.equal(mapped.shipping_us_eligible,false);
 assert.equal(mapProduct({...row,awdeeplink:row.awdeeplink.replace('3118944','123')},117849,'ZazzMode'),null);
 assert.equal(mapProduct({...row,merchantdeeplink:'https://zazzmode.com.attacker.example/shirt'},117849,'ZazzMode'),null);
 assert.equal(mapProduct({...row,currency:'EUR'},117849,'ZazzMode'),null);
 assert.equal(mapProduct(row,99999,'Other'),null);
 assert.equal(mapProduct({...row,instock:'out_of_stock'},117849,'ZazzMode').available,false);
});
test('dry run selects 25 unique private rows, reports duplicates, never posts',()=>isolated(async()=>{
 const methods=[];globalThis.fetch=async(url,options)=>{methods.push(options?.method||'GET');assert.equal(options.redirect,'error');return new Response(String(url).includes('/list/')?list():gzipSync(feed()));};
 const result=await run({write:false});assert.equal(result.eligible_products,25);assert.equal(result.feeds[0].duplicates,1);assert.equal(result.feeds[0].rejected.advertiser_mismatch,1);assert.equal(result.public_products_created,0);assert.ok(!methods.includes('POST'));
}));
test('empty or unapproved discovery cannot write even with --write requested',()=>isolated(async()=>{
 let posts=0;globalThis.fetch=async(_url,options)=>{if(options?.method==='POST')posts++;return new Response(list('Not Joined',99999));};
 await assert.rejects(run({write:true}),/No eligible feeds/);assert.equal(posts,0);
}));
test('synthetic write is limited to 25 and every payload stays private',()=>isolated(async()=>{
 let posted;globalThis.fetch=async(url,options)=>{
  if(options?.method==='POST'){posted=JSON.parse(options.body);return new Response(null,{status:204});}
  return new Response(String(url).includes('/list/')?list():feed());
 };
 await run({write:true});assert.equal(posted.length,25);assert.ok(posted.every(row=>row.is_public===false&&row.shipping_us_eligible===false&&row.advertiser_id===117849));
}));
test('errors redact the configured URL and extracted key',()=>isolated(async()=>{
 const message=safeError(Error('Credential FAKE_TEST_KEY '+process.env.AWIN_PRODUCT_FEED_API_KEY));assert.ok(!message.includes('FAKE_TEST_KEY'));assert.ok(!message.includes('https://'));
}));
test('accessible test source validates exact advertiser, merchant and USD without expanding public candidates',()=>{
 const source=ACCESSIBLE_TEST_SOURCES[0];
 const row=Object.fromEntries(Object.entries({...product,merchant_id:'116479',merchant_deep_link:'https://watchesofusa.com/products/watch',aw_deep_link:'https://www.awin1.com/pclick.php?p=123&a=3118944&m=116479',product_name:'Steel Watch',merchant_category:'Watches'}).map(([key,value])=>[key.toLowerCase().replace(/[^a-z0-9]/g,''),value]));
 assert.equal(validateProduct(row,116479,'Watches Of USA').product,null);
 assert.equal(validateProduct(row,116479,'Watches Of USA',{...source}).product,null);
 assert.equal(validateProduct(row,116479,'Watches Of USA',source).product.is_public,false);
 assert.equal(validateProduct({...row,currency:'GBP'},116479,'Watches Of USA',source).product,null);
});
test('accessible feed import requires Preview, exact feed ID and recent timestamp; keeps partner disabled',()=>isolated(async()=>{
 await assert.rejects(run({accessibleTestFeeds:true}),/Preview/);
 process.env.VERCEL_ENV='preview';
 const row={...product,merchant_id:'116479',merchant_deep_link:'https://watchesofusa.com/products/watch',aw_deep_link:'https://www.awin1.com/pclick.php?p=123&a=3118944&m=116479',product_name:'Steel Watch',merchant_category:'Watches'};
 const listing=(feedId='102556',timestamp=new Date().toISOString().slice(0,19).replace('T',' '))=>encode([['Advertiser ID','Advertiser Name','Membership Status','Feed ID','Last Imported','URL'],[116479,'Watches Of USA','Not Joined',feedId,timestamp,'https://datafeed.api.productserve.com/datafeed/download/apikey/FAKE_TEST_KEY/fid/'+feedId]]);
 let posts=[];let directory=listing();
 globalThis.fetch=async(url,options)=>{
  if(options?.method==='POST'){posts.push({url,payload:JSON.parse(options.body)});return new Response(null,{status:204});}
  return new Response(String(url).includes('/list/')?directory:encode([Object.keys(row),Object.values(row)]));
 };
 const dry=await run({accessibleTestFeeds:true,write:false});assert.equal(dry.eligible_products,1);assert.equal(posts.length,0);
 await run({accessibleTestFeeds:true,write:true});assert.equal(posts.length,2);assert.equal(posts[0].payload.membership_status,'not_joined');assert.equal(posts[0].payload.browse_enabled,false);assert.equal(posts[0].payload.checkout_enabled,false);assert.equal(posts[1].payload[0].is_public,false);
 posts=[];directory=listing('999');await assert.rejects(run({accessibleTestFeeds:true,write:true}),/No eligible feeds/);assert.equal(posts.length,0);
 directory=listing('102556','2000-01-01 00:00:00');await assert.rejects(run({accessibleTestFeeds:true,write:true}),/downloads failed/);assert.equal(posts.length,0);
}));
