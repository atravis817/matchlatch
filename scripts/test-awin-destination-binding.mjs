import {mapFeedRow} from './sync-awin-feeds.mjs';
import {CANDIDATES} from '../lib/awin-retailers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {affiliateAllowed,validateProduct} from '../scripts/awin-import.mjs';
import {mapCatalog,retrieveCatalog} from '../lib/catalog-server.mjs';
import {mapProduct,searchAwin,verifyAwin} from '../lib/awin-public-catalog.mjs';
import {validateTrackingLink} from '../lib/awin-commerce.mjs';
const publisher='3118944',advertiserId=117849,destination='https://zazzmode.com/products/fixture?variant=11';
const link=(path='/cread.php',params={awinmid:String(advertiserId),awinaffid:publisher,ued:destination},host='www.awin1.com')=>'https://'+host+path+'?'+new URLSearchParams(params);
const normal=link();
const row=url=>({advertiser_id:advertiserId,source_product_id:'fixture',source_variant_id:'11',slot:'shirt',title:'Synthetic shirt',price_usd:20,currency:'USD',available:true,is_public:true,shipping_us_eligible:true,feed_imported_at:new Date().toISOString(),source_updated_at:new Date().toISOString(),valid_until:new Date(Date.now()+3600000).toISOString(),image_url:'https://images.example/fixture.jpg',product_url:destination,merchant_host:'zazzmode.com',affiliate_url:url});
const feed=url=>({merchantproductid:'fixture',awproductid:'11',productname:'Synthetic shirt',searchprice:'20',merchantcategory:'shirt',awimageurl:'https://images.example/fixture.jpg',merchantdeeplink:destination,awdeeplink:url,currency:'USD',instock:'yes',merchantid:String(advertiserId)});
const consumers=url=>[affiliateAllowed(url,advertiserId,destination),Boolean(validateProduct(feed(url),advertiserId,'Synthetic').product),Boolean(mapCatalog(row(url))),Boolean(mapProduct(row(url))),Boolean(validateTrackingLink(url,{publisher,advertiserId,destination}))];
for(const [name,url] of [
 ['canonical',normal],['legacy pclick a/m',link('/pclick.php',{a:publisher,m:String(advertiserId),ued:destination,p:'123'})],
 ['legacy awclick id/mid',link('/awclick.php',{id:publisher,mid:String(advertiserId),ued:destination})],
 ['legacy cread a/m',link('/cread.php',{a:publisher,m:String(advertiserId),ued:destination})],
 ['distinct agreeing aliases',normal+'&mid='+advertiserId+'&id='+publisher+'&m='+advertiserId+'&a='+publisher],
])test('transparent compatibility: '+name,()=>{assert.deepEqual(consumers(url),[true,true,true,true,true]);const item=mapProduct(row(url));assert.equal(item.variantId,'awin:117849:11');assert.equal(item.productId,'awin:117849:fixture');assert.equal(item.merchantProductUrl,destination);assert.equal(item.url,new URL(url).href);assert.equal(item.checkoutUrl,'');assert.equal(item.price,20);});
const invalid=[
 ['opaque',link('/pclick.php',{a:publisher,m:String(advertiserId)})],
 ['wrong host',link('/cread.php',{awinmid:String(advertiserId),awinaffid:publisher,ued:'https://other.example/item'})],
 ['wrong path',normal.replace(encodeURIComponent(destination),encodeURIComponent('https://zazzmode.com/products/other?variant=11'))],
 ['wrong variant',normal.replace('variant%3D11','variant%3D12')],
 ['duplicate publisher',normal+'&awinaffid='+publisher],['duplicate merchant',normal+'&m=117849&m=117849'],
 ['conflicting publisher',normal+'&id=999'],['conflicting legacy publisher',normal+'&a=999'],['conflicting merchant',normal+'&m=999'],
 ['empty alias',normal+'&a='],['duplicate destination',normal+'&ued='+encodeURIComponent(destination)],
 ['nested URL',link('/cread.php',{awinmid:String(advertiserId),awinaffid:publisher,ued:'https://zazzmode.com/products/fixture?next=https://evil.example'})],
 ['account URL',link('/cread.php',{awinmid:String(advertiserId),awinaffid:publisher,ued:'https://zazzmode.com/account'})],
 ['wrong publisher',normal.replace(publisher,'999')],['unknown path',link('/unknown')],['subdomain',link('/cread.php',undefined,'sub.awin1.com')],
 ['fragment',normal+'#fragment'],['port',normal.replace('awin1.com/','awin1.com:444/')],['malformed','%%%'],
 ['double encoded',link('/cread.php',{awinmid:String(advertiserId),awinaffid:publisher,ued:encodeURIComponent(destination)})],
 ['unknown metadata',normal+'&clickref=private'],['duplicate metadata',normal+'&p=1&p=2'],
 ['userinfo',normal.replace('https://','https://user:password@')]
];
for(const [name,url] of invalid)test('all consumers withhold: '+name,()=>assert.deepEqual(consumers(url),[false,false,false,false,false]));
test('feed host policy stays narrower than generated-commerce host policy',()=>{const url=link('/cread.php',undefined,'www.awin2.com');assert.deepEqual(consumers(url),[false,false,false,false,true]);assert.equal(affiliateAllowed(normal,advertiserId),false);});
test('ordinary fallback requires absent attribution and a safe independent destination',()=>{assert.equal(mapProduct(row('')).affiliateTracked,false);assert.equal(mapProduct(row('')).url,destination);for(const product_url of ['https://zazzmode.com/account','https://user:secret@zazzmode.com/products/fixture','https://zazzmode.com/products/fixture?next=https://evil.example'])assert.equal(mapProduct({...row(''),product_url}),null);});
test('rights, private audience, expiry, unavailable/currency and variant identity remain enforced',()=>{
 for(const mapper of [mapCatalog,mapProduct])for(const delta of [{is_public:false},{valid_until:'2020-01-01'},{available:false},{currency:'EUR'}])assert.equal(mapper({...row(normal),...delta}),null);
 assert.ok(mapCatalog({...row(normal),is_public:false},{privateInventory:true}));
 assert.equal(mapCatalog({...row(invalid[0][1]),is_public:false},{privateInventory:true}),null);
});
test('actual search, revalidation and staff/public retrieval withhold wrong destination without retry/fallback',async()=>{
 const saved={...process.env},fetcher=globalThis.fetch;let reads=0;
 try{
 Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'});
 globalThis.fetch=async(url,options={})=>{const u=String(url);assert.ok(u.startsWith('https://fixture.supabase.co/rest/v1/'));if(u.includes('matchlatch_catalog_staff?'))return Response.json([{role:'catalog'}]);reads++;return Response.json([row(invalid[3][1]),row(normal)]);};
 const search=await searchAwin({slot:'shirt',q:'shirt',max:20});assert.equal(search.length,1);assert.equal(search[0].url,normal);
 assert.equal((await searchAwin({slot:'shirt',q:'shirt',max:19})).length,0);
 assert.equal((await verifyAwin({id:'awin:117849:fixture',variant:'awin:117849:11',max:20})).url,normal);
 assert.equal(await verifyAwin({id:'awin:117849:fixture',variant:'awin:117849:12',max:20}),null);
 assert.equal((await retrieveCatalog()).length,1);
 globalThis.fetch=async(url)=>{assert.ok(String(url).startsWith('https://fixture.supabase.co/rest/v1/'));if(String(url).includes('matchlatch_catalog_staff?'))return Response.json([{role:'catalog'}]);reads++;return Response.json([{...row(invalid[3][1]),is_public:false},{...row(normal),is_public:false}]);};
 assert.equal((await retrieveCatalog({privateInventory:true,account:{user:{id:'synthetic'},token:'synthetic'}})).length,1);assert.equal(reads,6);
 }finally{process.env=saved;globalThis.fetch=fetcher;}
});

