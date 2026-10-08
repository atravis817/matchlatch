-- Already applied to the MATCHLATCH Supabase project as migration
-- enable_named_style_collections. This file documents the backward-compatible
-- database upgrade; existing projects must apply it once, not rerun setup.sql.
-- Collections share the existing owner-scoped RLS policies and do not grant
-- new read/write permissions.
alter table public.matchlatch_records
  drop constraint if exists matchlatch_records_kind_check;
alter table public.matchlatch_records
  add constraint matchlatch_records_kind_check
  check (kind in ('inspirations','looks','favorites','cart','purchases','collections','profile'));
