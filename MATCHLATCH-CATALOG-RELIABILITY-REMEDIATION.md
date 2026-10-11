# MATCHLATCH V1.2 catalog reliability remediation

Branch: `design/v1.2-studio-first-100926`. Review checkpoint: 2026-10-11.
This report separates shipped application corrections from proposals awaiting approval.

## Authoritative database findings

Read-only Supabase inspection confirms 899 products; 898 available; zero public;
zero US-shipping eligible. No products, accounts, RLS policies or database objects
were changed in this sprint. No feed write or paid model test was performed.

**Correction to the earlier audit:** the currently installed
`matchlatch_internal.catalog_maintenance()` retains AI usage for **90 days**, not
seven. The earlier bootstrap SQL definition was reconciled to 90 days in the repository
to prevent accidental regression when it is reused; no live function was replaced. The installed
monthly reservation calculation and 90-day retention preserve a complete current
month. No missing historical usage is reconstructed. Current usage table: zero
records. Provider billing and provider project budgets are not verified by these
application-side records.

Cron inspection shows one hourly maintenance job, `37 * * * *`, and no feed-refresh
job. Maintenance does not download product feeds.

## Corrections and before/after behavior

| Area | Before | After | Verification |
|---|---|---|---|
| Styling | An empty catalog still reserved budget and called the intent model | Authenticated retrieval and hard filters precede reservation/model; empty result returns grounded guidance and `aiSkipped=no_eligible_catalog` | Mocked HTTP tests, including photo input and filtered-out products; zero reservation/model calls |
| Covered styling | Intent extraction, catalog lookup and product ranking | Preflight coverage, intent extraction, constrained re-retrieval and ranking; quota/meter remain enforced | Covered fixture retains two model calls and completed metering |
| Source expiry | Private snapshot receipt could give a 36-hour expiry independent of source age | Private test-feed expiry bounded by the earlier of check time/source timestamp plus 24 hours | Repeat-check test proves unchanged old source cannot renew expiry |
| Source checks | No distinct successful-download timestamp in validation report | Reports `source_checked_at`, source revision, expiry and `retailer_independently_verified=false` | Synthetic download/mapping tests |
| Content identity | Source revision was part of the sole row hash | Separate content hash excludes source revision/check timestamps; original source hash remains compatible | Price/stock changes alter content identity; timestamp-only checks do not |
| Category mapping | `tee` matched `steel`; `Top` watch names matched shirts | Whole-word categories; watch takes precedence | Both observed failure titles tested; stored 52 misclassified rows remain untouched |
| Automatic writes | Importer-file pushes triggered shared DB imports | No push trigger; manual input defaults to dry-run, explicit write input needed | Workflow contract test |
| Refresh endpoint | Authenticated request immediately wrote | Auth checked, writes paused unless explicitly enabled; overlapping same-runtime job gets 409 | Auth/Preview/pause/overlap tests |
| Feed traffic | Wrapper could repeat dry-run before write | Each wrapper invocation downloads once; importer validates snapshot before writing; duplicate feed entries eliminated; at most 10 feeds | Importer contracts; bounds are code limits, not live traffic measurements |
| Monthly accounting | Earlier audit reported seven-day purge | Live definition verified at 90 days; no replacement needed | Authoritative read-only function inspection |

This product-recommendation endpoint does not implement general chat. Existing
non-shopping/legacy guided interactions were not rerouted or disabled. Image
validation, consent, sign-in, private staff authorization and rate limits remain
before model invocation.

## Exact files changed

- `api/style.mjs`: eligible-catalog preflight and explicit AI-skip result.
- `api/catalog-refresh.mjs`: approval gate and same-runtime overlap guard.
- `lib/feed-freshness.mjs`: conservative feed evidence/expiry helper.
- `scripts/awin-import.mjs`: source-check diagnostics, expiry, classification,
  feed deduplication and request bound.
