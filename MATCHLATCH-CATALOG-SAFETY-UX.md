# MATCHLATCH V1.2 — catalog safety and UX verification

2026-10-11. Branch `design/v1.2-studio-first-100926` only. Migration, live importer, recurring refresh and shared-data changes remain **NO-GO**. No Supabase SQL was executed during this sprint. Last previously verified database snapshot was 899 private products, 898 available, zero public and zero US-shipping eligible; it is not a new count from this sprint.

## Engineering behavior

| Area | Before | Proposed/new code behavior |
|---|---|---|
| Eligibility | Direct REST and batch updates could reset US shipping | No REST fallback. v2 conflict updates omit both qualification flags; public existing rows are rejected. New rows are private and unqualified. Product-specific qualification remains a separate reviewed action. |
| Omitted records | Legacy finish removed products missing from a capped selection | All new write paths call v2 begin/batch/finish only. v2 finish never updates products or partners. `--full` does not authorize reconciliation; explicit reconciliation requests fail. No complete-feed reconciliation implementation is enabled. |
| Initial content hash | Null prior hash was counted unchanged even if price/category changed | Compare persisted business fields on the first observation. Equal baseline counts `initialized`; actual changed fields count `updated`; only known equal hashes count `unchanged`. Hash excludes publication/qualification and freshness metadata. |
| Bounds | Limits silently clamped; 10,000 full limit | Default sample 25; hard maximum 899. Batch 1–200 (default 100). Invalid/fractional/zero limits, duplicate identities, unsupported source and automatic resume rejected before RPC. |
| Approval | `--write` could use a legacy path | Preview + separately provisioned `MATCHLATCH_CATALOG_WRITES_APPROVED=true` + `MATCHLATCH_FEED_FRESHNESS_V2=true` required before discovery. These flags have not been provisioned. Existing HTTP refresh also retains its authentication/write gate. |
| Execution | Independent per-call timeouts | 240-second shared abort deadline; discovery 20s, feed 45s, RPC 20s, at most two RPC retries; 25MB compressed / 75MB decoded limits. Workflow outer ceiling 5min. CPU-bound CSV parsing is memory-bounded, not interruptible by the abort signal. No workflow was dispatched. |
| Checkpoints | v1/v2 could share a failed-run resume | v2 runs explicitly tagged; reject v1 receipts and all automatic resume. Exact batch lengths, intra/run identity uniqueness, payload receipt check, counter and identity assertions at finish. Open jobs block new jobs rather than automatically being expired. |

### Timestamp meaning

`source_checked_at` records a successful feed download/check, not an independent retailer check of price, inventory or shipping. `source_updated_at` is the feed publisher's advertised revision time. `content_changed_at` is when ingestion observed a content difference, not the time a retailer made the change. An equal first baseline preserves unknown historical change time. `feed_imported_at` remains the import observation timestamp under the prior public API rule; it is not blindly renewed by repeat checks. `valid_until` is capped at the earlier of source revision/check plus 24 hours; repeat checks cannot rejuvenate stale source evidence. Historical unknown evidence is not reconstructed.

### Proposed migration scope — NOT EXECUTED

`supabase/PROPOSED_feed_freshness_v2.sql` adds nullable `source_checked_at timestamptz`, `content_hash text`, `content_changed_at timestamptz` to `public.matchlatch_awin_products`; adds nullable `pipeline_version integer` and `initialized integer NOT NULL DEFAULT 0` to `public.matchlatch_awin_import_runs`; creates/replaces only `matchlatch_awin_begin_v2(integer,text,text,integer,integer,uuid)`, `matchlatch_awin_batch_v2(uuid,integer,jsonb)`, `matchlatch_awin_finish_v2(uuid,text[])`. These are SECURITY INVOKER with empty search_path and EXECUTE granted only to service_role, revoked from PUBLIC/anon/authenticated.

It does not modify existing v1 function definitions, indexes, triggers, policies, table grants, partner records, users or products. Existing run rows receive the zero default counter. Adding columns expands SELECT * and the table's composite row shape, including existing staff RPC responses. No new sensitive values are stored. Existing RLS, triggers and grants are retained; API mappers ignore the extra nullable fields. Automated old/proposed-row mapping regression passes; actual Production/database SQL compatibility is **not yet proven**.

Preflight uses advisory/table locks, 3s lock and 30s statement timeouts, rejects running jobs, checks required legacy fail routine, role, RLS and existing new-column types. Postflight compares all existing product and run values excluding new metadata, and table ACLs/RLS/policies/triggers; asserts v2 invoker/role permissions. The transaction rolls back on assertion failure. The proposal is repeatable via IF NOT EXISTS / CREATE OR REPLACE; idempotence has been structurally reviewed, not executed in PostgreSQL.

`supabase/PROPOSED_feed_freshness_v2_ROLLBACK.sql` is an **operational rollback**: with writers paused, refuses running jobs, drops only the three v2 functions with IF EXISTS and without CASCADE, then asserts their absence. It deliberately retains nullable evidence columns and run counters. It is not an exact schema restoration and cannot reverse already committed product batches. Do not reactivate legacy writers after rollback; they have the old unsafe semantics.

