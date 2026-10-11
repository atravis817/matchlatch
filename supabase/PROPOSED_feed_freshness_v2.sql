-- PROPOSAL ONLY. Not an applied migration. Shared database execution is NO-GO.
-- No product/partner updates, historical backfill, indexes, triggers, policies,
-- table grants or legacy routine replacements. Run only after isolated tests,
-- verified restorable backup, writer pause and separate execution approval.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
select pg_advisory_xact_lock(7114,116479);
lock table public.matchlatch_awin_products,public.matchlatch_awin_import_runs,public.matchlatch_awin_import_batches in share row exclusive mode;
do $$
declare c record;
begin
 if exists(select 1 from public.matchlatch_awin_import_runs where status='running') then raise exception 'Pause and resolve all running imports before migration';end if;
 if to_regprocedure('public.matchlatch_awin_fail(uuid,text)') is null then raise exception 'Legacy import schema prerequisite missing';end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then raise exception 'Required role missing';end if;
 for c in select * from (values ('matchlatch_awin_products','source_checked_at','timestamp with time zone'),('matchlatch_awin_products','content_changed_at','timestamp with time zone'),('matchlatch_awin_products','content_hash','text'),('matchlatch_awin_import_runs','pipeline_version','integer'),('matchlatch_awin_import_runs','initialized','integer')) as v(tab,col,typ) loop
  if exists(select 1 from pg_attribute a where a.attrelid=to_regclass('public.'||c.tab) and a.attname=c.col and not a.attisdropped and format_type(a.atttypid,a.atttypmod)<>c.typ) then raise exception 'Existing column type incompatible: %',c.col;end if;
 end loop;
 if not (select relrowsecurity from pg_class where oid='public.matchlatch_awin_products'::regclass) then raise exception 'Product RLS required';end if;
