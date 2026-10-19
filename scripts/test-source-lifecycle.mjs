import test from 'node:test';
import assert from 'node:assert/strict';
import model from '../checkout-model.js';
const fresh=()=>({source:'shopify_storefront',merchantId:'one.test',productId:'p',variantId:'v',title:'Original title',available:true,saveAllowed:true,currency:'USD',price:20,merchantProductUrl:'https://one.test/products/p',options:[{name:'Size',value:'S'}],checkedAt:new Date().toISOString()});
const piece=()=>{const p=fresh();return {id:'line',shopRef:model.reference(p),sourceState:{status:'available',rights:'retained',redacted:false},description:p.title,productImage:'https://one.test/photo.jpg',merchantProductUrl:p.merchantProductUrl,target:20,currency:'USD',options:p.options,notes:'My original note',userPhoto:'private-photo',lookId:'look'};};
const state=()=>({looks:[{id:'look',inspirationId:'original',derivedImage:'licensed composite',pieces:[piece()],shopSelections:{shirt:{...model.reference(fresh()),sourceState:{status:'available',rights:'retained'},title:'Licensed title',options:fresh().options}}}],cart:[piece()],favorites:[piece()],purchases:[{id:'owned',source:'user-entered',description:'My shirt',notes:'Mine'}],inspirations:[{id:'original',userPhoto:'original-photo'}],collections:[]});
test('provider, shop and product collisions stay distinct; changed titles retain identity',()=>{
 const a=fresh();for(const change of [{source:'other'},{merchantId:'two.test'},{productId:'other'},{variantId:'other'}])assert.equal(model.sameSource(a,{...a,...change}),false);
 assert.equal(model.sameSource(a,{...a,title:'New title'}),true);
 assert.notEqual(model.sourceKey({...a,merchantId:'a|b',productId:'c'}),model.sourceKey({...a,merchantId:'a',productId:'b|c'}));
});
test('legacy provider is unresolved and never inferred from Shopify GIDs or URL',()=>{
 const p=piece();delete p.shopRef.provider;assert.equal(model.identity(p),null);assert.equal(model.sameSource(p,fresh()),false);
 assert.equal(model.canSave({...fresh(),source:''}),false);
});
test('checkout revalidation enforces namespace, current save rights and all options',()=>{
 const p=piece();assert.equal(model.matchVerified(p,fresh()).priceChanged,false);
 for(const change of [{source:'other'},{merchantId:'two.test'},{options:[{name:'Size',value:'M'}]},{saveAllowed:false},{evaluationOnly:true},{available:false}])assert.throws(()=>model.matchVerified(p,{...fresh(),...change}));
});
test('source selection options survive a permitted roundtrip and change the quote fingerprint',()=>{
 const s=model.sanitizeState(state(),undefined,{allowRetained:true});assert.deepEqual(s.looks[0].shopSelections.shirt.options,fresh().options);
 const g=model.groupCart(s.cart).groups[0],before=model.fingerprint(g);g.items[0].options=[{name:'Size',value:'M'}];assert.notEqual(model.fingerprint(g),before);
});
test('stockout with independently retained content rights is unavailable without content withdrawal',()=>{
 const s=model.sourceTransition(state(),fresh(),{reason:'stockout',rightsRetained:true});
 assert.equal(s.cart[0].sourceState.redacted,false);assert.equal(s.cart[0].sourceState.status,'unavailable');assert.ok(s.cart[0].productImage);assert.equal(model.identity(s.cart[0]),null);
 assert.equal(model.groupCart(s.cart).groups.length,0);
});
test('withdrawal redacts unknown snapshot fields, flat selections and composite images; keeps user records',()=>{
 const original=state();original.cart[0].unknownLicensedBlob='secret merchant text';
 const s=model.sourceTransition(original,fresh(),{reason:'permission_revoked'});
 assert.equal(s.cart.length,1);assert.equal(s.favorites.length,1);assert.equal(s.looks.length,1);assert.equal(s.looks[0].pieces.length,1);
 for(const p of [s.cart[0],s.favorites[0],s.looks[0].pieces[0],s.looks[0].shopSelections.shirt]){assert.equal(p.description,'Unavailable merchant reference');assert.equal(p.productImage,undefined);assert.equal(p.title,undefined);assert.equal(p.options,undefined);assert.equal(p.sourceState.redacted,true);}
 assert.equal(s.cart[0].unknownLicensedBlob,undefined);assert.equal(s.looks[0].derivedImage,undefined);assert.equal(s.cart[0].notes,'My original note');assert.equal(s.cart[0].userPhoto,'private-photo');assert.deepEqual(s.inspirations,original.inspirations);assert.deepEqual(s.purchases,original.purchases);
});
test('withdrawal survives reload, stale cloud merge and provider reappearance',()=>{
 const withdrawn=model.sourceTransition(state(),fresh(),{reason:'delisted'}),reloaded=model.sanitizeState(JSON.parse(JSON.stringify(withdrawn)));
 const stale=model.sanitizeState(state(),reloaded,{allowRetained:true});assert.equal(stale.cart[0].productImage,undefined);assert.equal(stale.cart[0].sourceState.redacted,true);
 assert.equal(model.canSave(fresh()),true);assert.equal(model.identity(stale.cart[0]),null);assert.throws(()=>model.matchVerified(stale.cart[0],fresh()));
});
test('reads with no current rights fail closed even when stale cache claims retention',()=>{
 const s=model.sanitizeState(state());assert.equal(s.cart[0].sourceState.redacted,true);assert.equal(s.looks[0].shopSelections.shirt.title,undefined);
 const p=piece();delete p.shopRef.merchantId;const unresolved=model.sanitizeState({cart:[p]},undefined,{allowRetained:true});assert.equal(unresolved.cart[0].sourceState.redacted,true);
});
test('denied catalog saves and evaluation data cannot pass the shared gate',()=>{
 for(const change of [{saveAllowed:false},{saveAllowed:undefined},{evaluationOnly:true},{available:false},{merchantId:''}])assert.equal(model.canSave({...fresh(),...change}),false);
});

