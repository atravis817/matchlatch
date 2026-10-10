-- Development-only metering; retain all pre-existing RLS policies.
alter table public.matchlatch_ai_usage add column operation text not null default 'styling';
alter table public.matchlatch_ai_usage add column search_calls integer not null default 0;
create function public.matchlatch_commerce_reserve(p_user uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare spent numeric;global_count integer;mine integer;recent integer;usage_id uuid;
begin
 perform pg_advisory_xact_lock(9118944);
 select coalesce(sum(greatest(reserved_usd,coalesce(actual_usd,0))),0) into spent from public.matchlatch_ai_usage where created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
 select count(*) into global_count from public.matchlatch_ai_usage where operation='web_discovery' and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 select count(*),count(*) filter(where created_at>now()-interval '1 minute') into mine,recent from public.matchlatch_ai_usage where user_id=p_user and operation='web_discovery' and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 if spent+.10>5 or global_count>=5 or mine>=2 or recent>=1 then return jsonb_build_object('allowed',false,'alert',spent>=3);end if;
 insert into public.matchlatch_ai_usage(user_id,operation,reserved_usd) values(p_user,'web_discovery',.10) returning id into usage_id;
 return jsonb_build_object('allowed',true,'usage_id',usage_id,'alert',spent+.10>=3);
end $$;
revoke all on function public.matchlatch_commerce_reserve(uuid) from public,anon,authenticated;
grant execute on function public.matchlatch_commerce_reserve(uuid) to service_role;
create function public.matchlatch_commerce_meter(p_id uuid,p_input integer,p_output integer,p_calls integer,p_outcome text) returns void language sql security invoker set search_path='' as $$
 update public.matchlatch_ai_usage set input_tokens=greatest(0,p_input),output_tokens=greatest(0,p_output),search_calls=greatest(0,p_calls),actual_usd=(greatest(0,p_input)*.75+greatest(0,p_output)*4.5)/1000000+greatest(0,p_calls)*.01,outcome=left(p_outcome,30) where id=p_id and operation='web_discovery'
$$;
revoke all on function public.matchlatch_commerce_meter(uuid,integer,integer,integer,text) from public,anon,authenticated;
grant execute on function public.matchlatch_commerce_meter(uuid,integer,integer,integer,text) to service_role;
