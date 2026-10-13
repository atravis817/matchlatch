create function matchlatch_internal.staff_catalog_search(p_max numeric,p_slot text,p_size text,p_brand text,p_offset integer,p_desc boolean)
returns setof public.matchlatch_awin_products language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.matchlatch_catalog_staff where user_id=auth.uid()) then raise exception 'Staff authorization required' using errcode='42501';end if;
 if p_max not between 1 and 10000 or p_offset not between 0 and 50000 or length(p_brand)>60 then raise exception 'Invalid query';end if;
 return query select p.* from public.matchlatch_awin_products p where p.advertiser_id=116479 and p.source_feed_id='102556' and not p.is_public and p.available and p.currency='USD' and p.price_usd<=p_max
 and (p_slot='' or p.slot=p_slot) and (p_size='' or lower(p.size)=lower(p_size)) and (p_brand='' or lower(p.brand)=lower(p_brand))
 and exists(select 1 from public.matchlatch_awin_import_runs r where r.advertiser_id=p.advertiser_id and r.feed_id=p.source_feed_id and r.status='succeeded' and r.finished_at>now()-interval '36 hours')
 order by case when p_desc then -p.price_usd else p.price_usd end,p.source_variant_id offset p_offset limit 60;
end $$;
revoke all on function matchlatch_internal.staff_catalog_search(numeric,text,text,text,integer,boolean) from public,anon,authenticated;
grant execute on function matchlatch_internal.staff_catalog_search(numeric,text,text,text,integer,boolean) to authenticated;
create function public.matchlatch_staff_catalog_search(p_max numeric,p_slot text default '',p_size text default '',p_brand text default '',p_offset integer default 0,p_desc boolean default false)
returns setof public.matchlatch_awin_products language sql security invoker set search_path='' as $$ select * from matchlatch_internal.staff_catalog_search(p_max,p_slot,p_size,p_brand,p_offset,p_desc) $$;
revoke all on function public.matchlatch_staff_catalog_search(numeric,text,text,text,integer,boolean) from public,anon;
grant execute on function public.matchlatch_staff_catalog_search(numeric,text,text,text,integer,boolean) to authenticated;
