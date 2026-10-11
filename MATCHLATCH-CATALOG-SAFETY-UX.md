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

Preflight uses advisory/table locks, 3s lock and 30s statement timeouts, rejects running jobs, checks required legacy fail routine, role, RLS and existing new-column types. An atomic conflict predicate plus row-lock/concurrent-insert rejection protects against a product being published by another writer during a batch. v2 functions set a3s lock timeout. Postflight compares all existing product and run values excluding new metadata, and table ACLs/RLS/policies/triggers; asserts v2 invoker/role permissions. The transaction rolls back on assertion failure. The proposal is repeatable via IF NOT EXISTS / CREATE OR REPLACE; idempotence has been structurally reviewed, not executed in PostgreSQL.

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
- `node --test scripts/test-*.mjs`: **75/75 pass**, synthetic/network-intercepted tests, zero live importer/AI/database writes. Includes 5 new refresh safety tests and 7 UX/API compatibility/diagnostic tests, existing owner/non-owner authorization and account-switch regression tests.
- `node scripts/check-commerce-policy.mjs`: pass, reviewed policy2.0.0 unchanged.
- Tests prove JavaScript bounds/protocol routing and proposed SQL structure; they do **not** prove PostgreSQL execution or live data invariants.
- Browser UI verified on READY Preview commit `b8a90a345a0f351b60d72061d84defd09756c6cc`, deployment `dpl_2r1TZtLKJdAgCWCUkubLV7mbaahd`. Subsequent proposal/provider-diagnostic/document changes do not alter the verified UI assets.
- Desktop actual app: one visible Store form, document/body width1348px with no overflow. White sneakers / Footwear / exact size10 / $120 / ascending price reaches loading then the actual empty result: "No verified public products meet these filters. Private development inventory is excluded." Change-search preserves those filters. Browser QA found and corrected the inherited min1/step5 budget constraint (now0.01), hidden Studio home-panel CSS, narrow mobile source selector and redundant same-guest auth clearing.
- Embedded actual app at390/430px frame widths: body width/scrollWidth375/375 and415/415 respectively (15px scrollbar), no horizontal overflow. Source selector is full width; Studio panel is visibly first. These are Chrome CSS viewport tests, not physical iPhone/Safari tests.
- Studio guest "Find catalog matches" opens the existing login screen. No credentials or OTPs entered, signup performed, model request, cart write or user-account change.
- Private fixture UI denies guest load with "Verified owner sign-in required for private fixtures." Server mock tests deny guest/customer/unverified UUID; owner-authorized fixture rendering is not live-tested because no owner session is available.
- Retailer-provider search was retained but its live Preview test failed: UI showed "We couldn't check the live catalog. You can still explore research sources." Zero cards returned. Vercel runtime evidence: Oct11 17:34:29.317UTC, GET `/api/shop`, `CATALOG_ALL_PROVIDERS_UNAVAILABLE`, deployment above, request `k8ltw-1791740068932-0669e1c7594b`. Do not describe retailer retrieval as working. Narrow Preview-only diagnostics now emit fixed upstream categories without request contents, secrets, URLs or rows; Diagnosis: HTTP422 `profile_malformed`, missing profile services; GitHub raw corrected JSON is rejected because it serves text/plain. Preview now uses Shopify’s documented public development profile for catalog reads only; Production retains its existing profile. One bounded direct upstream request returned HTTP200 and 10 products, including Monterey Bay Tie-Less - White at USD109.99, size10, available in the source snapshot. Application browser verification follows deployment. No checkout/cart/model call was made. The corrected MATCHLATCH catalog-only profile still needs approved public application/json hosting; Preview protection remains enabled.
- Some initial cloud-browser interactions immediately after reload did not advance until repeated after load. Settled navigation/search passed. Browser-extension metadata errors were observed; the cause of the initial interaction timing has not been established. Physical-device testing remains necessary.
- Screenshots: desktop Store, mobile390 Studio readiness and mobile430 Store source selector, saved as deliverables. No private account or payment information is included.

## Desktop/mobile matrix and remaining blockers

| Journey | Evidence planned / required |
|---|---|
| Desktop guest Store | Verified: one form, filter round trip, loading→catalog empty and retailer-provider error; no private cards |
|390/430px guest Store | Verified CSS layouts/no horizontal overflow; source selector refinement and screenshots |
|390px guest Studio | Verified visible Studio-first panel, truthful readiness and signed-out gate; no model invocation |
|Verified owner | Manual sign-in required to exercise private fictional cards/details; existing server authorization covered synthetically |
|Customer / account switch | API denial and stale-response clearing regression; manual live multi-account test pending |
|Real eligible product | Imagery, retailer destination, live stock, product saving/account isolation and actual filtering require qualified fresh inventory and authorized sign-in |

Merchant membership/advertiser permissions, feed/image usage rights, product-specific US shipping, current source freshness, accurate category/variant evidence and publication approval still block Watches Of USA shopper activation. None was fabricated or altered. No claims of live retailer inventory, working coupon redemption, guaranteed arrival or verified affiliate redemption are made.

Production baseline: deployment `dpl_35psQBq1wqGoi72B3A45GgKFGuZ3`, main `302fa9c3d83263ca25c3ed6252665fb73f06c569`. No main merge, Production deployment, DNS, environment provisioning, database change, refresh dispatch or billing action performed.

## Exact files changed in this sprint

| Files | Purpose |
| `ucp-agent.json` | Corrected catalog-only discovery profile schema; no Production change |
|---|---|
| `scripts/awin-bulk.mjs`, `scripts/awin-import.mjs`, `scripts/awin-feed-utils.mjs` | Approval gates, v2-only writes, bounded source requests, hash baseline, no legacy reconciliation |
| `.github/workflows/awin-preview-refresh.yml`, `scripts/README-AWIN-IMPORT.md` | Disabled write provisioning/recurrence,899/5min bounds, corrected operating instructions |
| `supabase/PROPOSED_feed_freshness_v2.sql`, `supabase/PROPOSED_feed_freshness_v2_ROLLBACK.sql` | Unexecuted migration/operational rollback proposals |
| `api/catalog.mjs`, `api/admin-summary.mjs`, `api/shop.mjs`, `lib/catalog-fixtures.mjs` | Honest readiness/deadline empty state, existing owner-gated fictional QA, safe provider diagnostics and Preview discovery profile / variant retailer URLs |
| `index.html`, `app-shell.js`, `app-shell.css`, `catalog-experience.js`, `catalog-experience.css`, `flow-pages.css` | Single Store search, Studio visibility/entry, filters/budgets, mobile/cards/account-switch behavior |
| `preview-responsive.html` | Unlinked actual-app responsive inspection frame; no protection bypass |
| `scripts/test-awin-import.mjs`, `scripts/test-catalog-reliability.mjs`, `scripts/test-refresh-safety.mjs`, `scripts/test-preview-ux.mjs` | Regression, safety, owner fixtures, old/new schema mapping and redacted diagnostics |
| `MATCHLATCH-CATALOG-SAFETY-UX.md` | Verification evidence, full proposal scope, recovery gates and remaining blockers |

Database objects actually changed: **none**. Proposed scope is listed above, not installed. No environment variable values were printed or provisioned. No cron/external scheduler, merchant approval, publication or shipping qualification was enabled. Real feed/image permissions, private qualified sample, full inventory/variant quality, owner-session saving and physical iOS testing remain outstanding.