test('ambiguous legacy flat selections redact without inferring namespace or losing originals',()=>{
 const state={looks:[{id:'look',pieces:[],shopSelections:{shirt:{productId:'p',variantId:'v',merchantId:'one.test',title:'licensed',productImage:'https://one.test/old.jpg',notes:'My note',userPhoto:'My original'}}}]};
 for(const allowRetained of [false,true]){const s=model.sanitizeState(state,undefined,{allowRetained}),p=s.looks[0].shopSelections.shirt;
 assert.equal(p.title,undefined);assert.equal(p.productImage,undefined);assert.equal(p.sourceState.redacted,true);assert.equal(p.provider,undefined);assert.equal(p.notes,'My note');assert.equal(p.userPhoto,'My original');}
});
test('redaction keeps identity-only pointers and strips nested licensed snapshots',()=>{
 const s=state();s.cart[0].shopRef.title='licensed nested title';s.cart[0].shopRef.productImage='https://one.test/old.jpg';
 const p=model.sanitizeState(s).cart[0];assert.equal(p.shopRef.title,undefined);assert.equal(p.shopRef.productImage,undefined);assert.equal(p.shopRef.variantId,'v');assert.equal(p.notes,'My original note');
});

test('owned purchase producer never launders merchant description into user originals',()=>{
 const cart={...piece(),inspirationId:'original-inspiration',source:'retailer',description:'LICENSED_CART_DESCRIPTION',userPhoto:'original-photo',notes:'Original personal note'};
 const result=model.recordOwnedItem(cart,{retailer:'My entered retailer',paid:23.45,date:'2026-10-17',notes:'My new note'},{id:'owned-record'});
 assert.equal(result.description,'Unavailable merchant reference');assert.equal(result.shopRef.variantId,'v');assert.equal(result.owned,true);
 assert.ok(!JSON.stringify(result).includes('LICENSED_CART_DESCRIPTION'));assert.equal(result.userNotes,'Original personal note');
 const state=model.sanitizeState({purchases:[result]});const saved=state.purchases[0];
 assert.deepEqual(saved.userPurchase,{retailer:'My entered retailer',paid:23.45,date:'2026-10-17'});assert.equal(saved.userPhoto,'original-photo');assert.equal(saved.notes,'My new note');assert.equal(saved.id,'owned-record');
 assert.equal(saved.inspirationId,cart.inspirationId);assert.equal(saved.lookId,cart.lookId);
});
test('genuinely user-original owned item keeps its description and historical paid amount',()=>{
 const result=model.recordOwnedItem({description:'My own handmade shirt',type:'shirt',inspirationId:'photo',notes:'I made it'},{retailer:'Me',paid:0,date:'2026-10-17'},{id:'my-shirt'});
 const saved=model.sanitizeState({purchases:[result]}).purchases[0];assert.equal(saved.description,'My own handmade shirt');assert.equal(saved.userNotes,'I made it');assert.equal(saved.userPurchase.paid,0);assert.equal(saved.shopRef,undefined);
});
