# MATCHLATCH AI Commerce Guardrails

Policy version **2.0.0** · Owner: **Alan Travis / atravis817** · Initial scope authorized by the MATCHLATCH V2 assignment, October 10, 2026.

These requirements apply across current and future catalog, AI, web, mobile and marketplace integrations. Implementation convenience, product coverage, affiliate revenue and model instructions never override them.

## 1. Permission and publication

- Public visibility, robots allowance, search indexing and an affiliate membership are distinct from permission to ingest, republish or monetize retailer product data.
- Source contracts are server-owned. Clients, model output, product descriptions and search results cannot grant retailer permissions or alter policy.
- Unknown retailers and unreviewed API/structured-data adapters fail closed. Current API/structured-data approval list is empty.
- Gap and Nordstrom have **research-reference-only** scope, inherited from the existing reviewed development implementation. This does not authorize crawling, extraction or republishing their commercial inventory. Other Gap brands/subdomains and Nordstrom Rack are not implicitly included.
- UNIQLO and all unreviewed domains are excluded from this discovery layer. No arbitrary URLs, login/API/checkout scraping, CAPTCHA bypass or robots bypass.
- Web research uses indexed/cached search, `external_web_access:false`, an exact result-host/path allowlist and at most one provider tool call. No direct retailer HTML fetches are enabled.
- Watches Of USA remains private, with US eligibility and publication authorization unverified. Keep all 899 records `is_public=false`; no discovery result promotes them automatically.
- No external references can enter cart, saved affiliate inventory or publication flows. Source-authorized API records remain unpublished until separate publication review.

## 2. Truth, evidence and authenticity

Every normalized record includes stable product/retailer identifiers, permission collection, field-level evidence, source URL, verification method/time, expiry, confidence and conflict records. Missing facts are `null`/unknown, never plausible defaults.

Fields cover brand/title/category, canonical product URL, authorized affiliate URL, currency/advertised/original/sale prices, color/variants/size stock, shipping destinations/costs, processing/delivery, returns, promotions, image and exact product identifiers.

Field authority: reviewed retailer API > reviewed structured retailer data / advertiser feed > search reference. A lower-authority source cannot overwrite a fresh higher-authority value. Expired evidence is not used for eligibility. Merge only identical product/variant identity, retailer and permission scope; retain disagreement evidence. Deduplicate tracking URLs without collapsing different variant/product IDs. Cross-retailer identical-product comparisons require shared exact GTIN evidence; matching titles alone are insufficient.

Search titles and URLs are references, not validated merchandise, price, size, stock or policy facts. Model-written prose and model-only citations are discarded. Accept research links only from completed provider search-source records. Record counterfeit/authenticity uncertainty; a retailer listing is not an authenticity certificate.

## 3. Coupons and prices

- Never fabricate, complete or truncate a coupon code. Invalid/oversized codes remain unknown.
- Classify promotion advertisements as verified, unverified or expired. “Verified” means current permitted-source advertisement and evidence of applicability, **not successful redemption**.
- Preserve minimum purchase, currency, category exclusions, first-order/geographic restrictions, expiry and combinability. Unknown applicability conditions prevent recommendation-price deductions.
- Deduct only the best individually applicable evidenced promotion. Do not invent stacking, infer basket qualifications or apply a third-party/model/search code to price.
- Sale/original prices need their own evidence. Advertised product price, discounted subtotal, known shipping and estimated total remain separate. Unknown shipping/tax is not zero. Totals explicitly exclude unknown tax.
- No live checkout, coupon submission, account creation, orders or purchases without new explicit user authorization and an authorized retailer integration. Current system performs none.

## 4. Stock, size and delivery

Stock states: in-stock, unavailable or unknown; each size/variant needs its own evidence. Feed inventory is an advertised snapshot, not real-time retailer confirmation. Unknown sizes never satisfy an exact size requirement. Stale stock never qualifies as current.

