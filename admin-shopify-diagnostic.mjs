// Click-only UI. Shopify secrets and provider responses stay in the server function.
export function connectShopifyDiagnostic({button,output,getSession,isOwnerView,fetcher=fetch}){
 let pending=false,generation=0;
 const reset=()=>{generation++;pending=false;button.disabled=false;output.textContent='';output.hidden=true;};
 button.onclick=async()=>{
  if(pending||!isOwnerView())return;
  pending=true;button.disabled=true;const ticket=++generation;
  output.hidden=false;output.textContent='Testing Shopify connection…';
  try{
   const {data}=await getSession();if(ticket!==generation)return;
   if(!data?.session){reset();return;}
   const response=await fetcher('/api/admin-summary?action=shopify-diagnostic',{method:'POST',headers:{Authorization:'Bearer '+data.session.access_token},credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});
   const d=await response.json();if(ticket!==generation||!isOwnerView())return;
   const state=value=>value===true?'Yes':value===false?'No':'Unverified';
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
   output.textContent=[`Authentication: ${auth}`,`Product: ${visible}`,`BASALT Size S available: ${state(d.availableForSale)}`,`Current price: ${price}`,`Adapter normalized: ${state(d.adapter?.normalized)}`,`Size S identified: ${state(d.sizeS)}`,`Product image returned: ${state(d.image?.present)}`,'Remaining gaps: supplier linkage, sales-channel identity, display/image permissions, and US shipping require independent verification.',d.apiVersionAccepted===true?'API version confirmed.':'API version remains unverified.','Live Studio discovery and checkout remain disabled.'].join('\n');
  }catch{if(ticket===generation)output.textContent='Connection could not be verified. Try again later.';}
  finally{if(ticket===generation){pending=false;button.disabled=false;}}
 };
 return {reset};
}
