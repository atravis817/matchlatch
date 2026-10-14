-- DEVELOPMENT PROPOSAL ONLY. Never applied by development authorization.
-- Requires separately approved installation on lqxeizvrdxuhzvipmlkl only.
begin;
create table public.matchlatch_shopify_acceptance_ledger (
 singleton boolean primary key default true check(singleton),
 execution_id uuid not null unique, manifest jsonb not null, worker uuid not null,
 claimed_at timestamptz not null default now(), lease_until timestamptz not null,
 status text not null check(status in ('claimed','accepted')), variant_count integer not null default 0 check(variant_count between 0 and 250)
);
alter table public.matchlatch_shopify_acceptance_ledger enable row level security;
revoke all on public.matchlatch_shopify_acceptance_ledger from public,anon,authenticated;
grant select,insert,update on public.matchlatch_shopify_acceptance_ledger to service_role;
create function public.matchlatch_shopify_acceptance(p_action text,p_manifest jsonb,p_worker uuid,p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare j public.matchlatch_shopify_acceptance_ledger%rowtype; p jsonb; r jsonb; n integer; expected integer:=0; ids text[]:=array[]::text[]; variants text[]:=array[]::text[]; v text;
begin
 if current_user<>'service_role' or p_worker is null or p_manifest->>'project' is distinct from 'lqxeizvrdxuhzvipmlkl' or p_manifest->>'shop' is distinct from 'pfcdgt-is.myshopify.com'
 or not coalesce((p_manifest->>'privatePersistenceAuthorized')::boolean,false) or coalesce(p_manifest->>'evidenceRef','')=''
 or coalesce((p_manifest->>'expiresAt')::timestamptz,'-infinity')<=now() or (p_manifest->>'expiresAt')::timestamptz>now()+interval '24 hours'
 or coalesce(p_manifest->>'commit','')!~'^[a-f0-9]{40}$' or coalesce(p_manifest->>'host','')!~'^matchlatch-[a-z0-9]+-matchlatch\.vercel\.app$'
 or jsonb_typeof(p_manifest->'products') is distinct from 'array' or jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'acceptance_invalid_binding';end if;
 n:=jsonb_array_length(p_manifest->'products');if n<1 or n>5 then raise exception 'acceptance_product_cap';end if;
 for p in select value from jsonb_array_elements(p_manifest->'products') loop
  if coalesce(p->>'productId','')!~'^gid://shopify/Product/[0-9]+$' or p->>'productId'=any(ids) or jsonb_typeof(p->'variantIds') is distinct from 'array' or jsonb_array_length(p->'variantIds')<1 then raise exception 'acceptance_invalid_manifest';end if;
  ids:=array_append(ids,p->>'productId');
  for v in select jsonb_array_elements_text(p->'variantIds') loop
   if v!~'^gid://shopify/ProductVariant/[0-9]+$' or v=any(variants) then raise exception 'acceptance_duplicate_variant';end if;
   variants:=array_append(variants,v);expected:=expected+1;if expected>250 then raise exception 'acceptance_variant_cap';end if;
  end loop;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended('shopify-sync:pfcdgt-is.myshopify.com',0));
 if p_action='claim' then
  if jsonb_array_length(p_rows)<>0 or exists(select 1 from public.matchlatch_shopify_acceptance_ledger) then raise exception 'acceptance_consumed';end if;
  if exists(select 1 from public.matchlatch_shopify_products) or exists(select 1 from public.matchlatch_shopify_sync_jobs) or exists(select 1 from public.matchlatch_shopify_sync_state) or exists(select 1 from public.matchlatch_shopify_sync_seen) or exists(select 1 from public.matchlatch_shopify_publication_audit) then raise exception 'acceptance_requires_empty_baseline';end if;
  insert into public.matchlatch_shopify_acceptance_ledger(execution_id,manifest,worker,lease_until,status) values((p_manifest->>'executionId')::uuid,p_manifest,p_worker,now()+interval '5 minutes','claimed');
  return jsonb_build_object('status','claimed');
 end if;
 select * into j from public.matchlatch_shopify_acceptance_ledger where singleton for update;
 if p_action<>'commit' or not found or j.manifest is distinct from p_manifest or j.worker is distinct from p_worker or j.status<>'claimed' or j.lease_until<=now() then raise exception 'acceptance_consumed_or_binding_mismatch';end if;
 if exists(select 1 from public.matchlatch_shopify_products) or exists(select 1 from public.matchlatch_shopify_sync_jobs) or exists(select 1 from public.matchlatch_shopify_sync_state) or exists(select 1 from public.matchlatch_shopify_sync_seen) or exists(select 1 from public.matchlatch_shopify_publication_audit) then raise exception 'acceptance_baseline_changed';end if;
 if jsonb_array_length(p_rows)<>expected or jsonb_array_length(p_rows)>250 or (select count(distinct value->>'variant_id') from jsonb_array_elements(p_rows))<>expected then raise exception 'acceptance_row_cap_or_duplicate';end if;
 -- Validate the ENTIRE page before any catalog INSERT.
 for r in select value from jsonb_array_elements(p_rows) loop
  if r->>'shop' is distinct from 'pfcdgt-is.myshopify.com' or not exists(select 1 from jsonb_array_elements(p_manifest->'products') x where x->>'productId'=r->>'product_id' and (x->'variantIds') ? (r->>'variant_id'))
   or r ? 'is_public' or r ? 'approval' or r ? 'retired' or r->'data'->>'variantId' is distinct from r->>'variant_id' or r->'data'->>'productId' is distinct from r->>'product_id'
   or coalesce((r->'data'->>'checkoutEnabled')::boolean,true) or coalesce((r->'data'->>'nativeCheckoutEligible')::boolean,true)
   or coalesce(r->>'material_hash','')!~'^[a-f0-9]{64}$' or coalesce(r->>'content_hash','')!~'^[a-f0-9]{64}$' then raise exception 'acceptance_invalid_private_row';end if;
 end loop;
 for r in select value from jsonb_array_elements(p_rows) loop
  insert into public.matchlatch_shopify_products(shop,product_id,variant_id,source_updated_at,observed_at,slot,size,color,brand,price_usd,available,material_hash,content_hash,data,warnings,is_public,approval)
   values(r->>'shop',r->>'product_id',r->>'variant_id',(r->>'source_updated_at')::timestamptz,(r->>'observed_at')::timestamptz,r->>'slot',r->>'size',r->>'color',r->>'brand',(r->>'price_usd')::numeric,(r->>'available')::boolean,r->>'material_hash',r->>'content_hash',r->'data',r->'warnings',false,'{}');
 end loop;
 update public.matchlatch_shopify_acceptance_ledger set status='accepted',variant_count=expected where singleton;
 return jsonb_build_object('status','accepted','products',n,'variants',expected,'private',true,'fullSyncCompleted',false);
end $$;
revoke all on function public.matchlatch_shopify_acceptance(text,jsonb,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.matchlatch_shopify_acceptance(text,jsonb,uuid,jsonb) to service_role;
commit;
