# WO-ML-012 — Awin affiliate commerce Preview

Recommendation: **NO-GO for live affiliate monetization release**. The implementation is isolated and tested, but Preview publisher credentials and merchant-specific promotional review remain outstanding. No Production release or main merge is authorized.

## Baseline and scope

Branch: `feature/v1.2-awin-commerce-20261013`, based on unified V1.2 commit `b4dd75db39dd1a5a02d12bafd9432e1ac2165720`. Shopify discovery/eligibility and existing BASALT owner diagnostics remain intact. Twelve deployable API source functions remain; no database or merchant records changed.

## Actual Awin account checks — October 13, 2026

The connected Awin plugin authenticated and confirmed MATCHLATCH publisher `3118944` with owner access. The joined-programmes request returned exactly four Active/US/USD programmes. Fresh programme-details responses reported Joined, online links and `deeplinkEnabled=true` for each:

| Advertiser | ID | Observed retailer domains |
| --- | --- | --- |
| Salted Avenue | 64928 | saltedavenue.com, explicit subdomain wildcard |
| Cosplay Shopper | 90655 | cosplayshopper.com, www and explicit wildcard; cosplayshopper.jp also returned |
| ZazzMode | 117849 | zazzmode.com, explicit wildcard, rd9wpk-6j.myshopify.com |
| Cacio Pepe (US) | 126793 | caciopepebrand.com, explicit wildcard, www.caciopepebrand.myshopify.com |

The pending-programmes response reported 41 entries; only the first 20 were inspected. Under Armour US, Suitsupply US, MESHKI US and W Concept US remain pending. Active advertiser status is not publisher membership approval. Pending programmes never qualify for monetization.

One official unshortened Salted Avenue homepage link was generated successfully through Awin's Link Builder. Returned advertiser/publisher/destination parameters matched. The link was **not opened**; no tracking click, conversion, payment or purchase was initiated. Actual product-specific deep-link preservation is fixture-tested, not live product-verified.

A US/UTC advertiser-performance request for October 1–13 succeeded but returned no rows. This is not proof that every click, order or commission is zero; it is the result for that report window, which includes a partial current day. No confidential transaction details or commission amounts are published here.

ZazzMode's current programme description says "no coupon sites." Its promotions are conservatively withheld until the owner confirms Savings Check is allowed. Joining is not proof of every promotional method, feed licence, shipping destination or AI-processing permission. Full advertiser agreements were not accepted or independently resolved in this task.

## Architecture

- `lib/awin-commerce.mjs`: fixed-host, server-only Bearer transport; five-minute joined-programme cache; explicit active US/USD membership listing plus fresh Joined/deeplink/domain validation before one official long-link request. No shortened links, guessed IDs, clickrefs, customer identifiers or follow-up tracking clicks.
- `POST /api/savings`: Preview-only, same-origin JSON, bounded body and per-runtime request limits, explicit retailer-handoff intent/affiliate choice. Hostile URLs, credentials, sensitive query parameters, obvious open-redirect parameters and checkout/cart/account destinations are rejected. Unavailable/unapproved merchants keep the ordinary retailer URL. No HTTP redirect occurs; no Shopify cart or checkout URL is modified.
- Returned tracking URLs must be official Awin HTTPS long links with matching publisher, advertiser and the exact canonical product destination. Unexpected hosts, duplicate/conflicting identifiers, changed products or unknown parameters fail closed.
- New affiliate handoff requires `MATCHLATCH_AWIN_HANDOFF_ENABLED=true` in Preview. It remains unset. The existing purchases-disabled usability beta also suppresses shopper outbound/affiliate actions. Do not remove that protection as a side effect of Awin setup.
- `GET /api/savings`: existing Savings Check enhanced for vouchers and non-code promotions. It excludes non-joined/offline/inactive partners, expired/missing/invalid dates, unknown region/audience, unsafe/unrelated landing pages and the documented no-coupon-site restriction. It preserves terms, expiry and public/publisher-exclusive/restricted labels. Code acceptance is never claimed. Expiry is rechecked when cached results are returned and rendered.
- `savings.js`: existing understated detail/copy UI, promotion labels and merchant offer links where beta policy permits; disclosure next to affiliate actions; explicit preparation followed by user-selected retailer continuation. Existing ordinary links remain available. Existing Awin feed records use their original merchant product destination as the ordinary fallback, rather than relying on a previously generated tracking link. Fresh affiliate preparation uses that merchant destination for either source and never wraps an Awin URL again. No affiliate navigation or generation on page load, and no affiliate first-party click/personal telemetry.
- `lib/commerce-intelligence.mjs`: corrected an existing defect that deducted a listed coupon without verified merchant checkout redemption. Promotions now leave subtotal, budget eligibility and total unchanged. Advertiser-supplied actual product sale prices remain distinct from coupon claims.
- `lib/merchant-offer-identity.mjs`: Preview deduplication only where the merchant product URL and original size/color/system/unit match. Marketing parameters are ignored for identity only; returned links and first-source evidence remain intact. Unknown variant identity stays separate. No commission-based sorting or blending of permissions/inventory from different providers.

## Private reporting and feeds

The existing verified-owner `GET /api/admin-summary` now supports manual `action=awin-report` and `action=awin-feed-status`. Guest/customer denial and Preview-only enforcement remain server-side. Command Center has discreet manual controls; no background Awin polling is added. Account changes/sign-out clear reporting output.

