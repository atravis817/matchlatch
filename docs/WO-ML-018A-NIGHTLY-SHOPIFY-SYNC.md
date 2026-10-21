# WO-ML-018A — Shopify nightly synchronization

Status: implementation and isolated verification; **live provider/scheduling validation blocked**. Production activation is not authorized by this work order.

## Review findings and corrected baseline

Read-only Supabase audit on 2026-10-14 verified the following against project `odxqxymwlwnbqginqems`:

| Measure | Verified result |
|---|---:|
| Existing catalog variants | 899 |
| Public / private | 0 / 899 |
| Advertised in stock | 898 |
| Source | Awin |
| Advertiser / merchant | 116479 / Watches Of USA |
| Merchant host | watchesofusa.com |
| Duplicate advertiser + variant identities | 0 |
| Missing variant IDs / images / destinations | 0 / 0 / 0 |
| Expired validity windows | 899 |
| Current legacy categories | watch: 847; shirt: 52 |

The 899 records are **not a Shopify baseline**. They must not be relabeled, reimported, published or deduplicated against Shopify by title. The 52 shirt labels require a later source-specific taxonomy review; this workstream makes no Awin data changes. Advertised inventory is not verified sellable inventory. No Shopify product count, supplier linkage or publication coverage is established by this audit.

Existing code targets `pfcdgt-is.myshopify.com`, API version `2026-10`. That identity is code/configuration evidence, not a newly verified Admin connection. Shopify connected-store inspection returned `Authentication required`. Vercel environment metadata showed a Preview Storefront token/version/domain, but no Admin read token or isolated sync database settings. No token values were printed, no Production secrets were read, and no Production secrets were copied.

## Gaps addressed

1. The existing SQL catalog is Awin-specific, with advertiser IDs, affiliate destinations and source-specific constraints. Shopify therefore has separate source storage, reusing the existing taxonomy, normalized search contract, owner gate and styling engine. No second taxonomy or parallel outfit UI was created.
2. Incremental product timestamps alone do not establish complete nightly inventory/deletion coverage. The engine supports incremental overlap queries, while the proposed nightly job performs a full, ID-ordered inventory sweep. Content hashes prevent rewriting unchanged product content; observation timestamps refresh separately. Larger catalogs require measured throughput before adopting inventory webhooks/bulk operations.
3. Vercel Production cron cannot be used to claim Preview recurrence. An isolated Supabase pg_cron/pg_net/Vault scheduler proposal starts on midnight Eastern and continues paused runs. Nothing schedules Production, merges main, or registers a recurring job in this implementation.
4. Publication is separate from ingestion. New records remain private. Owner review is bounded and rejects expired, mismatched, missing or out-of-scope evidence. No blanket source publication policy is enabled.
5. Store and Studio share approved Shopify source snapshots. Third-party model processing is disabled, regardless of whether the client asks for AI. Checkout remains gated and requires separate live verification.

## Implementation map

| File | Responsibility |
|---|---|
| `lib/shopify-sync.mjs` | Read-only Admin queries, bounded product/variant pagination, normalization, hashes, eligibility, incremental overlap, Eastern calendar, orchestration |
| `lib/shopify-sync-store.mjs` | Isolated Preview database RPC transport; never falls back to the shared/live database |
| `supabase/PROPOSED_shopify_sync.sql` | Source tables, unique shop/variant identities, durable jobs, daily deduplication, fencing leases, atomic page/checkpoint transactions, watermarks, retirement, publication audit |
| `lib/shopify-sync-route.mjs` through `api/admin-summary.mjs` | Owner-only status/review/dry run/manual execution; separately authenticated scheduled POST; Production returns 404 |
| `admin-shopify-sync.mjs`, `admin.html` | Status, counts, manual run/resume, review pages, candidate preview, batch approval and revocation |
| `lib/shopify-internal-catalog.mjs` | Bounded approved inventory queries; taxonomy subtypes, sizes, brand/color, price, permission/freshness gates |
| `api/catalog.mjs`, `api/style.mjs`, `lib/unified-discovery-route.mjs` | Shopify-first Store and Studio integration; deterministic candidates; no Shopify candidate model call |
| `app-shell.js` | Load more approved Store products; blank browse remains a bounded catalog page |
| `lib/shopify-webhook-signal.mjs` | Optional HMAC validation/deduplication preparation; no registration or live webhook endpoint |
| `supabase/PROPOSED_shopify_preview_scheduler.sql` | Disabled-by-default isolated Preview scheduling proposal |

