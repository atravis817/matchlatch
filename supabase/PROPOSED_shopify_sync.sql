-- WO-ML-018A. Proposed only: apply to a separate Preview database after
-- confirming isolation. No schedule, Awin alteration or live publication.
begin;
create table public.matchlatch_shopify_sync_jobs (
 id uuid primary key default gen_random_uuid(), shop text not null,
 day text not null, mode text not null check(mode in ('full','incremental')),
 dry_run boolean not null, status text not null default 'running',
 worker uuid, lease_until timestamptz, cursor text, cutoff timestamptz not null,
 watermark timestamptz, started_at timestamptz not null default now(),
 completed_at timestamptz, error_category text,
 products_examined bigint not null default 0, examined bigint not null default 0, inserted bigint not null default 0,
 updated bigint not null default 0, unchanged bigint not null default 0,
 retired bigint not null default 0, pages bigint not null default 0,
 unique(shop,day,dry_run)
);
create table public.matchlatch_shopify_sync_state (
 shop text primary key, watermark timestamptz, last_successful_run uuid,
 last_full_run timestamptz
);
create table public.matchlatch_shopify_sync_seen (
 job uuid not null references public.matchlatch_shopify_sync_jobs(id),
 variant_id text not null, primary key(job,variant_id)
);
create table public.matchlatch_shopify_products (
 shop text not null, product_id text not null, variant_id text not null,
 source_updated_at timestamptz not null, observed_at timestamptz not null,
 slot text, size text not null default '', color text not null default '',
 brand text not null default '', price_usd numeric, available boolean not null,
 material_hash text not null, content_hash text not null, data jsonb not null,
 warnings jsonb not null default '[]', retired boolean not null default false,
 seen_job uuid, is_public boolean not null default false,
 approval jsonb not null default '{}', primary key(shop,variant_id)
);
create index shopify_product_identity on public.matchlatch_shopify_products(shop,product_id);
create index shopify_public_search on public.matchlatch_shopify_products(shop,is_public,slot,price_usd,variant_id) where available and not retired;
create index shopify_search_text on public.matchlatch_shopify_products using gin(to_tsvector('english',data->>'title'));
create index shopify_product_type on public.matchlatch_shopify_products(shop,(data->>'productType'));
create table public.matchlatch_shopify_publication_audit (
 id bigint generated always as identity primary key, shop text not null,
 variant_id text not null, owner_id uuid not null, decision text not null,
 material_hash text not null, evidence jsonb not null, created_at timestamptz not null default now()
);
alter table public.matchlatch_shopify_sync_jobs enable row level security;
alter table public.matchlatch_shopify_sync_state enable row level security;
alter table public.matchlatch_shopify_sync_seen enable row level security;
alter table public.matchlatch_shopify_products enable row level security;
alter table public.matchlatch_shopify_publication_audit enable row level security;
revoke all on public.matchlatch_shopify_sync_jobs,public.matchlatch_shopify_sync_state,public.matchlatch_shopify_products,public.matchlatch_shopify_publication_audit from public,anon,authenticated;
revoke all on public.matchlatch_shopify_sync_seen from public,anon,authenticated;
grant select,insert on public.matchlatch_shopify_sync_seen to service_role;
grant select,insert,update on public.matchlatch_shopify_sync_jobs,public.matchlatch_shopify_sync_state,public.matchlatch_shopify_products,public.matchlatch_shopify_publication_audit to service_role;
grant usage,select on sequence public.matchlatch_shopify_publication_audit_id_seq to service_role;