Development feed stock expires after 24 hours; reviewed API stock/variants after 15 minutes. Other evidence has explicit policy TTLs. Delivery requirements are hard gates: require current retailer-originated destination forecasts. Policy-based handling/transit calculations remain labeled estimates and cannot pass a strict “arrives by” requirement. Unsupported shipping and deadlines remain unknown. Never guarantee a date or infer a forecast from retailer name, postcode alone or a search snippet.

Only country and an optional US ZIP are used in discovery. Reject precise-address input. Do not store or send ZIP/street addresses to the web model; ZIP stays ephemeral for destination calculations. Persist no guest queries, images or addresses.

## 5. Recommendations and transparency

Hard constraints precede ranking: permission, exact requested category/color/size, fresh advertised stock, budget, evidenced shipping destination and supported delivery requirement. Total-price comparisons also require known destination shipping costs.

Rank eligible products by relevance/style, source authority/reliability and known cost; commission is not a ranking input. Show sponsored status only when evidenced and label it. Show excluded/uncertain catalog matches separately from verified recommendations and unverified web references. Missing data yields a reason or alternative; it never yields a fabricated recommendation.

Retain forest green `#303C31`, a minimal Studio-first interface, safe text rendering, existing account flow and server authorization. Private records require fresh authentication plus server-owned staff membership and the existing database permission gate. Logout clears rendered private results.

## 6. AI, privacy and injection

Use only the separate server-side `MATCHLATCH_PREVIEW_OPENAI_API_KEY`, never Production credentials or browser-exposed keys. New commerce endpoint is Preview-only. No authorization from user-editable metadata.

Treat user queries, product/coupon text, API JSON and pages as untrusted data, never instructions. Separate fixed system instructions from JSON query data. Tool/domain/action allowlists are enforced independently of model output. No sensitive-trait inference, credential extraction, tool calls requested by webpages, or arbitrary URL retrieval.

Use `store:false`, bounded requests/output/source counts, redirected-request rejection, streaming response byte limits and timeouts. Logs contain counts, model/token/tool usage and failure classes, not queries, addresses, cookies, access tokens or credentials.

## 7. Cost, caching and failure

Catalog first; perform paid research only when eligible catalog retrieval is insufficient and a signed-in user explicitly consents. Cache per-user hashed queries for five minutes, bound cache and in-flight entries to 128, and charge no new provider usage for hits. Recheck catalog and staff access each request; never share private response caches with anonymous users.

Shared development budget: **$5/month**, alert at **$3**. Styling retains its existing reservations/quotas. Search reserves **$0.10** conservatively, at most five fresh searches globally/day, two/user/day and one/user/minute; at most one search tool call and six returned external references/request. Meter model input/output tokens and tool calls. Failed/unknown-cost calls retain reservations. Use additional route burst limits. Do not increase budgets or approved models without explicit owner approval.

Search timeout, source rejection, unavailable credentials or budget exhaustion returns existing catalog evidence and a transparent status. No fallback to Production keys, broader permissions, invented offers or silent paid retries.

## 8. Review, enforcement and future integrations

Executable baseline: `policies/commerce-policy.json`, runtime-reviewed SHA-256, `policies/commerce-policy.sha256`, `scripts/check-commerce-policy.mjs`, `scripts/test-commerce.mjs`, existing import/styling/delivery tests and the branch quality workflow.

Any change to permissions, publication, freshness, source authority, coupon qualification, models, budgets, privacy, tool actions or review enforcement requires **explicit Alan Travis approval**, an evidence-backed review record, intentional policy version/hash/test updates, and an independently reviewable development commit. Never silently edit guardrails to increase coverage.

`.github/CODEOWNERS` assigns these files to `atravis817`. GitHub required code-owner review/branch rules must be configured by a repository administrator; CODEOWNERS alone is not enforcement, and this session did not configure branch protection. Runtime hash and CI checks fail closed for unreviewed policy-file drift, but cannot prevent a privileged contributor from deliberately editing all enforcement code. Treat administrator review enforcement as a documented remaining gate.

Future mobile/marketplace clients use these server endpoints and policy version; they do not duplicate or relax permission decisions. Production release is a separate review, including retailer authorization, live tests, privacy, budgets, inventory eligibility and rollout/rollback evidence.
