# MATCHLATCH — evidence-based engineering improvement plan

Established by WO-ML-GOV-001, 2026-10-14. Priorities follow [issue #7](https://github.com/atravis817/matchlatch/issues/7) and existing work orders; this file supplies no new Production, financial or publication authorization. Preserve the V1–V4 roadmap and its unpassed gates.

| Priority / ID | Evidence-based problem | Authorized improvement / owner | Required proof | Current stop condition |
|---|---|---|---|---|
| P0 GOV-001 | Branch handoffs differ; shared governance edits now coordinated through hub | Governance owner: consolidate full protocol and reconcile preserved branch records | Reviewed docs-only PR, self-audit, original workspace unchanged | Main/other branch integration requires separate approval/coordination |
| P0 SYNC-SOURCE | 899 shared records are stale private Awin, not Shopify; Admin/read DB config absent | WO-ML-018A: complete authorized read-only Shopify identity/scopes/count audit | EXTERNAL_VERIFIED source and actual dry-run baseline | BLOCKED on protected Admin access and isolated database authorization |
| P0 SYNC-RUNTIME | Engine is tested but actual nightly execution unproven | WO-ML-018A: validate isolated DB transactions, protected invocation, midnight recurrence and failure alerts | INTEGRATION_VERIFIED live DB + STAGING_VERIFIED scheduled completion/day deduplication | No Production cron, fees or shared DB writes |
| P0 RIGHTS | No verified live Shopify source/supplier/channel/image/display/US-shipping approval | Review evidence and prepare source/product policy | EXTERNAL_VERIFIED evidence and explicit Founder publication decision | Keep records private; no automatic publication |
| P1 SEARCH-019 | Protected foundation exists; public discoverability/performance not proven | Search/Growth PR #8: schema/content/accessibility checks; preserve noindex | Scoped local/Preview proof; public performance remains a separate gate | No Production/indexing or overlapping sync/governance edits |
| P1 RUNTIME-TESTS | Temporary SQL test dependency was lost; current suite skips SQL | Reproduce pinned runtime per CI when validating application changes; disclose skips during docs-only sessions | Exact counts and checkpoint; never relabel a skipped suite passing | No new project/service dependency or fee |
| P1 ACCOUNT-COMMERCE | READY does not verify sign-in, cross-account isolation or checkout | Retain existing acceptance tests and coordinate safe authenticated tests | Authenticated account isolation, exact variant/destination and purchase-disabled runtime proof | No payments/orders; credentials stay in protected settings |

`HANDOFF.md` carries current checkpoints, migration state, risks and next action. Do not turn this table into a duplicate task system or claim untested items complete.
