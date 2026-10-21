# MATCHLATCH — bounded private first-import acceptance plan
2026-10-14 · PR #9 · PLANNING COMPLETE / EXECUTION NOT AUTHORIZED

## 1. Verified checkpoint and scope
Repository atravis817/matchlatch; branch feature/wo-ml-018a-nightly-shopify-sync; remote/application HEAD 0bbb15b5cf9eda238e3a25fc81de156d51177637. READY protected Preview https://matchlatch-icsvs2jq6-matchlatch.vercel.app/admin.html, deployment dpl_CrHoHXZe1hnaixQ4m1XEFzX1HdVh. Reverified metadata and CI run 38652936339 success. Local checkout HEAD 7b1540d45570a95350852bc0a1783434177933ed has preserved uncommitted later engineering files/HANDOFF plus two tests; upstream still tracks earlier discovery base. Do not reset/stash/force-push or treat local HEAD as deployed HEAD. Plan uses immutable remote source reads.

Source pfcdgt-is.myshopify.com; Admin 2026-10; exact read_products/read_inventory grant enforced by adapter. CTPO PR comment 6180637782 records Founder-returned owner check PASS: sample 5, hasMore=true. This is owner-observed external evidence, not a connector-run catalog audit or total count. Token exchange/identity/scope gate passed in that check. No new secret-bearing call made for planning.
Destination MATCHLATCH-SHOPIFY-PREVIEW, lqxeizvrdxuhzvipmlkl, ca-central-1, ACTIVE_HEALTHY; distinct from shared/customer-auth odxqxymwlwnbqginqems. Current direct read-only SQL reconfirms zero products/variants/jobs/state/seen/audit, zero public/approved records and zero unsafe tables (RLS enabled/client SELECT denied). Owner runtime DB status separately PASS. Migration 20261014225422 installed reviewed SQL blob a5af019bc8da9323a640f2bf3f54065b21d37634.
Current flags: Preview writes=false, publication=false, scheduler=false, Shopify-first=true. Both DB variable names exist on sync branch; no values read. No Awin activity. Historical 899 shared records remain private Awin, not Shopify.

## 2. Source rights and privacy gate
App installation/read scopes permit the observed API access; they do not establish supplier/image/display/model/checkout rights. Before private persistence, Founder must attest that the specific selected products and metadata/images may be stored privately for this evaluation. Store only existing normalized metadata/image URLs; no image downloads, customer/orders data or model calls. Public display, Studio recommendation, checkout and external-model permission remain unapproved. Do not manufacture an authorization policy. All test records must remain is_public=false, approval={}, checkout disabled; no publication RPC invocation.

## 3. Proposed limits versus current implementation
Recommended first acceptance: at most **5 complete products, 250 total variants**, one manual invocation, one complete product page, no automatic continuation. Record an explicit immutable product/variant manifest and source identity, without secrets/customer data, before executing. If a product pushes page totals over 250 variants, reject the whole page before catalog commit; do not truncate variants.
No date-wide/nightly run, no full catalog sweep. Use a dedicated acceptance run with full-catalog retirement/watermark completion disabled; do not present it as a successful full sync. Do not delete/retire products from unscanned source portions.

**Current code does not enforce those proposed limits.** Existing reader requests 5 products/page; variants are fully paginated up to 2,050/product. syncSlice defaults maxPages=10, budgetMs=45,000; route does not expose maxPages. Thus existing Run Sync Now may inspect up to 50 products / 102,500 variants in one invocation (10 pages × 5 × 2,050), subject to bounded provider responses and timeouts. Time budget is checked between pages, not a hard wall-clock deadline. Client parameters cannot enforce a smaller ceiling. Do not click existing Run Sync Now as a five-product test.
Required pre-execution development gate: reviewed server-enforced acceptance mode with exact destination/shop/manifest, 1-page/5-product/250-total-variant cap, one-use execution identity, no full-retirement/success-watermark, no resume beyond scope, normal owner authentication and write gate; tests prove limits before any product commit. This planning order does not silently implement those changes or authorize live writes. CTPO must review this gap before offering execution approval.

## 4. Writes and dry-run side effects
Current claim RPC inserts sync_state and jobs or resumes an unfinished job; uses advisory lock/worker UUID/five-minute lease. Each page commit writes sync_seen (product/variant markers), updates jobs counters/cursor/lease, and in write mode inserts/updates product observations/content. A failure/pause updates job status. Completion of full write runs may retire unseen products and advance successful watermark. Acceptance mode must prevent those global completion effects.
Current Dry-run is **not read-only**: it persists jobs/state/seen/checkpoints/counters/status, though products/approval and successful watermark are withheld. It can also resume an existing dry job. It therefore requires explicit separate write approval, and is not proposed as a shortcut. No dry run was executed for this plan.
For bounded write proposal: one new dedicated job, <=1 source state record, <=5 product markers plus <=250 variant markers, <=250 private variant rows, one final paused/acceptance-complete job record; publication audit unchanged. Exact acceptance schema/state representation must be reviewed in implementation. Private rows may contain excluded categories; eligibility is reported honestly, not forced to pass.

## 5. Preflight immediately before any approved test
- Re-read hub/PR/handbook; freeze exact acceptance-capable commit/deployment and manifest; prove READY protected Preview, preview runtime and isolated project ref.
- Repeat owner Shopify check and classify shop/API/scopes; verify private storage authorization for manifest. Do not expand scopes.
- Read counts and enumerate jobs/cursors/leases; require empty catalog and no active/failed/paused jobs for first test. If changed, stop; never silently resume another job.
- Inspect applied migration/version, RLS/grants, no public approvals and correct one-use/cap behavior; verify no scheduler job/flag, publication false, Production closed.
- Capture read-only baseline counts, normalized manifest/source hashes, UTC timestamp and database schema/permission snapshot; no credential/token values.
- Founder separately authorizes acceptance-only write gate; scheduler/publication remain false. Secure variable edit/redeploy, if required, must be explicitly included in approval. Read-only preflight fails closed on any mismatch or key/scope/rights ambiguity.

