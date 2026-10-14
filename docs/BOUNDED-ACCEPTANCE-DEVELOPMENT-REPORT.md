# Bounded acceptance safeguards — development completion
2026-10-14 · Founder authorization PR comment 6180804125; CTPO review 6180800031.

## Outcome / checkpoint
IMPLEMENTED + LOCAL/EPHEMERAL VERIFIED. No Preview deployment or live execution.
Assigned local branch feature/wo-ml-018a-nightly-shopify-sync; local HEAD d75cd5f84a34b1b15d2a21c76df9ddf3d7c18e63.
Remote PR #9 remains d9a212ef80b079f27c72ddaa708df978e6d97060. Advancing that connected branch automatically deploys Preview; authorization explicitly withholds deployment. Source is published as an immutable Git commit object based on remote HEAD, linked in PR report, without moving branch/ref. This does not modify Production or create a new workstream.
Previously dirty HANDOFF/admin UI/store and two test files preserved. Governance worktree unchanged. New handoff/report are in review commit; remote HANDOFF remains unchanged until approved branch advancement.

## Files and enforcement
- lib/shopify-acceptance.mjs: exact branch/Preview/shop/destination/build-host/SHA/expiry/private-rights evidence guard, fixed <=5 product/<=250 variant manifest, one-use UUID, one product-page read, exact full variant identity reconciliation; whole page rejected before catalog commit.
- lib/shopify-sync.mjs: optional acceptance-only ID-filtered first product page with cumulative variant cap while paginating complete variants; general discovery/sync behavior preserved.
- lib/shopify-sync-route.mjs: dedicated POST shopify-sync-acceptance under existing Preview, same-origin, owner auth, rate limits. Empty body only; no caller-chosen manifest/destination/limits. No UI execution button. Broad Preview writes must remain false.
- supabase/PROPOSED_shopify_acceptance.sql: proposal only, blob d4767511881e687d1ce4e26f8571de91c7e107ae; creates one RLS-protected singleton ledger and one restricted security-invoker RPC on the separately approved isolated destination. NOT INSTALLED.
- scripts/test-shopify-acceptance.mjs: server gate/cap/partial-provider tests and ephemeral SQL replay/concurrency/failure/privacy tests.

Server-only future settings: MATCHLATCH_SHOPIFY_ACCEPTANCE_ENABLED (default absent/closed), MATCHLATCH_SHOPIFY_ACCEPTANCE_APPROVAL (reviewed JSON executionId/project/shop/commit/host/expiry/evidenceRef/privatePersistenceAuthorized/products with exact variantIds). No values set now. Uses Vercel system environment branch/SHA/URL to bind approval. Exact immutable host, 24-hour maximum approval life; all general writes/publication/schedule flags must explicitly equal false.
App normalizes the manifest and derives manifestHash. Database stores and compares entire immutable manifest including hash, worker and lease on commit; no client-mutable limits. Hash is a binding label, not a cryptographic signature of Founder rights. Protected server configuration supplies authorization; no automatic rights inference.
Existing DB adapter guards still apply. No service key, Shopify secret, raw provider body or customer content in the report/errors.

## One-use and failure design
Claim reserves singleton ledger once under same shop advisory transaction lock; every later claim, including a new execution UUID, fails. Exactly one winner under concurrent first claims. Source error, overflow, timeout or ambiguous response leaves the slot consumed/claimed for explicit review; no automatic retry, continuation, cross-run resume or background scheduler.
Commit checks same immutable manifest, same worker, five-minute lease, exact empty baseline, full identity coverage/unique variants, cap and private rows. All rows validated before insert; transaction rolls back all inserted rows on any later cast/constraint failure. Successful commit inserts only private variants and marks acceptance ledger accepted. No existing product overwrite/upsert, deletion, retirement, approval/publication audit write, normal jobs/state/seen write, watermark or full-sync success.
Existing public/private/baseline data or normal sync bookkeeping cause refusal. General sync cannot be enabled through this acceptance gate. A concurrent independent privileged process changing baseline causes commit refusal. No claim that the mechanism prevents a database administrator from altering its data.
Separate scheduler cannot resume this ledger: it is not a normal job. No scheduled invocation path accepts acceptance action.

## Verification
Command: MATCHLATCH_PGLITE_MODULE=/tmp/matchlatch-sql-018d/node_modules/@electric-sql/pglite/dist/index.js node --test scripts/test-*.mjs
**241 passed, 0 failed, 0 skipped**; PGlite pinned 0.5.9.
Static audit, reviewed commerce policy and git diff --check passed.
New tests include <=5/250 boundary success, >caps, wrong shop/destination/branch/build, missing rights/expiry, source pagination overflow/partial/mismatched page, duplicate submission/new-ID replay, simultaneous first claims, stale worker, changed manifest/baseline, expired lease, injected public row, invalid row cast rollback, provider failure consumed ledger, no anon/customer grants, private defaults/no retirement/state/watermark, owner and Production gate denial.
An initial test cleanup attempted DELETE as service_role and was correctly denied; test-only cleanup changed to ephemeral administrator. Final full suite passed. No live cleanup or privilege change performed.
No new remote CI or Preview success is claimed because the remote branch was deliberately not advanced. Existing deployed access evidence remains historical owner-observed PASS on prior code.

## Remaining risks / NO-GO
- Proposed acceptance SQL not installed; live route must fail until separately approved migration exists.
- Exact live product/variant manifest and source-specific private-persistence permission are not supplied. No live source query/import under development-only authorization.
- No new live Preview end-to-end evidence, real data replay/recovery or cost/throughput measurements. Test coverage proves local/ephemeral assertions only.
- A claimed/failed slot requires separate reviewed recovery; cannot retry by rotating execution ID. No automatic ledger clearing/DELETE.
- Existing general Run Sync Now and Dry-run are not acceptance controls. Dry-run writes normal ledger; neither is authorized.
- All flags/credentials unchanged; public/model/checkout rights and midnight recurrence unapproved. Awin frozen.

## Separate approvals required, in order
1. CTPO review of immutable source revision. Founder explicitly permits advancing PR #9 to that revision and its automatic protected Preview deployment. No deployment authorized by present development approval.
2. Exact-destination migration request for ONLY PROPOSED_shopify_acceptance.sql blob d4767511881e687d1ce4e26f8571de91c7e107ae on lqxeizvrdxuhzvipmlkl, after read-only baseline and recovery review. Existing installed sync SQL unchanged. No migration authorized now.
3. After deployment and read-only checks, Founder approves exact private source manifest, persistence evidence, execution UUID, expiry, commit and immutable host; separately authorizes only acceptance-enable/approval settings (and later disable), keeping general writes/publication/schedule false.
4. Separate ONE execution approval: dedicated owner POST /api/admin-summary?action=shopify-sync-acceptance with {}, <=5 complete products/<=250 cumulative variants/one product page, one-use ledger plus private inserts, no automatic resume; read-only postchecks and immediate acceptance disable. Populate all actual IDs before approval, no blanket placeholders.
5. Any failure recovery, cleanup, broader import, dry-run, publication, scheduling, Production, merge, payments or spending needs its own concrete permission.
No requests for credentials/session tokens. Next milestone: CTPO code review, then deployment/migration approval packets; do not execute until separately approved.
