-- MATCHLATCH authenticated cloud library (v1)
-- Run once in the Supabase SQL Editor, before enabling cloud sync in Vercel.
-- All records belong to auth.uid(). No anonymous reads or writes.
create table if not exists public.matchlatch_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('inspirations','looks','favorites','cart','purchases','collections','profile')),
  record_id text not null check (length(record_id) between 1 and 128),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 262144),
  is_deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, record_id)
);
create index if not exists matchlatch_records_user_updated_idx
  on public.matchlatch_records (user_id, updated_at desc);
create or replace function public.matchlatch_touch_record()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists matchlatch_records_touch on public.matchlatch_records;
create trigger matchlatch_records_touch before update on public.matchlatch_records
for each row execute function public.matchlatch_touch_record();

alter table public.matchlatch_records enable row level security;
revoke all on public.matchlatch_records from anon, authenticated;
grant select, insert, update, delete on public.matchlatch_records to authenticated;

drop policy if exists "matchlatch_select_own" on public.matchlatch_records;
drop policy if exists "matchlatch_insert_own" on public.matchlatch_records;
drop policy if exists "matchlatch_update_own" on public.matchlatch_records;
drop policy if exists "matchlatch_delete_own" on public.matchlatch_records;

create policy "matchlatch_select_own" on public.matchlatch_records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "matchlatch_insert_own" on public.matchlatch_records
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "matchlatch_update_own" on public.matchlatch_records
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "matchlatch_delete_own" on public.matchlatch_records
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Inspiration photos are PRIVATE. Do not change public to true.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('matchlatch-inspirations','matchlatch-inspirations',false,3145728,array['image/jpeg'])
on conflict (id) do update set
  public=false,
  file_size_limit=3145728,
  allowed_mime_types=array['image/jpeg'];

-- Storage path format: {auth.uid()}/{inspirationRecordId}.jpg
-- Owner ID AND folder must match the signed-in user.
drop policy if exists "matchlatch_photo_read_own" on storage.objects;
drop policy if exists "matchlatch_photo_insert_own" on storage.objects;
drop policy if exists "matchlatch_photo_update_own" on storage.objects;
drop policy if exists "matchlatch_photo_delete_own" on storage.objects;

create policy "matchlatch_photo_read_own" on storage.objects
  for select to authenticated using (
    bucket_id='matchlatch-inspirations'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and owner_id = (select auth.uid()::text)
  );
create policy "matchlatch_photo_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id='matchlatch-inspirations'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and owner_id = (select auth.uid()::text)
    and lower(storage.extension(name)) = 'jpg'
  );
create policy "matchlatch_photo_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id='matchlatch-inspirations'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and owner_id = (select auth.uid()::text)
  )
  with check (
    bucket_id='matchlatch-inspirations'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and owner_id = (select auth.uid()::text)
    and lower(storage.extension(name)) = 'jpg'
  );
create policy "matchlatch_photo_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id='matchlatch-inspirations'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and owner_id = (select auth.uid()::text)
  );

-- RLS smoke checks (run these in the SQL Editor):
-- select relrowsecurity from pg_class where oid='public.matchlatch_records'::regclass; -- must be true
-- select id,public from storage.buckets where id='matchlatch-inspirations'; -- public must be false
-- RLS enforcement for two separate users should also be verified with authenticated test sessions.
