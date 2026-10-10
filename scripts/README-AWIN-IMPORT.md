# MATCHLATCH Awin product ingestion — operational runbook

**Status:** V1.2 development only. No public publication or automated run configured.

## Dependencies and secrets

- Node.js 20 or newer, in a trusted server/CI environment.
- `AWIN_PRODUCT_FEED_API_KEY` — Awin product-feed key, already stored as a **sensitive** Vercel project variable for Preview and Production.
- `MATCHLATCH_SUPABASE_URL` — project URL, already configured in Vercel.
- `SUPABASE_SERVICE_ROLE_KEY` — **not configured as of 2026-10-10**. Required only for explicit --write mode. Must be server-only, never used from the browser, committed to Git, or printed in logs. Prefer a restricted ingestion role over broad service-role access in a later revision.

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

Dry-run fetches feed data but **does not write**. Default cap: 200 accepted variants; max configurable cap: 1000.
The script currently limits advertisers to the two joined publishers confirmed on 2026-10-10: 117849 and 126793.

## Stage 3: private import

```sh
node scripts/awin-import.mjs --write
```

Requires server-only database write credentials. New and updated products set `is_public = false` and `shipping_us_eligible = false`; neither public-facing release nor affiliate checkout is implied by a successful import.

### Release gate

Before any product is published, confirm authorized retailer relationship, feed licensing, accurate category/variant mapping, valid Awin tracking links, image usage rights, in-stock availability, USD pricing, US shipping eligibility, and freshness. Only then enable `is_public` for specifically approved records.

### Known limitations / next engineering tasks

- CSV parser currently loads the entire feed in memory; use bounded streaming for large retailer catalogs.
- Each category is heuristic; verify on real data.
- GZIP decompression limit is 75 MB. Large feeds need segmented streaming.
- Import does not yet have scheduled execution, rate limits, retry scheduling or stateful stale-product sweeps.
- Feed list columns and retailer coverage need to be verified on a real authorized run.
- No guarantee that approved Awin relationships provide a downloadable product feed.
- Production storefront remains unchanged.
