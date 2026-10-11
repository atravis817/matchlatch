# MATCHLATCH Command Center metrics

Implemented only on `design/v1.2-studio-first-100926`. Production, DNS, database schema, RLS, authentication settings and spending limits are unchanged.

## Owner workflow

Sign in using the normal MATCHLATCH account screen on the same Preview origin; return to `/admin.html`. No password prompt is used by this dashboard. Server checks Preview environment, a current non-anonymous Supabase session, email verification and the configured owner UUID before collecting or serving cached metrics. Display names confer no privileges.

The Domo-inspired interface offers Overview, Catalog, Accounts, Saved Looks & Records, AI & Spending, and Feed Operations. Choose cards or tables, inspect card definitions, compare rolling 1/7/30/90-day periods, inspect daily data, refresh and export the current view as CSV/JSON or print/PDF.

## Sources and definitions

| Section | Authoritative source | Period behavior and limitations |
| --- | --- | --- |
| Catalog | `public.matchlatch_awin_products` | Current records, private/public status, advertised availability, freshness, size and HTTPS image URL coverage. No historical catalog total or retailer-live stock claim. Eligibility flags do not verify advertiser authorization or an exact-size shopping offer. |
| Accounts | Supabase Auth admin users API, server only | Registrations and email confirmations compared with the preceding equal period. Latest sign-in counts accounts, not events, DAU or MAU. Current verification rate is not a historical funnel conversion rate. |
| Saved data | `public.matchlatch_records`, excluding deleted rows | Current rows, look-kind rows and contributing accounts. Latest updates are not original creation timestamps or save-event counts. No payloads returned. |
| AI | `public.matchlatch_ai_usage` | Requests, outcomes, tokens, searches and application-metered cost estimates. Zero-request rates are unknown. Monthly budget held sums max(reservation, estimate) for each request under the existing shared $5 cap/$3 alert. Provider billing is not reconciled. |
| Feed operations | `public.matchlatch_awin_import_runs` | Run counts and operation totals in the selected period; latest ten runs across all time. Inserted/updated operations are not distinct current products. Raw error text is excluded. |

Rolling windows are UTC and use inclusive start/exclusive end. Daily charts include partial boundary days. Percent changes from a zero prior baseline remain undefined; rate differences use percentage points. Current snapshot metrics have no invented previous total.

Visitors, page views, DAU/MAU, funnel conversion, cart abandonment, sales, revenue, AOV, commission, retention, churn, LTV, acquisition cost, uptime and historical catalog growth remain explicitly unavailable until validated data integrations exist.

## Bounded read-only reporting

Each source paginates 500 rows per request, at most 5,000 rows. A capped source is marked unavailable rather than returning a partial total. Responses are bounded to 2 MiB/page and share a 14-second deadline. Failures degrade individual sections without substituting false zeros. The UI automatically refreshes every minute while visible, with a pause checkbox; it stops fetching after logout or when the page is hidden. Server aggregate cache lasts 45 seconds; fresh authentication precedes every cache response. The endpoint retains its existing 30-request/minute runtime limiter, which is not a distributed traffic quota.

Exports use the owner-authorized aggregate snapshot and include source scope, reporting dates, timestamp and unavailable metrics. CSV quotes fields and guards leading formula characters in untrusted text. JSON includes only the selected section or all sections for Overview. Exports contain no emails, user IDs, saved payloads, credential values or raw import errors. Printed output includes the current displayed view and limitations.

## Verification evidence — 2026-10-11

- Syntax scan and static audit passed. Audit assertion updated to reflect the existing account-specific ZIP key and its clearing behavior; application shipping code unchanged.
- All ten new dashboard tests passed: boundaries/rates, account history and privacy, catalog freshness, saved-data privacy, cost reservations, import redaction, pagination, row/byte caps, export safety and actual endpoint authorization/cache behavior.
- Existing public catalog, delivery, Awin importer, grounded styling, commerce policy and commerce regression checks passed.
- Actual endpoint source tested with mocked Supabase responses: Production 404; guest/non-owner/unverified-owner/auth failure 403; verified owner 200; cached aggregate still requires fresh valid authentication. These are automated boundary tests, not live non-owner account tests.
- Read-only Vercel Preview diagnostic `dpl_7UU2gXA4hrhPjc8uHzAeuerK2Dcu` ran the same collector with existing securely configured Preview credentials. No credentials copied to source, logs or public output. All five sources returned `ok` in 398 ms at `2026-10-11T16:05:40.644Z`.
- Live results: 899 catalog records, all private, zero public; 898 advertised available (99.8888%); 899 stock snapshots within 24h; zero price snapshots within 1h; size coverage 0%; HTTPS image URL coverage 100%. These are feed-data measures, not retailer verification.
- Live accounts: 4 registered, 3 email verified (75%), 4 non-anonymous; 4 registrations and 3 confirmations in the last seven days versus zero in the preceding period.
- Live saved data: 1 nondeleted record, 0 look-kind records, 1 contributing account.
- Live AI: 0 requests; metered estimated cost and monthly held budget $0; $5 remaining. This does not assert a provider invoice balance.
- Live imports: 3 runs in the last seven days, all succeeded. No importer run or AI call was triggered for this dashboard verification.

The owner previously confirmed access to the earlier dashboard. Interactive authenticated testing of this revised UI and a live separate non-owner account test remain to be performed using authorized account sessions. Do not create or bypass security credentials for testing.
