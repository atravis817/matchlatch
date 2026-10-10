-- Development-only metering; no existing RLS policy changes.
alter table public.matchlatch_ai_usage add column input_tokens integer not null default 0;
alter table public.matchlatch_ai_usage add column output_tokens integer not null default 0;
alter table public.matchlatch_ai_usage add column actual_usd numeric;
alter table public.matchlatch_ai_usage add column outcome text not null default 'reserved';
create or replace function public.matchlatch_ai_reserve(p_user uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare n integer;mine integer;recent integer;month_cost numeric;usage_id uuid;
begin
 perform pg_advisory_xact_lock(9118944);
 select coalesce(sum(greatest(reserved_usd,coalesce(actual_usd,0))),0) into month_cost from public.matchlatch_ai_usage where created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
 select count(*) into n from public.matchlatch_ai_usage where created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 select count(*),count(*) filter(where created_at>now()-interval '1 minute') into mine,recent from public.matchlatch_ai_usage where user_id=p_user and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 if month_cost+.02>5 or n>=10 or mine>=5 or recent>=2 then return jsonb_build_object('allowed',false,'alert',month_cost>=3);end if;
 insert into public.matchlatch_ai_usage(user_id) values(p_user) returning id into usage_id;
 return jsonb_build_object('allowed',true,'usage_id',usage_id,'remaining',4-mine,'alert',month_cost+.02>=3);
end $$;
create function public.matchlatch_ai_meter(p_id uuid,p_input integer,p_output integer,p_outcome text) returns void language sql security invoker set search_path='' as $$
 update public.matchlatch_ai_usage set input_tokens=greatest(0,p_input),output_tokens=greatest(0,p_output),actual_usd=(greatest(0,p_input)*.75+greatest(0,p_output)*4.5)/1000000,outcome=left(p_outcome,30) where id=p_id
$$;
revoke all on function public.matchlatch_ai_meter(uuid,integer,integer,text) from public,anon,authenticated;
grant execute on function public.matchlatch_ai_meter(uuid,integer,integer,text) to service_role;
-- Keep 90 days of usage so monthly limits remain enforceable across maintenance.
create or replace function matchlatch_internal.catalog_maintenance() returns void language plpgsql security definer set search_path='' as $$
begin
 update public.matchlatch_awin_products set is_public=false where is_public and (valid_until<=now() or not available);
 update public.matchlatch_refresh_requests r set status_code=n.status_code,timed_out=n.timed_out,error=case when n.status_code>=400 or n.timed_out then 'Protected refresh request failed' else null end from net._http_response n where r.request_id=n.id and r.status_code is null;
 delete from public.matchlatch_ai_usage where created_at<now()-interval '90 days';
end $$;
