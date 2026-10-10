// Shared server-only feed parsing. Never log credentials or download URLs.
import {gunzipSync} from 'node:zlib';
export const APPROVED_ADVERTISERS = new Set([117849,126793]);
export const PUBLISHER_ID = '3118944';
export const FEED_HOSTS = ['datafeed.api.productserve.com','productdata.awin.com'];
export const norm = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g,'');
export const field = (row,...keys) => String(keys.map(key=>row[norm(key)]).find(value=>value!==undefined&&String(value).trim()!=='')||'').trim();
export function https(input,hosts) {
 try { const url=new URL(input);return url.protocol==='https:'&&!url.username&&!url.password&&(!hosts||hosts.includes(url.hostname))?url.href:null; } catch { return null; }
}
export function feedKey(value=process.env.AWIN_PRODUCT_FEED_API_KEY) {
 let key=String(value||'').trim();
 if(!key)throw Error('Missing AWIN_PRODUCT_FEED_API_KEY');
 if(/^https?:\/\//i.test(key)) {
  if(!https(key,FEED_HOSTS))throw Error('Unsupported Awin credential URL');
  const parts=new URL(key).pathname.split('/');const index=parts.indexOf('apikey');
  if(index<0||!parts[index+1])throw Error('Awin credential URL lacks API key');
  try { key=decodeURIComponent(parts[index+1]); } catch { throw Error('Invalid Awin credential encoding'); }
 }
 if(!key||/[\s/?#]/.test(key))throw Error('Invalid Awin feed credential format');
 return key;
}
export function safeError(error) {
 let message=String(error?.message||'Unknown importer error');
 const configured=process.env.AWIN_PRODUCT_FEED_API_KEY;
 if(configured)message=message.split(configured).join('[REDACTED]');
 try { const key=feedKey(configured);message=message.split(key).join('[REDACTED]'); } catch {}
 return message.replace(/https?:\/\/[^\s<>"']+/gi,'[URL REDACTED]');
}
export function csv(text) {
 const rows=[];let row=[],value='',quoted=false;
 for(let i=0;i<text.length;i++) {
  const c=text[i];
  if(quoted) { if(c==='"'&&text[i+1]==='"'){value+='"';i++;}else if(c==='"')quoted=false;else value+=c; }
  else if(c==='"')quoted=true;
  else if(c===','){row.push(value);value='';}
  else if(c==='\n'){row.push(value.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);row=[];value='';}
  else value+=c;
 }
 if(quoted)throw Error('Unterminated CSV quoted field');
 if(value||row.length){row.push(value.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);}
 return rows;
}
export async function fetchCSV(url,{timeoutMs=45000,maxCompressedBytes=25000000,maxDecodedBytes=75000000}={}) {
 const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(timeoutMs),headers:{accept:'text/csv'}});
 if(!response.ok)throw Error('Feed HTTP '+response.status);
 const chunks=[];let bytes=0;
 for await(const chunk of response.body) {
  bytes+=chunk.length;
  if(bytes>maxCompressedBytes)throw Error('Feed exceeds download byte limit');
  chunks.push(chunk);
 }
 const body=Buffer.concat(chunks);const gzip=body[0]===31&&body[1]===139;
 let payload;
 try { payload=gzip?gunzipSync(body,{maxOutputLength:maxDecodedBytes}):body; } catch { throw Error('Invalid GZIP or decoded feed exceeds byte limit'); }
 if(payload.length>maxDecodedBytes)throw Error('Feed exceeds decoded byte limit');
 const parsed=csv(new TextDecoder('utf-8',{fatal:true}).decode(payload).replace(/^\uFEFF/,''));
 const headers=parsed.shift()||[];const keys=headers.map(norm);
 if(!keys.length||keys.some(key=>!key)||new Set(keys).size!==keys.length)throw Error('Invalid or duplicate CSV headers');
 const rows=parsed.map((row,index)=>{
  if(row.length!==keys.length)throw Error('CSV row '+(index+2)+' has unexpected column count');
  return Object.fromEntries(keys.map((key,i)=>[key,row[i]]));
 });
 return {rows,headers,http_status:response.status,download_bytes:bytes,decoded_bytes:payload.length,compression:gzip?'gzip':'plain'};
}
export function feedMetadata(row) {
 const url=https(field(row,'url','download_url','feed_url','datafeed_url'),FEED_HOSTS);
 return {advertiser_id:Number(field(row,'advertiser_id','merchant_id')),advertiser_name:field(row,'advertiser_name','merchant_name'),feed_id:field(row,'feed_id','id'),membership:field(row,'membership_status')||null,last_imported:field(row,'last_imported','last_updated')||null,last_checked:field(row,'last_checked')||null,product_count:Number(field(row,'no_of_products'))||0,download_url_available:Boolean(url)};
}
export async function discoverFeeds(key=feedKey()) {
 const result=await fetchCSV('https://productdata.awin.com/datafeed/list/apikey/'+encodeURIComponent(key),{timeoutMs:20000,maxCompressedBytes:4000000,maxDecodedBytes:4000000});
 const normalized=result.headers.map(norm);
 if(!normalized.includes('advertiserid')&&!normalized.includes('merchantid'))throw Error('Feed list lacks advertiser ID column');
 if(!normalized.includes('feedid')||!normalized.includes('url'))throw Error('Unexpected feed list column headers');
 return result;
}
