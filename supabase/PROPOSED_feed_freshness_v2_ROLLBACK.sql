-- PROPOSAL ONLY. Operational rollback, idempotent and evidence-preserving.
-- Pause all writers and disable v2/write approval flags FIRST. No restore of
-- product values: committed batches need a reviewed before-image recovery.
-- Keep nullable evidence columns and v2 run counters; dropping them would lose
-- history and could break dependencies. Exact schema removal is NOT authorized.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
select pg_advisory_xact_lock(7114,116479);
lock table public.matchlatch_awin_import_runs in share row exclusive mode;
do $$ begin
 if exists(select 1 from public.matchlatch_awin_import_runs where status='running') then raise exception 'Resolve running imports before rollback';end if;
end $$;
drop function if exists public.matchlatch_awin_finish_v2(uuid,text[]);
drop function if exists public.matchlatch_awin_batch_v2(uuid,integer,jsonb);
drop function if exists public.matchlatch_awin_begin_v2(integer,text,text,integer,integer,uuid);
do $$ begin
 if to_regprocedure('public.matchlatch_awin_begin_v2(integer,text,text,integer,integer,uuid)') is not null or to_regprocedure('public.matchlatch_awin_batch_v2(uuid,integer,jsonb)') is not null or to_regprocedure('public.matchlatch_awin_finish_v2(uuid,text[])') is not null then raise exception 'Rollback function removal failed';end if;
end $$;
commit;
