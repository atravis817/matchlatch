-- Backend-only import state and transactional checkpoints. No publication policy changes.
alter table public.matchlatch_awin_products add column if not exists source_feed_id text not null default '';
alter table public.matchlatch_awin_products add column if not exists source_updated_at timestamptz;
alter table public.matchlatch_awin_products add column if not exists source_hash text not null default '';
create table public.matchlatch_awin_import_runs(
 id uuid primary key default gen_random_uuid(),advertiser_id integer not null,feed_id text not null,checksum text not null,
 status text not null check(status in('running','succeeded','failed')),total integer not null,batch_size integer not null,
 next_batch integer not null default 0,inserted integer not null default 0,updated integer not null default 0,
 unchanged integer not null default 0,removed integer not null default 0,
 started_at timestamptz not null default now(),heartbeat_at timestamptz not null default now(),finished_at timestamptz,error text);
create unique index matchlatch_awin_one_running on public.matchlatch_awin_import_runs(advertiser_id) where status='running';
create table public.matchlatch_awin_import_batches(run_id uuid references public.matchlatch_awin_import_runs(id),batch integer,result jsonb,primary key(run_id,batch));
alter table public.matchlatch_awin_import_runs enable row level security;
alter table public.matchlatch_awin_import_batches enable row level security;
revoke all on public.matchlatch_awin_import_runs,public.matchlatch_awin_import_batches from public,anon,authenticated;
grant all on public.matchlatch_awin_import_runs,public.matchlatch_awin_import_batches to service_role;
create function public.matchlatch_awin_begin(p_advertiser integer,p_feed text,p_checksum text,p_total integer,p_batch_size integer,p_resume uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.matchlatch_awin_import_runs;
begin
 if p_advertiser<>116479 or p_feed<>'102556' or p_total<1 or p_total>50000 or p_batch_size not between 1 and 200 then raise exception 'Invalid private source or bounds';end if;
 perform pg_advisory_xact_lock(7114,p_advertiser);
 update public.matchlatch_awin_import_runs set status='failed',error='Lease expired',finished_at=now() where advertiser_id=p_advertiser and status='running' and heartbeat_at<now()-interval '7 minutes';
 if p_resume is not null then
  select * into r from public.matchlatch_awin_import_runs where id=p_resume for update;
  if not found or r.status<>'failed' or r.checksum<>p_checksum or r.batch_size<>p_batch_size or r.total<>p_total or r.advertiser_id<>p_advertiser or r.feed_id<>p_feed then raise exception 'Resume requires matching failed snapshot and batch size';end if;
  update public.matchlatch_awin_import_runs set status='running',heartbeat_at=now(),finished_at=null,error=null where id=r.id;
 else
  insert into public.matchlatch_awin_import_runs(advertiser_id,feed_id,checksum,total,batch_size,status) values(p_advertiser,p_feed,p_checksum,p_total,p_batch_size,'running') returning * into r;
 end if;
 return jsonb_build_object('run_id',r.id,'next_batch',r.next_batch);
end $$;
create function public.matchlatch_awin_batch(p_run uuid,p_batch integer,p_products jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.matchlatch_awin_import_runs;p public.matchlatch_awin_products; j jsonb; receipt jsonb; was_insert boolean; ni integer:=0;nu integer:=0;ns integer:=0;
begin
 select * into r from public.matchlatch_awin_import_runs where id=p_run for update;
 if not found or r.status<>'running' then raise exception 'Run unavailable';end if;
 select result into receipt from public.matchlatch_awin_import_batches where run_id=p_run and batch=p_batch;
 if found then return receipt;end if;
 if p_batch<>r.next_batch or jsonb_typeof(p_products)<>'array' or jsonb_array_length(p_products) not between 1 and r.batch_size then raise exception 'Invalid checkpoint';end if;
 for j in select value from jsonb_array_elements(p_products) loop
  p:=jsonb_populate_record(null::public.matchlatch_awin_products,j);
  if p.advertiser_id<>r.advertiser_id or p.source_feed_id<>r.feed_id or p.is_public is distinct from false or p.shipping_us_eligible is distinct from false or length(p.source_hash)<>64 then raise exception 'Private source mismatch';end if;
  was_insert:=null;
  insert into public.matchlatch_awin_products as existing (advertiser_id,source_variant_id,source_product_id,slot,title,description,brand,material,fit,size,color,image_url,product_url,affiliate_url,merchant_name,merchant_host,price_usd,original_price_usd,currency,size_system,available,stock_status,shipping_us_eligible,feed_imported_at,valid_until,is_public,source_feed_id,source_updated_at,source_hash) values (p.advertiser_id,p.source_variant_id,p.source_product_id,p.slot,p.title,p.description,p.brand,p.material,p.fit,p.size,p.color,p.image_url,p.product_url,p.affiliate_url,p.merchant_name,p.merchant_host,p.price_usd,p.original_price_usd,p.currency,p.size_system,p.available,p.stock_status,p.shipping_us_eligible,p.feed_imported_at,p.valid_until,p.is_public,p.source_feed_id,p.source_updated_at,p.source_hash)
  on conflict(advertiser_id,source_variant_id) do update set source_product_id=excluded.source_product_id,slot=excluded.slot,title=excluded.title,description=excluded.description,brand=excluded.brand,material=excluded.material,fit=excluded.fit,size=excluded.size,color=excluded.color,image_url=excluded.image_url,product_url=excluded.product_url,affiliate_url=excluded.affiliate_url,merchant_name=excluded.merchant_name,merchant_host=excluded.merchant_host,price_usd=excluded.price_usd,original_price_usd=excluded.original_price_usd,currency=excluded.currency,size_system=excluded.size_system,available=excluded.available,stock_status=excluded.stock_status,shipping_us_eligible=excluded.shipping_us_eligible,feed_imported_at=excluded.feed_imported_at,valid_until=excluded.valid_until,is_public=excluded.is_public,source_feed_id=excluded.source_feed_id,source_updated_at=excluded.source_updated_at,source_hash=excluded.source_hash
  where existing.source_hash is distinct from excluded.source_hash or existing.valid_until<=now()+interval '12 hours'
  returning (xmax=0) into was_insert;
  if was_insert is null then ns:=ns+1;elsif was_insert then ni:=ni+1;else nu:=nu+1;end if;
 end loop;
 receipt:=jsonb_build_object('inserted',ni,'updated',nu,'unchanged',ns);
 insert into public.matchlatch_awin_import_batches values(p_run,p_batch,receipt);
 update public.matchlatch_awin_import_runs set inserted=inserted+ni,updated=updated+nu,unchanged=unchanged+ns,next_batch=next_batch+1,heartbeat_at=now() where id=p_run;
 return receipt;
end $$;
create function public.matchlatch_awin_finish(p_run uuid,p_valid_ids text[]) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.matchlatch_awin_import_runs;n integer;
begin
 select * into r from public.matchlatch_awin_import_runs where id=p_run for update;
 if not found then raise exception 'Missing run';end if;
 if r.status='succeeded' then return to_jsonb(r)-'checksum';end if;
 if r.status<>'running' or r.next_batch<>ceil(r.total::numeric/r.batch_size) or cardinality(p_valid_ids)<>r.total or (select count(distinct x) from unnest(p_valid_ids)x)<>r.total then raise exception 'Incomplete snapshot';end if;
 update public.matchlatch_awin_products set available=false,is_public=false,stock_status='removed_or_invalid',valid_until=now(),source_hash=''
 where advertiser_id=r.advertiser_id and source_feed_id=r.feed_id and not(source_variant_id=any(p_valid_ids)) and (available or is_public or source_hash<>'');
 get diagnostics n=row_count;
 update public.matchlatch_awin_import_runs set removed=n,status='succeeded',finished_at=now(),heartbeat_at=now() where id=p_run returning * into r;
 update public.matchlatch_awin_partners set feed_checked_at=now(),feed_status='verified',updated_at=now() where advertiser_id=r.advertiser_id;
 return to_jsonb(r)-'checksum';
end $$;
create function public.matchlatch_awin_fail(p_run uuid,p_error text) returns jsonb language plpgsql security invoker set search_path='' as $$
begin update public.matchlatch_awin_import_runs set status='failed',finished_at=now(),error=left(p_error,150) where id=p_run and status='running';return '{"ok":true}'::jsonb;end $$;
revoke all on function public.matchlatch_awin_begin(integer,text,text,integer,integer,uuid),public.matchlatch_awin_batch(uuid,integer,jsonb),public.matchlatch_awin_finish(uuid,text[]),public.matchlatch_awin_fail(uuid,text) from public,anon,authenticated;
grant execute on function public.matchlatch_awin_begin(integer,text,text,integer,integer,uuid),public.matchlatch_awin_batch(uuid,integer,jsonb),public.matchlatch_awin_finish(uuid,text[]),public.matchlatch_awin_fail(uuid,text) to service_role;

