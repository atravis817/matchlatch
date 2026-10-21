/* Shared checkout calculations. No network, account data or provider mutations. */
(function(root){
 'use strict';
 const quantity=value=>value===undefined?1:Number.isSafeInteger(Number(value))&&Number(value)>=1&&Number(value)<=20?Number(value):null;
 const cents=value=>{if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=1000000&&Math.abs(n*100-Math.round(n*100))<0.000001?Math.round(n*100):null;};
 function safeUrl(value,{host,checkout=false}={}){
  try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||u.hostname==='localhost'||/^\d+(?:\.\d+){3}$/.test(u.hostname)||!u.hostname.includes('.'))return '';
   if(host&&u.hostname!==host)return '';
   if(!checkout&&(/\/(?:checkouts?|cart|account|login|auth|payment|oauth)(?:\/|$)/i.test(u.pathname)||/^awin[12]?\.com$/.test(u.hostname)||u.hostname.endsWith('.awin1.com')))return '';
   for(const k of u.searchParams.keys())if(/^(?:redirect|redirect_uri|return_url|url|access_token|token|email|password)$/i.test(k))return '';
   return u.href;
  }catch{return '';}
 }
 const destination=item=>safeUrl(item?.merchantProductUrl||item?.productUrl);
 // Provider and merchant are explicit namespaces. Legacy references remain unresolved.
 const reference=item=>{
  const r=item?.shopRef||item;
  const provider=r?.provider??(typeof r?.source==='string'?r.source:null);
  const merchantId=r?.merchantId;
  if(![provider,merchantId,r?.productId,r?.variantId].every(v=>typeof v==='string'&&v.length>0))return null;
  if(item?.shopRef&&item.merchantId&&item.merchantId!==merchantId)return null;
  return {provider,merchantId,productId:r.productId,variantId:r.variantId};
 };
 const sourceKey=item=>{const r=reference(item);return r?JSON.stringify([r.provider,r.merchantId,r.productId,r.variantId]):null;};
 const sameSource=(a,b)=>Boolean(sourceKey(a)&&sourceKey(a)===sourceKey(b));
 const identity=item=>item?.shopRef&&destination(item)&&item?.sourceState?.status!=='unavailable'&&item?.sourceState?.redacted!==true?sourceKey(item):null;
 const optionKey=options=>JSON.stringify((Array.isArray(options)?options:[]).map(o=>[String(o.name),String(o.value)]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
 const canSave=item=>Boolean(reference(item)&&['shopify_storefront','awin'].includes(reference(item).provider)&&item?.saveAllowed===true&&!item.evaluationOnly&&item.available===true);
 // Conservative local retention policy until exact licensed retention rights are supplied.
 // User-authored fields and associations survive; merchant snapshots are an allowlist.

 const APPROVED_OWNED_SAMPLE=Object.freeze({
  provider:'shopify_storefront',
  merchantId:'pfcdgt-is.myshopify.com',
  productId:'gid://shopify/Product/15499321999554',
  title:'BASALT S/N Jersey 3/4 Sleeve Crop Top Tee',
  productUrl:'https://pfcdgt-is.myshopify.com/products/basalt-s-n-jersey-3-4-sleeve-crop-top-tee',
  productImage:'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/Gemini_Generated_Image_gxqvlagxqvlagxqv.png?v=1791808816',
  evidenceRefs:Object.freeze(['WO-ML-018A-SAMPLE1-APPROVAL-20261018','FOUNDER-CTO-PREVIEW-ACCEPTANCE-2026-10-20']),
  restorationRef:'WO-ML-018A-SAVED-LOOK-RESTORE-20261020',
  allowedExpiresAt:Object.freeze(['2026-10-21T20:00:00Z','2026-11-20T20:00:00Z']),
  expiresAt:Date.parse('2026-11-20T20:00:00Z'),
  variants:Object.freeze({
   'gid://shopify/ProductVariant/67768739332290':'5b8a5cbe074e7e55d3ca5b83015fa7e18f88cb6159b9755f6eeaa912654a3454',
   'gid://shopify/ProductVariant/67768739397826':'c984433ec31d3fe2e810e553b75b99bc1a51b84215b2fb5a632d955c81872f81'
  })
 });
 const REVOCATION_REASONS=new Set(['delisted','permission_revoked','unresolved']);
 const productKey=item=>{const r=reference(item);return r?JSON.stringify([r.provider,r.merchantId,r.productId]):null;};
 function revocationReason(v){
  const s=v?.sourceState;
  if(REVOCATION_REASONS.has(s?.reason))return s.reason;
  if(REVOCATION_REASONS.has(v?.reason))return v.reason;
  if(s?.revoked===true||v?.revoked===true||s?.rightsState==='withdrawn'||v?.rightsState==='withdrawn'||s?.rights==='withdrawn'||v?.rights==='withdrawn'||s?.reason==='withdrawn'||v?.reason==='withdrawn')return 'permission_revoked';
  return null;
 }
 function hasCanonicalApprovedContent(v,{requireAll=false}={}){
  const descOk=v?.description===APPROVED_OWNED_SAMPLE.title;
  const imgOk=requireAll?v?.productImage===APPROVED_OWNED_SAMPLE.productImage:(v?.productImage===undefined||v?.productImage===APPROVED_OWNED_SAMPLE.productImage);
  const hasM=v?.merchantProductUrl!==undefined&&v?.merchantProductUrl!=='';
  const hasP=v?.productUrl!==undefined&&v?.productUrl!=='';
  const mOk=!hasM||safeUrl(v.merchantProductUrl)===APPROVED_OWNED_SAMPLE.productUrl;
  const pOk=!hasP||safeUrl(v.productUrl)===APPROVED_OWNED_SAMPLE.productUrl;
  const urlOk=mOk&&pOk&&(!requireAll||(hasM||hasP));
  return Boolean(descOk&&imgOk&&urlOk);
 }
 function isApprovedSample(v,now=Date.now()){
  const r=reference(v),hash=r&&APPROVED_OWNED_SAMPLE.variants[r.variantId];
  const restExp=v?.sourceState?.restoration?.expiresAt;
  const cap=restExp&&APPROVED_OWNED_SAMPLE.allowedExpiresAt.includes(restExp)?Date.parse(restExp):APPROVED_OWNED_SAMPLE.expiresAt;
  return Boolean(r&&hash&&r.provider===APPROVED_OWNED_SAMPLE.provider&&r.merchantId===APPROVED_OWNED_SAMPLE.merchantId&&r.productId===APPROVED_OWNED_SAMPLE.productId&&Number.isFinite(now)&&now<=cap&&v?.sourceState?.rights==='retained'&&v?.sourceState?.redacted===false&&!revocationReason(v)&&hasCanonicalApprovedContent(v));
 }
 function isAuthorizedRestore(v,now=Date.now()){
  if(!isApprovedSample(v,now)||!hasCanonicalApprovedContent(v,{requireAll:true}))return false;
  const rest=v?.sourceState?.restoration,hash=APPROVED_OWNED_SAMPLE.variants[reference(v).variantId];
  return Boolean(rest&&rest.decisionRef===APPROVED_OWNED_SAMPLE.restorationRef&&APPROVED_OWNED_SAMPLE.evidenceRefs.includes(rest.evidenceRef)&&rest.materialHash===hash&&APPROVED_OWNED_SAMPLE.allowedExpiresAt.includes(rest.expiresAt)&&now<=Date.parse(rest.expiresAt));
 }

 function sanitizeState(input,previous,{allowRetained=false,now=Date.now()}={}){
  const state=JSON.parse(JSON.stringify(input||{})),blocked=new Set(),revoked=new Map(),revokedProducts=new Map(),redactedRefs=new Map(),restoredRefs=new Map(),nonRestoredInState=new Set(),seenRecIds=new Set(),dupRecIds=new Set(),dupProductInLook=new Set();
  const walk=(v,fn,recId='')=>{
   if(!v||typeof v!=='object')return;
   if(Array.isArray(v)){v.forEach((x,i)=>walk(x,fn,typeof x?.id==='string'&&x.id?recId:recId+'#'+i));return;}
   const ownId=typeof v.id==='string'&&v.id?v.id:'';
   const nextRec=ownId?(recId?recId+':'+ownId:ownId):recId;
   fn(v,nextRec);
   for(const [k,x] of Object.entries(v))if(!['shopRef','sourceState'].includes(k))walk(x,fn,nextRec?nextRec+'.'+k:k);
  };
  for(const look of state.looks||[]){
   const seenProducts=new Set();
   for(const p of look?.pieces||[]){
    const pk=productKey(p);if(!pk)continue;
    if(seenProducts.has(pk))dupProductInLook.add(pk);else seenProducts.add(pk);
   }
  }
  for(const root of [previous,state])walk(root,(v,recId)=>{
   const key=sourceKey(v),pk=productKey(v),revReason=revocationReason(v);if(!key)return;
   if(revReason){revoked.set(key,revReason);if(pk)revokedProducts.set(pk,revReason);}
   if(v.sourceState?.redacted===true||revReason){
    blocked.add(key);
    if(!redactedRefs.has(key))redactedRefs.set(key,new Set());
    redactedRefs.get(key).add(recId||'__anon__');
   }
  });
  walk(state,(v,recId)=>{
   const key=sourceKey(v);if(!key)return;
   if(recId){if(seenRecIds.has(recId))dupRecIds.add(recId);else seenRecIds.add(recId);}
   if(isAuthorizedRestore(v,now)&&recId){
    if(!restoredRefs.has(key))restoredRefs.set(key,new Set());
    restoredRefs.get(key).add(recId);
   }else if(v.sourceState?.redacted!==true){
    nonRestoredInState.add(key);
   }
  });
  for(const key of [...blocked]){
   const redSet=redactedRefs.get(key),resSet=restoredRefs.get(key);
   if(!revoked.has(key)&&!nonRestoredInState.has(key)&&redSet?.size&&resSet?.size&&[...redSet].every(id=>id!=='__anon__'&&!dupRecIds.has(id)&&resSet.has(id))){
    blocked.delete(key);
   }
  }
  walk(state,(v,recId)=>{
   if(!v.shopRef&&!(v.productId&&v.variantId))return; // User-original records, notes and photos are outside merchant retention.
   const approvedOwned=isApprovedSample(v,now),restoredOwned=isAuthorizedRestore(v,now);
   const key=sourceKey(v),pk=productKey(v),wasRedacted=redactedRefs.has(key),revReason=revocationReason(v)||revoked.get(key)||revokedProducts.get(pk);
   const redact=!key||Boolean(revReason)||blocked.has(key)||dupRecIds.has(recId)||dupProductInLook.has(pk)||(wasRedacted&&!restoredOwned)||(!allowRetained&&!approvedOwned)||v.sourceState?.rights!=='retained';
   const unavailable=redact||v.sourceState?.status==='unavailable';
   const prevReason=revReason;
   const keepRestore=!redact&&restoredOwned?JSON.parse(JSON.stringify(v.sourceState.restoration)):null;
   if(redact){
    const keep=new Set(['id','lookId','inspirationId','pieceIndex','type','slot','quantity','owned','userNotes','notes','userPhoto','userPhotos','createdAt','provider','merchantId','productId','variantId','shopRef','sourceState','source','wanted','userIntent','userPurchase']);
    for(const field of Object.keys(v))if(!keep.has(field))delete v[field];
    if(v.shopRef){const ref=v.shopRef;v.shopRef=Object.fromEntries(['provider','merchantId','productId','variantId','slot'].filter(k=>typeof ref[k]==='string').map(k=>[k,ref[k]]));}
    v.description='Unavailable merchant reference';
   }
   v.sourceState={status:unavailable?'unavailable':'available',rights:redact?'unresolved':'retained',redacted:redact,...(redact&&prevReason?{reason:prevReason}:{}),...(keepRestore?{restoration:keepRestore}:{})};
  });
  // Composite merchant-derived imagery can contain a withdrawn source. Preserve only
  // explicitly user-original photos (inspirationId/userPhoto), never generated previews.
  for(const look of state.looks||[])if((look.pieces||[]).some(p=>p.sourceState?.redacted)){
   for(const field of ['derivedImage','derivedImages','generatedImage','productImage','merchantSnapshot','styleNotes'])delete look[field];
  }
  return state;
 }
 function sourceTransition(state,ref,{reason,rightsRetained=false}={}){
  if(!sourceKey(ref))throw Error('Unresolved source identity');
  if(!['stockout','delisted','permission_revoked','unresolved'].includes(reason))throw Error('Invalid source transition');
  const next=JSON.parse(JSON.stringify(state));
  const visit=v=>{if(!v||typeof v!=='object')return;if((v.shopRef||v.productId&&v.variantId)&&sameSource(v,ref)){const redact=reason!=='stockout'||!rightsRetained;v.sourceState={status:'unavailable',rights:reason==='stockout'&&rightsRetained?'retained':'unresolved',redacted:redact,...(redact&&REVOCATION_REASONS.has(reason)?{reason}:{})};}for(const [k,x] of Object.entries(v))if(!['shopRef','sourceState'].includes(k)){if(Array.isArray(x))x.forEach(visit);else visit(x);}};
  visit(next);return sanitizeState(next,state,{allowRetained:true});
 }

 function groupCart(cart){
  const groups=new Map(),unresolved=[];
  for(const item of cart||[]){const u=destination(item),price=cents(item.target),q=quantity(item.quantity);
   if(!identity(item)||item.currency!=='USD'||price===null||q===null){unresolved.push(item);continue;}
   const host=new URL(u).hostname,merchantId=String(item.merchantId||item.shopRef.merchantId||host),key=JSON.stringify([item.shopRef.provider,merchantId,host]);
   if(!groups.has(key))groups.set(key,{key,host,merchantId,merchant:item.retailer||host,currency:'USD',items:[],subtotalCents:0,units:0});
   const g=groups.get(key);g.items.push(item);g.subtotalCents+=price*q;g.units+=q;
  }
  return {groups:[...groups.values()],unresolved,subtotalCents:[...groups.values()].reduce((n,g)=>n+g.subtotalCents,0)};
 }
 const fingerprint=(group,destination={})=>JSON.stringify({merchant:group.key,lines:group.items.map(i=>[identity(i),quantity(i.quantity),cents(i.target),i.size||'',i.color||'',i.variant||'',optionKey(i.options)]).sort((a,b)=>a[0].localeCompare(b[0])),destination});
 const fresh=(at,now=Date.now())=>Number.isFinite(Date.parse(at))&&Date.parse(at)<=now&&now-Date.parse(at)<=300000;
 function matchVerified(item,live){
  if(!sameSource(item,live)||item?.sourceState?.status==='unavailable'||item?.sourceState?.redacted===true||live?.saveAllowed!==true||live?.evaluationOnly||live.productId!==item.shopRef?.productId||live.variantId!==item.shopRef?.variantId||live.currency!==item.currency||live.available!==true||cents(live.price)===null)throw Error('The selected product or variant is no longer verified.');
  const original=destination(item),current=safeUrl(live.merchantProductUrl||live.url);
  if(!original||!current||new URL(current).hostname!==new URL(original).hostname||(item.merchantId&&live.merchantId!==item.merchantId))throw Error('The retailer association changed. Choose the item again.');
  for(const k of ['size','color'])if(item[k]&&String(live[k]||'')!==String(item[k]))throw Error('The selected '+k+' changed. Choose the item again.');
  if(optionKey(item.options)!==optionKey(live.options))throw Error('The selected options changed. Choose the item again.');
  if(!fresh(live.checkedAt))throw Error('Availability information expired. Check this item again.');
  return {productUrl:current,priceCents:cents(live.price),priceChanged:cents(live.price)!==cents(item.target),feedOnly:live.stockVerifiedLive===false};
 }
 function recordOwnedItem(item,details,{id,createdAt=new Date().toISOString()}={}){
  const managed=Boolean(item?.shopRef||item?.productId&&item?.variantId||item?.source==='retailer');
  const result={id,inspirationId:item.inspirationId,lookId:item.lookId,type:item.type,slot:item.slot,owned:true,
   description:managed?'Unavailable merchant reference':item.description,
   userPurchase:{retailer:String(details.retailer||'').trim().slice(0,100),paid:Number(details.paid),date:String(details.date||'')},
   notes:String(details.notes||'').trim().slice(0,240),createdAt,source:'user-entered'};
  for(const k of ['userNotes','userPhoto','userPhotos','userIntent'])if(item[k]!==undefined)result[k]=JSON.parse(JSON.stringify(item[k]));
  if(item.notes&&!result.userNotes)result.userNotes=String(item.notes);
  if(managed){const ref=item.shopRef||item;result.shopRef=Object.fromEntries(['provider','merchantId','productId','variantId','slot'].filter(k=>typeof ref[k]==='string').map(k=>[k,ref[k]]));result.sourceState={status:'unavailable',rights:'unresolved',redacted:true};}
  return result;
 }
 const api={recordOwnedItem,reference,sourceKey,sameSource,optionKey,canSave,sanitizeState,sourceTransition,quantity,cents,safeUrl,destination,identity,groupCart,fingerprint,fresh,matchVerified};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.MatchlatchCheckoutModel=Object.freeze(api);
})(typeof window==='object'?window:globalThis);