No `HANDOFF.md` existed on the implementation base. The new handoff records this scope and unresolved dependencies. Base branch: `feature/wo-ml-017-unified-discovery`, commit `815e3ca`; main is behind the active V1.2 work. The draft PR targets that base to avoid mixing previous releases into this change.

## Transaction and recovery protocol

`claim` serializes per shop under a transaction advisory lock. A worker receives a UUID fencing token and a five-minute lease. A second live worker receives `busy`; an expired/paused/failed run resumes with a new token. Dry-run invocations cannot silently resume a write job. Each complete product page commits variants, missing-variant retirement, counters and the cursor together. A late worker or stale cursor cannot commit. Database mutations are not blindly retried; ambiguous failures resume from durable state on a later invocation.

Product variants are fully paginated before a product can be reconciled. The bound supports up to 2,050 variants per product; exceeding it fails the page rather than treating a truncated result as complete. Product pages contain at most five products; each invocation is limited by page count and an execution budget. Partial failure never advances the successful watermark or retires unseen products from an incomplete full scan. Full-scan product retirement happens only at completion. Saved references are retained because rows are retired rather than deleted.

Price/stock updates preserve material approval evidence but are rechecked against current eligibility. Changes to title, supplier/vendor claim, source/product/variant identity, source type/status, image, destination or options invalidate publication. Publication evidence must name a reviewed vendor, explicit product ID scope, supplier identity, channel identity, shipping authorization, image/display rights and expiry. Vendor is a source claim and never automatically becomes verified supplier identity. Admin aggregate quantity is a snapshot, not US channel sellable stock; untracked inventory/backorder policy is withheld. Live channel/supplier/shipping verification remains a release dependency.

Rows older than 26 hours are withheld. Freshness is based on observation time, never product update time alone. No prices or quantities are guaranteed at checkout. Existing native checkout controls are preserved. Previously saved Shopify records still need source-specific live revalidation before actual checkout; this work does not authorize transactions.

## Preview configuration, not Production activation

| Setting | Required state / meaning |
|---|---|
| `MATCHLATCH_SHOPIFY_FIRST_PHASE` | `true` for this Preview branch; freezes Awin imports/writes and routes Store/Studio to approved Shopify inventory |
| `MATCHLATCH_ADMIN_USER_ID` | Same verified owner identifier as the source Preview branch; not a secret credential |
| `SHOPIFY_STORE_DOMAIN` | `pfcdgt-is.myshopify.com` |
| `SHOPIFY_ADMIN_API_VERSION` | `2026-10` |
| `SHOPIFY_ADMIN_READ_TOKEN` | New least-privilege Preview-scoped Admin read credential; never substitute the Storefront token |
| `MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL` | A separate authorized Preview database; the shared project is explicitly refused |
| `MATCHLATCH_SHOPIFY_PREVIEW_SERVICE_KEY` | Separate Preview database server credential |
| `MATCHLATCH_SHOPIFY_PREVIEW_WRITES_ENABLED` | `false` until isolated configuration verified |
| `MATCHLATCH_SHOPIFY_PREVIEW_SCHEDULE_ENABLED` | `false` until the non-Production scheduler is configured and authorized |
| `MATCHLATCH_SHOPIFY_SYNC_SECRET` | At least 32 random characters; schedule-only authentication |
| `MATCHLATCH_SHOPIFY_PUBLICATION_ENABLED` | `false` pending separately approved policy/evidence |
| `MATCHLATCH_SHOPIFY_PUBLICATION_POLICY` | Server-managed evidence with source/product scope; never supplied by shoppers |

Admin read scopes must cover the actual selected product and inventory fields. Validate the queries against the exact 2026-10 schema and read-only app scopes before a live run. Shopify's connector schema/operation tools were authentication-blocked; its compatibility validator reported validation skipped. The skill validator was attempted but its binary schema assets were inaccessible through the skill reader. Query syntax/provider-shaped responses are fixture-tested; external Shopify schema execution is **not claimed**.

Provisioning another database, applying SQL to a live project or adding fees is not silently authorized. Proposed SQL was applied only to ephemeral PostgreSQL, not Supabase. Configure credentials directly in the provider's protected settings; never paste them into an issue, chat, PR or committed file.

