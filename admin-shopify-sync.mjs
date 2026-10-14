export function connectShopifySync({root,getSession,isOwnerView}){
 let generation=0;
 const output=root.querySelector('[data-sync-output]'),review=root.querySelector('[data-sync-review]'),controls=[...root.querySelectorAll('button')];
 const el=(tag,text='')=>{const node=document.createElement(tag);node.textContent=text;return node;};
 const stamp=value=>value?new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/New_York'}).format(new Date(value))+' Eastern':'Unavailable';
 async function call(action,method='GET',body){
  if(!isOwnerView())return;const ticket=++generation;controls.forEach(b=>b.disabled=true);output.textContent='Checking Shopify synchronization…';
  try{const session=(await getSession()).data?.session;if(!session)throw Error('Sign in as the owner.');
   const response=await fetch('/api/admin-summary?action=shopify-sync-'+(action||(method==='POST'?'run':'status')),{method,headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(65000)}),data=await response.json();
   if(ticket!==generation||(await getSession()).data?.session?.user.id!==session.user.id||!isOwnerView())return;
   if(!response.ok)throw Error(data.error||'Sync unavailable');
   if(action?.startsWith('review')){
    review.replaceChildren();const selected=new Map(),batch=el('button','Approve selected eligible products');batch.disabled=true;batch.onclick=()=>call('','POST',{action:'publish',variants:[...selected.values()]});review.append(batch);
    for(const row of data.candidates||[]){const card=el('article');card.className='panel';card.append(el('h3',row.data.title),el('p',row.shop+' · '+row.variant_id),el('p','Vendor claim: '+row.data.brand+' · Evidence: '+(row.publicationEvidence||'Unverified')),el('p','Observed '+stamp(row.observed_at)),el('p','Visibility: '+(row.is_public?'Public':'Private')),el('p','Warnings: '+(row.decision.reasons.join(', ')||'Eligible')));
     if(row.data.image){const image=el('img');image.src=row.data.image;image.alt=row.data.title;image.style.maxWidth='120px';image.referrerPolicy='no-referrer';card.append(image);}
     const pick=el('input');pick.type='checkbox';pick.disabled=!data.publicationEnabled||!row.decision.eligible;pick.setAttribute('aria-label','Select '+row.data.title+' for publication');pick.onchange=()=>{if(pick.checked)selected.set(row.variant_id,{variantId:row.variant_id,materialHash:row.material_hash});else selected.delete(row.variant_id);batch.disabled=!selected.size;};card.append(pick);
     const publish=el('button','Approve publication'),revoke=el('button','Revoke publication');publish.disabled=!data.publicationEnabled||!row.decision.eligible;publish.title='Publication requires separately approved source evidence and policy.';publish.onclick=()=>call('','POST',{action:'publish',variants:[{variantId:row.variant_id,materialHash:row.material_hash}]});
     revoke.disabled=!row.is_public;revoke.onclick=()=>call('', 'POST',{action:'revoke',variants:[{variantId:row.variant_id,materialHash:row.material_hash}]});card.append(publish,revoke);review.append(card);
    }if(data.nextOffset!==null){const next=el('button','Next review page');next.onclick=()=>call('review&offset='+data.nextOffset);review.append(next);}output.textContent='Review page: '+data.candidates.length+' records. '+(data.publicationEnabled?'Eligible publication requires your selection.':'Publication remains gated.');
   }else if(data.result)output.textContent='Run '+data.result.id+' · '+data.result.status+'\nExamined: '+(data.result.examined??0)+' · New: '+(data.result.inserted??0)+' · Updated: '+(data.result.updated??0)+' · Unchanged: '+(data.result.unchanged??0)+' · Retired: '+(data.result.retired??0)+'\nProduction enabled: No';
   else {const run=data.jobs?.[0];output.textContent=[data.counts?'Catalog: '+data.counts.totalProducts+' products / '+data.counts.totalVariants+' variants · Private '+data.counts.private+' · Public '+data.counts.public+' · Approved '+data.counts.approved+' · Blocked '+data.counts.blocked+' · Stale '+data.counts.stale:'','Preview scheduler: '+(data.schedulerEnabled?'Enabled':'Disabled'),'Next midnight: '+stamp(data.nextExpectedRun),'Last successful run: '+(data.state?.[0]?.last_successful_run||'None'),run?'Latest run: '+run.status+' · Started '+stamp(run.started_at)+' · Completed '+stamp(run.completed_at):'No run recorded.',run?'Examined '+run.examined+' · New '+run.inserted+' · Updated '+run.updated+' · Retired '+run.retired+' · Unchanged '+run.unchanged:'',run?.error_category?'Failure: '+run.error_category:'','Production enabled: No'].filter(Boolean).join('\n');}
  }catch(error){if(ticket===generation)output.textContent=error.message;}
  finally{if(ticket===generation)controls.forEach(b=>b.disabled=false);}
 }
 root.querySelector('[data-sync-status]').onclick=()=>call('');
 root.querySelector('[data-sync-dry]').onclick=()=>call('','POST',{dryRun:true,mode:'full'});
 root.querySelector('[data-sync-run]').onclick=()=>call('','POST',{dryRun:false,mode:'full'});
 root.querySelector('[data-sync-candidates]').onclick=()=>call('review');
 return {reset(){generation++;output.textContent='';review.replaceChildren();controls.forEach(b=>b.disabled=false);}};
}
