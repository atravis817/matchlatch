-- Isolated PREVIEW database ONLY. Inspect pg_cron/pg_net/Vault availability
-- before applying. This file DOES NOT register a recurring cron job.
begin;
create table public.matchlatch_shopify_preview_schedule (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 endpoint text not null check(endpoint ~ '^https://[a-z0-9-]+\.vercel\.app/api/admin-summary\?action=shopify-sync-scheduled$')
);
alter table public.matchlatch_shopify_preview_schedule enable row level security;
revoke all on public.matchlatch_shopify_preview_schedule from public,anon,authenticated,service_role;
create function public.matchlatch_shopify_preview_tick()
returns bigint language plpgsql security invoker set search_path=pg_catalog,public as $$
declare target text; sync_secret text; bypass_secret text; request_id bigint;
begin
 select endpoint into target from public.matchlatch_shopify_preview_schedule where singleton and enabled;
 if target is null then return null;end if;
 if extract(hour from now() at time zone 'America/New_York')<>0 and not exists(select 1 from public.matchlatch_shopify_sync_jobs where status in ('running','paused','failed') and not dry_run) then return null;end if;
 select decrypted_secret into sync_secret from vault.decrypted_secrets where name='matchlatch_preview_shopify_sync_secret';
 select decrypted_secret into bypass_secret from vault.decrypted_secrets where name='matchlatch_preview_protection_bypass';
 if length(coalesce(sync_secret,''))<32 or bypass_secret is null then raise exception 'preview_scheduler_credentials_missing';end if;
 select net.http_post(url:=target,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||sync_secret,'x-vercel-protection-bypass',bypass_secret),body:='{}'::jsonb,timeout_milliseconds:=65000) into request_id;
 return request_id;
end $$;
revoke all on function public.matchlatch_shopify_preview_tick() from public,anon,authenticated,service_role;
commit;
-- After isolated configuration and authorization, a DBA may register:
-- select cron.schedule('matchlatch-shopify-preview','* * * * *',
--   'select public.matchlatch_shopify_preview_tick()');
-- It starts at the first midnight Eastern tick, continues unfinished jobs,
-- and the durable (shop, local day, dry_run) key suppresses duplicate starts.
-- It is disabled by default; no job is installed by this proposal.