## 6. Duplicate prevention, concurrency and retirement
Stable identity is shop+variant_id (DB primary key), never title; product IDs preserved. Material/content hashes distinguish unchanged/changed products. Advisory claim lock serializes shop claims; worker fencing and expected-cursor check prevent stale commits; pages+checkpoint update atomically. Dry/write modes cannot silently cross-resume. Daily unique(shop,day,dry_run) protects scheduled starts, but **manual random UUID day does not deduplicate button clicks by itself**. Existing active-job lock limits concurrency; sequential manual reruns create separate jobs while product upserts deduplicate rows.
Acceptance must additionally persist/enforce one-use execution ID/manifest and max cumulative rows across retries; no relying on a UI disabled button. A separately approved duplicate/replay test should return the same acceptance job or explicit refusal and create no extra variants.
Current per-product retirement requires complete variant pagination; full-catalog retirement requires completed scan. Acceptance forbids global retirement and successful watermark advancement; first database is empty, so expected retired count=0. No incomplete page commit, truncated variant retirement, or title-based cross-source deduplication.

## 7. Abort, interruption and recovery
Stop on wrong environment/source/destination/manifest, provider schema/version mismatch, unexpected public row, any scope/rights/cap violation, active unrelated job, unexpected counters or rejected checkpoint. No blind HTTP/database mutation retry. Ambiguous response: read durable job/cursor/worker/seen and rows first; never repeat a mutation on speculation.
Page transaction failure must leave catalog and cursor unchanged; failure bookkeeping may remain. Preserve job/error category and evidence. A bounded resume must retain manifest/cumulative cap and require explicit approval; existing general Resume button is not automatically authorized.
Disable acceptance writes after test and keep scheduler/publication disabled. Preserve rows/ledger/audit for review; no automatic DELETE/DROP/reset/cancel/lease edits. Cleanup or reversal requires a concrete separate approval with exact rows/run; this plan authorizes no rollback DML. Empty baseline is documented; no provider PITR/backup entitlement assumed.

## 8. Post-run validation (after execution approval only)
- Owner status + direct read-only SQL: source products<=5, variants<=250, rows match exact manifest; all private, approval empty, public/approved=0; no publication audit; retired=0.
- Read job, counters, cursor, seen markers, run identity/cumulative scope; confirm no full-sync success/watermark/last_full_run claimed; no other jobs/data changed.
- Query duplicates grouped by shop/variant identity; require none. Compare returned product/variant identities, currency/prices/inventory/options/normalization/hash against manifest; report warnings/missing categories/rights rather than inventing eligibility.
- RLS/client read grants still denied, service-role read working; private candidates excluded from Store/Studio; external-model and checkout capabilities unchanged. Verify permission metadata and negative owner access; no real purchase.
- Safe replay/concurrency/failure tests remain ephemeral unless separately approved against Preview. Do not mutate source stock/prices just to exercise tests.
- Record exact UTC, SHA/deployment/project, owner-observed versus direct SQL evidence, PASS/FAIL per assertion, accepted/withheld counts, warnings and remaining gates. Partial test is no full catalog baseline or nightly recurrence.
- Recheck write flag disabled; scheduling/publication false; no recurring run registered.

## 9. Coverage and completion gates
Historical current code: 231 isolated tests pass with pinned PGlite 0.5.9; static audit/policy pass; CI success reverified. Coverage includes pagination/idempotency, checkpoint rollback/recovery, stale worker fencing, private grants, material approval revocation, DST, auth renewal/scope/sanitization, read-only owner control. No fresh repetition needed for a documentation-only plan.
Missing before five-product execution: server acceptance cap+manifest/one-use/cumulative retry tests; guarantee no full-retirement/watermark; actual bounded private import and post-readback. Planned acceptance is not implemented functionality.

## 10. Founder decisions and exact approval requirements
Decision now: approve the proposed 5-product/250-variant private evaluation scope and authorize *development/testing only* of the missing server limits, or choose the broader existing behavior explicitly. Recommended approval wording:
“I approve implementing and testing the bounded acceptance controls described in the first-import plan on PR #9 only. No live import, dry run, flags, migrations, or Production changes are authorized.”

After implementation/test/CTPO review, a separate execution request must replace EVERY bracket with concrete reviewed evidence:
“I authorize ONE private acceptance invocation for shop pfcdgt-is.myshopify.com into lqxeizvrdxuhzvipmlkl, at commit [exact acceptance SHA] / deployment [exact Preview ID], for manifest [exact immutable manifest], maximum 5 products/250 variants/one page, execution ID [exact ID]. I confirm private persistence rights for those records. I authorize only [exact acceptance write-gate configuration change and immediate disable], private catalog+bounded ledger writes and subsequent read-only validation. No automatic resume, dry run, full-catalog retirement or success-watermark, publication/model processing, scheduling, purchases, Production, merges, Awin or new costs.”
Unresolved placeholders are a stop condition, not blanket approval. Dry-run authorization, if desired, must separately name persistent ledger effects and exact cap. Public/checkout/scheduler approvals are independent.
No execution request is ripe until missing server controls exist; do not ask Founder to approve an unenforced bound.

## 11. Deliverable and next milestone
Planning complete; operational execution blocked by missing small-run enforcement/private persistence decision, not access credentials. Next milestone: CTPO reviews the scope/control gap and Founder chooses development-only approval. All existing flags remain off. No import/dry run or configuration/DB mutation performed.
