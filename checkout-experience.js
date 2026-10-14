/* Unified review; merchant carts and destinations stay independent. */
(function(){
 'use strict';
 const m=window.MatchlatchCheckoutModel;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,action,cls='commerce-secondary')=>{const n=el('button',text,cls);n.type='button';n.onclick=action;return n;};
 const money=c=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100);
 const beta=()=>document.querySelector('meta[name="matchlatch-usability-beta"]')?.content==='purchases-disabled';
 let epoch=0;
 // Sensitive destination and sealed cart state are never persisted in localStorage or cloud records.
 const sessions=new Map();
 const reset=()=>{epoch++;sessions.clear();};
 const reconcile=items=>{const groups=m.groupCart(items).groups;for(const [key,s] of sessions){const g=groups.find(g=>g.key===key);if(!g||s.fingerprint!==m.fingerprint(g,s.destination))sessions.delete(key);}};
 const invalidate=item=>{for(const g of m.groupCart([item]).groups)sessions.delete(g.key);};
 window.addEventListener('matchlatch:auth-user',reset);
 function line(item,hooks,edit=true){
  const row=el('article',null,'checkout-line');row.append(hooks.image(item));const content=el('div');
  content.append(el('h4',item.description||'Saved item'),el('small',[item.size?'Size '+item.size:'Size not supplied',item.color?'Color '+item.color:'',item.variant||''].filter(Boolean).join(' · ')));
  const q=m.quantity(item.quantity),c=m.cents(item.target);content.append(el('p',c===null?'Price unavailable':money(c)+' USD each · '+(q===null?'Invalid quantity':q+' selected')));
  if(edit){const label=el('label','Quantity','checkout-quantity'),input=el('input');input.type='number';input.min='1';input.max='20';input.step='1';input.value=String(q||1);input.setAttribute('aria-label','Quantity for '+item.description);input.onchange=()=>{const value=m.quantity(input.value);if(value===null){input.setCustomValidity('Choose a whole number from 1 to 20.');input.reportValidity();return;}input.setCustomValidity('');invalidate(item);hooks.quantity(item.id,value);};label.append(input);content.append(label,button('Remove',()=>{invalidate(item);hooks.remove(item);},'quiet-button'));}
  if(item.shopRef)content.append(el('small',m.fresh(item.checkedAt)?'Reported availability is not a stock reservation.':'Availability needs a fresh retailer check.'));
  if(item.inspirationId&&item.lookId&&hooks.record)content.append(button('Record purchase',()=>hooks.record(item.id)));
  row.append(content);return row;
 }
 function breakdown(group,quote){
  const d=el('dl',null,'checkout-breakdown');const add=(name,value)=>d.append(el('dt',name),el('dd',value));
  add('Merchandise subtotal',money(group.subtotalCents)+' USD');
  if(quote?.subtotalCents!==undefined&&quote.subtotalCents!==null&&quote.subtotalCents!==group.subtotalCents)add('Current retailer merchandise subtotal',money(quote.subtotalCents)+' USD · price changed');
  add('Shipping',quote?.shippingCents!==null&&quote?.shippingCents!==undefined?money(quote.shippingCents)+' USD · quoted estimate':'Not yet available');
  add('Tax','Determined at retailer checkout');
  if(quote?.estimatedTotalCents!==null&&quote?.estimatedTotalCents!==undefined)add('Estimated total (items, shipping, tax)',money(quote.estimatedTotalCents)+' USD');
  else add('Estimated checkout total','Unavailable until shipping and tax are known');
  return d;
 }
 function cart(target,items,hooks){
  reconcile(items);target.replaceChildren();const review=m.groupCart(items);
  if(!items.length){target.append(el('h3','Your cart is empty.'),button('Explore Store',()=>hooks.page('store')));return;}
  target.append(el('p','Your selections stay here while you explore Studio and Store.','library-caption'));
  for(const g of review.groups){const section=el('section',null,'checkout-merchant');section.append(el('h3',g.merchant));for(const item of g.items)section.append(line(item,hooks));section.append(el('p','Merchandise subtotal: '+money(g.subtotalCents)+' USD'));target.append(section);}
  if(review.unresolved.length){const section=el('section',null,'checkout-merchant');section.append(el('h3','Selections needing review'),el('p','Ideas and older records remain saved. Select an exact retailer variant before checkout.'));for(const item of review.unresolved)section.append(line(item,hooks));target.append(section);}
  target.append(el('p','Combined merchandise subtotal: '+money(review.subtotalCents)+' USD · excludes shipping and taxes. Ideas without verified prices are excluded.','checkout-warning'));
  const actions=el('div',null,'checkout-actions');actions.append(button('Review cart',()=>hooks.review(),'commerce-primary'),button('Return to Store',()=>hooks.page('store')),button('Return to Studio',()=>hooks.page('studio')));target.append(actions);
 }
 function checkout(target,items,hooks){
  reconcile(items);target.replaceChildren();const review=m.groupCart(items),ticket=epoch,user=hooks.user();
  target.append(el('h3','Review your selections'),el('p','Each retailer completes its own purchase. Separate retailers may charge separate shipping and taxes.'));
  if(beta())target.append(el('p','Usability Preview: cart review is available. Retailer cart preparation and outbound checkout remain disabled.','checkout-warning'));
  for(const group of review.groups){
   const section=el('section',null,'checkout-merchant');section.append(el('h3',group.merchant),el('small',group.host));for(const item of group.items)section.append(line(item,hooks));
   const totals=el('div');totals.append(breakdown(group));section.append(totals);
   const status=el('p','Shipping and tax are confirmed by this retailer.','checkout-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
   const destinationForm=el('div',null,'checkout-destination'),fields={};
   for(const [name,label,max] of [['provinceCode','US state code',2],['zip','ZIP code',10],['city','City (if required)',100],['address1','Street address (if required)',160],['address2','Apartment or suite (optional)',160]]){
    const labelNode=el('label',label),input=el('input');input.maxLength=max;input.name=name;input.autocomplete='off';input.setAttribute('aria-label',label+' for '+group.merchant);if(name==='zip')input.inputMode='numeric';input.oninput=()=>{sessions.delete(group.key);delivery.replaceChildren();handoff.replaceChildren();totals.replaceChildren(breakdown(group));status.textContent='Destination changed. Check shipping again.';};const cached=sessions.get(group.key);if(cached?.destination&&cached.fingerprint===m.fingerprint(group,cached.destination)&&m.fresh(cached.quote.checkedAt))input.value=cached.destination[name]||'';fields[name]=input;labelNode.append(input);if(name.startsWith('address'))labelNode.className='wide';destinationForm.append(labelNode);
   }
   section.append(el('p','Destination details are sent only to this retailer when you select Check shipping. They are not saved or sent to styling AI.','checkout-status'),destinationForm);
   const delivery=el('div',null,'checkout-delivery'),handoff=el('div',null,'checkout-actions'),actions=el('div',null,'checkout-actions');let pending=false;
   const current=()=>ticket===epoch&&hooks.user()===user&&section.isConnected;
   const address=()=>Object.fromEntries([['countryCode','US'],...Object.entries(fields).filter(([,v])=>v.value.trim()).map(([k,v])=>[k,k==='provinceCode'?v.value.trim().toUpperCase():v.value.trim()])]);
   async function request(operation,options){
    if(pending||!current())return;const dest=address(),fingerprint=m.fingerprint(group,dest),previous=sessions.get(group.key);
    if(!/^[A-Z]{2}$/.test(dest.provinceCode||'')||!/^\d{5}(?:-\d{4})?$/.test(dest.zip||'')){status.textContent='Enter a two-letter US state and ZIP code.';return;}
    pending=true;check.disabled=true;handoff.replaceChildren();status.textContent='Checking this retailer’s exact selections and shipping…';
    try{const headers=await hooks.headers();if(!current())return;
     const r=await fetch('/api/commerce?action=checkout',{method:'POST',headers:{...headers,'content-type':'application/json'},credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(60000),body:JSON.stringify({operation,merchant:group.host,destination:dest,lines:group.items.map(i=>({productId:i.shopRef.productId,variantId:i.shopRef.variantId,quantity:m.quantity(i.quantity),size:i.size||'',color:i.color||''})),...(previous?.fingerprint===fingerprint?{state:previous.quote.state}:{}),...(options?{options}:{})})});
     const quote=await r.json();if(!current()||m.fingerprint(group,address())!==fingerprint)return;
     if(!r.ok)throw Error(quote.error||'Retailer shipping could not be verified.');
     if(quote.merchant!==group.host||quote.currency!=='USD'||!m.fresh(quote.checkedAt)||!m.safeUrl(quote.checkoutUrl,{host:group.host,checkout:true}))throw Error('Retailer response did not match these selections.');
     sessions.set(group.key,{fingerprint,quote,destination:dest});totals.replaceChildren(breakdown(group,quote));delivery.replaceChildren();
     const choices=[];for(const g of quote.deliveryGroups||[]){const label=el('label','Shipping service'),select=el('select');select.setAttribute('aria-label','Shipping service for '+group.merchant);const none=el('option','Choose a shipping service');none.value='';select.append(none);for(const o of g.options){const option=el('option',o.service+' · '+money(o.amountCents)+' '+o.currency+(o.description?' · '+o.description:''));option.value=o.handle;select.append(option);}select.value=g.selected||'';label.append(select);delivery.append(label);choices.push({id:g.id,select});}
     if(choices.length)delivery.append(button('Use selected shipping',()=>request('select',choices.map(c=>({deliveryGroupId:c.id,deliveryOptionHandle:c.select.value})))));
     status.textContent=(quote.status==='more_information_required'?'The retailer needs more information for shipping. ':'Shipping quotes are estimates, not delivery guarantees. ')+(quote.subtotalCents!==group.subtotalCents?'The retailer price changed; review the updated subtotal. ':'')+'Final charge is determined at retailer checkout.';
     const link=el('a','Continue to retailer ↗','checkout-link');link.href=quote.checkoutUrl;link.target='_blank';link.rel='noopener noreferrer';link.onclick=event=>{if(!current()||Date.parse(quote.expiresAt)<=Date.now()||m.fingerprint(group,address())!==fingerprint){event.preventDefault();handoff.replaceChildren();status.textContent='Quote expired or selections changed. Check shipping again.';}};handoff.append(link);check.textContent='Refresh shipping';
    }catch(e){if(current()){sessions.delete(group.key);delivery.replaceChildren();totals.replaceChildren(breakdown(group));status.textContent=e.message||'Shipping is unavailable. Confirm it at the retailer.';}}
    finally{if(current()){pending=false;check.disabled=beta();}}
   }
   const check=button('Check shipping',()=>request(sessions.has(group.key)?'refresh':'prepare'),'commerce-primary');check.disabled=beta();actions.append(check);
   const ordinary=button('Check retailer handoffs',async()=>{
    if(pending||!current())return;pending=true;ordinary.disabled=true;handoff.replaceChildren();status.textContent='Checking retailer product references…';
    try{for(const item of group.items){const live=await hooks.verify(item);if(!current())return;const checked=m.matchVerified(item,live);const link=el('a','Continue to retailer: '+item.description+' ↗','checkout-link');link.href=checked.productUrl;link.target='_blank';link.rel='noopener noreferrer';const expires=Date.now()+45000;link.onclick=event=>{if(!current()||Date.now()>=expires){event.preventDefault();handoff.replaceChildren();status.textContent='Retailer information expired. Check handoffs again.';}};handoff.append(link);status.textContent=(checked.priceChanged?'Price changed to '+money(checked.priceCents)+' USD. ':'')+(checked.feedOnly?'Stock is a feed snapshot. ':'')+'Product-page handoff only. Confirm selected size, color and quantity '+m.quantity(item.quantity)+' at retailer checkout. Shipping and tax remain unknown.';}}
    catch(e){if(current()){handoff.replaceChildren();status.textContent=e.message;}}finally{if(current()){pending=false;ordinary.disabled=beta();}}
   });ordinary.disabled=beta();actions.append(ordinary);section.append(actions,status,delivery,handoff);target.append(section);
  }
  if(review.unresolved.length)target.append(el('p',review.unresolved.length+' saved selection(s) need an exact retailer variant before checkout. Return to Store to choose them.','checkout-warning'));
  target.append(el('p','Combined merchandise subtotal: '+money(review.subtotalCents)+' USD. Merchandise budgets exclude shipping and taxes. Listed coupon codes do not reduce totals.','checkout-warning'));
  const footer=el('div',null,'checkout-actions');footer.append(button('Return to cart',hooks.cart),button('Return to Store',()=>hooks.page('store')),button('Return to Studio',()=>hooks.page('studio')));target.append(footer);
 }
 window.MatchlatchCheckout=Object.freeze({cart,checkout,reset,reconcile});
})();
