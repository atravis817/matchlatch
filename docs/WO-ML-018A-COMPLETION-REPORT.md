# MATCHLATCH — WO-ML-018A Completion Report

2026-10-14. **Engineering implementation prepared; live automation blocked.**

## Outcome

The work order was reviewed and implemented on an isolated development branch.
The Shopify synchronization engine, durable transaction protocol, owner controls,
publication safeguards and Store/Studio source integration passed local and CI
checks. The protected Preview is READY. No Production action, live catalog import,
private inventory publication, webhook registration or recurring schedule was
activated.

## Verified source baseline

The shared Supabase database has 899 Awin variants from advertiser 116479,
Watches Of USA (`watchesofusa.com`). All 899 are private; 898 are advertised in
stock; all validity windows are stale. There are no duplicate source variants,
missing IDs, images or destinations. Existing labels: watch 847, shirt 52.
The shirt labels need later review. No Awin records were changed.

Shopify's configured/code-targeted store is `pfcdgt-is.myshopify.com`;
actual Admin identity and catalog count remain unverified. The connected-store
tool returned `Authentication required`. Preview environment metadata confirms
Storefront credentials are configured, but an Admin read credential and separate
sync database settings are absent. Storefront access cannot substitute for the
Admin incremental-import access required here.

## Evidence levels

| Capability | Status | Evidence / limit |
|---|---|---|
| Shared 899-record baseline | Externally verified | Read-only Supabase aggregate and provenance queries |
| Shopify product/variant discovery | Fixture-verified | Bounded paginated reader; no live Admin read |
| Incremental overlap queries | Fixture-verified | Five-minute lower-bound overlap and fixed cutoff |
| Full inventory/removal reconciliation | Isolated PostgreSQL-verified | Completion-gated retirement; retained identities |
| Stable identity / duplicate suppression | Isolated PostgreSQL-verified | Shop + variant key; daily run ledger |
| Atomic checkpoints / watermarks | Isolated PostgreSQL-verified | Failed transaction rollback and recovery tests |
| Concurrency / expired worker fencing | Isolated PostgreSQL-verified | Lease handover rejects old worker |
| Publication approval / denial / revocation | Isolated PostgreSQL-verified | Evidence and hash checks; material change revocation |
| Private/public isolation | Isolated PostgreSQL-verified | Anonymous/authenticated table and RPC permissions denied |
| Store / Studio retrieval | Fixture-verified | Shared bounded normalized candidate contract; private rows excluded |
| Owned clothing | Fixture-verified | User-recorded items cost zero new spend; unknown sizes retained |
| Awin freeze | Preview-verified | Deployed Shopify-first response reports Awin disabled; importer guards present |
| Eastern midnight / DST | Fixture-verified | Summer/winter hours and spring/fall next-midnight cases |
| Durable recurring scheduler | Prepared, blocked | Disabled isolated SQL proposal; no actual scheduled tick |
| Optional webhooks | Preparation only | HMAC/duplicate/out-of-order tests; no live registration/endpoint |
| Protected deployment | Preview-verified | READY build, existing deployment protection retained |
| Owner authorization | Preview-verified, negative path | Unauthenticated sync status returned 403 |
| Live Shopify search | Blocked | Deployed search returns 503/unavailable because isolated source configuration is absent |
| External-model processing | Preview-verified disabled | Capability response reports aiReady/aiProcessing false |
| Browser rendering / signed-in owner journey | Blocked | Local browser binary download failed; no authenticated owner session used |
| Checkout | Preserved, no live transaction | Existing regression suite passes; no orders/payments attempted |

## Validation

- Local full suite: **220 tests passed, 0 failed, 0 skipped**, including the
  pinned ephemeral PostgreSQL integration runtime.
- 112 JavaScript files parsed successfully.
- Static audit and permanent commerce-policy check passed.
- GitHub quality run [38583670744](https://github.com/atravis817/matchlatch/actions/runs/38583670744)
  completed successfully on code commit `458192bb096b654fd75c42abd4ca57cd1cc3761e`.
  Its SQL-runtime installation and complete isolated suite steps passed.
- Protected deployed checks on the same commit: admin HTML 200; unauthenticated
  sync status 403; unconfigured Shopify search 503 with Awin disabled;
  Studio capabilities 200 with catalogAvailable false and AI processing false.
- Shopify query schema execution is not externally verified. The connector
  validator reported validation skipped; authenticated schema/query access was
  blocked, and the skill's binary schema assets could not be read in this runtime.

The first builds hit the Hobby function limit. Consolidating synchronization
behind the existing owner API restored a 12-function READY deployment without a
plan upgrade. No paid service was added.

## Reviewable deliverables

- Branch: `feature/wo-ml-018a-nightly-shopify-sync`.
- [Draft PR #9](https://github.com/atravis817/matchlatch/pull/9), targeting the
  active unified-discovery branch, not main.
- [Protected READY Preview](https://matchlatch-nkgaop749-matchlatch.vercel.app).
- [Command Center](https://matchlatch-nkgaop749-matchlatch.vercel.app/admin.html).
- Tested code commit: `458192bb096b654fd75c42abd4ca57cd1cc3761e`.
- Detailed implementation/configuration/rollback:
  `docs/WO-ML-018A-NIGHTLY-SHOPIFY-SYNC.md`.
- Durable database and disabled scheduler proposals:
  `supabase/PROPOSED_shopify_sync.sql`,
  `supabase/PROPOSED_shopify_preview_scheduler.sql`.
- Current handoff: `HANDOFF.md`.

This report is a documentation-only follow-up to the tested code commit.
It does not convert isolated tests into live source or scheduler verification.

## Remaining prerequisites and next milestone

1. Reconnect/authenticate Shopify and provision a least-privilege Admin read
   credential for protected Preview. Confirm store identity, API schema/scopes,
   inventory behavior and actual count with a read-only live query.
2. Authorize/provision a separate Preview database and its credentials. Confirm
   plan/cost before creating services. Apply and validate the proposed schema
   there, including live PostgREST behavior and security advisors.
3. Run a complete Shopify dry-run baseline, inspect duplicates/category/variant
   coverage, then authorize isolated writes for a controlled test.
4. Verify supplier linkage, channel identity/publication, display/image rights,
   US shipping and source/product policy scope. Imports remain private until
   the relevant policy and individual/batch publication action are approved.
5. Configure the isolated non-Production scheduler with protected authentication;
   observe a genuine midnight tick, successful completion and same-day duplicate
   suppression. Test failure reporting, recovery, throughput and DST separately.
6. Complete authenticated browser, Store, Studio and source-specific checkout
   revalidation before preparing a Production activation request.

**Next milestone:** a real, reconciled Shopify baseline in isolated Preview,
followed by one observed automated nightly run. Production approval is premature
until those checks and publication evidence are complete.

Operational cost remains unestimated: actual catalog size, database plan and
execution timing have not been verified. This implementation introduced no
queue service, fee commitment, production schedule or live publication.
