import {timingSafeEqual} from 'node:crypto';
import {authorizeOwner} from './owner-authorization.mjs';
import {json} from './catalog-server.mjs';
import {allowRequest} from './request-limits.mjs';
import {createShopifyReader,syncSlice,isMidnightWindow,nextMidnight,publicationDecision} from './shopify-sync.mjs';
import {createSyncStore,syncConfigurationDiagnostics} from './shopify-sync-store.mjs';
import {STORE_DOMAIN} from './shopify-storefront-adapter.mjs';
export const maxDuration=300;
const authorizedScheduler=request=>{
 const expected=process.env.MATCHLATCH_SHOPIFY_SYNC_SECRET,given=request.headers.get('authorization')||'';
 if(!expected||expected.length<32)return false;const a=Buffer.from(given),b=Buffer.from('Bearer '+expected);
 return a.length===b.length&&timingSafeEqual(a,b);
};
export async function GET(request){
 if(process.env.VERCEL_ENV!=='preview')return json({error:'Not found'},404);
 const gate=await authorizeOwner(request);if(gate.response)return gate.response;
 const action=new URL(request.url).searchParams.get('action');
 if(action==='shopify-sync-auth'){try{const page=await createShopifyReader().page({mode:'full'});return json({authenticated:true,requiredReadScopesVerified:Boolean(process.env.SHOPIFY_CLIENT_ID&&process.env.SHOPIFY_CLIENT_SECRET&&!process.env.SHOPIFY_ADMIN_READ_TOKEN),shop:STORE_DOMAIN,apiVersion:'2026-10',sampleProducts:page.nodes.length,hasMore:page.pageInfo.hasNextPage,productionEnabled:false});}catch{return json({error:'Admin authentication/read check failed. Verify app installation, same-organization eligibility, exact read scopes and protected configuration.',productionEnabled:false},503);}}
 try{const store=createSyncStore();
  if(action==='shopify-sync-review'){const offset=Number(new URL(request.url).searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0||offset>100000)return json({error:'Invalid page'},400);const rows=await store.candidates(offset),enabled=process.env.MATCHLATCH_SHOPIFY_PUBLICATION_ENABLED==='true',policy=JSON.parse(process.env.MATCHLATCH_SHOPIFY_PUBLICATION_POLICY||'{}');return json({candidates:rows.map(row=>({...row,proposedVisibility:'public_if_owner_approved',publicationEvidence:policy.evidenceRef||null,decision:publicationDecision(row,enabled?{...policy,materialHash:row.material_hash}:row.approval)})),offset,nextOffset:rows.length===30?offset+30:null,publicationEnabled:enabled});}
  return json({...await store.status(),timezone:'America/New_York',nextExpectedRun:nextMidnight(),schedulerEnabled:process.env.MATCHLATCH_SHOPIFY_PREVIEW_SCHEDULE_ENABLED==='true',productionEnabled:false});
 }catch(error){const diagnostics=syncConfigurationDiagnostics();for(const name of ['databaseUnauthorized','databaseForbidden','databaseObjectUnavailable','databaseProviderFailure'])diagnostics[name]=error.diagnostics?.[name]===true;return json({error:diagnostics.configurationGuardPassed?'Isolated Preview database read failed.':'Isolated Preview database configuration guard failed.',diagnostics,productionEnabled:false},503);}
}
export async function POST(request){
 if(process.env.VERCEL_ENV!=='preview')return json({error:'Not found'},404);
 const scheduled=new URL(request.url).searchParams.get('action')==='shopify-sync-scheduled';
 if(scheduled){
  if(!authorizedScheduler(request))return json({error:'Unauthorized'},401);
  if(process.env.MATCHLATCH_SHOPIFY_PREVIEW_SCHEDULE_ENABLED!=='true')return json({error:'Preview schedule disabled'},503);
  if(!isMidnightWindow()){
   try{const pending=await createSyncStore().db('matchlatch_shopify_sync_jobs?status=in.(running,paused,failed)&dry_run=eq.false&limit=1');if(!pending.length)return json({status:'outside_midnight_window'},200);}
   catch{return json({error:'Scheduler state unavailable'},503);}
  }
 }else{
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Forbidden'},403);
  const gate=await authorizeOwner(request);if(gate.response)return gate.response;
  if(!allowRequest(request,'shopify-sync',4))return json({error:'Rate limited'},429);
 }
 let input={};if(!scheduled){try{const body=await request.text();if(body.length>6000)return json({error:'Request too large'},413);input=JSON.parse(body);}catch{return json({error:'Invalid request'},400);}}
 if(!scheduled&&['publish','revoke'].includes(input.action)){
  if(input.action==='publish'&&process.env.MATCHLATCH_SHOPIFY_PUBLICATION_ENABLED!=='true')return json({error:'Publication is disabled pending Founder-approved evidence and policy.'},503);
  if(!Array.isArray(input.variants)||!input.variants.length||input.variants.length>30||input.variants.some(v=>!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(v.variantId||'')||!/^[a-f0-9]{64}$/.test(v.materialHash||'')))return json({error:'Invalid review selection'},400);
  try{const gate=await authorizeOwner(request);if(gate.response)return gate.response;const evidence=input.action==='revoke'?{}:JSON.parse(process.env.MATCHLATCH_SHOPIFY_PUBLICATION_POLICY||'{}');
   return json(await createSyncStore().db('rpc/matchlatch_shopify_publish',{method:'POST',body:{p_owner:gate.owner,p_shop:STORE_DOMAIN,p_variants:input.variants,p_evidence:evidence,p_revoke:input.action==='revoke'}}));
  }catch{return json({error:'Publication rejected; refresh the review and verify source evidence.'},409);}
 }
 if(!['full','incremental',undefined].includes(input.mode)||input.dryRun!==undefined&&typeof input.dryRun!=='boolean')return json({error:'Invalid sync options'},400);
 const dryRun=scheduled?false:input.dryRun!==false;
 if(!dryRun&&process.env.MATCHLATCH_SHOPIFY_PREVIEW_WRITES_ENABLED!=='true')return json({error:'Preview writes disabled'},503);
 try{const result=await syncSlice({store:createSyncStore(),reader:createShopifyReader(),mode:input.mode||'full',scheduled,dryRun});return json({result,productionEnabled:false},result.status==='busy'?409:200);}
 catch{return json({error:'Shopify synchronization unavailable. Check protected configuration and run history.'},503);}
}
