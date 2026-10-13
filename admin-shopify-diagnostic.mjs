// Click-only UI. Shopify secrets and provider responses stay in the server function.
export function connectShopifyDiagnostic({button,output,getSession,isOwnerView,mode="connection",fetcher=fetch}){
 let pending=false,generation=0;
 const reset=()=>{generation++;pending=false;button.disabled=false;output.textContent='';output.hidden=true;};
 button.onclick=async()=>{
  if(pending||!isOwnerView())return;
  pending=true;button.disabled=true;const ticket=++generation;
  output.hidden=false;output.textContent=mode==='shipping'?'Checking one-unit shipping quote…':'Testing Shopify connection…';
  try{
   const {data}=await getSession();if(ticket!==generation)return;
   if(!data?.session){reset();return;}
   const response=await fetcher(mode==='shipping'?'/api/admin-summary?action=shopify-shipping':'/api/admin-summary?action=shopify-diagnostic',{method:'POST',headers:{Authorization:'Bearer '+data.session.access_token},credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(mode==='shipping'?45000:15000)});
   const d=await response.json();if(ticket!==generation||!isOwnerView())return;
   const state=value=>value===true?'Yes':value===false?'No':'Unverified';
   if(mode==='shipping'){
    const categories={rates_returned:'Shipping options returned for the submitted partial destination.',no_rates_returned:'No shipping options returned. More address details or shipping configuration may be needed.',cart_or_address_rejected:'Shopify rejected the cart or minimum address. No further changes attempted.',minimum_address_not_accepted:'Minimum address was not accepted. Additional address information is needed.',variant_not_qualified:'Variant is not currently qualified for this test.',graphql_rejected:'Shopify rejected shipping access or the query.',rates_incomplete:'Shipping-rate response was incomplete.',authorization_denied:'Shopify denied cart access.'};
    const rows=[categories[d.category]||'Shipping test could not be verified.',`Cart created: ${d.cartCreation==='pass'?'Yes':d.cartCreation==='not_attempted'?'No':'Unverified'}`,`Partial destination accepted: ${state(d.destinationAccepted)}`];
    for(const o of (Array.isArray(d.shippingOptions)?d.shippingOptions:[]).slice(0,20))if(typeof o.service==='string'&&o.currency==='USD'&&/^\d+(?:\.\d{1,2})?$/.test(o.amount||''))rows.push(o.service.slice(0,160)+' · $'+o.amount+' USD'+(typeof o.description==='string'&&o.description?' · '+o.description.slice(0,160):''));
    if(!d.shippingOptions?.length)rows.push('Shipping cost and transit time: Unverified.');
    for(const e of (Array.isArray(d.errors)?d.errors:[]).slice(0,5)){const fields=(Array.isArray(e.fields)?e.fields:[]).filter(f=>['countryCode','provinceCode','zip','address1','address2','city','firstName','lastName','phone','email','delivery','addresses','buyerIdentity','lines','merchandiseId','quantity'].includes(f));if(fields.length)rows.push('Fields needing review: '+fields.join(', '));}
    for(const e of (Array.isArray(d.graphqlErrors)?d.graphqlErrors:[]).slice(0,5)){const scopes=(Array.isArray(e.missingScopes)?e.missingScopes:[]).filter(s=>['unauthenticated_read_checkouts','unauthenticated_write_checkouts','unauthenticated_read_product_inventory','unauthenticated_read_product_listings'].includes(s));if(scopes.length)rows.push('Required scope: '+scopes.join(', '));}
    rows.push('Tax: Unknown. Quote is not a delivery guarantee.','No checkout, payment or order initiated.');
    if(response.status===403)rows.splice(0,rows.length,'Owner access denied.');if(response.status===429)rows.splice(0,rows.length,'Shipping test request limit reached.');
    output.textContent=rows.join('\n');return;
   }
   if(!response.ok){const messages={authorization_denied:'Shopify denied authentication.',configuration_unavailable:'Server configuration needs verification.',graphql_rejected:'Shopify rejected the query or its permissions.',upstream_rate_limited:'Shopify request limit reached.',invalid_response:'Shopify returned an unexpected response.',transport_or_timeout:'Connection failed or timed out.'};output.textContent=response.status===403?'Owner access denied.':response.status===429?'Please wait before testing again.':messages[d.category]||'Connection could not be verified.';
    if(d.category==='graphql_rejected'){
     output.textContent+='\nAuthentication: '+(d.authentication==='fail'?'Failed':'Unverified')+'\nQuery: Rejected\nProduct visibility: Unverified';
     for(const e of (Array.isArray(d.graphqlErrors)?d.graphqlErrors:[]).slice(0,5)){
      const codes=['ACCESS_DENIED','UNAUTHENTICATED','THROTTLED','GRAPHQL_VALIDATION_FAILED','undefinedField','accessDenied','argumentNotAccepted','variableRequiresValidType','UNCLASSIFIED'];
      const fields=(Array.isArray(e.fields)?e.fields:[]).filter(f=>['product','variants','quantityAvailable','availableForSale','currentlyNotInStock','id','price','image','selectedOptions','onlineStoreUrl','vendor','productType','title','amount','currencyCode','name','value','url','altText','pageInfo','hasNextPage','endCursor'].includes(f));
      const scopes=(Array.isArray(e.missingScopes)?e.missingScopes:[]).filter(s=>['unauthenticated_read_product_inventory','unauthenticated_read_product_listings'].includes(s));
      output.textContent+='\nCode: '+(codes.includes(e.code)?e.code:'UNCLASSIFIED')+(fields.length?' · fields: '+fields.join(', '):'')+(scopes.length?' · scope: '+scopes.join(', '):'');
     }
    }return;}
   const auth=d.authentication==='pass'?'Passed':d.authentication==='fail'?'Failed':'Unverified';
   const visible=d.productVisibility==='visible_through_token_channel'?'Visible':'Unverified';
   const price=d.price?.currency==='USD'&&Number.isFinite(d.price.amount)&&d.price.amount>0?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(d.price.amount):'Unverified';
   output.textContent=[`Authentication: ${auth}`,`Product: ${visible}`,`BASALT Size S available: ${state(d.availableForSale)}`,`Current price: ${price}`,`Backorder flag: ${state(d.currentlyNotInStock)}`,`Storefront quantity: ${Number.isSafeInteger(d.quantityAvailable)&&d.quantityAvailable>=0?d.quantityAvailable:"Unverified"}`,`Observed: ${typeof d.observedAt==="string"&&Number.isFinite(Date.parse(d.observedAt))?new Date(d.observedAt).toISOString():"Unverified"}`,`Exact variant: ${d.variantId==="gid://shopify/ProductVariant/67768739332290"?"67768739332290":"Unverified"}`,`Adapter normalized: ${state(d.adapter?.normalized)}`,`Size S identified: ${state(d.sizeS)}`,`Product image returned: ${state(d.image?.present)}`,'Remaining gaps: supplier linkage, sales-channel identity, display/image permissions, and US shipping require independent verification.',d.apiVersionAccepted===true?'API version confirmed.':'API version remains unverified.','Live Studio discovery and checkout remain disabled.'].join('\n');
  }catch{if(ticket===generation)output.textContent='Connection could not be verified. Try again later.';}
  finally{if(ticket===generation){pending=false;button.disabled=mode==='shipping';}}
 };
 return {reset};
}
