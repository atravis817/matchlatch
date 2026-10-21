import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import model from '../checkout-model.js';
// Exercise the actual browser module with synthetic account-owned rows; no provider I/O.
test('actual cloud cache and pull scrub stale licensed rows while retaining user notes and photos',async()=>{
 let sync;
 const prior={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage};
 const cache=new Map(),writes=[],ref={provider:'shopify_storefront',merchantId:'one.test',productId:'p',variantId:'v'};
 const payload={id:'line',shopRef:ref,sourceState:{status:'available',rights:'retained'},description:'licensed',productImage:'https://one.test/photo',notes:'My note',userPhoto:'mine'};
 cache.set('matchlatch-cloud-cache-v1-a',JSON.stringify({state:{cart:[payload]},pending:[]}));
 let shown;
 try{
 globalThis.window={MatchlatchCheckoutModel:model,addEventListener(){}};globalThis.document={addEventListener(){},visibilityState:'hidden'};
 globalThis.localStorage={getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)};
 const query={select(){return this;},eq(){return this;},order(){return this;},async range(){return {data:[{kind:'cart',record_id:'line',payload,is_deleted:false}]};},async upsert(rows){writes.push(...rows);return {};}};
 const code=await readFile(new URL('../cloud-sync.js',import.meta.url),'utf8');
 const {createCloudSync}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 sync=createCloudSync({from:()=>query},{setState:s=>{shown=s;},setGuest(){},applyProfile(){}});
 await sync.setUser({id:'a'});
 assert.equal(shown.cart[0].productImage,undefined);assert.equal(shown.cart[0].notes,'My note');assert.equal(shown.cart[0].userPhoto,'mine');
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(writes.some(r=>r.kind==='cart'&&r.payload.sourceState.redacted===true&&!r.payload.productImage));
 sync.queueState({cart:[payload]});await sync.setUser(null);
 assert.equal(cache.has('matchlatch-cloud-cache-v1-a'),false);
 }finally{if(sync)await sync.setUser(null);for(const [k,v] of Object.entries(prior)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
});

test('actual cached deletion keeps its tombstone but never caches or uploads merchant snapshots',async()=>{
 const prior={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage};
 const payload={id:'deleted',shopRef:{provider:'shopify_storefront',merchantId:'one.test',productId:'p',variantId:'v'},title:'LICENSED_DELETED_TEXT',productImage:'https://one.test/deleted.jpg'};
 const pending={kind:'cart',record_id:'deleted',is_deleted:true,payload};
 const cache=new Map([['matchlatch-cloud-cache-v1-a',JSON.stringify({state:{},pending:[pending]})]]),writes=[];let sync;
 try{globalThis.window={MatchlatchCheckoutModel:model,addEventListener(){}};globalThis.document={addEventListener(){},visibilityState:'hidden'};
 globalThis.localStorage={getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)};
 const query={select(){return this;},eq(){return this;},order(){return this;},async range(){return {data:[]};},async upsert(rows){writes.push(...rows);return {};}};
 const code=await readFile(new URL('../cloud-sync.js',import.meta.url),'utf8');const {createCloudSync}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 sync=createCloudSync({from:()=>query},{setState(){},setGuest(){},applyProfile(){}});await sync.setUser({id:'a'});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(writes[0].is_deleted,true);assert.deepEqual(writes[0].payload,{id:'deleted'});assert.ok(!cache.get('matchlatch-cloud-cache-v1-a').includes('LICENSED_DELETED_TEXT'));assert.ok(!cache.get('matchlatch-cloud-cache-v1-a').includes('deleted.jpg'));
 }finally{if(sync)await sync.setUser(null);for(const [k,v] of Object.entries(prior)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
});

test('approved internal Shopify store saved looks retain product title, image and URL across cloud pull',async()=>{
 const prior={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage};
 const lookPayload={
  id:'look-1',label:'full-outfit',saved:true,mode:'guided',budget:400,
  styleNotes:'6 approved Shopify listings in this page.',
  pieces:[
   {
    type:'shirt',slot:'shirt',description:'BASALT S/N Jersey 3/4 Sleeve Crop Top Tee',
    searchQuery:'BASALT S/N Jersey 3/4 Sleeve Crop Top Tee',target:40,priceAtSelection:40,
    shopRef:{provider:'shopify_storefront',merchantId:'pfcdgt-is.myshopify.com',productId:'gid://shopify/Product/15499321999554',variantId:'gid://shopify/ProductVariant/67768739332290',slot:'shirt'},
    sourceState:{status:'available',rights:'retained',redacted:false},
    merchantId:'pfcdgt-is.myshopify.com',merchantProductUrl:'https://pfcdgt-is.myshopify.com/products/basalt-s-n-jersey-3-4-sleeve-crop-top-tee',
    productUrl:'https://pfcdgt-is.myshopify.com/products/basalt-s-n-jersey-3-4-sleeve-crop-top-tee',
    productImage:'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/Gemini_Generated_Image_gxqvlagxqvlagxqv.png?v=1791808816',
    retailer:'MATCHLATCH',currency:'USD',size:'S'
   },
   {
    type:'jacket',slot:'jacket',description:'DRAKON Faux Leather Crop Top Jacket',
    searchQuery:'DRAKON Faux Leather Crop Top Jacket',target:100,priceAtSelection:100,
    shopRef:{provider:'shopify_storefront',merchantId:'pfcdgt-is.myshopify.com',productId:'gid://shopify/Product/15499322130626',variantId:'gid://shopify/ProductVariant/67768739528898',slot:'jacket'},
    sourceState:{status:'available',rights:'retained',redacted:false},
    merchantId:'pfcdgt-is.myshopify.com',merchantProductUrl:'https://pfcdgt-is.myshopify.com/products/drakon-faux-leather-crop-top-jacket',
    productUrl:'https://pfcdgt-is.myshopify.com/products/drakon-faux-leather-crop-top-jacket',
    productImage:'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/GeneratedImageDecember07_2025-6_05PM_2d86b0a6-49fb-48bc-ad62-f53cf5b80d76.png?v=1791808815',
    retailer:'MATCHLATCH',currency:'USD',size:'S'
   },
   {
    type:'pants',slot:'pants',description:'PANTHEON Washed French Terry Stacked Jogger Pants',
    searchQuery:'PANTHEON Washed French Terry Stacked Jogger Pants',target:50,priceAtSelection:50,
    shopRef:{provider:'shopify_storefront',merchantId:'pfcdgt-is.myshopify.com',productId:'gid://shopify/Product/15499322785986',variantId:'gid://shopify/ProductVariant/67768743559362',slot:'pants'},
    sourceState:{status:'available',rights:'retained',redacted:false},
    merchantId:'pfcdgt-is.myshopify.com',merchantProductUrl:'https://pfcdgt-is.myshopify.com/products/pantheon-washed-french-terry-stacked-jogger-pants',
    productUrl:'https://pfcdgt-is.myshopify.com/products/pantheon-washed-french-terry-stacked-jogger-pants',
    productImage:'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/Gemini_Generated_Image_ymj2hjymj2hjymj2.png?v=1791808821',
    retailer:'MATCHLATCH',currency:'USD',size:'S'
   },
   {
    type:'shoes',slot:'shoes',description:'Premium Black Flats',
    searchQuery:'Premium Black Flats',target:48,priceAtSelection:48,
    shopRef:{provider:'shopify_storefront',merchantId:'pfcdgt-is.myshopify.com',productId:'gid://shopify/Product/15507099615426',variantId:'gid://shopify/ProductVariant/67782441763010',slot:'shoes'},
    sourceState:{status:'available',rights:'retained',redacted:false},
    merchantId:'pfcdgt-is.myshopify.com',merchantProductUrl:'https://pfcdgt-is.myshopify.com/products/premium-black-flats',
    productUrl:'https://pfcdgt-is.myshopify.com/products/premium-black-flats',
    productImage:'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/shoes-premium-black-flats-1.jpg?v=1791899127',
    retailer:'MATCHLATCH',currency:'USD',size:'6'
   },
   {
    type:'hat',slot:'hat',description:'G5 Flat Billed Snap Back Hat',
    searchQuery:'G5 Flat Billed Snap Back Hat',target:24,priceAtSelection:24,
    shopRef:{provider:'shopify_storefront',merchantId:'pfcdgt-is.myshopify.com',productId:'gid://shopify/Product/15507092111554',variantId:'gid://shopify/ProductVariant/67782309019842',slot:'hat'},
    sourceState:{status:'available',rights:'retained',redacted:false},
    merchantId:'pfcdgt-is.myshopify.com',merchantProductUrl:'https://pfcdgt-is.myshopify.com/products/g5-flat-billed-snap-back-hat',
    productUrl:'https://pfcdgt-is.myshopify.com/products/g5-flat-billed-snap-back-hat',
    productImage:'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/G5-Snap-Back-Hat01.jpg?v=1791898958',
    retailer:'MATCHLATCH',currency:'USD',color:'Black'
   },
   {
    type:'socks',slot:'socks',description:'Bamboo Rayon Ski & Snowboard Socks - Single Pair Pack',
    searchQuery:'Bamboo Rayon Ski & Snowboard Socks - Single Pair Pack',target:14.95,priceAtSelection:14.95,
    shopRef:{provider:'shopify_storefront',merchantId:'pfcdgt-is.myshopify.com',productId:'gid://shopify/Product/15507093749954',variantId:'gid://shopify/ProductVariant/67782331760834',slot:'socks'},
    sourceState:{status:'available',rights:'retained',redacted:false},
    merchantId:'pfcdgt-is.myshopify.com',merchantProductUrl:'https://pfcdgt-is.myshopify.com/products/bamboo-rayon-ski-snowboard-socks-single-pair-pack',
    productUrl:'https://pfcdgt-is.myshopify.com/products/bamboo-rayon-ski-snowboard-socks-single-pair-pack',
    productImage:'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/bamboo-sports-socks-medium-black-grey-bamboo-sports-bamboo-ski-snowboard-socks-4-03-011-01-01-13653944598583.jpg?v=1791898990',
    retailer:'MATCHLATCH',currency:'USD',size:'Medium'
   }
  ]
 };
 const cache=new Map([['matchlatch-cloud-cache-v1-owner-1',JSON.stringify({state:{looks:[lookPayload]},pending:[]})]]),writes=[];let shown,sync;
 try{
  globalThis.window={MatchlatchCheckoutModel:model,addEventListener(){}};globalThis.document={addEventListener(){},visibilityState:'hidden'};
  globalThis.localStorage={getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)};
  const query={select(){return this;},eq(){return this;},order(){return this;},async range(){return {data:[{kind:'looks',record_id:'look-1',payload:lookPayload,is_deleted:false}]};},async upsert(rows){writes.push(...rows);return {};}};
  const code=await readFile(new URL('../cloud-sync.js',import.meta.url),'utf8');
  const {createCloudSync}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  sync=createCloudSync({from:()=>query},{setState:s=>{shown=s;},setGuest(){},applyProfile(){}});
  await sync.setUser({id:'owner-1'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(shown.looks[0].pieces.length,6);
  for(const p of shown.looks[0].pieces){
   assert.equal(p.sourceState.redacted,false);
   assert.ok(p.productImage?.startsWith('https://cdn.shopify.com/'));
   assert.ok(p.productUrl?.startsWith('https://pfcdgt-is.myshopify.com/products/'));
  }
  assert.equal(writes.length,0);
 }finally{if(sync)await sync.setUser(null);for(const [k,v] of Object.entries(prior)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
});

test('scoped authorized restoration heals default-denied local cache while preserving revocations, duplicates and unknown/expired variants',async()=>{
 const prior={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage};
 const shopRef={provider:'shopify_storefront',merchantId:'pfcdgt-is.myshopify.com',productId:'gid://shopify/Product/15499321999554',variantId:'gid://shopify/ProductVariant/67768739332290',slot:'shirt'};
 const restoration={decisionRef:'WO-ML-018A-SAVED-LOOK-RESTORE-20261020',evidenceRef:'WO-ML-018A-SAMPLE1-APPROVAL-20261018',materialHash:'5b8a5cbe074e7e55d3ca5b83015fa7e18f88cb6159b9755f6eeaa912654a3454',restoredAt:'2026-10-20T23:11:13Z',expiresAt:'2026-10-21T20:00:00Z'};
 const makeLook=(id,overrides={},pieceOverrides={})=>({
  id,label:'shirt',saved:true,mode:'guided',budget:100,styleNotes:'1 approved Shopify listings in this page.',
  pieces:[{
   type:'shirt',slot:'shirt',description:'BASALT S/N Jersey 3/4 Sleeve Crop Top Tee',
   searchQuery:'BASALT S/N Jersey 3/4 Sleeve Crop Top Tee',target:40,priceAtSelection:40,
   shopRef,sourceState:{status:'available',rights:'retained',redacted:false},
   merchantId:'pfcdgt-is.myshopify.com',merchantProductUrl:'https://pfcdgt-is.myshopify.com/products/basalt-s-n-jersey-3-4-sleeve-crop-top-tee',
   productUrl:'https://pfcdgt-is.myshopify.com/products/basalt-s-n-jersey-3-4-sleeve-crop-top-tee',
   productImage:'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/Gemini_Generated_Image_gxqvlagxqvlagxqv.png?v=1791808816',
   retailer:'MATCHLATCH',currency:'USD',size:'S',...pieceOverrides
  }],...overrides
 });
 const defaultDeniedLocal=makeLook('look-restore',{styleNotes:undefined},{description:'Unavailable merchant reference',productImage:undefined,merchantProductUrl:undefined,productUrl:undefined,sourceState:{status:'unavailable',rights:'unresolved',redacted:true}});
 const restoredRemote=makeLook('look-restore',{},{sourceState:{status:'available',rights:'retained',redacted:false,restoration}});
 const staleRemote=makeLook('look-restore');
 // 1. Ordinary stale remote copy without restoration stamp does NOT override redacted local state.
 const staleMerged=model.sanitizeState({looks:[staleRemote]},{looks:[defaultDeniedLocal]});
 assert.equal(staleMerged.looks[0].pieces[0].sourceState.redacted,true);
 assert.equal(staleMerged.looks[0].pieces[0].productImage,undefined);
 // 2. Explicit permission_revoked and delisted transitions are NEVER overridden even by a record with restoration stamp.
 for(const reason of ['permission_revoked','delisted']){
  const revokedState=model.sourceTransition({looks:[restoredRemote]},shopRef,{reason});
  const reloadedRevoked=model.sanitizeState(JSON.parse(JSON.stringify(revokedState)));
  assert.equal(reloadedRevoked.looks[0].pieces[0].sourceState.reason,reason);
  const afterStale=model.sanitizeState({looks:[restoredRemote]},reloadedRevoked);
  assert.equal(afterStale.looks[0].pieces[0].sourceState.redacted,true);
  assert.equal(afterStale.looks[0].pieces[0].sourceState.reason,reason);
  assert.equal(afterStale.looks[0].pieces[0].productImage,undefined);
 }
 // 3. Duplicate copy where another record is redacted preserves sticky redaction across copies even if one copy carries restoration.
 const dupOtherRedacted=makeLook('look-dup-2',{styleNotes:undefined},{description:'Unavailable merchant reference',productImage:undefined,sourceState:{status:'unavailable',rights:'unresolved',redacted:true}});
 const dupMerged=model.sanitizeState({looks:[restoredRemote,dupOtherRedacted]});
 assert.equal(dupMerged.looks[0].pieces[0].sourceState.redacted,true);
 assert.equal(dupMerged.looks[1].pieces[0].sourceState.redacted,true);
 // 4. Unknown variant in pfcdgt-is.myshopify.com (e.g. private size M 67768739365058) and expired approval fail closed.
 const unknownVariantLook=makeLook('look-m',{},{shopRef:{...shopRef,variantId:'gid://shopify/ProductVariant/67768739365058'}});
 assert.equal(model.sanitizeState({looks:[unknownVariantLook]}).looks[0].pieces[0].sourceState.redacted,true);
 assert.equal(model.sanitizeState({looks:[restoredRemote]},undefined,{now:Date.parse('2026-10-21T20:00:01Z')}).looks[0].pieces[0].sourceState.redacted,true);
 const extendedRemote=makeLook('look-ext',{},{sourceState:{status:'available',rights:'retained',redacted:false,restoration:{...restoration,expiresAt:'2026-11-20T20:00:00Z'}}});
 assert.equal(model.sanitizeState({looks:[extendedRemote]},{looks:[makeLook('look-ext',{styleNotes:undefined},{description:'Unavailable merchant reference',productImage:undefined,sourceState:{status:'unavailable',rights:'unresolved',redacted:true}})]},{now:Date.parse('2026-11-15T12:00:00Z')}).looks[0].pieces[0].sourceState.redacted,false);
 assert.equal(model.sanitizeState({looks:[extendedRemote]},undefined,{now:Date.parse('2026-11-20T20:00:01Z')}).looks[0].pieces[0].sourceState.redacted,true);
 // 4b. SAVE-SEC-01: Explicit revoked=true and rightsState/rights/reason='withdrawn' encodings (sourceState or piece-level) always scrub and block sibling variants.
 for(const revOverride of [
  {sourceState:{status:'available',rights:'retained',redacted:false,revoked:true,restoration}},
  {sourceState:{status:'available',rights:'retained',redacted:false,rightsState:'withdrawn',restoration}},
  {revoked:true,sourceState:{status:'available',rights:'retained',redacted:false,restoration}},
  {rightsState:'withdrawn',sourceState:{status:'available',rights:'retained',redacted:false,restoration}},
  {rights:'withdrawn',sourceState:{status:'available',rights:'retained',redacted:false,restoration}},
  {reason:'withdrawn',sourceState:{status:'available',rights:'retained',redacted:false,restoration}},
  {reason:'delisted',sourceState:{status:'available',rights:'retained',redacted:false,restoration}}
 ]){
  const revLook=makeLook('look-rev-enc',{},revOverride);
  const siblingLook=makeLook('look-sib',{},{shopRef:{...shopRef,variantId:'gid://shopify/ProductVariant/67768739397826'},sourceState:{status:'available',rights:'retained',redacted:false,restoration:{...restoration,materialHash:'c984433ec31d3fe2e810e553b75b99bc1a51b84215b2fb5a632d955c81872f81'}}});
  const s=model.sanitizeState({looks:[revLook,siblingLook]});
  assert.equal(s.looks[0].pieces[0].sourceState.redacted,true);
  assert.ok(['permission_revoked','delisted'].includes(s.looks[0].pieces[0].sourceState.reason));
  assert.equal(s.looks[1].pieces[0].sourceState.redacted,true);
 }
 // 4c. SAVE-SEC-03: Canonical content binding rejects tampered description, productImage or either URL field even when materialHash matches.
 for(const tamper of [
  {description:'Tampered Product Title'},
  {productImage:'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/tampered.png'},
  {productUrl:'https://pfcdgt-is.myshopify.com/products/tampered-handle',merchantProductUrl:'https://pfcdgt-is.myshopify.com/products/tampered-handle'},
  {productUrl:'https://pfcdgt-is.myshopify.com/products/tampered-handle'},
  {merchantProductUrl:'https://pfcdgt-is.myshopify.com/products/tampered-handle'}
 ]){
  const tamperedLook=makeLook('look-restore',{},{...tamper,sourceState:{status:'available',rights:'retained',redacted:false,restoration}});
  const s=model.sanitizeState({looks:[tamperedLook]},{looks:[defaultDeniedLocal]});
  assert.equal(s.looks[0].pieces[0].sourceState.redacted,true);
  assert.equal(s.looks[0].pieces[0].productImage,undefined);
 }
 // 4d. SAVE-COVERAGE-04: Duplicate same-product pieces within a look or colliding look IDs fail closed.
 const sameProdLook={...restoredRemote,id:'look-same-prod',pieces:[restoredRemote.pieces[0],{...restoredRemote.pieces[0],shopRef:{...shopRef,variantId:'gid://shopify/ProductVariant/67768739397826'}}]};
 const sameProdSanitized=model.sanitizeState({looks:[sameProdLook]});
 assert.equal(sameProdSanitized.looks[0].pieces[0].sourceState.redacted,true);
 assert.equal(sameProdSanitized.looks[0].pieces[1].sourceState.redacted,true);
 const collidingIdSanitized=model.sanitizeState({looks:[restoredRemote,restoredRemote]},{looks:[defaultDeniedLocal]});
 assert.equal(collidingIdSanitized.looks[0].pieces[0].sourceState.redacted,true);
 // 5. Deliberate authorized restoration heals default-denied local cache across cloud pull with zero redaction writebacks.
 const cache=new Map([['matchlatch-cloud-cache-v1-owner-1',JSON.stringify({state:{looks:[defaultDeniedLocal]},pending:[]})]]),writes=[];
 let shown,sync;
 try{
  globalThis.window={MatchlatchCheckoutModel:model,addEventListener(){}};globalThis.document={addEventListener(){},visibilityState:'hidden'};
  globalThis.localStorage={getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)};
  const query={select(){return this;},eq(){return this;},order(){return this;},async range(){return {data:[{kind:'looks',record_id:'look-restore',payload:restoredRemote,is_deleted:false}]};},async upsert(rows){writes.push(...rows);return {};}};
  const code=await readFile(new URL('../cloud-sync.js',import.meta.url),'utf8');
  const {createCloudSync}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  sync=createCloudSync({from:()=>query},{setState:s=>{shown=s;},setGuest(){},applyProfile(){}});
  await sync.setUser({id:'owner-1'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(shown.looks[0].pieces[0].description,'BASALT S/N Jersey 3/4 Sleeve Crop Top Tee');
  assert.equal(shown.looks[0].pieces[0].productImage,'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/Gemini_Generated_Image_gxqvlagxqvlagxqv.png?v=1791808816');
  assert.equal(shown.looks[0].pieces[0].sourceState.redacted,false);
  assert.deepEqual(shown.looks[0].pieces[0].sourceState.restoration,restoration);
  assert.equal(writes.length,0);
 }finally{if(sync)await sync.setUser(null);for(const [k,v] of Object.entries(prior)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
});
