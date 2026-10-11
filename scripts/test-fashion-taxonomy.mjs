import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyProduct,normalizeQuery,colorEvidence,TAXONOMY} from '../lib/fashion-taxonomy.mjs';
import {normalizeRecord,searchRecords} from '../lib/unified-search-contract.mjs';
const permission={sourceAuthorized:true,displayAuthorized:true,recommendationAuthorized:true,fresh:true,imageRights:true,evidenceRef:'synthetic-review-only'};
const raw={id:'fixture:1',productId:'p',variantId:'v',merchantId:'fixture',merchant:'Fictional merchant',title:'Black trainers',slot:'shoes',color:'black',size:'10',price:100,currency:'USD',available:true,image:'https://fixture.example.test/shoe.jpg',url:'https://fixture.example.test/product',shippingUsEligible:true,shippingEvidence:{kind:'fixture_not_real'},checkedAt:new Date().toISOString(),private:false};
test('watch title wins over legacy shirt but conflicts are queued for review, never relabeled silently',()=>{
 const original={title:"Burberry BU9001 Black Dial Stainless Steel Unisex Watch",slot:'shirt',sourceCategory:'Clothing shirts'};const c=classifyProduct(original);assert.equal(c.productType,'watch');assert.equal(c.category,'accessories');assert.equal(c.legacySlot,'watch');assert.equal(c.status,'needs_review');assert.ok(c.reasons.includes('legacy_slot_conflict'));assert.ok(c.reasons.includes('source_taxonomy_conflicts_with_title'));assert.deepEqual(c.original.title,original.title);assert.equal(original.slot,'shirt');assert.ok(c.evidence.every(e=>e.field==='title'));
});
test('canonical taxonomy covers fashion synonyms without classifying by a brand name or description alone',()=>{
 for(const title of ['Black sneakers','Black trainers','Black tennis shoes']){const c=classifyProduct({title,slot:'shoes'});assert.equal(c.productType,'sneaker');assert.equal(c.status,'classified');assert.equal(normalizeQuery(title).productTypes[0],'sneaker');}
 assert.equal(classifyProduct({title:'Hugo Boss 1510000'}).status,'needs_review');assert.equal(classifyProduct({title:'Mystery item',description:'A shirt for casual use'}).confidence,.45);assert.ok(TAXONOMY.length>=20);
});
test('watch accessories, unsupported legacy categories and multiple types require review',()=>{
 const strap=classifyProduct({title:'Black watch strap'});assert.equal(strap.productType,'watch_strap');assert.equal(strap.reviewRequired,true);
 assert.equal(classifyProduct({title:'Watch and shirt bundle'}).productType,null);assert.equal(classifyProduct({title:'Black dress'}).reasons[0],'legacy_category_not_supported');
 const dressWatch=classifyProduct({title:"Emporio Armani AR11104 Dress Quartz Men's Watch",slot:'shirt'});assert.equal(dressWatch.productType,'watch');assert.ok(dressWatch.contextRules.includes('dress_watch_modifier_disambiguation'));assert.ok(dressWatch.reviewRequired);
});
test('composite color evidence does not invent primary color or claim exact solid black',()=>{
 assert.deepEqual(colorEvidence('Black/Hot Pink (Bhp)').families,['black','pink']);assert.equal(colorEvidence('Black/Hot Pink (Bhp)').primary,null);assert.equal(colorEvidence('Black/Hot Pink (Bhp)').exactSolid,false);assert.equal(colorEvidence('grey').normalized,'gray');assert.equal(colorEvidence('').status,'unknown');
});
test('permission gate precedes ranking; high-relevance research/private/unauthorized inventory cannot win',()=>{
 const valid=normalizeRecord(raw,{provider:'shopify_catalog',permissions:permission});const records=[valid,normalizeRecord({...raw,id:'private',private:true},{provider:'awin',permissions:permission}),normalizeRecord({...raw,id:'research'},{provider:'research',permissions:permission}),normalizeRecord({...raw,id:'unapproved'},{provider:'shopify_catalog'})];
 const result=searchRecords(records,'black sneaker',{size:'10',color:'black',max:120});assert.equal(result.matches.length,1);assert.equal(result.matches[0].record.identity.id,'fixture:1');assert.equal(result.matches[0].record.links.affiliate,null);assert.ok(result.diagnostics.find(x=>x.id==='private').eligibilityReasons.includes('private_inventory'));assert.ok(result.diagnostics.find(x=>x.id==='unapproved').eligibilityReasons.includes('source_permission_unverified'));assert.equal(raw.private,false);
});
test('watches cannot appear as shirts or sneakers and unknown shipping never qualifies',()=>{
 const watch=normalizeRecord({...raw,title:'Black Watch',slot:'watch'},{provider:'shopify_catalog',permissions:permission});
 assert.equal(searchRecords([watch],'black sneaker').matches.length,0);assert.equal(searchRecords([watch],'black shirt').matches.length,0);assert.equal(searchRecords([watch],'black watch').matches.length,1);assert.equal(searchRecords([normalizeRecord({...raw,shippingEvidence:null},{provider:'shopify_catalog',permissions:permission})],'sneaker').zeroReason,'no_qualified_inventory');
});
test('zero explanations distinguish inventory, qualification and hard constraints; generic footwear includes sneaker',()=>{
 const p=normalizeRecord(raw,{provider:'shopify_catalog',permissions:permission});assert.equal(searchRecords([],'sneaker').zeroReason,'no_inventory_in_selected_source');assert.equal(searchRecords([p],'sneaker',{size:'11'}).zeroReason,'no_matching_eligible_inventory');assert.equal(searchRecords([p],'footwear').matches.length,1);assert.equal(searchRecords([p],'sneaker',{color:'white'}).matches.length,0);assert.equal(searchRecords([p],'sneaker',{max:90}).matches.length,0);
});
test('projection retains original evidence, provider identities and permission distinctions without mutating source',()=>{
 const p=normalizeRecord(raw,{provider:'shopify_catalog',permissions:permission});assert.deepEqual(p.original,raw);assert.notEqual(p.original,raw);assert.equal(p.eligibility.sourceAuthorized,true);assert.equal(p.links.affiliateVerified,false);assert.equal(p.style.status,'unknown');assert.throws(()=>normalizeRecord(raw,{provider:'unreviewed_new_source'}));
});
