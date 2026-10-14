import {randomUUID} from 'node:crypto';
import {normalizeProduct,digest} from './shopify-sync.mjs';
export const ACCEPTANCE_PROJECT='lqxeizvrdxuhzvipmlkl';
export const ACCEPTANCE_SHOP='pfcdgt-is.myshopify.com';
const gid=(v,type)=>typeof v==='string'&&new RegExp('^gid://shopify/'+type+'/[0-9]+$').test(v);
export function acceptanceApproval(env=process.env,now=Date.now()){
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!=='feature/wo-ml-018a-nightly-shopify-sync'||env.MATCHLATCH_SHOPIFY_ACCEPTANCE_ENABLED!=='true'||env.MATCHLATCH_SHOPIFY_PREVIEW_WRITES_ENABLED!=='false'||env.MATCHLATCH_SHOPIFY_PUBLICATION_ENABLED!=='false'||env.MATCHLATCH_SHOPIFY_PREVIEW_SCHEDULE_ENABLED!=='false'||env.SHOPIFY_STORE_DOMAIN!==ACCEPTANCE_SHOP||env.MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL!==`https://${ACCEPTANCE_PROJECT}.supabase.co`)throw Error('acceptance_disabled');
 let a;try{a=JSON.parse(env.MATCHLATCH_SHOPIFY_ACCEPTANCE_APPROVAL);}catch{throw Error('acceptance_approval_invalid');}
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(a?.executionId||'')||a.project!==ACCEPTANCE_PROJECT||a.shop!==ACCEPTANCE_SHOP||a.commit!==env.VERCEL_GIT_COMMIT_SHA||!/^[a-f0-9]{40}$/.test(a.commit||'')||a.host!==env.VERCEL_URL||!/^matchlatch-[a-z0-9]+-matchlatch\.vercel\.app$/.test(a.host||'')||a.privatePersistenceAuthorized!==true||typeof a.evidenceRef!=='string'||!a.evidenceRef.trim()||!Number.isFinite(Date.parse(a.expiresAt))||Date.parse(a.expiresAt)<=now||Date.parse(a.expiresAt)>now+86400000)throw Error('acceptance_approval_invalid');
 if(!Array.isArray(a.products)||!a.products.length||a.products.length>5)throw Error('acceptance_manifest_invalid');
 const products=a.products.map(p=>({productId:p.productId,variantIds:[...(p.variantIds||[])]}));const ids=new Set(),variants=new Set();
 for(const p of products){if(!gid(p.productId,'Product')||ids.has(p.productId)||!p.variantIds.length)throw Error('acceptance_manifest_invalid');ids.add(p.productId);for(const v of p.variantIds){if(!gid(v,'ProductVariant')||variants.has(v))throw Error('acceptance_manifest_invalid');variants.add(v);}}
 if(variants.size>250)throw Error('acceptance_manifest_overflow');
 const manifest={project:a.project,shop:a.shop,executionId:a.executionId,commit:a.commit,host:a.host,privatePersistenceAuthorized:true,evidenceRef:a.evidenceRef,expiresAt:a.expiresAt,products};
 return {...manifest,manifestHash:digest(manifest)};
}
export async function runAcceptance({approval,store,reader}){
 // Claim consumes the singleton before provider reads. Failure never resumes or
 // silently frees it; a separate reviewed recovery decision is required.
 const worker=randomUUID();await store.db('rpc/matchlatch_shopify_acceptance',{method:'POST',body:{p_action:'claim',p_manifest:approval,p_worker:worker,p_rows:[]}});
 try{
  const page=await reader.page({mode:'full',acceptance:approval.products});
  if(page.pageInfo?.hasNextPage!==false||!Array.isArray(page.nodes)||page.nodes.length!==approval.products.length||page.nodes.length>5)throw Error('acceptance_manifest_mismatch');
  const expected=new Map(approval.products.map(p=>[p.productId,new Set(p.variantIds)])),seen=new Set();let count=0;
  for(const p of page.nodes){const variants=expected.get(p.id);if(!variants||seen.has(p.id)||p.variants?.pageInfo?.hasNextPage!==false||!Array.isArray(p.variants?.nodes))throw Error('acceptance_incomplete_page');seen.add(p.id);count+=p.variants.nodes.length;if(count>250||p.variants.nodes.length!==variants.size||new Set(p.variants.nodes.map(v=>v.id)).size!==variants.size||p.variants.nodes.some(v=>!variants.has(v.id)))throw Error('acceptance_manifest_mismatch');}
  const rows=page.nodes.flatMap(p=>normalizeProduct(p,{shop:approval.shop,currency:page.currency}));
  return await store.db('rpc/matchlatch_shopify_acceptance',{method:'POST',body:{p_action:'commit',p_manifest:approval,p_worker:worker,p_rows:rows}});
 }catch{throw Error('acceptance_failed_consumed_review_required');}
}