The report accepts an explicit past UTC range of at most 31 days and defaults to seven days. Merchant-level clicks, pending/confirmed/declined transaction counts and commissions preserve missing values as unknown. Currencies are not combined. Payable amounts and separately identified reversals remain unknown; approved is not paid. No individual transaction/customer records are retrieved or stored.

Feed status reads only bounded, credential-sanitized feed-list metadata for currently joined programmes. It does not download product feeds or publish products. Actual fresh feed access remains **unverified** because Work has no access to Vercel's secret values and no authenticated Preview owner session is available.

The existing `lib/awin-feed-normalize.mjs`, `lib/awin-public-catalog.mjs`, private import utilities, US-shipping/freshness/classification/publication gates and feed licences are preserved. No extra feed adapter, automatic import, Supabase write or new merchant products were introduced. Awin feed snapshots are not live inventory. Public feed qualification still requires reviewed permissions and reliable product/variant/US-shipping evidence; an empty public catalog remains an honest empty state.

## Preview setup blocker

Vercel metadata confirms `AWIN_API_TOKEN` and `AWIN_PUBLISHER_ID` are currently Production-only. The feed key exists in Preview. Production token values were not retrieved, copied, rotated or rescaled.

Owner must configure an appropriately authorized publisher `AWIN_API_TOKEN` directly in Vercel **Preview**, scoped to this branch. Do not paste it into chat or GitHub. `AWIN_PUBLISHER_ID=3118944` and the existing verified-owner identity have been configured for this Preview branch. No customer privileges changed. Only the publisher API token remains missing. A new Preview deployment is needed after the token is added.

After credentials and merchant method restrictions are reviewed, use the manual owner report/feed checks and one legitimate product-specific long-link preparation. Keep public handoffs disabled while beta purchases remain disabled. Provider success is not a conversion or proof of checkout attribution. Awin attribution through integrated Shopify checkout is unverified; this implementation only supports optional retailer handoff.

## Verification

- `node --test scripts/test-*.mjs`: **151 passed, 0 failed**, including thirteen new Awin security/normalization/identity tests and existing Shopify/shipping/account/Studio/Store regressions.
- `node scripts/audit.mjs`: passed.
- `node scripts/check-commerce-policy.mjs`: passed.
- 90 JavaScript files parsed successfully; diff whitespace checks passed.
- Live account/joined/pending/details/report calls and one official long-link generation were executed through the Awin plugin, independently of the Vercel runtime. No live offer redemption or product-feed download was executed.
- Preview runtime/browser results and deployment identifiers are recorded in the completion report; missing credentials must be reported as blocked, not mocked success.

Per-runtime caches, rate limits (conservative 20 provider calls/minute) and 429 cooldown do not coordinate across serverless instances. No automatic retries occur. Shared rate coordination and an appropriate snapshot design remain release/scaling decisions; no new paid service or database infrastructure was added.

## Official references

- https://help.awin.com/apidocs/get-program-information
- https://help.awin.com/apidocs/get-program-information-details-for-publisher
- https://help.awin.com/apidocs/generatelink
- https://help.awin.com/apidocs/promotions
- https://help.awin.com/apidocs/get-advertiser-performance-report
- https://help.awin.com/developers/docs/product-feed-list-download
- https://help.awin.com/apidocs/retail-publisher-productapidocumentation-1
- https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking


## Executed Preview verification

Application checkpoint `3589dc6a08ca57b75ed2fed6019623db1d9725cb` deployed **READY** at https://matchlatch-206atvob4-matchlatch.vercel.app with the latest branch-scoped owner/publisher configuration. A temporary deployment-only access link was used under the existing owner approval; it is not committed.

Actual deployed HTTP checks:

- Savings Check for saltedavenue.com: HTTP 200, `enabled=false`, `status=not_configured`, empty offers, `cache-control=no-store`. No fabricated promotions or credentials returned.
- Unauthenticated `action=awin-report`: HTTP 403, sanitized Forbidden.
- Unauthenticated `action=awin-feed-status`: HTTP 403, sanitized Forbidden.

Actual cloud Chromium checks:

- Studio form and five destinations rendered; guest Store navigation and reviewed Awin jeans/Bottoms search worked and returned an honest qualified-public-catalog empty state. No hidden private records or model recommendations appeared.
- Studio 390px and 430px same-origin frames had no horizontal overflow; two rendered logo images decoded. Light and dark visual states checked. A transient unstyled frame during reload/theme switching settled to the expected layout; physical iPhone Safari/touch behavior is unverified.
- Command Center showed its normal secure-owner login boundary. Dashboard and both new Awin controls were hidden to a guest.
- Live Savings Check code/offer rendering, signed-in owner Awin controls, affiliate product navigation, copied live codes, conversions and merchant checkout attribution remain **UNVERIFIED**. Credentials, qualifying public product data and an owner session were not bypassed to test them.

Follow-up changes retain ordinary merchant destinations for existing Awin records (including saved details), clear Awin output/button state on session changes, and register the integration-base PR quality check. They do not alter customer authentication, product data or Shopify checkout. The final deployment/check results are provided in the completion report.

[430px responsive regression screenshot](qa/wo-ml-012/matchlatch-awin-430px-20261013.jpg).
