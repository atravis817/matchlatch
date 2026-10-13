# MATCHLATCH POC-04 — Personal Curation First, Savings Second

**Stage:** Unreleased research and application constraints. **Priority:** Shopper fit and taste always outrank advertisements, affiliate revenue, and discounts.

## Product covenant

1. **Shopper-set criteria are the source of truth** at the start of every AI photo search, Guided Styling outfit lookup, Mood-to-Store search, and manual Store search. The shopper's stated size, color, garment category, fit, preferred aesthetics, occasion, notes, exclusions, palette, season, and price ceiling guide all candidate selection.
2. **Hard filters:** In-stock/eligible retailer listing, real HTTPS seller page, listed USD price inside remaining budget, requested category, exact retailer-reported size and exact requested garment color when provided, and known explicit material exclusions. Do not infer unsupported sizing conversions, colors, price reductions, fit certifications or stock.
3. **Curated relevance:** A listing must have category evidence and evidence for specific style words from the request. The app does not pad an outfit with unrelated discounted products. If none qualify, display a constructive empty state and allow refinements. Additional AI image matching can be added later, but must use the same hard gates.
4. **Secondary savings:** Only **after** curation, use a genuine, sufficiently fresh retailer-published sale to break an EXACT relevance-score tie between qualified garments. Voucher codes are *not verified item discounts* and never influence rank or displayed product cost. Affiliate commissions, sponsor status, EPC, conversion and advertiser payments **never influence the shopper-facing order**.
5. **User-first presentation:** Garment first, title/price/size second, one primary Add to cart control, optional Savings Check only for the selected item. No discount-first rail, paid-placement badge presented as style, coupon spam, or intrusive setup form.

### Shopper example

User: Olive Oxford shirt; size M; tailored fit; minimalist/work look; budget $100; no leather/polyester.

- $75 compatible Oxford cotton shirt: qualify, ranked first on specific style evidence.
- $60 comparably suitable shirt with a fresh retailer-published markdown: can win a **tie** in curated relevance.
- $18 marked-down graphic T-shirt: rejected if it lacks Oxford/style evidence, irrespective of discount.
- $8 leather "Oxford": rejected by explicit note, no matter the percentage saved.
- Listing without M or with black instead of explicitly selected olive: rejected.
- Out-of-stock listing, missing retailer URL, unsupported currency or budget overage: rejected.

## What Awin offers MATCHLATCH

| Feature | Provider access | How we will use it | Reality constraint |
| --- | --- | --- | --- |
| Joined programme directory | Awin Publisher API GET /publishers/{publisherId}/programmes?relationship=joined | Verify real advertiser IDs, domains and status | Active partner != product-feed access |
| Legacy feed index | https://productdata.awin.com/datafeed/list/apikey/{product-feed-key} | Download a CSV manifest including feed IDs, joined status, mapped fields and last-import time | **Different credential** from Awin Bearer API token; verify accessibility; feed may be visible pre-join without commission permission |
| Enhanced Google-format product feed | GET /publishers/{publisherId}/awinfeeds/download/{advertiserId}-retail-en_US.jsonl | Potential structured fashion-product enrichment where advertiser feed and permission exist | Uses regular Bearer token, **not universal**; strict advertised rate at most 5/min, no concurrent requests to same feed |
| Fashion product attributes | Product name, description, brand, category, color, size, material/pattern, availability, price and optional sale_price | Evaluate actual item suitability under explicit user criteria | Fields can be missing/inconsistent/stale; the feed is a snapshot |
| Shipping data | Optional delivery countries, rates, carrier/service and handling/transit times | Tell shopper when the merchant feed actually publishes a US estimate | Exact cost/timing depend on final address, cart and retailer checkout; unknown is not free |
| Promotions and voucher codes | POST /publisher/{publisherId}/promotions, filtered to joined US active vouchers | Expandable Savings Check for **already selected** product | Awin-listed voucher != item/checkout-verified discount |
| Awin link builder | POST /publishers/{publisherId}/linkbuilder/generate (or batch) | Generate tracking product links **after** selected merchant and destination are verified | Joined programme, link permissions and advertiser terms needed; affiliate tracking not a product-match signal |
| Advertiser reporting | Programme details/performance APIs or publisher MCP | Measure economic sustainability and funnel conversion **outside recommendation ranking** | Commission and EPC must never tilt results |
| Awin MCP | https://mcp.awin.com (2026) | Account-level joined-programme and performance discovery in a connected AI assistant | Curated administrative tools; it does not provide a universal product search/feed-index interface |

### Current Awin connection and limitations

