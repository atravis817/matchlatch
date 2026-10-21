// Decode only for safety inspection; never rewrite the emitted merchant href or
// variant query. A bounded unresolved/malformed encoding is withheld.
function canonicalSafety(value){
 for(let depth=0;depth<=4;depth++){
  if(/[\u0000-\u001f\u007f\\]/.test(value))return null;
  if(!value.includes('%'))return value;
  if(depth===4)return null;
  try{value=decodeURIComponent(value);}catch{return null;}
 }
 return value.includes('%')?null:value;
}
export function merchantDestination(value){
 try{if(typeof value!=='string'||value.length>2048||/[\u0000-\u0020\\]/.test(value))return null;
  const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||!u.hostname.includes('.')||/^\d+(?:\.\d+){3}$/.test(u.hostname))return null;
  const path=canonicalSafety(u.pathname);if(path===null||path.includes('?')||path.includes('#'))return null;
  if(/\/(?:cart|checkouts?|account|login|auth|payment|oauth)(?:\/|$)/i.test(path))return null;
  // Inspect raw query components as URLSearchParams replaces malformed UTF-8.
  for(const component of u.search.slice(1).split('&')){
   const at=component.indexOf('='),rawKey=at<0?component:component.slice(0,at),rawValue=at<0?'':component.slice(at+1);
   const key=canonicalSafety(rawKey.replace(/\+/g,' ')),value=canonicalSafety(rawValue.replace(/\+/g,' '));
   if(key===null||value===null||/\s/.test(key))return null;
   if(/^(?:token|access_token|key|password|session|email|address|code)$/i.test(key))return null;
   if(/^(?:url|redirect|redirect_uri|return|return_to|dest|destination|next|continue|target)$/i.test(key)&&/^(?:https?:|\/\/)/i.test(value.trim()))return null;
  }
  if(/^(?:www\.)?(?:awin[12]?\.com|tidd\.ly)$/i.test(u.hostname))return null;
  return u;
 }catch{return null;}
}
// Pure URL contract shared by importer and catalog/revalidation projections.
// Feed hosts remain narrower than official generated-commerce hosts.
export function boundTrackingLink(value,{publisher,advertiserId,destination,context='feed'}={}){
 try{
  if(typeof value!=='string'||value.length>8192||/[\u0000-\u0020\\]/.test(value))return null;
  const u=new URL(value),d=merchantDestination(destination);
  const hosts=context==='feed'?['awin1.com','www.awin1.com']:context==='commerce'?['awin1.com','www.awin1.com','awin2.com','www.awin2.com']:[];
  if(!d||u.protocol!=='https:'||u.username||u.password||u.port||u.hash||!hosts.includes(u.hostname)||!['/cread.php','/pclick.php','/awclick.php'].includes(u.pathname))return null;
  if(!/^[1-9][0-9]*$/.test(String(publisher))||!/^[1-9][0-9]*$/.test(String(advertiserId)))return null;
  const merchant=['awinmid','mid','m'],aff=['awinaffid','id','a'];
  const allowed=new Set([...merchant,...aff,'ued','platform','p']);
  const seen=new Set();
  for(const [key] of u.searchParams){if(!allowed.has(key)||seen.has(key))return null;seen.add(key);}
  for(const [keys,expected] of [[merchant,advertiserId],[aff,publisher]]){
   const present=keys.filter(k=>u.searchParams.has(k));
   if(!present.length||present.some(k=>u.searchParams.get(k)!==String(expected)))return null;
  }
  if(u.searchParams.getAll('ued').length!==1||merchantDestination(u.searchParams.get('ued'))?.href!==d.href)return null;
  return u.href;
 }catch{return null;}
}
