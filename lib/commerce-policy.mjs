import raw from '../policies/commerce-policy.json' with {type:'json'};
import {createHash} from 'node:crypto';
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const POLICY=freeze(raw);
export const policyHash=createHash('sha256').update(JSON.stringify(POLICY)).digest('hex');
if(policyHash!=='29dae4d8d16bd0da152e6fe240ba6ddbbf82986825f442078416cf09a056e339')throw Error('Commerce permission policy requires explicit owner review.');
export function canonicalProductURL(value){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname==='localhost'||u.hostname.endsWith('.local')||u.hostname.includes(':')||/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname))return null;
 u.hash='';u.hostname=u.hostname.replace(/^www\./,'');for(const key of [...u.searchParams.keys()])if(!['pid','sku','variant','color','size'].includes(key.toLowerCase()))u.searchParams.delete(key);u.searchParams.sort();return u.href.slice(0,1500);
 }catch{return null;}
}
export function researchPermission(value){const url=canonicalProductURL(value);if(!url)return null;const u=new URL(url),r=POLICY.researchRetailers.find(r=>r.hosts.includes(u.hostname));if(!r)return null;
 if(/\/(?:api|checkout|login|signin|my-account|profile|shoppingbag|shopping-bag|search)(?:[/.]|$)/i.test(u.pathname)||/productdata\.do|browse\/search\.do/i.test(u.pathname))return null;
 // Category pages are not product records.
 if(r.id==='gap'&&!/\/browse\/product\.do$/i.test(u.pathname))return null;
 if(r.id==='gap'&&!u.searchParams.get('pid'))return null;
 if(r.id==='nordstrom'&&!/^\/s\/[^/]+(?:\/\d+)?\/?$/i.test(u.pathname))return null;
 return {...r,url};
}
export function adapterPermission(id,kind){return POLICY.approvedRetailerAdapters.find(a=>a.id===id&&a.kind===kind&&a.permissionEvidenceUrl&&a.reviewedAt)||null;}