- Vercel currently lists AWIN_API_TOKEN and AWIN_PUBLISHER_ID for **production**. Token values were not decrypted or read.
- Existing /api/savings already queries Awin's joined programmes and active US voucher codes, with domain-matched merchant checks, caching, and transparent unverified-code labels.
- The additional **legacy Product Feed API key is not among the configured Vercel environment names** and must not be substituted with the Awin Publisher Bearer token.
- There is no verified live inventory feed, imported Awin assortment, joined advertiser list, or merchant-specific catalogue validation in MATCHLATCH yet. Never assert that a specific advertiser is integrated simply because it exists on Awin.
- The POC-04 normalizer at lib/awin-feed-normalize.mjs is **dormant**, accepts only explicitly joined advertiser IDs, rejects unsafe/non-USD/stale or inaccessible records, and never creates a fictitious Shopify checkout. Nothing is surfaced in the app until the real feed and merchant redirect are verified.

## Staged software changes

- retailer-match.js: personal hard gates and lexicographic sorting (style suitability first, validated fresh item-level sale only for ties). Includes limited explicit-material exclusions from notes. It cannot certify unspecified material, actual fit or image-level detail; unknowns must be handled honestly.
- app-shell.js: every manual Store search now derives user category-specific size, style hints and a manually entered exact color; all returned products go through the same suitability gate. Default budget follows the saved user preference until adjusted.
- api/analyze.mjs: OpenAI instruction order explicitly requires user preferences and exclusions before any deal/advertiser considerations. No Awin offer is fed to AI for product ideation.
- outfit-tree.js: Savings Check is attached to the **selected product** only, after it has already passed curatorial selection. Search results do not display a wall of vouchers.
- lib/awin-feed-normalize.mjs: defensive data-shape normalization for planned legacy/Enhanced feeds; tracks source, feed freshness, reported availability, authorizations, product-level sale evidence, and unknown delivery costs. NOT hooked into Shopify-only cart.
- Production and staging branch heads remain unchanged until a separate approval and Vercel preview.

## Next integration sequence (requires a real account-level check)

1. **Audit joined advertisers** using the existing production Awin Publisher API credentials server-side. Limit the inventory shortlist to fashion-relevant active merchants whose terms allow feed promotion.
2. Inspect the **product feed list** with a separate securely configured Product Feed API key; test any accessible Enhanced JSONL en_US feed with existing Bearer credentials. Respect provider request throttles and complete/final-line error handling.
3. Add a scheduled, bounded, server-side feed sync to persistent storage, filtered by fashion category, country and fields. **Never download giant feeds inside each consumer search request.** Refresh only changed feeds based on manifest update time.
4. Introduce a provider-agnostic normalized product record (Shopify + Awin) with evidence provenance, approved merchant domain, published at/updated at, listing freshness, currency, options, shipping-known status, and real merchant-owned deep links.
5. Search the indexed subset using **profile-first** qualification and quality scoring. Add a separate real retailer purchase handoff for Awin products; Shopify-only cart verification cannot verify Awin IDs.
6. Use Awin Offers/Savings Check only after the shopper has selected a qualifying product. Never reduce displayed cart price based solely on a listed voucher.
7. Verify live merchant permissions, membership, stock, size, final shipping price and checkout behavior using iPhone Safari and realistic purchases before expanding.

## Safeguards to validate in every release

- Given a highly discounted but wrong-style product, it must be filtered rather than recommended.
- A retailer cannot buy a better stylistic ranking via commission.
- Price reductions never offset an unavailable size, wrong color or forbidden material.
- Exact preference evidence must be present for nontrivial search terms; 0 genuine matches is a legitimate outcome.
- Source timestamps and provenance accompany internally cached offers; no invented delivery costs.
- Saved items do not become integrated retailer checkout sessions without retailer confirmation.
- Awin affiliate tracking is transparent and compliant with retailer/FTC disclosure requirements when activated.

## Official references (verified October 9, 2026)

- https://help.awin.com/developers/docs/product-feed-publisher-guide-intro
- https://help.awin.com/developers/docs/product-feed-list-download
- https://help.awin.com/apidocs/retail-publisher-productapidocumentation-1
- https://help.awin.com/developers/docs/enhanced-feeds-prod-spec
- https://help.awin.com/apidocs/get-program-information
- https://help.awin.com/apidocs/promotions
- https://help.awin.com/apidocs/generatelink
- https://help.awin.com/developers/docs/awin-mcp-overview

**Release gate:** Research, normalization and curation constraints are staged only; no Vercel production or staging deployment is requested.
