# MATCHLATCH Awin product ingestion — operational runbook

**Status (2026-10-11):** shared-database migration and refresh remain NO-GO. Only synthetic tests are authorized now. No recurring job, publication or refresh executed in the safety/UX sprint. See `MATCHLATCH-CATALOG-SAFETY-UX.md` for the current protocol and remaining execution gates. Historical commands below are reference, not execution approval.

## Dependencies and secrets

- Node.js 20 or newer, in a trusted server/CI environment.
- `AWIN_PRODUCT_FEED_API_KEY` — Awin product-feed key, already stored as a **sensitive** Vercel project variable for Preview and Production. A complete HTTPS Awin feed URL is also accepted: the key is extracted in memory, never logged or saved separately.
- `MATCHLATCH_SUPABASE_URL` — project URL, already configured in Vercel.
- `SUPABASE_SERVICE_ROLE_KEY` — configured in **Preview only**, verified 2026-10-10. Required only for explicit --write mode. Must be server-only, never used from the browser, committed to Git, or printed in logs. Prefer a restricted ingestion role over broad service-role access in a later revision.

## Stage 1: feed discovery

```sh
node scripts/awin-feed-discovery.mjs
```

Awin feed-list docs: https://help.awin.com/developers/docs/product-feed-list-download
The feed list includes membership status, last imported timestamp, and a download URL with the feed key embedded. Never log complete feed URLs.

## Stage 2: dry run

```sh
node scripts/awin-import.mjs
```

Dry-run fetches feed data but **does not write**. Default sample cap: 25 accepted variants; hard ceiling: 899. Invalid bounds are rejected. Initial Preview runs use `AWIN_IMPORT_LIMIT=25`.
The default script limits advertisers to the two joined programmes confirmed on 2026-10-10: 117849 and 126793.
Explicit non-Joined feed membership is excluded. Missing membership does not expand the approved advertiser list. Zero eligible feeds, zero valid products, or any eligible-feed download failure produces a nonzero exit and prevents writes. A successful discovery request alone does not mean a product import succeeded.

Discovery reports raw CSV header names, HTTP status, safe feed metadata and freshness timestamps. Import validation reports rejected-field counts, duplicate counts, stock and size mapping, and selected private rows. Download URLs are never printed. Downloads stop after 25 MB of response bytes and decompression is bounded to 75 MB.

Run diagnostics independently of the website build, in a trusted server job with Preview environment variables injected. Do not add ingestion to the storefront build command or deploy the application just to run diagnostics. The verification jobs on 2026-10-10 used separate protected Vercel Preview build jobs containing only these scripts and a neutral output page.

### Contract tests

```sh
node --test scripts/test-awin-import.mjs
node scripts/test-awin-integration.mjs
```

These use synthetic fixtures and mocked requests. They validate parsing, download bounds, credential redaction, attribution, duplicate handling, write limits and private flags; they do not prove real product-feed access or database insertion.

## Stage 3: private import

```sh
AWIN_IMPORT_LIMIT=25 node scripts/awin-import.mjs --write
```

Run only after a real dry run finds validated products. Requires server-only database write credentials. Writes fail closed without Preview, `MATCHLATCH_CATALOG_WRITES_APPROVED=true`, and `MATCHLATCH_FEED_FRESHNESS_V2=true`, plus separately approved and installed v2 SQL. Only advertiser 116479/feed 102556 is supported for private writes. New products set `is_public=false` and `shipping_us_eligible=false`; existing qualification flags are preserved, and existing public rows are rejected. Partial and full bounded imports never reconcile omitted records or modify partner records. The v2 importer reports inserted, updated, initialized and unchanged counters; these remain unverified until isolated SQL testing and an approved live run. Query the database before and after to establish the actual inserted count.

### Accessible feeds for private development

The user authorized accessible pre-membership feeds on 2026-10-10. Awin's feed-list documentation explicitly includes advertisers allowing promotion before joining. This is separate from public retailer activation.

```sh
AWIN_IMPORT_LIMIT=25 node scripts/awin-import.mjs --accessible-test-feeds
# Only after checking a successful real dry run:
AWIN_IMPORT_LIMIT=25 node scripts/awin-import.mjs --accessible-test-feeds --write
node scripts/awin-verify-private.mjs
```

This mode requires `VERCEL_ENV=preview` and the exact advertiser/feed pair in `scripts/awin-test-sources.mjs`: Watches Of USA (116479), feed 102556, merchant domain watchesofusa.com. It rejects feeds older than 48 hours. Currency, merchant destination, publisher attribution and product validation remain mandatory. The current importer does not insert or update partner records; the reviewed partner must already exist. Products remain private and US shipping remains unverified. Public retailer candidates are unchanged. The verification script checks 25 stored rows, affiliate attribution, anonymous invisibility (using `MATCHLATCH_SUPABASE_PUBLISHABLE_KEY`) and three image responses.

Historical prerequisite (do not execute during this sprint): `supabase/awin_host_validation_fix.sql` was used to repair the double-escaped hostname checks found in the live database. This changes no RLS, privileges or publication triggers.

### Release gate

Before any product is published, confirm authorized retailer relationship, feed licensing, accurate category/variant mapping, valid Awin tracking links, image usage rights, in-stock availability, USD pricing, US shipping eligibility, and freshness. Only then enable `is_public` for specifically approved records.

### Known limitations / next engineering tasks

- Response downloads are bounded while streaming, but CSV parsing still loads the bounded feed in memory; large retailer catalogs need segmented parsing.
- Each category is heuristic; verify on real data.
- GZIP decompression limit is 75 MB. Large feeds need segmented streaming.
- Import does not yet have scheduled execution, rate limits, retry scheduling or stateful stale-product sweeps.
- Real feed-list discovery was verified on 2026-10-10: 570 feeds, including 133 US feeds, all Not Joined. Neither 117849 nor 126793 supplied a listed feed. Watches Of USA's accessible feed returned HTTP 200 and 899 USD watch products, with current stock flags and today's update timestamp. Size fields are absent; do not invent sizes.
- Publisher identity cannot be established from this legacy feed-list response; verify the credential belongs to publisher 3118944 in Awin. The importer checks affiliate links against that publisher ID.
- Legacy CSV only. Enhanced/Google JSONL feeds require a separate authenticated API integration; their availability was not inferred from legacy feed-list absence.
- No guarantee that approved Awin relationships provide a downloadable product feed.
- Production storefront remains unchanged.
