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
