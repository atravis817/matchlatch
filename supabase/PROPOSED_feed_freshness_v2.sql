-- REVIEW ONLY: shared Production/Preview database; explicit approval required.
-- No backfill of unknown historical check/change times. No RLS or eligibility changes.
begin;
alter table public.matchlatch_awin_products add column if not exists source_checked_at timestamptz;
alter table public.matchlatch_awin_products add column if not exists content_hash text;
alter table public.matchlatch_awin_products add column if not exists content_changed_at timestamptz;
create or replace function public.matchlatch_awin_batch_v2(p_run uuid,p_batch integer,p_products jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.matchlatch_awin_import_runs;p public.matchlatch_awin_products; j jsonb; receipt jsonb; was_insert boolean; was_changed boolean; prior_hash text; prior_source timestamptz; prior_check timestamptz; ni integer:=0;nu integer:=0;ns integer:=0;
begin
 select * into r from public.matchlatch_awin_import_runs where id=p_run for update;
 if not found or r.status<>'running' then raise exception 'Run unavailable';end if;
 select result into receipt from public.matchlatch_awin_import_batches where run_id=p_run and batch=p_batch;
 if found then return receipt;end if;
 if p_batch<>r.next_batch or jsonb_typeof(p_products)<>'array' or jsonb_array_length(p_products) not between 1 and r.batch_size then raise exception 'Invalid checkpoint';end if;
 for j in select value from jsonb_array_elements(p_products) loop
  p:=jsonb_populate_record(null::public.matchlatch_awin_products,j);
  if p.advertiser_id<>r.advertiser_id or p.source_feed_id<>r.feed_id or p.is_public is distinct from false or p.shipping_us_eligible is distinct from false or length(p.source_hash)<>64 then raise exception 'Private source mismatch';end if;
  if p.valid_until is null or p.source_checked_at is null or coalesce(length(p.content_hash),0)<>64 or p.source_checked_at>now()+interval '5 minutes' or p.source_updated_at is null or p.valid_until>least(p.source_checked_at,p.source_updated_at)+interval '24 hours' then raise exception 'Invalid source-check evidence';end if;
  select content_hash,source_updated_at,source_checked_at into prior_hash,prior_source,prior_check from public.matchlatch_awin_products where advertiser_id=p.advertiser_id and source_variant_id=p.source_variant_id;
  if p.source_updated_at<prior_source or p.source_checked_at<prior_check then raise exception 'Source evidence regression';end if;
  was_changed:=prior_hash is not null and prior_hash<>p.content_hash;
  was_insert:=null;
  insert into public.matchlatch_awin_products as existing (advertiser_id,source_variant_id,source_product_id,slot,title,description,brand,material,fit,size,color,image_url,product_url,affiliate_url,merchant_name,merchant_host,price_usd,original_price_usd,currency,size_system,available,stock_status,shipping_us_eligible,feed_imported_at,valid_until,is_public,source_feed_id,source_updated_at,source_hash,source_checked_at,content_hash,content_changed_at) values (p.advertiser_id,p.source_variant_id,p.source_product_id,p.slot,p.title,p.description,p.brand,p.material,p.fit,p.size,p.color,p.image_url,p.product_url,p.affiliate_url,p.merchant_name,p.merchant_host,p.price_usd,p.original_price_usd,p.currency,p.size_system,p.available,p.stock_status,p.shipping_us_eligible,p.feed_imported_at,p.valid_until,p.is_public,p.source_feed_id,p.source_updated_at,p.source_hash,p.source_checked_at,p.content_hash,p.source_checked_at)
  on conflict(advertiser_id,source_variant_id) do update set source_product_id=excluded.source_product_id,slot=excluded.slot,title=excluded.title,description=excluded.description,brand=excluded.brand,material=excluded.material,fit=excluded.fit,size=excluded.size,color=excluded.color,image_url=excluded.image_url,product_url=excluded.product_url,affiliate_url=excluded.affiliate_url,merchant_name=excluded.merchant_name,merchant_host=excluded.merchant_host,price_usd=excluded.price_usd,original_price_usd=excluded.original_price_usd,currency=excluded.currency,size_system=excluded.size_system,available=excluded.available,stock_status=excluded.stock_status,shipping_us_eligible=excluded.shipping_us_eligible,valid_until=excluded.valid_until,is_public=excluded.is_public,source_feed_id=excluded.source_feed_id,source_updated_at=excluded.source_updated_at,source_hash=excluded.source_hash,source_checked_at=excluded.source_checked_at,content_hash=excluded.content_hash,
  content_changed_at=case when existing.content_hash is not null and existing.content_hash<>excluded.content_hash then excluded.source_checked_at else existing.content_changed_at end,
  feed_imported_at=case when existing.source_updated_at is distinct from excluded.source_updated_at or existing.source_hash is distinct from excluded.source_hash then excluded.feed_imported_at else existing.feed_imported_at end
  returning (xmax=0) into was_insert;
  if was_insert then ni:=ni+1;elsif was_changed then nu:=nu+1;else ns:=ns+1;end if;
 end loop;
 receipt:=jsonb_build_object('inserted',ni,'updated',nu,'unchanged',ns);
 insert into public.matchlatch_awin_import_batches values(p_run,p_batch,receipt);
 update public.matchlatch_awin_import_runs set inserted=inserted+ni,updated=updated+nu,unchanged=unchanged+ns,next_batch=next_batch+1,heartbeat_at=now() where id=p_run;
 return receipt;
end $$;
revoke all on function public.matchlatch_awin_batch_v2(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.matchlatch_awin_batch_v2(uuid,integer,jsonb) to service_role;
commit;