end $$;
create temporary table freshness_preflight_products on commit drop as select to_jsonb(p)-array['source_checked_at','content_hash','content_changed_at'] as row_data from public.matchlatch_awin_products p;
create temporary table freshness_preflight_runs on commit drop as select to_jsonb(r)-array['pipeline_version','initialized'] as row_data from public.matchlatch_awin_import_runs r;
create temporary table freshness_preflight_security on commit drop as select c.oid,c.relrowsecurity,c.relacl,(select jsonb_agg(to_jsonb(p) order by p.polname) from pg_policy p where p.polrelid=c.oid) policies,(select jsonb_agg(to_jsonb(t) order by t.tgname) from pg_trigger t where t.tgrelid=c.oid) triggers from pg_class c where c.oid in ('public.matchlatch_awin_products'::regclass,'public.matchlatch_awin_import_runs'::regclass,'public.matchlatch_awin_import_batches'::regclass,'public.matchlatch_awin_partners'::regclass);
alter table public.matchlatch_awin_products add column if not exists source_checked_at timestamptz;
alter table public.matchlatch_awin_products add column if not exists content_hash text;
alter table public.matchlatch_awin_products add column if not exists content_changed_at timestamptz;
alter table public.matchlatch_awin_import_runs add column if not exists pipeline_version integer;
alter table public.matchlatch_awin_import_runs add column if not exists initialized integer not null default 0;
create or replace function public.matchlatch_awin_begin_v2(p_advertiser integer,p_feed text,p_checksum text,p_total integer,p_batch_size integer,p_resume uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.matchlatch_awin_import_runs;
begin
 if p_advertiser is distinct from 116479 or p_feed is distinct from '102556' or coalesce(p_checksum,'')!~'^[a-f0-9]{64}$' or p_total is null or p_total not between 1 and 899 or p_batch_size is null or p_batch_size not between 1 and 200 or p_resume is not null then raise exception 'Invalid private source, bounds or resume';end if;
 perform pg_advisory_xact_lock(7114,p_advertiser);
 if exists(select 1 from public.matchlatch_awin_import_runs where advertiser_id=p_advertiser and status='running') then raise exception 'Existing import requires recovery review';end if;
 insert into public.matchlatch_awin_import_runs(advertiser_id,feed_id,checksum,total,batch_size,status,pipeline_version) values(p_advertiser,p_feed,p_checksum,p_total,p_batch_size,'running',2) returning * into r;
 return jsonb_build_object('run_id',r.id,'next_batch',0,'pipeline_version',2);
end $$;
create or replace function public.matchlatch_awin_batch_v2(p_run uuid,p_batch integer,p_products jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.matchlatch_awin_import_runs;p public.matchlatch_awin_products; j jsonb; receipt jsonb; was_insert boolean; was_changed boolean; prior_hash text; prior_source timestamptz; prior_check timestamptz; ni integer:=0;nu integer:=0;ns integer:=0; nh integer:=0; prior public.matchlatch_awin_products; existed boolean; payload_hash text;
begin
 select * into r from public.matchlatch_awin_import_runs where id=p_run for update;
 if not found or r.status<>'running' or r.pipeline_version is distinct from 2 then raise exception 'Run unavailable';end if;
 payload_hash:=md5(p_products::text);
 select result into receipt from public.matchlatch_awin_import_batches where run_id=p_run and batch=p_batch;
 if found then if receipt->>'payload_hash' is distinct from payload_hash then raise exception 'Receipt payload mismatch';end if;return receipt;end if;
 if p_batch<>r.next_batch or p_batch is null or p_batch<0 or coalesce(jsonb_typeof(p_products),'')<>'array' or jsonb_array_length(p_products)<>least(r.batch_size,r.total-p_batch*r.batch_size) or r.total-p_batch*r.batch_size<1 then raise exception 'Invalid checkpoint';end if;
 if (select count(distinct x->>'source_variant_id') from jsonb_array_elements(p_products)x)<>jsonb_array_length(p_products) then raise exception 'Duplicate batch identity';end if;
 if exists(select 1 from public.matchlatch_awin_import_batches b,jsonb_array_elements_text(b.result->'ids') i where b.run_id=p_run and i.value in (select x->>'source_variant_id' from jsonb_array_elements(p_products)x)) then raise exception 'Duplicate run identity';end if;
 for j in select value from jsonb_array_elements(p_products) loop
  p:=jsonb_populate_record(null::public.matchlatch_awin_products,j);
  if p.advertiser_id is distinct from r.advertiser_id or p.source_feed_id is distinct from r.feed_id or p.is_public is distinct from false or p.shipping_us_eligible is distinct from false or coalesce(p.source_hash,'')!~'^[a-f0-9]{64}$' then raise exception 'Private source mismatch';end if;
  if p.valid_until is null or p.source_checked_at is null or coalesce(p.content_hash,'')!~'^[a-f0-9]{64}$' or p.source_checked_at>now()+interval '5 minutes' or p.source_updated_at is null or p.source_updated_at>now()+interval '5 minutes' or p.feed_imported_at is null or p.feed_imported_at>now()+interval '5 minutes' or p.valid_until<=now() or p.valid_until<=p.source_updated_at or p.valid_until>least(p.source_checked_at,p.source_updated_at)+interval '24 hours' then raise exception 'Invalid source-check evidence';end if;
  select * into prior from public.matchlatch_awin_products where advertiser_id=p.advertiser_id and source_variant_id=p.source_variant_id for update;
  existed:=found;prior_hash:=prior.content_hash;prior_source:=prior.source_updated_at;prior_check:=prior.source_checked_at;
  if existed and prior.is_public is distinct from false then raise exception 'Published records excluded from private refresh';end if;
  if p.source_updated_at<prior_source or p.source_checked_at<prior_check then raise exception 'Source evidence regression';end if;
  was_changed:=case when not existed then false when prior_hash is null then jsonb_build_object('advertiser_id',prior.advertiser_id,'source_variant_id',prior.source_variant_id,'source_product_id',prior.source_product_id,'slot',prior.slot,'title',prior.title,'description',prior.description,'brand',prior.brand,'material',prior.material,'fit',prior.fit,'size',prior.size,'color',prior.color,'image_url',prior.image_url,'product_url',prior.product_url,'affiliate_url',prior.affiliate_url,'merchant_name',prior.merchant_name,'merchant_host',prior.merchant_host,'price_usd',prior.price_usd,'original_price_usd',prior.original_price_usd,'currency',prior.currency,'size_system',prior.size_system,'available',prior.available,'stock_status',prior.stock_status,'source_feed_id',prior.source_feed_id) is distinct from jsonb_build_object('advertiser_id',p.advertiser_id,'source_variant_id',p.source_variant_id,'source_product_id',p.source_product_id,'slot',p.slot,'title',p.title,'description',p.description,'brand',p.brand,'material',p.material,'fit',p.fit,'size',p.size,'color',p.color,'image_url',p.image_url,'product_url',p.product_url,'affiliate_url',p.affiliate_url,'merchant_name',p.merchant_name,'merchant_host',p.merchant_host,'price_usd',p.price_usd,'original_price_usd',p.original_price_usd,'currency',p.currency,'size_system',p.size_system,'available',p.available,'stock_status',p.stock_status,'source_feed_id',p.source_feed_id) else prior_hash<>p.content_hash end;
  was_insert:=null;
  insert into public.matchlatch_awin_products as existing (advertiser_id,source_variant_id,source_product_id,slot,title,description,brand,material,fit,size,color,image_url,product_url,affiliate_url,merchant_name,merchant_host,price_usd,original_price_usd,currency,size_system,available,stock_status,shipping_us_eligible,feed_imported_at,valid_until,is_public,source_feed_id,source_updated_at,source_hash,source_checked_at,content_hash,content_changed_at) values (p.advertiser_id,p.source_variant_id,p.source_product_id,p.slot,p.title,p.description,p.brand,p.material,p.fit,p.size,p.color,p.image_url,p.product_url,p.affiliate_url,p.merchant_name,p.merchant_host,p.price_usd,p.original_price_usd,p.currency,p.size_system,p.available,p.stock_status,p.shipping_us_eligible,p.feed_imported_at,p.valid_until,p.is_public,p.source_feed_id,p.source_updated_at,p.source_hash,p.source_checked_at,p.content_hash,p.source_checked_at)
  on conflict(advertiser_id,source_variant_id) do update set source_product_id=excluded.source_product_id,slot=excluded.slot,title=excluded.title,description=excluded.description,brand=excluded.brand,material=excluded.material,fit=excluded.fit,size=excluded.size,color=excluded.color,image_url=excluded.image_url,product_url=excluded.product_url,affiliate_url=excluded.affiliate_url,merchant_name=excluded.merchant_name,merchant_host=excluded.merchant_host,price_usd=excluded.price_usd,original_price_usd=excluded.original_price_usd,currency=excluded.currency,size_system=excluded.size_system,available=excluded.available,stock_status=excluded.stock_status,valid_until=excluded.valid_until,source_feed_id=excluded.source_feed_id,source_updated_at=excluded.source_updated_at,source_hash=excluded.source_hash,source_checked_at=excluded.source_checked_at,content_hash=excluded.content_hash,
  content_changed_at=case when was_changed then excluded.source_checked_at else existing.content_changed_at end,
  feed_imported_at=case when existing.source_updated_at is distinct from excluded.source_updated_at or existing.source_hash is distinct from excluded.source_hash then excluded.feed_imported_at else existing.feed_imported_at end
  returning (xmax=0) into was_insert;
  if was_insert then ni:=ni+1;elsif was_changed then nu:=nu+1;elsif prior_hash is null then nh:=nh+1;else ns:=ns+1;end if;
 end loop;
 receipt:=jsonb_build_object('inserted',ni,'updated',nu,'unchanged',ns,'initialized',nh,'payload_hash',payload_hash,'ids',(select jsonb_agg(x->>'source_variant_id') from jsonb_array_elements(p_products)x));
 insert into public.matchlatch_awin_import_batches values(p_run,p_batch,receipt);
 update public.matchlatch_awin_import_runs set inserted=inserted+ni,updated=updated+nu,unchanged=unchanged+ns,initialized=initialized+nh,next_batch=next_batch+1,heartbeat_at=now() where id=p_run;
 return receipt;
end $$;
create or replace function public.matchlatch_awin_finish_v2(p_run uuid,p_valid_ids text[]) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.matchlatch_awin_import_runs; actual_ids text[];
begin
 select * into r from public.matchlatch_awin_import_runs where id=p_run for update;
 if not found or r.pipeline_version is distinct from 2 then raise exception 'Missing v2 run';end if;
 select array_agg(i.value order by i.value) into actual_ids from public.matchlatch_awin_import_batches b,jsonb_array_elements_text(b.result->'ids') i where b.run_id=p_run;
 if r.next_batch<>ceil(r.total::numeric/r.batch_size) or r.inserted+r.updated+r.unchanged+r.initialized<>r.total or cardinality(p_valid_ids) is distinct from r.total or (select count(distinct x) from unnest(p_valid_ids)x)<>r.total or actual_ids is distinct from (select array_agg(x order by x) from unnest(p_valid_ids)x) then raise exception 'Incomplete bounded snapshot';end if;
 if r.status='succeeded' then return to_jsonb(r)-'checksum';end if;
 if r.status<>'running' then raise exception 'Run unavailable';end if;
 -- INTENTIONALLY NO removal sweep or merchant qualification update.
 -- A complete download is not authorization to reconcile omitted products.
 update public.matchlatch_awin_import_runs set removed=0,status='succeeded',finished_at=now(),heartbeat_at=now() where id=p_run returning * into r;
 return to_jsonb(r)-'checksum';
end $$;
revoke all on function public.matchlatch_awin_begin_v2(integer,text,text,integer,integer,uuid) from public,anon,authenticated;
grant execute on function public.matchlatch_awin_begin_v2(integer,text,text,integer,integer,uuid) to service_role;
revoke all on function public.matchlatch_awin_batch_v2(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.matchlatch_awin_batch_v2(uuid,integer,jsonb) to service_role;
revoke all on function public.matchlatch_awin_finish_v2(uuid,text[]) from public,anon,authenticated;
grant execute on function public.matchlatch_awin_finish_v2(uuid,text[]) to service_role;
do $$
declare f regprocedure;
begin
 if exists((select row_data from freshness_preflight_products except all select to_jsonb(p)-array['source_checked_at','content_hash','content_changed_at'] from public.matchlatch_awin_products p) union all (select to_jsonb(p)-array['source_checked_at','content_hash','content_changed_at'] from public.matchlatch_awin_products p except all select row_data from freshness_preflight_products)) then raise exception 'Unexpected product changes';end if;
 if exists((select row_data from freshness_preflight_runs except all select to_jsonb(r)-array['pipeline_version','initialized'] from public.matchlatch_awin_import_runs r) union all (select to_jsonb(r)-array['pipeline_version','initialized'] from public.matchlatch_awin_import_runs r except all select row_data from freshness_preflight_runs)) then raise exception 'Unexpected run changes';end if;
 if exists(select 1 from freshness_preflight_security s join pg_class c on c.oid=s.oid where c.relrowsecurity is distinct from s.relrowsecurity or c.relacl is distinct from s.relacl or (select jsonb_agg(to_jsonb(p) order by p.polname) from pg_policy p where p.polrelid=c.oid) is distinct from s.policies or (select jsonb_agg(to_jsonb(t) order by t.tgname) from pg_trigger t where t.tgrelid=c.oid) is distinct from s.triggers) then raise exception 'Unexpected security or trigger changes';end if;
 foreach f in array array['public.matchlatch_awin_begin_v2(integer,text,text,integer,integer,uuid)'::regprocedure,'public.matchlatch_awin_batch_v2(uuid,integer,jsonb)'::regprocedure,'public.matchlatch_awin_finish_v2(uuid,text[])'::regprocedure] loop
  if has_function_privilege('anon',f,'execute') or has_function_privilege('authenticated',f,'execute') or not has_function_privilege('service_role',f,'execute') or (select prosecdef from pg_proc where oid=f) then raise exception 'Unsafe function permissions';end if;
 end loop;
end $$;
commit;