create function public.matchlatch_shopify_sync(p_action text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare
 j public.matchlatch_shopify_sync_jobs%rowtype;
 prior public.matchlatch_shopify_products%rowtype;
 r jsonb; v_shop text; v_worker uuid; v_retired bigint; v_ids text[];
 v_inserted bigint:=0; v_updated bigint:=0; v_unchanged bigint:=0; v_full_retired bigint:=0;
begin
 if current_user <> 'service_role' then raise exception 'service_only'; end if;
 if p_action='claim' then
  v_shop:=p_payload->>'shop';v_worker:=(p_payload->>'worker')::uuid;
  if v_shop<>'pfcdgt-is.myshopify.com' or (p_payload->>'mode') not in ('full','incremental') then raise exception 'invalid_source';end if;
  perform pg_advisory_xact_lock(hashtextextended('shopify-sync:'||v_shop,0));
  select * into j from public.matchlatch_shopify_sync_jobs where shop=v_shop and status in ('running','paused','failed') order by started_at limit 1 for update;
  if found then
   if j.status='running' and j.lease_until>now() then return jsonb_build_object('status','busy','id',j.id);end if;
   -- Never let an owner dry-run accidentally resume a write job (or vice versa).
   if j.dry_run<>(p_payload->>'dryRun')::boolean then return jsonb_build_object('status','resume_required','id',j.id,'dry_run',j.dry_run);end if;
   update public.matchlatch_shopify_sync_jobs set worker=v_worker,lease_until=now()+interval '5 minutes',status='running',error_category=null where id=j.id returning * into j;
  else
   select * into j from public.matchlatch_shopify_sync_jobs where shop=v_shop and day=p_payload->>'day' and dry_run=(p_payload->>'dryRun')::boolean;
   if found then return to_jsonb(j);end if;
   insert into public.matchlatch_shopify_sync_state(shop) values(v_shop) on conflict do nothing;
   insert into public.matchlatch_shopify_sync_jobs(shop,day,mode,dry_run,worker,lease_until,cutoff,watermark)
    select v_shop,p_payload->>'day',p_payload->>'mode',(p_payload->>'dryRun')::boolean,v_worker,now()+interval '5 minutes',(p_payload->>'cutoff')::timestamptz,s.watermark from public.matchlatch_shopify_sync_state s where s.shop=v_shop returning * into j;
  end if;
  return to_jsonb(j);
 end if;
 select * into j from public.matchlatch_shopify_sync_jobs where id=(p_payload->>'job')::uuid for update;
 if not found or j.worker is distinct from (p_payload->>'worker')::uuid or j.status<>'running' or j.lease_until<=now() then raise exception 'lease_lost';end if;
 if p_action in ('pause','fail') then
  update public.matchlatch_shopify_sync_jobs set status=case when p_action='pause' then 'paused' else 'failed' end,lease_until=null,error_category=case when p_action='fail' then 'sync_batch_failed' else null end where id=j.id returning * into j;
  return to_jsonb(j);
 end if;
 if p_action<>'commit' or j.cursor is distinct from p_payload->>'expectedCursor' or jsonb_array_length(p_payload->'rows')>10250 then raise exception 'invalid_checkpoint';end if;
 select array_agg(value) into v_ids from jsonb_array_elements_text(p_payload->'productIds');
 insert into public.matchlatch_shopify_sync_seen(job,variant_id) select j.id,'product:'||value from jsonb_array_elements_text(p_payload->'productIds') on conflict do nothing;
 if (select count(*)<>count(distinct value->>'variant_id') from jsonb_array_elements(p_payload->'rows')) then raise exception 'duplicate_variant';end if;
 for r in select value from jsonb_array_elements(p_payload->'rows') loop
  if r->>'shop'<>j.shop or not ((r->>'product_id')=any(v_ids)) then raise exception 'source_mismatch';end if;
  insert into public.matchlatch_shopify_sync_seen(job,variant_id) values(j.id,r->>'variant_id') on conflict do nothing;
  select * into prior from public.matchlatch_shopify_products where shop=j.shop and variant_id=r->>'variant_id' for update;
  if not found then v_inserted:=v_inserted+1;
  elsif prior.content_hash=r->>'content_hash' and not prior.retired then v_unchanged:=v_unchanged+1;
  else v_updated:=v_updated+1;end if;
  if not j.dry_run then
   if prior.variant_id is not null and prior.content_hash=r->>'content_hash' and not prior.retired then
    update public.matchlatch_shopify_products set observed_at=(r->>'observed_at')::timestamptz,source_updated_at=(r->>'source_updated_at')::timestamptz,seen_job=j.id where shop=j.shop and variant_id=r->>'variant_id';
   else
    insert into public.matchlatch_shopify_products(shop,product_id,variant_id,source_updated_at,observed_at,slot,size,color,brand,price_usd,available,material_hash,content_hash,data,warnings,seen_job)
     values(j.shop,r->>'product_id',r->>'variant_id',(r->>'source_updated_at')::timestamptz,(r->>'observed_at')::timestamptz,r->>'slot',r->>'size',r->>'color',r->>'brand',(r->>'price_usd')::numeric,(r->>'available')::boolean,r->>'material_hash',r->>'content_hash',r->'data',r->'warnings',j.id)
     on conflict(shop,variant_id) do update set product_id=excluded.product_id,source_updated_at=excluded.source_updated_at,observed_at=excluded.observed_at,slot=excluded.slot,size=excluded.size,color=excluded.color,brand=excluded.brand,price_usd=excluded.price_usd,available=excluded.available,material_hash=excluded.material_hash,content_hash=excluded.content_hash,data=excluded.data,warnings=excluded.warnings,retired=false,seen_job=j.id,
      is_public=case when matchlatch_shopify_products.material_hash=excluded.material_hash and not matchlatch_shopify_products.retired then matchlatch_shopify_products.is_public else false end,
      approval=case when matchlatch_shopify_products.material_hash=excluded.material_hash and not matchlatch_shopify_products.retired then matchlatch_shopify_products.approval else '{}'::jsonb end;
   end if;
  end if;
 end loop;
 -- A complete product read permits retiring missing variants even in incremental mode.
 select count(*) into v_retired from public.matchlatch_shopify_products p where p.shop=j.shop and not p.retired and p.product_id=any(v_ids) and not exists(select 1 from jsonb_array_elements(p_payload->'rows') x where x->>'variant_id'=p.variant_id);
 if not j.dry_run then
  update public.matchlatch_shopify_products p set retired=true,available=false,is_public=false,approval='{}' where p.shop=j.shop and not p.retired and p.product_id=any(v_ids) and not exists(select 1 from jsonb_array_elements(p_payload->'rows') x where x->>'variant_id'=p.variant_id);
 end if;
 if (p_payload->>'done')::boolean and j.mode='full' then
  select count(*) into v_full_retired from public.matchlatch_shopify_products p where p.shop=j.shop and not p.retired and not exists(select 1 from public.matchlatch_shopify_sync_seen s where s.job=j.id and s.variant_id=p.variant_id) and not exists(select 1 from public.matchlatch_shopify_sync_seen s where s.job=j.id and s.variant_id='product:'||p.product_id);
  if not j.dry_run then
   update public.matchlatch_shopify_products p set retired=true,available=false,is_public=false,approval='{}' where p.shop=j.shop and not p.retired and not exists(select 1 from public.matchlatch_shopify_sync_seen s where s.job=j.id and s.variant_id=p.variant_id);
  end if;
  v_retired:=v_retired+v_full_retired;
 end if;
 update public.matchlatch_shopify_sync_jobs set cursor=p_payload->>'nextCursor',pages=pages+1,products_examined=products_examined+jsonb_array_length(p_payload->'productIds'),examined=examined+jsonb_array_length(p_payload->'rows'),inserted=inserted+v_inserted,updated=updated+v_updated,unchanged=unchanged+v_unchanged,retired=retired+v_retired,
  status=case when (p_payload->>'done')::boolean then 'succeeded' else 'running' end,
  completed_at=case when (p_payload->>'done')::boolean then now() else null end,
  lease_until=case when (p_payload->>'done')::boolean then null else now()+interval '5 minutes' end where id=j.id returning * into j;
 if j.status='succeeded' and not j.dry_run then
  update public.matchlatch_shopify_sync_state set watermark=j.cutoff,last_successful_run=j.id,last_full_run=case when j.mode='full' then now() else last_full_run end where shop=j.shop;
 end if;
 return to_jsonb(j);
end $$;
revoke all on function public.matchlatch_shopify_sync(text,jsonb) from public,anon,authenticated;
grant execute on function public.matchlatch_shopify_sync(text,jsonb) to service_role;

create function public.matchlatch_shopify_publish(p_owner uuid,p_shop text,p_variants jsonb,p_evidence jsonb,p_revoke boolean)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare r public.matchlatch_shopify_products%rowtype; item jsonb; changed bigint:=0;
begin
 if current_user<>'service_role' or p_owner is null or p_shop<>'pfcdgt-is.myshopify.com' or jsonb_array_length(p_variants)>30 then raise exception 'invalid_publication_request';end if;
 perform pg_advisory_xact_lock(hashtextextended('shopify-sync:'||p_shop,0));
 for item in select value from jsonb_array_elements(p_variants) loop
  select * into r from public.matchlatch_shopify_products where shop=p_shop and variant_id=item->>'variantId' for update;
  if not found or r.material_hash<>item->>'materialHash' then raise exception 'stale_review';end if;
  if not p_revoke and (r.retired or not r.available or r.warnings<>'[]'::jsonb or r.observed_at<now()-interval '26 hours' or r.observed_at>now()+interval '1 minute'
    or not coalesce((p_evidence->>'sourceAuthorized')::boolean,false) or not coalesce((p_evidence->>'displayAuthorized')::boolean,false)
    or not coalesce((p_evidence->>'imageRights')::boolean,false) or not coalesce((p_evidence->>'supplierVerified')::boolean,false)
    or not coalesce((p_evidence->>'channelVerified')::boolean,false) or not coalesce((p_evidence->>'usShippingVerified')::boolean,false)
    or coalesce(p_evidence->>'supplierId','')='' or coalesce(p_evidence->>'channelId','')='' or coalesce(p_evidence->>'evidenceRef','')=''
    or coalesce(p_evidence->>'vendor','')<>r.brand or not coalesce((p_evidence->'productIds') @> to_jsonb(array[r.product_id]),false)
    or coalesce((p_evidence->>'expiresAt')::timestamptz,'-infinity'::timestamptz)<=now()) then raise exception 'publication_not_eligible';end if;
  update public.matchlatch_shopify_products set is_public=not p_revoke,approval=case when p_revoke then '{}'::jsonb else p_evidence||jsonb_build_object('materialHash',r.material_hash,'ownerId',p_owner,'approvedAt',now()) end where shop=p_shop and variant_id=r.variant_id;
  insert into public.matchlatch_shopify_publication_audit(shop,variant_id,owner_id,decision,material_hash,evidence) values(p_shop,r.variant_id,p_owner,case when p_revoke then 'revoked' else 'published' end,r.material_hash,p_evidence);
  changed:=changed+1;
 end loop;
 return jsonb_build_object('changed',changed,'published',not p_revoke);
end $$;
revoke all on function public.matchlatch_shopify_publish(uuid,text,jsonb,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.matchlatch_shopify_publish(uuid,text,jsonb,jsonb,boolean) to service_role;
create function public.matchlatch_shopify_counts() returns jsonb language sql security invoker set search_path=pg_catalog,public as $$
 select jsonb_build_object('totalVariants',count(*),'totalProducts',count(distinct product_id),'private',count(*) filter(where not is_public),'public',count(*) filter(where is_public),'retired',count(*) filter(where retired),'blocked',count(*) filter(where warnings<>'[]'::jsonb),'stale',count(*) filter(where observed_at<now()-interval '26 hours'),'approved',count(*) filter(where approval<>'{}'::jsonb)) from public.matchlatch_shopify_products;
$$;
revoke all on function public.matchlatch_shopify_counts() from public,anon,authenticated;
grant execute on function public.matchlatch_shopify_counts() to service_role;
commit;