- `scripts/awin-bulk.mjs`: distinct content identity and opt-in v2 RPC path.
- `scripts/refresh-preview.mjs`: remove redundant discovery/download pass.
- `.github/workflows/awin-preview-refresh.yml`: remove push writes; manual dry-run default.
- `scripts/test-catalog-styling.mjs`, `scripts/test-catalog-reliability.mjs`,
  `scripts/test-awin-import.mjs`: regression/behavior tests.
- `scripts/test-web-discovery.mjs`: update stale fixture to current Preview environment/key.
- `supabase/catalog_private_refresh.sql`: bootstrap retention reconciled to the installed 90-day policy; not executed.
- `supabase/PROPOSED_feed_freshness_v2.sql`: unapplied, review-only migration.
- This report: remediation evidence, private test plan and UX matrix.

## Shared-database approval checkpoint

`supabase/PROPOSED_feed_freshness_v2.sql` is **not applied**. It proposes exactly:

1. Three nullable columns on `public.matchlatch_awin_products`:
   `source_checked_at`, `content_hash`, `content_changed_at`.
2. New service-role-only `public.matchlatch_awin_batch_v2(uuid,integer,jsonb)`.
   It preserves private/US-ineligible flags, import leases, checkpoint receipts and
   existing RLS. Every checked row receives source-check evidence even if contents
   are unchanged. `content_changed_at` changes only when known content changes;
   existing rows' unknown historical change times remain null.
3. Snapshot expiry cannot extend beyond source/check time plus 24 hours. Regressive
   source/check timestamps are rejected. The original batch function stays intact.

Only after migration review/application should the Preview runtime opt into
`MATCHLATCH_FEED_FRESHNESS_V2=true`. It is currently **unset/unconfigured** by this
sprint. Schema, function integration and transactional behavior have not been
executed against PostgreSQL; they require isolated database validation before
shared application. Applying the proposal and running even a private refresh would
change the shared Preview/Production database and therefore require owner approval.
No migration runner, deployment or workflow automatically applies this SQL.

The existing database lease prevents concurrent writes per advertiser after feed
validation. Endpoint runtime guards and GitHub concurrency are narrower protections;
they are **not** a cross-instance, pre-download lease. Before recurring activation,
add/test a distributed acquisition/cooldown before downloads, bounded heartbeat/
expiry, idempotent run IDs and protected failure receipts. This is another shared
DB design requiring review, not an implemented security guarantee.

## Recurring refresh decision

Current account previously encountered the Vercel Hobby 12-function limit. This
sprint adds zero functions. Project/team metadata was accessible but did not expose
current billing limits. No subscription or quota was changed.

- Vercel Cron is Production-only, and Hobby allows daily invocation with loose
  timing. It cannot meet Preview-only restrictions here.
- GitHub schedules run from the default branch. A scheduled workflow on this
  development branch would not activate. Manual dispatch may also require the
  workflow to exist on the default branch; availability has not been tested.
- Existing Supabase Cron is installed, with one active maintenance job. Configuring
  another job affects the shared DB; protected Preview worker access remains a
  blocker. No bypass token or project-wide bypass was enabled.

Proposed isolated option: a separate private operations repository on the existing
GitHub account, with its own default-branch schedule and protected secrets, checking
out only the approved MATCHLATCH development ref. Suggested conservative starting
cadence: every six hours (120 runs/30-day month). A 10-minute maximum would imply
up to 1,200 Linux runner minutes/month; actual account free quota, spend cap, secrets
permissions and current consumption must be checked before activation. This is an
external scheduling integration and requires separate approval. No operations repo
was created. No recurring job is active. Do not claim freshness reliability until
successful and failed scheduled runs are observed.

Use job summaries/protected import receipts and existing Actions failure
notifications. No new notification vendor or paid service. Recipient configuration
and actual alert delivery remain untested.

## Expected cost/freshness effects

