/* Constraint-preserving product search, independent of AI outfit generation. */
(function(root){
 'use strict';
 function handoffCombined(input){
  const normalizer=typeof module==='object'&&module.exports?require('./studio-request.js'):root.MatchlatchStudioRequest;
  if(!normalizer)throw Error('Load studio-request.js before Studio search.');
  return normalizer.studioSearchInput(input);
 }
 const slots=['hat','scarf','jacket','shirt','watch','belt','pants','socks','shoes'];
 const aliases={hat:/\b(hat|cap|beanie)\b/i,scarf:/\b(scarf|wrap)\b/i,jacket:/\b(jacket|coat|blazer|outerwear)\b/i,shirt:/\b(shirt|top|sweater|hoodie|blouse|polo|tee)\b/i,watch:/\b(watch|timepiece)\b/i,belt:/\bbelt\b/i,pants:/\b(pants|trousers|jeans|shorts|chinos)\b/i,socks:/\bsocks?\b/i,shoes:/\b(shoes?|sneakers?|boots?|loafers?|heels?|trainers?)\b/i};
 function handoff({occasion,style,notes='',slot='',max,size='',sizeSystem='',profile={}}){
  if(!occasion||!style||!Number.isFinite(max)||max<1||max>10000)throw Error('Choose an occasion, style and merchandise budget first.');
  const matches=slots.filter(s=>aliases[s].test(notes));
  if(!slot&&matches.length>1)throw Error('Choose one garment to browse in More preferences. Your full outfit request will remain intact.');
  slot=slots.includes(slot)?slot:matches[0]||'shirt';
  const positive=String(notes).replace(/\b(?:no|avoid|without|exclude)\s+(?:black|white|gray|grey|navy|blue|green|olive|red|pink|brown|beige|gold|silver)\b/gi,''),found=positive.match(/\b(black|white|gray|grey|navy|blue|green|olive|red|pink|brown|beige|gold|silver)\b/i),color=found?found[1].toLowerCase().replace('grey','gray'):'';
  const allColors=[...new Set((positive.match(/\b(black|white|gray|grey|navy|blue|green|olive|red|pink|brown|beige|gold|silver)\b/gi)||[]).map(x=>x.toLowerCase().replace('grey','gray')))];if(allColors.length>1)throw Error('Choose one exact product color for Store search; your full notes remain in Studio.');
  for(const m of String(notes).matchAll(/\b(under|below|less than|up to|maximum|max|budget(?: of)?)\s*\$?\s*(\d+(?:\.\d{1,2})?)\b/gi)){const cents=Math.round(Number(m[2])*100)-(['under','below','less than'].includes(m[1].toLowerCase())?1:0);max=Math.min(max,cents/100);}
  if(max<1)throw Error('Use a merchandise budget of at least $1.');
  const explicitSize=String(notes).match(/\b(?:US |EU )?size\s+([a-z0-9.]+)/i);
  if(!size&&explicitSize)size=explicitSize[1];
  if(!sizeSystem)sizeSystem=String(notes).match(/\b(US|EU)\s+size\s+/i)?.[1]?.toUpperCase()||'';
  const subtype=String(notes).match(aliases[slot])?.[0]||slot;
  // Full notes/occasion/style remain in context, not truncated into a query with conflicting categories.
  const sizeKey={shirt:'topSize',jacket:'topSize',pants:'bottomSize',shoes:'shoeSize',hat:'hatSize',belt:'beltSize'}[slot];
  return {query:[color,subtype].filter(Boolean).join(' '),slot,max,size:String(size||profile[sizeKey]||'').slice(0,40),sizeSystem:String(sizeSystem||(slot==='shoes'?profile.shoeSystem||'':'')).slice(0,40),context:JSON.stringify({occasion,style,notes:String(notes).slice(0,350)}),profile};
 }
 if(typeof module==='object'&&module.exports)module.exports={handoff,handoffCombined};else root.MatchlatchStudioDiscovery=Object.freeze({handoff,handoffCombined});
})(typeof window==='object'?window:globalThis);