## Scheduler preparation and separate proof gate

The scheduler proposal installs no job. Its configuration defaults disabled. After confirming a separate Preview project and available pg_cron, pg_net and Vault, a DBA can apply the proposal, set the protected Preview endpoint and populate Vault with independently provisioned schedule and Vercel-protection credentials. A cron tick each minute checks `America/New_York` inside PostgreSQL, calls the handler during local hour zero, and continues incomplete write runs afterward. The durable local-day ledger prevents duplicate daily starts. The first tick at or shortly after midnight is a schedule target, not a precision guarantee.

Keep deployment protection enabled. Scheduled requests need both the job Bearer secret and a scoped Vercel protection bypass credential. Do not use a shareable tester URL as scheduler authentication. The scheduled endpoint is `/api/admin-summary?action=shopify-sync-scheduled`; owner status/review/run actions use `shopify-sync-status`, `shopify-sync-review` and `shopify-sync-run`. The endpoint uses the same engine as Run Sync Now. The production handler is intentionally absent/closed; deploying this branch to Production would **not** activate synchronization. A later approved change must define Production authorization, database isolation, schedule configuration and rollback.

Required non-Production scheduling proof: observe at least one real scheduled tick → protected handler → durable run → successful final checkpoint. Confirm another tick for the same Eastern date returns the same successful job. Test spring/fall clock boundaries separately. A manual test is not proof of autonomous operation. No real nightly tick has been observed in this work.

## Verification and remaining acceptance work

Existing tests and new fixture/SQL tests run with `node --test scripts/test-*.mjs`. SQL tests require the pinned ephemeral runtime `@electric-sql/pglite@0.5.9`; CI installs it in runner temporary storage and sets `MATCHLATCH_PGLITE_MODULE`. Without that setting, SQL integration explicitly skips and must not be counted as verified. The audit, permanent commerce-policy check and JavaScript parsing are also required.

Verified in isolated fixtures/PostgreSQL: new imports, updates, full pagination, no-change runs, price/stock changes, additions/removals, recovery, failed-page rollback, dry runs, daily deduplication, worker fencing, identity separation from 899 Awin variants, expired/missing approval rejection, public/private separation, source scope, and deterministic Store/Studio candidate projections. DST calendar boundaries are fixture-verified.

Blocked live acceptance: Admin authentication/source count; full Shopify reconciliation; supplier/channel/display/image/US shipping evidence; separate Preview database provisioning; live PostgREST query behavior and advisors; scheduled recurrence; authenticated owner end-to-end browser tests; live inventory/search coverage and checkout revalidation. A READY static deployment is not evidence these services work. Operational fees cannot be estimated credibly until project plan, catalog size and runtime measurements are available; no paid service was added.

## Rollback and production checklist

Stop the Preview scheduler/configuration and set writes/publication flags false. Remove the Preview cron job if it was separately installed. Preserve source rows, jobs and publication history. Expire active leases only in the isolated Preview DB after recording their run IDs. Retry/resume from the last committed cursor; invalid/expired Shopify cursors require owner-reviewed run cancellation/rebaseline rather than arbitrary deletion. Do not apply a destructive SQL rollback to the shared database. Revert the branch-specific phase flag or redeploy the earlier protected Preview to return to previous search behavior; Awin relationships/data remain intact.

Before requesting Production approval: verify live source identity/scopes, reconcile Shopify counts, validate schema and APIs, complete protected Preview recurrence and browser tests, document suppliers/channel/image/shipping rights, choose an explicitly approved publication policy, measure throughput/costs, verify alerts, and prepare exact Production configuration plus rollback. Then obtain Founder approval for merge/deployment/scheduling/publication as separate concrete actions.

Recommended next milestone: provision authorized isolated Preview access and execute a complete Shopify dry-run baseline, then verify one actual scheduled night before proposing Production activation.

## Official references

- https://shopify.dev/docs/api/admin-graphql/2026-10/queries/products
- https://shopify.dev/docs/api/admin-graphql/2026-10/objects/ProductVariant
- https://shopify.dev/docs/api/admin-graphql/2026-10/enums/ProductSortKeys
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/extensions/pg_net
- https://vercel.com/docs/cron-jobs


The first Preview build exceeded the Hobby 12-function limit. The sync route was consolidated behind the existing owner API; no paid-plan change was made.
