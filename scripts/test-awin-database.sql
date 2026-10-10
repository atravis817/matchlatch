-- Run through the authenticated Supabase SQL tool. All changes roll back.
begin;
do $$
declare p jsonb;r jsonb;run_id uuid;receipt jsonb;ids text[];
begin
 select to_jsonb(t) into p from public.matchlatch_awin_products t where advertiser_id=116479 order by source_variant_id limit 1;
 p:=p||jsonb_build_object('price_usd',(p->>'price_usd')::numeric+1,'available',false,'stock_status','out_of_stock','source_hash',repeat('a',64));
 r:=public.matchlatch_awin_begin(116479,'102556',repeat('b',64),2,1,null);run_id:=(r->>'run_id')::uuid;
 receipt:=public.matchlatch_awin_batch(run_id,0,jsonb_build_array(p));
 if (receipt->>'updated')::integer<>1 then raise exception 'Price/stock update failed';end if;
 if not exists(select 1 from public.matchlatch_awin_products where source_variant_id=p->>'source_variant_id' and not available and price_usd=(p->>'price_usd')::numeric) then raise exception 'Price/stock readback failed';end if;
 if public.matchlatch_awin_batch(run_id,0,jsonb_build_array(p))<>receipt then raise exception 'Retry receipt changed';end if;
 begin
  perform public.matchlatch_awin_batch(run_id,1,jsonb_build_array(p||'{"is_public":true}'::jsonb));
  raise exception 'Invalid publication accepted';
 exception when others then
  if sqlerrm='Invalid publication accepted' then raise;end if;
 end;
 if (select next_batch from public.matchlatch_awin_import_runs where id=run_id)<>1 then raise exception 'Failed batch advanced checkpoint';end if;
 perform public.matchlatch_awin_fail(run_id,'Controlled test failure');
 r:=public.matchlatch_awin_begin(116479,'102556',repeat('b',64),2,1,run_id);
 if (r->>'next_batch')::integer<>1 then raise exception 'Resume checkpoint lost';end if;
 select to_jsonb(t) into p from public.matchlatch_awin_products t where advertiser_id=116479 order by source_variant_id offset 1 limit 1;
 receipt:=public.matchlatch_awin_batch(run_id,1,jsonb_build_array(p));
 if (receipt->>'unchanged')::integer<>1 then raise exception 'Unchanged write not skipped';end if;
 select array_agg(source_variant_id) into ids from (select source_variant_id from public.matchlatch_awin_products where advertiser_id=116479 order by source_variant_id limit 2)s;
 r:=public.matchlatch_awin_finish(run_id,ids);
 if (r->>'removed')::integer<897 then raise exception 'Removed-source invalidation failed';end if;
 if exists(select 1 from public.matchlatch_awin_products where advertiser_id=116479 and not(source_variant_id=any(ids)) and available) then raise exception 'Removed products still available';end if;
end $$;
rollback;
select 'PASS: price, stock, retry receipt, failed-batch atomicity, resume, unchanged skip, removal; all mutations rolled back' as result;
