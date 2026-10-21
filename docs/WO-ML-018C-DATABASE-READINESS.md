# WO-ML-018C — isolated Preview database readiness
2026-10-14. **BLOCKED**. Read-only inspection; no provisioning or migration performed.

## Verified destination/configuration
Supabase list_projects exposes only MATCHLATCH, project ref odxqxymwlwnbqginqems, us-east-1, ACTIVE_HEALTHY. This is the existing shared database and is explicitly prohibited. No authorized isolated destination is visible through this connection; projects outside its access are unknown.
PR #9 checkpoint: 3f6a37a12c3c2ac573869027669f87f94a1bec31. Local application tree remains equivalent to remote application commit 4724cb55; existing HANDOFF.md modification from the preceding verification is preserved.
Neither MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL nor MATCHLATCH_SHOPIFY_PREVIEW_SERVICE_KEY exists in inspected Vercel metadata. Preview writes, publication and schedule flags are false.

## Exact secure setup (after destination authorization)
Vercel → MATCHLATCH → Settings → Environment Variables. **Preview only**, branch **feature/wo-ml-018a-nightly-shopify-sync**, no Production/Development scope.

| Key | Value/location in separately approved Supabase project | Sensitivity |
| --- | --- | --- |
| MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL | Project Connect dialog: HTTPS project URL, https://<approved-ref>.supabase.co | Not a credential; server configuration |
| MATCHLATCH_SHOPIFY_PREVIEW_SERVICE_KEY | Settings → API Keys → legacy service_role JWT, from that exact isolated project, for current adapter compatibility | Sensitive, server-only; enter directly in Vercel |

Never use the shared project URL/key, database password, anon/publishable key, Shopify secret, or personal access token. Never paste keys into chat/issues/Git. Current createSyncStore sends the same key in apikey and Authorization: Bearer; a modern sb_secret key is not a JWT. Do not assume that header combination works without a separate compatibility change and live test. Supabase recommends modern secret keys; legacy JWT use here is an existing-adapter compatibility limitation, not a new architecture recommendation. If the approved destination has no supported legacy key, stop and plan/test modern-key header support separately.
Keep all three activation flags false. Do not change main customer-auth database settings. Rebuild only the correct protected branch Preview after approved configuration.

## Provisioning decision packet
Destination identity: **UNASSIGNED**, not odxqxymwlwnbqginqems. Proposed label MATCHLATCH-SHOPIFY-PREVIEW, region us-east-1 for proximity; these are proposals, not created resources.
Founder must identify an existing empty isolated project and authorize its use, or separately approve creation with the provider's current plan/quota/cost explicitly reviewed. No cost estimate or free entitlement verified. Record exact project ref, organization, region, plan, owner, permitted purpose and lack of Production/customer-data dependencies before proceeding. No copy of live customer data or shared credentials.
Provisioning approval does not approve DDL/imports. A second approval must name the exact destination ref and reviewed SQL revision.

## Reviewable migration plan — NOT EXECUTED
1. Preflight read-only: verify destination ref/host differs from shared and customer-auth projects; record Postgres version, public schema, existing objects/grants, available service_role, API exposure and backup/recovery capabilities. If names collide, stop; SQL uses CREATE and is not idempotent. Do not rerun blindly.
2. Freeze reviewed revision/hash of supabase/PROPOSED_shopify_sync.sql (source in PR #9). Re-run pinned ephemeral PGlite 0.5.9 transaction/RLS tests before approval; fixture proof is not live PostgREST proof.
3. After separate exact-destination migration approval only, apply that one file as a transaction using provider SQL/migration tooling. It creates five tables: sync_jobs, sync_state, sync_seen, products, publication_audit (all prefixed matchlatch_shopify_); four indexes and audit identity sequence; RLS enabled; anon/authenticated/public access revoked; service-role grants; three security-invoker RPCs: matchlatch_shopify_sync, matchlatch_shopify_publish, matchlatch_shopify_counts. No seed products, customer copy, Awin changes or backfill.
4. Exclude PROPOSED_shopify_preview_scheduler.sql entirely. No pg_cron/pg_net/Vault setup, recurring jobs, webhooks or schedule credentials in this migration.
5. Post-migration validation, read-only where possible: inspect exact object definitions/grants/RLS/advisors; verify no anonymous/authenticated table/RPC access; service-role GET of empty jobs/state/products and counts RPC returns zero baseline. Inspect PostgREST schema availability/cache and API exposure; do not grant public access to solve visibility. Verify owner-only Preview status. Any permission probe using mutating sync/publication RPCs requires separate test-write authorization.
6. Only later, separately authorize synthetic destination-only rollback/fencing/idempotency tests and controlled import. Even the existing dry-run writes durable job/checkpoint/seen bookkeeping: **do not run it under this read-only work order**. Keep imports/publication/schedule disabled.

## Recovery
Before DDL, establish approved destination snapshot/export or provider-supported restore procedure and confirm plan availability. A failed transaction rolls back its uncommitted schema changes; verify actual result before retrying. After commit, isolate access/disable branch flags and preserve logs/schema/job/history; do not DROP tables or restore automatically. Prepare a reviewed forward fix or exact-destination restore with separate approval. No shared/Production rollback action.

## Authentication is separate
The database error does not prove Shopify authentication. Existing database-independent owner-only GET /api/admin-summary?action=shopify-sync-auth remains the required check. Latest verified correct-branch Preview: https://matchlatch-7473d4zl4-matchlatch.vercel.app, dpl_9TkLauo1Cn88uWrQYEh7iBzAvw9y, 3f6a37a. No owner-authenticated success/result is posted in current hub. Token exchange, shop identity, granted scopes, API version, bounded sample and hasMore remain NOT VERIFIED. Owner securely follows PR #9 comment 6179545202; do not request session tokens or infer failure from a sessionless 403.

## Evidence/next milestone
EXTERNAL_VERIFIED: project inventory and Vercel names/scopes/false flags only. OBSERVED: full proposed SQL and adapter reviewed. No new tests needed for documentation-only changes; earlier test results are historical. No credentials read or disclosed.
**One next milestone:** Founder identifies/authorizes an isolated project (or approves a concrete provisioning plan/cost), returning only its non-secret project ref/identity. Then inspect it read-only and request separately scoped migration approval against the reviewed SQL. Application/Production, writes, imports, publication, scheduling, merges and Awin expansion remain frozen.

Official API key reference: https://supabase.com/docs/guides/getting-started/api-keys (checked today); changelog index fetch failed, so no current changelog compatibility claim.
