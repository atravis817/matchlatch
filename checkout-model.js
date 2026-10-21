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
  evidenceRefs:Object.freeze(['WO-ML-018A-SAMPLE1-APPROVAL-20261018','FOUNDER-CTO-PREVIEW-ACCEPTANCE-2026-10-20','FOUNDER-CTO-PHASE5A-MULTISLOT-2026-10-20']),
  restorationRef:'WO-ML-018A-SAVED-LOOK-RESTORE-20261020',
  allowedExpiresAt:Object.freeze(['2026-10-21T20:00:00Z','2026-11-20T20:00:00Z']),
  expiresAt:Date.parse('2026-11-20T20:00:00Z'),
  products:Object.freeze({
   'gid://shopify/Product/15499321999554':Object.freeze({
    title:'BASALT S/N Jersey 3/4 Sleeve Crop Top Tee',
    productUrl:'https://pfcdgt-is.myshopify.com/products/basalt-s-n-jersey-3-4-sleeve-crop-top-tee',
    images:Object.freeze(['https://cdn.shopify.com/s/files/1/0791/5749/3954/files/Gemini_Generated_Image_gxqvlagxqvlagxqv.png?v=1791808816']),
    variants:Object.freeze({
     'gid://shopify/ProductVariant/67768739332290':'5b8a5cbe074e7e55d3ca5b83015fa7e18f88cb6159b9755f6eeaa912654a3454',
     'gid://shopify/ProductVariant/67768739397826':'c984433ec31d3fe2e810e553b75b99bc1a51b84215b2fb5a632d955c81872f81'
    })
   }),
   'gid://shopify/Product/15499322130626':Object.freeze({
    title:'DRAKON Faux Leather Crop Top Jacket',
    productUrl:'https://pfcdgt-is.myshopify.com/products/drakon-faux-leather-crop-top-jacket',
    images:Object.freeze(['https://cdn.shopify.com/s/files/1/0791/5749/3954/files/GeneratedImageDecember07_2025-6_05PM_2d86b0a6-49fb-48bc-ad62-f53cf5b80d76.png?v=1791808815']),
    variants:Object.freeze({
     'gid://shopify/ProductVariant/67768739528898':'13c28f71fcb66242d449f21a1adb60e7b6800ebf49f36c42cb9f4c0a8be6de70',
     'gid://shopify/ProductVariant/67768739659970':'3794f135f286fd36cf2a331be0c6957b725b5dd6278efb6a68910220ea813949',
     'gid://shopify/ProductVariant/67768739692738':'6185553cfa3d54c802e45dec82bb728487bec668e931454e3ad77a3d8e8bce30'
    })
   }),
   'gid://shopify/Product/15499322785986':Object.freeze({
    title:'PANTHEON Washed French Terry Stacked Jogger Pants',
    productUrl:'https://pfcdgt-is.myshopify.com/products/pantheon-washed-french-terry-stacked-jogger-pants',
    images:Object.freeze(['https://cdn.shopify.com/s/files/1/0791/5749/3954/files/Gemini_Generated_Image_ymj2hjymj2hjymj2.png?v=1791808821']),
    variants:Object.freeze({
     'gid://shopify/ProductVariant/67768743559362':'7a8f90b8419e54862474b8830c27bfd2de418ea0e97aba463c653a04d4c4e404',
     'gid://shopify/ProductVariant/67768743592130':'afee4fa721adb6067d49a095705187d2b9abc172d650ac922a671ed4dc94c8c1',
     'gid://shopify/ProductVariant/67768743624898':'a655253f97a777f4d0eb1f9c5c3e410bef2f58b4fad606c9606a235689810575',
     'gid://shopify/ProductVariant/67768743657666':'6c4859b4834c9e0c0b0268bb3160fb64cfe47092f38bac7384006db3827bd3e2',
     'gid://shopify/ProductVariant/67768743690434':'451dbc5136fe6644f155471c5cba2386de13c99997d5638b48665213cdf0f5c3',
     'gid://shopify/ProductVariant/67768743723202':'e5c1488ee80bd06efaa16e7119380ea2c503f1b17c2d1808a0352f136da03d6b'
    })
   }),
   'gid://shopify/Product/15507099615426':Object.freeze({
    title:'Premium Black Flats',
    productUrl:'https://pfcdgt-is.myshopify.com/products/premium-black-flats',
    images:Object.freeze(['https://cdn.shopify.com/s/files/1/0791/5749/3954/files/shoes-premium-black-flats-1.jpg?v=1791899127']),
    variants:Object.freeze({
     'gid://shopify/ProductVariant/67782441763010':'b56a924db86b71c6d0ca410ad553c9997e8ac28c34562d189ba071c224432f92',
     'gid://shopify/ProductVariant/67782441795778':'790aedb95ad9dbb8a7654feb4302e7e49682f4eb88343c5f446d008e90597ac7',
     'gid://shopify/ProductVariant/67782441828546':'ee5354cb2e582f67bcf4f43cdfee8a97158ead8f0022be6b55183fef4c4fff5a',
     'gid://shopify/ProductVariant/67782441861314':'1a0d23083afdb758857448344130c16aeabc38d098c1e24e0687266a7a9d5dec',
     'gid://shopify/ProductVariant/67782441894082':'7a8907fc69968cc4b65012030d5ebce3f68eb68e2fc6504ea91f510d2bc64609',
     'gid://shopify/ProductVariant/67782441926850':'3efa0a91dd94c3e2a95b95e254e75e0e81665bb1515165b81bb5f18e1e12ca37',
     'gid://shopify/ProductVariant/67782441959618':'8c7363462fac9330615e033026bfece0a8b87162e6519429c676e9ea6f0c57fc'
    })
   }),
   'gid://shopify/Product/15507092111554':Object.freeze({
    title:'G5 Flat Billed Snap Back Hat',
    productUrl:'https://pfcdgt-is.myshopify.com/products/g5-flat-billed-snap-back-hat',
    images:Object.freeze(['https://cdn.shopify.com/s/files/1/0791/5749/3954/files/G5-Snap-Back-Hat01.jpg?v=1791898958']),
    variants:Object.freeze({
     'gid://shopify/ProductVariant/67782309019842':'4b185170bdb29a0182a28b113e28966df50c72c4ef53f9f8b1561981b8e63d58'
    })
   }),
   'gid://shopify/Product/15507093749954':Object.freeze({
    title:'Bamboo Rayon Ski & Snowboard Socks - Single Pair Pack',
    productUrl:'https://pfcdgt-is.myshopify.com/products/bamboo-rayon-ski-snowboard-socks-single-pair-pack',
    images:Object.freeze([
     'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/bamboo-sports-socks-medium-black-grey-bamboo-sports-bamboo-ski-snowboard-socks-4-03-011-01-01-13653944598583.jpg?v=1791898990',
     'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/bamboo-sports-socks-medium-blue-grey-bamboo-sports-bamboo-ski-snowboard-socks-4-03-012-01-01-13653967405111.jpg?v=1791898990',
     'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/bamboo-sports-socks-medium-pink-grey-bamboo-sports-bamboo-ski-snowboard-socks-4-03-014-01-01-13654046834743.jpg?v=1791898992',
     'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/bamboo-sports-socks-medium-purple-black-bamboo-sports-bamboo-ski-snowboard-socks-4-03-013-01-01-13654058074167.jpg?v=1791898989'
    ]),
    variantImages:Object.freeze({
     'gid://shopify/ProductVariant/67782331760834':'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/bamboo-sports-socks-medium-black-grey-bamboo-sports-bamboo-ski-snowboard-socks-4-03-011-01-01-13653944598583.jpg?v=1791898990',
     'gid://shopify/ProductVariant/67782331793602':'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/bamboo-sports-socks-medium-blue-grey-bamboo-sports-bamboo-ski-snowboard-socks-4-03-012-01-01-13653967405111.jpg?v=1791898990',
     'gid://shopify/ProductVariant/67782331826370':'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/bamboo-sports-socks-medium-pink-grey-bamboo-sports-bamboo-ski-snowboard-socks-4-03-014-01-01-13654046834743.jpg?v=1791898992',
     'gid://shopify/ProductVariant/67782331859138':'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/bamboo-sports-socks-medium-purple-black-bamboo-sports-bamboo-ski-snowboard-socks-4-03-013-01-01-13654058074167.jpg?v=1791898989',
     'gid://shopify/ProductVariant/67782331891906':'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/bamboo-sports-socks-medium-black-grey-bamboo-sports-bamboo-ski-snowboard-socks-4-03-011-01-01-13653944598583.jpg?v=1791898990',
     'gid://shopify/ProductVariant/67782331957442':'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/bamboo-sports-socks-medium-pink-grey-bamboo-sports-bamboo-ski-snowboard-socks-4-03-014-01-01-13654046834743.jpg?v=1791898992',
     'gid://shopify/ProductVariant/67782331990210':'https://cdn.shopify.com/s/files/1/0791/5749/3954/files/bamboo-sports-socks-medium-purple-black-bamboo-sports-bamboo-ski-snowboard-socks-4-03-013-01-01-13654058074167.jpg?v=1791898989'
    }),
    variants:Object.freeze({
     'gid://shopify/ProductVariant/67782331760834':'1e9cf3723b316388d81b46e12d9a68e73c1d8328da420c22c59e3b99ee0e7bc5',
     'gid://shopify/ProductVariant/67782331793602':'539e5929e8fb53c842ace9be4471f2abbe352b7d0fb6d30c1db07e01dd8d514a',
     'gid://shopify/ProductVariant/67782331826370':'a7c7970468ef73f2f68d9e5b1e211acc0e72aaff326178724b4fb08dc4d4ede7',
     'gid://shopify/ProductVariant/67782331859138':'34d5d98d82231a6381a8560c754564b0036022b21341d0a066c9d71995f388c0',
     'gid://shopify/ProductVariant/67782331891906':'5bb39ea953616e1d8f150291f695d096f10fd49e3268865c21bf746d90b20d2c',
     'gid://shopify/ProductVariant/67782331957442':'6f0b3f3745bd6afc5fdf7dbaaa61b57e4cc349b4316507dee47204b8eb7cd8b0',
     'gid://shopify/ProductVariant/67782331990210':'1fa9f6073d5ad5a53b4eb0e138d978f4e32ac7620e0302be3db50b1920d416c8'
    })
   })
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
  const r=reference(v),p=r&&APPROVED_OWNED_SAMPLE.products[r.productId];if(!p)return false;
  const descOk=v?.description===p.title;
  const expectedImg=p.variantImages?.[r.variantId]||p.images[0];
  const imgOk=requireAll?v?.productImage===expectedImg:(v?.productImage===undefined||v?.productImage===expectedImg);
  const hasM=v?.merchantProductUrl!==undefined&&v?.merchantProductUrl!=='';
  const hasP=v?.productUrl!==undefined&&v?.productUrl!=='';
  const mOk=!hasM||safeUrl(v.merchantProductUrl)===p.productUrl;
  const pOk=!hasP||safeUrl(v.productUrl)===p.productUrl;
  const urlOk=mOk&&pOk&&(!requireAll||(hasM||hasP));
  return Boolean(descOk&&imgOk&&urlOk);
 }
 function isApprovedSample(v,now=Date.now()){
  const r=reference(v),p=r&&APPROVED_OWNED_SAMPLE.products[r.productId],hash=p&&p.variants[r.variantId];
  const restExp=v?.sourceState?.restoration?.expiresAt;
  const cap=restExp&&APPROVED_OWNED_SAMPLE.allowedExpiresAt.includes(restExp)?Date.parse(restExp):APPROVED_OWNED_SAMPLE.expiresAt;
  return Boolean(r&&p&&hash&&r.provider===APPROVED_OWNED_SAMPLE.provider&&r.merchantId===APPROVED_OWNED_SAMPLE.merchantId&&Number.isFinite(now)&&now<=cap&&v?.sourceState?.rights==='retained'&&v?.sourceState?.redacted===false&&!revocationReason(v)&&hasCanonicalApprovedContent(v));
 }
 function isAuthorizedRestore(v,now=Date.now()){
  if(!isApprovedSample(v,now)||!hasCanonicalApprovedContent(v,{requireAll:true}))return false;
  const r=reference(v),rest=v?.sourceState?.restoration,hash=APPROVED_OWNED_SAMPLE.products[r.productId]?.variants[r.variantId];
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
