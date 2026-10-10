create extension if not exists pg_cron;
create extension if not exists pg_net;
create table public.matchlatch_refresh_requests(request_id bigint primary key,created_at timestamptz not null default now(),status_code integer,timed_out boolean,error text);
alter table public.matchlatch_refresh_requests enable row level security;
revoke all on public.matchlatch_refresh_requests from public,anon,authenticated;
grant all on public.matchlatch_refresh_requests to service_role;
create function matchlatch_internal.refresh_enqueue() returns bigint language plpgsql security definer set search_path='' as $$
declare u text;s text;r bigint;
begin
 select decrypted_secret into u from vault.decrypted_secrets where name='matchlatch_private_refresh_url';
 select decrypted_secret into s from vault.decrypted_secrets where name='matchlatch_private_refresh_secret';
 if u is null or s is null then raise exception 'Private refresh not configured';end if;
 r:=net.http_post(url:=u,body:='{}'::jsonb,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||s),timeout_milliseconds:=180000);
 insert into public.matchlatch_refresh_requests(request_id) values(r);
 return r;
end $$;
revoke all on function matchlatch_internal.refresh_enqueue() from public,anon,authenticated;
create function public.matchlatch_configure_private_refresh(p_url text,p_secret text,p_schedule text default '23 8 * * *') returns jsonb language plpgsql security definer set search_path='' as $$
declare id uuid;j bigint;
begin
 if (auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'Server authorization required';end if;
 if p_url !~ '^https://matchlatch-[a-z0-9]+-matchlatch[.]vercel[.]app/api/catalog-refresh[?]' or length(p_secret)<>64 or length(p_schedule)>40 or p_schedule !~ '^[0-9*/, -]+$' then raise exception 'Invalid private worker configuration';end if;
 select v.id into id from vault.secrets v where v.name='matchlatch_private_refresh_url';
 if id is null then perform vault.create_secret(p_url,'matchlatch_private_refresh_url');else perform vault.update_secret(id,p_url);end if;
 select v.id into id from vault.secrets v where v.name='matchlatch_private_refresh_secret';
 if id is null then perform vault.create_secret(p_secret,'matchlatch_private_refresh_secret');else perform vault.update_secret(id,p_secret);end if;
 j:=cron.schedule('matchlatch-private-feed-refresh',p_schedule,'select matchlatch_internal.refresh_enqueue();');
 return jsonb_build_object('configured',true,'job_id',j,'schedule',p_schedule);
end $$;
revoke all on function public.matchlatch_configure_private_refresh(text,text,text) from public,anon,authenticated;
grant execute on function public.matchlatch_configure_private_refresh(text,text,text) to service_role;
create function matchlatch_internal.catalog_maintenance() returns void language plpgsql security definer set search_path='' as $$
begin
 update public.matchlatch_awin_products set is_public=false where is_public and (valid_until<=now() or not available);
 update public.matchlatch_refresh_requests r set status_code=n.status_code,timed_out=n.timed_out,error=case when n.error_msg is not null then 'Network failure' when n.status_code>=400 then 'Worker HTTP failure' else null end from net._http_response n where r.request_id=n.id and r.status_code is null;
 delete from public.matchlatch_ai_usage where created_at<now()-interval '7 days';
end $$;
revoke all on function matchlatch_internal.catalog_maintenance() from public,anon,authenticated;
select cron.schedule('matchlatch-catalog-maintenance','37 * * * *','select matchlatch_internal.catalog_maintenance();');

