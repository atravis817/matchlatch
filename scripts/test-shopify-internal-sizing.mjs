import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProduct} from '../lib/shopify-sync.mjs';
import {internalShopifySearch} from '../lib/shopify-internal-catalog.mjs';
import {product} from './shopify-sync-fixture.mjs';
const now=Date.parse('2026-10-17T12:00:00Z');
function row(n,system){
 const p=product(n);
 if(typeof system==='string')p.variants.nodes[0].selectedOptions.push({name:'Size system',value:system});
 const r=normalizeProduct(p,{observedAt:new Date(now).toISOString()})[0];
 if(typeof system!=='string')r.data.sizeSystem=system;
 r.is_public=true;r.approval={sourceAuthorized:true,displayAuthorized:true,recommendationAuthorized:true,imageRights:true,supplierVerified:true,channelVerified:true,usShippingVerified:true,supplierId:'synthetic-supplier',channelId:'synthetic-channel',evidenceRef:'synthetic-only',expiresAt:'2030-01-01T00:00:00Z',materialHash:r.material_hash,vendor:r.brand,productIds:[r.product_id]};return r;
}
const search=async(rows,sizeSystem)=>internalShopifySearch({slot:'shirt',query:'',max:100,size:'S',sizeSystem},{now,store:{async db(){return structuredClone(rows);}}});
test('unknown or malformed sizing does not abort a page containing an exact verified system',async()=>{
 const unknown=[null,undefined,42,{},false].map((v,i)=>row(i+1,v));
 const exact=row(10,'US');const before=structuredClone(unknown);
 const result=await search([...unknown,exact,row(11,'EU')],'us');
 assert.deepEqual(result.items.map(x=>x.variantId),[exact.data.variantId]);
 assert.deepEqual(unknown,before);assert.equal(result.aiProcessing,false);assert.equal(result.items[0].nativeCheckoutEligible,false);
});
test('missing sizing remains unknown and available without a sizing-system constraint',async()=>{
 const r=row(1,null);assert.equal((await search([r],'US')).items.length,0);
 const result=await search([r],'');assert.equal(result.items.length,1);assert.equal(result.items[0].sizeSystem,null);
});
test('explicit mismatching system is withheld without changing approval requirements',async()=>{
 const r=row(1,'EU');assert.equal((await search([r],'US')).items.length,0);
 r.approval.displayAuthorized=false;assert.equal((await search([r],'EU')).items.length,0);
});