### Required recovery / isolated database gates

1. Confirm shared-project backup/PITR entitlement, successful backup time, retention, restoration target, RTO/RPO and permission to restore. None has been verified this sprint.
2. Obtain an encrypted, access-restricted logical export of affected product/partner/run/receipt rows and relevant schema/ACLs before any approved shared migration or write. Record row counts, checksums and publication/qualification values. Do not export unrelated user data.
3. On a disposable PostgreSQL instance matching the shared version/schema: apply migration twice, test old endpoints, run 25 selected synthetic/private rows against a 899-row fixture, assert all 874 omitted records and every qualification/public flag remain identical, test changed/equal initial baselines, stale/future timestamps, duplicate/counter failures, receipt replay, concurrency, unauthenticated/customer denial and run rollback twice. Confirm retained evidence and legacy compatibility.
4. Rehearse before-image restoration for a mid-run failure. Each batch commits separately: a failed run is not a data rollback. Restore only reviewed affected rows; full shared restore requires a separate impact review. A timed-out call may have committed; reconcile receipts before retry. A run left running requires manual recovery review, not automatic lease expiry or resume.
5. Review resulting SQL and recovery evidence, then request separate execution approval. No local PostgreSQL/docker/isolated Supabase database is currently available; SQL compilation, migration/rollback and database invariants are untested. Do not use the shared database as a test substitute.

A future first approved private test should remain **25 explicitly selected records**, single source 116479/102556, batch ≤25, deadline 240s, no removal/partner update/publication/qualification and no automatic resume. Run a real dry run first; secure the exact selected before-image. The present runbook is not authorization to run either step. Full refresh up to899 requires separate snapshot review; omission reconciliation remains disabled even then.

## UX behavior

Store has one search form. Choose reviewed public feed catalog or the retained participating retailer provider. Exact size overrides saved size; category/budget/brand/sort are explicit, brand only enabled for reviewed catalog. Delivery deadlines with no catalog delivery evidence return no offers; never invent a forecast. Source snapshots are labeled as snapshots and Awin links use sponsored/nofollow/noopener/noreferrer. Product detail, shortlist and existing account-gated persistence are preserved. Account changes abort search and clear prior product results.

Studio's catalog styling panel precedes the existing project/photo/guided tools. Readiness distinguishes configured AI credential, untested connection and actual eligible public catalog coverage. Empty catalog styling retains server-side model preflight and existing cost limits. Failed images have fallback text; 16px input text avoids iOS zoom, controls ≥44px, small-screen cards use one column, checkbox rows span the small-screen grid. GreenGlass/forest-green styling remains.

`preview-responsive.html` is an unlinked visual test frame for the actual Preview app at390/430/1280 CSS-pixel widths. It does not emulate Safari or a physical iPhone. QA mode's fictional fixtures are returned only through the existing owner UUID/verified Supabase gate (`/api/admin-summary?fixtures=1`), without service-role reads or analytics. They are labeled fictional and have no retailer URLs, product/variant purchase IDs, saving or affiliate actions. They are never catalog/API/style candidates. Ordinary accounts cannot retrieve them. Existing Command Center capability and summary modes are retained.

## Verification

- Node v24 syntax validation: pass for changed JS/MJS.
- `node --test scripts/test-*.mjs`: **72/72 pass**, synthetic/network-intercepted tests, zero live importer/AI/database writes. Includes 5 new refresh safety tests and4 UX/API compatibility tests, existing owner/non-owner authorization and account-switch regression tests.
- `node scripts/check-commerce-policy.mjs`: pass, reviewed policy2.0.0 unchanged.
- Tests prove JavaScript bounds/protocol routing and proposed SQL structure; they do **not** prove PostgreSQL execution or live data invariants.
- Preview/browser evidence: pending deployment and live visual verification; update this section with observed results.

## Desktop/mobile matrix and remaining blockers

| Journey | Evidence planned / required |
|---|---|
| Desktop guest Store | One search form; filter round trip; loading→honest empty/error; no owner navigation/private products |
|390/430px guest Store | Actual embedded app layout, no horizontal overflow, usable inputs/buttons; screenshot |
|390px guest Studio | Studio-first layout/readiness and signed-out account gate; no paid model invocation |
|Verified owner | Manual sign-in required to exercise private fictional cards/details; existing server authorization covered synthetically |
|Customer / account switch | API denial and stale-response clearing regression; manual live multi-account test pending |
|Real eligible product | Imagery, retailer destination, live stock, product saving/account isolation and actual filtering require qualified fresh inventory and authorized sign-in |

Merchant membership/advertiser permissions, feed/image usage rights, product-specific US shipping, current source freshness, accurate category/variant evidence and publication approval still block Watches Of USA shopper activation. None was fabricated or altered. No claims of live retailer inventory, working coupon redemption, guaranteed arrival or verified affiliate redemption are made.

Production baseline: deployment `dpl_35psQBq1wqGoi72B3A45GgKFGuZ3`, main `302fa9c3d83263ca25c3ed6252665fb73f06c569`. No main merge, Production deployment, DNS, environment provisioning, database change, refresh dispatch or billing action performed.
