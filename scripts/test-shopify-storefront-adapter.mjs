import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareStorefrontRecords,selectStorefrontCandidates,STORE_DOMAIN,STOREFRONT_READ_QUERY} from '../lib/shopify-storefront-adapter.mjs';
const now=Date.parse('2026-10-12T20:00:00Z'),pid='gid://shopify/Product/100',vid='gid://shopify/ProductVariant/200';
const receipt={verified:true,evidenceRef:'fictional-test-receipt'};
const context=()=>({environment:'preview',storeDomain:STORE_DOMAIN,checkedAt:new Date(now).toISOString(),now,permissions:{sourceAuthorized:true,displayAuthorized:true,recommendationAuthorized:true,imageRights:true,evidenceRef:'fictional-test-permissions'},publicationByProduct:{[pid]:{...receipt,channelId:'fictional-channel'}},supplierByProduct:{[pid]:{...receipt,id:'fictional-supplier',name:'Fictional Supplier'}},shippingByProduct:{[pid]:{...receipt,country:'US',eligible:true}}});
const response=()=>({data:{products:{nodes:[{id:pid,title:'Fictional Black Sneakers',vendor:'Fictional Vendor',productType:'Sneakers',onlineStoreUrl:'https://'+STORE_DOMAIN+'/products/fictional',variants:{nodes:[{id:vid,title:'Black / 10',availableForSale:true,currentlyNotInStock:false,quantityAvailable:3,price:{amount:'89.99',currencyCode:'USD'},selectedOptions:[{name:'Color',value:'Black'},{name:'Size',value:'10'}],image:{url:'https://cdn.shopify.com/fictional.jpg',altText:'Fictional test image'}}],pageInfo:{hasNextPage:false,endCursor:null}}}],pageInfo:{hasNextPage:false,endCursor:null}}}});
const search=(r=response(),c=context(),options={})=>selectStorefrontCandidates(r,c,'black sneakers',{max:100,color:'black',size:'10',...options});
test('unreviewed Storefront data never qualifies and does not inherit Global Catalog rights',()=>{
 const c=context();delete c.permissions;const out=search(response(),c);assert.equal(out.matches.length,0);assert.equal(out.zeroReason,'no_qualified_inventory');assert.equal(out.diagnostics[0].eligibilityReasons.includes('source_permission_unverified'),true);
 c.permissions={sourceAuthorized:true,displayAuthorized:true,recommendationAuthorized:true,imageRights:true};assert.equal(search(response(),c).matches.length,0);
});
test('reviewed fixture preserves supplier, source IDs, cents, original options and disabled checkout',()=>{
 const original=response(),out=search(original);assert.equal(out.matches.length,1);const p=out.matches[0].record;
 assert.equal(p.identity.provider,'shopify_storefront');assert.equal(p.identity.productId,pid);assert.equal(p.identity.variantId,vid);assert.equal(p.supplier.name,'Fictional Supplier');assert.equal(p.supplier.vendorClaim,'Fictional Vendor');assert.equal(p.offer.priceCents,8999);assert.equal(p.offer.size,'10');assert.equal(p.offer.sizeSystem,null);assert.equal(p.offer.inventoryEvidence.quantityAvailable,3);assert.equal(p.offer.inventoryEvidence.reserved,false);assert.equal(p.links.affiliate,null);assert.equal(p.links.checkout,null);assert.equal(p.checkoutDestination.enabled,false);assert.equal(p.eligibility.aiProcessingAuthorized,false);assert.equal(original.data.products.nodes[0].variants.nodes[0].price.amount,'89.99');
});
test('publication, supplier confirmation and US shipping are separate required evidence',()=>{
 for(const field of ['publicationByProduct','supplierByProduct','shippingByProduct']){const c=context();c[field]={};assert.equal(search(response(),c).matches.length,0);}
 const c=context();c.supplierByProduct[pid].verified=false;assert.equal(search(response(),c).matches.length,0);
});
test('zero, unknown, fractional stock and backorders are excluded despite availableForSale',()=>{
 for(const quantity of [0,null,undefined,1.5,-1]){const r=response();r.data.products.nodes[0].variants.nodes[0].quantityAvailable=quantity;assert.equal(search(r).matches.length,0);}
 const r=response();r.data.products.nodes[0].variants.nodes[0].currentlyNotInStock=true;assert.equal(search(r).matches.length,0);
});
test('freshness cannot be asserted by a boolean and future observations fail closed',()=>{
 for(const time of [now-300001,now+1]){const c=context();c.checkedAt=new Date(time).toISOString();c.permissions.fresh=true;assert.equal(search(response(),c).matches.length,0);}
});
test('USD price and exact constraints retain cents and avoid inferred sizes or solid colors',()=>{
 assert.equal(search(response(),context(),{max:89.98}).matches.length,0);assert.equal(search(response(),context(),{max:89.99}).matches.length,1);assert.equal(search(response(),context(),{size:'11'}).matches.length,0);
 for(const amount of ['0','-1','89.999','NaN','1e2']){const r=response();r.data.products.nodes[0].variants.nodes[0].price.amount=amount;assert.equal(search(r).matches.length,0);}
 const mixed=response();mixed.data.products.nodes[0].variants.nodes[0].selectedOptions[0].value='Black / Pink';assert.equal(search(mixed).matches.length,0);
 const eur=response();eur.data.products.nodes[0].variants.nodes[0].price.currencyCode='EUR';assert.equal(search(eur).matches.length,0);
});
test('merchant destinations are bounded; external links and non-Shopify images are rejected',()=>{
 for(const value of ['https://evil.example.test/products/fictional','http://'+STORE_DOMAIN+'/products/fictional','https://user:pass@'+STORE_DOMAIN+'/products/fictional']){const r=response();r.data.products.nodes[0].onlineStoreUrl=value;assert.equal(search(r).matches.length,0);}
 const r=response();r.data.products.nodes[0].variants.nodes[0].image.url='https://evil.example.test/x.jpg';assert.equal(search(r).matches.length,0);
});
test('Production, another store and provider errors yield no records; pagination is retained',()=>{
 const c=context();c.environment='production';assert.equal(prepareStorefrontRecords(response(),c).records.length,0);c.environment='preview';c.storeDomain='other.myshopify.com';assert.equal(prepareStorefrontRecords(response(),c).records.length,0);assert.equal(prepareStorefrontRecords({errors:[{message:'SECRET_ERROR'}]},context()).records.length,0);
 const r=response();r.data.products.pageInfo={hasNextPage:true,endCursor:'fixture-cursor'};assert.deepEqual(search(r).pagination,r.data.products.pageInfo);assert.ok(!JSON.stringify(prepareStorefrontRecords({errors:[{message:'SECRET_ERROR'}]},context())).includes('SECRET_ERROR'));
});
test('prepared adapter is isolated from live routes, models, persistence and checkout mutations',()=>{
 for(const path of ['api/style.mjs','api/shop.mjs'])assert.ok(!readFileSync(new URL('../'+path,import.meta.url),'utf8').includes('shopify-storefront-adapter'));
 assert.ok(!STOREFRONT_READ_QUERY.includes('mutation'));assert.ok(!STOREFRONT_READ_QUERY.includes('cart'));
 const source=readFileSync(new URL('../lib/shopify-storefront-adapter.mjs',import.meta.url),'utf8');assert.ok(!/\bfetch\s*\(|\bmodelJSON\s*\(|\bdatabase\s*\(/.test(source));
});

test('missing stock evidence stays unknown and malformed variant arrays cannot produce matches',()=>{
 const r=response();delete r.data.products.nodes[0].variants.nodes[0].quantityAvailable;const p=prepareStorefrontRecords(r,context()).records[0];assert.equal(p.offer.stock,'unknown');assert.equal(p.offer.inventoryEvidence.quantityAvailable,null);
 r.data.products.nodes[0].variants.nodes={};assert.equal(search(r).matches.length,0);
});
