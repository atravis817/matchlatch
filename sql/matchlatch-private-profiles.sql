-- Apply through a reviewed staging migration before accepting personal addresses.
-- No card PAN, CVV, or raw biometric information is stored by MATCHLATCH.
create table if not exists public.matchlatch_private_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 shipping_address jsonb not null default '{}'::jsonb,
 billing_address jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.matchlatch_private_profiles enable row level security;
revoke all on public.matchlatch_private_profiles from anon;
grant select,insert,update,delete on public.matchlatch_private_profiles to authenticated;
drop policy if exists "private_profile_select_owner" on public.matchlatch_private_profiles;
create policy "private_profile_select_owner" on public.matchlatch_private_profiles for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "private_profile_insert_owner" on public.matchlatch_private_profiles;
create policy "private_profile_insert_owner" on public.matchlatch_private_profiles for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "private_profile_update_owner" on public.matchlatch_private_profiles;
create policy "private_profile_update_owner" on public.matchlatch_private_profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "private_profile_delete_owner" on public.matchlatch_private_profiles;
create policy "private_profile_delete_owner" on public.matchlatch_private_profiles for delete to authenticated using ((select auth.uid())=user_id);
