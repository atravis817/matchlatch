# WO-ML-018C-V3 — exact destination verification and approval packet
Verified 2026-10-14, read-only. **Destination verified; configuration/migration pending.**

## Destination and evidence
- Name MATCHLATCH-SHOPIFY-PREVIEW; ref lqxeizvrdxuhzvipmlkl; organization khdjrduondzyhobljhxz; region ca-central-1; ACTIVE_HEALTHY; Postgres 17.11.0.003.
- Host db.lqxeizvrdxuhzvipmlkl.supabase.co is distinct from shared/customer-auth project odxqxymwlwnbqginqems.
- Provider creation timestamp returned 2026-10-14T16:57:01.705498Z; do not infer creation timing from the Founder message.
- Read-only SQL: zero public application relations/routines, auth.users, storage.objects, subscriptions, foreign servers and Realtime published tables. list_tables(public) empty. Security advisor lints empty.
- Roles anon/authenticated: schema USAGE true, CREATE false, BYPASSRLS false. service_role: USAGE true, CREATE false, BYPASSRLS true (expected privileged role). No application table/RPC grants exist to audit yet.
- Extensions: plpgsql, pg_stat_statements, uuid-ossp, pgcrypto, supabase_vault. No scheduler installation observed in extension inventory.
- Organization metadata says Free. Account invoice, quota usage and project-specific billing were not independently exposed/verified; unavailable cost tool is not a zero-cost quote.
- No customer data or database replication linkage found within inspected scope. Absence of dependencies in every external application is not provable from this scan. Existing Matchlatch adapter explicitly rejects the shared project. New Preview URL/key settings absent in inspected Vercel metadata, so this destination is not wired through those settings.
- One initial read-only multi-statement audit failed because role_schema_grants view does not exist; corrected query uses has_schema_privilege and completed successfully. No state changed.

## Secure configuration instructions (not performed)
Vercel → MATCHLATCH → Settings → Environment Variables. Preview ONLY. Branch exactly feature/wo-ml-018a-nightly-shopify-sync.

| Key | Exact value/location | Sensitivity |
| --- | --- | --- |
| MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL | https://lqxeizvrdxuhzvipmlkl.supabase.co ; verify in this project's Connect dialog | Configuration, not credential |
| MATCHLATCH_SHOPIFY_PREVIEW_SERVICE_KEY | This exact project's Settings → API Keys → legacy service_role JWT, for existing adapter compatibility | Sensitive; server-only |

Do not send keys/passwords in chat or GitHub. Current adapter sends key as apikey plus Authorization Bearer; modern sb_secret compatibility requires separate implementation/test before substitution. Never use anon/publishable key, database password, Shopify secret, or shared project key. Do not change customer-auth variables. Writes/publication/schedule flags remain false, verified today. Configure only under separate authorized setup scope, then rebuild correct protected branch Preview; settings presence alone is not runtime proof.

## Exact-destination migration approval request — NOT EXECUTED
Requested future action: apply ONLY supabase/PROPOSED_shopify_sync.sql from PR #9, immutable Git blob **a5af019bc8da9323a640f2bf3f54065b21d37634**, on **lqxeizvrdxuhzvipmlkl**. Any changed SQL blob requires fresh review. No schema/publication/scheduler action is authorized by this packet.

Creates five public tables (matchlatch_shopify_sync_jobs/state/seen, matchlatch_shopify_products, matchlatch_shopify_publication_audit), four indexes, audit identity sequence, three security-invoker RPCs; enables RLS and restricts table/RPC grants to service_role. No source rows or customer data inserted. No scheduler SQL, cron, webhook, imports, purchases or publication.

Preflight immediately before separately approved execution: reconfirm exact project ref, current empty application schema and no name collisions; verify SQL blob and schema permissions; confirm actual Data API exposure/configuration and approved recovery method. Current API exposure settings and backups/PITR availability are NOT VERIFIED. Use a reproducible empty-schema baseline export; do not assume Free includes paid backup/PITR. Stop if baseline/recovery or permissions differ. Re-run pinned ephemeral PGlite 0.5.9 transaction/permission suite before applying; earlier full CI evidence is historical, not a fresh run here.

Execution after approval only: apply the one transaction through migration tooling with recorded revision/name/result. A migration transaction failure must be inspected and rolled back rather than blindly retried; CREATE statements are not rerunnable after success.

Read-only validation after approved migration: verify five tables/four indexes/three RPC definitions, RLS/grants, advisors, empty counts, service-role REST read/counts and owner-only Preview status; prove anon/authenticated denial without weakening grants. No mutating sync/publication RPC call or dry run under read-only validation: dry runs write durable bookkeeping and need separate authorization.

Recovery: pre-commit failure rolls back transaction; inspect state. After commit, keep writes/publication/scheduling false and preserve schema/data/job/audit history. Restore/DDL reversal/forward fixes require separately reviewed exact-destination action; no automated DROP, shared DB rollback or project deletion. Do not assume unavailable backup features.

Suggested approval wording: “I approve applying only reviewed SQL blob a5af019bc8da9323a640f2bf3f54065b21d37634 to isolated project lqxeizvrdxuhzvipmlkl after preflight and ephemeral verification, followed by read-only validation. No imports, publication, scheduling or Production changes.”
This is a request, not recorded approval.

## Separate authentication and next milestone
Shopify authentication remains NOT VERIFIED: no owner-authenticated success has been supplied. Continue existing database-independent check separately; project health/DB error cannot establish token exchange or scope success.
Next milestone: Founder approves or declines the exact-destination migration packet (and secure config separately if desired). No migration/configuration/import/scheduler/publication/Production change performed in this work order.
