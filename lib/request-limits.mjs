import {createHash} from 'node:crypto';
const windows=new Map();
// Per-runtime burst protection; persistent AI limits are enforced in Postgres.
export function allowRequest(request,bucket,limit=60){
 const now=Date.now(),key=createHash('sha256').update(bucket+':'+(request.headers.get('x-forwarded-for')?.split(',')[0]||'local')).digest('hex');
 const row=windows.get(key);if(!row||row.until<=now){if(windows.size>=2048)windows.delete(windows.keys().next().value);windows.set(key,{count:1,until:now+60000});return true;}
 row.count++;return row.count<=limit;
}
