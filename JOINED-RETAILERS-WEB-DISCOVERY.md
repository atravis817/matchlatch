# MATCHLATCH POC-06 — First joined Awin partners and sourced web discovery
October 9, 2026 — Staging only. Live payments and production are unchanged.

## Real Awin membership checks
Connected publisher: MATCHLATCH, publisher 3118944.

| Advertiser | Awin ID | Membership confirmed | Verified link capability | Feed availability |
| --- | ---: | --- | --- | --- |
| ZazzMode | 117849 | Joined; US, Active, USD | Awin Link Builder generated an official tracking link to https://zazzmode.com/ | UNKNOWN (no live feed download) |
| Cacio Pepe (US) | 126793 | Joined; US, Active, USD | Awin Link Builder generated an official tracking link to https://www.caciopepebrand.com/products/organic-cotton-camisa-crew-black | UNKNOWN (no live feed download) |

The partner profiles also advertise deep-link support. Generating an affiliate tracking URL is **not** proof that a sale will be attributed, that any SKU is in stock, or that an Enhanced Awin product feed exists.

Live MATCHLATCH Supabase now contains eight candidate partner rows, of which two are **Joined / feed unverified**. All product publication and direct-checkout flags are OFF for them. No Awin products were published or imported during this stage.

### Why the existing importer needed repair

The Awin `GET /publishers/{publisherId}/programmes?relationship=joined` response includes programme ID, name, status, country, currency and valid domains, but **does not include** `deeplinkEnabled` or `linkStatus`. Requiring those absent fields wrongly marked approved merchants as not joined. `lib/awin-retailers.mjs` now checks fields actually exposed by the joined endpoint and keeps strict advertiser ID and US/Active/USD requirements. Exact merchant domains remain allowlisted.

Awin's Enhanced JSONL feeds may group fields into `product_basic`, `product_category`, `product_attributes`, and `price_and_availability`. The normalizer now uses all of them, and handles shipping as an object or array, while refusing to invent US-wide delivery eligibility from a restricted region or ZIP.

### What the Awin account connector cannot currently do

The connected Awin plugin lists programmes, membership and metrics, and creates tracking links, but **does not provide Enhanced Feed downloads or Create-a-Feed inventory discovery**. The standard bearer token is configured only for Vercel Production (its value has not been read). The trusted importer also requires a Supabase service-role key held in a *server-only* secret manager; it is not currently configured in Vercel. The database already exists, but no live feed retrieval was made.

To determine what the two joined advertisers *actually* provide:

1. Open Awin **Advertisers → My Programmes** and check the Product Feed column for ZazzMode and Cacio Pepe.
2. In **Toolbox → Create-a-Feed**, select en_US and inspect the advertiser selector. Google/Enhanced or legacy Awin formats differ. The **Product Feed List Download key is not the publisher API token**.
3. For a joined advertiser with an Enhanced en_US feed, use its official authenticated JSONL download with a trusted server runner, validate the entire document including its final line, and stage rows privately. The manual `scripts/sync-awin-feeds.mjs` runner only attempts the vetted candidate IDs; it requires private credentials, and by default **never publishes**.
4. Validate usable sizes, colors, material, fresh USD prices, current in-stock flags, nationwide US shipping evidence, retailer-owned product URLs, and Awin tracking links. A missing field means unknown, not guessed.
5. Keep `AWIN_PUBLISH_APPROVED` unset during QA. Only after inspecting real data and checkout handoffs should a deliberate run with `AWIN_PUBLISH_APPROVED=1` make currently qualified rows available via Supabase RLS. This is a separate operational release gate, not an automatic result of joining.

Public Cacio Pepe merchandise descriptions and size selectors exist, but retailer webpages alone are not an approved feed or variant-level stock verification.

## OpenAI web discovery: search tool, not model retraining

OpenAI's current Responses API supports `{type:"web_search"}`, `include:["web_search_call.action.sources"]`, and explicit required search calls. For MATCHLATCH, source-backed web discovery offers a more suitable first step than model fine-tuning. The model generates search terms and styling guidance; live web search retrieves sources.

This release adds:

- `api/discover.mjs`: server-only OpenAI web search, private beta gate, no-store requests, bounded input and response, no direct retailer scraping. Uses `OPENAI_WEB_MODEL` when configured, default `gpt-5.4`. Requires production-style `OPENAI_API_KEY` and `MATCHLATCH_BETA_CODE` environment variables.
- Real web-search source URLs are extracted from tool output and clickable citations; fabricated URLs, HTTP sources, credentialed URLs and duplicates are rejected. Product detail URLs are labeled **product-page references**, not verified products.
- The Store results page offers a small, deliberate **Explore wider web** button. It shares the user's explicit style criteria, size, color and budget, with zero emphasis on commission, promotions or discounts. It displays readable source links, not false product cards.
- No web-only source can be added to cart, verified as in-stock, or passed to native checkout without an independent retailer catalog feed / verified product integration.
- The visual UI retains the exact brand signature forest green with restrained whitespace; no extra shopping tab or intrusive form.

### Reliability and evaluation gates

- Excluded materials, specified fit, exact size/color, shopper budget and occasion have priority over sale incentives.
- Product feed import fails closed for unauthorized programmes, malformed files and stale stock, and keeps its vendor domain allowlist.
- Web search is opt-in, beta-protected and never runs on every keystroke or automatically on every search.
- Search results must surface clickable source citations and explicitly state unknown current price, size availability, shipping and eligibility.
- No cross-retailer cart reservation or merchant checkout is claimed.
- If OpenAI web search or a specific merchant feed fails, existing catalog remains independent; do not fabricate listings.

## Limits and follow-through

- OpenAI and Awin credentials are configured on Vercel **Production only**. Staging lacks the beta/OpenAI secrets and cannot execute a live web discovery or AI photo analysis until preview-scoped secrets are added securely.
- Staging source audits and simulated tests are useful, but they do not establish real model access, live feed permission or a completed checkout on iPhone.
- We still need to run a real authorized Awin feed import and separately verify web-search results, product-page links, size and stock signals on iPhone Safari before introducing production traffic.

## Primary documentation

- Awin Enhanced publisher download: https://help.awin.com/apidocs/retail-publisher-productapidocumentation-1
- Awin Product Feed List: https://help.awin.com/developers/docs/product-feed-list-download
- Awin product schema: https://help.awin.com/developers/docs/enhanced-feeds-prod-spec
- OpenAI Responses web search: https://developers.openai.com/api/docs/guides/tools-web-search