test('enhanced feed staging preserves valid attribution and withholds invalid raw links before normalizer erases evidence',()=>{
 const candidate=CANDIDATES.find(c=>c.id===6016),at=new Date().toISOString(),dest='https://wconcept.com/products/fixture?variant=11';
 const feed={id:'fixture',title:'Shirt',product_type:'shirt',link:dest,image_link:'https://images.example/item',price:'20.00 USD',availability:'in_stock',size:'M',color:'Blue',shipping:[{country:'US',price:'0.00 USD'}]};
 const tracking='https://www.awin1.com/pclick.php?a=3118944&m=6016&ued='+encodeURIComponent(dest);
 assert.equal(mapFeedRow({...feed,aw_deep_link:tracking},candidate,at).affiliate_url,tracking);
 assert.equal(mapFeedRow(feed,candidate,at).affiliate_url,'');
 for(const aw_deep_link of ['%%%',tracking.replace('variant%3D11','variant%3D12'),tracking+'&m=6016',tracking.replace('www.awin1.com','sub.awin1.com'),tracking.replace(/&ued=.*/,''),tracking+' '])assert.equal(mapFeedRow({...feed,aw_deep_link},candidate,at),null);
 assert.equal(mapFeedRow({...feed,link:'https://wconcept.com/account'},candidate,at),null);
});

