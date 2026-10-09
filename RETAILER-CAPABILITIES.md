# MATCHLATCH retailer availability and AI search — POC-03

**Status:** Implemented in unreleased code. No current production/staging deployment of POC-03. A real provider response is still needed before naming any retailer as confirmed to work with MATCHLATCH.

## Supported provider today

- **Shopify Global Catalog UCP MCP**: structured discovery across Shopify merchants whose **specific products** are eligible for inclusion. It uses MATCHLATCH's public UCP agent profile at /ucp-agent.json. It is not a general-purpose website crawler. Catalog availability does not prove a special retailer partnership.
- **No direct crawling**, HTML scraping, private inventory feeds, or checkout impersonation.
- **Retailer names discovered only through live offers** appear on the public Store results page; this is not a catalog-wide merchant list. Retailers outside this catalog are **not integrated** merely because they have websites or sell clothing.
- Shopify's global catalog does not provide MATCHLATCH with a verified complete directory of all merchants. The only retailers the app can accurately display are merchants actually returned in **a live query**. These names can change by search, catalog eligibility, shipping destination, variant availability and retailer policies.
- MATCHLATCH dynamically builds "Retailers in these results" from returned seller IDs, seller domains and names; the capability endpoint reports **no catalog-wide retailer directory**. The response never fabricates merchants or claims coverage by a famous brand.
- Merchant/storefront-specific Shopify UCP catalog integrations are a **future adapter**; they cannot be used until we verify a specific retailer's live Storefront Catalog endpoint and terms. Partner product feeds, direct APIs and contracted affiliate catalogs can follow. No partner is labeled live before its integration works.

## Provider capability matrix

| Property | Currently accessible | Reality/check |
| --- | --- | --- |
| Discoverable products | Search eligible Shopify Global Catalog listings | Limited to actual returned offers, not all Shopify shops or all internet retailers |
| Brand and merchant | Seller name, shop ID, shop domain where publisher returns them | Observed in returned product offers; no inferred partner list |
| Category/style | Structured AI piece slot and search query; supported categories = hat/scarf/jacket/shirt/watch/belt/pants/socks/shoes | AI suggestion is intent; catalog listing is evidence; no verified visual-exact-match claims |
| Sizing | Exact size label from variant options; filtering with Size attribute | Sizes aren't automatically converted between systems or retailers; absent size data means cannot confirm exact fit |
| Color | Exact color label from variant options; optional Color attribute filter | Broad palettes are search inspiration only; named exact colors can filter eligible variants |
| Price | Live reported USD variant price in integer minor units | Shown price excludes tax, shipping; can change; verify before checkout |
| Stock | Variant availability.available and optional running_low/status | Point-in-time availability, no reserved cart stock, no inventory count unless separately provided |
| Shipping destination | Shopify ships_to country US; region or postal when explicitly supplied | Country/area *eligibility signal*, not shipping rate, address-level guarantee or delivery ETA |
| Shipping cost | **Not accessible** from Global Catalog search | null / not provided until merchant checkout data |
| Delivery date | **Not accessible** from Global Catalog search | null / not provided until merchant checkout data |
| Returns policies | Seller links may include published policies | Only show when present and validated as HTTPS |
| Checkout link | Actual merchant variant.checkout_url when published | Otherwise product-page fallback; no invented cart link |
| Native checkout | eligible.native_checkout may be reported | This is eligibility metadata, not an integrated payment session |
| Multi-merchant checkout | **Not integrated** | Separate merchant checkouts until genuine supported sessions exist |

### Backend search contract
- GET /api/shop?mode=capabilities — documentary provider capability flags, not a real-time enumeration.
- GET /api/shop?mode=search&slot=shirt&q=olive+shirt&max=80&size=M&color=Olive — live current offers, and retailerCoverage scoped **to those offers only**.
- GET /api/shop?mode=verify&id=...&variant=...&max=... — recheck same selection using Shopify get_product before handoff.
- Optional region=GA or postal=30004 (US addresses only) can narrow catalog eligibility. Do **not** collect or persist precise addresses for search unless the shopper voluntarily specifies them.
- All responses use cache-control: no-store. Catalog calls have timeouts and their errors are surfaced rather than silently replaced by fabricated listings.
- Current AI server keys and private beta access are configured as *metadata* for the **production** environment. Their values, model billing and successful end-to-end analysis were not inspected or verified. Preview environment may require separate configuration.

## How the engine chooses products
1. OpenAI photo analysis (or Guided Styling) produces a clothing category **slot**, explicit suggested garment **color**, description and **searchQuery** for each matching piece.
2. The MatchlatchRetailerMatch engine combines each piece with stated size, fit/style hints and remaining merchandise budget. Only explicit exact colors are treated as hard variants; aesthetic labels are not.
3. Outfit Tree queries Shopify via /api/shop. Server filters available/new listings, US destination eligibility, integer-minor-unit USD price within maximum, exact selected size, and exact normalized color when explicitly requested.
4. Valid returned variants are ranked against AI search terms; prices, sizes and colors cannot be silently relaxed. If the AI query yields no verified results, at most one broader text search is attempted **with the same hard limits**.
5. Results display the actual seller, variant price, optional color/size, and "available when checked" caveat. Store lists observed merchants in an unobtrusive disclosure.
6. Shopper explicitly adds to the one persistent cart. Checkout rechecks variant price/availability and prefers the real retailer-issued checkout permalink when available. Otherwise it labels the product-page fallback.

## What "available to crawl" means here

**Available to query via structured provider:** only eligible Shopify Global Catalog offers returned by live requests. **Available for crawling with our own bots:** none configured or authorized. **Confirmed merchant names in our environment:** not yet enumerated by a successful end-to-end live search. Do not present a list of specific retailer brands until the live integration returns them and permissions are confirmed.

## Pilot acceptance tests before any public claim

- Production AI GET /api/analyze shows "ready"; successfully analyze a photo with the authorized private beta flow; never print or store API keys.
- Query three real wardrobe searches in /api/shop; record the *observed* seller names, seller IDs/domains, actual price, variant size, color, checkout URL presence and availability signals. No successful live searches have been evidenced yet.
- Verify an item within exact size/color/US shipping/budget. Ensure sold-out, missing color, wrong size, non-USD, missing HTTPS retailer URL are rejected.
- Confirm limited inventory warning only if the provider reports running_low.
- Confirm shipping rates/taxes are labeled unknown, and actual address-specific shipping is finalized by merchant.
- Complete one real iPhone Safari flow from photo capture to AI outfit suggestions, verified retailer products, saved cart and merchant checkout.
- Measure quality: 10 users, 8/10 unassisted checkout destinations, 7/10 products worth considering, and at least one genuinely verified purchase with consent.

Sources: https://shopify.dev/docs/agents/catalog/global-catalog ; https://shopify.dev/docs/agents/catalog/global-catalog-extension ; https://help.shopify.com/en/manual/shopify-catalog/requirements

### Release discipline
POC-03 builds on POC-02 camera and POC-01 checkout. Keep in an unreleased commit object; don't advance main or staging and don't deploy to Vercel without the user's approval.
