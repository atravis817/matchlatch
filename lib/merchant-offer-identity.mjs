// Identity-only comparison. Never merge inventory, prices, permissions or links.
export function deduplicateMerchantVariants(items){
 const seen=new Set();return items.filter(item=>{
  if(!item?.size||!item?.color)return true; // No inferred variant identity.
  let url;try{url=new URL(item.merchantProductUrl||item.url);if(url.protocol!=='https:'||url.username||url.password||/^(?:www\.)?awin[12]?\.com$/.test(url.hostname))return true;}catch{return true;}
  url.hostname=url.hostname.toLowerCase().replace(/^www\./,'');url.hash='';
  for(const key of [...url.searchParams.keys()])if(/^utm_/i.test(key)||['gclid','fbclid','awc'].includes(key))url.searchParams.delete(key);
  url.searchParams.sort();
  const key=JSON.stringify([url.href,item.size,item.color,item.sizeSystem||'',item.sizeUnit||'']);
  if(seen.has(key))return false;seen.add(key);return true;
 });
}