const unsafeEncoded=[
 'https://zazzmode.com/products/fixture?next=+https%253A%252F%252Fevil.example',
 'https://zazzmode.com/%61ccount','https://zazzmode.com/%2561ccount',
 'https://zazzmode.com/products/fixture?next=%252F%252Fevil.example',
 'https://zazzmode.com/products/fixture?%256eext=%2568ttps%253A%252F%252Fevil.example',
 'https://zazzmode.com/products/fixture?%2574oken=secret',
 'https://zazzmode.com/products/%ZZ','https://zazzmode.com/products/%C0%AF',
 'https://zazzmode.com/products/fixture?next=%25252525252F',
 'https://zazzmode.com/products/fixture?next=%2509https%253A%252F%252Fevil.example'
];
for(const product_url of unsafeEncoded)test('encoded unsafe withheld at all boundaries: '+product_url,()=>{
 const tracking=link('/pclick.php',{a:publisher,m:String(advertiserId),ued:product_url});
 assert.equal(affiliateAllowed(tracking,advertiserId,product_url),false);
 assert.equal(validateProduct({...feed(tracking),merchantdeeplink:product_url},advertiserId,'Synthetic').product,null);
 assert.equal(mapProduct({...row(''),product_url}),null);
 assert.equal(mapCatalog({...row(tracking),product_url}),null);
 assert.equal(mapCatalog({...row(tracking),product_url,is_public:false},{privateInventory:true}),null);
 assert.equal(validateTrackingLink(tracking,{publisher,advertiserId,destination:product_url}),null);
});
test('enhanced supported envelopes reject original conflicting aliases and bind emitted rows',()=>{
 const candidate=CANDIDATES.find(c=>c.id===6016),at=new Date().toISOString(),dest='https://wconcept.com/products/fixture?variant=11';
 const base={id:'fixture',title:'Shirt',product_type:'shirt',image_link:'https://images.example/item',price:'20.00 USD',availability:'in_stock',shipping:[{country:'US',price:'0.00 USD'}]};
 const tracking='https://www.awin1.com/pclick.php?a=3118944&m=6016&ued='+encodeURIComponent(dest);
 for(const section of ['product_basic','product_category','product_attributes','price_and_availability']){
  const good=mapFeedRow({...base,[section]:{link:dest,aw_deep_link:tracking}},candidate,at);
  assert.ok(good);assert.equal(good.product_url,dest);assert.equal(new URL(good.affiliate_url).searchParams.get('ued'),good.product_url);
  for(const conflict of [{link:dest.replace('11','12')},{merchant_deep_link:dest.replace('fixture','other')},{urlTracking:'%%%bad'},{aw_deep_link:tracking+' '},{link:42}]){
   assert.equal(mapFeedRow({...base,link:dest,aw_deep_link:tracking,[section]:conflict},candidate,at),null);
  }
 }
 const good=mapFeedRow({...base,link:dest,merchant_deep_link:dest,aw_deep_link:tracking,urlTracking:tracking},candidate,at);assert.ok(good);
 assert.equal(mapFeedRow({...base,product_basic:{link:dest},product_attributes:{link:dest.replace('11','12')},aw_deep_link:tracking},candidate,at),null);
 for(const link of ['https://wconcept.com/%61ccount','https://wconcept.com/products/fixture?next=%252F%252Fevil.example'])assert.equal(mapFeedRow({...base,link},candidate,at),null);
});
test('safe escaped product identity remains byte-exact',()=>{
 const product_url='https://zazzmode.com/products/blue%20shirt?variant=11&color=caf%C3%A9';
 const tracking=link('/pclick.php',{a:publisher,m:String(advertiserId),ued:product_url});
 assert.equal(mapProduct({...row(tracking),product_url}).merchantProductUrl,product_url);
 assert.equal(mapProduct({...row(''),product_url}).url,product_url);
});
test('actual search/revalidation and staff retrieval exclude encoded unsafe rows',async()=>{
 const saved={...process.env},fetcher=globalThis.fetch;
 try{
 Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'});
 globalThis.fetch=async url=>{assert.ok(String(url).startsWith('https://fixture.supabase.co/rest/v1/'));if(String(url).includes('matchlatch_catalog_staff?'))return Response.json([{role:'catalog'}]);return Response.json(unsafeEncoded.map(product_url=>({...row(''),product_url})));};
 assert.deepEqual(await searchAwin({slot:'shirt',q:'shirt',max:20}),[]);
 assert.equal(await verifyAwin({id:'awin:117849:fixture',variant:'awin:117849:11',max:20}),null);
 assert.deepEqual(await retrieveCatalog(),[]);
 assert.deepEqual(await retrieveCatalog({privateInventory:true,account:{user:{id:'synthetic'},token:'synthetic'}}),[]);
 }finally{process.env=saved;globalThis.fetch=fetcher;}
});
