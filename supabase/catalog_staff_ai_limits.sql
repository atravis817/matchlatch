create table public.matchlatch_catalog_staff(user_id uuid primary key references auth.users(id) on delete cascade,role text not null default 'catalog' check(role='catalog'));
alter table public.matchlatch_catalog_staff enable row level security;
revoke all on public.matchlatch_catalog_staff from public,anon,authenticated;
grant select on public.matchlatch_catalog_staff to authenticated;
create policy staff_read_self on public.matchlatch_catalog_staff for select to authenticated using(user_id=(select auth.uid()));
create function matchlatch_internal.staff_catalog(p_max numeric,p_slot text default '',p_size text default '',p_limit integer default 60)
returns setof public.matchlatch_awin_products language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.matchlatch_catalog_staff where user_id=auth.uid()) then raise exception 'Staff authorization required' using errcode='42501';end if;
 if p_max not between 1 and 10000 or p_limit not between 1 and 60 then raise exception 'Invalid query';end if;
 return query select p.* from public.matchlatch_awin_products p
 where p.advertiser_id=116479 and p.source_feed_id='102556' and not p.is_public and p.available and p.currency='USD'
 and p.price_usd<=p_max and (p_slot='' or p.slot=p_slot) and (p_size='' or lower(p.size)=lower(p_size))
 and exists(select 1 from public.matchlatch_awin_import_runs r where r.advertiser_id=p.advertiser_id and r.feed_id=p.source_feed_id and r.status='succeeded' and r.finished_at>now()-interval '36 hours')
 order by p.price_usd,p.source_variant_id limit p_limit;
end $$;
revoke all on function matchlatch_internal.staff_catalog(numeric,text,text,integer) from public,anon,authenticated;
grant usage on schema matchlatch_internal to authenticated;
grant execute on function matchlatch_internal.staff_catalog(numeric,text,text,integer) to authenticated;
create function public.matchlatch_staff_catalog(p_max numeric,p_slot text default '',p_size text default '',p_limit integer default 60)
returns setof public.matchlatch_awin_products language sql security invoker set search_path='' as $$
 select * from matchlatch_internal.staff_catalog(p_max,p_slot,p_size,p_limit)
$$;
revoke all on function public.matchlatch_staff_catalog(numeric,text,text,integer) from public,anon;
grant execute on function public.matchlatch_staff_catalog(numeric,text,text,integer) to authenticated;
create table public.matchlatch_ai_usage(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now(),reserved_usd numeric not null default .02);
create index matchlatch_ai_usage_user_time on public.matchlatch_ai_usage(user_id,created_at);
alter table public.matchlatch_ai_usage enable row level security;
revoke all on public.matchlatch_ai_usage from public,anon,authenticated;
grant all on public.matchlatch_ai_usage to service_role;
create function public.matchlatch_ai_reserve(p_user uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare n integer;mine integer;recent integer;
begin
 perform pg_advisory_xact_lock(9118944);
 select count(*) into n from public.matchlatch_ai_usage where created_at>=date_trunc('day',now());
 select count(*),count(*) filter(where created_at>now()-interval '1 minute') into mine,recent from public.matchlatch_ai_usage where user_id=p_user and created_at>=date_trunc('day',now());
 if n>=10 or mine>=5 or recent>=2 then return jsonb_build_object('allowed',false);end if;
 insert into public.matchlatch_ai_usage(user_id) values(p_user);
 return jsonb_build_object('allowed',true,'remaining',4-mine);
end $$;
revoke all on function public.matchlatch_ai_reserve(uuid) from public,anon,authenticated;
grant execute on function public.matchlatch_ai_reserve(uuid) to service_role;