For an empty eligible catalog: **zero model calls and zero budget reservations**;
100 or 1,000 such requests incur $0 OpenAI model usage. Catalog/auth reads still
consume ordinary backend resources. This avoids the previous one unnecessary
intent call per empty request. Actual live paid request savings are not measured.
Covered requests still use up to two calls; existing application cap is $5/month,
alert $3, with persistent request limits. Fixtures validate token metering; fixture
costs are not provider invoices or real-world estimates.

Conservative 24-hour source expiry may increase empty states when an advertiser
publishes slowly. A successful repeat download cannot independently confirm price
or live stock or make old source data fresh. No source-check field is exposed as a
retailer verification claim. Public qualification remains blocked independently
of successful downloads.

## Owner-only private testing preparation

Command Center ownership is a server-verified Supabase UUID, not email. It does not
currently imply catalog staff access. Do not grant blanket staff permissions.

Proposed test route: reuse an existing server endpoint, require existing verified
owner authorization, Preview environment and an explicit server-side allowlist of
reviewed advertiser/variant IDs. Query only those IDs server-side. Never accept a
client-provided role or use an anonymous service-key query. Return no private records
in public search, caches, exports or unrelated customer responses. Use no-store
responses; fail closed on absent allowlist/logout/account switch. This approach is
prepared, **not enabled**, and must pass owner/non-owner/guest tests before use.
No owner role or allowlist environment variable was changed.

Watches Of USA sample qualification still needs current Awin membership/advertiser
permission, permitted product-data use, product-specific US destination evidence,
actual retailer price/stock checks, image retrieval/rights and affiliate destination
integrity. Generic shipping-policy language cannot qualify all products. Sizes and
variants must remain unknown where absent; watches cannot supply a full clothing
outfit. Products remain private and US-ineligible.

## Functional and UX test matrix (prepared, live tests pending)

| Journey | Desktop owner | Mobile owner | Customer | Guest | Required result |
|---|---|---|---|---|---|
| Public Browse | Pending | Pending | Pending | Guest empty state previously seen | No private records |
| Selected private sample | Blocked allowlist | Blocked allowlist | Must deny | Must deny | Only reviewed IDs to verified owner |
| Studio empty shopping request | Automated mock pass | Live pending | Live pending | Automated 401 | No model/quota on empty catalog |
| Size/budget/category/exclusions | Automated contracts | Live pending | Live pending | Read-only public path | Unknown size never satisfies request |
| Product image/card/detail | Pending qualified sample | Pending | Pending | Public-only | Actual image fetch, stable detail identity |
| Affiliate handoff | Pending evidence | Pending | Pending | Public-only | Correct publisher/merchant, safe destination; no purchase |
| Save/reload/delete | Pending signed-in tests | Pending | Pending | Deny | Own records only; account-switch separation |
| Command Center | Auth tests pass; signed-in pending | Pending | Automated deny | Automated deny | Metrics never leak |
| Network/error/expired item | Automated partial coverage | Pending | Pending | Pending | Honest empty/stale/failure states |

Store currently has two search surfaces: `#catalog-browse` in
`catalog-experience.js` calling `/api/catalog`, and `#store-body` in the app shell
calling `/api/shop`. Proposed consolidation: Studio remains the primary intent
entry; one Browse results/filter surface shares catalog retrieval, selection and
saved-item identity. Remove the duplicate entry only after qualified product and
saving journeys pass. No HTML/CSS redesign was performed.

## Verification and release status

Automated tests and syntax checks run locally with synthetic credentials and
responses; they do not prove merchant approval, paid AI quality, actual imagery,
stock or affiliate credit. Review-only SQL is unexecuted. Browser signed-in owner/
private sample tests require authorization/setup and a real authenticated session.
Production deployment before changes: `dpl_35psQBq1wqGoi72B3A45GgKFGuZ3`, main
`302fa9c3d83263ca25c3ed6252665fb73f06c569`. Preview deployment outcome is reported
with the final response after the branch commit is verified.
