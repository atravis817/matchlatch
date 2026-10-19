/* Contract v1: pure, shared, bounded Studio input normalization. */
(function(root){
 'use strict';
 const slots=['hat','scarf','jacket','shirt','watch','belt','pants','socks','shoes'];
 const colors=['black','white','gray','navy','blue','green','olive','red','pink','brown','beige','gold','silver'];
 const aliases={hat:'hats?|caps?|beanies?',scarf:'scarves|scarf',jacket:'jackets?|coats?|blazers?',shirt:'shirts?|tops?|sweaters?|hoodies?|blouses?|polos?|tees?',watch:'watches|watch',belt:'belts?',pants:'pants|trousers|jeans|shorts|chinos',socks:'socks?',shoes:'shoes?|sneakers?|boots?|loafers?|heels?|trainers?'};
 // Only broad category nouns can be enforced by the current shared contract.
 const categoryNouns=new Set(['hat','hats','scarf','scarves','jacket','jackets','shirt','shirts','watch','watches','belt','belts','pants','sock','socks','shoe','shoes']);
 const fields=['max','size','slot','color','excludedColors','needBy','fit','occasion','style'];
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
 // Compare ceilings only after the existing budget contract accepts each value.
 function budgetValue(value){
  if(!['number','string'].includes(typeof value)||typeof value==='string'&&!/^\d+(?:\.\d{1,2})?$/.test(value.trim()))return undefined;
  const number=Number(value);return Number.isFinite(number)&&number>=1&&number<=10000?number:undefined;
 }
 function normalizeStudioRequest(raw={}){
  raw=object(raw);const conflicts=[],unsupportedOrUnknown=[],provenance={},effectiveConstraints={},softPreferences={};
  const prompt=typeof raw.prompt==='string'?raw.prompt.trim():'';
  if(prompt.length>500||raw.prompt!==undefined&&typeof raw.prompt!=='string')unsupportedOrUnknown.push('prompt_length_or_type');
  if(raw.photoContext)unsupportedOrUnknown.push('photo_context_requires_existing_consented_image_path');
  const p={},manual=object(raw.manualPreferences),defaults=object(raw.savedDefaults),resolutions=object(raw.confirmedResolutions);
  let residue=prompt.toLowerCase().replace(/grey/g,'gray');
  function remove(re,fn){residue=residue.replace(re,(...args)=>{fn?.(...args);return ' ';});}
  const budgets=[];remove(/\b(under|below|less than|up to|maximum|max|budget(?: of)?)\s*\$?\s*(\d+(?:\.\d{1,2})?)\b/g,(_,op,n)=>budgets.push(Math.round(Number(n)*100)-(['under','below','less than'].includes(op)?1:0)));
  remove(/\$\s*(\d+(?:\.\d{1,2})?)/g,(_,n)=>budgets.push(Math.round(Number(n)*100)));
  if(budgets.length)p.max=Math.min(...budgets)/100;
  const sizes=[];remove(/\bsize\s+(xxl|xl|xs|s|m|l|\d+(?:\.\d+)?)\b/g,(_,s)=>sizes.push(s));
  if(new Set(sizes).size>1)unsupportedOrUnknown.push('multiple_sizes');if(sizes.length)p.size=sizes[0];
  const excluded=[];remove(new RegExp('\\b(?:no|avoid|not|without|exclude)\\s+('+colors.join('|')+')\\b','g'),(_,c)=>excluded.push(c));if(excluded.length)p.excludedColors=[...new Set(excluded)];
  const positive=[];remove(new RegExp('\\b('+colors.join('|')+')\\b','g'),(_,c)=>positive.push(c));
  if(new Set(positive).size>1)unsupportedOrUnknown.push('multiple_required_colors');if(positive.length)p.color=positive[0];
  const categories=[];for(const [slot,pattern]of Object.entries(aliases))remove(new RegExp('\\b(?:'+pattern+')\\b','g'),noun=>{categories.push(slot);if(!categoryNouns.has(noun))unsupportedOrUnknown.push('unsupported_subtype:'+noun);});
  if(new Set(categories).size>1)unsupportedOrUnknown.push('multiple_categories_choose_one_for_search');if(categories.length)p.slot=categories[0];
  // Unparsed language is never silently presented as an enforced constraint.
  remove(/\b(?:a|an|the|i|want|need|find|me|please|and|with|in|for|some|show|of)\b/g);
  if(residue.replace(/[\s,.!?]/g,''))unsupportedOrUnknown.push('unparsed_prompt_requires_clarification');
  for(const source of [manual,defaults])for(const key of Object.keys(source))if(!fields.includes(key)&&source[key]!==''&&source[key]!=null)unsupportedOrUnknown.push('unsupported_field:'+key);
  const same=(a,b,key)=>key==='max'
   ?budgetValue(a)!==undefined&&budgetValue(b)!==undefined&&budgetValue(a)===budgetValue(b)
   :JSON.stringify(a).toLowerCase()===JSON.stringify(b).toLowerCase();
  for(const key of fields){
   const a=p[key],b=manual[key],d=defaults[key],has=x=>x!==undefined&&x!==null&&x!=='';
   let value,from;
   if(has(a)&&has(b)&&!same(a,b,key)){
    const r=resolutions[key];if(r!==undefined&&(same(r,a,key)||same(r,b,key))){value=r;from='confirmedResolution';}
    else{conflicts.push({field:key,prompt:a,manual:b});continue;}
   }else if(has(b)){value=b;from='manual';}else if(has(a)){value=a;from='prompt';}else if(has(d)){value=d;from='savedDefault';}else continue;
   if(key==='max'){value=budgetValue(value);if(value===undefined){unsupportedOrUnknown.push('invalid_budget');continue;}}
   else if(key==='excludedColors'){if(!Array.isArray(value)||value.some(c=>!colors.includes(c))){unsupportedOrUnknown.push('unsupported_exclusions');continue;}value=[...new Set(value)];}
   else if(typeof value!=='string'||value.length>80){unsupportedOrUnknown.push('invalid_'+key);continue;}
   // Downstream clean(...,40) must never erase or truncate an exact size.
   if(key==='size'&&(!value.trim()||value.length>40||/[\x00-\x1f\x7f]/.test(value))){unsupportedOrUnknown.push('invalid_size');continue;}
   if(key==='slot'&&!slots.includes(value)||key==='color'&&!colors.includes(value)){unsupportedOrUnknown.push('invalid_'+key);continue;}
   if(['needBy','fit'].includes(key)){unsupportedOrUnknown.push('unverified_hard_constraint:'+key);continue;}
   if(['occasion','style'].includes(key))softPreferences[key]=value;else effectiveConstraints[key]=value;
   provenance[key]=from;
  }
  if(effectiveConstraints.excludedColors?.includes(effectiveConstraints.color))conflicts.push({field:'color',reason:'required_color_excluded'});
  if(!effectiveConstraints.slot)unsupportedOrUnknown.push('choose_category');
  if(!effectiveConstraints.max)unsupportedOrUnknown.push('choose_merchandise_budget');
  return {effectiveConstraints,softPreferences,conflicts,unsupportedOrUnknown:[...new Set(unsupportedOrUnknown)],provenance};
 }
 function studioSearchInput(raw){
  const normalized=normalizeStudioRequest(raw);
  if(normalized.conflicts.length||normalized.unsupportedOrUnknown.length){const e=Error('Clarify conflicting or unsupported Studio constraints before searching. Garment subtypes (for example polo, hoodie or boots) are not supported; use a broad category only if that matches your intent.');e.status=422;e.normalized=normalized;throw e;}
  const c=normalized.effectiveConstraints;
  const query=[c.color,c.slot,...(c.excludedColors||[]).map(c=>'without '+c)].filter(Boolean).join(' ');
  return {query,max:c.max,size:c.size||'',slot:c.slot,normalized};
 }
 const api=Object.freeze({normalizeStudioRequest,studioSearchInput});
 root.MatchlatchStudioRequest=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
